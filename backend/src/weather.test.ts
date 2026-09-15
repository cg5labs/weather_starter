import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SingaporeWeatherClient, WeatherProviderError } from './weather.js';

// Matches data.gov.sg PSI v2 regionMetadata shape
const REGION_METADATA = [
  { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
  { name: 'north', labelLocation: { latitude: 1.41803, longitude: 103.82 } },
  { name: 'central', labelLocation: { latitude: 1.35735, longitude: 103.82 } },
  { name: 'south', labelLocation: { latitude: 1.29587, longitude: 103.82 } },
  { name: 'east', labelLocation: { latitude: 1.35735, longitude: 103.94 } },
];

function makePsiResponse(readings?: Record<string, number>) {
  return {
    code: 0,
    errorMsg: '',
    data: {
      regionMetadata: REGION_METADATA,
      items: [
        {
          timestamp: '2026-09-15T10:00:00+08:00',
          updatedTimestamp: '2026-09-15T10:30:00+08:00',
          readings: {
            psi_twenty_four_hourly: readings ?? {
              west: 44,
              national: 42,
              east: 48,
              central: 43,
              south: 41,
              north: 40,
            },
          },
        },
      ],
    },
  };
}

function makePm25Response(readings?: Record<string, number>) {
  return {
    code: 0,
    errorMsg: '',
    data: {
      regionMetadata: REGION_METADATA,
      items: [
        {
          timestamp: '2026-09-15T10:00:00+08:00',
          updatedTimestamp: '2026-09-15T10:30:00+08:00',
          readings: {
            pm25_one_hourly: readings ?? {
              west: 5,
              national: 6,
              east: 7,
              central: 6,
              south: 4,
              north: 5,
            },
          },
        },
      ],
    },
  };
}

describe('SingaporeWeatherClient.fetchAirQuality', () => {
  let server: Server;
  let baseUrl: string;
  const routeMap = new Map<string, { status: number; body: unknown }>();

  beforeAll(async () => {
    server = createServer((req, res) => {
      const { pathname } = new URL(req.url!, 'http://localhost');
      const route = routeMap.get(pathname);
      if (!route) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(route.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(route.body));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  );

  beforeEach(() => {
    routeMap.set('/v2/real-time/api/psi', { status: 200, body: makePsiResponse() });
    routeMap.set('/v2/real-time/api/pm25', { status: 200, body: makePm25Response() });
  });

  it('returns PSI and PM2.5 for the nearest region to central Singapore', async () => {
    // (1.35, 103.82) is closest to central (1.35735, 103.82)
    const client = new SingaporeWeatherClient({ baseUrl });
    const result = await client.fetchAirQuality(1.35, 103.82);

    expect(result.region).toBe('central');
    expect(result.psi).toBe(43);
    expect(result.pm25).toBe(6);
    expect(result.timestamp).toBeTruthy();
  });

  it('selects the east region for coordinates near the east coast', async () => {
    // (1.35, 103.94) is closest to east (1.35735, 103.94)
    const client = new SingaporeWeatherClient({ baseUrl });
    const result = await client.fetchAirQuality(1.35, 103.94);

    expect(result.region).toBe('east');
    expect(result.psi).toBe(48);
    expect(result.pm25).toBe(7);
  });

  it('selects the north region for coordinates near the north', async () => {
    // (1.42, 103.82) is closest to north (1.41803, 103.82)
    const client = new SingaporeWeatherClient({ baseUrl });
    const result = await client.fetchAirQuality(1.42, 103.82);

    expect(result.region).toBe('north');
    expect(result.psi).toBe(40);
    expect(result.pm25).toBe(5);
  });

  it('returns null values when region readings are absent', async () => {
    routeMap.set('/v2/real-time/api/psi', { status: 200, body: makePsiResponse({}) });
    routeMap.set('/v2/real-time/api/pm25', { status: 200, body: makePm25Response({}) });

    const client = new SingaporeWeatherClient({ baseUrl });
    const result = await client.fetchAirQuality(1.35, 103.82);

    expect(result.psi).toBeNull();
    expect(result.pm25).toBeNull();
    expect(result.region).toBe('central');
  });

  it('throws WeatherProviderError when PSI API returns a non-zero error code', async () => {
    routeMap.set('/v2/real-time/api/psi', {
      status: 200,
      body: { code: 1, errorMsg: 'service unavailable' },
    });

    const client = new SingaporeWeatherClient({ baseUrl });
    await expect(client.fetchAirQuality(1.35, 103.82)).rejects.toThrow(WeatherProviderError);
  });

  it('throws WeatherProviderError when PM2.5 API returns a non-zero error code', async () => {
    routeMap.set('/v2/real-time/api/pm25', {
      status: 200,
      body: { code: 1, errorMsg: 'service unavailable' },
    });

    const client = new SingaporeWeatherClient({ baseUrl });
    await expect(client.fetchAirQuality(1.35, 103.82)).rejects.toThrow(WeatherProviderError);
  });

  it('throws WeatherProviderError on HTTP 429 rate limit', async () => {
    routeMap.set('/v2/real-time/api/psi', { status: 429, body: {} });

    const client = new SingaporeWeatherClient({ baseUrl });
    await expect(client.fetchAirQuality(1.35, 103.82)).rejects.toThrow(WeatherProviderError);
  });

  it('throws WeatherProviderError on HTTP 503 from PM2.5 API', async () => {
    routeMap.set('/v2/real-time/api/pm25', { status: 503, body: {} });

    const client = new SingaporeWeatherClient({ baseUrl });
    await expect(client.fetchAirQuality(1.35, 103.82)).rejects.toThrow(WeatherProviderError);
  });
});
