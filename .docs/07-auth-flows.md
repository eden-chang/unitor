# 07 — Authentication & Account Lifecycle Flows

This document specifies the end-to-end flows for identity in Unitor. It implements the decisions in [`decisions/0002-backend-stack.md`](./decisions/0002-backend-stack.md) (Supabase Auth + magic link) and [`decisions/0007-domain-modeling.md`](./decisions/0007-domain-modeling.md) §§2–3 (single user, many enrollments; roster-gated signup).

All defaults are recommendations open to review.

## 1. Roles and entry URLs

| Role | Entry URL | Auth gate |
|---|---|---|
| Student | `app.unitor.app` (production) / `localhost:5173` (dev) | Magic link; must match an active roster entry. |
| TA / Instructor | `app.unitor.app/instructor` | Magic link; email must be on the TA allowlist (`ta_allowlist` table, populated by admins). |
| Admin (us, system operators) | Not a self-service flow; provisioned via direct DB write or a small CLI. | Allowlist-only. |

The instructor URL is **convenience routing, not a hard security gate**: even on the student URL, the system could detect a TA-flagged user and route them to the TA dashboard. The hard gate is the `enrollments.role` and `ta_allowlist` check.

## 2. Student signup (first time)

The TA has already uploaded a roster CSV ([`./09-csv-roster-spec.md`](./09-csv-roster-spec.md)). Student arrives at `/signup`.

```
1. Student picks "Student" role.
2. Student enters their university email.
3. Frontend calls FastAPI: POST /api/v1/auth/precheck { email }
   - FastAPI looks up roster_entries WHERE lower(email) = ? AND removed_at IS NULL.
   - If no row found: respond { code: "ROSTER_EMAIL_NOT_FOUND" }. Frontend shows the existing error message.
   - If found: respond 200 with { course_count, course_summaries }.
4. Frontend calls Supabase Auth: signInWithOtp(email).
   - Supabase sends a magic link to the email.
5. Student clicks the link in their inbox.
   - Supabase Auth resolves the token, creates auth.users row (or returns existing), issues JWT.
6. Frontend redirects to /auth/callback, then to /onboarding.
7. Frontend calls FastAPI: POST /api/v1/auth/bootstrap (carries JWT).
   - FastAPI:
     a. Confirms auth.users.email matches some roster_entries.
     b. Creates public.users row (id = auth.users.id) if missing.
     c. For each matching roster_entry where user_id IS NULL:
        - Sets roster_entries.user_id = users.id.
        - Creates enrollments row with section_id from roster, role = 'student', status = 'active'.
     d. Returns { user, enrollments[] }.
8. Frontend routes user to the per-course profile setup (Prof0 → Prof3) for the first
   enrollment if profiles row is missing for that enrollment.
9. After profile complete: user lands on /courses/:id/discovery.
```

### Edge cases

- **Student enrolled in multiple courses simultaneously**: bootstrap creates all enrollments. Frontend shows the "My Courses" dashboard (mapping `DashEmpty` → `Dash`).
- **Re-signup of an existing user**: steps 1–6 still work. Step 7 is idempotent.
- **Email mismatch (Supabase email vs roster email)**: this can only happen if the student logged in with a different email than they checked at step 3. Bootstrap rejects with `ROSTER_EMAIL_NOT_FOUND`.
- **Student's roster entry was removed after they signed up**: the `enrollments` row remains (soft-deleted by FastAPI on removal, with audit log). Login still works; access to course returns "you've been removed from this course." Decided as a separate flow.

### Why a precheck step (step 3)?

Without it, the user sees "magic link sent" and only learns of the email mismatch when they click the link. Precheck gives the prototype's existing "email not found" inline error without compromising security (the precheck reveals only whether the email is in some roster, not which one).

## 3. TA signup (first time)

```
1. TA opens app.unitor.app/instructor.
2. TA enters email and clicks Sign Up.
3. Frontend calls FastAPI: POST /api/v1/auth/ta-precheck { email }.
   - FastAPI checks ta_allowlist table.
   - If not allowlisted: respond { code: "TA_NOT_AUTHORIZED" }.
   - If allowlisted: respond 200.
4. Frontend calls Supabase Auth: signInWithOtp(email).
5. Magic link → click → callback.
6. Frontend calls FastAPI: POST /api/v1/auth/bootstrap.
   - FastAPI:
     a. Creates public.users row if missing.
     b. Since this user is on ta_allowlist, set a metadata flag.
     c. Creates a placeholder enrollment with role = 'ta' only after they create or join a course.
7. Frontend routes to /instructor/courses (empty state).
8. TA creates their first course via TACreate. FastAPI inserts:
   - courses row.
   - sections rows.
   - course_skills rows.
   - enrollments row for the TA with role = 'ta', linked to a "TA section" or any section.
```

