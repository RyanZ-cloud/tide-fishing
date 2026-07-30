import { GEO_OPTIONS } from '../config.js';

export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = degree => degree * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentPosition(options = GEO_OPTIONS) {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('GEO_UNSUPPORTED'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

export function findNearestLocation(rowsByLocation, latitude, longitude) {
  let nearest = null;
  for (const [name, rows] of rowsByLocation.entries()) {
    const lat = Number(rows?.[0]?.lat);
    const lon = Number(rows?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const distance = distanceKm(latitude, longitude, lat, lon);
    if (!nearest || distance < nearest.distanceKm) {
      nearest = { name, lat, lon, distanceKm: distance };
    }
  }
  return nearest;
}
