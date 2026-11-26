# CaloriePal

AI-powered food recognition, calorie tracking and a 6 PM dinner planner.

## Structure

- `backend/` — Node.js + Express + Mongoose (TypeScript)
- `frontend/` — Next.js 15 (App Router) + Tailwind v4
- `render.yaml` — Render blueprint for the backend
- `vercel.json` — Vercel config pointing at `frontend/`
- `.github/workflows/ci.yml` — typecheck + build on every PR

## Prerequisites

- Node.js 20+
- A MongoDB instance (local or Atlas M0)

## Local development

### Backend

```bash
cd backend
cp .env.example .env    # fill MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

Verify: http://localhost:4000/api/health → `{"status":"ok"}`

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open: http://localhost:3000

## Free-tier deployment plan

| Piece | Service | Free tier |
|---|---|---|
| Code | GitHub | unlimited public/private repos |
| Backend | Render Web Service | 750 hrs/mo, sleeps after 15 min idle |
| Frontend | Vercel Hobby | 100 GB bandwidth, auto-deploys on push |
| Database | MongoDB Atlas M0 | 512 MB storage, forever free |
| Images | Cloudinary | 25 monthly credits |
| AI vision | Google AI Studio (Gemini) | `gemini-2.5-flash` free quota |
| Nutrition | USDA FoodData Central | free API key, unlimited |
| Cron | cron-job.org | free scheduled HTTP pings, 1-minute resolution |

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "chore: initial scaffold"
gh repo create caloriepal --public --source=. --remote=origin --push
```

### 2. MongoDB Atlas

1. Create a free M0 cluster at https://cloud.mongodb.com
2. Create a DB user and a network access rule (0.0.0.0/0 for simplicity)
3. Copy the `mongodb+srv://` connection string

### 3. Backend on Render

1. Sign in at https://render.com with GitHub
2. New → Blueprint → pick this repo. Render reads `render.yaml`.
3. Fill the secrets it prompts for: `MONGODB_URI`, `FRONTEND_URL` (your Vercel URL), `GEMINI_API_KEY`, `USDA_API_KEY`, Cloudinary keys.
4. First deploy picks up `/api/health`. Note the live URL — e.g. `https://caloriepal-backend.onrender.com`.

### 4. Frontend on Vercel

1. Sign in at https://vercel.com with GitHub
2. Import the repo. `vercel.json` already sets Next.js + `frontend/` root.
3. Add env var `NEXT_PUBLIC_API_URL=https://<your-render-url>`
4. Deploy. Note the Vercel URL and set it as `FRONTEND_URL` back on Render so CORS works.

### 5. Gemini + USDA + Cloudinary keys

- Gemini: https://aistudio.google.com/apikey (free tier)
- USDA: https://fdc.nal.usda.gov/api-key-signup.html
- Cloudinary: https://cloudinary.com dashboard → Account Details

### 6. Dinner cron (free, survives Render sleep)

Once the `/api/dinner/cron` endpoint exists (Phase 6), add a job on https://cron-job.org:

- URL: `https://<your-render-url>/api/dinner/cron`
- Header: `Authorization: Bearer <a secret you also set on Render>`
- Schedule: `0 18 * * *` in `Asia/Kolkata`

This wakes Render from sleep and generates recommendations even if the in-process node-cron missed the wall clock.

## Phase 1 deliverable

Both servers run; backend connects to MongoDB; `/api/health` responds.

## Next phases

1. Auth + user profile + BMR/TDEE calculation
2. Manual food logging APIs
3. Daily calorie summary
4. AI image recognition (Gemini vision)
5. Nutrition lookup (USDA FDC / Open Food Facts)
6. 6 PM dinner planner (deterministic recommender + cron)
7. Frontend UI (onboarding, dashboard, food tracker, planner, progress)
8. Testing + deployment
