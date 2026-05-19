/**
 * Inline-SVG icon set.
 *
 * Hand-rolled rather than pulled from ``lucide-react`` so we can keep
 * exact pixel-snapping and the exact ``var(--icon-default)`` colour
 * variable from the design tokens. Callers use ``Icon.search``, etc.
 *
 * If you need a brand-new icon, add it here and keep the alphabetical
 * order broken by visual grouping (logo / navigation / actions / etc.).
 */

import type { ReactElement } from "react";

export interface IconProps {
  size?: number;
  color?: string;
}

export const Icon: Record<string, (props: IconProps) => ReactElement> = {
  graduation: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 13c-2.755 0-5-2.245-5-5V3.5H4V2h14.75c.69 0 1.25.56 1.25 1.25V9h-1.5V3.5H17V8c0 2.755-2.245 5-5 5ZM8.5 8c0 1.93 1.57 3.5 3.5 3.5s3.5-1.57 3.5-3.5V7h-7v1Zm0-2.5h7v-2h-7v2Zm6.43 9a4.752 4.752 0 0 1 4.59 3.52l1.015 3.785-1.45.39-1.015-3.785A3.253 3.253 0 0 0 14.93 16H9.07c-1.47 0-2.76.99-3.14 2.41l-1.015 3.785-1.45-.39L4.48 18.02a4.762 4.762 0 0 1 4.59-3.52h5.86Z" fill={color} />
    </svg>
  ),
  clipboard: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M7.105 5H5.5v15.5h5V22H4V3.5h3V2h10v1.5h3V11h-1.5V5h-1.605c-.33 1.15-1.39 2-2.645 2h-4.5c-1.26 0-2.315-.85-2.645-2ZM15.5 3.5h-7v.75c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25V3.5Zm2.22 9.72a2.164 2.164 0 1 1 3.06 3.06l-5.125 5.125-2.22.74a1.237 1.237 0 0 1-1.28-.3c-.335-.34-.45-.83-.3-1.28l.74-2.22 5.125-5.125Zm-2.875 6.875 4.875-4.875a.664.664 0 1 0-.94-.94l-4.875 4.875-.47 1.41 1.41-.47Z" fill={color} />
    </svg>
  ),
  email: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M19.25 20H6.5v-1.5h12.75c.69 0 1.25-.56 1.25-1.25V9.46L12 14.37 2 8.595V6.75A2.755 2.755 0 0 1 4.75 4h14.5A2.755 2.755 0 0 1 22 6.75v10.5A2.755 2.755 0 0 1 19.25 20ZM3.5 7.725 12 12.63l8.5-4.905V6.75c0-.69-.56-1.25-1.25-1.25H4.75c-.69 0-1.25.56-1.25 1.25v.975ZM9 15H3.5v1.5H9V15Zm-7-3h2.5v1.5H2V12Z" fill={color} />
    </svg>
  ),
  books: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 4a3.745 3.745 0 0 0-3 1.51A3.745 3.745 0 0 0 9 4H2v16h7.5c.69 0 1.25.56 1.25 1.25h2.5c0-.69.56-1.25 1.25-1.25H22V4h-7Zm-3.75 15.13a2.726 2.726 0 0 0-1.75-.63h-6v-13H9c1.24 0 2.25 1.01 2.25 2.25v11.38Zm9.25-.63h-6c-.665 0-1.275.235-1.75.63V7.75c0-1.24 1.01-2.25 2.25-2.25h5.5v13Z" fill={color} />
    </svg>
  ),
  camera: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2 17.25A2.755 2.755 0 0 0 4.75 20h14.5A2.755 2.755 0 0 0 22 17.25v-9a2.755 2.755 0 0 0-2.75-2.75h-2.64l-2-2.5H9.39l-2 2.5H4.75A2.755 2.755 0 0 0 2 8.25v9ZM8.11 7l2-2.5h3.78l2 2.5h3.36c.69 0 1.25.56 1.25 1.25v9c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-9C3.5 7.56 4.06 7 4.75 7h3.36Zm-.61 5.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5S14.48 8 12 8s-4.5 2.02-4.5 4.5Zm1.5 0c0-1.655 1.345-3 3-3s3 1.345 3 3-1.345 3-3 3-3-1.345-3-3Z" fill={color} />
    </svg>
  ),
  search: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m21.78 20.72-5.62-5.62A7.96 7.96 0 0 0 18 10c0-4.41-3.59-8-8-8s-8 3.59-8 8 3.59 8 8 8a7.96 7.96 0 0 0 5.1-1.84l5.62 5.62 1.06-1.06ZM10 16.5A6.506 6.506 0 0 1 3.5 10c0-3.585 2.915-6.5 6.5-6.5s6.5 2.915 6.5 6.5-2.915 6.5-6.5 6.5Z" fill={color} />
    </svg>
  ),
  balance: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12.75 12.5h9.265l-.02-.77a9.99 9.99 0 0 0-9.725-9.725l-.77-.02v9.265c0 .69.56 1.25 1.25 1.25Zm7.69-1.5H13V3.56A8.493 8.493 0 0 1 20.44 11ZM3.5 12c0 4.685 3.815 8.5 8.5 8.5 3.965 0 7.345-2.785 8.255-6.5h1.535c-.94 4.545-5 8-9.79 8-5.515 0-10-4.485-10-10 0-4.83 3.44-8.87 8-9.8v1.545C6.275 4.65 3.5 8.005 3.5 12Z" fill={color} />
    </svg>
  ),
  chat: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M2.77 17.7c.155.065.32.095.48.095l.005-.005c.32 0 .64-.125.88-.365L6.56 15h8.19a2.755 2.755 0 0 0 2.75-2.75v-6.5A2.755 2.755 0 0 0 14.75 3h-10A2.755 2.755 0 0 0 2 5.75v10.795c0 .51.3.96.77 1.155ZM3.5 5.75c0-.69.56-1.25 1.25-1.25h10c.69 0 1.25.56 1.25 1.25v6.5c0 .69-.56 1.25-1.25 1.25H5.94L3.5 15.94V5.75Zm16.365 15.68c.24.24.56.365.885.365v.005A1.245 1.245 0 0 0 22 20.55V10.255a2.755 2.755 0 0 0-2.75-2.75H19v1.5h.25c.69 0 1.25.56 1.25 1.25v9.69l-1.94-1.94h-6.81c-.69 0-1.25-.56-1.25-1.25V16.5H9v.255a2.755 2.755 0 0 0 2.75 2.75h6.19l1.925 1.925Z" fill={color} />
    </svg>
  ),
  clockAlert: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 22C6.485 22 2 17.515 2 12S6.485 2 12 2s10 4.485 10 10-4.485 10-10 10Zm0-18.5c-4.685 0-8.5 3.815-8.5 8.5 0 4.685 3.815 8.5 8.5 8.5 4.685 0 8.5-3.815 8.5-8.5 0-4.685-3.815-8.5-8.5-8.5Zm.75 10V8h-1.5v5.5h1.5ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill={color} />
    </svg>
  ),
  star: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  starFilled: ({ size = 24, color = "#9652ca" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  eyeOpen: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  pencil: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4" /><path d="M13.5 6.5l4 4" />
    </svg>
  ),
  reactCheck: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /><path d="M9 12l2 2l4 -4" />
    </svg>
  ),
  reactThumbUp: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11v8a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-7a1 1 0 0 1 1 -1h3a4 4 0 0 0 4 -4v-1a2 2 0 0 1 4 0v5h3a2 2 0 0 1 2 2l-1 5a2 3 0 0 1 -2 2h-7a3 3 0 0 1 -3 -3" />
    </svg>
  ),
  reactHeart: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
    </svg>
  ),
  reactSad: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 10l.01 0" /><path d="M15 10l.01 0" /><path d="M9.5 15.25a3.5 3.5 0 0 1 5 0" /><path d="M17.566 17.606a2 2 0 1 0 2.897 .03l-1.463 -1.636l-1.434 1.606z" /><path d="M20.865 13.517a8.937 8.937 0 0 0 .135 -1.517a9 9 0 1 0 -9 9c.69 0 1.36 -.076 2 -.222" />
    </svg>
  ),
  mailSend: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z" /><path d="M3 7l9 6l9 -6" />
    </svg>
  ),
  wave: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V6a2 2 0 0 0-4 0v8c0 4.42 3.58 8 8 8h1a7 7 0 0 0 7-7v-3a2 2 0 0 0-4 0" />
    </svg>
  ),
  document: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  checkCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  xCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  userIcon: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  bellIcon: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6" /><path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    </svg>
  ),
  thumbUp: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  thumbDown: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" /><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
    </svg>
  ),
  warning: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  messageCircle: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  chevronLeft: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  chevronRight: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  x: ({ size = 24, color = "var(--icon-default)" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};
