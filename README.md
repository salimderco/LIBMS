# Faculty Library Management System (FLMS)
# Faculty Library Management System (FLMS)

A full-stack web application for managing a university library — built with React, Express 5, PostgreSQL, and Drizzle ORM. Supports four user roles with a complete set of borrowing, cataloguing, and administrative features.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started (Local)](#getting-started-local)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Role Permissions](#role-permissions)
- [Environment Variables](#environment-variables)

---
## Visual Walkthrough

<details>
<summary><b>📸 Click to expand: Dashboard & Catalog (4 Screenshots)</b></summary>
<br>

| | |
|:---:|:---:|
| ![FLMS Dashboard](<assets/Screenshot 2026-05-02 232245.png>) | ![Book Search](<assets/Screenshot 2026-05-02 232305.png>) |
| ![Catalog Grid](<assets/Screenshot 2026-05-02 235556.png>) | ![Detailed Book](<assets/Screenshot 2026-05-02 235625.png>) |

</details>

<details>
<summary><b>📚 Click to expand: Borrowing, Reservations & Reviews (6 Screenshots)</b></summary>
<br>

| | |
|:---:|:---:|
| ![Borrow Book](<assets/Screenshot 2026-05-02 235643.png>) | ![Loan Renewal](<assets/Screenshot 2026-05-02 235656.png>) |
| ![Return Process](<assets/Screenshot 2026-05-02 235707.png>) | ![Hold Queue](<assets/Screenshot 2026-05-02 235723.png>) |
| ![Ratings Reviews](<assets/Screenshot 2026-05-02 235737.png>) | ![My Wishlist](<assets/Screenshot 2026-05-02 235815.png>) |

</details>

<details>
<summary><b>⚙️ Click to expand: Management & Admin Panel (7 Screenshots)</b></summary>
<br>

| | |
|:---:|:---:|
| ![Fines Billing](<assets/Screenshot 2026-05-02 235900.png>) | ![Announcements](<assets/Screenshot 2026-05-02 235912.png>) |
| ![Audit Logs](<assets/Screenshot 2026-05-02 235922.png>) | ![CSV Reports](<assets/Screenshot 2026-05-02 235932.png>) |
| ![Loan Policy](<assets/Screenshot 2026-05-02 235941.png>) | ![Catalog Mgmt](<assets/Screenshot 2026-05-02 235950.png>) |
| ![User Management](<assets/Screenshot 2026-05-02 235959.png>) | |

</details>

<details>
<summary><b>✨ Click to expand: Accessibility, Dark Mode & RTL Support (8 Screenshots)</b></summary>
<br>

| | |
|:---:|:---:|
| ![AI Recommendations](<assets/Screenshot 2026-05-03 000039.png>) | ![Dark Mode](<assets/Screenshot 2026-05-03 000049.png>) |
| ![Arabic RTL Layout](<assets/Screenshot 2026-05-03 000059.png>) | ![Notifications Hub](<assets/Screenshot 2026-05-03 000108.png>) |
| ![Due-Soon Alerts](<assets/Screenshot 2026-05-03 000119.png>) | ![System Search](<assets/Screenshot 2026-05-03 000132.png>) |
| ![Analytics Charts](<assets/Screenshot 2026-05-03 000141.png>) | ![Mobile View](<assets/Screenshot 2026-05-03 000152.png>) |

</details>

---
## Features

| # | Feature | Roles |
|---|---------|-------|
| 1 | Book Catalog — search, filter by category / format / availability / year | All |
| 2 | Borrow & Return — with due dates driven by Loan Policy | Student, Faculty |
| 3 | Loan Renewals — up to the configured maximum renewals per loan | Student, Faculty |
| 4 | Book Reservations / Hold Queue — queue position, auto-notify on return | Student, Faculty |
| 5 | Ratings & Reviews — star rating + comment, must have borrowed the book | Student, Faculty |
| 6 | Reading Wishlist — save / remove books, heart icon on every catalog card | Student, Faculty |
| 7 | Fines & Billing — auto-accrued per overdue day, simulated card payment | Student, Faculty |
| 8 | Announcements — pinnable, expirable notices shown as dashboard banners | Librarian, Admin |
| 9 | Audit Log — full history of all borrow / return / renew / overdue events | Librarian, Admin |
| 10 | Reports & CSV Exports — summary stats + loans / overdue / popular books CSVs | Librarian, Admin |
| 11 | Loan Policy Settings — configure loan days, quotas, renewals, fine rate | Admin |
| 12 | Catalog Management — add / edit / delete books, bulk CSV import, ISBN autofill | Librarian, Admin |
| 13 | User Management — view and manage all registered users | Admin |
| 14 | AI Book Suggestions — Gemini-powered recommendations based on borrow history | Student, Faculty |
| 15 | Dark Mode — system-aware, toggled from the sidebar, persisted to localStorage | All |
| 16 | Multilingual UI — English, Español, العربية (RTL) | All |
| 17 | In-App Notifications — due-soon alerts, reservation ready, announcements | All |

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite 7
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- React Query (TanStack Query v5)
- Wouter (client-side routing)
- Recharts (dashboard bar chart)
- date-fns

**Backend**
- Node.js + Express 5
- TypeScript (ESM, compiled with esbuild)
- Drizzle ORM
- PostgreSQL
- JSON Web Tokens (JWT)
- bcryptjs
- Pino (structured logging)
- Google Books API (ISBN lookup)
- Gemini AI (book recommendations)

**Shared Libraries (pnpm workspace)**
- `@workspace/db` — Drizzle schema, migrations, seed
- `@workspace/api-spec` — OpenAPI 3.1 contract
- `@workspace/api-zod` — Zod schemas generated from OpenAPI
- `@workspace/api-client-react` — React Query hooks generated from OpenAPI

---

## Project Structure

```
.
├── artifacts/
│   ├── api-server/          # Express 5 REST API (port 8080 locally)
│   │   ├── src/
│   │   │   ├── routes/      # One file per resource
│   │   │   ├── middlewares/ # authenticate, requireRole
│   │   │   └── lib/         # logger, helpers
│   │   └── .env.example     # Copy to .env for local dev
│   └── flms/                # React + Vite frontend (port 3000 locally)
│       └── src/
│           ├── pages/       # One file per page/route
│           ├── components/  # layout, notification-bell, ui/
│           └── lib/         # auth, i18n, theme, utils
├── lib/
│   ├── db/                  # Drizzle ORM — schema, config, seed
│   ├── api-spec/            # OpenAPI 3.1 YAML + codegen config
│   ├── api-zod/             # Generated Zod schemas
│   └── api-client-react/    # Generated React Query hooks
└── pnpm-workspace.yaml
```

---

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ running locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the database

In psql or pgAdmin:

```sql
CREATE DATABASE flms;
```

### 3. Configure environment variables

```bash
copy artifacts\api-server\.env.example artifacts\api-server\.env
```

Open `artifacts\api-server\.env` and fill in your values:

```env
PORT=8080
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/flms
SESSION_SECRET=any-long-random-string-at-least-32-chars
NODE_ENV=development
```

### 4. Push the database schema

```bash
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/flms
pnpm --filter @workspace/db run push
```

### 5. Seed demo data

```bash
pnpm --filter @workspace/db run seed
```

### 6. Start the servers

Open two separate terminals from the project root:

**Terminal 1 — API server**
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend**
```bash
pnpm --filter @workspace/flms run dev
```

Open **http://localhost:3000** in your browser.

---

## Demo Accounts

All accounts use the password: `password123`

| Role | Email |
|------|-------|
| Admin | admin@university.edu |
| Student | alice@university.edu |
| Faculty | david.chen@university.edu |
| Librarian | sarah@library.edu |

---

## API Reference

All endpoints are prefixed with `/api`. Authentication uses `Authorization: Bearer <token>`.

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/auth/login` | Sign in, returns JWT | Public |
| POST | `/auth/register` | Create account | Public |
| GET | `/books` | List / search books | All |
| POST | `/books` | Add book | Librarian, Admin |
| PATCH | `/books/:id` | Update book | Librarian, Admin |
| DELETE | `/books/:id` | Delete book | Librarian, Admin |
| GET | `/books/isbn-lookup?isbn=` | Google Books autofill | Librarian, Admin |
| POST | `/books/import` | Bulk CSV import | Librarian, Admin |
| POST | `/loans` | Borrow a book | Student, Faculty |
| POST | `/loans/:id/return` | Return a book | Librarian, Admin |
| POST | `/loans/:id/renew` | Renew a loan | Student, Faculty |
| GET | `/loans/my` | My active + history | Student, Faculty |
| GET | `/loans/overdue` | All overdue loans | Librarian, Admin |
| POST | `/reservations` | Reserve a book | Student, Faculty |
| DELETE | `/reservations/:id` | Cancel reservation | Owner, Librarian, Admin |
| GET | `/books/:id/reviews` | Get reviews for book | All |
| POST | `/books/:id/reviews` | Submit review | Student, Faculty |
| DELETE | `/reviews/:id` | Delete review | Owner, Librarian, Admin |
| GET | `/wishlist` | My wishlist | Student, Faculty |
| POST | `/wishlist/:bookId` | Toggle save/unsave | Student, Faculty |
| GET | `/announcements` | List active announcements | All |
| POST | `/announcements` | Create announcement | Librarian, Admin |
| PATCH | `/announcements/:id` | Edit / pin announcement | Librarian, Admin |
| DELETE | `/announcements/:id` | Delete announcement | Librarian, Admin |
| GET | `/admin/loan-policy` | Get current policy | Admin |
| PATCH | `/admin/loan-policy` | Update policy | Admin |
| GET | `/reports/summary` | Stats overview | Librarian, Admin |
| GET | `/reports/loans-csv` | Download all loans CSV | Librarian, Admin |
| GET | `/reports/overdue-csv` | Download overdue CSV | Librarian, Admin |
| GET | `/reports/popular-books-csv` | Download popular books CSV | Librarian, Admin |
| GET | `/notifications` | My notifications | All |
| PATCH | `/notifications/read-all` | Mark all as read | All |
| GET | `/dashboard/summary` | Dashboard stats | All |
| GET | `/fines/my` | My outstanding fines | Student, Faculty |
| POST | `/fines/pay` | Pay fines | Student, Faculty |
| GET | `/activity` | Recent activity log | Librarian, Admin |
| POST | `/ai/suggest` | AI book recommendations | Student, Faculty |

---

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | All accounts — students, faculty, librarians, admins |
| `books` | Catalog entries with copies, format, shelf location |
| `loans` | Borrowing records with due dates and renewal counts |
| `activity_logs` | Audit trail — BORROWED, RETURNED, RENEWED, OVERDUE |
| `notifications` | Per-user in-app notifications |
| `reservations` | Hold queue entries per book |
| `reviews` | Star ratings and comments per book per user |
| `wishlists` | Saved books per user |
| `announcements` | Library-wide notices with pin and expiry |
| `loan_policy` | Single-row config for loan rules and fine rate |
| `conversations` | AI chat sessions |
| `messages` | AI chat messages |

---

## Role Permissions

| Feature | Student | Faculty | Librarian | Admin |
|---------|:-------:|:-------:|:---------:|:-----:|
| Browse catalog | ✅ | ✅ | ✅ | ✅ |
| Borrow / Return | ✅ | ✅ | | |
| Renew loans | ✅ | ✅ | | |
| Reserve books | ✅ | ✅ | | |
| Write reviews | ✅ | ✅ | | |
| Wishlist | ✅ | ✅ | | |
| AI suggestions | ✅ | ✅ | | |
| Manage catalog | | | ✅ | ✅ |
| Process returns | | | ✅ | ✅ |
| Announcements | | | ✅ | ✅ |
| Audit log | | | ✅ | ✅ |
| Reports & Exports | | | ✅ | ✅ |
| Loan Policy | | | | ✅ |
| User Management | | | | ✅ |

---

## Environment Variables

### `artifacts/api-server/.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Port the API server listens on (use `8080` locally) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret key for signing JWT tokens (32+ chars) |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
