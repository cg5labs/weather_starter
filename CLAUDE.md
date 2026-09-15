# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Express + Vite via Portless)
npm run build        # Build frontend and compile backend TypeScript
npm run start        # Run compiled production server
npm test             # Run all backend tests
npm run test:watch   # Run tests in watch mode
npx vitest run backend/src/routes/locations.test.ts  # Run a single test file

npm run db:generate  # Generate Drizzle migration after schema changes
npm run db:migrate   # Apply migrations to backend/weather.db
npm run reset        # Delete the local SQLite database
npm run doctor       # Smoke-test /health and /api/locations against the running server
```

**Requirements:** Node.js ≥ 22.5 (uses `node:sqlite` built-in).

The dev URL is `http://weather-starter.localhost:1355` (served via Portless proxy).

## Architecture

### Single-process dev server

`npm run dev` runs `scripts/dev.mjs`, which launches `portless run tsx watch backend/src/server.ts`. There is **one Node process**: Express handles `/api/*` routes, and Vite runs as in-process middleware (not a separate dev server) to serve the React frontend. In production, `frontend/dist` is served as static files instead. The frontend uses relative `/api` paths — no cross-origin or port configuration needed.

### Data layer

One SQLite database at `backend/weather.db`, accessed through Drizzle ORM (`drizzle-orm/sqlite-proxy`). There is a single `locations` table defined in `backend/src/schema.ts`. Weather snapshot data is stored **flat** alongside location coordinates — there is no separate weather table. `forecast_periods` and `daily_forecast` are JSON columns.

After changing `backend/src/schema.ts`, run `db:generate` then `db:migrate`. Migrations live in `backend/drizzle/`.

### Injectable WeatherClient

`backend/src/routes/locations.ts` exports a `WeatherClient` interface and accepts it as a parameter to `createLocationsRouter()`. Tests inject a mock implementation to avoid calling `data.gov.sg`. The real implementation lives in `backend/src/weather.ts` (`SingaporeWeatherClient`) and calls multiple `api-open.data.gov.sg` endpoints in parallel — 2-hour forecast, air temperature, humidity, rainfall, wind, UV, PSI/PM25, 24-hour forecast, and 4-day forecast. No API key required for basic usage; set `WEATHER_API_KEY` for higher rate limits.

### Testing

Vitest config is at the root (`vitest.config.ts`). Tests live only in `backend/src/**/*.test.ts`. The test environment sets `NODE_ENV=test`, which disables Vite frontend serving and request logging in `server.ts`. Tests use `supertest` against `createApp()` with a mock `weatherClient`. Pool is `forks`, parallelism is off — tests run serially.

### Frontend state

Global app state lives in `frontend/src/state/store.tsx` (React context). API calls go through `frontend/src/api.ts`. The layout is: `Layout` → `Sidebar` (list of `SidebarCard`) + `Hero` (map + `Tiles` + `HourlyStrip` + `TenDayForecast`).

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Express listen port |
| `DATABASE_PATH` | `./backend/weather.db` | SQLite file path |
| `WEATHER_API_KEY` | — | Optional; passed as `x-api-key` header to data.gov.sg |
| `PORTLESS_PORT` | `1355` | Public `.localhost` port |
| `PORTLESS_HTTPS` | `0` | Enable HTTPS in Portless |
| `LOG_LEVEL` | — | Pino log level (set to `silent` in tests) |
