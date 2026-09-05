import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const products = await prisma.product.findMany({
    include: {
      brand: true,
      category: {
        include: {
          parent: true,
        },
      },
      images: true,
    },
  });

  console.log(`Auditing ${products.length} products...\n`);

  for (const p of products) {
    const brandName = p.brand?.name || 'NO_BRAND';
    const catName = p.category?.parent?.name || p.category?.name || 'NO_CAT';
    const subcatName = p.category?.parent ? p.category?.name : 'NO_SUBCAT';
    const img = p.images?.[0]?.url || 'NO_IMAGE';

    console.log(`ID: ${p.id} | Name: "${p.name}" | Brand: "${brandName}" | Category: "${catName}" | Subcat: "${subcatName}" | Image: ${img}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
