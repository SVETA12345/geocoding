import { test, describe, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('getWeatherDigest (параллельная обработка)', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    test('обрабатывает несколько городов параллельно', async () => {
        const { getWeatherDigest } = await import('../src/services/weather.js');

        let callCount = 0;
        globalThis.fetch = mock.fn(async (url) => {
            callCount++;
            const urlStr = url.toString();

            if (urlStr.includes('geocoding')) {
                const name = new URL(urlStr).searchParams.get('name');
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        results: [{
                            name,
                            country: 'Россия',
                            latitude: 55,
                            longitude: 37,
                        }],
                    }),
                };
            }

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

        const results = await getWeatherDigest(['Москва', 'Казань'], 1, true);

        assert.equal(results.length, 2);
        assert.equal(results[0].status, 'fulfilled');
        assert.equal(results[1].status, 'fulfilled');
        assert.equal(callCount, 4);
    });

    test('ошибка одного города не прерывает обработку остальных', async () => {
        const { getWeatherDigest } = await import('../src/services/weather.js');

        globalThis.fetch = mock.fn(async (url) => {
            const urlStr = url.toString();
            const name = new URL(urlStr).searchParams.get('name');

            if (urlStr.includes('geocoding')) {
                if (name === 'ПлохойГород') {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ results: [] }),
                    };
                }
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        results: [{ name, country: 'Россия', latitude: 55, longitude: 37 }],
                    }),
                };
            }

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

        const results = await getWeatherDigest(['Москва', 'ПлохойГород', 'Казань'], 1, true);

        assert.equal(results.length, 3);
        assert.equal(results[0].status, 'fulfilled');
        assert.equal(results[1].status, 'rejected');
        assert.match(results[1].reason, /не найден/);
        assert.equal(results[2].status, 'fulfilled');
    });
});