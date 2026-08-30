import { state } from '../state.js';
import { todayLocal } from '../utils/date.js';
import { getSelectedRows } from './tide.js';

const weekday = new Intl.DateTimeFormat('zh-TW', { weekday: 'short' });
const shortDate = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' });

function availableDays() {
  const grouped = new Map();
  for (const row of getSelectedRows()) {
    if (!row.date || row.date < todayLocal()) continue;
    if (!grouped.has(row.date)) grouped.set(row.date, []);
    grouped.get(row.date).push(row);
  }
  return [...grouped.entries()].slice(0, 7);
}

function tideTime(rows, type) {
  return rows.find(row => String(row.tideType).includes(type))?.time || '—';
}

export function renderWeeklyOverview() {
  const container = document.getElementById('weeklyTides');
  if (!container) return;
  const days = availableDays();
  if (!days.length) {
    container.innerHTML = '<div class="weekly-empty">目前沒有未來七天潮汐資料。</div>';
    return;
  }
  container.innerHTML = days.map(([date, rows]) => {
    const parsed = new Date(`${date}T12:00:00`);
    const active = date === state.selectedDate;
    return `<button class="weekly-day${active ? ' active' : ''}" type="button" data-weekly-date="${date}" aria-pressed="${active}">
      <span>${date === todayLocal() ? '今天' : weekday.format(parsed).replace('週', '')}</span>
      <strong>${shortDate.format(parsed)}</strong>
      <em>${rows[0]?.tideRange || '—'}</em>
      <small>滿 ${tideTime(rows, '滿潮')}</small>
      <small>乾 ${tideTime(rows, '乾潮')}</small>
    </button>`;
  }).join('');
}

export function bindWeeklyOverview(onChange) {
  document.getElementById('weeklyTides')?.addEventListener('click', event => {
    const button = event.target.closest('[data-weekly-date]');
    if (!button || button.dataset.weeklyDate === state.selectedDate) return;
    state.selectedDate = button.dataset.weeklyDate;
    document.getElementById('dateInput').value = state.selectedDate;
    onChange();
    document.getElementById('chartSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
