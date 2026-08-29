import { state } from '../state.js';
import { todayLocal } from '../utils/date.js';
import { getSelectedRows, interpolateSeries, goldenWindow } from './tide.js';

export function drawGrid(ctx, model) {
  const { pad, width, height, minT, maxT, x } = model;
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let index = 0; index < 4; index += 1) {
    const y = pad.top + index * ((height - pad.top - pad.bottom) / 3);
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
  }
  const threeHours = 3 * 3600000;
  for (let tick = minT; tick <= maxT; tick += threeHours) {
    const pointX = x(tick);
    ctx.moveTo(pointX, pad.top);
    ctx.lineTo(pointX, height - pad.bottom);
  }
  ctx.stroke();
}

export function drawAxis(ctx, model) {
  const { pad, width, height, hi, lo, minT, maxT, x, narrow } = model;
  ctx.fillStyle = 'rgba(200,220,245,.65)';
  ctx.font = '12px sans-serif';
  for (let index = 0; index < 4; index += 1) {
    const value = hi - index * ((hi - lo) / 3);
    const y = pad.top + index * ((height - pad.top - pad.bottom) / 3);
    ctx.fillText(`${Math.round(value)}`, 6, y + 4);
  }
  const step = 3 * 3600000;
  ctx.fillStyle = 'rgba(220,238,255,.75)';
  ctx.font = `${narrow ? 10 : 12}px sans-serif`;
  for (let tick = minT; tick <= maxT; tick += step) {
    const date = new Date(tick);
    const pointX = x(tick);
    ctx.textAlign = pointX < pad.left + 18 ? 'left' : (pointX > width - pad.right - 18 ? 'right' : 'center');
    ctx.fillText(String(date.getHours()).padStart(2, '0'), pointX, height - 13);
  }
  ctx.textAlign = 'start';
}

export function drawGolden(ctx, model) {
  const { pad, height, x, minT, maxT, rows } = model;
  rows.filter(row => String(row.tideType).includes('滿潮')).map(goldenWindow)
    .map(window => ({ ...window, startTs: Math.max(minT, window.startTs), endTs: Math.min(maxT, window.endTs) }))
    .filter(window => window.endTs > window.startTs)
    .forEach((window, index) => {
      const left = x(window.startTs);
      const right = x(window.endTs);
      ctx.fillStyle = 'rgba(255,213,106,.14)';
      ctx.fillRect(left, pad.top, right - left, height - pad.top - pad.bottom);
      ctx.fillStyle = 'rgba(255,244,199,.96)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🌟 ${window.label}`, (left + right) / 2, pad.top + 14 + (index % 2) * 15);
      ctx.textAlign = 'start';
    });
}

export function drawWave(ctx, model) {
  const { points, x, y, pad, height } = model;
  const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
  gradient.addColorStop(0, 'rgba(164,222,229,.38)');
  gradient.addColorStop(1, 'rgba(164,222,229,.03)');
  const trace = () => points.forEach((point, index) => {
    const px = x(point.ts);
    const py = y(point.h);
    if (index) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  });
  ctx.beginPath();
  trace();
  ctx.lineTo(x(points.at(-1).ts), height - pad.bottom);
  ctx.lineTo(x(points[0].ts), height - pad.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.beginPath();
  trace();
  ctx.strokeStyle = '#a4dee5';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function interpolateAt(points, timestamp) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const first = points[index];
    const second = points[index + 1];
    if (first.ts <= timestamp && timestamp <= second.ts) {
      const ratio = (timestamp - first.ts) / (second.ts - first.ts || 1);
      return first.h + (second.h - first.h) * ratio;
    }
  }
  return null;
}

export function drawCurrent(ctx, model) {
  if (!model.today || Date.now() < model.minT || Date.now() > model.maxT) return;
  const timestamp = Date.now();
  const heightValue = interpolateAt(model.points, timestamp);
  if (heightValue == null) return;
  const x = model.x(timestamp);
  const y = model.y(heightValue);
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#a4dee5';
  ctx.fill();
  ctx.fillStyle = '#d8f6ff';
  ctx.font = '12px sans-serif';
  ctx.fillText('現在潮位', x - 20, Math.max(model.pad.top + 14, y - 16));
}

