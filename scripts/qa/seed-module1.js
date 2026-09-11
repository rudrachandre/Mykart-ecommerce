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

  // 3. Create realistic products for each category
  const brands = await prisma.brand.findMany();
  if (brands.length === 0) {
    console.error('No brands found. Please ensure basic seeds ran.');
    process.exit(1);
  }

  // Sample electronics data
  const sampleData = [
    { name: 'Ultra HD Smart TV 55"', prefix: 'Vision', price: 45000 },
    { name: 'Wireless Noise-Cancelling Headphones', prefix: 'Audio', price: 12000 },
    { name: 'Pro Gaming Laptop 16GB RAM', prefix: 'Tech', price: 85000 },
    { name: 'Smartphone Pro Max 256GB', prefix: 'Mobile', price: 95000 },
    { name: 'Smartwatch Fitness Tracker', prefix: 'Wear', price: 4500 },
    { name: 'Bluetooth Portable Speaker', prefix: 'Sound', price: 3500 },
    { name: '4K Mirrorless Camera', prefix: 'Optic', price: 110000 },
    { name: 'Mechanical Gaming Keyboard', prefix: 'Click', price: 6500 },
    { name: 'Wireless Ergonomic Mouse', prefix: 'Glide', price: 2500 },
    { name: 'Home Security Camera System', prefix: 'Safe', price: 15000 }
  ];

  for (const category of categories) {
    for (let i = 0; i < 3; i++) { // 3 products per category
      const sample = sampleData[Math.floor(Math.random() * sampleData.length)];
      const brand = brands[Math.floor(Math.random() * brands.length)];
      
      const productName = `${brand.name} ${sample.prefix} ${sample.name}`;
      const productSlug = `${brand.slug}-${sample.prefix.toLowerCase()}-${category.slug}-${i}-${Date.now()}`;
      
      const basePrice = sample.price + Math.floor(Math.random() * 5000);
      const isDiscounted = Math.random() > 0.5;
      const salePrice = isDiscounted ? Math.floor(basePrice * 0.85) : basePrice;

      const product = await prisma.product.create({
        data: {
          name: productName,
          slug: productSlug,
          description: `Experience the finest quality in the ${category.name} category. Featuring advanced technology and premium design by ${brand.name}.`,
          basePrice: basePrice,
          salePrice: salePrice,
          status: 'ACTIVE',
          sellerId: sellerId,
          categoryId: category.id,
          brandId: brand.id,
          averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
          reviewCount: Math.floor(Math.random() * 500),
          images: {
            create: [
              {
                url: `https://loremflickr.com/800/800/${category.slug},electronics?lock=${Math.floor(Math.random() * 10000)}`,
                alt: productName,
                sortOrder: 0
              }
            ]
          },
          variants: {
            create: [
              {
                sku: `SKU-${brand.slug.toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
                inventory: {
                  create: {
                    quantity: Math.floor(Math.random() * 100),
                    reserved: 0
                  }
                }
              }
            ]
          }
        }
      });
      console.log(`Created product: ${product.name} - ₹${product.salePrice}`);
    }
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
