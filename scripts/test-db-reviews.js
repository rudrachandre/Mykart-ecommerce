require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('Testing prisma.review.findMany with PrismaPg adapter...');
    const reviews = await prisma.review.findMany({
      where: { productId: 'cb74f6ab-cba6-4257-bbfd-5ec6949d702f' },
    });
    console.log('SUCCESS! Found reviews:', reviews.length);
  } catch (err) {
    console.error('EXACT DATABASE QUERY ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
