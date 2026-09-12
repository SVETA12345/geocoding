import { geocodeCity, getWeatherForecast } from '../api/weatherApi.js';
import { getCachedReport, isReportCacheValid } from '../storage/cache.js';

async function getCityWeather(city, days, noCache) {
  if (!noCache && (await isReportCacheValid(city))) {
    const cached = await getCachedReport(city);
    if (cached) {
      if (cached.forecast.length >= days) return cached;
    }
  }
  const location = await geocodeCity(city);
  const forecast = await getWeatherForecast(
    location.latitude,
    location.longitude,
    days,
  );

  return {
    city: location.name,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    forecast,
    cacheHit: false,
  };
}

export async function getWeatherDigest(cities, days, noCache) {
  const promises = cities.map((city) =>
    getCityWeather(city, days, noCache)
      .then((result) => ({ status: 'fulfilled', value: result }))
      .catch((error) => ({ status: 'rejected', reason: error.message })),
  );

  return await Promise.all(promises);
}
