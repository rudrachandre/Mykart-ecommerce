import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

async function globalSetup() {
  // Load .env from workspace root
  const rootEnvPath = path.resolve(process.cwd(), '../../.env');
  dotenv.config({ path: rootEnvPath });

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in env variables');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Seeding E2E test users...');
    const passwordHash = await bcrypt.hash('password123', 12);

    // 1. Create or update test customer
    const customer = await prisma.user.upsert({
      where: { email: 'test-customer@mykart.com' },
      update: { passwordHash, role: 'CUSTOMER' },
      create: {
        name: 'Test Customer',
        email: 'test-customer@mykart.com',
        passwordHash,
        role: 'CUSTOMER',
      },
    });
    console.log('Test customer seeded:', customer.email);

    // 2. Create or update test seller 1
    const sellerUser1 = await prisma.user.upsert({
      where: { email: 'test-seller@mykart.com' },
      update: { passwordHash, role: 'SELLER' },
      create: {
        name: 'Test Seller',
        email: 'test-seller@mykart.com',
        passwordHash,
        role: 'SELLER',
      },
    });
    const seller1 = await prisma.seller.upsert({
      where: { userId: sellerUser1.id },
      update: { storeName: 'Test Seller Store', slug: 'test-seller-store' },
      create: {
        userId: sellerUser1.id,
        storeName: 'Test Seller Store',
        slug: 'test-seller-store',
        description: 'Test Seller Store description',
      },
    });
    console.log('Test seller 1 seeded:', sellerUser1.email, 'Store:', seller1.storeName);

    // 3. Create or update test seller 2
    const sellerUser2 = await prisma.user.upsert({
      where: { email: 'test-seller2@mykart.com' },
      update: { passwordHash, role: 'SELLER' },
      create: {
        name: 'Test Seller 2',
        email: 'test-seller2@mykart.com',
        passwordHash,
        role: 'SELLER',
      },
    });
    const seller2 = await prisma.seller.upsert({
      where: { userId: sellerUser2.id },
      update: { storeName: 'Test Seller Store 2', slug: 'test-seller-store-2' },
      create: {
        userId: sellerUser2.id,
        storeName: 'Test Seller Store 2',
        slug: 'test-seller-store-2',
        description: 'Test Seller Store 2 description',
      },
    });
    console.log('Test seller 2 seeded:', sellerUser2.email, 'Store:', seller2.storeName);

    // 4. Create or update test admin
    const admin = await prisma.user.upsert({
      where: { email: 'test-admin@mykart.com' },
      update: { passwordHash, role: 'ADMIN' },
      create: {
        name: 'Test Admin',
        email: 'test-admin@mykart.com',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log('Test admin seeded:', admin.email);

    // 5. Ensure we have at least one test category and product
    const category = await prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic gadgets and devices',
      },
    });

    const product = await prisma.product.upsert({
      where: { slug: 'test-laptop' },
      update: {
        basePrice: 50000,
        status: 'ACTIVE',
      },
      create: {
        name: 'Test Laptop',
        slug: 'test-laptop',
        description: 'High performance testing laptop',
        basePrice: 50000,
        categoryId: category.id,
        sellerId: seller1.id,
        status: 'ACTIVE',
      },
    });

    // Create variant and inventory if not present
    let variant = await prisma.productVariant.findFirst({
      where: { productId: product.id },
    });
    if (!variant) {
      variant = await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: 'TEST-LAPTOP-SKU',
          color: 'Silver',
          size: '15-inch',
        },
      });
    }

    await prisma.inventory.upsert({
      where: { variantId: variant.id },
      update: { quantity: 10 },
      create: {
        variantId: variant.id,
        quantity: 10,
      },
    });
    console.log('Test product with variant and inventory seeded.');

    // 6. Ensure we have a test coupon
    await prisma.coupon.upsert({
      where: { code: 'WELCOME10' },
      update: {
        active: true,
        value: 10,
        type: 'PERCENTAGE',
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-12-31'),
        minimumOrder: 100,
      },
      create: {
        code: 'WELCOME10',
        active: true,
        value: 10,
        type: 'PERCENTAGE',
        startDate: new Date('2026-01-01'),
        expiryDate: new Date('2026-12-31'),
        minimumOrder: 100,
      },
    });
    console.log('Test coupon WELCOME10 seeded.');

  } catch (error) {
    console.error('Error during global setup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

export default globalSetup;
