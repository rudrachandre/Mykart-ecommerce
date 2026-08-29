import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

var meilisearchSearchMock: jest.Mock;

jest.mock('meilisearch', () => {
  meilisearchSearchMock = jest.fn().mockResolvedValue({
    hits: [
      {
        id: '1',
        name: 'Test Product',
        slug: 'test-product',
        basePrice: 100,
      },
    ],
    estimatedTotalHits: 1,
    limit: 10,
    offset: 0,
  });

  return {
    Meilisearch: jest.fn().mockImplementation(() => {
      return {
        index: jest.fn().mockReturnValue({
          updateFilterableAttributes: jest.fn(),
          updateSortableAttributes: jest.fn(),
          updateSearchableAttributes: jest.fn(),
          updateDisplayedAttributes: jest.fn(),
          updateRankingRules: jest.fn(),
          updateTypoTolerance: jest.fn(),
          updatePagination: jest.fn(),
          search: meilisearchSearchMock,
        }),
      };
    }),
  };
});

function makeMeilisearchSearchThrow(message: string) {
  meilisearchSearchMock.mockRejectedValueOnce(new Error(message));
}

function makeMeilisearchReturnZeroHits() {
  meilisearchSearchMock.mockResolvedValueOnce({
    hits: [],
    estimatedTotalHits: 0,
    limit: 20,
    offset: 0,
  });
}

describe('SearchController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/search (GET) - Valid query', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body.items).toBeInstanceOf(Array);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Pagination', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?page=2&limit=5')
      .expect(200)
      .expect((res) => {
        expect(res.body.meta.page).toEqual(2);
        expect(res.body.meta.limit).toEqual(5);
      });
  });

  it('/search (GET) - Filtering', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?category=electronics&minPrice=50&maxPrice=500')
      .expect(200);
  });

  it('/search (GET) - Sorting', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?sort=basePrice:asc')
      .expect(200);
  });

  it('/search/autocomplete (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search/autocomplete?q=te')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            products: expect.any(Array),
            categories: expect.any(Array),
            brands: expect.any(Array),
          }),
        );
        expect(Array.isArray(res.body)).toBe(false);
      });
  });

  it('/search/autocomplete (GET) - empty query', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search/autocomplete')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          products: [],
          categories: [],
          brands: [],
        });
      });
  });

  it('/search (GET) - Invalid parameters', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?page=-1')
      .expect(400);
  });

  it('/search (GET) - Max query length', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?q=' + 'a'.repeat(101))
      .expect(400);
  });

  it('/search (GET) - Rating filter', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?rating=4')
      .expect(200);
  });

  it('/search (GET) - On Sale filter', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?onSale=true')
      .expect(200);
  });

  it('/search (GET) - Sorting by reviewCount', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?sort=reviewCount:desc')
      .expect(200);
  });

  it('/search (GET) - Sorting by salePrice', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search?sort=salePrice:asc')
      .expect(200);
  });

  it('Verifies search endpoint does not expose Meilisearch credentials', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/search?q=test');
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain('masterKey');
    expect(responseString).not.toContain('MEILISEARCH_API_KEY');
  });

  it('/search/autocomplete (GET) - missing q', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search/autocomplete')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          products: [],
          categories: [],
          brands: [],
        });
      });
  });

  it('/search/autocomplete (GET) - q > 100 characters', () => {
    return request(app.getHttpServer())
      .get('/api/v1/search/autocomplete?q=' + 'a'.repeat(101))
      .expect(400);
  });

  it('Verifies autocomplete endpoint does not expose Meilisearch credentials', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/search/autocomplete?q=test',
    );
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain('masterKey');
    expect(responseString).not.toContain('MEILISEARCH_API_KEY');
  });

  it('/search (GET) - Meilisearch failure falls back to PostgreSQL', () => {
    makeMeilisearchSearchThrow('Meilisearch connection refused');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
        expect(res.body.meta).toHaveProperty('total');
        expect(res.body.meta).toHaveProperty('page');
        expect(res.body.meta).toHaveProperty('limit');
        expect(res.body.meta).toHaveProperty('totalPages');
      });
  });

  it('/search (GET) - Meilisearch zero hits does not fallback', () => {
    makeMeilisearchReturnZeroHits();
    return request(app.getHttpServer())
      .get('/api/v1/search?q=nonexistentproductxyz123')
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toEqual([]);
        expect(res.body.meta.total).toEqual(0);
      });
  });

  it('/search (GET) - Fallback respects category filter', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&category=electronics')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects brand filter', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&brand=nike')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects price range', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&minPrice=100&maxPrice=500')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects rating filter', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&rating=4')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects onSale filter', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&onSale=true')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects basePrice sorting', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&sort=basePrice:asc')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects rating sorting', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&sort=rating:desc')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects createdAt sorting', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&sort=createdAt:desc')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('meta');
      });
  });

  it('/search (GET) - Fallback respects pagination', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test&page=2&limit=5')
      .expect(200)
      .expect((res) => {
        expect(res.body.meta.page).toEqual(2);
        expect(res.body.meta.limit).toEqual(5);
        expect(res.body.items.length).toBeLessThanOrEqual(5);
      });
  });

  it('/search (GET) - Fallback does not expose inventory quantities', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      .expect(200)
      .expect((res) => {
        const responseString = JSON.stringify(res.body);
        expect(responseString).not.toContain('quantity');
        expect(responseString).not.toContain('reserved');
        expect(responseString).not.toContain('inventory');
      });
  });

  it('/search (GET) - Fallback does not expose credentials or internal data', () => {
    makeMeilisearchSearchThrow('Meilisearch down');
    return request(app.getHttpServer())
      .get('/api/v1/search?q=test')
      .expect(200)
      .expect((res) => {
        const responseString = JSON.stringify(res.body);
        expect(responseString).not.toContain('passwordHash');
        expect(responseString).not.toContain('refreshToken');
        expect(responseString).not.toContain('MEILISEARCH_API_KEY');
        expect(responseString).not.toContain('masterKey');
        expect(responseString).not.toContain('DATABASE_URL');
      });
  });
});
