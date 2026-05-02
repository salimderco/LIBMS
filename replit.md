# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Faculty Library Management System (FLMS)

### Artifacts
- `artifacts/flms` — React+Vite frontend (`@workspace/flms`), preview at `/`
- `artifacts/api-server` — Express 5 API server (`@workspace/api-server`), handles `/api/*`

### Frontend Stack
- React 19 + Vite
- Tailwind CSS v4 with custom `dark` variant (`@custom-variant dark (&:is(.dark *))`)
- shadcn/ui component library
- Wouter routing
- TanStack Query v5
- JWT auth stored in localStorage as `flms_token`

### User Roles
- **STUDENT** — can borrow, renew, reserve, wishlist, review books
- **FACULTY** — same as STUDENT
- **LIBRARIAN** — catalog management, all loans, announcements, audit log, reports
- **ADMIN** — all librarian features + user management, loan policy settings

### Demo Accounts (password: `password123`)
- `alice@university.edu` — Student
- `david.chen@university.edu` — Faculty
- `sarah@library.edu` — Librarian
- `admin@university.edu` — Admin

### Features Implemented
1. **Authentication** — JWT login/register with role-based access
2. **Book Catalog** — search, filter by category/format/year/availability, grid/list view, wishlist hearts, AI suggestions
3. **Book Detail** — full metadata, borrow button, reserve button (when unavailable), wishlist toggle, reviews & star ratings
4. **My Loans** — 4 tabs: Active Loans (with renew), Reservations, Borrowing History, Fines & Billing (Stripe-like payment modal)
5. **Book Reservations / Hold Queue** — reserve unavailable books, auto-fulfill on return, queue position
6. **Book Reviews & Ratings** — 5-star rating + comment on borrowed books, delete own review
7. **Reading Wishlist** — save/remove books, dedicated wishlist page
8. **Catalog Management** — CRUD books, CSV bulk import, AI auto-fill, ISBN lookup (Google Books API)
9. **All Loans** — librarian/admin view, process returns
10. **Reports & Exports** — summary stats, CSV export for loans/overdue/popular books
11. **Loan Policy Settings** — admin configures loan days, quotas, max renewals, fine rate
12. **Announcements / Notice Board** — admin creates/pins/expires notices; users see dismissable banner on dashboard
13. **Audit Log** — full filterable activity history (borrow/return/renew/overdue)
14. **Dark Mode** — system-aware, toggle in sidebar, persisted to localStorage
15. **Notifications** — bell icon with read/unread count, RESERVATION_READY & ANNOUNCEMENT types
16. **User Management** — admin creates/edits/deactivates users
17. **Profile** — edit name/department/phone, change password
18. **Fines** — auto-calculated overdue fines, stripe-like payment simulation
19. **AI Book Suggestions** — Gemini-powered personalized recommendations
20. **AI Auto-fill** — Gemini enriches book metadata from title+author
21. **Multilingual** — English, Spanish, Arabic with RTL support

### DB Tables (lib/db/src/schema/)
- `users`, `books`, `loans`, `activity_logs`, `notifications`
- `reservations` — hold queue with queue position, auto-fulfill
- `reviews` — star ratings + comments, one per user per book
- `wishlists` — saved books per user
- `announcements` — pinned/expiring library notices
- `loan_policy` — configurable borrowing rules and fine rates

### API Routes (artifacts/api-server/src/routes/)
- Auth: `/api/auth/*`
- Books: `/api/books/*` (CRUD, ISBN lookup, AI enrichment)
- Loans: `/api/loans/*` (borrow, return, renew, policy-driven)
- Reservations: `/api/reservations/*`
- Reviews: `/api/books/:id/reviews`, `/api/reviews/:id`
- Wishlist: `/api/wishlist/*`
- Announcements: `/api/announcements/*`
- Loan Policy: `/api/admin/loan-policy`
- Reports: `/api/reports/*` (summary, CSV exports)
- AI: `/api/ai/suggestions`, `/api/ai/enrich-book`
- Dashboard, Users, Fines, Notifications, Activity

### Key Architecture Notes
- Dark mode: CSS uses `@custom-variant dark (&:is(.dark *))` — add `.dark` class to `document.documentElement`
- ThemeProvider at `artifacts/flms/src/lib/theme.tsx` — wraps App, stores preference in `flms_theme` localStorage key
- API base URL pattern: `const apiBase = baseUrl.endsWith("/") ? baseUrl : \`${baseUrl}/\``
- New pages use direct `fetch()` (no generated hooks), import token from `useAuth()`
- `getPolicy()` exported from `loan-policy.ts` — used by loans.ts and fines.ts
- `fulfillNextReservation()` exported from `reservations.ts` — called by loans.ts on book return
- Pre-existing TS warning: Zod v4 ↔ `@hookform/resolvers` compatibility — cosmetic, doesn't break runtime
