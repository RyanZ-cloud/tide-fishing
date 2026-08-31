import { state } from '../state.js';
import { readJson, writeJson } from '../utils/storage.js';

const STORAGE_KEY = 'tideAssistantFishingJournalV1';
const element = id => document.getElementById(id);
const readEntries = () => readJson(STORAGE_KEY, []).filter(entry => entry?.id);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export function renderFishingJournal() {
  const list = element('journalList');
  const count = element('journalCount');
  if (!list || !count) return;
  const entries = readEntries().sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`));
  count.textContent = `${entries.length} 筆紀錄`;
  if (!entries.length) {
    list.innerHTML = '<div class="journal-empty">還沒有紀錄。下次出發或收竿後，記下當天潮況與漁獲吧。</div>';
    return;
  }
  list.innerHTML = entries.map(entry => `
    <article class="journal-entry">
      <div class="journal-entry-head"><div><time>${escapeHtml(entry.date)}</time><strong>${escapeHtml(entry.location)}</strong></div><button type="button" data-journal-delete="${escapeHtml(entry.id)}" aria-label="刪除此紀錄">刪除</button></div>
      <div class="journal-tags"><span>🐟 ${escapeHtml(entry.fish || '未填魚種')}</span><span>🎣 ${escapeHtml(entry.result || '未填結果')}</span></div>
      ${entry.notes ? `<p>${escapeHtml(entry.notes)}</p>` : ''}
    </article>`).join('');
}

export function bindFishingJournal() {
  const dialog = element('journalDialog');
  const form = element('journalForm');
  element('openJournalBtn')?.addEventListener('click', () => {
    form.reset();
    element('journalDate').value = state.selectedDate;
    element('journalLocation').value = state.selectedLocation;
    dialog.showModal();
  });
  element('closeJournalBtn')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const entries = readEntries();
    entries.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
      createdAt: new Date().toISOString(),
      date: element('journalDate').value,
      location: element('journalLocation').value.trim(),
      fish: element('journalFish').value.trim(),
      result: element('journalResult').value,
      notes: element('journalNotes').value.trim()
    });
    if (writeJson(STORAGE_KEY, entries)) {
      dialog.close();
      renderFishingJournal();
    }
  });
  element('journalList')?.addEventListener('click', event => {
    const button = event.target.closest('[data-journal-delete]');
    if (!button || !confirm('確定刪除這筆釣魚日誌？')) return;
    writeJson(STORAGE_KEY, readEntries().filter(entry => entry.id !== button.dataset.journalDelete));
    renderFishingJournal();
  });
  renderFishingJournal();
}
