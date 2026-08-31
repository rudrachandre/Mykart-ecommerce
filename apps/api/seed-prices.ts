/**
 * seed-prices.ts
 * Idempotent seed: adds salePrice, averageRating/reviewCount, and mobile-accessories category.
 * Safe to run multiple times — all operations use upsert or conditional guards.
 * NO schema changes required.
 */
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL environment variable is required');
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function discountPrice(base: number, pct: number): number {
  return Math.round(base * (1 - pct / 100));
}

const SALE_DISCOUNTS: Record<string, number> = {
  'macbook-pro-16-m3-max': 8,
  'dell-xps-13-plus': 18,
  'hp-spectre-x360': 22,
  'acer-swift-go-14': 30,
  'asus-rog-zephyrus-g14': 15,
  'samsung-galaxy-s24-ultra': 12,
  'apple-iphone-15-pro-max': 7,
  'asus-zenfone-10': 25,
  'apple-ipad-pro-11-m2': 15,
  'apple-watch-ultra-2': 10,
  'sony-wh-1000xm5': 35,
  'jbl-live-pro-2': 40,
  'jbl-flip-6-portable': 28,
  'apple-airpods-max': 20,
  'lg-ultragear-27-gaming': 20,
  'logitech-mx-master-3s': 18,
  'logitech-mx-keys-s': 22,
  'logitech-g-pro-x-superlight': 15,
  'sony-playstation-5-slim': 5,
  'nintendo-switch-oled': 12,
  'elden-ring-ps5': 45,
  'zelda-totk-switch': 38,
  'razer-viper-v3-pro': 30,
  'xbox-wireless-controller': 25,
  'levis-511-slim-fit': 40,
  'nike-air-zoom-pegasus-40': 35,
  'adidas-superstar': 50,
  'puma-velocity-nitro-2': 42,
  'philips-air-fryer-xl': 25,
  'philips-hue-starter-kit': 20,
  'bosch-12-place-dishwasher': 15,
  'atomic-habits-book': 18,
  'pragmatic-programmer-book': 12,
};

const RATINGS: Record<string, { rating: number; count: number }> = {
  'macbook-pro-16-m3-max': { rating: 4.8, count: 1247 },
  'dell-xps-13-plus': { rating: 4.5, count: 834 },
  'hp-spectre-x360': { rating: 4.4, count: 612 },
  'acer-swift-go-14': { rating: 4.2, count: 389 },
  'asus-rog-zephyrus-g14': { rating: 4.6, count: 523 },
  'samsung-galaxy-s24-ultra': { rating: 4.7, count: 2341 },
  'apple-iphone-15-pro-max': { rating: 4.9, count: 4821 },
  'asus-zenfone-10': { rating: 4.1, count: 201 },
  'google-pixel-8-pro': { rating: 4.5, count: 987 },
  'apple-ipad-pro-11-m2': { rating: 4.7, count: 1103 },
  'apple-watch-ultra-2': { rating: 4.6, count: 765 },
  'sony-wh-1000xm5': { rating: 4.8, count: 3201 },
  'jbl-live-pro-2': { rating: 4.3, count: 892 },
  'apple-airpods-max': { rating: 4.5, count: 1432 },
  'jbl-flip-6-portable': { rating: 4.6, count: 2100 },
  'sony-srs-xe300': { rating: 4.2, count: 345 },
  'lg-ultragear-27-gaming': { rating: 4.5, count: 678 },
  'logitech-mx-master-3s': { rating: 4.7, count: 1890 },
  'logitech-mx-keys-s': { rating: 4.6, count: 1204 },
  'logitech-g-pro-x-superlight': { rating: 4.8, count: 1567 },
  'sony-playstation-5-slim': { rating: 4.8, count: 3892 },
  'nintendo-switch-oled': { rating: 4.7, count: 2234 },
  'xbox-series-x-1tb': { rating: 4.6, count: 1876 },
  'elden-ring-ps5': { rating: 4.9, count: 5123 },
  'zelda-totk-switch': { rating: 4.9, count: 4312 },
  'razer-viper-v3-pro': { rating: 4.7, count: 923 },
  'xbox-wireless-controller': { rating: 4.4, count: 1230 },
  'ps5-dualsense-controller': { rating: 4.6, count: 2034 },
  'levis-511-slim-fit': { rating: 4.3, count: 567 },
  'nike-air-zoom-pegasus-40': { rating: 4.5, count: 1234 },
  'adidas-superstar': { rating: 4.4, count: 2109 },
  'puma-velocity-nitro-2': { rating: 4.2, count: 456 },
  'philips-air-fryer-xl': { rating: 4.4, count: 1567 },
  'philips-hue-starter-kit': { rating: 4.3, count: 789 },
  'philips-oneblade-trimmer': { rating: 4.2, count: 1023 },
  'bosch-12-place-dishwasher': { rating: 4.5, count: 234 },
  'canon-eos-r50': { rating: 4.6, count: 412 },
  'atomic-habits-book': { rating: 4.8, count: 6723 },
  'pragmatic-programmer-book': { rating: 4.7, count: 2341 },
  'start-with-why-book': { rating: 4.5, count: 1876 },
  'clean-code-book': { rating: 4.6, count: 3012 },
};

async function main() {
  console.log('Starting price & rating seed...');

  const electronicsParent = await prisma.category.findUnique({ where: { slug: 'electronics' } });
  if (!electronicsParent) throw new Error('Electronics parent category not found');

  const mobileAccCat = await prisma.category.upsert({
    where: { slug: 'mobile-accessories' },
    update: { name: 'Mobile Accessories', parentId: electronicsParent.id },
    create: { name: 'Mobile Accessories', slug: 'mobile-accessories', parentId: electronicsParent.id },
  });
  console.log('mobile-accessories category: ' + mobileAccCat.id);

  const headphoneSlugs = ['sony-wh-1000xm5', 'jbl-live-pro-2', 'apple-airpods-max'];
  for (const slug of headphoneSlugs) {
    const p = await prisma.product.findUnique({ where: { slug } });
    if (p) {
      await prisma.product.update({ where: { slug }, data: { categoryId: mobileAccCat.id } });
      console.log('Assigned ' + slug + ' -> mobile-accessories');
    }
  }

  let updatedPrices = 0;
  for (const [slug, discountPct] of Object.entries(SALE_DISCOUNTS)) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) { console.warn('Not found: ' + slug); continue; }
    const basePrice = Number(product.basePrice);
    const salePrice = discountPrice(basePrice, discountPct);
    await prisma.product.update({ where: { slug }, data: { salePrice } });
    updatedPrices++;
  }
  console.log('Applied salePrice to ' + updatedPrices + ' products');

  let updatedRatings = 0;
  for (const [slug, rd] of Object.entries(RATINGS)) {
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) { console.warn('Not found for rating: ' + slug); continue; }
    await prisma.product.update({ where: { slug }, data: { averageRating: rd.rating, reviewCount: rd.count } });
    updatedRatings++;
  }
  console.log('Applied ratings to ' + updatedRatings + ' products');

  const withSale = await prisma.product.count({ where: { salePrice: { not: null } } });
  const withRating = await prisma.product.count({ where: { averageRating: { gt: 0 } } });
  const inMobileAcc = await prisma.product.count({ where: { categoryId: mobileAccCat.id } });

  console.log('=== Summary ===');
  console.log('Products with salePrice: ' + withSale);
  console.log('Products with averageRating > 0: ' + withRating);
  console.log('Products in mobile-accessories: ' + inMobileAcc);
  console.log('seed-prices completed!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await (prisma as any).$disconnect(); });
