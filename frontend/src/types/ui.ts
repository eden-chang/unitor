/**
 * UI-level types shared across pages.
 *
 * The prototype's mock-data shapes (``Student``, ``StatusInfo``,
 * ``CompatibilityBreakdown``) stay here for now because both in-scope
 * and out-of-scope pages reference them. They get replaced with the
 * real API types (``StudentListItem``, ``CompatibilityResult``, etc.
 * from ``@/types/api``) during stage 1 step E.
 */

export interface GoProps {
  /** Navigate to a named page in the string-based router. */
  go: (page: string) => void;
}

export interface RoleGoProps extends GoProps {
  /** ``"s"`` for student, ``"t"`` for TA / instructor. */
  role: string;
}

export type StudentStatus = "solo" | "open-group" | "closed";

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType =
  | "group-request-received"
  | "group-application-received"
  | "request-accepted"
  | "request-declined"
  | "application-accepted"
  | "application-declined"
  | "member-left"
  | "confirm-requested"
  | "urgent-mode";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  actionTarget?: string;
}

// ---------------------------------------------------------------------------
// Mock-data shapes (replaced by @/types/api equivalents during step E)
// ---------------------------------------------------------------------------

export interface Student {
  name: string;
  sec: string;
  skills: string[];
  status: StudentStatus;
  contactStatus: "none" | "request-sent" | "replied" | "declined" | "no-response";
  overlap: string;
  init: string;
  bio: string;
  rat: Record<string, string>;
  lastActive: string;
  compatScore: number;
  scheduleOverlapHrs: number;
}

export interface StatusInfo {
  l: string;
  variant?: "success" | "warning" | "danger";
  cls?: string;
}

export interface CompatibilityBreakdown {
  overall: number;
  scheduleScore: number;
  skillScore: number;
  workStyleScore: number;
  matchReasons: string[];
  warnings: string[];
  skillComplementarity: { skill: string; coveredBy: "you" | "them" | "both" | "gap" }[];
}

// ---------------------------------------------------------------------------
// Cross-page page props (rare — most page props live with the page itself)
// ---------------------------------------------------------------------------

export interface SentProps extends GoProps {
  targetName: string;
}
