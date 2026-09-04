import { PrismaClient, Role, ProductStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting marketplace database seed...');

  // 1. Password Hash (MyKart@123 with bcrypt cost 12)
  const passwordHash = await bcrypt.hash('MyKart@123', 12);

  // 2. Seed Test Accounts
  console.log('Seeding test accounts...');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mykart.test' },
    update: { passwordHash, role: Role.ADMIN, emailVerified: true },
    create: {
      email: 'admin@mykart.test',
      name: 'Admin Tester',
      passwordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@mykart.test' },
    update: { passwordHash, role: Role.CUSTOMER, emailVerified: true },
    create: {
      email: 'customer@mykart.test',
      name: 'Customer Tester',
      passwordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
    },
  });

  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@mykart.test' },
    update: { passwordHash, role: Role.SELLER, emailVerified: true },
    create: {
      email: 'seller@mykart.test',
      name: 'Seller Tester',
      passwordHash,
      role: Role.SELLER,
      emailVerified: true,
    },
  });

  const supportUser = await prisma.user.upsert({
    where: { email: 'support@mykart.test' },
    update: { passwordHash, role: Role.SUPPORT, emailVerified: true },
    create: {
      email: 'support@mykart.test',
      name: 'Support Tester',
      passwordHash,
      role: Role.SUPPORT,
      emailVerified: true,
    },
  });

  // Create Seller Profile
  let seller = await prisma.seller.findUnique({ where: { userId: sellerUser.id } });
  if (!seller) {
    seller = await prisma.seller.create({
      data: {
        userId: sellerUser.id,
        storeName: 'MyKart Prime Electronics & Apparel',
        slug: 'mykart-prime-store',
        description: 'Your reliable seller for high-quality electronics, gaming accessories, and fashion.',
        status: 'ACTIVE',
      },
    });
  } else {
    seller = await prisma.seller.update({
      where: { id: seller.id },
      data: { status: 'ACTIVE' },
    });
  }

  // 3. Category Hierarchy
  console.log('Seeding categories...');
  const parentCategories = [
    { name: 'Electronics', slug: 'electronics', description: 'Computers, mobiles and accessories' },
    { name: 'Fashion', slug: 'fashion', description: 'Apparel, shoes and accessories' },
    { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Appliances, decor and cooking utilities' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care', description: 'Cosmetics, skincare and grooming' },
    { name: 'Sports & Fitness', slug: 'sports-fitness', description: 'Gym accessories, cycling and gears' },
    { name: 'Books', slug: 'books', description: 'Fiction, academics and self help' },
    { name: 'Grocery', slug: 'grocery', description: 'Staples, snacks and household essentials' },
    { name: 'Gaming', slug: 'gaming', description: 'Consoles, controller accessories and games' },
  ];

  const parentMap: Record<string, string> = {};
  for (const pc of parentCategories) {
    const dbCat = await prisma.category.upsert({
      where: { slug: pc.slug },
      update: pc,
      create: pc,
    });
    parentMap[pc.name] = dbCat.id;
  }

  const subCategories = [
    // Electronics
    { name: 'Laptops', slug: 'laptops', parentName: 'Electronics' },
    { name: 'Smartphones', slug: 'smartphones', parentName: 'Electronics' },
    { name: 'Tablets', slug: 'tablets', parentName: 'Electronics' },
    { name: 'Smartwatches', slug: 'smartwatches', parentName: 'Electronics' },
    { name: 'Headphones & Earbuds', slug: 'headphones-earbuds', parentName: 'Electronics' },
    { name: 'Cameras', slug: 'cameras', parentName: 'Electronics' },
    { name: 'Computer Accessories', slug: 'computer-accessories', parentName: 'Electronics' },
    { name: 'Monitors', slug: 'monitors', parentName: 'Electronics' },
    { name: 'Keyboards & Mice', slug: 'keyboards-mice', parentName: 'Electronics' },
    { name: 'Speakers', slug: 'speakers', parentName: 'Electronics' },
    { name: 'Mobile Accessories', slug: 'mobile-accessories', parentName: 'Electronics' },

    // Fashion
    { name: "Men's Clothing", slug: 'mens-clothing', parentName: 'Fashion' },
    { name: "Women's Clothing", slug: 'womens-clothing', parentName: 'Fashion' },
    { name: 'Shoes', slug: 'shoes', parentName: 'Fashion' },
    { name: 'Bags', slug: 'bags', parentName: 'Fashion' },
    { name: 'Watches', slug: 'watches', parentName: 'Fashion' },
    { name: 'Accessories', slug: 'accessories', parentName: 'Fashion' },

    // Home & Kitchen
    { name: 'Kitchen Appliances', slug: 'kitchen-appliances', parentName: 'Home & Kitchen' },
    { name: 'Home Appliances', slug: 'home-appliances', parentName: 'Home & Kitchen' },
    { name: 'Furniture', slug: 'furniture', parentName: 'Home & Kitchen' },
    { name: 'Home Decor', slug: 'home-decor', parentName: 'Home & Kitchen' },
    { name: 'Cookware', slug: 'cookware', parentName: 'Home & Kitchen' },
    { name: 'Storage & Organization', slug: 'storage-organization', parentName: 'Home & Kitchen' },

    // Beauty
    { name: 'Skincare', slug: 'skincare', parentName: 'Beauty & Personal Care' },
    { name: 'Hair Care', slug: 'haircare', parentName: 'Beauty & Personal Care' },
    { name: 'Makeup', slug: 'makeup', parentName: 'Beauty & Personal Care' },
    { name: 'Grooming', slug: 'grooming', parentName: 'Beauty & Personal Care' },
    { name: 'Fragrances', slug: 'fragrances', parentName: 'Beauty & Personal Care' },

    // Sports
    { name: 'Fitness Equipment', slug: 'fitness-equipment', parentName: 'Sports & Fitness' },
    { name: 'Sports Shoes', slug: 'sports-shoes', parentName: 'Sports & Fitness' },
    { name: 'Outdoor Sports', slug: 'outdoor-sports', parentName: 'Sports & Fitness' },
    { name: 'Gym Accessories', slug: 'gym-accessories', parentName: 'Sports & Fitness' },
    { name: 'Cycling', slug: 'cycling', parentName: 'Sports & Fitness' },

    // Books
    { name: 'Programming', slug: 'programming', parentName: 'Books' },
    { name: 'Business', slug: 'business', parentName: 'Books' },
    { name: 'Fiction', slug: 'fiction', parentName: 'Books' },
    { name: 'Self Help', slug: 'self-help', parentName: 'Books' },
    { name: 'Academic', slug: 'academic', parentName: 'Books' },

    // Grocery
    { name: 'Snacks', slug: 'snacks', parentName: 'Grocery' },
    { name: 'Beverages', slug: 'beverages', parentName: 'Grocery' },
    { name: 'Packaged Foods', slug: 'packaged-foods', parentName: 'Grocery' },
    { name: 'Household Essentials', slug: 'household-essentials', parentName: 'Grocery' },

    // Gaming
    { name: 'Gaming Laptops', slug: 'gaming-laptops', parentName: 'Gaming' },
    { name: 'Gaming Consoles', slug: 'gaming-consoles', parentName: 'Gaming' },
    { name: 'Games', slug: 'games', parentName: 'Gaming' },
    { name: 'Controllers', slug: 'controllers', parentName: 'Gaming' },
    { name: 'Gaming Accessories', slug: 'gaming-accessories', parentName: 'Gaming' },
  ];

  const catMap: Record<string, string> = {};
  for (const sc of subCategories) {
    const parentId = parentMap[sc.parentName];
    const dbCat = await prisma.category.upsert({
      where: { slug: sc.slug },
      update: { parentId },
      create: { name: sc.name, slug: sc.slug, parentId },
    });
    catMap[sc.slug] = dbCat.id;
  }

  // 4. Brands
  console.log('Seeding brands...');
  const brandsList = [
{ name: 'Apple', slug: 'apple' },
      { name: 'Samsung', slug: 'samsung' },
      { name: 'Sony', slug: 'sony' },
      { name: 'Dell', slug: 'dell' },
      { name: 'HP', slug: 'hp' },
      { name: 'Lenovo', slug: 'lenovo' },
      { name: 'ASUS', slug: 'asus' },
      { name: 'Acer', slug: 'acer' },
      { name: 'Canon', slug: 'canon' },
      { name: 'Nikon', slug: 'nikon' },
      { name: 'Logitech', slug: 'logitech' },
      { name: 'JBL', slug: 'jbl' },
      { name: 'Nike', slug: 'nike' },
      { name: 'Adidas', slug: 'adidas' },
      { name: 'Puma', slug: 'puma' },
      { name: "Levi's", slug: 'levis' },
      { name: 'H&M', slug: 'hm' },
      { name: 'Philips', slug: 'philips' },
      { name: 'Bosch', slug: 'bosch' },
      { name: 'LG', slug: 'lg' },
      { name: 'IKEA', slug: 'ikea' },
      { name: 'Microsoft', slug: 'microsoft' },
      { name: 'Nintendo', slug: 'nintendo' },
      { name: 'Razer', slug: 'razer' },
      { name: 'Google', slug: 'google' },
      { name: 'Decathlon', slug: 'decathlon' },
      { name: 'Coca-Cola', slug: 'coca-cola' },
      { name: 'PepsiCo', slug: 'pepsico' },
      { name: 'Garmin', slug: 'garmin' },
      { name: 'Titan', slug: 'titan' },
      { name: 'Casio', slug: 'casio' },
      { name: 'Prestige', slug: 'prestige' },
      { name: 'Hawkins', slug: 'hawkins' },
      { name: 'Lakme', slug: 'lakme' },
      { name: 'Maybelline', slug: 'maybelline' },
      { name: 'Dove', slug: 'dove' },
      { name: "L'Oreal", slug: 'loreal' },
      { name: 'Minimalist', slug: 'minimalist' },
      { name: 'Fogg', slug: 'fogg' },
      { name: 'Yonex', slug: 'yonex' },
      { name: 'Anker', slug: 'anker' },
      { name: 'Spigen', slug: 'spigen' },
      { name: 'Boat', slug: 'boat' },
      { name: 'OnePlus', slug: 'oneplus' },
      { name: 'realme', slug: 'realme' },
      { name: 'Motorola', slug: 'motorola' },
      { name: 'Ray-Ban', slug: 'rayban' },
      { name: 'MSI', slug: 'msi' },
      { name: 'Penguin', slug: 'penguin' },
  ];

  const brandMap: Record<string, string> = {};
  for (const b of brandsList) {
    const dbBrand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: b,
    });
    brandMap[b.slug] = dbBrand.id;
  }

  // 5. Coupons
  console.log('Seeding coupons...');
  const coupons = [
    { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minimumOrder: 500, active: true },
    { code: 'SAVE500', type: 'FIXED', value: 500, minimumOrder: 3000, active: true },
    { code: 'ELECTRONICS15', type: 'PERCENTAGE', value: 15, minimumOrder: 1500, active: true },
    { code: 'MYKART20', type: 'PERCENTAGE', value: 20, minimumOrder: 1000, active: true },
    { code: 'EXPIRED30', type: 'PERCENTAGE', value: 30, minimumOrder: 100, active: false },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: c,
      create: {
        ...c,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + (c.active ? 30 : -30) * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 6. Realistic Products
  console.log('Seeding products...');
  const rawProducts = [
    // Laptops
    {
      name: 'MacBook Pro 16 M3 Max',
      slug: 'macbook-pro-16-m3-max',
      description: 'The ultimate pro laptop featuring the powerful Apple M3 Max chip, 36GB unified memory, and 1TB SSD.',
      basePrice: 349999,
      catSlug: 'laptops',
      brandSlug: 'apple',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      variants: [
        { sku: 'MBP16-M3MAX-SVR', color: 'Silver', size: '16-inch', price: 349999, stock: 15 },
        { sku: 'MBP16-M3MAX-BLK', color: 'Space Black', size: '16-inch', price: 349999, stock: 12 },
      ],
    },
    {
      name: 'Dell XPS 13 Plus',
      slug: 'dell-xps-13-plus',
      description: 'Stunning premium 13.4-inch OLED display, powered by Intel Core i7 processor with touch bar and borderless keyboard.',
      basePrice: 169990,
      catSlug: 'laptops',
      brandSlug: 'dell',
      imageUrl: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
      variants: [{ sku: 'XPS13-I7-16G', color: 'Platinum', size: '13-inch', price: 169990, stock: 8 }],
    },
    // Smartphones
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Galaxy AI is here. Experience epic photo zoom, built-in S Pen, and Snapdragon 8 Gen 3 computing processor.',
      basePrice: 129999,
      catSlug: 'smartphones',
      brandSlug: 'samsung',
      imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800',
      variants: [
        { sku: 'S24U-256-GRY', color: 'Titanium Gray', size: '256GB', price: 129999, stock: 25 },
        { sku: 'S24U-512-BLK', color: 'Titanium Black', size: '512GB', price: 139999, stock: 20 },
      ],
    },
    {
      name: 'Apple iPhone 15 Pro Max',
      slug: 'apple-iphone-15-pro-max',
      description: 'Forged in titanium. Features the game-changing A17 Pro chip, custom Action button, and 5x optical telephoto camera.',
      basePrice: 159900,
      catSlug: 'smartphones',
      brandSlug: 'apple',
      imageUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
      variants: [
        { sku: 'IP15PM-256-NAT', color: 'Natural Titanium', size: '256GB', price: 159900, stock: 5 }, // Low stock
        { sku: 'IP15PM-512-BLU', color: 'Blue Titanium', size: '512GB', price: 179900, stock: 0 }, // Out of stock
      ],
    },
    // Tablets
    {
      name: 'Apple iPad Pro 11-inch M2',
      slug: 'apple-ipad-pro-11-m2',
      description: 'Incredible performance, superfast wireless connectivity, next-generation Apple Pencil hover experience, and Liquid Retina display.',
      basePrice: 79900,
      catSlug: 'tablets',
      brandSlug: 'apple',
      imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
      variants: [{ sku: 'IPADPRO-11-M2-128', color: 'Space Gray', size: '128GB', price: 79900, stock: 18 }],
    },
    // Smartwatches
    {
      name: 'Apple Watch Ultra 2',
      slug: 'apple-watch-ultra-2',
      description: 'The ultimate sports and adventure watch features a rugged titanium case, up to 72 hours of battery life, and high-precision GPS.',
      basePrice: 89900,
      catSlug: 'smartwatches',
      brandSlug: 'apple',
      imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
      variants: [{ sku: 'AW-ULTRA2-IND', color: 'Orange Loop', size: '49mm', price: 89900, stock: 10 }],
    },
    // Headphones
    {
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5',
      description: 'Industry-leading noise cancellation headphones with custom ambient sound optimization and 30-hour battery life.',
      basePrice: 29990,
      catSlug: 'headphones-earbuds',
      brandSlug: 'sony',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      variants: [
        { sku: 'WH1000XM5-BLK', color: 'Black', size: 'Over-ear', price: 29990, stock: 22 },
        { sku: 'WH1000XM5-SLV', color: 'Silver', size: 'Over-ear', price: 29990, stock: 15 },
      ],
    },
    // Cameras
    {
      name: 'Canon EOS R50 Mirrorless Camera',
      slug: 'canon-eos-r50',
      description: 'Lightweight mirrorless camera featuring high-speed 24.2 MP APS-C sensor, dual pixel CMOS auto-focus and 4K recording.',
      basePrice: 65990,
      catSlug: 'cameras',
      brandSlug: 'canon',
      imageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      variants: [{ sku: 'EOS-R50-KIT', color: 'Black', size: '18-45mm Kit', price: 65990, stock: 6 }],
    },
    // Monitors
    {
      name: 'LG UltraGear 27-inch Gaming Monitor',
      slug: 'lg-ultragear-27-gaming',
      description: 'Fast 165Hz refresh rate with 1ms response time, IPS panel with HDR10 for vibrant colours and fluid gaming controls.',
      basePrice: 22500,
      catSlug: 'monitors',
      brandSlug: 'lg',
      imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800',
      variants: [{ sku: 'LG-UG-27INCH', color: 'Black', size: '27-inch', price: 22500, stock: 2 }], // Low stock
    },
    // Keyboards & Mice
    {
      name: 'Logitech MX Master 3S Mouse',
      slug: 'logitech-mx-master-3s',
      description: 'Ergonomic high-precision workspace mouse featuring quiet clicks, 8K DPI tracking and multi-device connection.',
      basePrice: 10995,
      catSlug: 'keyboards-mice',
      brandSlug: 'logitech',
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
      variants: [{ sku: 'MX-MASTER-3S-GRA', color: 'Graphite', size: 'Standard', price: 10995, stock: 4 }], // Low stock
    },
    // Fashion - Men's Clothing
    {
      name: "Levi's 511 Slim Fit Jeans",
      slug: 'levis-511-slim-fit',
      description: 'Classic American styling with modern slim fit cut, blended cotton stretch fabrics for comfortable day-long wear.',
      basePrice: 3299,
      catSlug: 'mens-clothing',
      brandSlug: 'levis',
      imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
      variants: [
        { sku: 'LVS511-W32-L32', color: 'Indigo Dark', size: '32', price: 3299, stock: 30 },
        { sku: 'LVS511-W34-L32', color: 'Indigo Dark', size: '34', price: 3299, stock: 25 },
      ],
    },
    // Shoes
    {
      name: 'Nike Air Zoom Pegasus 40',
      slug: 'nike-air-zoom-pegasus-40',
      description: 'The runner workhorse. High-responsive Zoom Air pods with comfortable upper fitting for long distance runs.',
      basePrice: 11995,
      catSlug: 'shoes',
      brandSlug: 'nike',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      variants: [
        { sku: 'NK-PEG40-W9', color: 'White/Red', size: 'UK 9', price: 11995, stock: 14 },
        { sku: 'NK-PEG40-W10', color: 'White/Red', size: 'UK 10', price: 11995, stock: 12 },
      ],
    },
    // Bags
    {
      name: 'IKEA Starttid Backpack',
      slug: 'ikea-starttid-backpack',
      description: 'Compact school or work backpack with multiple quick compartments and ergonomic shoulder padding.',
      basePrice: 1499,
      catSlug: 'bags',
      brandSlug: 'ikea',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
      variants: [{ sku: 'IK-STARTTID-BLU', color: 'Ocean Blue', size: '18L', price: 1499, stock: 5 }],
    },
    // Kitchen Appliances
    {
      name: 'Philips Air Fryer XL',
      slug: 'philips-air-fryer-xl',
      description: 'Crispy fried food with up to 90% less fat. Rapid Air circulation system with simple digital preset buttons.',
      basePrice: 15499,
      catSlug: 'kitchen-appliances',
      brandSlug: 'philips',
      imageUrl: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800',
      variants: [{ sku: 'PH-AF-XL-BLK', color: 'Gloss Black', size: '6.2L', price: 15499, stock: 10 }],
    },
    // Books
    {
      name: 'Pragmatic Programmer 20th Anniversary Edition',
      slug: 'pragmatic-programmer-book',
      description: 'One of the most significant programming books. Focuses on code reliability, modular design, and developer career guidelines.',
      basePrice: 899,
      catSlug: 'programming',
      brandSlug: 'samsung', // Books use Samsung as placeholder; no dedicated publisher brand
      imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
      variants: [{ sku: 'BOOK-PRAG-PROG', color: 'Paperback', size: 'Standard', price: 899, stock: 40 }],
    },
    // Gaming Consoles
    {
      name: 'Sony PlayStation 5 Console Slim',
      slug: 'sony-playstation-5-slim',
      description: 'Unleash next-generation gaming speed and 4K ultra-high resolution HDR graphics with the PS5 Slim Digital Edition.',
      basePrice: 44990,
      catSlug: 'gaming-consoles',
      brandSlug: 'sony',
      imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
      variants: [{ sku: 'PS5-SLIM-DIG', color: 'Classic White', size: '1TB SSD', price: 44990, stock: 15 }],
    },
  ];

  // Dynamically generate the remaining 35+ products to hit a total of 55+ realistic products.
  const extraFakes = [
    // ── LAPTOPS ──────────────────────────────────────────────────────────────
    { name: 'HP Spectre x360 14', slug: 'hp-spectre-x360-14', desc: 'Premium 2-in-1 convertible OLED laptop with Intel Core Ultra 7', price: 149900, cat: 'laptops', brand: 'hp', sku: 'HPSP-X360-14-BLK', stock: 10 },
    { name: 'Acer Swift Go 14 OLED', slug: 'acer-swift-go-14', desc: 'Sleek 14-inch OLED ultrabook with AMD Ryzen 7 and 16GB RAM', price: 69990, cat: 'laptops', brand: 'acer', sku: 'ACER-SG14-SLV', stock: 20 },
    { name: 'Lenovo ThinkPad X1 Carbon Gen 12', slug: 'lenovo-thinkpad-x1-carbon-gen12', desc: 'Business-class ultralight carbon fibre laptop with Intel Core Ultra', price: 179900, cat: 'laptops', brand: 'lenovo', sku: 'TP-X1C-G12-BLK', stock: 7 },
    { name: 'ASUS ZenBook 14 OLED', slug: 'asus-zenbook-14-oled', desc: '14-inch OLED display with AMD Ryzen 7 8845HS and 1TB SSD', price: 89990, cat: 'laptops', brand: 'asus', sku: 'ZB14-OLED-SLV', stock: 12 },

    // ── GAMING LAPTOPS ───────────────────────────────────────────────────────
    { name: 'ASUS ROG Strix G16 2024', slug: 'asus-rog-strix-g16', desc: '16-inch QHD 240Hz gaming laptop with RTX 4070 and Ryzen 9', price: 169990, cat: 'gaming-laptops', brand: 'asus', sku: 'ROG-G16-2024', stock: 5 },
    { name: 'MSI Katana 15 RTX 4060', slug: 'msi-katana-15-rtx4060', desc: 'Gaming laptop with Intel Core i7-13th Gen and RTX 4060', price: 89990, cat: 'gaming-laptops', brand: 'asus', sku: 'MSI-KAT15-4060', stock: 8 },
    { name: 'HP OMEN 16 RTX 4070', slug: 'hp-omen-16-rtx4070', desc: 'Performance gaming laptop with WQHD 165Hz display', price: 149999, cat: 'gaming-laptops', brand: 'hp', sku: 'HP-OMEN16-4070', stock: 4 },
    { name: 'Acer Nitro 5 RTX 4060', slug: 'acer-nitro-5-rtx4060', desc: 'Value gaming laptop with FHD 144Hz and Ryzen 7', price: 79990, cat: 'gaming-laptops', brand: 'acer', sku: 'NITRO5-4060-BLK', stock: 15 },

    // ── SMARTPHONES ──────────────────────────────────────────────────────────
    { name: 'Google Pixel 9 Pro', slug: 'google-pixel-9-pro', desc: 'Google AI-powered flagship with Tensor G4 chip and 50MP triple camera', price: 109999, cat: 'smartphones', brand: 'google', sku: 'PIX9P-256-OBS', stock: 12 },
    { name: 'OnePlus 12 5G', slug: 'oneplus-12-5g', desc: '6.82-inch QHD+ display with Snapdragon 8 Gen 3 and Hasselblad cameras', price: 64999, cat: 'smartphones', brand: 'oneplus', sku: 'OP12-256-GRN', stock: 18 },
    { name: 'realme GT 6T 5G', slug: 'realme-gt-6t-5g', desc: 'Snapdragon 7s Gen 3, 5500mAh and 120W SuperVOOC charging', price: 29999, cat: 'smartphones', brand: 'realme', sku: 'REGT6T-128-WHT', stock: 25 },
    { name: 'Motorola Edge 50 Pro', slug: 'motorola-edge-50-pro', desc: '6.7-inch pOLED 144Hz display with 50MP Sony camera and 125W charging', price: 31999, cat: 'smartphones', brand: 'motorola', sku: 'MOTO-E50P-BLK', stock: 14 },
    { name: 'ASUS Zenfone 10', slug: 'asus-zenfone-10', desc: 'Compact 5.9-inch flagship with Snapdragon 8 Gen 2 and 50MP gimbal camera', price: 54990, cat: 'smartphones', brand: 'asus', sku: 'ZF10-WHT-256', stock: 8 },

    // ── TABLETS ──────────────────────────────────────────────────────────────
    { name: 'Samsung Galaxy Tab S9 FE', slug: 'samsung-galaxy-tab-s9-fe', desc: '10.9-inch LCD with S Pen, 8GB RAM, 128GB, IP68 water resistance', price: 44999, cat: 'tablets', brand: 'samsung', sku: 'GTABS9FE-128-GRY', stock: 15 },
    { name: 'Lenovo Tab P12 Pro', slug: 'lenovo-tab-p12-pro', desc: '12.6-inch AMOLED with Snapdragon 870 and optional keyboard cover', price: 54999, cat: 'tablets', brand: 'lenovo', sku: 'LEN-P12PRO-GRY', stock: 8 },
    { name: 'Realme Pad 2', slug: 'realme-pad-2', desc: '11.5-inch LCD with Helio G99 processor, 6GB RAM, 128GB', price: 21999, cat: 'tablets', brand: 'realme', sku: 'RPAD2-128-GRY', stock: 20 },

    // ── SMARTWATCHES ─────────────────────────────────────────────────────────
    { name: 'Samsung Galaxy Watch 7 44mm', slug: 'samsung-galaxy-watch-7-44mm', desc: 'Advanced health tracking with BioActive sensor, sapphire glass and Exynos W1000', price: 32999, cat: 'smartwatches', brand: 'samsung', sku: 'GW7-44-BLK', stock: 20 },
    { name: 'Garmin Forerunner 265', slug: 'garmin-forerunner-265', desc: 'GPS running watch with AMOLED display, race predictor and training load', price: 49999, cat: 'smartwatches', brand: 'garmin', sku: 'GARMIN-FR265-BLK', stock: 8 },
    { name: 'Noise ColorFit Pro 5', slug: 'noise-colorfit-pro-5', desc: 'Noise smartwatch with 1.96-inch AMOLED, BT calling and health suite', price: 4499, cat: 'smartwatches', brand: 'samsung', sku: 'NOISE-CFP5-BLK', stock: 50 },

    // ── CAMERAS ──────────────────────────────────────────────────────────────
    { name: 'Nikon Z50 II Mirrorless Camera', slug: 'nikon-z50-ii', desc: '20.9MP APS-C sensor with 4K UHD video, in-body VR and Z-mount lens system', price: 89995, cat: 'cameras', brand: 'nikon', sku: 'NK-Z50II-KIT', stock: 5 },
    { name: 'Sony Alpha a6700 Mirrorless', slug: 'sony-alpha-a6700', desc: '26MP BSI-CMOS sensor, AI-powered subject recognition and 4K 120fps video', price: 129990, cat: 'cameras', brand: 'sony', sku: 'SONY-A6700-BODY', stock: 4 },
    { name: 'Canon EOS M50 Mark II', slug: 'canon-eos-m50-mark-ii', desc: '24.1MP APS-C mirrorless with Dual Pixel CMOS AF II and 4K video', price: 52990, cat: 'cameras', brand: 'canon', sku: 'EOS-M50MK2-WHT', stock: 7 },

    // ── HEADPHONES & EARBUDS (more) ──────────────────────────────────────────
    { name: 'boAt Rockerz 450 Pro', slug: 'boat-rockerz-450-pro', desc: 'Wireless over-ear headphones with 40mm drivers and 70-hour playback', price: 1299, cat: 'headphones-earbuds', brand: 'boat', sku: 'BOAT-R450P-BLU', stock: 80 },
    { name: 'Boat Airdopes 141', slug: 'boat-airdopes-141', desc: 'True wireless earbuds with BEAST mode 45ms low latency', price: 999, cat: 'headphones-earbuds', brand: 'boat', sku: 'BOAT-AD141-BLK', stock: 100 },

    // ── SPEAKERS ─────────────────────────────────────────────────────────────
    { name: 'JBL Flip 6 Portable Speaker', slug: 'jbl-flip-6-portable', desc: 'IP67 waterproof portable bluetooth speaker with bold JBL Original Pro Sound', price: 9999, cat: 'speakers', brand: 'jbl', sku: 'JBL-FLIP6-RED', stock: 35 },
    { name: 'Sony SRS-XE300 Speaker', slug: 'sony-srs-xe300', desc: 'Wide-spread 360-degree sound with X-Balanced Speaker Unit and IP67 rating', price: 14990, cat: 'speakers', brand: 'sony', sku: 'SRS-XE300-BLK', stock: 12 },
    { name: 'boAt Stone 1200 Speaker', slug: 'boat-stone-1200', desc: '12W portable bluetooth speaker with IPX7 waterproofing and 12-hour battery', price: 2499, cat: 'speakers', brand: 'boat', sku: 'BOAT-STN1200-BLU', stock: 60 },

    // ── MONITORS ─────────────────────────────────────────────────────────────
    { name: 'Samsung 27-inch Odyssey G5 Curved', slug: 'samsung-odyssey-g5-27', desc: '1000R curved 1440p QHD 165Hz gaming monitor with AMD FreeSync Premium', price: 28999, cat: 'monitors', brand: 'samsung', sku: 'SAM-OG5-27-BLK', stock: 8 },
    { name: 'ASUS ProArt Display PA278CV', slug: 'asus-proart-pa278cv', desc: '27-inch 4K IPS professional monitor with 99% Adobe RGB and USB-C 96W', price: 45990, cat: 'monitors', brand: 'asus', sku: 'ASUS-PA278CV', stock: 5 },

    // ── KEYBOARDS & MICE ─────────────────────────────────────────────────────
    { name: 'Logitech MX Keys S Keyboard', slug: 'logitech-mx-keys-s', desc: 'Quiet low-profile tactile typing keyboard with multi-device Bluetooth', price: 12995, cat: 'keyboards-mice', brand: 'logitech', sku: 'MX-KEYS-S-GRY', stock: 15 },
    { name: 'Logitech G Pro X Superlight 2', slug: 'logitech-g-pro-x-superlight-2', desc: 'Ultra-lightweight 60g pro wireless gaming mouse with HERO 2 25K sensor', price: 15995, cat: 'keyboards-mice', brand: 'logitech', sku: 'GPROX-SL2-WHT', stock: 8 },

    // ── MEN'S CLOTHING ───────────────────────────────────────────────────────
    { name: "Levi's 501 Original Jeans", slug: 'levis-501-original', desc: 'The original blue jeans. Straight fit with button fly, 100% cotton', price: 3499, cat: 'mens-clothing', brand: 'levis', sku: 'LVS501-W32-IND', stock: 40 },
    { name: "Levi's Classic Denim Jacket", slug: 'levis-classic-denim-jacket', desc: 'Iconic Trucker Jacket in rigid cotton denim with chest pockets', price: 4999, cat: 'mens-clothing', brand: 'levis', sku: 'LVS-DENIM-JKT', stock: 10 },
    { name: 'H&M Linen Blend Resort Shirt', slug: 'hm-linen-blend-shirt', desc: 'Lightweight relaxed-fit summer resort shirt in linen-cotton blend', price: 1499, cat: 'mens-clothing', brand: 'hm', sku: 'HM-LINEN-SHIRT', stock: 45 },

    // ── WOMEN'S CLOTHING ─────────────────────────────────────────────────────
    { name: 'H&M Oversized Trench Coat', slug: 'hm-oversized-trench-coat', desc: 'Classic double-breasted cotton trench coat in an oversized silhouette', price: 4999, cat: 'womens-clothing', brand: 'hm', sku: 'HM-TRENCH-COAT', stock: 11 },
    { name: 'Adidas Women Tiro Track Pants', slug: 'adidas-women-tiro-track', desc: "Women's slim-fit track pants with iconic 3 stripes and zip pockets", price: 2699, cat: 'womens-clothing', brand: 'adidas', sku: 'AD-WOM-TIRO-BLK', stock: 30 },

    // ── SHOES ────────────────────────────────────────────────────────────────
    { name: 'Adidas Originals Superstar', slug: 'adidas-superstar', desc: 'Iconic shell-toe leather shoes with serrated 3-Stripes in classic white', price: 7999, cat: 'shoes', brand: 'adidas', sku: 'AD-SUPER-WHT', stock: 15 },
    { name: 'Puma Velocity Nitro 2', slug: 'puma-velocity-nitro-2', desc: 'High-cushion responsive road running shoe with NITRO foam midsole', price: 10999, cat: 'shoes', brand: 'puma', sku: 'PM-NITRO2-ORG', stock: 9 },
    { name: 'Adidas Ultraboost 23', slug: 'adidas-ultraboost-23', desc: 'Responsive running shoe with BOOST cushioning and Primeknit+ upper', price: 17999, cat: 'sports-shoes', brand: 'adidas', sku: 'AD-UB23-WHT', stock: 12 },
    { name: 'Nike Air Max 270', slug: 'nike-air-max-270', desc: 'Lifestyle shoe with the tallest Air unit yet for all-day comfort', price: 12495, cat: 'sports-shoes', brand: 'nike', sku: 'NK-AM270-BLK', stock: 18 },

    // ── BAGS ─────────────────────────────────────────────────────────────────
    { name: 'IKEA Starttid Backpack', slug: 'ikea-starttid-backpack', desc: 'Compact school or work backpack with padded laptop compartment', price: 1499, cat: 'bags', brand: 'ikea', sku: 'IK-STARTTID-BLU', stock: 5 },
    { name: 'Adidas Classic 3-Stripes Backpack', slug: 'adidas-classic-3stripes-backpack', desc: 'Everyday 26L backpack with padded shoulder straps and front organiser', price: 2499, cat: 'bags', brand: 'adidas', sku: 'AD-BP-3S-BLK', stock: 20 },

    // ── WATCHES ──────────────────────────────────────────────────────────────
    { name: 'Titan Edge Ceramic Watch', slug: 'titan-edge-ceramic', desc: "World's slimmest ceramic watch with sapphire crystal glass at 5.1mm", price: 24995, cat: 'watches', brand: 'titan', sku: 'TITAN-EDGE-CER-SLV', stock: 6 },
    { name: 'Casio G-Shock GA-2100', slug: 'casio-g-shock-ga2100', desc: 'Carbon Core Guard octagonal bezel G-Shock with shock and water resistance', price: 8995, cat: 'watches', brand: 'casio', sku: 'CASIO-GA2100-BLK', stock: 25 },
    { name: 'Fastrack NXT Smartwatch', slug: 'fastrack-nxt-smartwatch', desc: 'Smart hybrid watch with SpO2, heart rate, 5-day battery and call notifications', price: 3499, cat: 'watches', brand: 'titan', sku: 'FT-NXT-BLK', stock: 40 },

    // ── ACCESSORIES ──────────────────────────────────────────────────────────
    { name: 'Ray-Ban Wayfarer Classic Sunglasses', slug: 'rayban-wayfarer-classic', desc: 'Iconic plastic frame with G-15 polarised lenses for UV400 protection', price: 8990, cat: 'accessories', brand: 'samsung', sku: 'RB-WF-BLK-G15', stock: 10 },
    { name: 'Wildcraft Evo 30L Backpack', slug: 'wildcraft-evo-30l', desc: 'Trekking and adventure 30L backpack with ergonomic torso fit system', price: 1999, cat: 'accessories', brand: 'decathlon', sku: 'WC-EVO30-GRN', stock: 15 },

    // ── HOME APPLIANCES ──────────────────────────────────────────────────────
    { name: 'LG 1.5 Ton 5 Star Inverter AC', slug: 'lg-1-5-ton-5star-inverter-ac', desc: 'Dual Inverter technology with 4-way swing, auto restart and Wi-Fi control', price: 42990, cat: 'home-appliances', brand: 'lg', sku: 'LG-AC15-5S-WHT', stock: 4 },
    { name: 'Samsung 7kg Front Load Washing Machine', slug: 'samsung-7kg-front-load', desc: 'EcoBubble technology with steam wash, AddWash door and quick 15-min cycle', price: 34990, cat: 'home-appliances', brand: 'samsung', sku: 'SAM-WM7-FL-SLV', stock: 6 },

    // ── KITCHEN APPLIANCES ───────────────────────────────────────────────────
    { name: 'Philips Air Fryer XL 6.2L', slug: 'philips-air-fryer-xl', desc: 'Rapid Air technology fries with up to 90% less fat. 1700W with digital display', price: 15499, cat: 'kitchen-appliances', brand: 'philips', sku: 'PH-AF-XL-BLK', stock: 10 },
    { name: 'Prestige Delight Induction Cooktop', slug: 'prestige-delight-induction', desc: '1600W induction with feather touch controls and 7 cooking preset menus', price: 2395, cat: 'kitchen-appliances', brand: 'prestige', sku: 'PRES-IND-2100', stock: 30 },
    { name: 'Bosch 800W Cordless Drill', slug: 'bosch-800w-cordless-drill', desc: 'Professional cordless drill with 13mm keyless chuck and 2 speed gearbox', price: 7999, cat: 'kitchen-appliances', brand: 'bosch', sku: 'BOSCH-GSB-185-LI', stock: 12 },

    // ── COOKWARE ─────────────────────────────────────────────────────────────
    { name: 'Hawkins Contura Pressure Cooker 5L', slug: 'hawkins-contura-5l', desc: 'All-in-one pressure cooker with inner lid design, 5L capacity', price: 2599, cat: 'cookware', brand: 'hawkins', sku: 'HAWK-CTR5-SLV', stock: 25 },
    { name: 'Prestige Omega Select Plus Kadai 3L', slug: 'prestige-omega-kadai-3l', desc: 'Non-stick hard anodised kadai with glass lid, induction-compatible', price: 1899, cat: 'cookware', brand: 'prestige', sku: 'PRES-KADAI-3L', stock: 30 },
    { name: 'Borosil Vision Glass Casserole Set', slug: 'borosil-vision-casserole-set', desc: 'Borosilicate glass 3-piece casserole set, microwave and dishwasher safe', price: 999, cat: 'cookware', brand: 'bosch', sku: 'BORS-VGC-3P', stock: 20 },

    // ── FURNITURE ────────────────────────────────────────────────────────────
    { name: 'IKEA Poäng Armchair', slug: 'ikea-poang-armchair', desc: 'Classic layer-glued bent birch frame lounge chair with comfortable cushion', price: 8999, cat: 'furniture', brand: 'ikea', sku: 'IK-POANG-CHAIR', stock: 14 },
    { name: 'IKEA KALLAX Shelf Unit 4x2', slug: 'ikea-kallax-4x2-shelf', desc: 'Versatile shelf unit that can be used as a room divider or TV bench', price: 14999, cat: 'furniture', brand: 'ikea', sku: 'IK-KALLAX-4X2-WHT', stock: 10 },

    // ── HOME DECOR ───────────────────────────────────────────────────────────
    { name: 'Philips Hue White & Colour Starter Kit', slug: 'philips-hue-starter-kit', desc: 'Starter pack with 2 smart E27 bulbs, Hue Bridge and dimmer switch', price: 11499, cat: 'home-decor', brand: 'philips', sku: 'PH-HUE-KIT', stock: 7 },
    { name: 'IKEA RIBBA Frame Set of 3', slug: 'ikea-ribba-frame-set', desc: 'Classic portrait or landscape photo frames in black with mat board', price: 1299, cat: 'home-decor', brand: 'ikea', sku: 'IK-RIBBA-3P-BLK', stock: 30 },

    // ── STORAGE & ORGANISATION ───────────────────────────────────────────────
    { name: 'IKEA SKUBB Storage Box Set of 6', slug: 'ikea-skubb-storage-box-6', desc: 'Wardrobe organisation boxes with label holder, set of 6 in white', price: 799, cat: 'storage-organization', brand: 'ikea', sku: 'IK-SKUBB-6P-WHT', stock: 50 },
    { name: 'Amazon Basics Vacuum Storage Bags 8pk', slug: 'amazbasics-vacuum-storage-8pk', desc: 'Airtight waterproof vacuum compression bags for clothes and bedding', price: 799, cat: 'storage-organization', brand: 'samsung', sku: 'AMZ-VACBAG-8PK', stock: 80 },

    // ── SKINCARE ─────────────────────────────────────────────────────────────
    { name: 'Minimalist 10% Niacinamide Serum', slug: 'minimalist-10-niacinamide-serum', desc: 'Oil control and pore-minimising serum with 10% niacinamide + zinc', price: 599, cat: 'skincare', brand: 'minimalist', sku: 'MIN-NIA10-30ML', stock: 100 },
    { name: "Dot & Key Vitamin C + E Serum", slug: 'dot-key-vitamin-c-serum', desc: 'Brightening face serum with 15% Vitamin C and 1% Vitamin E', price: 799, cat: 'skincare', brand: 'minimalist', sku: 'DK-VCE-30ML', stock: 60 },
    { name: 'Cetaphil Moisturising Lotion 500ml', slug: 'cetaphil-moisturising-lotion-500ml', desc: 'Dermatologist-recommended daily moisturiser for all skin types', price: 649, cat: 'skincare', brand: 'dove', sku: 'CETA-MOI-500ML', stock: 80 },
    { name: "Lakme 9 to 5 Primer + Matte Lip Color", slug: 'lakme-9to5-lip-color', desc: 'Long-stay lip color with built-in primer for 16-hour matte finish', price: 399, cat: 'skincare', brand: 'lakme', sku: 'LK-9T5-LIP-RED', stock: 70 },

    // ── HAIR CARE ─────────────────────────────────────────────────────────────
    { name: "Dove Intense Repair Shampoo 1L", slug: 'dove-intense-repair-shampoo-1l', desc: 'Repairs damaged hair with Keratin Actives formula, 1-litre economy bottle', price: 399, cat: 'haircare', brand: 'dove', sku: 'DOVE-IRS-1L', stock: 80 },
    { name: "L'Oreal Extraordinary Oil Serum 100ml", slug: 'loreal-extraordinary-oil-serum', desc: '8-precious oil blend serum for silky, shiny and frizz-free hair', price: 649, cat: 'haircare', brand: 'loreal', sku: 'LOR-EOS-100ML', stock: 60 },
    { name: 'Biotique Bio Kelp Protein Shampoo', slug: 'biotique-bio-kelp-shampoo', desc: 'Ayurvedic anti-hair fall shampoo with sea kelp and protein complex', price: 299, cat: 'haircare', brand: 'dove', sku: 'BIO-KELP-700ML', stock: 90 },

    // ── MAKEUP ───────────────────────────────────────────────────────────────
    { name: 'Lakme Absolute Skin Natural Foundation', slug: 'lakme-absolute-skin-natural-foundation', desc: 'Skin-natural finish foundation with SPF 8 and 12-hour coverage', price: 849, cat: 'makeup', brand: 'lakme', sku: 'LK-ABS-FNDN-W100', stock: 60 },
    { name: 'Maybelline Fit Me Matte + Poreless Foundation', slug: 'maybelline-fit-me-foundation', desc: 'Blurs pores and controls shine for a natural matte finish', price: 475, cat: 'makeup', brand: 'maybelline', sku: 'MYBL-FITME-N120', stock: 80 },
    { name: 'Maybelline Sky High Mascara', slug: 'maybelline-sky-high-mascara', desc: 'Washable volumizing mascara with flexible fibre brush for lifted lashes', price: 449, cat: 'makeup', brand: 'maybelline', sku: 'MYBL-SKYH-BLK', stock: 75 },

    // ── FRAGRANCES ───────────────────────────────────────────────────────────
    { name: 'Fogg Fresh Acqua Body Spray 150ml', slug: 'fogg-fresh-acqua-150ml', desc: 'Refreshing aquatic fragrance body spray for men with no-gas formula', price: 249, cat: 'fragrances', brand: 'fogg', sku: 'FOGG-ACQUA-150ML', stock: 120 },
    { name: 'Park Avenue Cool Blue Perfume 50ml', slug: 'park-avenue-cool-blue-50ml', desc: 'Long-lasting aqua-fresh scent with citrus and musk top notes', price: 399, cat: 'fragrances', brand: 'fogg', sku: 'PA-COOLBLUE-50ML', stock: 80 },
    { name: 'Engage W1 Perfume for Women 90ml', slug: 'engage-w1-women-90ml', desc: 'Floral woody fragrance with rose, jasmine and sandalwood notes', price: 499, cat: 'fragrances', brand: 'fogg', sku: 'ENG-W1-90ML', stock: 60 },

    // ── GROOMING ─────────────────────────────────────────────────────────────
    { name: 'Philips OneBlade QP2730 Trimmer', slug: 'philips-oneblade-trimmer', desc: 'Hybrid electric trimmer and shaver — trim, edge and shave any length', price: 2199, cat: 'grooming', brand: 'philips', sku: 'PH-ONEBLADE-QP27', stock: 50 },
    { name: 'Beardo Beard & Hair Growth Oil 50ml', slug: 'beardo-beard-growth-oil-50ml', desc: 'Biotin-enriched beard oil with argan and jojoba for thick beard growth', price: 399, cat: 'grooming', brand: 'minimalist', sku: 'BEARD-GRW-50ML', stock: 60 },
    { name: 'Gillette Fusion ProGlide Razor + 4 Blades', slug: 'gillette-fusion-proglide', desc: '5-blade comfort with Precision Trimmer and micro-comb for closer shave', price: 699, cat: 'grooming', brand: 'dove', sku: 'GILL-FPG-4BL', stock: 40 },

    // ── FITNESS EQUIPMENT ────────────────────────────────────────────────────
    { name: 'Strauss Adjustable Dumbbell Set 10kg', slug: 'strauss-adjustable-dumbbell-10kg', desc: 'PVC-coated adjustable dumbbell pair with weight plates, 10kg set', price: 1299, cat: 'fitness-equipment', brand: 'decathlon', sku: 'STR-DB-10KG', stock: 30 },
    { name: 'Boldfit Pull Up Bar Wall-Mounted', slug: 'boldfit-pull-up-bar', desc: 'Heavy-duty wall-mounted pull-up and chin-up bar, holds up to 120kg', price: 1799, cat: 'fitness-equipment', brand: 'decathlon', sku: 'BLD-PUBAR-BLK', stock: 20 },
    { name: 'Decathlon Corength Yoga Mat 8mm', slug: 'decathlon-yoga-mat-8mm', desc: 'Anti-slip 8mm cushioned yoga mat with carry strap and TPE material', price: 999, cat: 'fitness-equipment', brand: 'decathlon', sku: 'DEC-YOGA-8MM-PRP', stock: 50 },
    { name: 'Decathlon Domyos Cross Trainer 520', slug: 'decathlon-cross-trainer-520', desc: 'Compact elliptical cross-trainer with 6 resistance levels and LCD display', price: 18999, cat: 'fitness-equipment', brand: 'decathlon', sku: 'DEC-CT520-GRY', stock: 5 },

    // ── GYM ACCESSORIES ──────────────────────────────────────────────────────
    { name: 'Razer Tactical Pro Backpack V2', slug: 'razer-tactical-backpack-v2', desc: 'Ultra-durable 15.6-inch laptop gaming and esports travel backpack', price: 12999, cat: 'gym-accessories', brand: 'razer', sku: 'RZ-TACTICAL-BP', stock: 6 },
    { name: 'Nike Dri-FIT Resistance Band Set', slug: 'nike-dri-fit-resistance-band', desc: 'Set of 3 resistance bands for strength training and mobility work', price: 1295, cat: 'gym-accessories', brand: 'nike', sku: 'NK-RESBND-3P', stock: 35 },
    { name: 'Decathlon Protein Shaker Bottle 700ml', slug: 'decathlon-protein-shaker-700ml', desc: 'BPA-free leak-proof shaker with mixing ball, 700ml capacity', price: 299, cat: 'gym-accessories', brand: 'decathlon', sku: 'DEC-SHAKER-700ML', stock: 80 },

    // ── CYCLING ──────────────────────────────────────────────────────────────
    { name: 'Decathlon Triban RC120 Road Bike', slug: 'decathlon-triban-rc120', desc: 'Entry-level road bike with disc brakes, Shimano 7-speed drivetrain', price: 39999, cat: 'cycling', brand: 'decathlon', sku: 'DEC-TRIBAN-RC120', stock: 2 },
    { name: 'Decathlon BTwin 500 Mountain Bike', slug: 'decathlon-btwin-500-mtb', desc: '27.5-inch hardtail MTB with mechanical disc brakes and Shimano 21-speed', price: 22999, cat: 'cycling', brand: 'decathlon', sku: 'DEC-BTWIN500-BLK', stock: 4 },
    { name: 'Decathlon Cycling Helmet 500', slug: 'decathlon-cycling-helmet-500', desc: 'In-mould road cycling helmet with 20 ventilation slots and adjustable fit', price: 1999, cat: 'cycling', brand: 'decathlon', sku: 'DEC-HELM-500-BLK', stock: 20 },

    // ── OUTDOOR SPORTS ───────────────────────────────────────────────────────
    { name: 'Yonex Arcsaber 11 Pro Badminton Racket', slug: 'yonex-arcsaber-11-pro', desc: 'ISOMETRIC frame with Arc-Saber technology, shaft stiffness: stiff', price: 12999, cat: 'outdoor-sports', brand: 'yonex', sku: 'YNX-ARC11P-GRY', stock: 8 },
    { name: 'Decathlon Perfly BG 530 Badminton Set', slug: 'decathlon-perfly-bg530-set', desc: '2-racket beginner badminton set with 3 shuttlecocks and carry bag', price: 799, cat: 'outdoor-sports', brand: 'decathlon', sku: 'DEC-PERFLY-530', stock: 25 },
    { name: 'Cosco Cricket Bat Kashmir Willow', slug: 'cosco-cricket-bat-kashmir', desc: 'Full-size Kashmir willow cricket bat with cane handle, pre-knocked', price: 1499, cat: 'outdoor-sports', brand: 'decathlon', sku: 'COSCO-KW-BAT-FS', stock: 20 },
    { name: 'Nivia Premier Rubber Football Size 5', slug: 'nivia-premier-rubber-football', desc: 'Official size 5 rubber football for training and match play', price: 699, cat: 'outdoor-sports', brand: 'decathlon', sku: 'NIVIA-FB-SZ5', stock: 30 },

    // ── GAMING CONSOLES ──────────────────────────────────────────────────────
    { name: 'Nintendo Switch OLED Model', slug: 'nintendo-switch-oled', desc: '7-inch OLED screen portable console with Joy-Con controllers and kickstand', price: 31990, cat: 'gaming-consoles', brand: 'nintendo', sku: 'NIN-SWITCH-OLED', stock: 12 },
    { name: 'Microsoft Xbox Series X 1TB', slug: 'xbox-series-x-1tb', desc: '12 teraflops of processing power with 1TB NVMe SSD and 120fps gaming', price: 54990, cat: 'gaming-consoles', brand: 'microsoft', sku: 'MS-XBOX-SX-1TB', stock: 11 },

    // ── GAMES ────────────────────────────────────────────────────────────────
    { name: 'Elden Ring PS5 Edition', slug: 'elden-ring-ps5', desc: 'FromSoftware open-world action RPG. Published by Bandai Namco', price: 3499, cat: 'games', brand: 'sony', sku: 'GAME-ELDEN-PS5', stock: 30 },
    { name: 'The Legend of Zelda: Tears of the Kingdom', slug: 'zelda-totk-switch', desc: 'Nintendo open-world sequel. Explore the skies and depths of Hyrule', price: 4299, cat: 'games', brand: 'nintendo', sku: 'GAME-ZELDA-TOTK', stock: 15 },
    { name: "Marvel's Spider-Man 2 PS5", slug: 'spiderman-2-ps5', desc: 'Swing across a bigger New York as Peter Parker and Miles Morales', price: 4499, cat: 'games', brand: 'sony', sku: 'GAME-SM2-PS5', stock: 20 },
    { name: 'FIFA 24 PS5 / Xbox', slug: 'fifa-24-ps5', desc: 'EA Sports FC 24 with HyperMotion V technology and updated squads', price: 3499, cat: 'games', brand: 'microsoft', sku: 'GAME-FIFA24-PS5', stock: 25 },

    // ── CONTROLLERS ──────────────────────────────────────────────────────────
    { name: 'Xbox Wireless Controller Carbon Black', slug: 'xbox-wireless-controller', desc: 'Ergonomic Xbox controller with textured grip and USB-C charging', price: 5590, cat: 'controllers', brand: 'microsoft', sku: 'MS-XBOX-CTRL-BLK', stock: 25 },
    { name: 'Sony DualSense Wireless Controller', slug: 'ps5-dualsense-controller', desc: 'PS5 controller with adaptive triggers, haptic feedback and built-in mic', price: 5990, cat: 'controllers', brand: 'sony', sku: 'PS5-DS-CTRL-WHT', stock: 24 },

    // ── GAMING ACCESSORIES ───────────────────────────────────────────────────
    { name: 'Razer Viper V3 Pro Wireless Mouse', slug: 'razer-viper-v3-pro', desc: 'Symmetrical 8K polling-rate wireless esports mouse, 58g lightweight', price: 14999, cat: 'gaming-accessories', brand: 'razer', sku: 'RZ-VIPER-V3PRO', stock: 10 },
    { name: 'Razer BlackWidow V4 Pro Keyboard', slug: 'razer-blackwidow-v4-pro', desc: 'Mechanical gaming keyboard with Razer Green switches and RGB Chroma', price: 19999, cat: 'gaming-accessories', brand: 'razer', sku: 'RZ-BWV4PRO-BLK', stock: 8 },
    { name: 'HyperX Cloud Alpha Headset', slug: 'hyperx-cloud-alpha', desc: 'Multi-chamber dual drivers gaming headset with detachable mic', price: 6999, cat: 'gaming-accessories', brand: 'razer', sku: 'HPXCA-RED-BLK', stock: 15 },

    // ── SNACKS ───────────────────────────────────────────────────────────────
    { name: "Lays India Magic Masala Chips 52g", slug: 'lays-india-magic-masala', desc: "India's favourite spiced potato chips with magic masala seasoning", price: 20, cat: 'snacks', brand: 'pepsico', sku: 'LAYS-MAGIC-52G', stock: 150 },
    { name: 'Too Yumm! Multigrain Chips 35g', slug: 'too-yumm-multigrain-chips', desc: 'Baked not fried multigrain chips in tangy tomato flavour', price: 15, cat: 'snacks', brand: 'pepsico', sku: 'TYUM-MULTI-35G', stock: 200 },
    { name: 'Kurkure Masala Munch 90g', slug: 'kurkure-masala-munch-90g', desc: 'Crunchy corn puffed snack with tangy masala seasoning', price: 20, cat: 'snacks', brand: 'pepsico', sku: 'KURK-MASALA-90G', stock: 200 },
    { name: 'Bingo Mad Angles Achaari Masti 75g', slug: 'bingo-mad-angles-achaari', desc: 'Triangular corn chips with achaari (pickle) spice flavour', price: 20, cat: 'snacks', brand: 'pepsico', sku: 'BING-MANG-75G', stock: 180 },

    // ── BEVERAGES ────────────────────────────────────────────────────────────
    { name: 'Coca-Cola Zero Sugar Can 300ml', slug: 'coke-zero-sugar-can', desc: 'Crisp, refreshing Coca-Cola Zero Sugar with no calories', price: 40, cat: 'beverages', brand: 'coca-cola', sku: 'COKE-ZERO-300ML', stock: 200 },
    { name: 'Tropicana Orange Juice 1L', slug: 'tropicana-orange-juice-1l', desc: '100% fruit juice with no added sugar and no preservatives', price: 110, cat: 'beverages', brand: 'pepsico', sku: 'TROP-OJ-1L', stock: 100 },
    { name: 'Red Bull Energy Drink 250ml', slug: 'red-bull-250ml', desc: 'Energy drink with caffeine, taurine and B-vitamins. Can 250ml', price: 125, cat: 'beverages', brand: 'coca-cola', sku: 'REDBULL-250ML', stock: 150 },
    { name: 'Bisleri Mineral Water 1L Pack of 12', slug: 'bisleri-1l-pack-12', desc: 'Purified natural mineral water with added minerals, 12 × 1L', price: 200, cat: 'beverages', brand: 'coca-cola', sku: 'BISL-1L-12PK', stock: 80 },

    // ── PACKAGED FOODS ───────────────────────────────────────────────────────
    { name: 'Maggi 2-Minute Masala Noodles 70g × 12', slug: 'maggi-masala-noodles-12pk', desc: 'Iconic instant noodles with signature masala taste. Pack of 12', price: 156, cat: 'packaged-foods', brand: 'dove', sku: 'MAGGI-MSL-12PK', stock: 100 },
    { name: 'Amul Butter 500g', slug: 'amul-butter-500g', desc: 'Pasteurised cream butter made from cow milk. 500g pack', price: 285, cat: 'packaged-foods', brand: 'dove', sku: 'AMUL-BUTR-500G', stock: 80 },
    { name: 'MDH Chaat Masala 100g', slug: 'mdh-chaat-masala-100g', desc: 'Authentic North Indian chaat masala with dried mango powder and spices', price: 65, cat: 'packaged-foods', brand: 'dove', sku: 'MDH-CHAAT-100G', stock: 120 },

    // ── HOUSEHOLD ESSENTIALS ────────────────────────────────────────────────
    { name: 'Surf Excel Matic Liquid 2L', slug: 'surf-excel-matic-liquid-2l', desc: 'Front load washing machine liquid detergent for better stain removal', price: 375, cat: 'household-essentials', brand: 'dove', sku: 'SURF-MATIC-2L', stock: 80 },
    { name: 'Vim Dishwash Gel Lemon 750ml', slug: 'vim-dishwash-gel-lemon-750ml', desc: 'Tough on grease, gentle on hands dishwash gel with lemon fragrance', price: 119, cat: 'household-essentials', brand: 'dove', sku: 'VIM-GEL-LEM-750ML', stock: 100 },
    { name: 'Harpic Power Plus Toilet Cleaner 1L', slug: 'harpic-power-plus-1l', desc: 'Thick bleach formula that kills 99.9% germs and removes stains', price: 155, cat: 'household-essentials', brand: 'dove', sku: 'HARP-PP-1L', stock: 90 },

    // ── BOOKS — FICTION ───────────────────────────────────────────────────────
    { name: 'The Alchemist by Paulo Coelho', slug: 'the-alchemist-paulo-coelho', desc: "A mystical story of Santiago's journey to find treasure and wisdom", price: 299, cat: 'fiction', brand: 'samsung', sku: 'BOOK-ALCHEMIST', stock: 60 },
    { name: 'Ikigai: The Japanese Secret to a Long Life', slug: 'ikigai-book', desc: "Japan's secret to a long and happy life — finding your reason for being", price: 349, cat: 'fiction', brand: 'samsung', sku: 'BOOK-IKIGAI', stock: 50 },
    { name: 'Rich Dad Poor Dad by Robert Kiyosaki', slug: 'rich-dad-poor-dad-book', desc: 'What the rich teach their kids about money that the poor do not', price: 299, cat: 'fiction', brand: 'samsung', sku: 'BOOK-RDPD', stock: 45 },

    // ── BOOKS — ACADEMIC ─────────────────────────────────────────────────────
    { name: 'NCERT Physics Class 12 Part 1', slug: 'ncert-physics-class12-p1', desc: 'NCERT standard textbook for CBSE Class 12 Physics — Part 1', price: 150, cat: 'academic', brand: 'samsung', sku: 'NCERT-PHY12-P1', stock: 200 },
    { name: 'RD Sharma Mathematics Class 12', slug: 'rd-sharma-maths-class12', desc: 'Comprehensive problem book for CBSE Class 12 Mathematics', price: 599, cat: 'academic', brand: 'samsung', sku: 'RDS-MATHS-12', stock: 100 },
    { name: 'Arihant Objective GK 2025', slug: 'arihant-objective-gk-2025', desc: 'Updated General Knowledge for competitive exams — SSC, UPSC, Bank', price: 449, cat: 'academic', brand: 'samsung', sku: 'ARI-OGK-2025', stock: 80 },

    // ── BOOKS — PROGRAMMING ──────────────────────────────────────────────────
    { name: 'Clean Code by Robert C. Martin', slug: 'clean-code-book', desc: 'A Handbook of Agile Software Craftsmanship. Must-read for developers', price: 699, cat: 'programming', brand: 'samsung', sku: 'BOOK-CLEAN-CODE', stock: 20 },

    // ── BOOKS — SELF HELP ─────────────────────────────────────────────────────
    { name: 'Atomic Habits by James Clear', slug: 'atomic-habits-book', desc: 'Tiny changes, remarkable results. Science of habit formation', price: 499, cat: 'self-help', brand: 'samsung', sku: 'BOOK-ATOMIC-HABITS', stock: 50 },

    // ── BOOKS — BUSINESS ──────────────────────────────────────────────────────
    { name: 'Start with Why by Simon Sinek', slug: 'start-with-why-book', desc: 'How great leaders inspire everyone to take action', price: 599, cat: 'business', brand: 'samsung', sku: 'BOOK-START-WITH-WHY', stock: 15 },

    // ── MOBILE ACCESSORIES ───────────────────────────────────────────────────
    { name: 'Anker PowerCore 10000 Power Bank', slug: 'anker-powercore-10000', desc: 'Ultra-compact 10000mAh power bank with USB-C and PowerIQ 3.0', price: 1999, cat: 'mobile-accessories', brand: 'anker', sku: 'ANK-PC10000-BLK', stock: 40 },
    { name: 'Spigen Tough Armor Case iPhone 15', slug: 'spigen-tough-armor-iphone15', desc: 'Military-grade MIL-STD-810G protection with kickstand for iPhone 15', price: 1299, cat: 'mobile-accessories', brand: 'spigen', sku: 'SPIG-TA-IP15-BLK', stock: 30 },
    { name: 'boAt Type-C Braided Cable 1.5m', slug: 'boat-type-c-braided-cable-1-5m', desc: '60W fast-charging nylon braided USB-C cable, 1.5m length', price: 399, cat: 'mobile-accessories', brand: 'boat', sku: 'BOAT-TCC-150-BLK', stock: 100 },
    { name: 'Samsung 25W USB-C Adapter', slug: 'samsung-25w-usbc-adapter', desc: 'Original Samsung 25W Super Fast Charging USB-C wall adapter', price: 999, cat: 'mobile-accessories', brand: 'samsung', sku: 'SAM-25WADA-WHT', stock: 60 },
    { name: 'Belkin 3-in-1 Wireless Charger', slug: 'belkin-3in1-wireless-charger', desc: 'Simultaneously charge iPhone, Apple Watch and AirPods wirelessly', price: 7999, cat: 'mobile-accessories', brand: 'anker', sku: 'BLK-3IN1-WCH-WHT', stock: 10 },
    { name: 'UGREEN USB-C Hub 7-in-1', slug: 'ugreen-usbc-hub-7in1', desc: '7-in-1 hub: 4K HDMI, 100W PD, USB-A 3.0 ×2, SD/TF card reader', price: 3499, cat: 'mobile-accessories', brand: 'anker', sku: 'UGRN-HUB7IN1-GRY', stock: 20 },
  ];

  // Map other fakes to match categories/brands safely
  const imageFallbackMap: Record<string, string> = {
    laptops: 'https://images.unsplash.com/photo-1496181130204-755241544e35?w=800',
    smartphones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
    tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
    smartwatches: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800',
    'headphones-earbuds': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    cameras: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    'computer-accessories': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
    monitors: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800',
    'keyboards-mice': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800',
    speakers: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800',
    'mens-clothing': 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800',
    'womens-clothing': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    bags: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
    watches: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    accessories: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    'kitchen-appliances': 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800',
    'home-appliances': 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800',
    furniture: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
    'home-decor': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800',
    cookware: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800',
    'storage-organization': 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
    skincare: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
    haircare: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    makeup: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    grooming: 'https://images.unsplash.com/photo-1621607511815-68424fec745f?w=800',
    fragrances: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800',
    'fitness-equipment': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
    'sports-shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
    'outdoor-sports': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=800',
    'gym-accessories': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800',
    cycling: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800',
    programming: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    business: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    fiction: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    'self-help': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    academic: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
    snacks: 'https://images.unsplash.com/photo-1599490659223-eb5222decbaf?w=800',
    beverages: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    'packaged-foods': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
    'household-essentials': 'https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800',
    'gaming-laptops': 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800',
    'gaming-consoles': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
    games: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
    controllers: 'https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=800',
    'gaming-accessories': 'https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=800',
    'mobile-accessories': 'https://images.unsplash.com/photo-1609692814858-f7cd2f0afa4f?w=800',
  };

  const seedProducts = [...rawProducts];
  for (const fake of extraFakes) {
    seedProducts.push({
      name: fake.name,
      slug: fake.slug,
      description: fake.desc,
      basePrice: fake.price,
      catSlug: fake.cat,
      brandSlug: fake.brand,
      imageUrl: imageFallbackMap[fake.cat] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      variants: [{ sku: fake.sku, color: 'Default', size: 'Standard', price: fake.price, stock: fake.stock }],
    });
  }

  // Create products in database
  const createdProducts: any[] = [];
  for (const p of seedProducts) {
    const categoryId = catMap[p.catSlug] || parentMap['Electronics']; // fallback
    const brandId = p.brandSlug ? (brandMap[p.brandSlug] || undefined) : undefined;

    // If product already exists, update its brand/category to fix integrity errors (idempotent upsert)
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      const updated = await prisma.product.update({
        where: { slug: p.slug },
        data: { brandId, categoryId },
      });
      createdProducts.push(updated);
      continue;
    }

    const newProd = await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        status: ProductStatus.ACTIVE,
        sellerId: seller.id,
        categoryId,
        brandId,
        images: {
          create: [
            {
              url: p.imageUrl,
              alt: p.name,
              sortOrder: 1,
            },
          ],
        },
        variants: {
          create: p.variants.map((v) => ({
            sku: v.sku,
            color: v.color,
            size: v.size,
            price: v.price,
            inventory: {
              create: {
                quantity: v.stock,
              },
            },
          })),
        },
      },
      include: {
        variants: {
          include: { inventory: true },
        },
      },
    });
    createdProducts.push(newProd);
  }

  console.log(`Seeded ${createdProducts.length} products successfully.`);

  // 7. Seed Customer Test Data (Profile, Addresses, Wishlist, Notifications)
  console.log('Seeding customer addresses...');
  await prisma.address.upsert({
    where: { id: 'test-address-id-1' },
    update: {},
    create: {
      id: 'test-address-id-1',
      userId: customerUser.id,
      fullName: 'Customer Tester',
      phone: '9876543210',
      addressLine1: '123 Prime Street',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560001',
      country: 'India',
      isDefault: true,
    },
  });

  // Populate Wishlist
  console.log('Seeding wishlist...');
  const wishlist = await prisma.wishlist.upsert({
    where: { userId: customerUser.id },
    update: {},
    create: { userId: customerUser.id },
  });

  for (const p of createdProducts.slice(0, 5)) {
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        wishlistId: wishlist.id,
        productId: p.id,
      },
    });
    if (!existingItem) {
      await prisma.wishlistItem.create({
        data: {
          wishlistId: wishlist.id,
          productId: p.id,
        },
      });
    }
  }

  // Populate Notifications
  console.log('Seeding notifications...');
  const sampleNotifications = [
    { type: 'ORDER_UPDATE', title: 'Order Confirmed', message: 'Your order has been confirmed successfully.' },
    { type: 'PAYMENT_UPDATE', title: 'Payment Successful', message: 'Payment for order #1002 was received.' },
    { type: 'PROMOTION', title: 'Special Promo Alert', message: 'Get 15% off electronics using code ELECTRONICS15!' },
  ];
  for (const n of sampleNotifications) {
    await prisma.notification.create({
      data: {
        userId: customerUser.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: false,
      },
    });
  }

  // 8. Seed Orders for Testing (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
  console.log('Seeding orders...');
  const statuses = [
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
  ];

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const orderId = `test-order-id-${i + 1}`;

    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
    if (existingOrder) continue;

    const productSample = createdProducts[i % createdProducts.length];
    // Re-fetch product with variants to ensure variants are present
    const fullProduct = await prisma.product.findUnique({
      where: { id: productSample.id },
      include: { variants: true }
    });
    if (!fullProduct || fullProduct.variants.length === 0) continue;
    const variant = fullProduct.variants[0];

    const itemPrice = Number(variant.price || fullProduct.basePrice);
    const qty = 1;
    const itemTotal = itemPrice * qty;
    const tax = itemTotal * 0.18;
    const shipping = 50;
    const total = itemTotal + tax + shipping;

    await prisma.order.create({
      data: {
        id: orderId,
        userId: customerUser.id,
        status,
        subtotal: itemTotal,
        discount: 0,
        tax,
        shippingFee: shipping,
        total,
        shippingAddress: {
          name: 'Customer Tester',
          street: '123 Prime Street',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560001',
          country: 'India',
          phone: '9876543210',
        } as any,
        items: {
          create: [
            {
              productId: fullProduct.id,
              variantId: variant.id,
              sellerId: seller.id,
              quantity: qty,
              price: itemPrice,
            },
          ],
        },
        payments: {
          create: [
            {
              provider: 'RAZORPAY',
              amount: total,
              status: status === OrderStatus.PENDING ? PaymentStatus.PENDING : PaymentStatus.COMPLETED,
            },
          ],
        },
      },
    });
  }

  // 9. Verified-purchase Reviews
  console.log('Seeding reviews...');
  const deliveredOrder = await prisma.order.findUnique({
    where: { id: 'test-order-id-4' }, // Status: DELIVERED
    include: { items: true },
  });

  if (deliveredOrder && deliveredOrder.items.length > 0) {
    const orderItem = deliveredOrder.items[0];
    const existingReview = await prisma.review.findFirst({
      where: {
        userId: customerUser.id,
        productId: orderItem.productId,
      },
    });
    if (!existingReview) {
      await prisma.review.create({
        data: {
          userId: customerUser.id,
          productId: orderItem.productId,
          rating: 5,
          title: 'Outstanding Performance!',
          comment: 'I am highly impressed with the performance and battery life. Exceeded my expectations.',
          verifiedPurchase: true,
          status: 'APPROVED',
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding encountered an error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
