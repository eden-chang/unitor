# Unitor — Frontend

React 19 + TypeScript single-page app built with Vite 7 and Tailwind CSS 4. It talks to Supabase Auth for magic-link login and to the FastAPI backend in [`../backend/`](../backend/) for everything else.

## Setup

```bash
npm ci
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_BASE_URL
npm run dev            # http://localhost:5173/unitor-demo/
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Layout

- `src/api/`: typed wrappers around `apiFetch`, which attaches the Supabase JWT and parses the backend error format into `ApiError`
- `src/hooks/`: TanStack Query hooks for each resource (discovery, profile, groups, course skills)
- `src/context/`: auth provider built on the Supabase session
- `src/components/`: feature folders (`auth`, `dashboard`, `discovery`, `groups`, `profile`) plus `shared` building blocks and shadcn/ui primitives in `ui`
- `src/App.tsx`: page routing and the prototype pages (chat, notifications, TA views) that still use mock data from `src/lib/mock-data.ts`
