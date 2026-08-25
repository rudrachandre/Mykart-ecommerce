'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Cookies from 'js-cookie';
import { createProduct, updateProduct } from '@/lib/api/sellers';

interface ProductFormProps {
  initialData?: any;
  categories: any[];
  brands: any[];
  adminMode?: boolean;
  sellerId?: string;
}

export function ProductForm({ initialData, categories, brands, adminMode = false, sellerId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    basePrice: initialData?.basePrice || 0,
    categoryId: initialData?.categoryId || categories[0]?.id || '',
    brandId: initialData?.brandId || '',
    status: initialData?.status || 'DRAFT',
    variants: initialData?.variants
      ? initialData.variants.map((v: any) => ({
          ...v,
          // List endpoints serialize Prisma Decimals as strings; coerce so the
          // update payload passes the API's @IsNumber() validation.
          price: v.price != null ? Number(v.price) : 0,
          inventory: { quantity: Number(v.inventory?.quantity ?? 0) },
        }))
      : [
      { sku: '', price: 0, inventory: { quantity: 0 } }
    ],
    images: initialData?.images || []
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'basePrice' ? parseFloat(value) || 0 : value 
    }));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const newVariants = [...formData.variants];
    if (field === 'quantity') {
      newVariants[index].inventory.quantity = parseInt(value) || 0;
    } else if (field === 'price') {
      newVariants[index][field] = parseFloat(value) || 0;
    } else {
      newVariants[index][field] = value;
    }
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { sku: '', price: 0, inventory: { quantity: 0 } }]
    }));
  };

  const removeVariant = (index: number) => {
    const newVariants = [...formData.variants];
    newVariants.splice(index, 1);
    setFormData(prev => ({ ...prev, variants: newVariants }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = Cookies.get('accessToken');
      if (!token) throw new Error('Not authenticated');

      const payload: any = { ...formData };
      // Optional UUID fields must be omitted - not sent as "" - because
      // class-validator @IsOptional() still rejects empty strings against
      // @IsUUID(), which made no-brand submissions fail with 400.
      if (!payload.brandId) delete payload.brandId;
      if (!payload.sellerId) delete payload.sellerId;
      if (adminMode && sellerId) {
        payload.sellerId = sellerId;
      }

      if (initialData) {
        // Edit
        await updateProduct(token, initialData.id, payload);
      } else {
        // Create
        await createProduct(token, payload);
      }
      
      if (adminMode && sellerId) {
        router.push(`/admin/sellers/${sellerId}`);
      } else {
        router.push('/seller/products');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-card p-6 border rounded-lg">
      {error && <div className="bg-destructive/10 text-destructive p-4 rounded-md text-sm">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Product Name</label>
          <input 
            type="text" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background" 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Slug</label>
          <input 
            type="text" 
            name="slug" 
            value={formData.slug} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background" 
            required 
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            title="Only lowercase letters, numbers, and hyphens"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium">Description</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background min-h-[100px]" 
            required 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Base Price</label>
          <input 
            type="number" 
            step="0.01" 
            name="basePrice" 
            value={formData.basePrice} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background" 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select 
            name="status" 
            value={formData.status} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <select 
            name="categoryId" 
            value={formData.categoryId} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background" 
            required
          >
            <option value="">Select Category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Brand (Optional)</label>
          <select 
            name="brandId" 
            value={formData.brandId || ''} 
            onChange={handleChange} 
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="">Select Brand</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Variants & Inventory</h3>
          <Button type="button" variant="outline" size="sm" onClick={addVariant}>Add Variant</Button>
        </div>
        
        <div className="space-y-4">
          {formData.variants.map((variant: any, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-md bg-muted/20 relative">
              <div className="space-y-2">
                <label className="text-xs font-medium">SKU</label>
                <input 
                  type="text" 
                  value={variant.sku} 
                  onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} 
                  className="w-full p-2 border rounded-md bg-background text-sm" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Price</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={variant.price} 
                  onChange={(e) => handleVariantChange(index, 'price', e.target.value)} 
                  className="w-full p-2 border rounded-md bg-background text-sm" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Quantity</label>
                <input 
                  type="number" 
                  value={variant.inventory?.quantity || 0} 
                  onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)} 
                  className="w-full p-2 border rounded-md bg-background text-sm" 
                  required 
                />
              </div>
              <div className="flex items-end pb-1">
                {formData.variants.length > 1 && (
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeVariant(index)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Images</h3>
          <Button type="button" variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, { url: '', alt: '' }] }))}>Add Image</Button>
        </div>
        <div className="space-y-4">
          {formData.images.map((img: any, index: number) => (
            <div key={index} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium">Cloudinary Image URL</label>
                <input type="url" value={img.url} onChange={(e) => {
                  const newImages = [...formData.images];
                  newImages[index].url = e.target.value;
                  setFormData(prev => ({ ...prev, images: newImages }));
                }} className="w-full p-2 border rounded-md bg-background text-sm" placeholder="https://res.cloudinary.com/..." required />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium">Alt Text</label>
                <input type="text" value={img.alt} onChange={(e) => {
                  const newImages = [...formData.images];
                  newImages[index].alt = e.target.value;
                  setFormData(prev => ({ ...prev, images: newImages }));
                }} className="w-full p-2 border rounded-md bg-background text-sm" />
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => {
                const newImages = [...formData.images];
                newImages.splice(index, 1);
                setFormData(prev => ({ ...prev, images: newImages }));
              }}>Remove</Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (initialData ? 'Update Product' : 'Create Product')}
        </Button>
      </div>
    </form>
  );
}
