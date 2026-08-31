'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { getCategories } from '@/lib/api/catalog';
import { createCategory, updateCategory, deleteCategory } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FolderOpen, Edit, Trash, Plus } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [showForm, setShowForm] = useState(false);
  const token = Cookies.get('accessToken') || '';

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (category: any) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(token, id);
      toast.success('Category deleted');
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Slug is automatically generated on the backend from name.
      if (editingId) {
        await updateCategory(token, editingId, formData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(token, formData);
        toast.success('Category created successfully');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '' });
      loadCategories();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/admin" className="text-sm text-primary hover:underline mb-2 block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="w-8 h-8 text-primary" /> Platform Categories
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage product catalog taxonomies.</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); }} className="gap-2">
          <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'Create Category'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card p-6 border rounded-lg mb-8 space-y-6">
          <h2 className="text-xl font-bold">{editingId ? 'Edit Category' : 'Create Category'}</h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background text-sm"
                required
                placeholder="Electronics, Fashion, Books..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-background min-h-[100px] text-sm"
                placeholder="Description of category..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingId ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <p className="text-lg text-muted-foreground">No categories defined yet.</p>
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 font-medium">{category.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{category.slug}</td>
                  <td className="px-6 py-4 text-xs text-muted-foreground line-clamp-1 max-w-sm mt-3 border-none">
                    {category.description || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(category.id)}>
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
