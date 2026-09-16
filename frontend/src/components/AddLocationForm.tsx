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
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
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
      } else {
        // Fallback: try an IP-based geolocation service for non-secure contexts
        const res = await fetch('https://ipapi.co/json/');
        if (!res.ok) throw new Error('Location detection failed');
        const data = await res.json();
        const lat = Number(data.latitude ?? data.lat);
        const lon = Number(data.longitude ?? data.lon);
        if (!lat || !lon) throw new Error('Could not determine location from IP');
        await create({ latitude: lat, longitude: lon });
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not detect location');
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
