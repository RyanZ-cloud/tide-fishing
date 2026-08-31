import { GOLDEN_WINDOW } from '../config.js';
import { state } from '../state.js';
import { onlyDate, onlyTime, formatClock, formatDateTime, todayLocal } from '../utils/date.js';

const arrayify = value => Array.isArray(value) ? value : (value == null ? [] : [value]);

function collectByKey(node, target, output = []) {
  if (!node || typeof node !== 'object') return output;
  for (const [key, value] of Object.entries(node)) {
    if (key === target) output.push(...arrayify(value));
    collectByKey(value, target, output);
  }
  return output;
}

function forecastItems(data) {
  const direct = collectByKey(data, 'TideForecasts');
  if (direct.length) return direct.flatMap(item => arrayify(item?.Location ?? item));
  return collectByKey(data, 'Location');
}

export function parseTideRows(data) {
  const grouped = new Map();
  for (const item of forecastItems(data)) {
    const location = item?.Location || item;
    const name = location?.LocationName || location?.locationName || location?.Name;
    if (!name) continue;
    const lat = Number(location?.Latitude ?? location?.latitude ?? location?.Lat ?? NaN);
    const lon = Number(location?.Longitude ?? location?.longitude ?? location?.Lon ?? NaN);
    const days = arrayify(location?.TimePeriods?.Daily || location?.Daily || location?.timePeriods?.daily);
    const rows = [];
    for (const day of days) {
      const date = day?.Date || day?.date || '';
      const lunar = day?.LunarDate || day?.lunarDate || '';
      const tideRange = day?.TideRange || day?.tideRange || '—';
      for (const time of arrayify(day?.Time || day?.time)) {
        const dateTime = time?.DateTime || time?.dateTime || '';
        const heights = time?.TideHeights || time?.tideHeights || {};
        rows.push({
          location: name, lat, lon,
          date: date || onlyDate(dateTime),
          dateTime,
          time: onlyTime(dateTime),
          lunar,
          tideRange,
          tideType: time?.Tide || time?.tide || time?.TideType || '—',
          aboveLocalMSL: Number(heights?.AboveLocalMSL ?? heights?.aboveLocalMSL ?? NaN)
        });
      }
    }
    if (rows.length) grouped.set(name, rows.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime)));
  }
  return grouped;
}

export function findBestMatch(keyword = '') {
  const names = [...state.rowsByLocation.keys()];
  return names.find(name => name === keyword)
    || names.find(name => name.includes(keyword))
    || names.find(name => keyword.includes(name))
    || '';
}

export const getSelectedRows = () => state.rowsByLocation.get(state.selectedLocation) || [];
export const getDayRows = () => getSelectedRows().filter(row => row.date === state.selectedDate);

function projectHeight(start, end, timestamp) {
  const ratio = (timestamp - start.ts) / (end.ts - start.ts || 1);
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * ratio);
  return start.h + (end.h - start.h) * eased;
}

export function interpolateSeries(rows, range = {}) {
  const points = rows
    .filter(row => Number.isFinite(row.aboveLocalMSL))
    .map(row => ({ ts: new Date(row.dateTime).getTime(), h: row.aboveLocalMSL }))
    .filter(point => Number.isFinite(point.ts))
    .sort((a, b) => a.ts - b.ts);
  if (points.length >= 2 && Number.isFinite(range.minT) && points[0].ts > range.minT) {
    points.unshift({ ts: range.minT, h: projectHeight(points[0], points[1], range.minT) });
  }
  if (points.length >= 2 && Number.isFinite(range.maxT) && points.at(-1).ts < range.maxT) {
    points.push({ ts: range.maxT, h: projectHeight(points.at(-2), points.at(-1), range.maxT) });
  }
  const output = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    for (let step = 0; step < 18; step += 1) {
      const ratio = step / 18;
      output.push({
        ts: start.ts + (end.ts - start.ts) * ratio,
        h: projectHeight(start, end, start.ts + (end.ts - start.ts) * ratio)
      });
    }
  }
  if (points.length) output.push(points.at(-1));
  return output;
}

export function goldenWindow(row) {
  const high = new Date(row.dateTime).getTime();
  const start = new Date(high - GOLDEN_WINDOW.beforeMinutes * 60000);
  const end = new Date(high + GOLDEN_WINDOW.afterMinutes * 60000);
  return {
    startTs: start.getTime(), endTs: end.getTime(),
    label: `${formatClock(start)}–${formatClock(end)}`
  };
}

export function populateLocationSelect(preferred = '') {
  const search = document.getElementById('search').value.trim();
  const names = [...state.rowsByLocation.keys()].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const filtered = search ? names.filter(name => name.includes(search)) : names;
  const select = document.getElementById('locationSelect');
  select.replaceChildren();
  for (const name of filtered) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    select.append(option);
  }
  const target = preferred && filtered.includes(preferred)
    ? preferred
    : (filtered.includes(state.selectedLocation) ? state.selectedLocation : filtered[0] || '');
  state.selectedLocation = target;
  select.value = target;
}

export function renderTideSummary() {
  const rows = getSelectedRows();
  const dayRows = getDayRows();
  const now = new Date();
  const isToday = state.selectedDate === todayLocal();
  const candidates = isToday
    ? rows.filter(row => new Date(row.dateTime) >= now)
    : dayRows;
  const next = candidates[0];
  const nextHigh = candidates.find(row => String(row.tideType).includes('滿潮'));
  const nextLow = candidates.find(row => String(row.tideType).includes('乾潮'));
  const first = dayRows[0] || rows[0];
  document.getElementById('selectedInfo').textContent = `📍 地點：${state.selectedLocation || '—'}　⌄`;
  document.getElementById('lunarInfo').textContent = `農曆：${first?.lunar || '—'}`;
  document.getElementById('rangeInfo').textContent = `潮差：${first?.tideRange || '—'}`;
  document.getElementById('nextTideLabel').textContent = isToday ? '下一波潮汐' : '所選日期潮汐';
  document.getElementById('nextHighLabel').textContent = isToday ? '▲ 下一次滿潮' : '▲ 當日滿潮';
  document.getElementById('nextLowLabel').textContent = isToday ? '▼ 下一次乾潮' : '▼ 當日乾潮';
  document.getElementById('nextEvent').textContent = next?.tideType || '—';
  document.getElementById('nextEventTime').textContent = next?.time || '—';
  document.getElementById('nextEventMeta').textContent = next ? formatDateTime(next.dateTime) : '—';
  document.getElementById('nextHigh').textContent = nextHigh?.time || '—';
  document.getElementById('nextHighMeta').textContent = nextHigh ? `${nextHigh.date}・${Math.round(nextHigh.aboveLocalMSL)} cm` : '—';
  document.getElementById('nextLow').textContent = nextLow?.time || '—';
  document.getElementById('nextLowMeta').textContent = nextLow ? `${nextLow.date}・${Math.round(nextLow.aboveLocalMSL)} cm` : '—';
  document.getElementById('adviceBox').textContent = state.selectedLocation
    ? `目前顯示 ${state.selectedLocation}；請搭配風浪、警特報與現場管制判斷。`
    : '載入資料後，可在台灣地圖上直接點潮汐點切換地點。';
}
