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
  userLocation: null,
  chartGeometry: null,
  chartInspectTs: null,
  forecastCacheKey: '',
  deferredInstallPrompt: null
};

export const state = initialState;

export function updateState(patch) {
  Object.assign(state, patch);
  return state;
}
