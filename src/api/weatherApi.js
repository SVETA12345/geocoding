import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

require("dotenv").config();
const DEFAULT_TIMEOUT = parseInt(process.env.TIMEOUT, 10);
const GEOCODING_API_URL = process.env.GEOCODING_API_URL;
const WEATHER_API_URL = process.env.WEATHER_API_URL;

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new Error(`Превышен таймаут запроса (${timeout} мс)`);
    }

    if (
      error.cause?.code === "ENOTFOUND" ||
      error.cause?.code === "ECONNREFUSED"
    ) {
      throw new Error("Отсутствует подключение к сети");
    }

    throw error;
  }
}

export async function geocodeCity(city) {
  const url = new URL(GEOCODING_API_URL);
  url.searchParams.append("name", city);
  url.searchParams.append("count", "1");
  url.searchParams.append("language", "ru");
  url.searchParams.append("format", "json");

  let response;
  try {
    response = await fetchWithTimeout(url.toString());
  } catch (error) {
    throw new Error(`Ошибка геокодинга для "${city}": ${error.message}`);
  }

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new Error(
        `Город "${city}" не найден (ошибка клиента ${response.status})`,
      );
    }
    if (response.status >= 500) {
      throw new Error(`Ошибка сервера геокодинга (${response.status})`);
    }
    throw new Error(`Ошибка геокодинга: HTTP ${response.status}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Некорректный JSON от сервера геокодинга");
  }

  if (!data.results || data.results.length === 0) {
    throw new Error(`Город "${city}" не найден`);
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country || "Неизвестная страна",
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function getWeatherForecast(lat, lon, days) {
  const url = new URL(WEATHER_API_URL);
  url.searchParams.append("latitude", lat.toString());
  url.searchParams.append("longitude", lon.toString());
  url.searchParams.append(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_sum",
  );
  url.searchParams.append("forecast_days", days.toString());
  url.searchParams.append("timezone", "auto");

  let response;
  try {
    response = await fetchWithTimeout(url.toString());
  } catch (error) {
    throw new Error(`Ошибка получения прогноза: ${error.message}`);
  }

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new Error(
        `Ошибка клиента при получении прогноза (${response.status})`,
      );
    }
    if (response.status >= 500) {
      throw new Error(`Ошибка сервера прогноза (${response.status})`);
    }
    throw new Error(`Ошибка прогноза: HTTP ${response.status}`);
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Некорректный JSON от сервера прогноза");
  }

  if (!data.daily || !data.daily.time || !data.daily.time.length) {
    throw new Error(
      "Некорректные данные прогноза: отсутствуют ежедневные данные",
    );
  }

  const daily = data.daily;
  const forecast = daily.time.map((date, index) => ({
    date,
    temp_min: daily.temperature_2m_min?.[index] ?? null,
    temp_max: daily.temperature_2m_max?.[index] ?? null,
    precipitation: daily.precipitation_sum?.[index] ?? null,
  }));

  return forecast;
}
