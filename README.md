# Attribute 3 Institutional Data Collection & Reporting System

A production-quality full-stack web application designed for collecting, validating, reviewing, and reporting institutional data for **Attribute 3: Infrastructure and Learning Resources** (covering academic years **2023–24**, **2024–25**, and **2025–26**).

Built directly from the original source workbook: `Data Collection Sheet for Attribute 3.xlsx`.

---

## 1. System Architecture & Diagram

```
                                ┌──────────────────────────────────────────────┐
                                │             Institutional User               │
                                │   (Data Officer / Reviewer / Administrator)  │
                                └──────────────────────┬───────────────────────┘
                                                       │
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │          Modern React 18 Frontend            │
                                │   TypeScript, Tailwind CSS, Lucide Icons     │
                                │   Year-Wise Grid, Autosave, Review Screen    │
                                └──────────────────────┬───────────────────────┘
                                                       │ REST API (JWT Authenticated)
                                                       ▼
                                ┌──────────────────────────────────────────────┐
                                │            Node.js Express Backend           │
                                │  TypeScript, Role-Based Access Control, Zod  │
                                └──────────────┬────────────────┬──────────────┘
                                               │                │
                        ┌──────────────────────┴──┐          ┌──┴──────────────────────┐
                        ▼                         ▼          ▼                         ▼
                 ┌──────────────┐          ┌─────────────┐ ┌─────────────┐      ┌─────────────┐
                 │  Prisma ORM  │          │ Structured  │ │ S3 / Object │      │   ExcelJS   │
                 │ SQLite (dev) │          │ File Store  │ │   Storage   │      │ 8-Sheet Xlsx│
                 │ PostgreSQL   │          │ (Uploads)   │ │  (Adapter)  │      │  Generator  │
                 └──────────────┘          └─────────────┘ └─────────────┘      └─────────────┘
```

---

## 2. Technology Stack

* **Frontend**:
  * **React 18** with **Vite** and **TypeScript**
  * **Tailwind CSS** (curated institutional palette, accessible typography, subtle borders, responsive layout)
  * **Lucide React** (modern iconography)
  * Custom **YearGridField** component supporting Number, Currency (`₹`), Percentage (`%`), Student-to-Computer Ratio (`1:N (Total Students)`), Yes/No, Multi-select, and Not Applicable toggles (`-----`).
  * Debounced autosave (2s debounce) + manual Save Draft button with timestamp indication.
  * Collapsible review screen with validation checklist.

* **Backend**:
  * **Node.js 22** + **Express** + **TypeScript**
  * **Prisma ORM** (Zero-config local SQLite + full PostgreSQL production schema)
  * **JWT Authentication** + **bcryptjs** password hashing
  * **Multer** secure file upload with MIME type validation (PDF, Word, Excel, Images) and 15MB file size limits
  * **ExcelJS** generating authentic 8-sheet Excel workbooks mirroring the original template
  * **Vitest** + **Supertest** automated test suite (23 passing unit, API, Excel, and E2E integration tests)

---

## 3. Pre-configured Demo Accounts

For immediate local evaluation, one-click login buttons are available on the login screen:

| Role | Name | Email | Password | Permissions |
|---|---|---|---|---|
| **Data Officer** | Krishna Verma | `entry@institution.edu` | `Entry@123` | Enter data, save drafts, upload proofs, submit form |
| **Reviewer** | Prof. Sunita Patel | `reviewer@institution.edu` | `Reviewer@123` | Review all sections, view proofs, approve, reject with mandatory reason |
| **Administrator** | Dr. Ramesh Sharma | `admin@institution.edu` | `Admin@123` | User directory, system diagnostics, immutable audit logs, excel export |

---

## 4. Quick Start (Local Setup)

### Prerequisites
* Node.js v18+ (tested on Node v22.12.0)
* npm v9+

### 1. Install Dependencies
```bash
# In the project root:
npm install

# In backend:
npm --prefix backend install

# In frontend:
npm --prefix frontend install
```

### 2. Initialize Database & Seed Baseline Data
```bash
# Push schema and generate Prisma client:
npm --prefix backend run db:push

# Seed Attribute 3 definitions, baseline Excel values, and accounts:
npm --prefix backend run db:seed
```

