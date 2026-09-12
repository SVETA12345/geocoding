/**
 * Format weather data for console output
 */
export function formatConsoleOutput(data) {
  const { city, country, latitude, longitude, forecast, cacheHit } = data;

  let output = [];
  output.push(`🌆 ${city} (${country})`);
  output.push(`📍 Координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
  if (cacheHit) {
    output.push('📦 Данные из кэша');
  }
  output.push('');

  // Table header
  output.push('┌────────────┬─────────────┬─────────────┬─────────────────┐');
  output.push('│    Дата    │   Минимум   │   Максимум  │    Осадки (мм)  │');
  output.push('├────────────┼─────────────┼─────────────┼─────────────────┤');

  // Table rows
  for (const day of forecast) {
    const date = day.date;
    const tempMin = day.temp_min !== null ? `${day.temp_min}°C` : '—';
    const tempMax = day.temp_max !== null ? `${day.temp_max}°C` : '—';
    const precip = day.precipitation !== null ? `${day.precipitation}` : '—';

    output.push(
      `│ ${date} │ ${tempMin.padEnd(11)} │ ${tempMax.padEnd(11)} │ ${precip.padEnd(15)} │`,
    );
  }

  output.push('└────────────┴─────────────┴─────────────┴─────────────────┘');
  output.push('');

  return output.join('\n');
}
