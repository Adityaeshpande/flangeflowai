# FlangeFlow AI

FlangeFlow AI is an assignment-ready, hypothetical operations product for a small flange manufacturer. It balances confirmed orders, forecast demand, finished goods, safety stock, released raw-material lots, process yield and daily capacity.

## What works locally

- Role-based operational dashboard
- Lot, heat, MTC, bin and quality-status tracking
- Receipt, quality release/reject, issue, completion, dispatch and adjustment workflows
- Finished-goods and raw-material reservations
- Production plans and work orders
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

The `/api/plan` function validates and recalculates every plan, caps Gemini output at 350 tokens, limits each visitor to five requests per UTC day, applies safety guardrails and logs every successful request/response to Supabase. `/api/stats` reads the table back and displays the total logged plans on the dashboard.

## Data ownership

- Stores records receipts, bins, issues, dispatches and cycle counts.
- Quality releases or rejects incoming lots after document and inspection review.
- Production records completions and scrap against work orders.
- Sales records confirmed orders and due dates.
- Procurement maintains supplier candidates and verification evidence.
- The planner calculates; accountable employees approve and enter source transactions.
