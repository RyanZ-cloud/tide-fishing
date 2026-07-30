export function readJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn('本機資料寫入失敗', error);
    return false;
  }
}

export function readCache(key, maxAge) {
  const entry = readJson(key);
  if (!entry?.ts) return null;
  return { ...entry, fresh: Date.now() - entry.ts <= maxAge };
}

export function writeCache(key, data) {
  return writeJson(key, { ts: Date.now(), data });
}
