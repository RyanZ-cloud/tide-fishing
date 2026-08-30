import { state } from '../state.js';

export function readSharedSelection() {
  const params = new URLSearchParams(location.search);
  return {
    station: params.get('station')?.trim() || '',
    date: params.get('date')?.trim() || ''
  };
}

export function buildShareUrl() {
  const url = new URL(location.href);
  url.search = '';
  if (state.selectedLocation) url.searchParams.set('station', state.selectedLocation);
  if (state.selectedDate) url.searchParams.set('date', state.selectedDate);
  url.hash = 'chartSection';
  return url.toString();
}
