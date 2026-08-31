import { API } from '../config.js';

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return response.json();
}

export async function fetchSeaForecast(latitude, longitude) {
  const lat = Number(latitude).toFixed(3);
  const lon = Number(longitude).toFixed(3);
  const weather = new URL(API.openMeteo);
  weather.search = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'wind_speed_10m,wind_direction_10m',
    hourly: 'wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    forecast_days: '8', wind_speed_unit: 'kmh', timezone: 'Asia/Taipei'
  });
  const marine = new URL(API.openMeteoMarine);
  marine.search = new URLSearchParams({
    latitude: lat, longitude: lon,
    current: 'wave_height,wave_period',
    hourly: 'wave_height,wave_period', forecast_days: '8', timezone: 'Asia/Taipei'
  });
  const [weatherResult, marineResult] = await Promise.allSettled([
    getJson(weather), getJson(marine)
  ]);
  const weatherPayload = weatherResult.status === 'fulfilled' ? weatherResult.value : {};
  const marinePayload = marineResult.status === 'fulfilled' ? marineResult.value : {};
  const weatherData = weatherPayload.current || {};
  const marineData = marinePayload.current || {};
  if (!Object.keys(weatherData).length && !Object.keys(marineData).length) {
    throw new Error('風浪 API 無可用資料');
  }
  return {
    ts: Date.now(),
    weather: weatherData,
    marine: marineData,
    hourly: {
      time: weatherPayload.hourly?.time || marinePayload.hourly?.time || [],
      windSpeed: weatherPayload.hourly?.wind_speed_10m || [],
      windGusts: weatherPayload.hourly?.wind_gusts_10m || [],
      windDirection: weatherPayload.hourly?.wind_direction_10m || [],
      waveHeight: marinePayload.hourly?.wave_height || [],
      wavePeriod: marinePayload.hourly?.wave_period || []
    }
  };
}
