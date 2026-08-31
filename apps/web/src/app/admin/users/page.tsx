'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getUsers, changeUserRole } from '@/lib/api/admin';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [data, setData] = useState<{ users: any[], total: number }>({ users: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const limit = 10;

  const router = useRouter();

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

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [router, page, search, role]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const token = Cookies.get('accessToken');
    if (!token) return;

    try {
      setUpdatingId(userId);
      await changeUserRole(token, userId, newRole);
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

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
              <thead className="bg-muted/50 font-medium border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Current Role</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4 text-right">Role Modifier</th>
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
                      <td className="px-6 py-4 font-mono text-xs">{user.id.slice(-8)}</td>
                      <td className="px-6 py-4 font-medium">{user.name}</td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-primary/20 text-primary' : user.role === 'SELLER' ? 'bg-orange-500/20 text-orange-600' : 'bg-muted text-muted-foreground'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={user.role}
                          disabled={updatingId === user.id}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="border p-1 rounded bg-background text-xs"
                        >
                          <option value="CUSTOMER">CUSTOMER</option>
                          <option value="SELLER">SELLER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-xs text-muted-foreground">
              Showing {data.users.length} of {data.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
