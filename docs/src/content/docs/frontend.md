---
title: "Frontend Overview"
description: "Frontend architecture, components, and developer notes"
draft: false
---

# Frontend Overview

The frontend is a React + Vite single-page app located in frontend/src. In development it runs as Vite middleware inside the same Node process as the backend.

Key files
- frontend/src/main.tsx — app bootstrap and StoreProvider placement.
- frontend/src/api.ts — small promise-based wrapper around fetch for /api endpoints (list/create/refresh/delete).
- frontend/src/state/store.tsx — central React context store that manages locations, selection, loading state, and actions (create, refresh, delete). It logs frontend interactions to POST /api/logs.
- Components (frontend/src/components):
  - Sidebar, SidebarCard — location list and controls
  - AddLocationForm — create location form (latitude/longitude validation)
  - Tiles, TenDayForecast, HourlyStrip — visual weather tiles and forecasts
  - MapCard — shows pins for saved locations (uses client-side mapping)

User flows
- Add location: user submits latitude/longitude → store.create calls API → backend creates DB record and attempts weather refresh → frontend reloads list and selects the new location.
- Refresh: clicking refresh triggers store.refresh which POSTs /api/locations/:id/refresh and reloads the list on success.

Developer notes
- API base is a relative '/api' — same-origin requests to the Express server.
- The store optimistically updates UI (e.g., removes a location on delete) and recovers state by reloading from the API if an operation fails.
- Interaction events are logged via logInteraction and sent to POST /api/logs with keepalive so events are recorded when navigating away.

Build and run
- Dev: npm run dev (runs server + Vite middleware; Portless gives a stable .localhost URL)
- Production: npm run build then npm run start to serve frontend/dist with Express
