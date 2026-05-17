# EASEA Prototype Redesign: Scenario-Based UX Flows

---

## Core Principle

Build focused solutions for each scenario. When those focused solutions are put together, the result is a flexible system.

---

## System Structure

Three tabs in the top navigation. A notification icon sits in the top-right corner.

1. Discovery: a single tab with a People / Groups toggle. People view shows individual ungrouped students. Groups view shows forming groups that are recruiting.
2. My Group: the student's own group. Empty state when ungrouped. Shows forming group, pending applications, and confirmation flow when applicable.
3. Profile: the student's own profile. Editable anytime.

Chat is a slide-out panel, not a separate tab. It opens from the right side when a student clicks a request card or notification. The panel overlays the current view without navigating away.

Navigation by student status:
- Searching: Discovery is the default landing page. My Group shows empty state.
- Forming: Discovery is still accessible for recruiting. My Group shows the forming group.
- Grouped: Discovery is hidden. My Group is the default and only active view. Chat panels become read-only.

---

## Student Statuses

Three statuses. Every student has exactly one at any time.

- Searching: no group. The student may have sent or received requests, but has not accepted or been accepted into any group.
- Forming: the student has accepted someone or been accepted. A group exists on the My Group page but is not yet confirmed.
- Grouped: the group is confirmed. Done.

Contact-level detail (Request Sent, Replied, Declined, No Response) is shown on individual cards as a contact status tag. Contact status is separate from student status. A student can be "searching" while having five cards tagged "Request Sent."

---

## Group Leader

The student who triggers the first Accept becomes the group leader automatically. The leader is the only person who can list the group on the Groups view, set up the application form, make final Accept/Decline decisions on applications, and initiate group confirmation. Leadership transfer is out of scope for the prototype.

---

## Notification Types

The notification icon in the top nav shows a dropdown with these event types:
- Group Request received
- Group Application received
- Request accepted / declined
- Application accepted / declined
- Group member left
- Group confirmation requested (from leader)
- Urgent Mode activated (deadline approaching)

Each notification links directly to the relevant panel or page. Notifications are not a separate page. They are a dropdown list.

---

## Scenario 1: First-Time Setup

Who: A new student joining the course.

Start state: Student has a 6-character course code from the TA.

Flow:
1. Student goes to the signup page. No TA option is visible. TAs use a separate URL (e.g., easea.com/instructor).
2. Student enters the course code and signs up with their university email. The email is the unique key that matches the student to the TA's CSV. If the email is not found, the student sees: "Your email was not found in this course. Contact your TA."
3. Section is pre-filled from the CSV. The student cannot change it.
4. Student selects skills from a tag list.
5. Student fills in one schedule grid: "When can you work on the project?" Supports drag-to-select, "copy to all days," and "flexible / not sure." No second grid.
6. Optional short bio.
7. Student lands on Discovery (People view) in "searching" status.

End state: Profile complete. Ready to find teammates.

---

## Scenario 2: Finding a Teammate (Person to Person)

Who: A searching student looking for teammates.

Start state: Discovery (People view). 40+ cards visible.

Flow:
1. Filter bar at the top, always visible. Filters: Section, Skills (include/exclude), Minimum schedule overlap (slider), Status (searching / forming), My Activity (no contact / request sent / replied / no response).
2. Each card shows: name, section, top 3 skills, schedule overlap %, status. Compact.
3. Student clicks a card. Detail panel slides out on the right: full skills, schedule grid with overlap highlighted, bio, compatibility summary.
4. If the person's status is "searching": the panel shows "Send Group Request" with a two-field form ("Why work together?" and "A question for them").
5. If the person's status is "forming": the panel shows that person's group info and a "View Their Group" link. Clicking the link opens the group's detail on the Groups view, where the student can apply through the standard group application flow (Scenario 4). No direct person-to-person request to a forming student. The student applies to the group instead.
6. Request sent. Card updates to "Request Sent." Panel closes.

End state: Request sent. Student stays on Discovery.

Candidate management:
- X button: hides the card. "Hidden (N)" link near filter bar. Restorable.
- Star icon: favorites. Filterable.
- Contact status tags update automatically: No contact, Request Sent, Replied, Declined, No Response (auto after 48h, or 24h in Urgent Mode).
- Grouped students disappear from the board.

---

## Scenario 3: Receiving and Responding to a Group Request

Who: A searching student who received a request.

Start state: Notification badge appears on the relevant card in People view and in the notification dropdown. Email alert sent (notification only, all interaction on website).

Flow:
1. Student clicks the card or notification. Detail panel slides out.
2. Top of panel: system card showing "Group Request from [Name]" with sender's profile summary and form answers. Sender's full profile visible below.
3. Three options at the bottom of the system card:
   - Accept: both enter "forming." They appear on each other's My Group page. The person who accepted becomes group leader if no group existed yet. If the accepter is already forming, the requester joins the existing forming group.
   - Reply: chat area opens below the system card in the same panel. Plain text only. Purpose-bound: exists to help decide. Chat becomes read-only after Accept or Decline.
   - Decline: dropdown with pre-written reasons ("Already found a group," "Schedules do not overlap enough," "Looking for different skills") plus optional one-line custom note. Panel closes. Requester's card updates to "Declined" with the reason.

Pre-written decline reasons reduce social friction. Students decline instead of ghosting.

End state (Accept): Both on My Group, "forming."
End state (Reply): Chat continues until Accept or Decline.
End state (Decline): Panel closes. Requester sees reason, moves on.

---

## Scenario 4: Applying to a Forming Group

Who: A searching student who wants to join an existing group.

Start state: Discovery (Groups view). Cards show forming groups that are recruiting.

