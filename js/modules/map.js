import { API } from '../config.js';
import { state } from '../state.js';

export function initMap(onSelect) {
  if (state.map || !globalThis.L) return state.map;
  state.map = L.map('map', { zoomControl: true }).setView([23.7, 121], 7);
  L.tileLayer(API.mapTiles, {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
  state.map.onSelect = onSelect;
  return state.map;
}

export function showUserPosition(latitude, longitude) {
  if (!state.map) return;
  if (state.userMarker) state.map.removeLayer(state.userMarker);
  state.userMarker = L.circleMarker([latitude, longitude], {
    radius: 8, color: '#ffffff', fillColor: '#ff5f6d', weight: 3, fillOpacity: 1
  }).addTo(state.map).bindPopup('<div style="color:#111"><strong>你目前的位置</strong></div>');
}

export function renderMapPoints(onSelect = state.map?.onSelect) {
  if (!state.map) return;
  for (const marker of state.mapMarkers) state.map.removeLayer(marker);
  state.mapMarkers = [];
  let focusMarker = null;
  for (const [name, rows] of state.rowsByLocation.entries()) {
    const { lat, lon } = rows[0] || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const selected = name === state.selectedLocation;
    const marker = L.circleMarker([lat, lon], {
      radius: selected ? 9 : 6,
      color: selected ? '#ffd56a' : '#76e0ff',
      fillColor: selected ? '#ffb35c' : '#1488ff',
      weight: selected ? 3 : 2,
      fillOpacity: 0.85
    }).addTo(state.map);
    const future = rows.filter(row => new Date(row.dateTime) >= new Date());
    const high = future.find(row => String(row.tideType).includes('滿潮'));
    const low = future.find(row => String(row.tideType).includes('乾潮'));
    marker.bindPopup(`<div style="color:#111"><strong>${name}</strong><br>下一次滿潮：${high ? `${high.date} ${high.time}` : '—'}<br>下一次乾潮：${low ? `${low.date} ${low.time}` : '—'}</div>`);
    marker.on('click', () => onSelect?.(name, lat, lon));
    state.mapMarkers.push(marker);
    if (selected) focusMarker = marker;
  }
  focusMarker?.openPopup();
}

export function focusMap(latitude, longitude, zoom = 12) {
  state.map?.setView([latitude, longitude], zoom);
}

export function fitUserAndStation(user, station) {
  if (!state.map) return;
  const bounds = L.latLngBounds([[user.lat, user.lon], [station.lat, station.lon]]);
  state.map.fitBounds(bounds.pad(0.35), { maxZoom: 11 });
}

export function invalidateMap() {
  state.map?.invalidateSize();
}
