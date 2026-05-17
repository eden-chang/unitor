# @unitor/api-types

Generated TypeScript types for the Unitor backend API.

`src/generated.ts` is produced by `openapi-typescript` from `../../backend/openapi.json`. **Do not edit by hand.** Per [ADR 0006](../../.docs/decisions/0006-development-toolchain.md), the workflow is:

1. Backend developer edits a FastAPI route signature.
2. FastAPI regenerates `backend/openapi.json` (committed).
3. CI (or developer locally) runs `npm run generate` in this package.
4. The updated `src/generated.ts` is committed in the same PR.
5. Frontend imports types via `import type { paths } from "@unitor/api-types"`.

CI fails if step 4 is skipped.

`.gitattributes` marks `src/generated.ts` as a generated file so GitHub PRs collapse the diff by default.
