import { state } from '../state.js';

const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
const compass = degree => ['北','北北東','東北','東北東','東','東南東','東南','南南東','南','南南西','西南','西南西','西','西北西','西北','北北西'][Math.round((((degree % 360) + 360) % 360) / 22.5) % 16];
const shortDate = value => `${Number(value.slice(5, 7))}/${Number(value.slice(8, 10))}`;

function strength(value, limits) {
  if (value === null) return '';
  if (value >= limits[2]) return 'level-4';
  if (value >= limits[1]) return 'level-3';
  if (value >= limits[0]) return 'level-2';
  return 'level-1';
}

function direction(value) {
  if (value === null) return '<span class="pro-na">—</span>';
  return `<span class="direction-arrow" style="--direction:${value}deg">↑</span><small>${compass(value)}</small>`;
}

function cell(value, suffix = '', digits = 0, className = '') {
  if (value === null) return '<td><span class="pro-na">—</span></td>';
  return `<td class="${className}"><strong>${value.toFixed(digits)}</strong><small>${suffix}</small></td>`;
}

function availableDates(times) {
  return [...new Set(times.map(time => String(time).slice(0, 10)).filter(Boolean))];
}

export function setProfessionalDate(date) {
  state.professionalDate = date;
  renderProfessionalMarine();
}

export function renderProfessionalMarine() {
  const container = document.getElementById('professionalMarineContent');
  const tabs = document.getElementById('professionalMarineDates');
  if (!container || !tabs) return;
  const hourly = state.weather?.hourly;
  const times = hourly?.time || [];
  const dates = availableDates(times);
  if (!dates.length) {
    tabs.innerHTML = '';
    container.innerHTML = '<div class="pro-marine-empty">專業風浪預報載入中…</div>';
    return;
  }
  const selected = dates.includes(state.professionalDate)
    ? state.professionalDate
    : dates.includes(state.selectedDate) ? state.selectedDate : dates[0];
  state.professionalDate = selected;
  tabs.innerHTML = dates.map((date, index) => {
    const label = index === 0 ? `今天 ${shortDate(date)}` : shortDate(date);
    return `<button type="button" class="pro-date${date === selected ? ' is-active' : ''}" data-pro-date="${date}">${label}</button>`;
  }).join('');
  tabs.querySelectorAll('[data-pro-date]').forEach(button => button.addEventListener('click', () => setProfessionalDate(button.dataset.proDate)));

  const indexes = times.map((time, index) => ({ time, index }))
    .filter(item => String(item.time).startsWith(selected) && Number(String(item.time).slice(11, 13)) % 3 === 0);
  if (!indexes.length) {
    container.innerHTML = '<div class="pro-marine-empty">此日期暫無逐時預報。</div>';
    return;
  }
  const values = (key, index) => number(hourly[key]?.[index]);
  const headings = indexes.map(({ time }) => `<th scope="col">${String(time).slice(11, 16)}</th>`).join('');
  const row = (label, icon, render) => `<tr><th scope="row"><span>${icon}</span>${label}</th>${indexes.map(({ index }) => render(index)).join('')}</tr>`;
  container.innerHTML = `<div class="pro-table-scroll" tabindex="0" aria-label="可左右滑動查看逐時專業風浪預報"><table class="pro-marine-table">
    <thead><tr><th scope="col">項目</th>${headings}</tr></thead><tbody>
    ${row('風速', '🌬️', i => { const value = values('windSpeed', i); return cell(value, 'km/h', 0, strength(value, [15, 25, 35])); })}
    ${row('陣風', '💨', i => { const value = values('windGusts', i); return cell(value, 'km/h', 0, strength(value, [20, 32, 45])); })}
    ${row('風向', '🧭', i => `<td>${direction(values('windDirection', i))}</td>`)}
    ${row('浪高', '🌊', i => { const value = values('waveHeight', i); return cell(value, 'm', 1, strength(value, [0.8, 1.5, 2.5])); })}
    ${row('週期', '⏱️', i => cell(values('wavePeriod', i), '秒', 1))}
    ${row('浪向', '↗️', i => `<td>${direction(values('waveDirection', i))}</td>`)}
    ${row('湧浪', '〰️', i => { const value = values('swellHeight', i); return cell(value, 'm', 1, strength(value, [0.6, 1.2, 2])); })}
    ${row('湧浪週期', '⏳', i => cell(values('swellPeriod', i), '秒', 1))}
    ${row('湧浪方向', '🧭', i => `<td>${direction(values('swellDirection', i))}</td>`)}
    ${row('降雨', '🌧️', i => { const value = values('precipitationProbability', i); return cell(value, '%', 0, strength(value, [30, 60, 80])); })}
    </tbody></table></div>`;
}
