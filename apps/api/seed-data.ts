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
      brandSlug: 'dell', // fallback
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
    // Laptops
    { name: 'HP Spectre x360', slug: 'hp-spectre-x360', desc: 'Premium 2-in-1 convertible laptop', price: 139900, cat: 'laptops', brand: 'hp', sku: 'HPSP-X360-BLK', stock: 10 },
    { name: 'ASUS ROG Zephyrus G14', slug: 'asus-rog-zephyrus-g14', desc: 'High-refresh rate portable gaming laptop', price: 149990, cat: 'gaming-laptops', brand: 'asus', sku: 'ROG-G14-WHT', stock: 5 },
    { name: 'Acer Swift Go 14', slug: 'acer-swift-go-14', desc: 'Sleek OLED lightweight business notebook', price: 69990, cat: 'laptops', brand: 'acer', sku: 'ACER-SG14-SLV', stock: 20 },
    // Smartphones
    { name: 'Google Pixel 8 Pro', slug: 'google-pixel-8-pro', desc: 'Superb photo algorithms and clean Android interface', price: 106999, cat: 'smartphones', brand: 'samsung', sku: 'PIX8P-128-OBS', stock: 12 },
    { name: 'ASUS Zenfone 10', slug: 'asus-zenfone-10', desc: 'Compact power flagship design', price: 58990, cat: 'smartphones', brand: 'asus', sku: 'ZF10-WHT', stock: 8 },
    // Smartwatches
    { name: 'Sony Wena 3 Smart Band', slug: 'sony-wena-3-band', desc: 'Seamless smart strap companion for analogue watches', price: 24900, cat: 'smartwatches', brand: 'sony', sku: 'WENA3-STRAP', stock: 4 },
    // Headphones
    { name: 'JBL Live Pro 2 Earbuds', slug: 'jbl-live-pro-2', desc: 'Active noise cancellation true wireless earbuds', price: 9999, cat: 'headphones-earbuds', brand: 'jbl', sku: 'JBL-LP2-BLU', stock: 18 },
    { name: 'Apple AirPods Max', slug: 'apple-airpods-max', desc: 'Premium spatial audio headphones', price: 59900, cat: 'headphones-earbuds', brand: 'apple', sku: 'AP-MAX-SLV', stock: 6 },
    // Computer Accessories
    { name: 'Logitech MX Keys S Keyboard', slug: 'logitech-mx-keys-s', desc: 'Quiet low-profile tactile typing keyboard', price: 12995, cat: 'keyboards-mice', brand: 'logitech', sku: 'MX-KEYS-S-GRY', stock: 15 },
    { name: 'Logitech G Pro X Superlight Mouse', slug: 'logitech-g-pro-x-superlight', desc: 'Pro wireless ultra lightweight gaming mouse', price: 15995, cat: 'keyboards-mice', brand: 'logitech', sku: 'GPROX-SUPER-BLK', stock: 8 },
    // Speakers
    { name: 'JBL Flip 6 Portable Speaker', slug: 'jbl-flip-6-portable', desc: 'Waterproof portable bluetooth speaker with deep bass', price: 9999, cat: 'speakers', brand: 'jbl', sku: 'JBL-FLIP6-RED', stock: 35 },
    { name: 'Sony SRS-XE300 Speaker', slug: 'sony-srs-xe300', desc: 'Wide-spread sound portable outdoor speaker', price: 14990, cat: 'speakers', brand: 'sony', sku: 'SRS-XE300-BLK', stock: 0 }, // Out of stock
    // Fashion
    { name: "Levi's Classic Denim Jacket", slug: 'levis-classic-denim-jacket', desc: 'Iconic trucker jacket design', price: 4999, cat: 'mens-clothing', brand: 'levis', sku: 'LVS-DENIM-JKT', stock: 10 },
    { name: 'Adidas Originals Superstar Shoes', slug: 'adidas-superstar', desc: 'Retro shell toe iconic lifestyle shoes', price: 7999, cat: 'shoes', brand: 'adidas', sku: 'AD-SUPER-WHT', stock: 15 },
    { name: 'Puma Velocity Nitro 2 Shoes', slug: 'puma-velocity-nitro-2', desc: 'High-cushion responsive road running shoes', price: 10999, cat: 'shoes', brand: 'puma', sku: 'PM-NITRO-ORG', stock: 9 },
    { name: 'H&M Linen Blend Resort Shirt', slug: 'hm-linen-blend-shirt', desc: 'Lightweight summer resort shirt', price: 1499, cat: 'mens-clothing', brand: 'hm', sku: 'HM-LINEN-SHIRT', stock: 45 },
    { name: 'H&M Oversized Trench Coat', slug: 'hm-oversized-trench-coat', desc: 'Classic double-breasted cotton trench coat', price: 4999, cat: 'womens-clothing', brand: 'hm', sku: 'HM-TRENCH-COAT', stock: 11 },
    // Home & Kitchen
    { name: 'Philips Hue White & Colour Starter Kit', slug: 'philips-hue-starter-kit', desc: 'Smart automated home light control kit', price: 11499, cat: 'home-decor', brand: 'philips', sku: 'PH-HUE-KIT', stock: 7 },
    { name: 'IKEA Poäng Armchair', slug: 'ikea-poang-armchair', desc: 'Classic layer-glued bent birch frame lounge chair', price: 8999, cat: 'furniture', brand: 'ikea', sku: 'IK-POANG-CHAIR', stock: 14 },
    { name: 'Bosch 12 Place Dishwasher', slug: 'bosch-12-place-dishwasher', desc: 'Quiet efficient hygiene dishwashing machine', price: 38990, cat: 'home-appliances', brand: 'bosch', sku: 'BSH-DW-12P', stock: 3 }, // Low stock
    // Beauty
    { name: 'Philips OneBlade Hybrid Trimmer', slug: 'philips-oneblade-trimmer', desc: 'Trim, edge and shave any length of hair', price: 2199, cat: 'grooming', brand: 'philips', sku: 'PH-ONEBLADE', stock: 50 },
    // Sports
    { name: 'Razer Tactical Pro Backpack V2', slug: 'razer-tactical-backpack-v2', desc: 'Ultra-durable tactical equipment bag', price: 12999, cat: 'gym-accessories', brand: 'razer', sku: 'RZ-TACTICAL-BP', stock: 6 },
    { name: 'Decathlon Triban RC120 Bike', slug: 'decathlon-triban-rc120', desc: 'Reliable entry level disc brake road bike', price: 39999, cat: 'cycling', brand: 'dell', sku: 'DEC-TRIBAN-RC120', stock: 2 }, // Low stock
    // Gaming
    { name: 'Nintendo Switch OLED Model', slug: 'nintendo-switch-oled', desc: 'Stunning 7-inch OLED portable console', price: 31990, cat: 'gaming-consoles', brand: 'sony', sku: 'NIN-SWITCH-OLED', stock: 12 },
    { name: 'Microsoft Xbox Series X', slug: 'xbox-series-x-1tb', desc: 'Fastest most powerful premium gaming console', price: 54990, cat: 'gaming-consoles', brand: 'microsoft', sku: 'MS-XBOX-SX-1TB', stock: 11 },
    { name: 'Razer Viper V3 Pro Mouse', slug: 'razer-viper-v3-pro', desc: 'Symmetrical wireless 8K polling esport mouse', price: 14999, cat: 'gaming-accessories', brand: 'razer', sku: 'RZ-VIPER-V3PRO', stock: 10 },
    { name: 'Xbox Wireless Controller Carbon Black', slug: 'xbox-wireless-controller', desc: 'Classic ergonomic controller with custom grip', price: 5590, cat: 'controllers', brand: 'microsoft', sku: 'MS-XBOX-CTRL-BLK', stock: 25 },
    { name: 'Sony DualSense Wireless Controller', slug: 'ps5-dualsense-controller', desc: 'Haptic feedback and adaptive trigger controller', price: 5990, cat: 'controllers', brand: 'sony', sku: 'PS5-DS-CTRL-WHT', stock: 24 },
    { name: 'Elden Ring PS5 Edition', slug: 'elden-ring-ps5', desc: 'Action RPG set in the Lands Between', price: 3499, cat: 'games', brand: 'sony', sku: 'GAME-ELDEN-PS5', stock: 30 },
    { name: 'The Legend of Zelda: Tears of the Kingdom', slug: 'zelda-totk-switch', desc: 'Epic adventure across Hyrule land and sky', price: 4299, cat: 'games', brand: 'sony', sku: 'GAME-ZELDA-TOTK', stock: 15 },
    // Grocery
    { name: 'Coca Cola Zero Sugar Can', slug: 'coke-zero-sugar-can', desc: 'Refreshing sugar free fizzy cola beverage', price: 40, cat: 'beverages', brand: 'philips', sku: 'COKE-ZERO-CAN', stock: 200 },
    { name: 'Lays India Magic Masala Chips', slug: 'lays-india-magic-masala', desc: 'Perfect potato chips spiced with masala', price: 20, cat: 'snacks', brand: 'philips', sku: 'LAYS-MAGIC-MASALA', stock: 150 },
    // Books
    { name: 'Clean Code: A Handbook of Agile Software Craftsmanship', slug: 'clean-code-book', desc: 'Must-read book for writing clean code', price: 699, cat: 'programming', brand: 'dell', sku: 'BOOK-CLEAN-CODE', stock: 20 },
    { name: 'Atomic Habits by James Clear', slug: 'atomic-habits-book', desc: 'Tiny changes, remarkable results self development guide', price: 499, cat: 'self-help', brand: 'dell', sku: 'BOOK-ATOMIC-HABITS', stock: 50 },
    { name: 'Start with Why by Simon Sinek', slug: 'start-with-why-book', desc: 'How great leaders inspire everyone to take action', price: 599, cat: 'business', brand: 'dell', sku: 'BOOK-START-WITH-WHY', stock: 15 },
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
    const brandId = brandMap[p.brandSlug] || brandMap['sony']; // fallback

    // Verify product does not already exist
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) {
      createdProducts.push(existing);
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
