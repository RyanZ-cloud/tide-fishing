import { state } from '../state.js';
import {
  getFavoriteLocations,
  getRecentLocations,
  toggleFavoriteLocation
} from './location-preferences.js';

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

function locationRow(name, favorites) {
  const safeName = escapeHtml(name);
  const active = name === state.selectedLocation;
  const favorite = favorites.has(name);
  return `<div class="location-option-row">
    <button class="location-option${active ? ' active' : ''}"
      type="button" data-location="${safeName}" aria-current="${active ? 'true' : 'false'}">
      <span>📍</span><strong>${safeName}</strong>
      ${active ? '<small>目前地點</small>' : ''}
    </button>
    <button class="location-favorite${favorite ? ' active' : ''}" type="button"
      data-favorite-location="${safeName}" aria-label="${favorite ? '取消收藏' : '收藏'} ${safeName}"
      aria-pressed="${favorite}">${favorite ? '★' : '☆'}</button>
  </div>`;
}

function locationSection(title, names, favorites, className = '') {
  if (!names.length) return '';
  return `<section class="location-group ${className}">
    <h3>${title}</h3>
    ${names.map(name => locationRow(name, favorites)).join('')}
  </section>`;
}

function renderList() {
  const keyword = element('locationPickerSearch').value.trim();
  const names = matchingLocations(keyword);
  const list = element('locationPickerList');
  const empty = element('locationPickerEmpty');
  const available = new Set(state.rowsByLocation.keys());
  const favorites = new Set(getFavoriteLocations().filter(name => available.has(name)));
  if (keyword) {
    list.innerHTML = locationSection('搜尋結果', names, favorites, 'search-results');
  } else {
    const favoriteNames = [...favorites].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    const recentNames = getRecentLocations()
      .filter(name => available.has(name) && !favorites.has(name));
    list.innerHTML = [
      locationSection('★ 收藏站點', favoriteNames, favorites, 'favorite-locations'),
      locationSection('最近使用', recentNames, favorites, 'recent-locations'),
      locationSection('所有潮汐站', names, favorites, 'all-locations')
    ].join('');
  }
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
    const favoriteButton = event.target.closest('[data-favorite-location]');
    if (favoriteButton) {
      toggleFavoriteLocation(favoriteButton.dataset.favoriteLocation);
      renderList();
      return;
    }
    const button = event.target.closest('[data-location]');
    if (!button) return;
    onSelect(button.dataset.location);
    closePicker();
  });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closePicker();
  });
}
