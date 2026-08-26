import { PrismaClient, Role, ProductStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN
    }
  });
  
  // Create Customer
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { passwordHash, role: Role.CUSTOMER },
    create: {
      email: 'customer@example.com',
      name: 'Customer User',
      passwordHash,
      role: Role.CUSTOMER
    }
  });

  // Create Seller User
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@example.com' },
    update: { passwordHash, role: Role.SELLER },
    create: {
      email: 'seller@example.com',
      name: 'Seller User',
      passwordHash,
      role: Role.SELLER
    }
  });

  // Create Seller Profile
  let seller = await prisma.seller.findUnique({ where: { userId: sellerUser.id } });
  if (!seller) {
    seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'Awesome Electronics',
        slug: 'awesome-electronics',
        description: 'Best electronics store'
      }
    });
  }

  // Create Category
  const category = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices'
    }
  });

  // Additional marketplace categories (top-level, database-driven — the API
  // and storefront render whatever exists here; nothing is hardcoded in UI).
  const extraCategories: Array<{ name: string; slug: string; description: string }> = [
    { name: 'Mobiles', slug: 'mobiles', description: 'Smartphones and tablets' },
    { name: 'Laptops & Computers', slug: 'laptops-computers', description: 'Laptops, desktops and peripherals' },
    { name: 'Fashion', slug: 'fashion', description: 'Apparel, footwear and eyewear' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Furniture, decor and appliances' },
    { name: 'Beauty', slug: 'beauty', description: 'Skincare, cosmetics and grooming' },
    { name: 'Grocery', slug: 'grocery', description: 'Daily essentials and staples' },
    { name: 'Sports', slug: 'sports', description: 'Fitness and outdoor gear' },
    { name: 'Books', slug: 'books', description: 'Fiction, non-fiction and academic' },
    { name: 'Toys', slug: 'toys', description: 'Games, plush and educational kits' },
    { name: 'Accessories', slug: 'accessories', description: 'Watches, bags and everyday carry' },
  ];
  for (const c of extraCategories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description },
      create: c,
    });
  }

  // Create Brand
  const brand = await prisma.brand.upsert({
    where: { slug: 'techcorp' },
    update: {},
    create: {
      name: 'TechCorp',
      slug: 'techcorp'
    }
  });

  // Create Product
  const product = await prisma.product.upsert({
    where: { slug: 'smartphone-x' },
    update: {},
    create: {
      name: 'Smartphone X',
      slug: 'smartphone-x',
      description: 'The latest smartphone',
      basePrice: 999.99,
      status: ProductStatus.ACTIVE,
      sellerId: seller.id,
      categoryId: category.id,
      brandId: brand.id,
      variants: {
        create: [
          {
            sku: 'SMX-128GB-BLK',
            price: 999.99,
            inventory: {
              create: {
                quantity: 50
              }
            }
          },
          {
            sku: 'SMX-256GB-WHT',
            price: 1099.99,
            inventory: {
              create: {
                quantity: 30
              }
            }
          }
        ]
      }
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
