import { ANALYTICS, CACHE } from './config.js';
import { readJson, writeJson } from './utils/storage.js';

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

function setConsent(accepted) {
  writeJson(CACHE.analyticsConsentKey, accepted);
  document.getElementById('analyticsConsent')?.classList.remove('show');
  if (accepted) loadGoogleAnalytics();
  else {
    analyticsEnabled = false;
    window[`ga-disable-${ANALYTICS.measurementId}`] = true;
  }
}

function ensureConsentPanel() {
  let panel = document.getElementById('analyticsConsent');
  if (panel) return panel;
  panel = document.createElement('aside');
  panel.id = 'analyticsConsent';
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', '分析資料設定');
  panel.innerHTML = '<div><strong>協助我們改善潮汐小幫手</strong><p>同意後才會啟用 Google Analytics 匿名使用分析；不會傳送 GPS 座標或 Email。詳情請見 <a href="privacy.html">隱私政策</a>。</p></div><div class="analytics-consent-actions"><button class="btn-secondary" id="declineAnalytics" type="button">暫不使用</button><button class="btn-primary" id="acceptAnalytics" type="button">同意分析</button></div>';
  document.body.append(panel);
  panel.querySelector('#acceptAnalytics').addEventListener('click', () => setConsent(true));
  panel.querySelector('#declineAnalytics').addEventListener('click', () => setConsent(false));
  return panel;
}

export function trackEvent(name, parameters = {}) {
  if (!analyticsEnabled || !/^[a-z][a-z0-9_]{0,39}$/.test(name)) return;
  googleTag('event', name, parameters);
}

export function initAnalytics() {
  const panel = ensureConsentPanel();
  const consent = readJson(CACHE.analyticsConsentKey, null);
  if (consent === true) loadGoogleAnalytics();
  else if (consent === null) panel.classList.add('show');
  document.getElementById('analyticsSettingsBtn')?.addEventListener('click', () => panel.classList.add('show'));
  document.querySelector('.shareyouniq-link')?.addEventListener('click', () => {
    trackEvent('select_promotion', { promotion_name: 'shareyouniq_store' });
  });
}

initAnalytics();
