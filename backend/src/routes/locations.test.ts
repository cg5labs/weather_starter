import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { WeatherSnapshot } from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [
    { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
  ],
};

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getCurrentWeather() {
          return weather;
        },
      },
    });
  });

  afterAll(async () => {
    const { closeDatabase } = await import('../db.js');
    closeDatabase();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes weather when a location is created', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
        psi_twenty_four_hourly: 42,
        pm25_one_hourly: 9,
        air_quality_region: 'central',
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
    expect(listResponse.body.locations[0].weather.psi_twenty_four_hourly).toBe(42);
  });

  it('returns air quality data after a weather refresh', async () => {
    const createResponse = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.32, longitude: 103.78 })
      .expect(201);

    const id = createResponse.body.id as number;

    const refreshResponse = await request(app).post(`/api/locations/${id}/refresh`).expect(200);

    expect(refreshResponse.body.weather).toMatchObject({
      psi_twenty_four_hourly: 42,
      pm25_one_hourly: 9,
      air_quality_region: 'central',
    });
  });

  it('deletes a location and returns 204', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.28, longitude: 103.83 })
      .expect(201);

    const id = created.body.id as number;

    await request(app).delete(`/api/locations/${id}`).expect(204);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations.find((l: { id: number }) => l.id === id)).toBeUndefined();
  });

  it('returns 404 when deleting a non-existent location', async () => {
    await request(app).delete('/api/locations/99999').expect(404);
  });
});
