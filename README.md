# FlangeFlow AI

FlangeFlow is an assignment-ready, hypothetical traceable-stock product for a small flange manufacturer. Phase 1 records heat numbers and MTCs from receipt and quarantine through human quality release, work-order issue, outside processing, finished goods and dispatch. A clearly labelled Phase 2 pilot explains server-verified production-planning calculations.

## What works locally

- Role-based operational dashboard
- Lot, heat, MTC, bin and quality-status tracking
- Receipt, quality release/reject, issue, completion, dispatch and adjustment workflows
- Finished-goods and raw-material reservations
- Phase 1 work-order and traceability records
- Optional Phase 2 production-planning pilot
- Supplier qualification register using official industry directories as leads
- CSV import/export, barcode/QR input and audit history
- Plain-language guide for abbreviations, standards and responsibilities

Operational demo data is saved in the browser. It is illustrative, not a claim of standards compliance or supplier approval.

## Local review

Serve the folder with any static web server and open `operations.html`. Run `npm test` for the deterministic planning tests. The Gemini endpoint requires Vercel's local runtime or deployment.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and enter the project URL and server-side secret key.
4. Never expose the secret key or Gemini key in client-side code.

## Vercel deployment

1. Import this folder into Vercel.
2. Add `GEMINI_API_KEY`, `GEMINI_MODEL`, `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as server-side environment variables.
3. Deploy and test the production URL.

The optional Phase 2 `/api/plan` function validates and recalculates every plan, caps Gemini output at 350 tokens, limits each network-and-browser fingerprint to five requests per UTC day, applies safety guardrails and logs every successful request/response to Supabase. `/api/stats` reads the table back and displays the total logged plans on the landing page and Operations dashboard.

## Data ownership

- Stores records receipts, bins, issues, dispatches and cycle counts.
- Quality releases or rejects incoming lots after document and inspection review.
- Production records completions and scrap against work orders.
- Sales records confirmed orders and due dates.
- Procurement maintains supplier candidates and verification evidence.
- The planner calculates; accountable employees approve and enter source transactions.
