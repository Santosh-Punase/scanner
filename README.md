# NSE Stock Scanner

A full-stack scanner for Indian NSE equities with rule-based strategies
(MA crossover, volume surge, RSI breakout, RSI divergence + confirmation).

```
scanner/
├── backend/      Node.js + Express API (Yahoo Finance + NSE symbol list)
├── frontend/     React + Vite UI
├── render.yaml   Backend deploy blueprint (Render.com, free)
└── README.md
```

## Local development

```bash
# Terminal 1 — backend
cd backend
npm install
npm run dev          # http://localhost:4000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api to :4000)
```

## Free deployment

### Backend → Render (free Web Service)

1. Push this repo to GitHub.
2. Go to https://dashboard.render.com → **New** → **Blueprint** → pick the repo.
3. Render reads [render.yaml](render.yaml) and provisions `scanner-backend`.
4. After deploy, copy the URL (e.g. `https://scanner-backend.onrender.com`)
   and verify `/api/health` returns `{"status":"ok"}`.
5. Optional: set `CORS_ORIGIN` env var to your frontend URL once you have it.

> **Note**: Render free tier sleeps after 15 min of idle. First request after
> sleep takes ~30s to wake. Subsequent requests are instant.

### Frontend → Vercel (free static hosting)

1. https://vercel.com → **Add New** → **Project** → import the repo.
2. Set **Root Directory** to `frontend`.
3. Vercel auto-detects Vite via [frontend/vercel.json](frontend/vercel.json).
4. Add env var **`VITE_API_BASE`** = your Render backend URL.
5. Deploy. Open the Vercel URL — backend status indicator should turn green.

### Alternative: Frontend → Netlify

Same flow as Vercel:
- Base directory: `frontend`
- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Env var: `VITE_API_BASE=https://<your-render-url>`

## Strategies

| Key                | What it finds                                                    |
|--------------------|------------------------------------------------------------------|
| `ma_crossover`     | Golden / Death Cross of two SMAs                                  |
| `volume_surge`     | Latest-day volume ≥ N× average                                    |
| `rsi_breakout`     | RSI crosses above threshold + price breaks N-day high             |
| `rsi_divergence`   | Regular RSI divergence on swing pivots + confirmation candle      |

## Caveats

- Yahoo Finance has informal rate limits. Keep concurrency ≤ 10 on free hosts.
- NSE may block the equity-list CSV from cloud IPs; the app falls back to a
  seed list of ~50 large-caps in [backend/data/nse_seed.json](backend/data/nse_seed.json).
- Scanning *All NSE EQ* (~2138 symbols) takes 3–6 min. Browsers may time out
  long requests on free hosts — prefer **Top 200 / Top 500** in production.
- This is for research/education only. Not investment advice.
