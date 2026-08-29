export function buildShareText() {
  const text = id => document.getElementById(id)?.textContent || '—';
  const place = text('selectedInfo').replace('地點：', '');
  return `🎣 潮汐小幫手｜${place}\n風速：${text('windSpeed')}｜風向：${text('windDirection')}\n浪高：${text('waveHeight')}｜下一波：${text('nextEvent')} ${text('nextEventTime')}\n資料僅供行程參考，出發前請確認官方警特報。`;
}

export async function shareConditions(onStatus) {
  const data = { title: '潮汐小幫手', text: buildShareText(), url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      onStatus('已複製目前海況與網址。');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') onStatus('分享失敗，請直接複製網址。', true);
  }
}
