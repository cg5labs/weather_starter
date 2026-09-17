import { useState } from 'react';
import type { FormEvent } from 'react';
import { useStore } from '../state/store';
import { PlusIcon } from './icons';

export function AddLocationForm() {
  const { isAdding, setAdding, create } = useStore();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cancel = () => {
    setLatitude('');
    setLongitude('');
    setSubmitError(null);
    setAdding(false);
  };

  const handleUseLocation = async () => {
    setSubmitting(true);
    setSubmitError(null);

    type IpGeoData = {
      latitude?: number | string;
      longitude?: number | string;
      lat?: number | string;
      lon?: number | string;
    };

    type PermissionNavigator = Navigator & {
      permissions?: {
        query: (descriptor: PermissionDescriptor) => Promise<{ state: PermissionState }>;
      };
    };

    const doIpFallback = async () => {
      // ipapi.co sometimes blocks; try ipwho.is as a secondary fallback
      const providers = ['https://ipapi.co/json/', 'https://ipwho.is/'];
      let lastErr: Error | null = null;

      for (const url of providers) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`IP location lookup failed (${url})`);

          const data = (await res.json()) as IpGeoData;
          const lat = Number(data.latitude ?? data.lat ?? Number.NaN);
          const lon = Number(data.longitude ?? data.lon ?? Number.NaN);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            throw new Error('Could not determine location from IP');
          }

          await create({ latitude: lat, longitude: lon });
          return;
        } catch (error) {
          lastErr = error instanceof Error ? error : new Error(String(error));
        }
      }

      throw lastErr ?? new Error('IP lookup failed');
    };

    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        const permissionNavigator = navigator as PermissionNavigator;

        if (permissionNavigator.permissions && typeof permissionNavigator.permissions.query === 'function') {
          try {
            const status = await permissionNavigator.permissions.query({ name: 'geolocation' });
            if (status.state === 'denied') {
              await doIpFallback();
              return;
            }
          } catch {
            // Ignore permission query errors and proceed to prompt normally.
          }
        }

        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 600000,
            }),
          );
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          await create({ latitude: lat, longitude: lon });
          setLatitude('');
          setLongitude('');
          return;
        } catch (geoErr) {
          try {
            await doIpFallback();
            return;
          } catch (ipErr) {
            const geoMsg =
              geoErr instanceof Error ? geoErr.message : `Geolocation error code ${String(geoErr)}`;
            const ipMsg = ipErr instanceof Error ? ipErr.message : 'IP fallback failed';
            throw new Error(`${geoMsg}; ${ipMsg}`);
          }
        }
      }

      await doIpFallback();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not detect location';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await create({ latitude: Number(latitude), longitude: Number(longitude) });
      setLatitude('');
      setLongitude('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add location');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12]"
      >
        <PlusIcon />
        <span>Add Location</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-2.5 rounded-2xl border border-white/15 bg-white/[0.1] p-3 backdrop-blur-xl"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
        New coordinate
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid min-w-0 gap-1">
          <span className="text-[11px] text-white/60">Latitude</span>
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="1.3508"
            required
            className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-[11px] text-white/60">Longitude</span>
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="103.8390"
            required
            className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={submitting}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
        >
          {submitting ? 'Detecting…' : 'Use my location'}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {submitError && (
        <p className="rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100">
          {submitError}
        </p>
      )}
    </form>
  );
}
