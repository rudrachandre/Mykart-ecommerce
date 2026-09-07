jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn(),
}));

import { getMeilisearchConfig } from './search.service';

describe('getMeilisearchConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null in production when MEILISEARCH_HOST and MEILISEARCH_API_KEY are missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.MEILISEARCH_HOST;
    delete process.env.MEILISEARCH_API_KEY;

    expect(getMeilisearchConfig()).toBeNull();
  });

  it('returns null in production when MEILISEARCH_HOST points to localhost', () => {
    process.env.NODE_ENV = 'production';
    process.env.MEILISEARCH_HOST = 'http://localhost:7700';
    process.env.MEILISEARCH_API_KEY = 'masterKey';

    expect(getMeilisearchConfig()).toBeNull();
  });

  it('returns null in production when MEILISEARCH_HOST points to 127.0.0.1', () => {
    process.env.NODE_ENV = 'production';
    process.env.MEILISEARCH_HOST = 'http://127.0.0.1:7700';
    process.env.MEILISEARCH_API_KEY = 'masterKey';

    expect(getMeilisearchConfig()).toBeNull();
  });

  it('returns valid config in production when remote MEILISEARCH_HOST and API key are set', () => {
    process.env.NODE_ENV = 'production';
    process.env.MEILISEARCH_HOST = 'https://meilisearch.example.com';
    process.env.MEILISEARCH_API_KEY = 'valid-prod-key';

    const config = getMeilisearchConfig();
    expect(config).toEqual({
      host: 'https://meilisearch.example.com',
      apiKey: 'valid-prod-key',
    });
  });

  it('defaults to localhost:7700 in non-production when MEILISEARCH_HOST is missing but API key is set', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MEILISEARCH_HOST;
    process.env.MEILISEARCH_API_KEY = 'dev-key';

    const config = getMeilisearchConfig();
    expect(config).toEqual({
      host: 'http://localhost:7700',
      apiKey: 'dev-key',
    });
  });

  it('returns null in non-production when MEILISEARCH_API_KEY is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.MEILISEARCH_HOST;
    delete process.env.MEILISEARCH_API_KEY;

    expect(getMeilisearchConfig()).toBeNull();
  });
});
