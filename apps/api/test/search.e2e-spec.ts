import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.mock('meilisearch', () => {
  return {
    Meilisearch: jest.fn().mockImplementation(() => {
      return {
        index: jest.fn().mockReturnValue({
          updateFilterableAttributes: jest.fn(),
          updateSortableAttributes: jest.fn(),
          updateSearchableAttributes: jest.fn(),
          search: jest.fn().mockResolvedValue({
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
          }),
        }),
      };
    }),
  };
});

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

  it('Verifies search endpoint does not expose Meilisearch credentials', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/search?q=test');
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain('masterKey');
    expect(responseString).not.toContain('MEILISEARCH_API_KEY');
  });
});
