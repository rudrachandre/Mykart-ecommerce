import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is missing');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting catalog data correction...');

  // 1. Ensure required Brands exist in DB
  const penguinBrand = await prisma.brand.upsert({
    where: { slug: 'penguin' },
    update: {},
    create: { name: 'Penguin Books', slug: 'penguin' },
  });

  const amulBrand = await prisma.brand.upsert({
    where: { slug: 'amul' },
    update: {},
    create: { name: 'Amul', slug: 'amul' },
  });

  const surfExcelBrand = await prisma.brand.upsert({
    where: { slug: 'surf-excel' },
    update: {},
    create: { name: 'Surf Excel', slug: 'surf-excel' },
  });

  // 2. Fix NCERT Physics Class 12 Part 1
  const ncert = await prisma.product.findFirst({
    where: { name: { contains: 'NCERT Physics Class 12' } },
  });
  if (ncert) {
    await prisma.product.update({
      where: { id: ncert.id },
      data: {
        brandId: penguinBrand.id,
        description: 'Official NCERT Physics textbook for Class 12 students covering mechanics, electromagnetism, and modern physics concepts.',
      },
    });
    // Replace image
    await prisma.productImage.deleteMany({ where: { productId: ncert.id } });
    await prisma.productImage.create({
      data: {
        productId: ncert.id,
        url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800',
        alt: 'NCERT Physics Class 12 Part 1 Book Cover',
      },
    });
    console.log('✓ Fixed NCERT Physics Class 12 Part 1');
  }

  // 3. Fix The Alchemist by Paulo Coelho
  const alchemist = await prisma.product.findFirst({
    where: { name: { contains: 'The Alchemist' } },
  });
  if (alchemist) {
    await prisma.product.update({
      where: { id: alchemist.id },
      data: {
        brandId: penguinBrand.id,
        description: 'An inspirational novel about Santiago, a young Andalusian shepherd who journeys to the pyramids of Egypt in search of treasure.',
      },
    });
    // Replace image
    await prisma.productImage.deleteMany({ where: { productId: alchemist.id } });
    await prisma.productImage.create({
      data: {
        productId: alchemist.id,
        url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
        alt: 'The Alchemist by Paulo Coelho Book Cover',
      },
    });
    console.log('✓ Fixed The Alchemist by Paulo Coelho');
  }

  // 4. Fix Surf Excel Matic Liquid 2L
  const surfExcel = await prisma.product.findFirst({
    where: { name: { contains: 'Surf Excel Matic' } },
  });
  if (surfExcel) {
    await prisma.product.update({
      where: { id: surfExcel.id },
      data: {
        brandId: surfExcelBrand.id,
        description: 'Top-load and front-load liquid detergent designed for tough stain removal in washing machines.',
      },
    });
    // Replace image
    await prisma.productImage.deleteMany({ where: { productId: surfExcel.id } });
    await prisma.productImage.create({
      data: {
        productId: surfExcel.id,
        url: 'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=800',
        alt: 'Surf Excel Matic Liquid Detergent Bottle',
      },
    });
    console.log('✓ Fixed Surf Excel Matic Liquid 2L');
  }

  // 5. Fix Amul Butter 500g
  const amulButter = await prisma.product.findFirst({
    where: { name: { contains: 'Amul Butter' } },
  });
  if (amulButter) {
    await prisma.product.update({
      where: { id: amulButter.id },
      data: {
        brandId: amulBrand.id,
        description: 'Utterly Butterly Delicious pasteurized butter made from pure milk fats.',
      },
    });
    // Replace image
    await prisma.productImage.deleteMany({ where: { productId: amulButter.id } });
    await prisma.productImage.create({
      data: {
        productId: amulButter.id,
        url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800',
        alt: 'Amul Butter 500g Block',
      },
    });
    console.log('✓ Fixed Amul Butter 500g');
  }

  console.log('Catalog data fix complete!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
