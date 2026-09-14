import { CACHE } from '../config.js';
import { state } from '../state.js';
import { fetchSeaForecast } from '../api/openmeteo.js';
import { readCache, writeCache } from '../utils/storage.js';
import { getSelectedRows } from './tide.js';
import { renderMarineTrend } from './marine-trend.js';
import { renderSuitability } from './suitability.js';
import { renderDataHealth, renderFreshness, updateOfflineStatus } from './data-freshness.js';

const compass = degree => ['北','北北東','東北','東北東','東','東南東','東南','南南東','南','南南西','西南','西南西','西','西北西','西北','北北西'][Math.round((((degree % 360) + 360) % 360) / 22.5) % 16];

function renderRisk(wind, wave, rain) {
  const badge = document.getElementById('seaRiskBadge');
  let level = '良好';
  let className = '';
  let icon = '●';
  if ((Number.isFinite(wave) && wave >= 2) || (Number.isFinite(wind) && wind >= 35) || (Number.isFinite(rain) && rain >= 70)) {
    [level, className, icon] = ['不建議', 'danger', '▲'];
  } else if ((Number.isFinite(wave) && wave >= 1.2) || (Number.isFinite(wind) && wind >= 22) || (Number.isFinite(rain) && rain >= 40)) {
    [level, className, icon] = ['普通', 'caution', '◆'];
  }
  badge.className = `risk-badge ${className}`.trim();
  badge.textContent = `${icon} ${level}`;
}

function selectedDayMaximum(data, key) {
  const hourly = data.hourly;
  if (!hourly?.time?.length) return null;
  const values = hourly.time
    .map((time, index) => time.startsWith(state.selectedDate) ? Number(hourly[key]?.[index]) : NaN)
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function render(data, cached = false) {
  const weather = data.weather || {};
  const marine = data.marine || {};
  document.getElementById('windSpeed').textContent = Number.isFinite(weather.wind_speed_10m) ? `${weather.wind_speed_10m} km/h` : '—';
  document.getElementById('windDirection').textContent = Number.isFinite(weather.wind_direction_10m) ? `${compass(weather.wind_direction_10m)} ${Math.round(weather.wind_direction_10m)}°` : '—';
  document.getElementById('waveHeight').textContent = Number.isFinite(marine.wave_height) ? `${marine.wave_height} m` : '—';
  state.weather = data;
  const dayMax = {
    wind: selectedDayMaximum(data, 'windSpeed') ?? (Number.isFinite(weather.wind_speed_10m) ? weather.wind_speed_10m : null),
    wave: selectedDayMaximum(data, 'waveHeight') ?? (Number.isFinite(marine.wave_height) ? marine.wave_height : null),
    rain: selectedDayMaximum(data, 'precipitationProbability')
  };
  state.weatherSummary = {
    current: { wind: weather.wind_speed_10m, wave: marine.wave_height, direction: weather.wind_direction_10m },
    dayMax
  };
  state.weatherStatus = { timestamp: data.ts || Date.now(), cached };
  document.getElementById('rainChance').textContent = dayMax.rain !== null ? `${Math.round(dayMax.rain)}%` : '—';
  renderRisk(dayMax.wind, dayMax.wave, dayMax.rain);
  renderFreshness('windFreshness', 'windUpdatedAt', data.ts || Date.now(), cached, CACHE.windMaxAge);
  renderMarineTrend();
  renderSuitability();
  renderDataHealth();
  updateOfflineStatus();
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
      renderFreshness('windFreshness', 'windUpdatedAt', null, false, CACHE.windMaxAge);
      state.weatherStatus = null;
      renderSuitability();
      renderDataHealth();
    }
  } finally {
    state.forecastCacheKey = '';
  }
}
