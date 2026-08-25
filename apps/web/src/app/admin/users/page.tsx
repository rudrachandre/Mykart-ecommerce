'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getUsers } from '@/lib/api/admin';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [data, setData] = useState<{ users: any[], total: number }>({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const limit = 10;
  
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const skip = (page - 1) * limit;
        const result = await getUsers(token, skip, limit, search, role);
        setData(result);
      } catch (err: any) {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [router, page, search, role]);

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Users ({data.total})</h1>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="border p-2 rounded w-64 bg-background"
          />
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="border p-2 rounded bg-background"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customer</option>
            <option value="SELLER">Seller</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="text-red-500 bg-red-100 p-4 rounded">{error}</div>
      ) : (
        <>
          <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 font-medium">
                <tr>
                  <th className="px-4 py-3 border-b">ID</th>
                  <th className="px-4 py-3 border-b">Name</th>
                  <th className="px-4 py-3 border-b">Email</th>
                  <th className="px-4 py-3 border-b">Role</th>
                  <th className="px-4 py-3 border-b">Joined</th>
                  <th className="px-4 py-3 border-b">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data.users.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No users found.</td></tr>
                ) : (
                  data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{user.id.slice(-8)}</td>
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-primary/20 text-primary' : user.role === 'SELLER' ? 'bg-orange-500/20 text-orange-600' : 'bg-muted'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => toast.info('Admin user view — coming soon')}>
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {data.users.length} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
