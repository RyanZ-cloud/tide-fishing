import { state } from '../state.js';
import { fetchWarningBulletins } from '../api/cwa.js';

const OFFICIAL_WARNING_URL = 'https://www.cwa.gov.tw/V8/C/P/Warning/W26.html';
const arrayify = value => Array.isArray(value) ? value : (value == null ? [] : [value]);
const escapeHtml = value => String(value).replace(/[&<>'"]/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

function collectByKey(node, key, output = []) {
  if (!node || typeof node !== 'object') return output;
  for (const [name, value] of Object.entries(node)) {
    if (name === key) output.push(...arrayify(value));
    collectByKey(value, key, output);
  }
  return output;
}

function parseWarnings(data) {
  const records = [...collectByKey(data, 'record'), ...collectByKey(data, 'dataset')];
  return records.map(dataset => {
    const title = dataset?.datasetInfo?.datasetDescription
      || collectByKey(dataset, 'phenomena')[0]
      || collectByKey(dataset, 'headline')[0]
      || '';
    const locations = collectByKey(dataset, 'locationName').filter(value => typeof value === 'string');
    const descriptions = [
      ...collectByKey(dataset, 'contentText'),
      ...collectByKey(dataset, 'description')
    ].filter(value => typeof value === 'string' && value.trim());
    return { title: String(title).trim(), locations, description: descriptions[0]?.trim() || '' };
  }).filter(item => item.title);
}

function regionName(locationName = '') {
  return locationName.match(/^(.{2,3}[縣市])/)?.[1] || '';
}

export function renderWarnings() {
  const box = document.getElementById('warningContent');
  if (!box) return;
  if (state.warningStatus === 'loading') {
    box.textContent = '正在確認中央氣象署警特報…';
    return;
  }
  if (state.warningStatus === 'error') {
    box.innerHTML = `目前無法取得警特報，請直接查看 <a href="${OFFICIAL_WARNING_URL}" target="_blank" rel="noopener noreferrer">中央氣象署</a>。`;
    return;
  }
  const region = regionName(state.selectedLocation);
  const relevant = state.warnings.filter(item => !item.locations.length || item.locations.some(name => name.includes(region) || region.includes(name)));
  if (!relevant.length) {
    box.innerHTML = `目前未查得${region ? `「${region}」` : '所選地點'}相關警特報。出發前仍請查看 <a href="${OFFICIAL_WARNING_URL}" target="_blank" rel="noopener noreferrer">中央氣象署最新資訊</a>。`;
    return;
  }
  box.innerHTML = relevant.slice(0, 3).map(item => `<article class="warning-item"><strong>⚠️ ${escapeHtml(item.title)}</strong>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</article>`).join('')
    + `<a class="warning-official" href="${OFFICIAL_WARNING_URL}" target="_blank" rel="noopener noreferrer">查看中央氣象署完整警特報 ↗</a>`;
}

export async function loadWarnings() {
  state.warningStatus = 'loading';
  renderWarnings();
  try {
    state.warnings = parseWarnings(await fetchWarningBulletins());
    state.warningStatus = 'ready';
  } catch (error) {
    console.warn('CWA 警特報暫時無法取得', error);
    state.warningStatus = 'error';
  }
  renderWarnings();
}
