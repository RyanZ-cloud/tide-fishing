export const APP_VERSION = 'v3.2.0';
export const LAST_UPDATE = '2026-07-30';

export const API = Object.freeze({
  cwa: 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-A0021-001',
  openMeteo: 'https://api.open-meteo.com/v1/forecast',
  openMeteoMarine: 'https://marine-api.open-meteo.com/v1/marine',
  mapTiles: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
});

// GitHub Pages 無法保護前端金鑰。正式環境建議改由受控 proxy 注入。
export const CWA_API_KEY = 'CWA-21333DF4-B9DB-4810-ABC6-BE0F5BA71485';

export const CACHE = Object.freeze({
  tideKey: 'tideAssistantCwaCacheV303',
  tideMaxAge: 4 * 60 * 60 * 1000,
  windPrefix: 'tideAssistantWindCacheV300:',
  windMaxAge: 45 * 60 * 1000
});

export const GOLDEN_WINDOW = Object.freeze({ beforeMinutes: 120, afterMinutes: 60 });
export const GEO_OPTIONS = Object.freeze({
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 300000
});
