/**
 * MyGroup workspace.
 *
 * Three branches based on the caller's membership state:
 *   - **No group** (solo) — empty state with a "Create a group" CTA
 *     and a link back to Discovery for the apply flow.
 *   - **Member** — group info, member list, leave button. Per-member
 *     "I confirm" UI is stubbed (backend endpoint lands in stage 2c+).
 *   - **Leader** — everything the member sees + edit name/description/
 *     recruiting + replace-set application questions + applications
 *     inbox with accept/decline + initiate confirmation. Leaving as
 *     leader triggers a transfer-or-disband warning.
 *
 * All data comes from `useMyGroup(courseId)`; mutations live in
 * `useGroups`. The mock `studentStatus` prop the legacy App.tsx
 * passed in is dropped — membership state derives from the live
 * backend response.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Icon } from "@/components/shared/icons";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/auth-context";
import {
  useAcceptApplication,
  useConfirmGroup,
  useCreateGroup,
  useDeclineApplication,
  useGroupApplications,
  useLeaveGroup,
  useMyGroup,
  useUpdateGroup,
} from "@/hooks/useGroups";
import { cn } from "@/lib/utils";
import type {
  ApplicationRead,
  GroupApplicationQuestionEntry,
  GroupApplicationQuestionRead,
  GroupDetailRead,
  GroupMemberDetail,
} from "@/types/api";
import type { GoProps } from "@/types/ui";

interface MyGroupProps extends GoProps {
  onOpenChat?: (userId: string) => void;
}

export function MyGroup({ go, onOpenChat }: MyGroupProps) {
  const { user, enrollments } = useAuth();
  const enrollment = enrollments[0];
  const courseId = enrollment?.course.id;
  const myGroupQuery = useMyGroup(courseId);

  if (!enrollment) {
    return <Shell heading="Join a course first" body="No active enrollments yet." />;
  }
  if (myGroupQuery.isLoading) {
    return <Shell heading="Loading…" body="" />;
  }
  if (myGroupQuery.error && myGroupQuery.error.code !== "GROUP_NOT_FOUND") {
    return <Shell heading="Couldn't load your group" body={myGroupQuery.error.message} />;
  }

  if (!myGroupQuery.data) {
    return (
      <EmptyState
        enrollmentId={enrollment.id}
        onCreated={() => myGroupQuery.refetch()}
        onBrowse={() => go("board")}
      />
    );
  }

  const group = myGroupQuery.data;
  const myMembership = group.members.find((m) => m.user_id === user?.id);
  const isLeader = myMembership?.role === "leader";

  return (
    <GroupWorkspace
      group={group}
      isLeader={isLeader}
      myMembership={myMembership}
      onLeft={() => {
        // After leaving, refetch so the empty state shows.
        void myGroupQuery.refetch();
      }}
      onOpenChat={onOpenChat}
    />
  );
}

// ---------------------------------------------------------------------------
// Empty (solo) state
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  enrollmentId: string;
  onCreated: () => void;
  onBrowse: () => void;
}

function EmptyState({ enrollmentId, onCreated, onBrowse }: EmptyStateProps) {
  const createMutation = useCreateGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const submit = async () => {
    setError(null);
    try {
      await createMutation.mutateAsync({
        enrollment_id: enrollmentId,
        name: name.trim() || null,
        description: description.trim() || null,
        recruiting: true,
        application_questions: [],
      });
      onCreated();
    } catch (e) {
      if (e instanceof ApiError && e.code === "ALREADY_IN_GROUP") {
        setError("You already have an active group for this course — refresh.");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Couldn't create the group. Try again.");
      }
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[640px] mx-auto py-14 px-6">
        <h1 className="text-[28px] font-bold mb-2 -tracking-[0.5px]">My Group</h1>
        <p className="text-base text-gray-600 mb-9">
          You&apos;re not in a group yet. Create one and start recruiting, or
          browse Discovery to apply to a forming group.
        </p>

        {!showForm ? (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => setShowForm(true)}>
              Create a Group
            </Button>
            <Button variant="outline" className="flex-1" onClick={onBrowse}>
              Browse Groups
            </Button>
          </div>
        ) : (
          <Card className="p-5 gap-4 shadow-none">
            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">
                Group name (optional)
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Team Backend"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] mb-[7px] block">
                Description (optional)
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                placeholder="What are you looking for?"
                className="h-20 resize-none"
              />
            </div>
            {error && <p className="text-[13px] text-danger">{error}</p>}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={createMutation.isPending}
                onClick={() => void submit()}
              >
                {createMutation.isPending ? "Creating…" : "Create Group"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Member + leader workspace
// ---------------------------------------------------------------------------

interface GroupWorkspaceProps {
  group: GroupDetailRead;
  isLeader: boolean;
  myMembership: GroupMemberDetail | undefined;
  onLeft: () => void;
  onOpenChat?: (userId: string) => void;
}

function GroupWorkspace({
  group,
  isLeader,
  myMembership,
  onLeft,
  onOpenChat,
}: GroupWorkspaceProps) {
  const leaveMutation = useLeaveGroup();
  const confirmMutation = useConfirmGroup();
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const leaderName =
    group.members.find((m) => m.role === "leader")?.display_name ?? "Unnamed leader";

  const handleLeave = async () => {
    setShowLeaveDialog(false);
    try {
      await leaveMutation.mutateAsync(group.id);
      onLeft();
    } catch {
      // Swallow — the user will see the group still rendered.
    }
  };

  const handleConfirm = async () => {
    try {
      await confirmMutation.mutateAsync(group.id);
    } catch {
      // intentional — error surfaces via the mutation's error state
    }
  };

  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[780px] mx-auto py-10 px-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-[13px] text-gray-500 mb-0.5">My Group</div>
            <h1 className="text-[28px] font-bold text-foreground -tracking-[0.5px]">
              {group.name ?? `${leaderName}'s Group`}
            </h1>
          </div>
          <StatePill state={group.state} recruiting={group.recruiting} />
        </div>

        {group.description && (
          <p className="text-[14px] text-gray-700 mb-6">{group.description}</p>
        )}

        {group.state === "confirming" && (
          <div className="px-5 py-3 bg-caution-bg border border-caution-border rounded-xl mb-5 text-[13px] text-caution-dark">
            <strong className="text-caution">Confirmation in progress.</strong>{" "}
            Group transitions to <em>confirmed</em> once every member has
            confirmed.
          </div>
        )}

        <MembersCard group={group} onOpenChat={onOpenChat} />

        {isLeader && (
          <>
            <LeaderEditCard group={group} />
            <ApplicationsInbox group={group} />
            <Card className="p-5 mb-4 gap-3 shadow-none">
              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block">
                Confirmation
              </Label>
              <p className="text-[13px] text-gray-600">
                {group.state === "forming"
                  ? "Once recruiting is done, kick off confirmation. Recruiting will be turned off."
                  : group.state === "confirming"
                    ? `Waiting on ${group.members.filter((m) => !m.confirmed_at).length} member(s) to confirm.`
                    : group.state === "confirmed"
                      ? "Group confirmed."
                      : "Group disbanded."}
              </p>
              {(group.state === "forming" || group.state === "confirming") && (
                <Button
                  variant="outline"
                  disabled={confirmMutation.isPending}
                  onClick={() => void handleConfirm()}
                >
                  {confirmMutation.isPending
                    ? "Working…"
                    : group.state === "forming"
                      ? "Initiate Confirmation"
                      : "Re-check confirmation"}
                </Button>
              )}
              {confirmMutation.error && (
                <p className="text-[13px] text-danger">
                  {confirmMutation.error.message}
                </p>
              )}
            </Card>
          </>
        )}

        {myMembership && group.state !== "disbanded" && (
          <Card className="p-5 mb-4 gap-3 shadow-none">
            <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block">
              Leave
            </Label>
            <p className="text-[13px] text-gray-600">
              {isLeader && group.members.length > 1
                ? "You're the leader. Leaving transfers leadership to the oldest member."
                : isLeader
                  ? "You're the only member. Leaving disbands this group."
                  : "Leaving removes your active membership."}
            </p>
            <Button
              variant="outline"
              className="border-danger text-danger hover:bg-danger-bg"
              disabled={leaveMutation.isPending}
              onClick={() => setShowLeaveDialog(true)}
            >
              {leaveMutation.isPending ? "Leaving…" : "Leave Group"}
            </Button>
            {leaveMutation.error && (
              <p className="text-[13px] text-danger">{leaveMutation.error.message}</p>
            )}
          </Card>
        )}

        <ConfirmDialog
          open={showLeaveDialog}
          title={
            isLeader && group.members.length === 1
              ? "Disband this group?"
              : "Leave this group?"
          }
          body={
            isLeader && group.members.length === 1
              ? "You're the only member. Leaving disbands the group. This can't be undone."
              : "You can always join or create another group later."
          }
          confirmLabel={
            isLeader && group.members.length === 1 ? "Disband" : "Leave"
          }
          onConfirm={() => void handleLeave()}
          onCancel={() => setShowLeaveDialog(false)}
        />
      </div>
    </div>
  );
}

function StatePill({
  state,
  recruiting,
}: {
  state: GroupDetailRead["state"];
  recruiting: boolean;
}) {
  const cls = {
    forming: recruiting
      ? "bg-[#DCFCE7] text-[#166534]"
      : "bg-gray-100 text-gray-500",
    confirming: "bg-[#FEF3C7] text-[#92400E]",
    confirmed: "bg-[#9652ca]/10 text-[#9652ca]",
    disbanded: "bg-gray-100 text-gray-500",
  }[state];
  const label =
    state === "forming" ? (recruiting ? "Recruiting" : "Forming") : state;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-[26px] px-3 rounded-[12px] leading-none text-[12px] font-medium capitalize",
        cls,
      )}
    >
      {label}
    </span>
  );
}

function MembersCard({
  group,
  onOpenChat,
}: {
  group: GroupDetailRead;
  onOpenChat?: (userId: string) => void;
}) {
  return (
    <Card className="p-5 mb-4 gap-3 shadow-none">
      <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block">
        Members ({group.members.length})
      </Label>
      {group.members.map((m) => (
        <div key={m.user_id} className="flex items-center gap-3">
          <StudentAvatar
            name={m.display_name ?? "?"}
            size="size-9"
            textSize="text-[11px]"
          />
          <div className="flex-1">
            <div className="text-[14px] font-semibold">
              {m.display_name ?? "Pending name"}
            </div>
            <div className="text-[12px] text-gray-500 capitalize">
              {m.role}
              {m.confirmed_at && " · confirmed"}
            </div>
          </div>
          {onOpenChat && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onOpenChat(m.user_id)}
            >
              <Icon.mailSend size={14} color="#9652ca" />
              Chat
            </Button>
          )}
        </div>
      ))}
    </Card>
  );
}

function LeaderEditCard({ group }: { group: GroupDetailRead }) {
  // Remount when the group id changes — that's the only legitimate "the
  // upstream group changed under us, throw away the draft" trigger.
  // Within a session, the local draft is the source of truth until the
  // user clicks Save or Discard.
  return <LeaderEditCardInner key={group.id} group={group} />;
}

function LeaderEditCardInner({ group }: { group: GroupDetailRead }) {
  const updateMutation = useUpdateGroup(group.id);
  const [name, setName] = useState(group.name ?? "");
  const [description, setDescription] = useState(group.description ?? "");
  const [recruiting, setRecruiting] = useState(group.recruiting);
  const [questions, setQuestions] = useState<GroupApplicationQuestionEntry[]>(
    group.application_questions.map(toEntry),
  );
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      const updated = await updateMutation.mutateAsync({
        name: name.trim() || null,
        description: description.trim() || null,
        recruiting,
        application_questions: questions,
      });
      // Re-seed the draft from the server's response so any leader-side
      // normalization (e.g. trimmed names) is reflected in the form.
      setName(updated.name ?? "");
      setDescription(updated.description ?? "");
      setRecruiting(updated.recruiting);
      setQuestions(updated.application_questions.map(toEntry));
      setDirty(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save changes.");
    }
  };

  return (
    <Card className="p-5 mb-4 gap-3 shadow-none">
      <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block">
        Leader settings
      </Label>
      <div>
        <Label className="text-[11px] text-gray-500 mb-1 block">Group name</Label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          placeholder={`${group.members.find((m) => m.role === "leader")?.display_name ?? "Leader"}'s Group`}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 mb-1 block">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value.slice(0, 300));
            setDirty(true);
          }}
          placeholder="What are you looking for?"
          className="h-20 resize-none"
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="accent-primary"
          checked={recruiting}
          onChange={(e) => {
            setRecruiting(e.target.checked);
            setDirty(true);
          }}
        />
        <span className="text-[13px] text-gray-600">Open to new applications</span>
      </label>

      <div className="border-t border-gray-100 pt-3">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block mb-2">
          Application questions
        </Label>
        {questions.length === 0 && (
          <p className="text-[13px] text-gray-400 mb-2">
            No questions yet. Add one to vet applicants.
          </p>
        )}
        {questions.map((q, i) => (
          <div key={q.id ?? `new-${i}`} className="flex gap-2 mb-2 items-start">
            <Input
              value={q.question_text}
              onChange={(e) => {
                const next = [...questions];
                next[i] = { ...next[i], question_text: e.target.value };
                setQuestions(next);
                setDirty(true);
              }}
              placeholder="Why do you want to join?"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuestions(questions.filter((_, j) => j !== i));
                setDirty(true);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setQuestions([
              ...questions,
              { question_text: "", display_order: questions.length },
            ]);
            setDirty(true);
          }}
        >
          + Add question
        </Button>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          disabled={!dirty || updateMutation.isPending}
          onClick={() => {
            setName(group.name ?? "");
            setDescription(group.description ?? "");
            setRecruiting(group.recruiting);
            setQuestions(group.application_questions.map(toEntry));
            setDirty(false);
          }}
        >
          Discard
        </Button>
        <Button
          className="flex-1"
          disabled={!dirty || updateMutation.isPending}
          onClick={() => void save()}
        >
          {updateMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function ApplicationsInbox({ group }: { group: GroupDetailRead }) {
  const appsQuery = useGroupApplications(group.id);
  const accept = useAcceptApplication(group.id);
  const decline = useDeclineApplication(group.id);

  const items = useMemo(
    () => appsQuery.data?.items.filter((a) => a.status === "pending") ?? [],
    [appsQuery.data],
  );

  return (
    <Card className="p-5 mb-4 gap-3 shadow-none">
      <div className="flex justify-between items-center">
        <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-[1px] block">
          Applications ({items.length} pending)
        </Label>
      </div>
      {appsQuery.isLoading && (
        <p className="text-[13px] text-gray-400">Loading…</p>
      )}
      {appsQuery.error && (
        <p className="text-[13px] text-danger">{appsQuery.error.message}</p>
      )}
      {!appsQuery.isLoading && items.length === 0 && (
        <p className="text-[13px] text-gray-400">No pending applications.</p>
      )}
      {items.map((app) => (
        <ApplicationRow
          key={app.id}
          application={app}
          accepting={accept.isPending}
          declining={decline.isPending}
          onAccept={() => void accept.mutateAsync(app.id).catch(() => {})}
          onDecline={() => void decline.mutateAsync(app.id).catch(() => {})}
        />
      ))}
      {(accept.error || decline.error) && (
        <p className="text-[13px] text-danger">
          {(accept.error ?? decline.error)?.message}
        </p>
      )}
    </Card>
  );
}

function ApplicationRow({
  application,
  accepting,
  declining,
  onAccept,
  onDecline,
}: {
  application: ApplicationRead;
  accepting: boolean;
  declining: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="border border-gray-100 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <StudentAvatar
          name={application.applicant_display_name ?? "?"}
          size="size-9"
          textSize="text-[11px]"
        />
        <div className="flex-1">
          <div className="text-[14px] font-semibold">
            {application.applicant_display_name ?? "Pending name"}
          </div>
          <div className="text-[12px] text-gray-500">
            Applied {new Date(application.created_at).toLocaleString()}
          </div>
        </div>
      </div>
      {application.answers.length === 0 ? (
        <p className="text-[13px] text-gray-400 mb-3">No answers provided.</p>
      ) : (
        application.answers.map((a) => (
          <div key={a.id} className="mb-3">
            <div className="text-[12px] font-semibold text-gray-700">
              {a.question_text_snapshot}
            </div>
            <p className="text-[13px] text-gray-700 mt-0.5 whitespace-pre-wrap">
              {a.answer_text || <span className="text-gray-400">No answer.</span>}
            </p>
          </div>
        ))
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 border-danger text-danger hover:bg-danger-bg"
          disabled={accepting || declining}
          onClick={onDecline}
        >
          Decline
        </Button>
        <Button
          className="flex-1"
          disabled={accepting || declining}
          onClick={onAccept}
        >
          {accepting ? "Accepting…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Shell({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="bg-background min-h-screen pb-6">
      <div className="max-w-[500px] mx-auto pt-20 px-6 text-center">
        <h1 className="text-[24px] font-bold text-foreground mb-2 -tracking-[0.5px]">
          {heading}
        </h1>
        <p className="text-base text-gray-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function toEntry(q: GroupApplicationQuestionRead): GroupApplicationQuestionEntry {
  return {
    id: q.id,
    question_text: q.question_text,
    display_order: q.display_order,
  };
}
