import { state } from '../state.js';
import { getDayRows } from './tide.js';

function factor(label, value, cautionAt, dangerAt, unit, formatter = Math.round) {
  if (value === null) return { severity: 1, text: `${label}：暫無資料` };
  const severity = value >= dangerAt ? 2 : (value >= cautionAt ? 1 : 0);
  return { severity, text: `${label}：${formatter(value)}${unit}` };
}

export function renderSuitability() {
  const badge = document.getElementById('suitabilityBadge');
  const reasons = document.getElementById('suitabilityReasons');
  if (!badge || !reasons) return;
  const { wind = null, wave = null, rain = null } = state.weatherSummary?.dayMax || {};
  const tideRows = getDayRows().filter(row => String(row.tideType).includes('潮'));
  const factors = [
    factor('今日最大風速', wind, 22, 35, ' km/h'),
    factor('今日最大浪高', wave, 1.2, 2, ' m', value => value.toFixed(1)),
    factor('今日最高降雨機率', rain, 40, 70, '%'),
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
