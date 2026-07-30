import { state } from '../state.js';
import { todayLocal } from '../utils/date.js';
import { getSelectedRows } from './tide.js';

const weekdayFormatter = new Intl.DateTimeFormat('zh-TW', { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' });

function availableDates() {
  return [...new Set(getSelectedRows().map(row => row.date).filter(Boolean))].sort();
}

function formatDate(dateString) {
  return dateFormatter.format(new Date(`${dateString}T12:00:00`));
}

function formatWeekday(dateString) {
  return weekdayFormatter.format(new Date(`${dateString}T12:00:00`)).replace('週', '');
}

function visibleDates(dates) {
  if (dates.length <= 7) return dates;
  const todayIndex = dates.indexOf(todayLocal());
  const selectedIndex = dates.indexOf(state.selectedDate);
  const center = selectedIndex >= 0 ? selectedIndex : Math.max(0, todayIndex);
  const start = Math.min(Math.max(0, center - 2), dates.length - 7);
  return dates.slice(start, start + 7);
}

export function renderDateNavigation() {
  const dates = availableDates();
  const selectedIndex = dates.indexOf(state.selectedDate);
  const today = todayLocal();
  const list = document.getElementById('dateQuickList');
  const dateInput = document.getElementById('quickDateInput');
  dateInput.value = state.selectedDate || '';
  dateInput.min = dates[0] || '';
  dateInput.max = dates.at(-1) || '';
  dateInput.disabled = !dates.length;
  document.getElementById('previousDateBtn').disabled = selectedIndex <= 0;
  document.getElementById('nextDateBtn').disabled = selectedIndex < 0 || selectedIndex >= dates.length - 1;
  document.getElementById('todayShortcutBtn').hidden = !dates.includes(today) || state.selectedDate === today;

  list.innerHTML = visibleDates(dates).map(date => {
    const isToday = date === today;
    const isActive = date === state.selectedDate;
    return `<button class="date-chip${isActive ? ' active' : ''}" type="button" data-date="${date}" aria-pressed="${isActive}">
      <span>${isToday ? '今天' : formatWeekday(date)}</span>
      <strong>${formatDate(date)}</strong>
    </button>`;
  }).join('');
}

export function bindDateNavigation(onChange) {
  const changeTo = date => {
    if (!date || date === state.selectedDate) return;
    state.selectedDate = date;
    document.getElementById('dateInput').value = date;
    onChange();
  };

  document.getElementById('dateQuickList').addEventListener('click', event => {
    const button = event.target.closest('[data-date]');
    if (button) changeTo(button.dataset.date);
  });

  document.getElementById('previousDateBtn').addEventListener('click', () => {
    const dates = availableDates();
    changeTo(dates[dates.indexOf(state.selectedDate) - 1]);
  });

  document.getElementById('nextDateBtn').addEventListener('click', () => {
    const dates = availableDates();
    changeTo(dates[dates.indexOf(state.selectedDate) + 1]);
  });

  document.getElementById('quickDateInput').addEventListener('change', event => {
    const dates = availableDates();
    if (dates.includes(event.target.value)) changeTo(event.target.value);
    else {
      event.target.value = state.selectedDate;
      event.target.setCustomValidity('此日期沒有可用的潮汐資料');
      event.target.reportValidity();
      event.target.setCustomValidity('');
    }
  });
  document.getElementById('todayShortcutBtn').addEventListener('click', () => changeTo(todayLocal()));
}