### `ta_allowlist` table (small addition to the ERD)

| Column | Type |
|---|---|
| `email` | `text` (PK, lowercase) |
| `added_by` | `text` (admin email or `"bootstrap"`) |
| `added_at` | `timestamptz` |
| `note` | `text` (nullable) |

Populated by us (operators) via a small CLI or direct INSERT until an admin UI exists.

### Open question

- Should a TA also be able to be a student in *other* courses without complications? Yes (per [decisions/0007-domain-modeling.md §2](./decisions/0007-domain-modeling.md)). The role is on `enrollments`, not `users`, so a single account can hold both.

## 4. Login (returning user)

```
1. User opens app and is not authenticated.
2. User enters email, clicks Log In.
3. Supabase Auth signInWithOtp(email).
4. Magic link → click → callback at /auth/callback.
5. Frontend retrieves session from Supabase JS SDK.
6. Frontend optionally calls FastAPI: POST /api/v1/auth/bootstrap (idempotent; only writes if missing).
7. Frontend reads enrollments and routes:
   - 0 enrollments → dashboard empty state (encourages course join via invite code).
   - 1 enrollment → straight to that course's last-visited tab.
   - N enrollments → "My Courses" landing.
```

Magic-link sessions last 1 hour for the access token, 30 days for the refresh token (Supabase defaults). The Supabase JS SDK auto-refreshes.

## 5. JWT verification (server-side)

FastAPI verifies every incoming JWT once per request. The dependency:

```python
# backend/app/auth/jwt.py
import jwt  # PyJWT
from fastapi import HTTPException, Depends, Request
from app.config import settings

def get_current_user(request: Request) -> CurrentUser:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, {"code": "AUTH_REQUIRED", "message": "Missing bearer token."})
    token = auth.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError:
        raise HTTPException(401, {"code": "AUTH_REQUIRED", "message": "Invalid token."})
    return CurrentUser(id=payload["sub"], email=payload.get("email"))
```

The `CurrentUser` is a Pydantic model with `id`, `email`, and lazily-loaded `enrollments` (fetched on first access; cached per request).

### Service role usage (FastAPI → Postgres)

FastAPI's database session is opened with the **service role key** (configured via env var `SUPABASE_SERVICE_ROLE_KEY`). This bypasses RLS. FastAPI **must** enforce authorization in code:

- Every endpoint's first action after `get_current_user` is an authorization check: "is the current user allowed to perform this action on this resource?"
- The check looks at `enrollments` (does the user belong to this course?), `group_memberships` (are they the leader?), or table-specific rules.
- A helper module `app/auth/authz.py` centralizes the common checks.

### Why not have FastAPI use a per-user JWT to connect?

- Connection pool fragmentation: every user would need its own connection.
- Latency: every request sets up `SET LOCAL "request.jwt.claims" = ...` to make `auth.uid()` work.
- We can't share connection pools across users.

Service role + explicit checks is the standard pattern.

## 6. Logout

```
1. User clicks Log Out.
2. Frontend calls supabase.auth.signOut() — clears session locally and revokes refresh token server-side.
3. Frontend redirects to /landing.
4. localStorage of any unrelated Unitor keys (chat drafts, etc.) is cleared.
```

No server call needed beyond what the SDK does.

## 7. Account deletion (user-initiated)

GDPR / FERPA / PIPEDA require an account-deletion path. The flow is **destructive** (overrides soft delete):

```
1. User goes to Profile → Account → Delete Account.
2. Confirmation modal explains what will be deleted and what will be kept.
3. User types email to confirm.
4. Frontend calls FastAPI: DELETE /api/v1/users/me.
5. FastAPI runs a transaction:
   a. INSERT audit_log entry with action = "USER_REQUESTED_DELETION", actor = self.
   b. DELETE rows from per-user tables: profiles, profile_*, group_memberships (soft → hard),
      requests as sender or receiver (hard delete), applications, application_*, message_reactions,
      conversation_participants, notifications, compatibility_cache (where viewer or target = self).
   c. UPDATE messages SET sender_user_id = NULL, body = '[deleted]' WHERE sender_user_id = self.
      (We preserve message presence for other participants but anonymize.)
   d. DELETE enrollments WHERE user_id = self (hard).
   e. DELETE roster_entries.user_id reference (set to NULL) so the email stays on the roster.
   f. UPDATE users SET primary_email = NULL, display_name = '[deleted user]', default_avatar_url = NULL,
      deleted_at = now() WHERE id = self. (Keep the row; rely on cascading FKs being either anonymized or removed.)
   g. Call Supabase Admin API: auth.admin.deleteUser(self.id).
6. FastAPI returns 200; frontend signs out and shows "Your account has been deleted."
```

