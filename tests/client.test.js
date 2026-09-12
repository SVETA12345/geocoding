import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { geocodeCity, getWeatherForecast } from '../src/api/weatherApi.js';

describe('geocodeCity', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test('успешно возвращает данные города', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                results: [{
                    name: 'Москва',
                    country: 'Россия',
                    latitude: 55.7558,
                    longitude: 37.6173,
                }],
            }),
        }));

        const result = await geocodeCity('Москва');

        assert.equal(result.name, 'Москва');
        assert.equal(result.country, 'Россия');
        assert.equal(result.latitude, 55.7558);
        assert.equal(result.longitude, 37.6173);
    });

    test('использует "Неизвестная страна", если country отсутствует', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                results: [{
                    name: 'Тест',
                    latitude: 10,
                    longitude: 20,
                }],
            }),
        }));

        const result = await geocodeCity('Тест');
        assert.equal(result.country, 'Неизвестная страна');
    });

    test('корректно формирует URL с query-параметрами', async () => {
        let capturedUrl;
        globalThis.fetch = mock.fn(async (url) => {
            capturedUrl = url;
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    results: [{ name: 'X', latitude: 1, longitude: 2 }],
                }),
            };
        });

        await geocodeCity('Нижний Новгород');

        const parsed = new URL(capturedUrl);
        assert.equal(parsed.searchParams.get('name'), 'Нижний Новгород');
        assert.equal(parsed.searchParams.get('count'), '1');
        assert.equal(parsed.searchParams.get('language'), 'ru');
        assert.equal(parsed.searchParams.get('format'), 'json');
    });

    test('бросает ошибку, если город не найден', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({ results: [] }),
        }));

        await assert.rejects(
            () => geocodeCity('НесуществующийГород12345'),
            /не найден/,
        );
    });

    test('бросает ошибку при отсутствии поля results', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => geocodeCity('Москва'),
            /не найден/,
        );
    });

    test('обрабатывает HTTP 4xx', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: false,
            status: 400,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => geocodeCity('Москва'),
            /ошибка клиента 400/,
        );
    });

    test('обрабатывает HTTP 5xx', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: false,
            status: 503,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => geocodeCity('Москва'),
            /Ошибка сервера геокодинга \(503\)/,
        );
    });

    test('обрабатывает некорректный JSON', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('Unexpected token');
            },
        }));

        await assert.rejects(
            () => geocodeCity('Москва'),
            /Некорректный JSON/,
        );
    });

    test('обрабатывает таймаут (AbortError)', async () => {
        globalThis.fetch = mock.fn(async () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            throw error;
        });

        await assert.rejects(
            () => geocodeCity('Москва'),
            /Превышен таймаут/,
        );
    });

    test('обрабатывает отсутствие сети (ENOTFOUND)', async () => {
        globalThis.fetch = mock.fn(async () => {
            const error = new Error('fetch failed');
            error.cause = { code: 'ENOTFOUND' };
            throw error;
        });

        await assert.rejects(
            () => geocodeCity('Москва'),
            /Отсутствует подключение к сети/,
        );
    });

    test('обрабатывает ECONNREFUSED', async () => {
        globalThis.fetch = mock.fn(async () => {
            const error = new Error('fetch failed');
            error.cause = { code: 'ECONNREFUSED' };
            throw error;
        });

        await assert.rejects(
            () => geocodeCity('Москва'),
            /Отсутствует подключение к сети/,
        );
    });
});

describe('getWeatherForecast', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test('корректно парсит прогноз из ответа API', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                daily: {
                    time: ['2026-09-12', '2026-09-13'],
                    temperature_2m_max: [20.4, 18.3],
                    temperature_2m_min: [12.3, 13.5],
                    precipitation_sum: [0, 0.8],
                },
            }),
        }));

        const forecast = await getWeatherForecast(55.7558, 37.6173, 2);

        assert.equal(forecast.length, 2);
        assert.deepEqual(forecast[0], {
            date: '2026-09-12',
            temp_min: 12.3,
            temp_max: 20.4,
            precipitation: 0,
        });
        assert.deepEqual(forecast[1], {
            date: '2026-09-13',
            temp_min: 13.5,
            temp_max: 18.3,
            precipitation: 0.8,
        });
    });

    test('корректно формирует URL с параметрами', async () => {
        let capturedUrl;
        globalThis.fetch = mock.fn(async (url) => {
            capturedUrl = url;
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    daily: {
                        time: ['2026-09-12'],
                        temperature_2m_max: [20],
                        temperature_2m_min: [10],
                        precipitation_sum: [0],
                    },
                }),
            };
        });

        await getWeatherForecast(55.7558, 37.6173, 3);

        const parsed = new URL(capturedUrl);
        assert.equal(parsed.searchParams.get('latitude'), '55.7558');
        assert.equal(parsed.searchParams.get('longitude'), '37.6173');
        assert.equal(
            parsed.searchParams.get('daily'),
            'temperature_2m_max,temperature_2m_min,precipitation_sum',
        );
        assert.equal(parsed.searchParams.get('forecast_days'), '3');
        assert.equal(parsed.searchParams.get('timezone'), 'auto');
    });

    test('подставляет null для отсутствующих значений', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                daily: {
                    time: ['2026-09-12'],
                    temperature_2m_max: [20],
                    temperature_2m_min: [null],
                    precipitation_sum: [undefined],
                },
            }),
        }));

        const forecast = await getWeatherForecast(55, 37, 1);

        assert.equal(forecast[0].temp_min, null);
        assert.equal(forecast[0].precipitation, null);
    });

    test('бросает ошибку при отсутствии daily', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /отсутствуют ежедневные данные/,
        );
    });

    test('бросает ошибку при пустом массиве time', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({
                daily: { time: [] },
            }),
        }));

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /отсутствуют ежедневные данные/,
        );
    });

    test('обрабатывает HTTP 4xx', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: false,
            status: 422,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /Ошибка клиента при получении прогноза \(422\)/,
        );
    });

    test('обрабатывает HTTP 5xx', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: false,
            status: 500,
            json: async () => ({}),
        }));

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /Ошибка сервера прогноза \(500\)/,
        );
    });

    test('обрабатывает некорректный JSON', async () => {
        globalThis.fetch = mock.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => {
                throw new SyntaxError('Unexpected token');
            },
        }));

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /Некорректный JSON от сервера прогноза/,
        );
    });

    test('обрабатывает таймаут', async () => {
        globalThis.fetch = mock.fn(async () => {
            const error = new Error('Aborted');
            error.name = 'AbortError';
            throw error;
        });

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /Превышен таймаут/,
        );
    });

    test('обрабатывает отсутствие сети', async () => {
        globalThis.fetch = mock.fn(async () => {
            const error = new Error('fetch failed');
            error.cause = { code: 'ENOTFOUND' };
            throw error;
        });

        await assert.rejects(
            () => getWeatherForecast(55, 37, 3),
            /Отсутствует подключение к сети/,
        );
    });
});