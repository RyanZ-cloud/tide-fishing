import { API } from '../config.js';

function parsePayload(text, contentType = '') {
  const value = String(text || '').trim();
  if (contentType.includes('json') || value.startsWith('{') || value.startsWith('[')) {
    return JSON.parse(value);
  }
  const documentNode = new DOMParser().parseFromString(value, 'application/xml');
  if (documentNode.querySelector('parsererror')) throw new Error('XML 解析失敗');
  const convert = node => {
    const children = [...(node.children || [])];
    if (!children.length) return node.textContent?.trim() ?? '';
    const result = {};
    for (const child of children) {
      const key = child.localName || child.nodeName;
      const valueNode = convert(child);
      result[key] = key in result
        ? (Array.isArray(result[key]) ? [...result[key], valueNode] : [result[key], valueNode])
        : valueNode;
    }
    return result;
  };
  return convert(documentNode.documentElement);
}

export async function fetchTideForecast() {
  const url = new URL(API.cwa, window.location.href);
  url.searchParams.set('v', String(Date.now()));
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}：${text.slice(0, 300)}`);
  return { data: parsePayload(text, response.headers.get('content-type') || ''), text };
}
