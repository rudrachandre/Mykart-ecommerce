/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCategories } from '@/lib/api/catalog';
import Link from 'next/link';

export const metadata = {
  title: 'Categories | MyKart',
  description: 'Browse all categories',
};

const FALLBACK_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Computers, mobiles, audio, cameras and smart tech accessories',
    children: [
      { id: 'sub-1', name: 'Smartphones', slug: 'smartphones' },
      { id: 'sub-2', name: 'Laptops', slug: 'laptops' },
      { id: 'sub-3', name: 'Headphones & Earbuds', slug: 'headphones-earbuds' },
      { id: 'sub-4', name: 'Monitors', slug: 'monitors' },
      { id: 'sub-5', name: 'Keyboards & Mice', slug: 'keyboards-mice' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Fashion',
    slug: 'fashion',
    description: 'Apparel, shoes, bags and style accessories',
    children: [
      { id: 'sub-6', name: "Men's Clothing", slug: 'mens-clothing' },
      { id: 'sub-7', name: "Women's Clothing", slug: 'womens-clothing' },
      { id: 'sub-8', name: 'Shoes', slug: 'shoes' },
      { id: 'sub-9', name: 'Bags', slug: 'bags' },
      { id: 'sub-10', name: 'Watches', slug: 'watches' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Beauty & Personal Care',
    slug: 'beauty-personal-care',
    description: 'Cosmetics, skincare, hair care and grooming essentials',
    children: [
      { id: 'sub-11', name: 'Skincare', slug: 'skincare' },
      { id: 'sub-12', name: 'Makeup', slug: 'makeup' },
      { id: 'sub-13', name: 'Hair Care', slug: 'haircare' },
      { id: 'sub-14', name: 'Fragrances', slug: 'fragrances' },
      { id: 'sub-15', name: 'Grooming', slug: 'grooming' },
    ],
  },
  {
    id: 'cat-4',
    name: 'Gaming',
    slug: 'gaming',
    description: 'Consoles, gaming laptops, accessories and video games',
    children: [
      { id: 'sub-16', name: 'Gaming Consoles', slug: 'gaming-consoles' },
      { id: 'sub-17', name: 'Gaming Laptops', slug: 'gaming-laptops' },
      { id: 'sub-18', name: 'Controllers', slug: 'controllers' },
      { id: 'sub-19', name: 'Games', slug: 'games' },
    ],
  },
  {
    id: 'cat-5',
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Home appliances, cookware, furniture and organization',
    children: [
      { id: 'sub-20', name: 'Home Appliances', slug: 'home-appliances' },
      { id: 'sub-21', name: 'Kitchen Appliances', slug: 'kitchen-appliances' },
      { id: 'sub-22', name: 'Cookware', slug: 'cookware' },
      { id: 'sub-23', name: 'Furniture', slug: 'furniture' },
    ],
  },
  {
    id: 'cat-6',
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    description: 'Gym equipment, cycling, outdoor sports and activewear',
    children: [
      { id: 'sub-24', name: 'Fitness Equipment', slug: 'fitness-equipment' },
      { id: 'sub-25', name: 'Cycling', slug: 'cycling' },
      { id: 'sub-26', name: 'Outdoor Sports', slug: 'outdoor-sports' },
    ],
  },
  {
    id: 'cat-7',
    name: 'Books',
    slug: 'books',
    description: 'Programming, academic textbooks, business and self-help',
    children: [
      { id: 'sub-27', name: 'Programming', slug: 'programming' },
      { id: 'sub-28', name: 'Self Help', slug: 'self-help' },
      { id: 'sub-29', name: 'Business', slug: 'business' },
      { id: 'sub-30', name: 'Academic', slug: 'academic' },
    ],
  },
  {
    id: 'cat-8',
    name: 'Grocery',
    slug: 'grocery',
    description: 'Snacks, beverages, packaged foods and household essentials',
    children: [
      { id: 'sub-31', name: 'Snacks', slug: 'snacks' },
      { id: 'sub-32', name: 'Beverages', slug: 'beverages' },
      { id: 'sub-33', name: 'Packaged Foods', slug: 'packaged-foods' },
    ],
  },
];

export default async function CategoriesPage() {
  const fetchedCategories = await getCategories().catch(() => []);
  const categories = fetchedCategories && fetchedCategories.length > 0 ? fetchedCategories : FALLBACK_CATEGORIES;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Categories</h1>
      <p className="text-muted-foreground mb-8">Explore our full product catalog across all categories.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category: any) => (
          <div 
            key={category.id}
            className="flex flex-col p-6 rounded-lg border bg-card hover:border-foreground/50 transition-colors shadow-xs"
          >
            <Link 
              href={`/products?categorySlug=${category.slug}`} 
              className="text-xl font-semibold mb-2 hover:underline text-foreground"
            >
              {category.name}
            </Link>
            {category.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{category.description}</p>
            )}

            {category.children && category.children.length > 0 && (
              <div className="mt-auto pt-4 border-t border-border/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Subcategories ({category.children.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {category.children.map((sub: any) => (
                    <Link
                      key={sub.id}
                      href={`/products?categorySlug=${sub.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


