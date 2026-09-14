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

function rangeSummary(rows) {
  const heights = rows.map(row => Number(row.aboveLocalMSL)).filter(Number.isFinite);
  if (heights.length < 2) return { value: null, label: '資料不足' };
  const value = Math.round(Math.max(...heights) - Math.min(...heights));
  return { value, label: value >= 100 ? '大潮差' : value >= 60 ? '中潮差' : '小潮差' };
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
    const range = rangeSummary(rows);
    return `<button class="weekly-day${active ? ' active' : ''}" type="button" data-weekly-date="${date}" aria-pressed="${active}">
      <span>${date === todayLocal() ? '今天' : weekday.format(parsed).replace('週', '')}</span>
      <strong>${shortDate.format(parsed)}</strong>
      <em>${range.value === null ? '—' : `${range.value} cm`}</em>
      <small>${range.label}</small>
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
