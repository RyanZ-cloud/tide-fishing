import { state } from '../state.js';

const canvas = () => document.getElementById('marineTrendCanvas');
const numeric = value => value === null || value === undefined ? Number.NaN : Number(value);

function dayPoints() {
  const hourly = state.weather?.hourly;
  if (!hourly?.time?.length) return [];
  return hourly.time.reduce((points, time, index) => {
    if (time.slice(0, 10) !== state.selectedDate) return points;
    points.push({
      time: time.slice(11, 16),
      wind: numeric(hourly.windSpeed?.[index]),
      gust: numeric(hourly.windGusts?.[index]),
      wave: numeric(hourly.waveHeight?.[index]),
      period: numeric(hourly.wavePeriod?.[index])
    });
    return points;
  }, []);
}

function drawSeries(ctx, values, xAt, yAt, color, width = 2.5) {
  ctx.beginPath();
  let started = false;
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) return;
    const x = xAt(index);
    const y = yAt(value);
    if (!started) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    started = true;
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function renderMarineTrend() {
  const target = canvas();
  const empty = document.getElementById('marineTrendEmpty');
  const dateLabel = document.getElementById('marineTrendDate');
  const points = dayPoints();
  if (!target || !empty) return;
  if (dateLabel) dateLabel.textContent = state.selectedDate ? state.selectedDate.replaceAll('-', '/') : '依所選日期顯示';
  empty.hidden = points.length > 0;
  target.hidden = points.length === 0;
  if (!points.length) {
    empty.textContent = state.weather?.hourly?.time?.length
      ? '所選日期超出逐時海況預報範圍。'
      : '逐時海況載入中…';
    return;
  }

  const rect = target.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(320, rect.width || 900);
  const height = Math.max(250, rect.height || 320);
  target.width = Math.round(width * ratio);
  target.height = Math.round(height * ratio);
  const ctx = target.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const pad = { left: 42, right: 42, top: 22, bottom: 35 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const winds = points.flatMap(point => [point.wind, point.gust]).filter(Number.isFinite);
  const waves = points.map(point => point.wave).filter(Number.isFinite);
  const windMax = Math.max(10, Math.ceil(Math.max(...winds, 10) / 10) * 10);
  const waveMax = Math.max(1, Math.ceil(Math.max(...waves, 1) * 2) / 2);
  const xAt = index => pad.left + (index / Math.max(1, points.length - 1)) * plotWidth;
  const windY = value => pad.top + plotHeight - (value / windMax) * plotHeight;
  const waveY = value => pad.top + plotHeight - (value / waveMax) * plotHeight;

  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textBaseline = 'middle';
  for (let step = 0; step <= 4; step += 1) {
    const y = pad.top + (plotHeight * step) / 4;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.strokeStyle = 'rgba(164,222,229,.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#a8c2c7';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(windMax * (1 - step / 4))}`, pad.left - 7, y);
    ctx.textAlign = 'left';
    ctx.fillText(`${(waveMax * (1 - step / 4)).toFixed(1)}`, width - pad.right + 7, y);
  }

  points.forEach((point, index) => {
    const hour = Number(point.time.slice(0, 2));
    if (hour % 3 !== 0) return;
    const x = xAt(index);
    ctx.fillStyle = '#a8c2c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(point.time.slice(0, 2), x, height - pad.bottom + 9);
  });

  drawSeries(ctx, points.map(point => point.gust), xAt, windY, '#ffb35c', 2);
  drawSeries(ctx, points.map(point => point.wind), xAt, windY, '#a4dee5', 3);
  drawSeries(ctx, points.map(point => point.wave), xAt, waveY, '#70d8b2', 3);
}
