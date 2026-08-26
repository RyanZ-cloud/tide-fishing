import { CACHE } from './config.js';
import { state } from './state.js';
import { fetchTideForecast } from './api/cwa.js';
import { readCache, writeCache } from './utils/storage.js';
import { todayLocal, formatUpdatedAt } from './utils/date.js';
import { getCurrentPosition, findNearestLocation } from './utils/geo.js';
import {
  parseTideRows, findBestMatch, populateLocationSelect,
  renderTideSummary
} from './modules/tide.js';
import { drawChart, bindChartInspector } from './modules/chart.js';
import {
  initMap, renderMapPoints, showUserPosition,
  fitUserAndStation, focusMap, invalidateMap
} from './modules/map.js';
import { updateWeather } from './modules/weather.js';
import { renderLunar } from './modules/lunar.js';
import { renderNearbySpots } from './modules/favorite.js';
import { shareConditions } from './modules/share.js';
import { bindDateNavigation, renderDateNavigation } from './modules/date-nav.js';
import { bindLocationPicker, renderLocationPicker } from './modules/location-picker.js';

const APP_VERSION = 'v3.4.0';
const LAST_UPDATE = '2026-08-26';
import { getLastLocation, rememberLocation } from './modules/location-preferences.js';

const element = id => document.getElementById(id);

function setStatus(message, error = false) {
  element('status').textContent = message;
  element('status').className = `status${error ? ' err' : ''}`;
}

function setDataStatus(kind = '', message = '') {
  const status = element('dataStatus');
  status.hidden = !message;
  status.className = `data-status${kind ? ` ${kind}` : ''}`;
  status.textContent = message;
  document.body.classList.toggle('data-loading', kind === 'loading');
}

function setTideFreshness(timestamp, cached = false) {
  element('tideFreshness')?.classList.toggle('cached', cached);
  element('tideUpdatedAt').textContent = formatUpdatedAt(timestamp);
}

function selectLocation(name, latitude, longitude) {
  state.selectedLocation = name;
  rememberLocation(name);
  element('locationSelect').value = name;
  element('search').value = name;
  renderAll();
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    state.map?.setView([latitude, longitude], Math.max(state.map.getZoom(), 9));
  }
}

function selectSpot(spot) {
  const match = findBestMatch(spot.keyword) || findBestMatch(spot.name);
  if (match) {
    state.spot = spot;
    state.selectedLocation = match;
    rememberLocation(match);
    element('locationSelect').value = match;
    element('search').value = spot.name;
    renderAll();
  }
  focusMap(spot.lat, spot.lon);
}

function renderAll() {
  renderDateNavigation();
  renderLocationPicker();
  renderTideSummary();
  drawChart();
  renderMapPoints(selectLocation);
  renderNearbySpots({ onSelect: selectSpot, onFavorite: renderAll });
  renderLunar();
  void updateWeather();
}

function serializeTideRows(rowsByLocation) {
  return [...rowsByLocation.entries()].map(([name, rows]) => {
    const { lat, lon } = rows[0] || {};
    return [name, lat, lon, rows.map(row => [
      row.dateTime, row.lunar, row.tideRange, row.tideType, row.aboveLocalMSL
    ])];
  });
}

function deserializeTideRows(compactRows) {
  return new Map(compactRows.map(([name, lat, lon, rows]) => [
    name,
    rows.map(([dateTime, lunar, tideRange, tideType, aboveLocalMSL]) => ({
      location: name,
      lat,
      lon,
      date: String(dateTime || '').slice(0, 10),
      dateTime,
      time: String(dateTime || '').slice(11, 16) || '—',
      lunar,
      tideRange,
      tideType,
      aboveLocalMSL
    }))
  ]));
}

function applyTidePayload(data, text, timestamp, cached = false, cachedRows = null) {
  const rowsByLocation = cachedRows ? deserializeTideRows(cachedRows) : parseTideRows(data);
  if (!rowsByLocation.size) throw new Error('解析後沒有任何潮汐地點。');
  Object.assign(state, { raw: data, rawText: text || '', rowsByLocation, tide: { timestamp, cached } });
  const savedLocation = getLastLocation();
  const preferredLocation = state.rowsByLocation.has(savedLocation)
    ? savedLocation
    : findBestMatch(element('search').value.trim());
  populateLocationSelect(preferredLocation);
  if (preferredLocation) element('search').value = preferredLocation;
  state.selectedDate = element('dateInput').value || todayLocal();
  element('dateInput').value = state.selectedDate;
  initMap(selectLocation);
  renderAll();
  setTideFreshness(timestamp, cached);
}

async function locateNearestTidePoint({ silentStart = false } = {}) {
  if (!state.rowsByLocation.size) {
    setStatus('潮汐資料尚未載入，請先按「重新載入潮汐」。', true);
    return null;
  }
  if (!silentStart) setStatus('正在取得目前位置並尋找最近潮汐點…');
  try {
    const position = await getCurrentPosition();
    const user = { lat: position.coords.latitude, lon: position.coords.longitude };
    const nearest = findNearestLocation(state.rowsByLocation, user.lat, user.lon);
    if (!nearest) throw new Error('NO_TIDE_COORDINATES');
    state.userLocation = user;
    state.selectedLocation = nearest.name;
    element('search').value = nearest.name;
    populateLocationSelect(nearest.name);
    showUserPosition(user.lat, user.lon);
    renderAll();
    fitUserAndStation(user, nearest);
    setStatus(`已自動選擇最近潮汐點：${nearest.name}\n直線距離約 ${nearest.distanceKm.toFixed(1)} 公里。`);
    return nearest;
  } catch (error) {
    let message = '目前無法取得定位，仍可使用地圖或下拉選單手動選擇。';
    if (error.code === error.PERMISSION_DENIED) message = '你尚未允許定位權限，仍可手動選擇潮汐點。若要使用自動定位，請在瀏覽器網址列開啟位置權限。';
    else if (error.code === error.POSITION_UNAVAILABLE) message = '裝置目前無法提供位置，仍可手動選擇潮汐點。';
    else if (error.code === error.TIMEOUT) message = '定位逾時，仍可手動選擇潮汐點，或稍後再按定位按鈕。';
    setStatus(message, true);
    return null;
  }
}

