'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getAuditLogs } from '@/lib/api/analytics';
import { Button } from '@/components/ui/button';
import { FileText, Search, Activity } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const limit = 20;

  const router = useRouter();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const skip = (page - 1) * limit;
        const data = await getAuditLogs(token, skip, limit, action || undefined);
        setLogs(data.logs);
        setTotal(data.total);
      } catch (err: any) {
        setError('Failed to load audit logs. Make sure you are an admin.');
      } finally {
        setLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchLogs();
    }, 300);

    return () => clearTimeout(timeout);
  }, [router, page, action]);

  const totalPages = Math.ceil(total / limit);

  if (error) return <div className="text-red-500 p-6">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" /> Audit Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Platform-wide changes and administrative history.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter by action..."
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="border p-2 pl-9 rounded bg-background w-64 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 font-medium text-muted-foreground border-b text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Actor Email</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Entity ID</th>
              <th className="px-6 py-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  Loading audit log history...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                  No audit logs recorded for this action.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30">
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-foreground">{log.user?.email || 'System'}</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold uppercase">
                      {log.user?.role || 'SYSTEM'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-xs text-primary">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    {log.entityId || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <pre className="text-[10px] bg-muted/50 p-2 rounded max-h-32 overflow-y-auto max-w-md font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-xs text-muted-foreground">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
