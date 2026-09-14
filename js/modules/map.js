import { API, RADAR } from '../config.js';
import { state } from '../state.js';

const radarButton = () => document.getElementById('radarToggle');
const radarStatus = () => document.getElementById('radarStatus');

function radarObservationTime(date = new Date()) {
  const result = new Date(date);
  result.setMinutes(Math.floor(result.getMinutes() / RADAR.refreshMinutes) * RADAR.refreshMinutes, 0, 0);
  return result;
}

function radarKey(date = new Date()) {
  const observed = radarObservationTime(date);
  return `${observed.getFullYear()}${String(observed.getMonth() + 1).padStart(2, '0')}${String(observed.getDate()).padStart(2, '0')}${String(observed.getHours()).padStart(2, '0')}${String(observed.getMinutes()).padStart(2, '0')}`;
}

function radarTimeLabel(date = new Date()) {
  const observed = radarObservationTime(date);
  return `${String(observed.getHours()).padStart(2, '0')}:${String(observed.getMinutes()).padStart(2, '0')}`;
}

function setRadarStatus(message, error = false) {
  const status = radarStatus();
  if (!status) return;
  status.textContent = message;
  status.classList.toggle('is-error', error);
}

function radarUrl(key) {
  return `${API.radarOverlay}?time=${key}`;
}

function refreshRadarLayer(force = false) {
  if (!state.map || !state.radarVisible) return;
  const key = radarKey();
  if (!force && state.radarTimeKey === key) return;
  state.radarTimeKey = key;
  if (!state.radarLayer) {
    state.radarLayer = L.imageOverlay(radarUrl(key), RADAR.bounds, {
      opacity: RADAR.opacity,
      interactive: false,
      attribution: '雷達回波 &copy; 中央氣象署'
    });
    state.radarLayer.on('load', () => setRadarStatus(`中央氣象署雷達回波・約 ${radarTimeLabel()} 更新`));
    state.radarLayer.on('error', () => {
      setRadarStatus('雷達回波暫時無法載入，請稍後再試。', true);
      radarButton()?.classList.add('has-error');
    });
    state.radarLayer.addTo(state.map);
  } else {
    state.radarLayer.setUrl(radarUrl(key));
    if (!state.map.hasLayer(state.radarLayer)) state.radarLayer.addTo(state.map);
  }
}

export function setRadarVisible(visible) {
  if (!state.map) return;
  state.radarVisible = visible;
  const button = radarButton();
  button?.setAttribute('aria-pressed', String(visible));
  button?.classList.toggle('is-active', visible);
  button?.classList.remove('has-error');
  if (visible) {
    setRadarStatus('正在載入中央氣象署雷達回波…');
    refreshRadarLayer(true);
  } else {
    if (state.radarLayer && state.map.hasLayer(state.radarLayer)) state.map.removeLayer(state.radarLayer);
    setRadarStatus('雷達回波每 10 分鐘更新，可視需要開啟。');
  }
}

export function bindRadarControl() {
  const button = radarButton();
  if (!button || button.dataset.bound === 'true') return;
  button.dataset.bound = 'true';
  button.addEventListener('click', () => setRadarVisible(!state.radarVisible));
  state.radarTimer ||= window.setInterval(() => refreshRadarLayer(), 60 * 1000);
}

export function initMap(onSelect) {
  if (state.map || !globalThis.L) return state.map;
  state.map = L.map('map', { zoomControl: true }).setView([23.7, 121], 7);
  L.tileLayer(API.mapTiles, {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(state.map);
  state.map.onSelect = onSelect;
  bindRadarControl();
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
