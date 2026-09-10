import { parseArgs } from 'node:util';

function parseCommandLine() {
  const options = {
    city: {
      type: 'string',
      short: 'c',
    },
    days: {
      type: 'string',
      short: 'd',
    },
    'no-cache': {
      type: 'boolean',
      short: 'n',
    },
    help: {
      type: 'boolean',
      short: 'h',
    },
  };

  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options,
      allowPositionals: true,
      strict: true,
    });

    // Show help
    if (values.help) {
      showHelp();
      process.exit(0);
    }

    // Validate --city
    if (!values.city) {
      console.error('❌ Ошибка: параметр --city обязателен');
      console.error('Используйте --help для справки');
      process.exit(1);
    }

    // Parse cities
    const cities = values.city.split(',').map(c => c.trim()).filter(c => c.length > 0);
    if (cities.length === 0) {
      console.error('❌ Ошибка: не указан ни один город');
      process.exit(1);
    }

    // Parse --days
    let days = 3;
    if (values.days) {
      days = parseInt(values.days, 10);
      if (isNaN(days) || days < 1 || days > 7) {
        console.error('❌ Ошибка: параметр --days должен быть числом от 1 до 7');
        process.exit(1);
      }
    }

    return {
      cities,
      days,
      noCache: values['no-cache'] || false,
    };
  } catch (error) {
    console.error('❌ Ошибка разбора аргументов:', error.message);
    console.error('Используйте --help для справки');
    process.exit(1);
  }
}



async function main() {
  try {
    const { cities, days, noCache } = parseCommandLine();

    console.log(`Получение прогноза для: ${cities.join(', ')}`);
    console.log(`Количество дней: ${days}`);
    console.log('---\n');
    const results = await getWeatherDigest(cities, days, noCache);
    let hasErrors = false;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        console.log(formatConsoleOutput(result.value));
        await saveReport(result.value);
      } else {
        hasErrors = true;
        console.error(`${result.reason}`);
      }
    }

    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error(`Непредвиденная ошибка: ${error.message}`);
    process.exit(1);
  }
}


main();