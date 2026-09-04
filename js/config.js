export const APP_VERSION = 'v3.11.0';
export const LAST_UPDATE = '2026-09-04';

export const API = Object.freeze({
  cwa: './data/tide.json',
  cwaWarnings: './data/warnings.json',
  openMeteo: 'https://api.open-meteo.com/v1/forecast',
  openMeteoMarine: 'https://marine-api.open-meteo.com/v1/marine',
  mapTiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  radarOverlay: 'https://cwaopendata.s3.ap-northeast-1.amazonaws.com/Observation/O-A0058-006.png'
});

export const RADAR = Object.freeze({
  bounds: [[20.5, 118], [26.5, 124]],
  refreshMinutes: 10,
  opacity: 0.62
});

export const CACHE = Object.freeze({
  tideKey: 'tideAssistantCwaCacheV303',
  tideMaxAge: 4 * 60 * 60 * 1000,
  windPrefix: 'tideAssistantWindCacheV390:',
  windMaxAge: 45 * 60 * 1000
});

export const ANALYTICS = Object.freeze({ measurementId: 'G-B95D3SPDT2' });

export const GOLDEN_WINDOW = Object.freeze({ beforeMinutes: 120, afterMinutes: 60 });
export const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 300000
});
