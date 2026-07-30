import { CACHE } from '../config.js';
import { state } from '../state.js';
import { fetchSeaForecast } from '../api/openmeteo.js';
import { readCache, writeCache } from '../utils/storage.js';
import { formatUpdatedAt } from '../utils/date.js';
import { getSelectedRows } from './tide.js';

const compass = degree => ['北','北北東','東北','東北東','東','東南東','東南','南南東','南','南南西','西南','西南西','西','西北西','西北','北北西'][Math.round((((degree % 360) + 360) % 360) / 22.5) % 16];

function freshness(timestamp, cached) {
  document.getElementById('windFreshness')?.classList.toggle('cached', cached);
  document.getElementById('windUpdatedAt').textContent = formatUpdatedAt(timestamp);
}

function renderRisk(wind, wave) {
  const badge = document.getElementById('seaRiskBadge');
  let level = '一般';
  let className = '';
  let icon = '●';
  if ((Number.isFinite(wave) && wave >= 2) || (Number.isFinite(wind) && wind >= 35)) {
    [level, className, icon] = ['風浪偏強', 'danger', '▲'];
  } else if ((Number.isFinite(wave) && wave >= 1.2) || (Number.isFinite(wind) && wind >= 22)) {
    [level, className, icon] = ['留意海況', 'caution', '◆'];
  }
  badge.className = `risk-badge ${className}`.trim();
  badge.textContent = `${icon} ${level}`;
}

function render(data, cached = false) {
  const weather = data.weather || {};
  const marine = data.marine || {};
  document.getElementById('windSpeed').textContent = Number.isFinite(weather.wind_speed_10m) ? `${weather.wind_speed_10m} km/h` : '—';
  document.getElementById('windDirection').textContent = Number.isFinite(weather.wind_direction_10m) ? `${compass(weather.wind_direction_10m)} ${Math.round(weather.wind_direction_10m)}°` : '—';
  document.getElementById('waveHeight').textContent = Number.isFinite(marine.wave_height) ? `${marine.wave_height} m` : '—';
  document.getElementById('wavePeriod').textContent = Number.isFinite(marine.wave_period) ? `${marine.wave_period} 秒` : '—';
  renderRisk(weather.wind_speed_10m, marine.wave_height);
  freshness(data.ts || Date.now(), cached);
  state.weather = data;
}

export async function updateWeather() {
  const location = getSelectedRows()[0];
  const lat = Number(location?.lat);
  const lon = Number(location?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
  const key = `${CACHE.windPrefix}${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = readCache(key, CACHE.windMaxAge);
  if (cached?.fresh) {
    render(cached.data, true);
    return;
  }
  if (state.forecastCacheKey === key) return;
  state.forecastCacheKey = key;
  document.getElementById('seaRiskBadge').textContent = '● 更新中';
  try {
    const data = await fetchSeaForecast(lat, lon);
    render(data);
    writeCache(key, data);
  } catch (error) {
    console.warn('風浪資料讀取失敗', error);
    const fallback = readCache(key, Number.MAX_SAFE_INTEGER);
    if (fallback) render(fallback.data, true);
    else {
      document.getElementById('seaRiskBadge').className = 'risk-badge caution';
      document.getElementById('seaRiskBadge').textContent = '◆ 暫無資料';
    }
  } finally {
    state.forecastCacheKey = '';
  }
}