export function drawTooltip(ctx, model) {
  const timestamp = state.chartInspectTs;
  if (timestamp == null || timestamp < model.minT || timestamp > model.maxT) return;
  const heightValue = interpolateAt(model.points, timestamp);
  if (heightValue == null) return;
  const x = model.x(timestamp);
  const y = model.y(heightValue);
  const date = new Date(timestamp);
  const lines = [
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    `預估潮高 ${Math.round(heightValue)} cm`
  ];
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, model.pad.top);
  ctx.lineTo(x, model.height - model.pad.bottom);
  ctx.strokeStyle = 'rgba(255,213,106,.9)';
  ctx.stroke();
  ctx.setLineDash([]);
  const width = Math.max(...lines.map(line => ctx.measureText(line).width)) + 24;
  const boxX = Math.min(model.width - width - 6, Math.max(6, x + 12));
  const boxY = Math.max(6, y - 72);
  ctx.fillStyle = 'rgba(7,16,29,.94)';
  ctx.fillRect(boxX, boxY, width, 58);
  ctx.fillStyle = '#fff4c7';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(lines[0], boxX + 12, boxY + 21);
  ctx.fillStyle = '#eef6ff';
  ctx.font = '12px sans-serif';
  ctx.fillText(lines[1], boxX + 12, boxY + 42);
}

export function drawChart() {
  const canvas = document.getElementById('tideCanvas');
  const ctx = canvas.getContext('2d');
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const width = canvas.clientWidth || 900;
  const height = canvas.clientHeight || 380;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const selectedDate = state.selectedDate || todayLocal();
  const today = selectedDate === todayLocal();
  document.getElementById('currentLegend').style.display = today ? 'inline-flex' : 'none';
  const rows = getSelectedRows().filter(row => Number.isFinite(row.aboveLocalMSL));
  const dayRows = rows.filter(row => row.date === selectedDate);
  if (!dayRows.length) {
    ctx.fillStyle = 'rgba(238,246,255,.7)';
    ctx.font = '15px sans-serif';
    ctx.fillText('此日期沒有可繪製的潮位資料', 24, 40);
    return;
  }
  const dayStart = new Date(`${selectedDate}T00:00:00`).getTime();
  const minT = dayStart;
  const maxT = dayStart + 24 * 3600000;
  const firstIndex = rows.findIndex(row => row.date === selectedDate);
  const lastIndex = rows.findLastIndex(row => row.date === selectedDate);
  const visible = [...dayRows];
  if (firstIndex > 0) visible.unshift(rows[firstIndex - 1]);
  if (lastIndex < rows.length - 1) visible.push(rows[lastIndex + 1]);
  const points = interpolateSeries(visible);
  if (points.length < 2) return;
  const narrow = width <= 560;
  const pad = { left: narrow ? 34 : 40, right: narrow ? 10 : 18, top: 20, bottom: narrow ? 42 : 34 };
  const lowRaw = Math.min(...points.map(point => point.h));
  const highRaw = Math.max(...points.map(point => point.h));
  const extra = Math.max((highRaw - lowRaw) * 0.18, 20);
  const lo = lowRaw - extra;
  const hi = highRaw + extra;
  const x = value => pad.left + (value - minT) / (maxT - minT || 1) * (width - pad.left - pad.right);
  const y = value => height - pad.bottom - (value - lo) / (hi - lo || 1) * (height - pad.top - pad.bottom);
  const model = { ctx, width, height, pad, minT, maxT, lo, hi, x, y, points, rows, today, narrow };
  state.chartGeometry = { pad, minT, maxT, width, height };
  if (state.chartInspectTs == null || state.chartInspectTs < minT || state.chartInspectTs > maxT) {
    state.chartInspectTs = today ? Date.now() : minT + 12 * 3600000;
  }
  drawGrid(ctx, model);
  drawAxis(ctx, model);
  ctx.save();
  ctx.beginPath();
  ctx.rect(pad.left, pad.top, width - pad.left - pad.right, height - pad.top - pad.bottom);
  ctx.clip();
  drawGolden(ctx, model);
  drawWave(ctx, model);
  ctx.restore();
  drawCurrent(ctx, model);
  drawTooltip(ctx, model);
}

export function bindChartInspector() {
  const canvas = document.getElementById('tideCanvas');
  const update = clientX => {
    const geometry = state.chartGeometry;
    if (!geometry) return;
    const localX = clientX - canvas.getBoundingClientRect().left;
    const clamped = Math.max(geometry.pad.left, Math.min(geometry.width - geometry.pad.right, localX));
    const ratio = (clamped - geometry.pad.left) / (geometry.width - geometry.pad.left - geometry.pad.right || 1);
    state.chartInspectTs = geometry.minT + ratio * (geometry.maxT - geometry.minT);
    drawChart();
  };
  canvas.addEventListener('pointermove', event => update(event.clientX));
}
