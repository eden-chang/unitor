## Design Alternatives

### Alternative 1: Find Teammates Dashboard

Description: This alternative assumes that students' primary barrier to group formation is visibility i.e. they know what they want in a teammate, but have no reliable way to see who is available. The core interaction is self-directed browsing: a centralized dashboard displays all currently unmatched students in a course, each represented by a profile card showing their status (searching, in conversation, confirmed), skills, availability, and section. Students filter by relevant attributes and initiate contact directly through the system. This keeps the student in control of every decision while eliminating the need to scatter outreach across Quercus, email, and Discord.

Advantages from a user's perspective:

- Students retain full agency over who they reach out to and why, which is important for students who have non-obvious compatibility criteria (e.g., preferred work style, timezone, prior course experience) that an algorithm might not surface.
- The real-time status display immediately eliminates the most frustrating part of the current experience which is sending messages to students who are already grouped, thereby reducing wasted effort and the social discomfort of repeated follow-up.

Disadvantages from a user's perspective:

- In large lecture courses, students may face the same cognitive overload they currently experience on Quercus discussion boards: too many profiles to meaningfully evaluate, with no clear signal of where to start.
- Students who are less proactive or socially confident must still initiate contact themselves; the system improves visibility but does not reduce the interpersonal effort or risk of rejection that deters some students from reaching out at all.

Requirements Coverage:

| Requirement | Supports / Struggles | Justification |
|---|---|---|
| 7.1 Centralized Discovery | Supports | The dashboard is the direct implementation of this requirement i.e. all unmatched students and their attributes are visible in one place, with live status, eliminating the need to cross-reference Quercus, email, or Discord. |
| 7.2 Pre-Commitment Compatibility Assessment | Supports | Profile cards surface skills, availability, and work preferences before any contact is initiated, giving students the structured comparison the requirement calls for. The filtering mechanism further accelerates this comparison across multiple candidates simultaneously. |
| 7.3 Seamless Transition | Supports | Once two students express mutual interest, the system can facilitate direct in-platform messaging or a structured exchange of external contact details (e.g., Discord handle), preventing the drop-off that currently occurs when students move between disconnected platforms. |
| 7.4 Deadline Pressure | Struggles | The dashboard surfaces who is available but takes no proactive action as the deadline approaches. Students who are poor at self-advocacy or who have been repeatedly ignored will remain unmatched unless the system actively intervenes i.e. passive visibility is insufficient for the most vulnerable students under time pressure. |
| 7.5 Admin Visibility | Supports | The same status data powering student-facing profiles can be aggregated into an instructor view showing unmatched counts, stated preferences, and formation progress over time, directly satisfying the requirement without additional data collection. |

---

### Alternative 2: Algorithm Matching with Compatibility Score

Description: This alternative assumes that students are unreliable judges of their own compatibility needs i.e. they either over-index on social familiarity or under-consider factors like schedule alignment and skill diversity that predict team success. Rather than asking students to browse and evaluate, the system collects structured profile data upfront (skills, availability, communication preferences, section) and runs a compatibility algorithm that generates ranked match suggestions with transparent score breakdowns. Students interact with a shortlist of curated recommendations rather than a full class directory. The design prioritizes informed decision-making over browsing freedom.

Advantages from a user's perspective:

- Students who find open-ended social searching stressful or time-consuming benefit significantly: instead of cold-messaging strangers, they receive a focused list of high-compatibility peers with an explanation of why each match is suggested, lowering the barrier to first contact.
- The algorithm can actively surface complementary skill pairings (e.g., pairing a student strong in backend development with one strong in frontend) that students would not identify through self-directed browsing, directly addressing the finding that groups "really suffered because everyone had similar skills."

Disadvantages from a user's perspective:

- Students who disagree with their suggested matches have limited recourse. If the algorithm's weightings don't reflect their actual priorities, they may feel trapped by recommendations they don't trust, with no intuitive way to find someone outside their shortlist.
- The quality of every match depends entirely on the accuracy of self-reported profile data. Students who fill out profiles quickly or strategically will receive poor matches, and there is no feedback mechanism to help them understand why their suggestions feel off.

Requirements Coverage:

