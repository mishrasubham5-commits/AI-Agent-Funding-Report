# Vercel Deployment Checklist (AI Job Search Copilot)

## Project Settings
- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: `.next`
- Install command: `npm install`
- Node runtime required for all API routes

## Environment Variables (Required In Production + Preview)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEWSAPI_KEY`
- `SERPER_API_KEY`
- `GEMINI_API_KEY`
- Optional for PDF export fallback: `PUPPETEER_EXECUTABLE_PATH`

## Security
- Server-only keys stay in Vercel env vars only
- `.env.local` is not committed
- Supabase RLS/storage policies must already be configured
- Storage bucket `reports` must exist before PDF export works

## Runtime & Routes
- API routes exist:
- `POST /api/discover`
- `POST /api/research`
- `POST /api/plan`
- `POST /api/outreach`
- `POST /api/generate-report`
- API routes use Node.js runtime (`export const runtime = "nodejs"`)
- `next.config.ts` sets project root for file tracing / turbopack

## Local Verification (Before Deploy)
- `npm run lint` passes
- `npm run build` passes
- `npm run start -- -p 3000` works
- Dashboard loads on `/`
- `Discover Funding` works
- `Generate Research` works
- `Generate Plan` works
- `Generate Outreach` works
- `Export Package` works after Storage bucket/policies are configured

## Post-Deploy Verification
- Open deployed URL and load `/`
- Test `Discover Funding`
- Test company detail flow: Research -> Plan -> Outreach
- Test `Export Package`
- If research fails: confirm `SERPER_API_KEY` and `GEMINI_API_KEY`
- If discover fails: confirm `NEWSAPI_KEY`
- If PDF export fails: confirm bucket `reports` exists and Storage policies allow upload/read
