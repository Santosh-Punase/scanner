# Scanner Backend

Minimal Node.js + Express backend for the NSE stock scanner.

## Setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Server starts on `http://localhost:4000`.

## Endpoints

- `GET /api/health` — health check

## Next steps

- Add NSE data source integration
- Add strategy/filter engine
- Expose `/api/scan` endpoint
