# Developer Onboarding Guide: Attribute 3 Data Collection System

Welcome to the project! This guide will help you quickly understand the architecture, database schema, project structure, and key workflows that make up this institutional data collection platform.

## 1. Project Overview

This project is a production-grade full-stack web application designed for collecting, validating, reviewing, and reporting institutional data specific to **Attribute 3: Infrastructure and Learning Resources** for academic years (2023-24, 2024-25, 2025-26).

It acts as a digital replacement for manual Excel-based data collection, offering robust workflows, audit trails, role-based access control, and an automated Excel export that perfectly matches the required formats.

---

## 2. Tech Stack & Architecture

### **Frontend**
*   **Framework**: React 18 with Vite.
*   **Language**: TypeScript.
*   **Styling**: Tailwind CSS for responsive and modern UI, customized for an institutional look.
*   **Icons**: Lucide React.
*   **Key Features**:
    *   Custom dynamic fields (`YearGridField`) supporting formats like ratios, currency, percentages, etc.
    *   **Debounced Autosave**: Prevents data loss during entry.
    *   Reviewer UI with split views for validation.

### **Backend**
*   **Framework**: Node.js + Express.
*   **Language**: TypeScript.
*   **Validation**: Zod (for validating API payloads).
*   **File Uploads**: Multer (stores files securely, enforces type/size limits).
*   **Excel Generation**: ExcelJS (generates complex, multi-sheet Excel reports).
*   **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` for password hashing.

### **Database (ORM: Prisma)**
*   **Local/Dev**: SQLite for zero-config local development.
*   **Production**: PostgreSQL compatible (schema provided).

---

## 3. Project Structure

The repository is structured as a monorepo containing both the frontend and backend.

```text
/ (Project Root)
├── backend/                  # Node.js + Express API
│   ├── prisma/               # Database schema (schema.prisma) & seed scripts
│   ├── src/
│   │   ├── config/           # Environment & configuration setups
│   │   ├── middleware/       # Auth guards, role checks, upload handlers
│   │   ├── routes/           # Express route definitions (auth, attributes, submissions, etc.)
│   │   ├── services/         # Core business logic (Excel generation, audit logging)
│   │   ├── tests/            # Vitest + Supertest automated testing
│   │   ├── app.ts            # Express app configuration
│   │   └── index.ts          # Server entry point
│   └── uploads/              # Local file storage for uploaded proofs
│
├── frontend/                 # React + Vite Frontend
│   ├── src/
│   │   ├── api/              # Axios/Fetch API wrappers connecting to the backend
│   │   ├── components/       # Reusable UI components (Buttons, Inputs, YearGridField)
│   │   ├── context/          # React Context (Auth state, etc.)
│   │   ├── pages/            # Main screen components:
│   │   │   ├── Login.tsx           # Authentication
│   │   │   ├── Dashboard.tsx       # Data Officer entry point
│   │   │   ├── SectionForm.tsx     # Dynamic data entry forms
│   │   │   ├── ReviewerPortal.tsx  # Reviewer's dashboard
│   │   │   ├── ReviewSubmission.tsx# Detailed review view
│   │   │   └── AdminDashboard.tsx  # Admin view & Excel export
│   │   └── main.tsx          # React application root
│   ├── index.css             # Global Tailwind imports
│   └── tailwind.config.js    # Design system tokens (colors, fonts)
│
└── shared/                   # Shared TypeScript interfaces (Types.ts)
```

---

## 4. Core Database Schema (Prisma)

The application centers around the `Submission` model. Here are the most critical entities:

1.  **Organization & User**: Users belong to Organizations. Access is tightly scoped to the user's organization. Roles include `DATA_ENTRY` (Data Officer), `REVIEWER`, and `ADMIN`.
2.  **Attribute & Section**: The schema definition. Attribute -> Section (e.g., 3.1, 3.2) -> Field (e.g., 3.1.1).
3.  **Field**: Defines what kind of data is collected (Number, Currency, Percentage, Ratio, etc.).
4.  **Submission & SubmissionValue**: A `Submission` ties an Organization to an Attribute. `SubmissionValue` holds the actual data points entered for a specific Field and a specific Year.
5.  **Document**: Tracks proofs uploaded by users for specific fields and years.
6.  **AuditLog**: An immutable ledger recording all critical actions (saving drafts, uploading files, submitting, approving, rejecting, exporting).

---

## 5. Key Workflows Explained

### A. Data Entry & Autosave
*   **Flow**: When a Data Officer types into a form field in `SectionForm.tsx`, the frontend waits 2 seconds (debounce) and then fires a `PATCH` request to the backend to update the `SubmissionValue`.
*   **Why**: Ensures no data is lost and prevents the user from having to hit "Save" continuously.

### B. File Uploads (Proofs)
*   **Flow**: Users upload supporting PDFs or Excel files for specific fields. The frontend sends multipart form data. The backend `multer` middleware validates the file and saves it to the local `uploads/` directory, while recording metadata in the `Document` database model.

### C. Review Process
*   **Status Lifecycle**: DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED (or REJECTED).
*   **Flow**: A Data Officer submits the form. A Reviewer logs in, views the submitted data in a read-only format (`ReviewSubmission.tsx`), inspects attached proofs, and either approves or rejects it. Rejections mandate a reason, kicking the submission back to DRAFT state.

### D. Excel Export
*   **Flow**: An Admin clicks Export. The backend uses `ExcelJS` to build a complex, multi-sheet workbook, mapping the `SubmissionValue`s to specific, hardcoded cells based on the original template requirements.

---

## 6. How to Start Developing

1.  **Environment Variables**: Check `backend/.env.example` and create a `backend/.env`.
2.  **Database Setup**: 
    ```bash
    npm --prefix backend run db:push
    npm --prefix backend run db:seed
    ```
    *The seeder populates the entire Attribute 3 schema, structure, and provides demo users.*
3.  **Run Servers**:
    ```bash
    npm run dev
    ```
    *This starts the backend on port 5000 and the frontend on port 5173.*
4.  **Tests**:
    ```bash
    npm --prefix backend run test
    ```
    *Tests are critical. Make sure they pass before committing. We use Vitest and Supertest.*