Flow:
1. Each group card shows: leader name, member count / max, top 3 skills needed, section. Compact.
2. Student clicks a card. Detail panel shows: member profiles, combined schedule, skills composition (what the group has vs. needs), leader's description.
3. Application form below the group info. Default template with three questions: "What skills can you contribute?", "What role do you want?", "When are you free to work?" The leader can customize these questions. The default is always pre-filled so groups that do not customize still get structured applications.
4. Student fills out and submits.
5. Group card updates to "Applied."

End state: Application sent. Student can apply to other groups and send person-to-person requests on People view simultaneously.

---

## Scenario 5: Group Leader Reviewing Applications

Who: A group leader whose group is recruiting.

Start state: Notification: "New application from [Name]."

Flow:
1. Leader goes to My Group. "Pending Applications (N)" section at the top.
2. Each application shows: applicant profile summary, schedule overlap with the group, skills the applicant adds, and form answers. Compatibility indicator highlights gaps the applicant fills.
3. Group members can thumbs up / thumbs down each application. All members see each other's votes. No separate chat needed for discussion.
4. Leader decides: Accept (applicant joins), Reply (chat panel opens with applicant), Decline (pre-written reasons + optional note).

End state (Accept): Applicant joins. My Group updates for everyone.

---

## Scenario 6: Managing Outreach

Who: A student who has sent multiple requests and applications.

Start state: 10 people contacted. Mixed results.

Flow:
1. On People view, every interacted card shows a contact status tag: Request Sent, Replied, Declined, No Response.
2. "My Activity" filter narrows the view: no contact only, replied only, request sent only.
3. No Response auto-triggers after 48h (24h in Urgent Mode). Student can hide or send one follow-up.
4. Declined cards are greyed out. Hideable.
5. On Groups view, applied groups show: Applied, Replied, Accepted, Declined.

End state: Clear view of active prospects. No wasted effort.

No read receipts. The system shows action-based statuses only.

---

## Scenario 7: Group Confirmation

Who: Forming group members ready to finalize.

Start state: My Group page, "forming" status, group has reached minimum size.

Flow:
1. My Group shows: members, skills, combined schedule overlap, skills composition.
2. If still recruiting, leader can list the group on Groups view and set up the application form.
3. "Confirm Group" button is available when member count is between minimum and maximum (set by TA). A group of 3 can confirm if min is 3, even if max is 5.
4. Leader clicks "Confirm Group." All members get a confirmation prompt on My Group. Each clicks "Confirm."
5. Time limit: members have 24 hours to confirm. A member who does not confirm within 24 hours is automatically removed from the group and reverts to "searching." Remaining members stay forming and can recruit a replacement.
6. Once all remaining members confirm: group status becomes "grouped." The group is removed from Groups view. Members disappear from People view. All pending outgoing requests are auto-withdrawn with system message: "[Name] has joined a confirmed group." Incoming requests show "No longer available."

End state: Group confirmed. My Group shows final roster with a prompt to exchange external contact info (Discord, WhatsApp). TA dashboard updates.

---

## Scenario 8: Leaving a Forming Group

Who: A forming group member who wants to leave.

Start state: My Group page, forming group.

Flow:
1. Student clicks "Leave Group."
2. Confirmation dialog: "Are you sure? The remaining members will be notified."
3. Student confirms. Status reverts to "searching." Returns to Discovery.
4. Remaining members get a notification. If group drops below minimum, "Confirm Group" is disabled. If one member remains, the group dissolves and that member reverts to "searching."

End state: Student is searching again. Group adjusts or dissolves.

---

## Scenario 9: Deadline Pressure (Urgent Mode)

Who: Ungrouped students near the deadline.

Start state: 3 days before deadline. No group.

Flow:
1. Discovery shows Urgent Mode banner: "Deadline in 3 days. [N] students still ungrouped."
2. People view auto-filters to ungrouped students only. Maximum visibility.
3. "Send Group Request" buttons are larger. Request form simplified to one field: "Quick message."
4. No Response timer shortens to 24 hours.
5. One-time email: "Deadline approaching. [N] students still looking."
6. After deadline: system auto-creates groups from remaining students. Result screen only. Algorithm logic is out of scope for the prototype. My Group shows auto-assigned group with note: "This group was automatically created because the deadline passed."

End state: Every student has a group.

---

## Scenario 10: TA Course Setup and Monitoring

Who: A TA.

Start state: TA landing page (easea.com/instructor).

Flow:
1. Create course: name, min group size, max group size, deadline.
2. Upload CSV: student name, university email, section. Confirmation: "45 students imported. L0101: 23, L0201: 22."
3. Receive 6-character course code to distribute.
4. Dashboard: total students, count per status (searching / forming / grouped), broken down by section. Progress bar: "X% confirmed."
5. Ungrouped student list with activity level (requests sent, received, days since last activity).
6. After deadline: view all groups (confirmed + auto-assigned). Manual adjustment available (move students between groups).

End state: Full visibility, no interference in student decisions.

---

## Summary of Required Changes

1. Build Discovery as one tab with People / Groups toggle. Chat is a slide-out panel, not a tab.
2. Three student statuses: searching, forming, grouped. Contact status is separate (on cards).
3. Forming students on People view link to their group on Groups view. No direct request to forming students.
4. Structured request and application flows with system cards in the chat panel. Decline uses pre-written reasons.
5. Group applications reviewed on My Group page with member voting. Default application template provided.
6. Group confirmation with min/max size, 24h confirm window, auto-remove non-responders.
7. Separate TA entry point. CSV upload for section assignment. Student matches via university email.
8. One schedule grid only. Filters always visible on Discovery. Candidate management (hide, favorite, status tags).
9. Urgent Mode as a UI change on Discovery, not a new feature. Auto-group result screen only.
10. TA dashboard for real-time formation monitoring.
