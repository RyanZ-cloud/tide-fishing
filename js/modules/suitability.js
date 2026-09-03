import { state } from '../state.js';
import { getDayRows } from './tide.js';

const numeric = value => Number.isFinite(Number(value)) ? Number(value) : null;

function rainForSelectedDate() {
  const hourly = state.weather?.hourly;
  if (!hourly?.time?.length) return null;
  const values = hourly.time
    .map((time, index) => ({ time, value: numeric(hourly.precipitationProbability?.[index]) }))
    .filter(item => item.time.startsWith(state.selectedDate) && item.value !== null)
    .map(item => item.value);
  return values.length ? Math.max(...values) : null;
}

function hourlyMaximum(key) {
  const hourly = state.weather?.hourly;
  if (!hourly?.time?.length) return null;
  const values = hourly.time
    .map((time, index) => time.startsWith(state.selectedDate) ? numeric(hourly[key]?.[index]) : null)
    .filter(value => value !== null);
  return values.length ? Math.max(...values) : null;
}

function factor(label, value, cautionAt, dangerAt, unit, formatter = Math.round) {
  if (value === null) return { severity: 1, text: `${label}：暫無資料` };
  const severity = value >= dangerAt ? 2 : (value >= cautionAt ? 1 : 0);
  return { severity, text: `${label}：${formatter(value)}${unit}` };
}

export function renderSuitability() {
  const badge = document.getElementById('suitabilityBadge');
  const reasons = document.getElementById('suitabilityReasons');
  if (!badge || !reasons) return;
  const weather = state.weather?.weather || {};
  const marine = state.weather?.marine || {};
  const wind = hourlyMaximum('windSpeed') ?? numeric(weather.wind_speed_10m);
  const wave = hourlyMaximum('waveHeight') ?? numeric(marine.wave_height);
  const rain = rainForSelectedDate();
  const tideRows = getDayRows().filter(row => String(row.tideType).includes('潮'));
  const factors = [
    factor('風速', wind, 22, 35, ' km/h'),
    factor('浪高', wave, 1.2, 2, ' m', value => value.toFixed(1)),
    factor('降雨機率', rain, 40, 70, '%'),
    tideRows.length
      ? { severity: 0, text: `潮汐：${tideRows.length} 個滿／乾潮節點` }
      : { severity: 2, text: '潮汐：所選日期無資料' }
  ];
  const hasCoreData = wind !== null || wave !== null || rain !== null;
  const severity = hasCoreData ? Math.max(...factors.map(item => item.severity)) : 1;
  const levels = hasCoreData
    ? [{ label: '良好', className: 'good' }, { label: '普通', className: 'caution' }, { label: '不建議', className: 'danger' }]
    : [{}, { label: '資料不足', className: 'pending' }];
  badge.className = `suitability-badge ${levels[severity].className}`;
  badge.textContent = levels[severity].label;
  reasons.innerHTML = factors.map(item => `<span class="reason severity-${item.severity}">${item.text}</span>`).join('');
}
