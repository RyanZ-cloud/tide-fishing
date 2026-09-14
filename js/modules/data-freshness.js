import { state } from '../state.js';
import { formatUpdatedAt } from '../utils/date.js';

export function renderFreshness(containerId, valueId, timestamp, cached, maxAge) {
  const container = document.getElementById(containerId);
  const value = document.getElementById(valueId);
  if (!container || !value) return;
  value.textContent = formatUpdatedAt(timestamp);
  const badge = container.querySelector('.freshness-badge');
  const age = timestamp ? Date.now() - timestamp : Infinity;
  let status = 'live';
  let label = '最新資料';
  if (!timestamp) [status, label] = ['missing', '目前無資料'];
  else if (age > maxAge * 3) [status, label] = ['stale', '資料可能過期'];
  else if (cached) [status, label] = ['cached', '已快取資料'];
  container.className = `freshness ${status}`;
  if (badge) badge.textContent = label;
}

export function updateOfflineStatus() {
  const banner = document.getElementById('offlineBanner');
  if (!banner) return;
  const offline = !navigator.onLine;
  banner.classList.toggle('show', offline);
  if (!offline) return;
  const hasCachedData = Boolean(state.tide || state.weather);
  banner.textContent = hasCachedData
    ? '⚠️ 離線模式：目前顯示裝置內已快取資料，請留意下方資料更新時間。'
    : '⚠️ 離線模式：目前無可用資料，恢復網路後請重新載入。';
}
