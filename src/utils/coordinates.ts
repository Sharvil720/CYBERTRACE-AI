/** Coordinate formats for field hand-off. Pure functions. */

export function toDMS(value: number, axis: 'lat' | 'lng'): string {
  const hemi = axis === 'lat' ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  const abs = Math.abs(value);
  let d = Math.floor(abs);
  let m = Math.floor((abs - d) * 60);
  let s = Math.round(((abs - d) * 60 - m) * 60 * 100) / 100;
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; d += 1; }
  return `${d}°${String(m).padStart(2, '0')}′${s.toFixed(2).padStart(5, '0')}″ ${hemi}`;
}

export function toDecimal(lat: number, lng: number, dp = 6): string {
  return `${lat.toFixed(dp)}, ${lng.toFixed(dp)}`;
}

const OLC_ALPHABET = '23456789CFGHJMPQRVWX';

/** Open Location Code (Plus Code), 10 digits (~14 m x 14 m cell), e.g. "7JWVXCV3+2F". */
export function toPlusCode(lat: number, lng: number): string {
  const clampedLat = Math.min(90 - 1e-9, Math.max(-90, lat));
  let normLng = lng;
  while (normLng < -180) normLng += 360;
  while (normLng >= 180) normLng -= 360;
  let latVal = Math.floor((clampedLat + 90) * 8000 + 1e-7);
  let lngVal = Math.floor((normLng + 180) * 8000 + 1e-7);
  const latDigits: string[] = [];
  const lngDigits: string[] = [];
  for (let i = 0; i < 5; i++) {
    latDigits.unshift(OLC_ALPHABET[latVal % 20]);
    lngDigits.unshift(OLC_ALPHABET[lngVal % 20]);
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
  }
  let code = '';
  for (let i = 0; i < 5; i++) code += latDigits[i] + lngDigits[i];
  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
