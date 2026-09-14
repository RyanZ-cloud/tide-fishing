const initialState = {
  raw: null,
  rawText: '',
  rowsByLocation: new Map(),
  selectedLocation: '',
  selectedDate: '',
  weather: null,
  tide: null,
  warnings: [],
  warningStatus: 'idle',
  map: null,
  mapMarkers: [],
  userMarker: null,
  radarLayer: null,
  radarVisible: false,
  radarTimeKey: '',
  radarTimer: null,
  userLocation: null,
  chartGeometry: null,
  chartInspectTs: null,
  chartPinnedEventTs: null,
  chartViewHours: 24,
  chartViewCenterTs: null,
  chartViewDate: '',
  forecastCacheKey: '',
  deferredInstallPrompt: null
};

export const state = initialState;

export function updateState(patch) {
  Object.assign(state, patch);
  return state;
}
