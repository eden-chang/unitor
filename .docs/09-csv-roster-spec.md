# 09 — CSV Roster Specification

The TA uploads a CSV at course creation time (or to update an existing roster). This document specifies the file format, validation rules, and upload flow. The current prototype's `<input type="file">` is a placebo; this is what replaces it.

All defaults are recommendations open to review.

## 1. File format

- **Encoding**: UTF-8, with or without BOM. Reject anything else with a clear error message.
- **Format**: comma-separated, RFC 4180 compliant. The standard library `csv` module in Python handles quoting/escaping correctly.
- **Line endings**: LF or CRLF accepted.
- **First row**: header row with column names. Column order is **not** significant — we match by name.
- **Maximum file size**: 5 MB (covers ~50,000 rows comfortably). Reject larger.
- **Maximum rows**: 5,000 per course (one upload). Reject larger.
- **Parsing requirement (added per [ADR 0009](./decisions/0009-audit-corrections.md) §7)**: the parser **must stream** the upload (`csv.DictReader(stream)` over the SpooledTemporaryFile, never `file.read()` followed by `csv.reader(text)`). This bounds backend memory to a few hundred KB per concurrent upload regardless of file size. The parsed rows for the commit step are persisted to a Postgres staging table, not held in process memory.

## 2. Column contract

### Required columns

| Header | Type | Validation |
|---|---|---|
| `email` | string | Must match `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`. Normalized to lowercase before storage. |
| `name` | string | 1–100 chars after trim. Whitespace-only is invalid. |
| `section` | string | Must match one of the course's existing `sections.code` values. (TA must create sections before uploading the CSV — or we auto-create on first encounter; see §6 decision below.) |

### Optional columns

| Header | Type | Behavior |
|---|---|---|
| `preferred_name` | string | If present, stored. Used in UI in place of `name` where appropriate. Max 100 chars. |
| `student_id` | string | Stored as-is for audit. Not displayed. Not currently used; reserved. |

Any column not listed above is **ignored with a warning** (so a TA's spreadsheet with extra columns like "advisor" doesn't fail outright).

## 3. Header tolerance

Headers are matched case-insensitively, with whitespace and underscores stripped:

