import { state } from '../state.js';
import { todayLocal } from '../utils/date.js';
import { getSelectedRows } from './tide.js';

function calculateSunTimes(dateString, latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const date = new Date(`${dateString}T12:00:00+08:00`);
  const radians = Math.PI / 180;
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
  const gamma = 2 * Math.PI / 365 * (day - 1);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const hourAngle = Math.acos(Math.min(1, Math.max(-1,
    Math.cos(90.833 * radians) / (Math.cos(latitude * radians) * Math.cos(declination))
    - Math.tan(latitude * radians) * Math.tan(declination)))) / radians;
  const noon = 720 - 4 * longitude - equation + 480;
  const format = minutes => {
    const normalized = (minutes + 1440) % 1440;
    const hour = Math.floor(normalized / 60);
    const minute = Math.round(normalized % 60);
    return `${String((hour + (minute === 60 ? 1 : 0)) % 24).padStart(2, '0')}:${String(minute === 60 ? 0 : minute).padStart(2, '0')}`;
  };
  return { sunrise: format(noon - 4 * hourAngle), sunset: format(noon + 4 * hourAngle) };
}

export function renderLunar() {
  const date = new Date(`${state.selectedDate || todayLocal()}T12:00:00+08:00`);
  const cycle = 29.53058867;
  let age = ((date - new Date('2000-01-06T18:14:00Z')) / 86400000) % cycle;
  if (age < 0) age += cycle;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * age / cycle)) / 2 * 100);
  const phases = [
    [1.85, '🌑 新月'], [5.54, '🌒 眉月'], [9.23, '🌓 上弦月'], [12.92, '🌔 盈凸月'],
    [16.61, '🌕 滿月'], [20.30, '🌖 虧凸月'], [23.99, '🌗 下弦月'], [27.68, '🌘 殘月'],
    [Infinity, '🌑 新月']
  ];
  document.getElementById('moonPhase').textContent = phases.find(([limit]) => age < limit)[1];
  document.getElementById('moonIllumination').textContent = `月面亮度約 ${illumination}%`;
  try {
    document.getElementById('lunarDate').textContent = new Intl.DateTimeFormat(
      'zh-TW-u-ca-chinese', { month: 'long', day: 'numeric' }
    ).format(date);
  } catch {
    document.getElementById('lunarDate').textContent = '—';
  }
  const location = getSelectedRows()[0];
  const sun = calculateSunTimes(state.selectedDate || todayLocal(), Number(location?.lat), Number(location?.lon));
  document.getElementById('sunriseTime').textContent = sun?.sunrise || '—';
  document.getElementById('sunsetTime').textContent = sun?.sunset || '—';
}
