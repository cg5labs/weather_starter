---
title: "Backend Overview"
description: "Backend architecture, routes, data model, and developer notes"
draft: false
---

# Backend Overview

The backend is a single-process Node/Express app implemented in TypeScript (backend/src). In development the same process also hosts the Vite-powered frontend using middleware.

Key entry: backend/src/server.ts
- createApp(options) builds an Express app used by both dev (`npm run dev`) and tests.
- Request logging uses pino; JSON body parsing is applied except on /frontman paths.
- Routes:
  - GET /health → simple health check
  - POST /api/logs → lightweight frontend event logger (validates event names)
  - /api/* → locations router (see below)

Locations router: backend/src/routes/locations.ts
- Endpoints:
  - GET /api/locations — list locations
  - POST /api/locations — create a location and immediately attempt to refresh weather
  - GET /api/locations/:id — fetch a single location
  - DELETE /api/locations/:id — delete a location
  - POST /api/locations/:id/refresh — refresh weather for an existing location
- The router accepts an injectable WeatherClient for tests and dependency inversion.

Weather client: backend/src/weather.ts
- SingaporeWeatherClient aggregates multiple data.gov.sg endpoints to build a WeatherSnapshot:
  - 2-hour forecast (area forecasts)
  - Real-time readings: air-temperature, relative-humidity, rainfall, wind-speed, wind-direction
  - UV index, PSI and PM2.5 (air quality), 24-hour and 4-day forecasts
- Nearest-station/nearest-area logic picks the most relevant reading by comparing squared distances.
- Results are cached in-memory per-lat/lon for a short TTL (default 30s) to reduce API load.
- The client throws WeatherProviderError for provider-level errors (rate limit, 401/403, unreachable).

Data layer: backend/src/db.ts and backend/src/schema.ts
- Drizzle ORM (sqlite-proxy) backed by a local SQLite file (default backend/weather.db). Path controlled by DATABASE_PATH.
- The locations table stores coordinates, created timestamp, and a JSON-serialized WeatherSnapshot (forecastPeriods, dailyForecast) plus scalar weather columns.
- Migrations live under backend/drizzle and are applied on startup via the drizzle migrator.

Testing and dev notes
- Tests use vitest (backend/src/*.test.ts) and inject a mock WeatherClient to avoid external calls.
- Useful commands:
  - npm run test — run backend tests
  - npm run db:generate / npm run db:migrate — update Drizzle migrations after schema changes
  - npm run reset — clear the local SQLite database (dev only)

Operational
- In production set NODE_ENV=production and build the frontend (npm run build) so Express serves static files from frontend/dist.
- Optionally set WEATHER_API_KEY to provide a higher rate limit to data.gov.sg (passed as x-api-key by the client).