- `Email` → matches `email`
- `Student Email` → matches `email` (we recognize common phrasings)
- `Section No` → matches `section`
- `Last Name`, `First Name` → **not auto-merged**; the TA must produce a single `name` column. (We don't guess about names.)

Accepted aliases:

| Canonical | Accepted aliases |
|---|---|
| `email` | `email_address`, `student_email`, `e-mail`, `e_mail` |
| `name` | `full_name`, `student_name` |
| `section` | `section_no`, `section_code`, `lecture_section`, `tutorial_section` |
| `preferred_name` | `nickname`, `display_name` |
| `student_id` | `id`, `student_no`, `student_number`, `utorid` |

(University-specific aliases like `utorid` can be added as we onboard more schools.)

## 4. Validation rules

The CSV passes validation if **every** row passes. Per-row checks:

1. `email` matches the regex above.
2. `name` is non-empty after trimming.
3. `section` exists as a `sections.code` in this course (or will be auto-created if §6 decision is "auto-create").
4. `email` is unique within the file (case-insensitive). Duplicate rows are an error with both line numbers cited.
5. `email` is not already on **another course's roster as a different person**. (This isn't a hard rule; cross-course email reuse is fine because users are global. The check is whether the same email appears under a different name in another current course — that's worth flagging to the TA.)

Soft warnings (non-blocking, shown in preview):

- `email`'s domain doesn't match the university's `email_domain` (if `universities.email_domain` is set). Possible typo or non-university email.
- `email` is already linked to a `users` row whose display name disagrees with this CSV's `name`. (The CSV's `name` will be used for roster display; user's profile name remains user-controlled.)

## 5. Upload flow (TA's perspective)

```
1. TA goes to TACreate (or course settings if editing an existing course).
2. TA clicks "Import Student Roster (CSV)" and selects the file.
3. Frontend uploads to FastAPI:
     POST /api/v1/courses/:id/roster/preview
     content-type: multipart/form-data
   - FastAPI:
     a. Parses the CSV.
     b. Validates every row.
     c. Stores the parsed rows in a short-lived staging table keyed by an upload_id (or in a temp file referenced by upload_id; staging table is simpler).
     d. Returns:
        {
          upload_id: "uuid",
          summary: {
            total_rows: 45,
            valid_rows: 43,
            error_rows: 2,
            new_rows: 40,
            updated_rows: 3,    // existing roster entries whose name/section changed
            removed_rows: 0     // existing roster entries not present in CSV (replace mode only)
          },
          errors: [
            { line: 12, field: "email", code: "INVALID_EMAIL", value: "alice@no-domain" },
            { line: 28, field: "section", code: "UNKNOWN_SECTION", value: "L0301" }
          ],
          warnings: [...],
          new_sample: [first 5 new rows],
          updates_sample: [first 5 updates]
        }
4. Frontend displays a preview screen with:
   - Counts of new/updated/removed.
   - Errors listed prominently (TA must fix and re-upload, OR proceed with valid rows only).
   - Warnings listed in a collapsed section.
   - A first-10-rows preview of the file.
   - Two buttons: "Cancel" and "Commit Import (X new students)".
5. TA clicks Commit. Frontend:
     POST /api/v1/courses/:id/roster/commit
     body: { upload_id, mode: "delta" | "replace", skip_errors: bool }
   - FastAPI runs the commit transaction (§7).
6. Backend returns final counts + audit log entry id.
7. Frontend shows success toast and refreshes the roster list.
```

The preview is **mandatory**; there is no "upload and commit in one step." This prevents irreversible mistakes.

## 6. Sections in the CSV

**Default decision: TAs must create sections in the course-create form before uploading the CSV.** Unknown section codes in the CSV produce errors.

Reason: We want section codes to be deliberately created so they match the university's actual section labels exactly (`L0101` vs `L0101 ` vs `0101` all look like typos). Errors surface that.

Alternative considered (and rejected for now): **Auto-create unknown sections on import.** Simpler for the TA, but invites silent typos that fragment the roster across slightly different section codes. The TA can amend the form, re-upload, and proceed.

This decision is overridable; flag if you'd prefer auto-create.

## 7. Commit modes

### Mode `delta` (default)

- INSERT rows from the CSV that aren't already on the roster.
- UPDATE existing rows whose `name` or `section` changed in the CSV.
- Do NOT touch existing roster rows that aren't in the CSV.

Best when adding late-add students or amending a few entries.

### Mode `replace`

- INSERT new rows.
- UPDATE existing rows.
- **Mark missing rows as removed**: `UPDATE roster_entries SET removed_at = now() WHERE course_id = ? AND id NOT IN (...)`.
- For rows with `user_id IS NOT NULL` (student already signed up), removal is **soft**: `roster_entries.removed_at` is set, but the `enrollments` row is **kept** in the DB. The student can still log in but FastAPI flags them with `course_state.dropped` (TA sees them on a "removed" list and chooses whether to fully drop them).

Best when re-importing the full roster from a system of record (the registrar).

### Commit transaction

```sql
BEGIN;

-- All INSERTs (deduped on (course_id, email) where removed_at IS NULL).
INSERT INTO roster_entries (...) VALUES (...) ON CONFLICT DO NOTHING;

-- All UPDATEs.
UPDATE roster_entries SET name = ..., section_id = ... WHERE id = ...;

-- For 'replace' mode: mark missing as removed.
UPDATE roster_entries SET removed_at = now() WHERE course_id = ? AND id NOT IN (...);

-- Audit log.
INSERT INTO audit_log (action, actor_user_id, course_id, payload)
VALUES ('ROSTER_IMPORTED', :ta, :course, jsonb_build_object('mode', :mode, 'counts', ...));

-- Store the original CSV file content in R2 for audit.
-- (Handled by FastAPI outside the transaction.)

COMMIT;
```

The original CSV file is **uploaded to R2 with a 7-year retention** for FERPA / audit. R2 key pattern: `roster-imports/{course_id}/{upload_id}.csv`.

## 8. Error responses

The preview/commit API returns errors with structured codes (per [ADR 0008](./decisions/0008-conventions.md)):

| Code | When |
|---|---|
| `CSV_PARSE_FAILED` | Not valid CSV (encoding, malformed quoting). `details.line` if available. |
| `CSV_MISSING_COLUMN` | Required column not found. `details.missing: ["email", "section"]`. |
| `CSV_TOO_MANY_ROWS` | > 5000 rows. |
| `CSV_TOO_LARGE` | > 5 MB. |
| `CSV_DUPLICATE_EMAIL` | Same email in multiple rows. `details.email`, `details.lines`. |
| `CSV_INVALID_ROW` | Per-row validation failure. `details.line`, `details.field`, `details.value`, `details.reason`. |
| `CSV_UNKNOWN_SECTION` | Section code not present in the course. `details.line`, `details.section`. |
| `CSV_PREVIEW_EXPIRED` | Tried to commit a preview that's > 30 minutes old. |

The frontend renders these as a list with line numbers, and offers a "Download error report" link (a CSV of just the failing rows).

## 9. Re-import behavior

A TA can re-upload at any time. Whether to use `delta` or `replace` is their choice.

- The preview always shows what will change relative to the **current state** of the roster, not the previous import.
- Rows previously marked `removed_at` are treated as if they don't exist for matching; if the CSV brings them back, they get `removed_at = NULL` (un-removed) instead of a new row, preserving `user_id` and history.

## 10. Permissions

- Only users with `enrollments.role IN ('ta', 'instructor')` on this course can preview or commit.
- The `roster/preview` endpoint accepts the CSV; the parsed staging entries are scoped to the uploader's session so other TAs can't commit it accidentally.

## 11. Edge cases

| Case | Handling |
|---|---|
| TA uploads a CSV that's been emailed to them — different encoding (Windows-1252) | Best-effort decode chain: try UTF-8 → fall back to chardet → if still failing, return `CSV_PARSE_FAILED` with a hint about saving as UTF-8. |
| Section code in CSV has trailing whitespace ("L0101 ") | We trim before validation. Don't error on whitespace alone. |
| Empty `name` cell | `CSV_INVALID_ROW` with `reason: "name is required"`. |
| Email with a `+` alias (`alice+section1@school.edu`) | Treated as a valid distinct email. Postel's law: accept gracefully. |
| Same email present in the CSV but with different sections | Last-write-wins is dangerous — emit `CSV_DUPLICATE_EMAIL` instead. |
| Student signed up before TA uploaded the roster (race condition) | Pre-uploaded `users` row exists. Bootstrap blocked them because no roster entry existed. After roster upload, that student tries again and succeeds. No bootstrap re-run needed; the next login bootstraps. |
| Student in roster, never signs up | Stays as `roster_entries` with `user_id = NULL`. Counted in TA dashboard's "ungrouped" if at the deadline. |
| TA accidentally clicks "Replace" with a partial CSV | Preview shows the removal count (could be 40 students). TA cancels. This is the explicit confirm flow's purpose. |

## 12. Sample CSV

```csv
email,name,section,preferred_name
alice.cho@mail.utoronto.ca,Alice Cho,201,
ben.kim@mail.utoronto.ca,Benjamin Kim,201,Ben
carla.lopez@mail.utoronto.ca,Carla Lopez,202,
diana.patel@mail.utoronto.ca,Diana Patel,203,Di
```

## 13. Decisions to confirm or override

1. **Section auto-creation: NO (default)** — see §6. Could flip to YES if TAs find this annoying.
2. **Max rows 5,000 / max file 5 MB** — generous for any single course. Drop or raise as needed.
3. **Preview validity 30 minutes** — long enough for a TA to read the preview, short enough that stale uploads don't accumulate. Adjust if needed.
4. **`name` is a single column (no first/last split)** — keeps the file simple. Could split if a stakeholder asks.
5. **Original CSV retained 7 years in R2** — matches typical academic audit periods. Adjust per legal review.
6. **Soft-remove for replace mode (`removed_at` set on missing rows)** — preserves audit. Alternative: hard delete, simpler but lossier.
7. **Removed students keep their `enrollments` row** — they can still see their old conversations until the TA explicitly drops them. Alternative: auto-drop on `removed_at` set.
8. **No support for "deactivate without removing" yet** — could add a `roster_entries.active` boolean. Not needed for pilot.
9. **No CSV download endpoint for existing roster** — TAs can copy from the table view if needed. Add an export endpoint later.