| Requirement | Supports / Struggles | Justification |
|---|---|---|
| 7.1 Centralized Discovery | Struggles | The algorithm replaces browsing with a curated shortlist, which means students cannot view or discover the full pool of available classmates. This solves the cognitive overload problem but removes the open-ended visibility that 7.1 explicitly requires i.e. students cannot confirm for themselves who is actually available. |
| 7.2 Pre-Commitment Compatibility Assessment | Supports strongly | This is the alternative's core strength. The compatibility score breakdown gives students a structured, attribute-by-attribute comparison before any commitment, going beyond what the requirement asks by making the comparison proactive rather than on-demand. |
| 7.3 Seamless Transition | Struggles | The algorithm facilitates discovery but does not address what happens after a match is accepted. Without a built-in coordination pathway, students who match via the algorithm still face the same platform-switching friction when they try to begin working together. |
| 7.4 Deadline Pressure | Supports | Because the system already holds compatibility data for all students, it can automatically identify unmatched students as the deadline approaches and either push escalated match suggestions or form provisional groups, thus directly addressing the need for facilitated connection without requiring students to self-advocate. |
| 7.5 Admin Visibility | Supports | The structured data collection required for matching also provides instructors with a rich dataset: unmatched students, their stated preferences, and match acceptance rates over time, satisfying the administrative overview requirement as a natural byproduct of the core feature. |

---

### Alternative 3: Project-Based Dashboard

Description: This alternative assumes that students form better groups when there is shared interest in the work itself rather than abstract compatibility metrics. Instead of browsing people, students browse and post project idea pitches. A student with an idea posts it publicly; interested peers browse pitches, view the proposer's profile, and request to join. Groups coalesce around ideas rather than around compatibility scores or availability calendars. This reframes group formation as a creative and motivational act rather than a logistical one, and assumes that intrinsic alignment on project direction is a stronger predictor of team cohesion than schedule overlap alone.

Advantages from a user's perspective:

- Students who feel anxious about cold-messaging strangers have a lower-friction entry point: expressing interest in a project idea feels less socially exposed than directly requesting someone as a teammate, reducing the interpersonal risk that currently deters outreach.
- Groups formed around a shared project vision enter the collaboration phase with an established common goal, which reduces the early-stage coordination overhead of aligning on direction which is one of the documented sources of team breakdown.

Disadvantages from a user's perspective:

- Students without a formed project idea, or in courses where the project is instructor-assigned, are immediately disadvantaged: the entire interaction model assumes students have something to pitch, which may not reflect how most university courses structure project work.
- Because group assembly is driven by interest in an idea rather than systematic compatibility evaluation, important practical factors like schedule alignment and skill balance may not be considered until after commitment, recreating the same late-stage breakdown the system is meant to prevent.

Requirements Coverage:

| Requirement | Supports / Struggles | Justification |
|---|---|---|
| 7.1 Centralized Discovery | Supports | The pitch board provides a single location where students can see active project ideas and their proposers, replacing scattered outreach across platforms. However, it surfaces projects rather than people, so students looking for groups without a project idea may find the discovery model disorienting. |
| 7.2 Pre-Commitment Compatibility Assessment | Struggles | Student profiles are visible in reference to a project, but the system provides no structured mechanism for comparing compatibility factors (schedule, skills, work style) before joining. Interest alignment is not the same as compatibility, and this alternative risks reproducing the underprepared groups that the requirement is designed to prevent. |
| 7.3 Seamless Transition | Supports | The act of joining a project naturally initiates a group context, and the system can provide a shared space for that group from the moment membership is confirmed thereby reducing the platform-switching problem by tying coordination to the project object from the start. |
| 7.4 Deadline Pressure | Struggles | Students without a project idea, or whose pitch attracted no interest, have no clear pathway as the deadline approaches. The system has no mechanism to absorb or redirect these students, and the social visibility of an unpopular pitch may increase rather than reduce their anxiety. |
| 7.5 Admin Visibility | Struggles | The pitch-centric data model makes it harder to generate the student-level formation statistics the requirement calls for. Instructors can see which projects exist and how many members they have, but identifying specific unmatched students and their preferences requires looking across pitch activity, which is a less direct view than the requirement demands. |

---

### Cross-Alternative Comparison

The three alternatives reflect fundamentally different assumptions about what drives successful group formation. The Dashboard trusts students to make good decisions if given better information. The algorithm assumes the system should make better decisions on students' behalf. The Project-Based Dashboard assumes that motivational alignment is more foundational than either information or optimization. No single alternative fully satisfies all five requirements: notably, 7.4 (deadline pressure) is only meaningfully addressed by Algorithm Matching, while 7.3 (seamless transition) is best handled by the Dashboard or Project-Based approach. This suggests a convergent design should combine the Dashboard's visibility model with the Algorithm's proactive deadline intervention, while borrowing the Project-Based model's group context as an optional coordination scaffold.