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
  const step = (model.viewHours <= 6 ? 1 : model.viewHours <= 12 ? 2 : 3) * 3600000;
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

export function drawTideEvents(ctx, model) {
  const { rows, minT, maxT, x, y, pad, width } = model;
  const occupied = [];
  model.eventPoints = [];
  rows
    .filter(row => String(row.tideType).includes('潮') && Number.isFinite(row.aboveLocalMSL))
    .map(row => ({ ...row, timestamp: new Date(row.dateTime).getTime() }))
    .filter(row => row.timestamp >= minT && row.timestamp <= maxT)
    .forEach(row => {
      const pointX = x(row.timestamp);
      const pointY = y(row.aboveLocalMSL);
      model.eventPoints.push({ x: pointX, y: pointY, timestamp: row.timestamp, row });
      ctx.beginPath();
      ctx.arc(pointX, pointY, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#2f737c';
      ctx.lineWidth = 2;
      ctx.stroke();
      const nearLeft = pointX < pad.left + 54;
      const nearRight = pointX > width - pad.right - 54;
      ctx.textAlign = nearLeft ? 'left' : (nearRight ? 'right' : 'center');
      const labelX = nearLeft ? pointX + 8 : (nearRight ? pointX - 8 : pointX);
      let labelY = pointY < pad.top + 34 ? pointY + 25 : pointY - 12;
      ctx.font = 'bold 11px sans-serif';
      const label = `${row.time} ${row.tideType}`;
      const textWidth = ctx.measureText(label).width;
      const boxPaddingX = 5;
      const boxHeight = 20;
      const boxX = nearLeft
        ? labelX - boxPaddingX
        : (nearRight ? labelX - textWidth - boxPaddingX : labelX - textWidth / 2 - boxPaddingX);
      let boxY = labelY - 14;
      const boxWidth = textWidth + boxPaddingX * 2;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const overlaps = occupied.some(box => boxX < box.right && boxX + boxWidth > box.left && boxY < box.bottom && boxY + boxHeight > box.top);
        if (!overlaps) break;
        boxY += pointY < pad.top + 80 ? 22 : -22;
        labelY = boxY + 14;
      }
      occupied.push({ left: boxX, right: boxX + boxWidth, top: boxY, bottom: boxY + boxHeight });
      ctx.fillStyle = 'rgba(7,16,29,.90)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, textWidth + boxPaddingX * 2, boxHeight, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(164,222,229,.72)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, labelX, labelY);
    });
  ctx.textAlign = 'start';
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
  ctx.fillStyle = '#e5484d';
  ctx.fill();
  ctx.fillStyle = '#d8f6ff';
  ctx.font = '12px sans-serif';
  const nearEventLabel = model.eventPoints?.some(point => Math.abs(point.x - x) < 64 && Math.abs(point.y - y) < 40);
  const labelY = nearEventLabel ? Math.min(model.height - model.pad.bottom - 8, y + 25) : Math.max(model.pad.top + 14, y - 16);
  ctx.fillText('現在潮位', x - 20, labelY);
}

