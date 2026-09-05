'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function UserDropdown() {
  const { user, loading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return <div className="h-5 w-5 animate-pulse bg-muted rounded-full" />;
  }

  if (!user) {
    return (
      <Link href="/login" className="hover:text-primary transition-colors">
        Sign in
      </Link>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none flex items-center gap-2"
      >
        <UserIcon className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-popover border shadow-lg rounded-lg z-50 flex flex-col py-2">
            <div className="px-4 py-2 border-b mb-1">
              <p className="text-sm font-medium truncate">{user.firstName ? `${user.firstName} ${user.lastName}` : 'My Account'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            
            <Link 
              href="/account" 
              className="px-4 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              My Account
            </Link>
            
            <Link 
              href="/orders" 
              className="px-4 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              My Orders
            </Link>

            <Link 
              href="/account/profile" 
              className="px-4 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Edit Profile
            </Link>

                                    {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors font-medium border-t mt-1"
                onClick={() => setIsOpen(false)}
              >
                Admin Dashboard
              </Link>
            )}
            
            {user.role === 'SELLER' && (
              <Link 
                href={user.seller?.id || user.seller?.storeName ? "/seller" : "/seller/onboard"} 
                className="px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors font-medium border-t mt-1"
                onClick={() => setIsOpen(false)}
              >
                Seller Dashboard
              </Link>
            )}

            <button 
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left border-t mt-1"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
