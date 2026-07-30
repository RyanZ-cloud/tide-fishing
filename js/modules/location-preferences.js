import { readJson, writeJson } from '../utils/storage.js';

const LAST_LOCATION_KEY = 'tideAssistantLastLocation';
const RECENT_LOCATIONS_KEY = 'tideAssistantRecentLocations';
const FAVORITE_LOCATIONS_KEY = 'tideAssistantFavoriteLocations';
const MAX_RECENT_LOCATIONS = 5;

export const getLastLocation = () => readJson(LAST_LOCATION_KEY, '');
export const getRecentLocations = () => readJson(RECENT_LOCATIONS_KEY, []);
export const getFavoriteLocations = () => readJson(FAVORITE_LOCATIONS_KEY, []);

export function rememberLocation(name) {
  if (!name) return;
  const recent = [name, ...getRecentLocations().filter(location => location !== name)]
    .slice(0, MAX_RECENT_LOCATIONS);
  writeJson(LAST_LOCATION_KEY, name);
  writeJson(RECENT_LOCATIONS_KEY, recent);
}

export function toggleFavoriteLocation(name) {
  const favorites = new Set(getFavoriteLocations());
  if (favorites.has(name)) favorites.delete(name);
  else favorites.add(name);
  writeJson(FAVORITE_LOCATIONS_KEY, [...favorites]);
  return favorites.has(name);
}
