import { state } from '../state.js';
import { distanceKm } from '../utils/geo.js';
import { readJson, writeJson } from '../utils/storage.js';

const FAVORITE_KEY = 'tideFavoriteSpots';
const SPOTS = [
  {name:'大武崙澳底漁港',lat:25.1584,lon:121.7062,keyword:'基隆'},
  {name:'外木山漁港',lat:25.1596,lon:121.7285,keyword:'基隆'},
  {name:'萬里漁港',lat:25.1807,lon:121.6891,keyword:'野柳'},
  {name:'野柳漁港',lat:25.2054,lon:121.6918,keyword:'野柳'},
  {name:'水尾漁港',lat:25.2286,lon:121.6397,keyword:'富貴角'},
  {name:'八斗子漁港',lat:25.1425,lon:121.7988,keyword:'基隆'},
  {name:'望海巷漁港',lat:25.1383,lon:121.8059,keyword:'基隆'},
  {name:'深澳漁港',lat:25.1267,lon:121.8188,keyword:'深澳'},
  {name:'鼻頭漁港',lat:25.1194,lon:121.9168,keyword:'鼻頭'},
  {name:'南雅漁港',lat:25.121,lon:121.895,keyword:'南雅'},
  {name:'龍洞漁港',lat:25.1125,lon:121.9189,keyword:'龍洞'},
  {name:'澳底漁港',lat:25.0552,lon:121.9255,keyword:'澳底'},
  {name:'福隆漁港',lat:25.0167,lon:121.9481,keyword:'福隆'}
];

export const getFavoriteSpots = () => readJson(FAVORITE_KEY, []);

export function toggleFavoriteSpot(name) {
  const favorites = new Set(getFavoriteSpots());
  if (favorites.has(name)) favorites.delete(name);
  else favorites.add(name);
  state.favorite = [...favorites];
  writeJson(FAVORITE_KEY, state.favorite);
}

export function renderNearbySpots({ onSelect, onFavorite = () => renderNearbySpots({ onSelect }) }) {
  const box = document.getElementById('nearbySpots');
  const favorites = new Set(getFavoriteSpots());
  const origin = state.userLocation;
  const spots = SPOTS
    .map(spot => ({ ...spot, km: origin ? distanceKm(origin.lat, origin.lon, spot.lat, spot.lon) : null }))
    .sort((a, b) => Number(favorites.has(b.name)) - Number(favorites.has(a.name)) || (a.km ?? 9999) - (b.km ?? 9999))
    .slice(0, 6);
  box.innerHTML = spots.map(spot => `<div class="spot-item">
    <div class="spot-main"><div class="spot-name">${spot.name}</div></div>
    <button class="spot-fav btn-secondary ${favorites.has(spot.name) ? 'active' : ''}" data-fav="${spot.name}" aria-label="收藏 ${spot.name}">${favorites.has(spot.name) ? '★' : '☆'}</button>
    <div class="spot-distance">${spot.km == null ? '北海岸常用點' : `距離 ${spot.km.toFixed(1)} km`}</div>
    <div class="spot-meta">對應 ${spot.keyword} 潮汐站<br>出發前請確認港區與現場管制</div>
    <div class="spot-actions"><button class="spot-action btn-secondary" data-open="${spot.name}">查看潮汐</button><button class="spot-nav btn-secondary" data-nav="${spot.name}">開始導航</button></div>
  </div>`).join('');
  box.querySelectorAll('[data-open]').forEach(button => {
    button.addEventListener('click', () => onSelect(SPOTS.find(spot => spot.name === button.dataset.open)));
  });
  box.querySelectorAll('[data-fav]').forEach(button => {
    button.addEventListener('click', () => {
      toggleFavoriteSpot(button.dataset.fav);
      onFavorite();
    });
  });
  box.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', () => {
      const spot = SPOTS.find(item => item.name === button.dataset.nav);
      if (spot) window.open(`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`, '_blank', 'noopener');
    });
  });
}