export function drawTooltip(ctx, model) {
  const timestamp = state.chartPinnedEventTs ?? state.chartInspectTs;
  if (timestamp == null || timestamp < model.minT || timestamp > model.maxT) return;
  const heightValue = interpolateAt(model.points, timestamp);
  if (heightValue == null) return;
  const x = model.x(timestamp);
  const y = model.y(heightValue);
  const date = new Date(timestamp);
  const pinnedRow = state.chartPinnedEventTs == null ? null : model.rows.find(row => new Date(row.dateTime).getTime() === state.chartPinnedEventTs);
  const lines = [
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
    pinnedRow ? `${pinnedRow.tideType}・${Math.round(pinnedRow.aboveLocalMSL)} cm` : `預估潮高 ${Math.round(heightValue)} cm`
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
  const dayEnd = dayStart + 24 * 3600000;
  if (state.chartViewDate !== selectedDate) {
    Object.assign(state, { chartViewDate: selectedDate, chartViewHours: 24, chartViewCenterTs: dayStart + 12 * 3600000, chartPinnedEventTs: null });
    const resetButton = document.getElementById('chartReset');
    if (resetButton) resetButton.textContent = '24 小時';
  }
  const viewHours = Math.max(6, Math.min(24, state.chartViewHours || 24));
  const halfWindow = viewHours * 1800000;
  const center = Math.max(dayStart + halfWindow, Math.min(dayEnd - halfWindow, state.chartViewCenterTs || dayStart + 12 * 3600000));
  state.chartViewCenterTs = center;
  const minT = center - halfWindow;
  const maxT = center + halfWindow;
  const firstIndex = rows.findIndex(row => row.date === selectedDate);
  const lastIndex = rows.findLastIndex(row => row.date === selectedDate);
  const visible = [...dayRows];
  if (firstIndex > 0) visible.unshift(rows[firstIndex - 1]);
  if (lastIndex < rows.length - 1) visible.push(rows[lastIndex + 1]);
  const points = interpolateSeries(visible, { minT, maxT });
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
  const model = { ctx, width, height, pad, minT, maxT, lo, hi, x, y, points, rows, today, narrow, viewHours, dayStart, dayEnd, eventPoints: [] };
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
  drawTideEvents(ctx, model);
  state.chartGeometry = { pad, minT, maxT, width, height, dayStart, dayEnd, eventPoints: model.eventPoints };
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
  let drag = null;
  canvas.addEventListener('pointerdown', event => {
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      moved: false,
      horizontal: false
    };
    canvas.classList.add('is-dragging');
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) {
      if (event.pointerType === 'mouse') update(event.clientX);
      return;
    }
    const delta = event.clientX - drag.lastX;
    const distanceX = Math.abs(event.clientX - drag.startX);
    const distanceY = Math.abs(event.clientY - drag.startY);
    if (distanceX > 5 || distanceY > 5) drag.moved = true;
    if (!drag.horizontal && distanceX > 7 && distanceX > distanceY) drag.horizontal = true;
    if (!drag.horizontal) return;
    if (event.cancelable) event.preventDefault();
    if (state.chartViewHours < 24) {
      const geometry = state.chartGeometry;
      const plotWidth = geometry.width - geometry.pad.left - geometry.pad.right;
      const shift = -delta / plotWidth * (geometry.maxT - geometry.minT);
      const half = (geometry.maxT - geometry.minT) / 2;
      state.chartViewCenterTs = Math.max(geometry.dayStart + half, Math.min(geometry.dayEnd - half, state.chartViewCenterTs + shift));
      drawChart();
    } else {
      update(event.clientX);
    }
    drag.lastX = event.clientX;
  });
  canvas.addEventListener('pointerup', event => {
    if (!drag) return;
    if (!drag.moved) {
      const rect = canvas.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      const nearest = state.chartGeometry?.eventPoints?.map(point => ({ point, distance: Math.hypot(point.x - px, point.y - py) })).sort((a, b) => a.distance - b.distance)[0];
      if (nearest?.distance <= 30) {
        state.chartPinnedEventTs = state.chartPinnedEventTs === nearest.point.timestamp ? null : nearest.point.timestamp;
        state.chartInspectTs = nearest.point.timestamp;
      } else {
        state.chartPinnedEventTs = null;
        update(event.clientX);
      }
      drawChart();
    }
    canvas.releasePointerCapture?.(event.pointerId);
    canvas.classList.remove('is-dragging');
    drag = null;
  });
  const cancelDrag = () => {
    canvas.classList.remove('is-dragging');
    drag = null;
  };
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
  const zoom = hours => {
    state.chartViewHours = hours;
    state.chartPinnedEventTs = null;
    document.getElementById('chartReset').textContent = `${hours} 小時`;
    drawChart();
  };
  document.getElementById('chartZoomIn')?.addEventListener('click', () => zoom(state.chartViewHours > 12 ? 12 : 6));
  document.getElementById('chartZoomOut')?.addEventListener('click', () => zoom(state.chartViewHours < 12 ? 12 : 24));
  document.getElementById('chartReset')?.addEventListener('click', () => zoom(24));
}
