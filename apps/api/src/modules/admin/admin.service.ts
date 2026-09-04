import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { Prisma, Role, ProductStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { RefundProcessDto } from '../orders/dto/refund-process.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.prisma.product.count();
      if (count < 80) {
        console.log(`[AdminService] Catalog product count (${count}) is under target (80). Running seedCatalog()...`);
        await this.seedCatalog();
      }
    } catch (e) {
      console.warn('[AdminService] Startup catalog seed check skipped/failed:', e.message);
    }
  }

  async getDashboardStats() {
    return this.analytics.getDashboardStats();
  }

  async getUsers(
    skip: number = 0,
    take: number = 20,
    search?: string,
    role?: string,
  ) {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role && role !== 'ALL') {
      where.role = role as any;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async getSellers(skip: number = 0, take: number = 20, search?: string) {
    const where: Prisma.SellerWhereInput = {};
    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.seller.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { email: true, name: true } },
          _count: { select: { products: true, orderItems: true } },
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.seller.count({ where }),
    ]);

    return { sellers, total };
  }

  async getOrders(
    skip: number = 0,
    take: number = 20,
    search?: string,
    status?: string,
  ) {
    const where: Prisma.OrderWhereInput = {};
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status as any;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { email: true, name: true } },
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async getOrderDetail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, color: true, size: true } },
            seller: { select: { id: true, storeName: true } },
          },
        },
        payments: true,
        user: { select: { id: true, name: true, email: true } },
        refunds: true,
        returns: true,
        replacements: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async processRefund(orderId: string, dto: RefundProcessDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const payment = order.payments.find((p) => p.status === 'COMPLETED');

    if (!payment) {
      throw new BadRequestException(
        'No completed payment found for this order',
      );
    }

    const existingRefunds = await this.prisma.refund.aggregate({
      where: { paymentId: payment.id },
      _sum: { amount: true },
    });

    const refundedAmount = Number(existingRefunds._sum.amount || 0);
    const availableAmount = Number(payment.amount) - refundedAmount;

    if (dto.amount > availableAmount + 0.001) {
      throw new BadRequestException(
        `Refund amount exceeds available balance. Available: ${availableAmount.toFixed(2)}`,
      );
    }

    const refund = await this.prisma.refund.create({
      data: {
        orderId,
        paymentId: payment.id,
        amount: dto.amount,
        reason: dto.reason,
        status: 'PENDING',
      },
    });

    if (dto.amount >= availableAmount - 0.001) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });
    }

    return refund;
  }

  async getSellerById(id: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        products: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: 'asc' },
            },
            variants: {
              include: { inventory: true },
            },
          },
        },
        _count: { select: { products: true, orderItems: true } },
      },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    return seller;
  }

  /**
   * Platform-wide product listing for the admin products page.
   * Shape matches apps/web/src/lib/api/admin.ts::getAdminProducts and
   * apps/web/src/app/admin/products/page.tsx ({ products, total }).
   */
  async getAdminProducts(skip: number = 0, take: number = 20, search?: string) {
    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: { select: { id: true, name: true } },
          seller: {
            select: {
              id: true,
              storeName: true,
              status: true,
              user: { select: { email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { products, total };
  }

  async changeUserRole(adminUserId: string, targetUserId: string, role: Role) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === role) {
      // Idempotent no-op; no audit entry for a no-change request.
      return user;
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    // NOTE: access tokens carry the role claim (Module 13 JWT design), so the
    // new role propagates on the next token refresh (~10 min TTL). Accepted.
    await this.analytics.logAction(adminUserId, 'USER_ROLE_CHANGED', user.id, {
      from: user.role,
      to: role,
    });

    return updated;
  }

  async setSellerStatus(
    adminUserId: string,
    sellerId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { user: { select: { email: true } } },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    if (seller.status === status) {
      return seller;
    }

    const updated = await this.prisma.seller.update({
      where: { id: sellerId },
      data: { status },
    });

    await this.analytics.logAction(
      adminUserId,
      'SELLER_STATUS_CHANGED',
      sellerId,
      { from: seller.status, to: status, storeName: seller.storeName },
    );

    return updated;
  }

  async setProductStatus(
    adminUserId: string,
    productId: string,
    status: ProductStatus,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product.status === status) {
      return product;
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });

    await this.analytics.logAction(
      adminUserId,
      'PRODUCT_STATUS_CHANGED',
      productId,
      { from: product.status, to: status, productName: product.name },
    );

    return updated;
  }

  async getPayments(skip = 0, take = 20) {
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take,
        orderBy: { id: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.payment.count(),
    ]);

    return { payments, total };
  }

  async getRefunds(skip = 0, take = 20) {
    const [refunds, total] = await Promise.all([
      this.prisma.refund.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      }),
      this.prisma.refund.count(),
    ]);

    return { refunds, total };
  }

  async getReviews(skip = 0, take = 20, reported = false) {
    const where: Prisma.ReviewWhereInput = {};
    if (reported) {
      where.reported = true;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { reviews, total };
  }

  async updateReviewStatus(id: string, status: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id },
      data: { status, reported: status === 'APPROVED' ? false : undefined },
    });
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id } });
  }

  private getSettingsFilePath() {
    return path.join(process.cwd(), 'apps', 'api', 'src', 'modules', 'admin', 'platform-settings.json');
  }

  async getSettings() {
    const filePath = this.getSettingsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
      const defaultSettings = {
        siteName: 'MyKart',
        supportEmail: 'support@mykart.local',
        maintenanceMode: false,
        allowSellerRegistration: true,
      };
      fs.writeFileSync(filePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  async updateSettings(dto: any) {
    const filePath = this.getSettingsFilePath();
    const current = await this.getSettings();
    const updated = {
      siteName: dto.siteName ?? current.siteName,
      supportEmail: dto.supportEmail ?? current.supportEmail,
      maintenanceMode: dto.maintenanceMode !== undefined ? !!dto.maintenanceMode : current.maintenanceMode,
      allowSellerRegistration: dto.allowSellerRegistration !== undefined ? !!dto.allowSellerRegistration : current.allowSellerRegistration,
    };
    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
    return updated;
  }

  async seedCatalog() {
    console.log('[seedCatalog] Starting catalog seeding...');

    // 1. Get or create seller
    let seller = await this.prisma.seller.findFirst({ where: { status: 'ACTIVE' } });
    if (!seller) {
      let adminUser = await this.prisma.user.findFirst({ where: { role: Role.ADMIN } });
      if (!adminUser) {
        throw new BadRequestException('No admin user found to associate seller');
      }
      seller = await this.prisma.seller.create({
        data: {
          userId: adminUser.id,
          storeName: 'MyKart Official Store',
          slug: 'mykart-official-store',
          description: 'Official MyKart Store for verified quality products.',
          status: 'ACTIVE',
        },
      });
    }

    // 2. Parent Categories
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
      const dbCat = await this.prisma.category.upsert({
        where: { slug: pc.slug },
        update: pc,
        create: pc,
      });
      parentMap[pc.name] = dbCat.id;
    }

    // 3. Subcategories
    const subCategories = [
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

      { name: "Men's Clothing", slug: 'mens-clothing', parentName: 'Fashion' },
      { name: "Women's Clothing", slug: 'womens-clothing', parentName: 'Fashion' },
      { name: 'Shoes', slug: 'shoes', parentName: 'Fashion' },
      { name: 'Bags', slug: 'bags', parentName: 'Fashion' },
      { name: 'Watches', slug: 'watches', parentName: 'Fashion' },
      { name: 'Accessories', slug: 'accessories', parentName: 'Fashion' },

      { name: 'Kitchen Appliances', slug: 'kitchen-appliances', parentName: 'Home & Kitchen' },
      { name: 'Home Appliances', slug: 'home-appliances', parentName: 'Home & Kitchen' },
      { name: 'Furniture', slug: 'furniture', parentName: 'Home & Kitchen' },
      { name: 'Home Decor', slug: 'home-decor', parentName: 'Home & Kitchen' },
      { name: 'Cookware', slug: 'cookware', parentName: 'Home & Kitchen' },
      { name: 'Storage & Organization', slug: 'storage-organization', parentName: 'Home & Kitchen' },

      { name: 'Skincare', slug: 'skincare', parentName: 'Beauty & Personal Care' },
      { name: 'Hair Care', slug: 'haircare', parentName: 'Beauty & Personal Care' },
      { name: 'Makeup', slug: 'makeup', parentName: 'Beauty & Personal Care' },
      { name: 'Grooming', slug: 'grooming', parentName: 'Beauty & Personal Care' },
      { name: 'Fragrances', slug: 'fragrances', parentName: 'Beauty & Personal Care' },

      { name: 'Fitness Equipment', slug: 'fitness-equipment', parentName: 'Sports & Fitness' },
      { name: 'Sports Shoes', slug: 'sports-shoes', parentName: 'Sports & Fitness' },
      { name: 'Outdoor Sports', slug: 'outdoor-sports', parentName: 'Sports & Fitness' },
      { name: 'Gym Accessories', slug: 'gym-accessories', parentName: 'Sports & Fitness' },
      { name: 'Cycling', slug: 'cycling', parentName: 'Sports & Fitness' },

      { name: 'Programming', slug: 'programming', parentName: 'Books' },
      { name: 'Business', slug: 'business', parentName: 'Books' },
      { name: 'Fiction', slug: 'fiction', parentName: 'Books' },
      { name: 'Self Help', slug: 'self-help', parentName: 'Books' },
      { name: 'Academic', slug: 'academic', parentName: 'Books' },

      { name: 'Snacks', slug: 'snacks', parentName: 'Grocery' },
      { name: 'Beverages', slug: 'beverages', parentName: 'Grocery' },
      { name: 'Packaged Foods', slug: 'packaged-foods', parentName: 'Grocery' },
      { name: 'Household Essentials', slug: 'household-essentials', parentName: 'Grocery' },

      { name: 'Gaming Laptops', slug: 'gaming-laptops', parentName: 'Gaming' },
      { name: 'Gaming Consoles', slug: 'gaming-consoles', parentName: 'Gaming' },
      { name: 'Games', slug: 'games', parentName: 'Gaming' },
      { name: 'Controllers', slug: 'controllers', parentName: 'Gaming' },
      { name: 'Gaming Accessories', slug: 'gaming-accessories', parentName: 'Gaming' },
    ];

    const catMap: Record<string, string> = {};
    for (const sc of subCategories) {
      const parentId = parentMap[sc.parentName];
      const dbCat = await this.prisma.category.upsert({
        where: { slug: sc.slug },
        update: { parentId },
        create: { name: sc.name, slug: sc.slug, parentId },
      });
      catMap[sc.slug] = dbCat.id;
    }

    // 4. Brands
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
      const dbBrand = await this.prisma.brand.upsert({
        where: { slug: b.slug },
        update: { name: b.name },
        create: b,
      });
      brandMap[b.slug] = dbBrand.id;
    }

    // 5. Products catalog list
    const catalog = [
  {
    "name": "MacBook Pro 16 M3 Max",
    "slug": "macbook-pro-16-m3-max",
    "desc": "The ultimate pro laptop featuring the powerful Apple M3 Max chip, 36GB unified memory, and 1TB SSD.",
    "price": 349999,
    "salePrice": 321999,
    "rating": 4.8,
    "count": 1247,
    "cat": "laptops",
    "brand": "apple",
    "img": "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
    "sku": "MBP16-M3MAX",
    "stock": 15
  },
  {
    "name": "Dell XPS 13 Plus",
    "slug": "dell-xps-13-plus",
    "desc": "Stunning premium 13.4-inch OLED display, powered by Intel Core i7 processor.",
    "price": 169990,
    "salePrice": 139391,
    "rating": 4.5,
    "count": 834,
    "cat": "laptops",
    "brand": "dell",
    "img": "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800",
    "sku": "XPS13-PLUS",
    "stock": 8
  },
  {
    "name": "HP Spectre x360 14",
    "slug": "hp-spectre-x360-14",
    "desc": "Premium 2-in-1 convertible OLED laptop with Intel Core Ultra 7",
    "price": 149900,
    "salePrice": 116922,
    "rating": 4.4,
    "count": 612,
    "cat": "laptops",
    "brand": "hp",
    "img": "https://images.unsplash.com/photo-1544731612-de7f96afe55f?w=800",
    "sku": "HPSP-X360-14",
    "stock": 10
  },
  {
    "name": "Acer Swift Go 14 OLED",
    "slug": "acer-swift-go-14",
    "desc": "Sleek 14-inch OLED ultrabook with AMD Ryzen 7 and 16GB RAM",
    "price": 69990,
    "salePrice": 48993,
    "rating": 4.2,
    "count": 389,
    "cat": "laptops",
    "brand": "acer",
    "img": "https://images.unsplash.com/photo-1496181130204-755241544e35?w=800",
    "sku": "ACER-SG14",
    "stock": 20
  },
  {
    "name": "Lenovo ThinkPad X1 Carbon Gen 12",
    "slug": "lenovo-thinkpad-x1-carbon-gen12",
    "desc": "Business-class ultralight carbon fibre laptop with Intel Core Ultra",
    "price": 179900,
    "salePrice": 152915,
    "rating": 4.7,
    "count": 412,
    "cat": "laptops",
    "brand": "lenovo",
    "img": "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800",
    "sku": "TP-X1C-G12",
    "stock": 7
  },
  {
    "name": "ASUS ZenBook 14 OLED",
    "slug": "asus-zenbook-14-oled",
    "desc": "14-inch OLED display with AMD Ryzen 7 8845HS and 1TB SSD",
    "price": 89990,
    "salePrice": 76491,
    "rating": 4.6,
    "count": 310,
    "cat": "laptops",
    "brand": "asus",
    "img": "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800",
    "sku": "ZB14-OLED",
    "stock": 12
  },
  {
    "name": "ASUS ROG Zephyrus G14",
    "slug": "asus-rog-zephyrus-g14",
    "desc": "High-refresh rate portable gaming laptop with AMD Ryzen 9 and RTX 4070",
    "price": 149990,
    "salePrice": 127491,
    "rating": 4.6,
    "count": 523,
    "cat": "gaming-laptops",
    "brand": "asus",
    "img": "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800",
    "sku": "ROG-G14",
    "stock": 5
  },
  {
    "name": "ASUS ROG Strix G16 2024",
    "slug": "asus-rog-strix-g16",
    "desc": "16-inch QHD 240Hz gaming laptop with RTX 4070 and Ryzen 9",
    "price": 169990,
    "salePrice": 144491,
    "rating": 4.7,
    "count": 280,
    "cat": "gaming-laptops",
    "brand": "asus",
    "img": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800",
    "sku": "ROG-G16",
    "stock": 5
  },
  {
    "name": "MSI Katana 15 RTX 4060",
    "slug": "msi-katana-15-rtx4060",
    "desc": "Gaming laptop with Intel Core i7-13th Gen and RTX 4060",
    "price": 89990,
    "salePrice": 74691,
    "rating": 4.3,
    "count": 190,
    "cat": "gaming-laptops",
    "brand": "msi",
    "img": "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800",
    "sku": "MSI-KAT15",
    "stock": 8
  },
  {
    "name": "Samsung Galaxy S24 Ultra",
    "slug": "samsung-galaxy-s24-ultra",
    "desc": "Galaxy AI is here. Experience epic photo zoom, built-in S Pen, and Snapdragon 8 Gen 3.",
    "price": 129999,
    "salePrice": 114399,
    "rating": 4.7,
    "count": 2341,
    "cat": "smartphones",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800",
    "sku": "S24U-256",
    "stock": 25
  },
  {
    "name": "Apple iPhone 15 Pro Max",
    "slug": "apple-iphone-15-pro-max",
    "desc": "Forged in titanium. Features A17 Pro chip, custom Action button, and 5x telephoto camera.",
    "price": 159900,
    "salePrice": 148707,
    "rating": 4.9,
    "count": 4821,
    "cat": "smartphones",
    "brand": "apple",
    "img": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800",
    "sku": "IP15PM-256",
    "stock": 15
  },
  {
    "name": "Google Pixel 9 Pro",
    "slug": "google-pixel-9-pro",
    "desc": "Google AI-powered flagship with Tensor G4 chip and 50MP triple camera",
    "price": 109999,
    "salePrice": 93499,
    "rating": 4.6,
    "count": 987,
    "cat": "smartphones",
    "brand": "google",
    "img": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800",
    "sku": "PIX9P-256",
    "stock": 12
  },
  {
    "name": "OnePlus 12 5G",
    "slug": "oneplus-12-5g",
    "desc": "6.82-inch QHD+ display with Snapdragon 8 Gen 3 and Hasselblad cameras",
    "price": 64999,
    "salePrice": 57199,
    "rating": 4.6,
    "count": 1420,
    "cat": "smartphones",
    "brand": "oneplus",
    "img": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800",
    "sku": "OP12-256",
    "stock": 18
  },
  {
    "name": "realme GT 6T 5G",
    "slug": "realme-gt-6t-5g",
    "desc": "Snapdragon 7s Gen 3, 5500mAh and 120W SuperVOOC charging",
    "price": 29999,
    "salePrice": 24999,
    "rating": 4.4,
    "count": 850,
    "cat": "smartphones",
    "brand": "realme",
    "img": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800",
    "sku": "REGT6T-128",
    "stock": 25
  },
  {
    "name": "Motorola Edge 50 Pro",
    "slug": "motorola-edge-50-pro",
    "desc": "6.7-inch pOLED 144Hz display with 50MP Sony camera and 125W charging",
    "price": 31999,
    "salePrice": 27999,
    "rating": 4.3,
    "count": 620,
    "cat": "smartphones",
    "brand": "motorola",
    "img": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800",
    "sku": "MOTO-E50P",
    "stock": 14
  },
  {
    "name": "ASUS Zenfone 10",
    "slug": "asus-zenfone-10",
    "desc": "Compact 5.9-inch flagship with Snapdragon 8 Gen 2 and 50MP gimbal camera",
    "price": 54990,
    "salePrice": 41242,
    "rating": 4.1,
    "count": 201,
    "cat": "smartphones",
    "brand": "asus",
    "img": "https://images.unsplash.com/photo-1574944985070-8f30c4397e3c?w=800",
    "sku": "ZF10-256",
    "stock": 8
  },
  {
    "name": "Apple iPad Pro 11-inch M2",
    "slug": "apple-ipad-pro-11-m2",
    "desc": "Incredible performance, Liquid Retina display, hover Apple Pencil.",
    "price": 79900,
    "salePrice": 67915,
    "rating": 4.7,
    "count": 1103,
    "cat": "tablets",
    "brand": "apple",
    "img": "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",
    "sku": "IPADPRO-11",
    "stock": 18
  },
  {
    "name": "Samsung Galaxy Tab S9 FE",
    "slug": "samsung-galaxy-tab-s9-fe",
    "desc": "10.9-inch LCD with S Pen, 8GB RAM, 128GB, IP68 water resistance",
    "price": 44999,
    "salePrice": 38249,
    "rating": 4.5,
    "count": 480,
    "cat": "tablets",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800",
    "sku": "GTABS9FE-128",
    "stock": 15
  },
  {
    "name": "Apple Watch Ultra 2",
    "slug": "apple-watch-ultra-2",
    "desc": "Rugged titanium case, up to 72 hours battery, high-precision GPS.",
    "price": 89900,
    "salePrice": 80910,
    "rating": 4.6,
    "count": 765,
    "cat": "smartwatches",
    "brand": "apple",
    "img": "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800",
    "sku": "AW-ULTRA2",
    "stock": 10
  },
  {
    "name": "Samsung Galaxy Watch 7 44mm",
    "slug": "samsung-galaxy-watch-7-44mm",
    "desc": "Advanced health tracking with BioActive sensor and sapphire glass",
    "price": 32999,
    "salePrice": 28049,
    "rating": 4.5,
    "count": 610,
    "cat": "smartwatches",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800",
    "sku": "GW7-44",
    "stock": 20
  },
  {
    "name": "Garmin Forerunner 265",
    "slug": "garmin-forerunner-265",
    "desc": "GPS running watch with AMOLED display, race predictor and training load",
    "price": 49999,
    "salePrice": 43999,
    "rating": 4.8,
    "count": 320,
    "cat": "smartwatches",
    "brand": "garmin",
    "img": "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800",
    "sku": "GARMIN-FR265",
    "stock": 8
  },
  {
    "name": "Sony WH-1000XM5 Headphones",
    "slug": "sony-wh-1000xm5",
    "desc": "Industry-leading noise cancellation headphones with custom ambient sound.",
    "price": 29990,
    "salePrice": 19493,
    "rating": 4.8,
    "count": 3201,
    "cat": "headphones-earbuds",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    "sku": "WH1000XM5",
    "stock": 22
  },
  {
    "name": "Apple AirPods Max",
    "slug": "apple-airpods-max",
    "desc": "Premium spatial audio headphones with computational audio",
    "price": 59900,
    "salePrice": 47920,
    "rating": 4.5,
    "count": 1432,
    "cat": "headphones-earbuds",
    "brand": "apple",
    "img": "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800",
    "sku": "AP-MAX",
    "stock": 6
  },
  {
    "name": "JBL Live Pro 2 Earbuds",
    "slug": "jbl-live-pro-2",
    "desc": "Active noise cancellation true wireless earbuds with 40h battery",
    "price": 9999,
    "salePrice": 5999,
    "rating": 4.3,
    "count": 892,
    "cat": "headphones-earbuds",
    "brand": "jbl",
    "img": "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
    "sku": "JBL-LP2",
    "stock": 18
  },
  {
    "name": "boAt Rockerz 450 Pro",
    "slug": "boat-rockerz-450-pro",
    "desc": "Wireless over-ear headphones with 40mm drivers and 70-hour playback",
    "price": 1299,
    "salePrice": 999,
    "rating": 4.2,
    "count": 3400,
    "cat": "headphones-earbuds",
    "brand": "boat",
    "img": "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800",
    "sku": "BOAT-R450P",
    "stock": 80
  },
  {
    "name": "Canon EOS R50 Mirrorless Camera",
    "slug": "canon-eos-r50",
    "desc": "Lightweight mirrorless camera with 24.2 MP APS-C sensor and 4K recording.",
    "price": 65990,
    "salePrice": 56091,
    "rating": 4.6,
    "count": 412,
    "cat": "cameras",
    "brand": "canon",
    "img": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800",
    "sku": "EOS-R50",
    "stock": 6
  },
  {
    "name": "Nikon Z50 II Mirrorless Camera",
    "slug": "nikon-z50-ii",
    "desc": "20.9MP APS-C sensor with 4K UHD video, in-body VR and Z-mount",
    "price": 89995,
    "salePrice": 76495,
    "rating": 4.5,
    "count": 210,
    "cat": "cameras",
    "brand": "nikon",
    "img": "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800",
    "sku": "NK-Z50II",
    "stock": 5
  },
  {
    "name": "Sony Alpha a6700 Mirrorless",
    "slug": "sony-alpha-a6700",
    "desc": "26MP BSI-CMOS sensor, AI subject recognition and 4K 120fps video",
    "price": 129990,
    "salePrice": 110491,
    "rating": 4.8,
    "count": 380,
    "cat": "cameras",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1512790182412-b19e6d611397?w=800",
    "sku": "SONY-A6700",
    "stock": 4
  },
  {
    "name": "LG UltraGear 27-inch Gaming Monitor",
    "slug": "lg-ultragear-27-gaming",
    "desc": "Fast 165Hz refresh rate with 1ms response time, IPS panel with HDR10.",
    "price": 22500,
    "salePrice": 18000,
    "rating": 4.5,
    "count": 678,
    "cat": "monitors",
    "brand": "lg",
    "img": "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800",
    "sku": "LG-UG-27",
    "stock": 10
  },
  {
    "name": "Samsung 27-inch Odyssey G5 Curved",
    "slug": "samsung-odyssey-g5-27",
    "desc": "1000R curved 1440p QHD 165Hz gaming monitor with FreeSync",
    "price": 28999,
    "salePrice": 23199,
    "rating": 4.6,
    "count": 540,
    "cat": "monitors",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800",
    "sku": "SAM-OG5-27",
    "stock": 8
  },
  {
    "name": "Logitech MX Master 3S Mouse",
    "slug": "logitech-mx-master-3s",
    "desc": "Ergonomic workspace mouse featuring quiet clicks and 8K DPI tracking.",
    "price": 10995,
    "salePrice": 9015,
    "rating": 4.7,
    "count": 1890,
    "cat": "keyboards-mice",
    "brand": "logitech",
    "img": "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800",
    "sku": "MX-MASTER-3S",
    "stock": 14
  },
  {
    "name": "Logitech MX Keys S Keyboard",
    "slug": "logitech-mx-keys-s",
    "desc": "Quiet low-profile tactile typing keyboard with multi-device Bluetooth",
    "price": 12995,
    "salePrice": 10136,
    "rating": 4.6,
    "count": 1204,
    "cat": "keyboards-mice",
    "brand": "logitech",
    "img": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800",
    "sku": "MX-KEYS-S",
    "stock": 15
  },
  {
    "name": "Logitech G Pro X Superlight 2",
    "slug": "logitech-g-pro-x-superlight-2",
    "desc": "Ultra-lightweight 60g pro wireless gaming mouse with HERO 2 25K",
    "price": 15995,
    "salePrice": 13595,
    "rating": 4.8,
    "count": 1567,
    "cat": "keyboards-mice",
    "brand": "logitech",
    "img": "https://images.unsplash.com/photo-1626218174358-7769486c4b79?w=800",
    "sku": "GPROX-SL2",
    "stock": 8
  },
  {
    "name": "JBL Flip 6 Portable Speaker",
    "slug": "jbl-flip-6-portable",
    "desc": "IP67 waterproof portable bluetooth speaker with bold JBL Pro Sound",
    "price": 9999,
    "salePrice": 7199,
    "rating": 4.6,
    "count": 2100,
    "cat": "speakers",
    "brand": "jbl",
    "img": "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800",
    "sku": "JBL-FLIP6",
    "stock": 35
  },
  {
    "name": "Sony SRS-XE300 Speaker",
    "slug": "sony-srs-xe300",
    "desc": "Wide-spread 360 sound with X-Balanced Speaker Unit and IP67 rating",
    "price": 14990,
    "salePrice": 11992,
    "rating": 4.2,
    "count": 345,
    "cat": "speakers",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800",
    "sku": "SRS-XE300",
    "stock": 12
  },
  {
    "name": "Anker PowerCore 10000 Power Bank",
    "slug": "anker-powercore-10000",
    "desc": "Ultra-compact 10000mAh power bank with USB-C and PowerIQ 3.0",
    "price": 1999,
    "salePrice": 1599,
    "rating": 4.6,
    "count": 1200,
    "cat": "mobile-accessories",
    "brand": "anker",
    "img": "https://images.unsplash.com/photo-1609692814858-f7cd2f0afa4f?w=800",
    "sku": "ANK-PC10000",
    "stock": 40
  },
  {
    "name": "Spigen Tough Armor Case iPhone 15",
    "slug": "spigen-tough-armor-iphone15",
    "desc": "Military-grade MIL-STD-810G protection with kickstand",
    "price": 1299,
    "salePrice": 999,
    "rating": 4.7,
    "count": 890,
    "cat": "mobile-accessories",
    "brand": "spigen",
    "img": "https://images.unsplash.com/photo-1541877944-ac82a091518a?w=800",
    "sku": "SPIG-TA-IP15",
    "stock": 30
  },
  {
    "name": "boAt Type-C Braided Cable 1.5m",
    "slug": "boat-type-c-braided-cable-1-5m",
    "desc": "60W fast-charging nylon braided USB-C cable, 1.5m length",
    "price": 399,
    "salePrice": 249,
    "rating": 4.3,
    "count": 2100,
    "cat": "mobile-accessories",
    "brand": "boat",
    "img": "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800",
    "sku": "BOAT-TCC-150",
    "stock": 100
  },
  {
    "name": "Samsung 25W USB-C Adapter",
    "slug": "samsung-25w-usbc-adapter",
    "desc": "Original Samsung 25W Super Fast Charging USB-C wall adapter",
    "price": 999,
    "salePrice": 799,
    "rating": 4.5,
    "count": 1500,
    "cat": "mobile-accessories",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=800",
    "sku": "SAM-25WADA",
    "stock": 60
  },
  {
    "name": "Levi's 511 Slim Fit Jeans",
    "slug": "levis-511-slim-fit",
    "desc": "Classic American styling with modern slim fit cut, blended cotton stretch fabrics.",
    "price": 3299,
    "salePrice": 1979,
    "rating": 4.3,
    "count": 567,
    "cat": "mens-clothing",
    "brand": "levis",
    "img": "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
    "sku": "LVS511-SLIM",
    "stock": 30
  },
  {
    "name": "Levi's 501 Original Jeans",
    "slug": "levis-501-original",
    "desc": "The original blue jeans. Straight fit with button fly, 100% cotton",
    "price": 3499,
    "salePrice": 2799,
    "rating": 4.5,
    "count": 820,
    "cat": "mens-clothing",
    "brand": "levis",
    "img": "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800",
    "sku": "LVS501-ORIG",
    "stock": 40
  },
  {
    "name": "Levi's Classic Denim Jacket",
    "slug": "levis-classic-denim-jacket",
    "desc": "Iconic Trucker Jacket in rigid cotton denim with chest pockets",
    "price": 4999,
    "salePrice": 3999,
    "rating": 4.6,
    "count": 410,
    "cat": "mens-clothing",
    "brand": "levis",
    "img": "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800",
    "sku": "LVS-DENIM-JKT",
    "stock": 10
  },
  {
    "name": "H&M Linen Blend Resort Shirt",
    "slug": "hm-linen-blend-shirt",
    "desc": "Lightweight relaxed-fit summer resort shirt in linen-cotton blend",
    "price": 1499,
    "salePrice": 1199,
    "rating": 4.2,
    "count": 320,
    "cat": "mens-clothing",
    "brand": "hm",
    "img": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800",
    "sku": "HM-LINEN-SHIRT",
    "stock": 45
  },
  {
    "name": "H&M Oversized Trench Coat",
    "slug": "hm-oversized-trench-coat",
    "desc": "Classic double-breasted cotton trench coat in an oversized silhouette",
    "price": 4999,
    "salePrice": 3999,
    "rating": 4.4,
    "count": 290,
    "cat": "womens-clothing",
    "brand": "hm",
    "img": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800",
    "sku": "HM-TRENCH-COAT",
    "stock": 11
  },
  {
    "name": "Nike Air Zoom Pegasus 40",
    "slug": "nike-air-zoom-pegasus-40",
    "desc": "High-responsive Zoom Air pods with comfortable upper fitting for long runs.",
    "price": 11995,
    "salePrice": 7796,
    "rating": 4.5,
    "count": 1234,
    "cat": "shoes",
    "brand": "nike",
    "img": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    "sku": "NK-PEG40",
    "stock": 14
  },
  {
    "name": "Adidas Originals Superstar",
    "slug": "adidas-superstar",
    "desc": "Iconic shell-toe leather shoes with serrated 3-Stripes in classic white",
    "price": 7999,
    "salePrice": 3999,
    "rating": 4.4,
    "count": 2109,
    "cat": "shoes",
    "brand": "adidas",
    "img": "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800",
    "sku": "AD-SUPERSTAR",
    "stock": 15
  },
  {
    "name": "Puma Velocity Nitro 2",
    "slug": "puma-velocity-nitro-2",
    "desc": "High-cushion responsive road running shoe with NITRO foam midsole",
    "price": 10999,
    "salePrice": 6379,
    "rating": 4.2,
    "count": 456,
    "cat": "shoes",
    "brand": "puma",
    "img": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800",
    "sku": "PM-NITRO2",
    "stock": 9
  },
  {
    "name": "Adidas Ultraboost 23",
    "slug": "adidas-ultraboost-23",
    "desc": "Responsive running shoe with BOOST cushioning and Primeknit+ upper",
    "price": 17999,
    "salePrice": 14399,
    "rating": 4.7,
    "count": 890,
    "cat": "sports-shoes",
    "brand": "adidas",
    "img": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800",
    "sku": "AD-UB23",
    "stock": 12
  },
  {
    "name": "Nike Air Max 270",
    "slug": "nike-air-max-270",
    "desc": "Lifestyle shoe with the tallest Air unit yet for all-day comfort",
    "price": 12495,
    "salePrice": 9995,
    "rating": 4.6,
    "count": 1540,
    "cat": "sports-shoes",
    "brand": "nike",
    "img": "https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=800",
    "sku": "NK-AM270",
    "stock": 18
  },
  {
    "name": "IKEA Starttid Backpack",
    "slug": "ikea-starttid-backpack",
    "desc": "Compact school or work backpack with padded laptop compartment",
    "price": 1499,
    "salePrice": 1199,
    "rating": 4.3,
    "count": 180,
    "cat": "bags",
    "brand": "ikea",
    "img": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
    "sku": "IK-STARTTID",
    "stock": 15
  },
  {
    "name": "Adidas Classic 3-Stripes Backpack",
    "slug": "adidas-classic-3stripes-backpack",
    "desc": "Everyday 26L backpack with padded shoulder straps",
    "price": 2499,
    "salePrice": 1999,
    "rating": 4.4,
    "count": 410,
    "cat": "bags",
    "brand": "adidas",
    "img": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800",
    "sku": "AD-BP-3S",
    "stock": 20
  },
  {
    "name": "Titan Edge Ceramic Watch",
    "slug": "titan-edge-ceramic",
    "desc": "World's slimmest ceramic watch with sapphire crystal glass at 5.1mm",
    "price": 24995,
    "salePrice": 21995,
    "rating": 4.8,
    "count": 310,
    "cat": "watches",
    "brand": "titan",
    "img": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800",
    "sku": "TITAN-EDGE",
    "stock": 6
  },
  {
    "name": "Casio G-Shock GA-2100",
    "slug": "casio-g-shock-ga2100",
    "desc": "Carbon Core Guard octagonal bezel G-Shock with shock and 200m water resistance",
    "price": 8995,
    "salePrice": 7645,
    "rating": 4.7,
    "count": 1420,
    "cat": "watches",
    "brand": "casio",
    "img": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800",
    "sku": "CASIO-GA2100",
    "stock": 25
  },
  {
    "name": "Ray-Ban Wayfarer Classic Sunglasses",
    "slug": "rayban-wayfarer-classic",
    "desc": "Iconic plastic frame with G-15 polarised lenses for UV400 protection",
    "price": 8990,
    "salePrice": 7192,
    "rating": 4.6,
    "count": 980,
    "cat": "accessories",
    "brand": "rayban",
    "img": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800",
    "sku": "RB-WAYFARER",
    "stock": 10
  },
  {
    "name": "Bosch 12 Place Dishwasher",
    "slug": "bosch-12-place-dishwasher",
    "desc": "Quiet efficient hygiene dishwashing machine with VarioFlex baskets",
    "price": 38990,
    "salePrice": 33142,
    "rating": 4.5,
    "count": 234,
    "cat": "home-appliances",
    "brand": "bosch",
    "img": "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800",
    "sku": "BSH-DW-12P",
    "stock": 3
  },
  {
    "name": "LG 1.5 Ton 5 Star Inverter AC",
    "slug": "lg-1-5-ton-5star-inverter-ac",
    "desc": "Dual Inverter technology with 4-way swing and Wi-Fi control",
    "price": 42990,
    "salePrice": 36541,
    "rating": 4.6,
    "count": 780,
    "cat": "home-appliances",
    "brand": "lg",
    "img": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800",
    "sku": "LG-AC15-5S",
    "stock": 4
  },
  {
    "name": "Samsung 7kg Front Load Washing Machine",
    "slug": "samsung-7kg-front-load",
    "desc": "EcoBubble technology with steam wash and AddWash door",
    "price": 34990,
    "salePrice": 29741,
    "rating": 4.5,
    "count": 520,
    "cat": "home-appliances",
    "brand": "samsung",
    "img": "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800",
    "sku": "SAM-WM7-FL",
    "stock": 6
  },
  {
    "name": "Philips Air Fryer XL 6.2L",
    "slug": "philips-air-fryer-xl",
    "desc": "Rapid Air technology fries with up to 90% less fat. 1700W digital display",
    "price": 15499,
    "salePrice": 11624,
    "rating": 4.4,
    "count": 1567,
    "cat": "kitchen-appliances",
    "brand": "philips",
    "img": "https://images.unsplash.com/photo-1578643463396-0997cb5328c1?w=800",
    "sku": "PH-AF-XL",
    "stock": 10
  },
  {
    "name": "Prestige Delight Induction Cooktop",
    "slug": "prestige-delight-induction",
    "desc": "1600W induction with feather touch controls and 7 cooking preset menus",
    "price": 2395,
    "salePrice": 1895,
    "rating": 4.3,
    "count": 1200,
    "cat": "kitchen-appliances",
    "brand": "prestige",
    "img": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800",
    "sku": "PRES-IND-1600",
    "stock": 30
  },
  {
    "name": "Hawkins Contura Pressure Cooker 5L",
    "slug": "hawkins-contura-5l",
    "desc": "All-in-one pressure cooker with inner lid design, 5L capacity",
    "price": 2599,
    "salePrice": 2199,
    "rating": 4.7,
    "count": 2100,
    "cat": "cookware",
    "brand": "hawkins",
    "img": "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800",
    "sku": "HAWK-CTR5",
    "stock": 25
  },
  {
    "name": "Prestige Omega Select Plus Kadai 3L",
    "slug": "prestige-omega-kadai-3l",
    "desc": "Non-stick hard anodised kadai with glass lid, induction-compatible",
    "price": 1899,
    "salePrice": 1499,
    "rating": 4.5,
    "count": 1340,
    "cat": "cookware",
    "brand": "prestige",
    "img": "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800",
    "sku": "PRES-KADAI-3L",
    "stock": 30
  },
  {
    "name": "IKEA Poäng Armchair",
    "slug": "ikea-poang-armchair",
    "desc": "Classic layer-glued bent birch frame lounge chair",
    "price": 8999,
    "salePrice": 7649,
    "rating": 4.6,
    "count": 640,
    "cat": "furniture",
    "brand": "ikea",
    "img": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
    "sku": "IK-POANG",
    "stock": 14
  },
  {
    "name": "IKEA KALLAX Shelf Unit 4x2",
    "slug": "ikea-kallax-4x2-shelf",
    "desc": "Versatile shelf unit that can be used as a room divider or TV bench",
    "price": 14999,
    "salePrice": 12999,
    "rating": 4.7,
    "count": 480,
    "cat": "furniture",
    "brand": "ikea",
    "img": "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800",
    "sku": "IK-KALLAX-4X2",
    "stock": 10
  },
  {
    "name": "Philips Hue White & Colour Starter Kit",
    "slug": "philips-hue-starter-kit",
    "desc": "Smart automated home light control kit with 2 E27 bulbs and Hue Bridge.",
    "price": 11499,
    "salePrice": 9199,
    "rating": 4.3,
    "count": 789,
    "cat": "home-decor",
    "brand": "philips",
    "img": "https://images.unsplash.com/photo-1550985616-10810253b84d?w=800",
    "sku": "PH-HUE-KIT",
    "stock": 7
  },
  {
    "name": "IKEA SKUBB Storage Box Set of 6",
    "slug": "ikea-skubb-storage-box-6",
    "desc": "Wardrobe organisation boxes with label holder, set of 6 in white",
    "price": 799,
    "salePrice": 649,
    "rating": 4.5,
    "count": 820,
    "cat": "storage-organization",
    "brand": "ikea",
    "img": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
    "sku": "IK-SKUBB-6P",
    "stock": 50
  },
  {
    "name": "Minimalist 10% Niacinamide Serum",
    "slug": "minimalist-10-niacinamide-serum",
    "desc": "Oil control and pore-minimising serum with 10% niacinamide + zinc",
    "price": 599,
    "salePrice": 499,
    "rating": 4.6,
    "count": 2400,
    "cat": "skincare",
    "brand": "minimalist",
    "img": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800",
    "sku": "MIN-NIA10",
    "stock": 100
  },
  {
    "name": "Dot & Key Vitamin C + E Serum",
    "slug": "dot-key-vitamin-c-serum",
    "desc": "Brightening face serum with 15% Vitamin C and 1% Vitamin E",
    "price": 799,
    "salePrice": 649,
    "rating": 4.5,
    "count": 1800,
    "cat": "skincare",
    "brand": "minimalist",
    "img": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
    "sku": "DK-VCE",
    "stock": 60
  },
  {
    "name": "Dove Intense Repair Shampoo 1L",
    "slug": "dove-intense-repair-shampoo-1l",
    "desc": "Repairs damaged hair with Keratin Actives formula, 1-litre economy bottle",
    "price": 399,
    "salePrice": 319,
    "rating": 4.5,
    "count": 4200,
    "cat": "haircare",
    "brand": "dove",
    "img": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800",
    "sku": "DOVE-IRS-1L",
    "stock": 80
  },
  {
    "name": "L'Oreal Extraordinary Oil Serum 100ml",
    "slug": "loreal-extraordinary-oil-serum",
    "desc": "8-precious oil blend serum for silky, shiny and frizz-free hair",
    "price": 649,
    "salePrice": 519,
    "rating": 4.6,
    "count": 2800,
    "cat": "haircare",
    "brand": "loreal",
    "img": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
    "sku": "LOR-EOS-100ML",
    "stock": 60
  },
  {
    "name": "Lakme 9 to 5 Primer + Matte Lip Color",
    "slug": "lakme-9to5-lip-color",
    "desc": "Long-stay lip color with built-in primer for 16-hour matte finish",
    "price": 399,
    "salePrice": 329,
    "rating": 4.4,
    "count": 3100,
    "cat": "makeup",
    "brand": "lakme",
    "img": "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800",
    "sku": "LK-9T5-LIP",
    "stock": 70
  },
  {
    "name": "Lakme Absolute Skin Natural Foundation",
    "slug": "lakme-absolute-skin-natural-foundation",
    "desc": "Skin-natural finish foundation with SPF 8 and 12-hour coverage",
    "price": 849,
    "salePrice": 679,
    "rating": 4.4,
    "count": 1900,
    "cat": "makeup",
    "brand": "lakme",
    "img": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
    "sku": "LK-ABS-FNDN",
    "stock": 60
  },
  {
    "name": "Maybelline Fit Me Matte + Poreless Foundation",
    "slug": "maybelline-fit-me-foundation",
    "desc": "Blurs pores and controls shine for a natural matte finish",
    "price": 475,
    "salePrice": 380,
    "rating": 4.5,
    "count": 5400,
    "cat": "makeup",
    "brand": "maybelline",
    "img": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800",
    "sku": "MYBL-FITME",
    "stock": 80
  },
  {
    "name": "Fogg Fresh Acqua Body Spray 150ml",
    "slug": "fogg-fresh-acqua-150ml",
    "desc": "Refreshing aquatic fragrance body spray for men with no-gas formula",
    "price": 249,
    "salePrice": 199,
    "rating": 4.3,
    "count": 6200,
    "cat": "fragrances",
    "brand": "fogg",
    "img": "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800",
    "sku": "FOGG-ACQUA",
    "stock": 120
  },
  {
    "name": "Park Avenue Cool Blue Perfume 50ml",
    "slug": "park-avenue-cool-blue-50ml",
    "desc": "Long-lasting aqua-fresh scent with citrus and musk top notes",
    "price": 399,
    "salePrice": 319,
    "rating": 4.4,
    "count": 2100,
    "cat": "fragrances",
    "brand": "fogg",
    "img": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800",
    "sku": "PA-COOLBLUE",
    "stock": 80
  },
  {
    "name": "Philips OneBlade Hybrid Trimmer",
    "slug": "philips-oneblade-trimmer",
    "desc": "Trim, edge and shave any length of hair with dual-sided blade.",
    "price": 2199,
    "salePrice": 1759,
    "rating": 4.2,
    "count": 1023,
    "cat": "grooming",
    "brand": "philips",
    "img": "https://images.unsplash.com/photo-1621607511815-68424fec745f?w=800",
    "sku": "PH-ONEBLADE",
    "stock": 50
  },
  {
    "name": "Strauss Adjustable Dumbbell Set 10kg",
    "slug": "strauss-adjustable-dumbbell-10kg",
    "desc": "PVC-coated adjustable dumbbell pair with weight plates, 10kg set",
    "price": 1299,
    "salePrice": 999,
    "rating": 4.4,
    "count": 780,
    "cat": "fitness-equipment",
    "brand": "decathlon",
    "img": "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800",
    "sku": "STR-DB-10KG",
    "stock": 30
  },
  {
    "name": "Decathlon Corength Yoga Mat 8mm",
    "slug": "decathlon-yoga-mat-8mm",
    "desc": "Anti-slip 8mm cushioned yoga mat with carry strap and TPE material",
    "price": 999,
    "salePrice": 799,
    "rating": 4.6,
    "count": 1400,
    "cat": "fitness-equipment",
    "brand": "decathlon",
    "img": "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800",
    "sku": "DEC-YOGA-8MM",
    "stock": 50
  },
  {
    "name": "Razer Tactical Pro Backpack V2",
    "slug": "razer-tactical-backpack-v2",
    "desc": "Ultra-durable 15.6-inch laptop gaming and esports travel backpack",
    "price": 12999,
    "salePrice": 10399,
    "rating": 4.5,
    "count": 320,
    "cat": "gaming-accessories",
    "brand": "razer",
    "img": "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800",
    "sku": "RZ-TACTICAL-BP",
    "stock": 6
  },
  {
    "name": "Nike Dri-FIT Resistance Band Set",
    "slug": "nike-dri-fit-resistance-band",
    "desc": "Set of 3 resistance bands for strength training and mobility work",
    "price": 1295,
    "salePrice": 995,
    "rating": 4.5,
    "count": 640,
    "cat": "gym-accessories",
    "brand": "nike",
    "img": "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800",
    "sku": "NK-RESBND",
    "stock": 35
  },
  {
    "name": "Decathlon Triban RC120 Bike",
    "slug": "decathlon-triban-rc120",
    "desc": "Reliable entry level disc brake road bike with Shimano 7-speed drivetrain",
    "price": 39999,
    "salePrice": 35999,
    "rating": 4.5,
    "count": 140,
    "cat": "cycling",
    "brand": "decathlon",
    "img": "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800",
    "sku": "DEC-TRIBAN-RC120",
    "stock": 2
  },
  {
    "name": "Decathlon BTwin 500 Mountain Bike",
    "slug": "decathlon-btwin-500-mtb",
    "desc": "27.5-inch hardtail MTB with mechanical disc brakes",
    "price": 22999,
    "salePrice": 19999,
    "rating": 4.6,
    "count": 210,
    "cat": "cycling",
    "brand": "decathlon",
    "img": "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800",
    "sku": "DEC-BTWIN500",
    "stock": 4
  },
  {
    "name": "Yonex Arcsaber 11 Pro Badminton Racket",
    "slug": "yonex-arcsaber-11-pro",
    "desc": "ISOMETRIC frame with Arc-Saber technology, stiff shaft",
    "price": 12999,
    "salePrice": 10999,
    "rating": 4.8,
    "count": 520,
    "cat": "outdoor-sports",
    "brand": "yonex",
    "img": "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800",
    "sku": "YNX-ARC11P",
    "stock": 8
  },
  {
    "name": "Sony PlayStation 5 Console Slim",
    "slug": "sony-playstation-5-slim",
    "desc": "Unleash next-generation gaming speed and 4K ultra-high resolution HDR graphics.",
    "price": 44990,
    "salePrice": 42740,
    "rating": 4.8,
    "count": 3892,
    "cat": "gaming-consoles",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800",
    "sku": "PS5-SLIM-DIG",
    "stock": 15
  },
  {
    "name": "Nintendo Switch OLED Model",
    "slug": "nintendo-switch-oled",
    "desc": "Stunning 7-inch OLED portable console with Joy-Con controllers",
    "price": 31990,
    "salePrice": 28151,
    "rating": 4.7,
    "count": 2234,
    "cat": "gaming-consoles",
    "brand": "nintendo",
    "img": "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?w=800",
    "sku": "NIN-SWITCH-OLED",
    "stock": 12
  },
  {
    "name": "Microsoft Xbox Series X",
    "slug": "xbox-series-x-1tb",
    "desc": "Fastest most powerful premium gaming console with 1TB NVMe SSD",
    "price": 54990,
    "salePrice": 49491,
    "rating": 4.6,
    "count": 1876,
    "cat": "gaming-consoles",
    "brand": "microsoft",
    "img": "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=800",
    "sku": "MS-XBOX-SX",
    "stock": 11
  },
  {
    "name": "Elden Ring PS5 Edition",
    "slug": "elden-ring-ps5",
    "desc": "Action RPG set in the Lands Between, winner of Game of the Year.",
    "price": 3499,
    "salePrice": 1924,
    "rating": 4.9,
    "count": 5123,
    "cat": "games",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800",
    "sku": "GAME-ELDEN-PS5",
    "stock": 30
  },
  {
    "name": "The Legend of Zelda: Tears of the Kingdom",
    "slug": "zelda-totk-switch",
    "desc": "Epic adventure across Hyrule land and sky.",
    "price": 4299,
    "salePrice": 3869,
    "rating": 4.9,
    "count": 3200,
    "cat": "games",
    "brand": "nintendo",
    "img": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=800",
    "sku": "GAME-ZELDA-TOTK",
    "stock": 15
  },
  {
    "name": "Marvel's Spider-Man 2 PS5",
    "slug": "spiderman-2-ps5",
    "desc": "Swing across a bigger New York as Peter Parker and Miles Morales",
    "price": 4499,
    "salePrice": 3824,
    "rating": 4.8,
    "count": 2800,
    "cat": "games",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800",
    "sku": "GAME-SM2-PS5",
    "stock": 20
  },
  {
    "name": "Sony DualSense Wireless Controller",
    "slug": "ps5-dualsense-controller",
    "desc": "Haptic feedback and adaptive trigger controller for PS5.",
    "price": 5990,
    "salePrice": 5391,
    "rating": 4.6,
    "count": 2034,
    "cat": "controllers",
    "brand": "sony",
    "img": "https://images.unsplash.com/photo-1600861195091-690c92f1d2cc?w=800",
    "sku": "PS5-DS-CTRL",
    "stock": 24
  },
  {
    "name": "Xbox Wireless Controller Carbon Black",
    "slug": "xbox-wireless-controller",
    "desc": "Classic ergonomic controller with custom grip and Bluetooth.",
    "price": 5590,
    "salePrice": 4192,
    "rating": 4.4,
    "count": 1230,
    "cat": "controllers",
    "brand": "microsoft",
    "img": "https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=800",
    "sku": "MS-XBOX-CTRL",
    "stock": 25
  },
  {
    "name": "Razer Viper V3 Pro Mouse",
    "slug": "razer-viper-v3-pro",
    "desc": "Symmetrical wireless 8K polling esport mouse, ultra-lightweight 58g.",
    "price": 14999,
    "salePrice": 10499,
    "rating": 4.7,
    "count": 923,
    "cat": "gaming-accessories",
    "brand": "razer",
    "img": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
    "sku": "RZ-VIPER-V3PRO",
    "stock": 10
  },
  {
    "name": "Razer BlackWidow V4 Pro Keyboard",
    "slug": "razer-blackwidow-v4-pro",
    "desc": "Mechanical gaming keyboard with Razer Green switches and RGB Chroma",
    "price": 19999,
    "salePrice": 16999,
    "rating": 4.7,
    "count": 420,
    "cat": "gaming-accessories",
    "brand": "razer",
    "img": "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800",
    "sku": "RZ-BWV4PRO",
    "stock": 8
  },
  {
    "name": "Lays India Magic Masala Chips 52g",
    "slug": "lays-india-magic-masala",
    "desc": "India's favourite spiced potato chips with magic masala seasoning",
    "price": 20,
    "salePrice": 18,
    "rating": 4.5,
    "count": 4800,
    "cat": "snacks",
    "brand": "pepsico",
    "img": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800",
    "sku": "LAYS-MAGIC-52G",
    "stock": 150
  },
  {
    "name": "Too Yumm! Multigrain Chips 35g",
    "slug": "too-yumm-multigrain-chips",
    "desc": "Baked not fried multigrain chips in tangy tomato flavour",
    "price": 15,
    "salePrice": 13,
    "rating": 4.3,
    "count": 2100,
    "cat": "snacks",
    "brand": "pepsico",
    "img": "https://images.unsplash.com/photo-1599490659223-eb5222decbaf?w=800",
    "sku": "TYUM-MULTI-35G",
    "stock": 200
  },
  {
    "name": "Coca-Cola Zero Sugar Can 300ml",
    "slug": "coke-zero-sugar-can",
    "desc": "Refreshing sugar free fizzy cola beverage can.",
    "price": 40,
    "salePrice": 35,
    "rating": 4.4,
    "count": 3200,
    "cat": "beverages",
    "brand": "coca-cola",
    "img": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800",
    "sku": "COKE-ZERO-CAN",
    "stock": 200
  },
  {
    "name": "Tropicana Orange Juice 1L",
    "slug": "tropicana-orange-juice-1l",
    "desc": "100% fruit juice with no added sugar and no preservatives",
    "price": 110,
    "salePrice": 95,
    "rating": 4.5,
    "count": 1800,
    "cat": "beverages",
    "brand": "pepsico",
    "img": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800",
    "sku": "TROP-OJ-1L",
    "stock": 100
  },
  {
    "name": "Maggi 2-Minute Masala Noodles 70g × 12",
    "slug": "maggi-masala-noodles-12pk",
    "desc": "Iconic instant noodles with signature masala taste. Pack of 12",
    "price": 156,
    "salePrice": 140,
    "rating": 4.7,
    "count": 8900,
    "cat": "packaged-foods",
    "img": "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800",
    "sku": "MAGGI-MSL-12PK",
    "stock": 100
  },
  {
    "name": "Amul Butter 500g",
    "slug": "amul-butter-500g",
    "desc": "Pasteurised cream butter made from cow milk. 500g pack",
    "price": 285,
    "salePrice": 275,
    "rating": 4.9,
    "count": 6700,
    "cat": "packaged-foods",
    "img": "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=800",
    "sku": "AMUL-BUTR-500G",
    "stock": 80
  },
  {
    "name": "Surf Excel Matic Liquid 2L",
    "slug": "surf-excel-matic-liquid-2l",
    "desc": "Front load washing machine liquid detergent for stain removal",
    "price": 375,
    "salePrice": 329,
    "rating": 4.6,
    "count": 2400,
    "cat": "household-essentials",
    "img": "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=800",
    "sku": "SURF-MATIC-2L",
    "stock": 80
  },
  {
    "name": "Clean Code: A Handbook of Agile Software Craftsmanship",
    "slug": "clean-code-book",
    "desc": "Must-read book for writing clean, maintainable code.",
    "price": 699,
    "salePrice": 615,
    "rating": 4.6,
    "count": 3012,
    "cat": "programming",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800",
    "sku": "BOOK-CLEAN-CODE",
    "stock": 20
  },
  {
    "name": "Atomic Habits by James Clear",
    "slug": "atomic-habits-book",
    "desc": "Tiny changes, remarkable results self development guide.",
    "price": 499,
    "salePrice": 409,
    "rating": 4.8,
    "count": 6723,
    "cat": "self-help",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800",
    "sku": "BOOK-ATOMIC-HABITS",
    "stock": 50
  },
  {
    "name": "Start with Why by Simon Sinek",
    "slug": "start-with-why-book",
    "desc": "How great leaders inspire everyone to take action.",
    "price": 599,
    "salePrice": 527,
    "rating": 4.5,
    "count": 1876,
    "cat": "business",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800",
    "sku": "BOOK-START-WITH-WHY",
    "stock": 15
  },
  {
    "name": "The Alchemist by Paulo Coelho",
    "slug": "the-alchemist-paulo-coelho",
    "desc": "A mystical story of Santiago's journey to find treasure and wisdom",
    "price": 299,
    "salePrice": 249,
    "rating": 4.7,
    "count": 4100,
    "cat": "fiction",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800",
    "sku": "BOOK-ALCHEMIST",
    "stock": 60
  },
  {
    "name": "NCERT Physics Class 12 Part 1",
    "slug": "ncert-physics-class12-p1",
    "desc": "NCERT standard textbook for CBSE Class 12 Physics — Part 1",
    "price": 150,
    "salePrice": 135,
    "rating": 4.5,
    "count": 1200,
    "cat": "academic",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800",
    "sku": "NCERT-PHY12",
    "stock": 200
  },
  {
    "name": "Refactoring: Improving the Design of Existing Code",
    "slug": "refactoring-improving-design-code",
    "desc": "Martin Fowler software design classic on refactoring principles and code smells.",
    "price": 899,
    "salePrice": 799,
    "rating": 4.8,
    "count": 1500,
    "cat": "programming",
    "brand": "penguin",
    "img": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800",
    "sku": "BOOK-REFACTORING",
    "stock": 15
  }
];

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of catalog) {
      const categoryId = catMap[item.cat] || parentMap['Electronics'];
      const brandId = item.brand ? (brandMap[item.brand] || undefined) : undefined;

      const existing = await this.prisma.product.findUnique({ where: { slug: item.slug } });

      if (existing) {
        await this.prisma.product.update({
          where: { slug: item.slug },
          data: {
            name: item.name,
            description: item.desc,
            basePrice: item.price,
            salePrice: item.salePrice || null,
            averageRating: item.rating || 0,
            reviewCount: item.count || 0,
            status: ProductStatus.ACTIVE,
            categoryId,
            brandId,
            images: {
              deleteMany: {},
              create: [
                {
                  url: item.img || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                  alt: item.name,
                  sortOrder: 1,
                },
              ],
            },
          },
        });
        updatedCount++;
      } else {
        await this.prisma.product.create({
          data: {
            name: item.name,
            slug: item.slug,
            description: item.desc,
            basePrice: item.price,
            salePrice: item.salePrice || null,
            averageRating: item.rating || 0,
            reviewCount: item.count || 0,
            status: ProductStatus.ACTIVE,
            sellerId: seller.id,
            categoryId,
            brandId,
            images: {
              create: [
                {
                  url: item.img || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
                  alt: item.name,
                  sortOrder: 1,
                },
              ],
            },
            variants: {
              create: [
                {
                  sku: item.sku,
                  color: 'Default',
                  size: 'Standard',
                  price: item.price,
                  inventory: {
                    create: {
                      quantity: item.stock,
                    },
                  },
                },
              ],
            },
          },
        });
        createdCount++;
      }
    }

    const [totalCats, totalBrands, totalProducts] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.brand.count(),
      this.prisma.product.count(),
    ]);

    console.log(`[seedCatalog] Finished! Total categories: ${totalCats}, Brands: ${totalBrands}, Products: ${totalProducts}`);

    return {
      status: 'SUCCESS',
      message: `Catalog seed completed successfully. ${createdCount} created, ${updatedCount} updated.`,
      meta: {
        totalCategories: totalCats,
        totalBrands: totalBrands,
        totalProducts: totalProducts,
        createdProducts: createdCount,
        updatedProducts: updatedCount,
      },
    };
  }

  async seedHistory() {
    console.log('[seedHistory] Seeding 30-day historical trend orders...');
    const customerUser = await this.prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    const supportUser = await this.prisma.user.findFirst({ where: { role: 'SUPPORT' } });
    const seller = await this.prisma.seller.findFirst();

    if (!customerUser || !seller) {
      return { status: 'ERROR', message: 'Customer or Seller not found in DB.' };
    }

    const products = await this.prisma.product.findMany({
      take: 20,
      include: { variants: true },
    });

    if (products.length === 0) {
      return { status: 'ERROR', message: 'No products found in DB.' };
    }

    const now = new Date();
    const historicalSeedSpecs = [
      { daysAgo: 28, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 0 },
      { daysAgo: 27, qty: 2, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 1 },
      { daysAgo: 25, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 2 },
      { daysAgo: 24, qty: 1, status: OrderStatus.CANCELLED, payStatus: PaymentStatus.FAILED, prodIdx: 3 },
      { daysAgo: 22, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 4 },
      { daysAgo: 21, qty: 2, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 5 },
      { daysAgo: 19, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 6 },
      { daysAgo: 18, qty: 1, status: OrderStatus.PENDING,   payStatus: PaymentStatus.PENDING,   prodIdx: 7 },
      { daysAgo: 16, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 8 },
      { daysAgo: 15, qty: 2, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 9 },
      { daysAgo: 14, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 10 },
      { daysAgo: 12, qty: 1, status: OrderStatus.SHIPPED,   payStatus: PaymentStatus.COMPLETED, prodIdx: 11 },
      { daysAgo: 11, qty: 1, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 12 },
      { daysAgo: 9,  qty: 2, status: OrderStatus.DELIVERED, payStatus: PaymentStatus.COMPLETED, prodIdx: 13 },
      { daysAgo: 8,  qty: 1, status: OrderStatus.CANCELLED, payStatus: PaymentStatus.FAILED, prodIdx: 14 },
      { daysAgo: 7,  qty: 1, status: OrderStatus.SHIPPED,   payStatus: PaymentStatus.COMPLETED, prodIdx: 15 },
      { daysAgo: 6,  qty: 1, status: OrderStatus.PROCESSING, payStatus: PaymentStatus.COMPLETED, prodIdx: 16 },
      { daysAgo: 5,  qty: 2, status: OrderStatus.PROCESSING, payStatus: PaymentStatus.COMPLETED, prodIdx: 17 },
      { daysAgo: 4,  qty: 1, status: OrderStatus.PENDING,   payStatus: PaymentStatus.PENDING,   prodIdx: 18 },
      { daysAgo: 3,  qty: 1, status: OrderStatus.PROCESSING, payStatus: PaymentStatus.COMPLETED, prodIdx: 19 },
      { daysAgo: 2,  qty: 1, status: OrderStatus.PROCESSING, payStatus: PaymentStatus.COMPLETED, prodIdx: 0 },
      { daysAgo: 1,  qty: 2, status: OrderStatus.PROCESSING, payStatus: PaymentStatus.COMPLETED, prodIdx: 1 },
    ];

    let seededCount = 0;

    for (let idx = 0; idx < historicalSeedSpecs.length; idx++) {
      const spec = historicalSeedSpecs[idx];
      const orderId = `hist-demo-order-${idx + 1}`;

      const existing = await this.prisma.order.findUnique({ where: { id: orderId } });
      if (existing) continue;

      const prodSample = products[spec.prodIdx % products.length];
      const variant = prodSample.variants[0];
      const itemPrice = Number(variant ? variant.price : prodSample.basePrice);
      const qty = spec.qty;
      const itemTotal = itemPrice * qty;
      const tax = Number((itemTotal * 0.18).toFixed(2));
      const shipping = 50;
      const total = itemTotal + tax + shipping;
      const orderDate = new Date(now.valueOf() - spec.daysAgo * 86400 * 1000);

      await this.prisma.order.create({
        data: {
          id: orderId,
          userId: idx % 2 === 0 ? customerUser.id : (supportUser ? supportUser.id : customerUser.id),
          status: spec.status,
          subtotal: itemTotal,
          discount: 0,
          tax,
          shippingFee: shipping,
          total,
          createdAt: orderDate,
          shippingAddress: {
            name: 'Demo Customer',
            street: '45 MG Road',
            city: 'Bangalore',
            state: 'Karnataka',
            postalCode: '560001',
            country: 'India',
            phone: '9876543210',
          } as any,
          items: {
            create: [
              {
                productId: prodSample.id,
                variantId: variant ? variant.id : 'default-variant',
                sellerId: prodSample.sellerId || seller.id,
                quantity: qty,
                price: itemPrice,
              },
            ],
          },
          payments: {
            create: [
              {
                provider: spec.payStatus === PaymentStatus.PENDING ? 'COD' : 'RAZORPAY',
                amount: total,
                status: spec.payStatus,
              },
            ],
          },
        },
      });

      seededCount++;
    }

    return {
      status: 'SUCCESS',
      message: `Historical demo order seeding completed successfully. ${seededCount} orders created across 28 days.`,
    };
  }
}

