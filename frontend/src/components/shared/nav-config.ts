/**
 * Page-id mappings used by ``<Nav>`` and by ``App.tsx`` to decide
 * whether to show the app navigation chrome.
 *
 * Lives in its own file so ``Nav.tsx`` only exports a component
 * (required for Vite fast refresh).
 */

export const APP_PAGES = new Set([
  "board",
  "mygroup",
  "urgent",
  "profile-edit",
  "chats",
]);

export const PAGE_TO_TAB: Record<string, string> = {
  board: "board",
  urgent: "board",
  mygroup: "mygroup",
  "profile-edit": "profile-edit",
  chats: "chats",
};