### What is preserved

- Group history in `groups` (other members care about it).
- `audit_log` entries (legal requirement to keep audit history).
- Messages others sent — only the deleted user's own messages are anonymized.

### What is deleted

- All personal data: email, display name, bio, skills, schedule, photo.
- The Supabase auth identity itself.

### Edge case: user has open requests/applications

- All pending requests/applications by this user are cancelled (status → `withdrawn`).
- All pending requests to this user are cancelled (status → `withdrawn`, with a note).
- Affected users are notified.

### Edge case: user is a group leader

- If the group has other members: the leader is removed; another member is auto-promoted (chosen as the longest-tenured remaining member). An audit log entry records the auto-transfer.
- If the leader is the only member: the group is hard-deleted.

## 8. Cross-university account binding

A user can have enrollments in multiple universities under the same account.

- The Supabase Auth identity is one (one `auth.users` row per primary email).
- A user logging in sees all their enrollments aggregated on the "My Courses" page, grouped by university.
- Course-scoped actions (Discovery, MyGroup, Chats, Notifications) are always within a single course context. The URL carries the course slug; the active enrollment is implicit.

### What if the user has the same email at two universities?

- Their roster entry at each university points to the same email.
- Bootstrap will create both enrollments after first signup.
- Cross-university data isolation is still complete (RLS by `course_id`).

### What if the user has different emails at different universities?

- Two separate accounts. We don't try to merge.
- If a user wants to merge, they update one of their roster emails to match the other (this requires TA help).

## 9. Session refresh and idle behavior

- Access token expires after 1 hour.
- Supabase JS SDK auto-refreshes using the refresh token (30-day lifetime, sliding).
- If the user is idle for 30+ days with no refresh, they have to log in again.
- Frontend's TanStack Query is configured to retry on 401 by triggering a session refresh; if refresh fails, redirect to `/login`.

## 10. Multi-device / multi-tab

- Supabase JS SDK uses BroadcastChannel to sync auth state across tabs in the same browser.
- Different devices: each has its own session; sign-out on one device doesn't affect another. (Standard behavior.)
- A future "Sign out of all devices" action would call the Supabase Admin API to revoke all refresh tokens for the user.

## 11. Audit-log entries this flow generates

| Action code | When |
|---|---|
| `USER_SIGNUP` | First successful bootstrap. |
| `USER_LOGIN` | On every successful bootstrap call that doesn't create rows (returning user). |
| `USER_LOGOUT` | When `supabase.auth.signOut()` succeeds and the frontend confirms. (Best-effort; client-driven.) |
| `USER_REQUESTED_DELETION` | At the start of the delete transaction. |
| `USER_DELETED` | At the end of the delete transaction. |
| `ENROLLMENT_CREATED` | On each enrollment INSERT during bootstrap. |
| `ENROLLMENT_REMOVED` | On TA removing a roster entry that had been linked. |
| `LEADER_AUTO_TRANSFERRED` | When account deletion or leave triggers leader promotion. |

## 12. Decisions to confirm or override

1. **Magic-link only, no password option** — recommended; reduces credential-stuffing risk and removes "forgot password" flow. Override if a stakeholder wants password-fallback.
2. **TA allowlist table managed manually** — fine for pilot. Eventually replaced by a TA self-serve invitation flow.
3. **Account deletion hard-deletes most personal data, anonymizes messages** — this is the legally cleanest balance. If a stakeholder wants full message deletion (which would break other people's threads), revisit.
4. **Leader auto-transfer on deletion picks longest-tenured remaining member** — simple rule. Could change to "explicit leader nomination during deletion confirmation."
5. **No email change flow yet** — for pilot, users contact their TA to update roster + change Supabase email through admin. Build a self-serve flow later.
6. **No 2FA yet** — Supabase Auth supports TOTP. Defer.
7. **Session timeouts use Supabase defaults (1h access, 30d refresh)** — adjust if pilot policy demands shorter.
