'use client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export default function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const { refreshCart } = useCart();

  const handleLogout = async () => {
    logout();
    await refreshCart(); // Clear cart context
    router.push('/');
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-destructive/10 text-destructive text-sm font-medium transition-colors"
    >
      <LogOut className="w-4 h-4" /> Logout
    </button>
  );
}
