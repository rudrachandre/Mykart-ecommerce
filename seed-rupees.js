require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mykart',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding products in Rupees...');

  // 1. Get the seller
  const user = await prisma.user.findUnique({
    where: { email: 'seller@example.com' },
    include: { seller: true }
  });

  if (!user || !user.seller) {
    console.error('Seller account not found (seller@example.com). Cannot seed products.');
    process.exit(1);
  }
  const sellerId = user.seller.id;

  // 2. Get all categories
  const categories = await prisma.category.findMany();
  
  if (categories.length === 0) {
    console.error('No categories found. Cannot seed products.');
    process.exit(1);
  }

  // 3. Create a product in each category
  for (const category of categories) {
    const productName = `Premium ${category.name} Edition (₹)`;
    const productSlug = `premium-${category.slug}-edition-inr-${Date.now()}`;
    
    // Generate random price between 1000 and 150000 Rupees
    const basePrice = Math.floor(Math.random() * (150000 - 1000) + 1000);
    const salePrice = Math.floor(basePrice * 0.9); // 10% discount

    const product = await prisma.product.create({
      data: {
        name: productName,
        slug: productSlug,
        description: `Experience the finest quality in the ${category.name} category. Specifically priced in Indian Rupees.`,
        basePrice: basePrice,
        salePrice: salePrice,
        status: 'ACTIVE',
        sellerId: sellerId,
        categoryId: category.id,
        averageRating: 4.5,
        reviewCount: Math.floor(Math.random() * 50),
        images: {
          create: [
            {
              url: `https://loremflickr.com/800/800/${category.slug}?lock=${Math.floor(Math.random() * 1000)}`,
              alt: productName,
              sortOrder: 0
            }
          ]
        },
        variants: {
          create: [
            {
              sku: `SKU-INR-${category.slug.toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
              inventory: {
                create: {
                  quantity: 100,
                  reserved: 0
                }
              }
            }
          ]
        }
      }
    });

    console.log(`Created product: ${product.name} - ₹${product.basePrice}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