async function loadData() {
  const cached = readCache(CACHE.tideKey, CACHE.tideMaxAge);
  if (cached?.fresh) {
    try {
      applyTidePayload(null, '', cached.ts, true, cached.data.rows);
      setStatus('已載入最近成功的潮汐快取資料。');
      setDataStatus('cached', `使用快取資料・更新於 ${formatUpdatedAt(cached.ts)}`);
      if (!state.rowsByLocation.has(getLastLocation())) {
        const nearest = await locateNearestTidePoint({ silentStart: true });
        if (!nearest) setStatus('潮汐快取資料已載入，可用地圖或下拉選單選擇地點。');
      } else {
        setStatus(`已恢復上次選擇的潮汐站：${state.selectedLocation}`);
      }
      return;
    } catch (error) {
      console.warn('快取解析失敗', error);
    }
  }
  setStatus('正在讀取中央氣象署潮汐資料…');
  setDataStatus('loading', '正在取得最新潮汐資料…');
  try {
    const { data, text } = await fetchTideForecast();
    const timestamp = Date.now();
    applyTidePayload(data, text, timestamp);
    writeCache(CACHE.tideKey, { rows: serializeTideRows(state.rowsByLocation) });
    setDataStatus();
    if (!state.rowsByLocation.has(getLastLocation())) {
      const nearest = await locateNearestTidePoint({ silentStart: true });
      if (!nearest) setStatus(`潮汐資料載入成功：共 ${state.rowsByLocation.size} 個地點。定位未完成，可手動選擇。`);
    } else {
      setStatus(`潮汐資料載入成功，已恢復上次選擇：${state.selectedLocation}`);
    }
  } catch (error) {
    console.error(error);
    const fallback = readCache(CACHE.tideKey, Number.MAX_SAFE_INTEGER);
    if (fallback) {
      try {
        applyTidePayload(null, '', fallback.ts, true, fallback.data.rows);
        setStatus(`即時潮汐更新失敗，已改用最近成功資料（${formatUpdatedAt(fallback.ts)}）。`, true);
        setDataStatus('cached', `無法更新，目前使用 ${formatUpdatedAt(fallback.ts)} 的快取資料`);
        return;
      } catch (fallbackError) {
        console.warn('備援快取解析失敗', fallbackError);
      }
    }
    setStatus(`潮汐資料讀取失敗：\n${error.message}`, true);
    setDataStatus('error', '潮汐資料載入失敗，請檢查網路後重新載入。');
  }
}

function showUpdateToast(registration) {
  let toast = element('updateToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'updateToast';
    toast.className = 'update-toast';
    toast.innerHTML = '<span>發現新版，重新整理後即可使用最新功能。</span><button class="btn-primary" type="button">立即更新</button>';
    document.body.append(toast);
  }
  toast.classList.add('show');
  toast.querySelector('button').onclick = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      if (registration.waiting) showUpdateToast(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(registration);
        });
      });
    } catch (error) {
      console.warn('Service Worker 註冊失敗', error);
    }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

function bindEvents() {
  element('loadBtn').addEventListener('click', loadData);
  element('locateBtn').addEventListener('click', () => locateNearestTidePoint());
  element('headerLocateBtn').addEventListener('click', () => element('locateBtn').click());
  element('shareBtn').addEventListener('click', () => shareConditions(setStatus));
  element('todayBtn').addEventListener('click', () => {
    state.selectedDate = todayLocal();
    element('dateInput').value = state.selectedDate;
    renderAll();
  });
  bindDateNavigation(renderAll);
  bindLocationPicker(name => selectLocation(name));
  element('search').addEventListener('input', () => {
    populateLocationSelect(findBestMatch(element('search').value.trim()));
    renderAll();
  });
  element('locationSelect').addEventListener('change', event => {
    selectLocation(event.target.value);
  });
  element('dateInput').addEventListener('change', event => {
    state.selectedDate = event.target.value;
    renderAll();
  });
  document.querySelectorAll('[data-scroll]').forEach(button => {
    button.addEventListener('click', () => element(button.dataset.scroll)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  });
  window.addEventListener('resize', () => {
    invalidateMap();
    drawChart();
  });
  const updateOnline = () => element('offlineBanner')?.classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    element('installBtn').style.display = 'inline-block';
  });
  element('installBtn').addEventListener('click', async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    element('installBtn').style.display = 'none';
  });
}

function init() {
  element('footerVersion').textContent = APP_VERSION;
  element('footerUpdate').textContent = LAST_UPDATE.replaceAll('-', '/');
  state.selectedDate = todayLocal();
  element('dateInput').value = state.selectedDate;
  initMap(selectLocation);
  drawChart();
  bindChartInspector();
  bindEvents();
  registerServiceWorker();
  void loadData();
}

init();