### 3. Run Development Servers
```bash
# Start both backend (port 5000) and frontend (port 5173) concurrently:
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## 5. Attribute 3 Field Structure (Preserved from Source Sheet)

The application models all 5 sections from `Data Collection Sheet for Attribute 3.xlsx`:

* **3.1 Physical Infrastructure & Facilities** (`3.1.1` to `3.1.15`):
  * Classrooms, Laboratories, Canteen, Sports Ground, Washrooms (Boys/Girls), Drinking Water, Seminar Halls, Gymnasium, Wellness Centre, and Not-Applicable amenities (Hostel, Language Lab, Guest House, Transport, Museum).
* **3.2 Library Expenditure** (`3.2.1`, `3.2.1a`, `3.2.2`):
  * Direct expenditure on e-books and digital resources (`₹ 1,82,000`), Total non-salary expenditure (`₹ 4,40,04,796`), and percentage automatically computed (`0.41%`).
* **3.3 Research Resources & Consortia** (`3.3.1` to `3.3.7`):
  * E-Journals Consortia (N-LIST, DELNET), e-Shodh Sindhu, Plagiarism software, statistical tools, research labs.
* **3.4 IT Infrastructure** (`3.4.1` to `3.4.4`):
  * Bandwidth in MBPS (`310 MBPS`), Student-to-Computer ratio (`1:16 (4127)`), Student laptops/desktops (`258`), Virtual Labs & AR/VR facilities.
* **3.5 Barrier-Free Divyangjan Accessibility** (`3.5.1` to `3.5.5`):
  * Ramps/Lifts, Divyangjan washrooms, Tactile paths, Screen reading assistive tech (`JAWS`), Human assistant support.

---

## 6. Running Tests

Run the complete test suite (Unit tests, REST API tests, Excel export validation, and full End-to-End lifecycle test):

```bash
npm --prefix backend run test
```

### Test Coverage Highlights:
1. `validation.test.ts`: Currency string parsing (`₹1,82,000` -> `182000`), percentage decimal fraction calculations, ratio normalization, and cross-year variance alerts.
2. `excel.test.ts`: Workbook generation verifying 8 tabs, styled navy headers, frozen panes, and exact cell formulas.
3. `api.test.ts`: Health check, JWT authentication, invalid credentials rejection, Attribute 3 schema fetch, draft saving, audit log retrieval.
4. `e2e_workflow.test.ts`: 10-step full institutional lifecycle test from data entry, draft persistence, document upload, review submission, reviewer rejection with reason, correction, approval, and binary Excel export.

---

## 7. Production Deployment & Database Configuration

### Switching to PostgreSQL (Supabase / Neon / Render / Railway)
The project is built with Prisma and includes a production PostgreSQL schema (`backend/prisma/schema.postgresql.prisma`).

To connect to a managed PostgreSQL instance:
1. Update `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/[DB]?sslmode=require"
   ```
2. Replace `provider = "sqlite"` with `provider = "postgresql"` in `backend/prisma/schema.prisma` (or copy from `schema.postgresql.prisma`).
3. Run `npm --prefix backend run db:push` to apply the schema.
4. Run `npm --prefix backend run db:seed` to seed the production baseline.

### Deploying Frontend
* Build bundle: `npm --prefix frontend run build` (outputs to `frontend/dist/`).
* Deploy `frontend/dist/` to **Vercel**, **Cloudflare Pages**, or **Netlify**. Set the `VITE_API_URL` to your backend URL.

### Deploying Backend
* Build server: `npm --prefix backend run build` (outputs to `backend/dist/`).
* Deploy to **Render**, **Railway**, or **Fly.io**.
* Set environment variables as documented in `backend/.env.example`.

---

## 8. Data Safety & Auditability

* **No Data Loss Guarantee**: Debounced autosave prevents lost keystrokes, while local form state is preserved during transient network interruptions.
* **Multi-Tenant Isolation**: Submissions are strictly partitioned by `organizationId`. Users from one institution cannot view or modify another institution's records.
* **Immutable Audit Trail**: All draft modifications, proof attachments, deletions, submissions, reviewer decisions, and Excel exports are recorded with user identity, timestamp, and IP address.
