import { ANALYTICS } from './config.js';

let analyticsEnabled = false;
let loadingPromise = null;

function googleTag() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(arguments);
}

function loadGoogleAnalytics() {
  if (loadingPromise || !ANALYTICS.measurementId) return loadingPromise;
  window[`ga-disable-${ANALYTICS.measurementId}`] = false;
  analyticsEnabled = true;
  window.gtag = googleTag;
  googleTag('js', new Date());
  googleTag('config', ANALYTICS.measurementId, {
    transport_type: 'beacon',
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS.measurementId)}`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  }).catch(error => console.warn('Google Analytics 載入失敗', error));
  return loadingPromise;
}

export function trackEvent(name, parameters = {}) {
  if (!analyticsEnabled || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;
  googleTag('event', name, parameters);
}

export function initAnalytics() {
  loadGoogleAnalytics();
  document.querySelector('.shareyouniq-link')?.addEventListener('click', () => {
    trackEvent('select_promotion', { promotion_name: 'shareyouniq_store' });
  });
  document.querySelector('.nexsoar-link')?.addEventListener('click', () => {
    trackEvent('select_promotion', { promotion_name: 'nexsoar_official' });
  });
}

initAnalytics();
