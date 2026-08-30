export const APP_VERSION = 'v3.8.0';
export const LAST_UPDATE = '2026-08-30';

export const API = Object.freeze({
  cwa: './data/tide.json',
  cwaWarnings: './data/warnings.json',
  openMeteo: 'https://api.open-meteo.com/v1/forecast',
  openMeteoMarine: 'https://marine-api.open-meteo.com/v1/marine',
  mapTiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
});

export const CACHE = Object.freeze({
  tideKey: 'tideAssistantCwaCacheV303',
  tideMaxAge: 4 * 60 * 60 * 1000,
  windPrefix: 'tideAssistantWindCacheV300:',
  windMaxAge: 45 * 60 * 1000,
  analyticsConsentKey: 'tideHelperAnalyticsConsentV1'
});

export const ANALYTICS = Object.freeze({ measurementId: 'G-B95D3SPDT2' });

export const GOLDEN_WINDOW = Object.freeze({ beforeMinutes: 120, afterMinutes: 60 });
export const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 300000
});
