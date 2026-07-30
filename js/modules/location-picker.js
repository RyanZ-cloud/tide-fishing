import { state } from '../state.js';

const element = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function matchingLocations(keyword = '') {
  const normalized = keyword.trim().toLocaleLowerCase('zh-Hant');
  return [...state.rowsByLocation.keys()]
    .filter(name => !normalized || name.toLocaleLowerCase('zh-Hant').includes(normalized))
    .sort((first, second) => first.localeCompare(second, 'zh-Hant'));
}

function renderList() {
  const names = matchingLocations(element('locationPickerSearch').value);
  const list = element('locationPickerList');
  const empty = element('locationPickerEmpty');
  list.innerHTML = names.map(name => {
    const safeName = escapeHtml(name);
    return `<button class="location-option${name === state.selectedLocation ? ' active' : ''}"
      type="button" data-location="${safeName}" role="option"
      aria-selected="${name === state.selectedLocation}">
      <span>📍</span><strong>${safeName}</strong>
      ${name === state.selectedLocation ? '<small>目前地點</small>' : ''}
    </button>`;
  }).join('');
  empty.hidden = names.length > 0;
}

function closePicker() {
  const dialog = element('locationPicker');
  if (dialog.open) dialog.close();
}

export function renderLocationPicker() {
  if (element('locationPicker')?.open) renderList();
}

export function bindLocationPicker(onSelect) {
  const dialog = element('locationPicker');
  const search = element('locationPickerSearch');

  element('selectedInfo').addEventListener('click', () => {
    if (!state.rowsByLocation.size) return;
    search.value = '';
    renderList();
    dialog.showModal();
    search.focus();
  });

  element('closeLocationPicker').addEventListener('click', closePicker);
  search.addEventListener('input', renderList);
  element('locationPickerList').addEventListener('click', event => {
    const button = event.target.closest('[data-location]');
    if (!button) return;
    onSelect(button.dataset.location);
    closePicker();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closePicker();
  });
}
