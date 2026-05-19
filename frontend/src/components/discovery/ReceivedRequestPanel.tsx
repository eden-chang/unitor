/**
 * Side-panel content shown when the viewer opens an incoming group
 * request from another student.
 *
 * Three local modes:
 *   - default: Accept / Reply / Decline buttons.
 *   - replyOpen: small inline chat to negotiate before accepting.
 *   - declineOpen: pick a decline reason + optional note.
 */

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StudentAvatar } from "@/components/shared/StudentAvatar";
import { cn } from "@/lib/utils";
import { STU } from "@/lib/mock-data";

interface ReceivedRequestPanelProps {
  senderName: string;
  onClose: () => void;
  onAccept?: () => void;
  onReply?: () => void;
}

export function ReceivedRequestPanel({
  senderName,
  onClose,
  onAccept,
  onReply,
}: ReceivedRequestPanelProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const sender = STU.find((s) => s.name === senderName);
  const DECLINE_REASONS = [
    "Already found a group",
    "Schedules do not overlap enough",
    "Looking for different skills",
  ];

  if (!sender) return null;
  return (
    <div className="p-6">
      <div className="py-4 px-5 bg-accent border border-border rounded-xl mb-5">
        <div className="text-[11px] font-bold text-primary uppercase tracking-wide mb-2">
          Group Request
        </div>
        <div className="text-[13px] font-semibold mb-2">From {senderName}</div>
        <div className="text-[12px] text-gray-700 mb-1">
          <span className="font-semibold">Why work together?</span>
          <p className="mt-0.5">
            I think our skills complement each other well — I cover frontend and you have backend.
          </p>
        </div>
        <div className="text-[12px] text-gray-700">
          <span className="font-semibold">Their question:</span>
          <p className="mt-0.5">
            What's your preferred working style — async or sync collaboration?
          </p>
        </div>
      </div>
      <div className="flex gap-3 items-center mb-5 pb-5 border-b border-gray-100">
        <StudentAvatar name={sender.name} size="size-10" textSize="text-sm" />
        <div>
          <div className="text-sm font-semibold">{sender.name}</div>
          <div className="text-xs text-gray-500">
            Section {sender.sec} · {sender.overlap} overlap
          </div>
        </div>
      </div>
      {!replyOpen && !declineOpen && (
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-success hover:bg-success/90"
            onClick={() => {
              onAccept?.();
              onClose();
            }}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              onReply?.();
            }}
          >
            Reply
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-danger border-danger hover:bg-danger-bg"
            onClick={() => setDeclineOpen(true)}
          >
            Decline
          </Button>
        </div>
      )}
      {replyOpen && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 max-h-[200px] overflow-y-auto flex flex-col gap-2">
            {messages.length === 0 ? (
              <p className="text-[11px] text-gray-400 text-center py-3">
                Start a conversation to help decide.
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[12px] py-1.5 px-3 rounded-lg max-w-[85%]",
                    m.from === "me"
                      ? "bg-primary text-primary-foreground ml-auto"
                      : "bg-gray-100 text-gray-700",
                  )}
                >
                  {m.text}
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Input
              ref={replyInputRef}
              className="flex-1 text-[12px] h-8"
              placeholder="Type a message..."
            />
            <Button
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => {
                if (replyInputRef.current?.value) {
                  setMessages((m) => [
                    ...m,
                    { from: "me", text: replyInputRef.current!.value },
                  ]);
                  replyInputRef.current!.value = "";
                }
              }}
            >
              Send
            </Button>
          </div>
          <div className="flex gap-2 p-2 border-t border-gray-100">
            <Button
              size="sm"
              className="flex-1 text-xs bg-success hover:bg-success/90"
              onClick={() => {
                onAccept?.();
                onClose();
              }}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs text-danger"
              onClick={() => {
                setReplyOpen(false);
                setDeclineOpen(true);
              }}
            >
              Decline
            </Button>
          </div>
        </div>
      )}
      {declineOpen && (
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="text-[13px] font-semibold mb-3">Select a reason</div>
          <div className="space-y-2 mb-3">
            {DECLINE_REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="decline-reason"
                  value={r}
                  checked={declineReason === r}
                  onChange={() => setDeclineReason(r)}
                  className="accent-primary"
                />
                <span className="text-[12px] text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          <Textarea
            placeholder="Optional note (one line)..."
            className="text-[12px] mb-3 h-16 resize-none"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setDeclineOpen(false)}
            >
              Back
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs bg-danger hover:bg-danger/90 text-white"
              onClick={onClose}
            >
              Send Decline
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
