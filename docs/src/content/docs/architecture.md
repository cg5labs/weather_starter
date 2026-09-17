---
title: "System Architecture"
description: "High-level architecture and request flows for Weather Starter"
draft: false
---

# System Architecture

Below are high-level diagrams that show how the development server, frontend, backend, and external weather APIs interact.

## Overall Architecture

```mermaid
flowchart LR
  Browser["Browser / Frontend"] -->|HTTP via Portless| Portless["Portless Proxy"]
  Portless --> Server["Node.js process\nExpress + Vite"]
  Server --> DB["SQLite (backend/weather.db)"]
  Server -->|External APIs| WeatherAPI["api-open.data.gov.sg"]
  Server --> Frontend["In dev: Vite middleware serves frontend"]
  Frontend -->|/api requests| Server
  subgraph Dev
    Portless
    Server
    Frontend
  end
```

## Create Location — Request Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant F as Frontend (React)
  participant S as Server (Express)
  participant W as SingaporeWeatherClient
  participant DB as SQLite/Drizzle

  U->>F: submit latitude/longitude
  F->>S: POST /api/locations
  S->>DB: INSERT new location (default weather)
  S->>W: getCurrentWeather(lat,lon)
  W->>WeatherAPI: fetch forecasts/readings
  WeatherAPI-->>W: return payloads
  W-->>S: snapshot
  S->>DB: UPDATE location with snapshot
  S-->>F: 201 Created (location with weather)
  F-->>U: render new location
```

## Dev vs Production Serving

- Dev: createApp uses Vite in middleware mode — one Node process serves API and the frontend (hot reload).
- Production: frontend/static files are served from frontend/dist; Express falls back to index.html for SPA routing.
