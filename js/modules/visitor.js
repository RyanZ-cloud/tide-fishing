const COUNTER_URL = 'https://counterapi.com/api/fishing.nexsoar.com/view/home?unique=true';

export async function updateVisitorCount() {
  const output = document.getElementById('visitorCount');
  if (!output) return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(COUNTER_URL, {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const value = Number(payload.value);
    if (!Number.isFinite(value)) throw new Error('INVALID_COUNTER_VALUE');
    output.textContent = `${new Intl.NumberFormat('zh-TW').format(value)} 次`;
  } catch (error) {
    console.warn('訪客計數暫時無法取得', error);
    output.textContent = '暫時無法取得';
  } finally {
    window.clearTimeout(timeout);
  }
}
