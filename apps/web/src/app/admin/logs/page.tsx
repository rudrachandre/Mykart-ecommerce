'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getAuditLogs } from '@/lib/api/analytics';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchLogs = async () => {
      const token = Cookies.get('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const data = await getAuditLogs(token);
        setLogs(data);
      } catch (err: any) {
        setError('Failed to load audit logs. Make sure you are an admin.');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>
      
      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 font-medium">
            <tr>
              <th className="px-4 py-3 border-b">Date</th>
              <th className="px-4 py-3 border-b">Action</th>
              <th className="px-4 py-3 border-b">User Email</th>
              <th className="px-4 py-3 border-b">Entity ID</th>
              <th className="px-4 py-3 border-b">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-semibold text-primary">{log.action}</td>
                <td className="px-4 py-3">{log.user?.email || 'Unknown'}</td>
                <td className="px-4 py-3 text-muted-foreground">{log.entityId || '-'}</td>
                <td className="px-4 py-3">
                  <pre className="text-xs bg-muted p-1 rounded">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
