'use client';

import React, { createContext, useContext, useState, useEffect, startTransition, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  seller?: { id: string; storeName: string; status: string } | null | any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let inProgressRefreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inProgressRefreshPromise) {
    return inProgressRefreshPromise;
  }

  inProgressRefreshPromise = (async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.accessToken) {
          Cookies.set('accessToken', data.accessToken, {
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
          });
          return data.accessToken;
        }
      }
      Cookies.remove('accessToken');
      return null;
    } catch {
      return null;
    } finally {
      inProgressRefreshPromise = null;
    }
  })();

  return inProgressRefreshPromise;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    let token: string | null | undefined = Cookies.get('accessToken');

    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let response = await fetch(`${apiUrl}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          response = await fetch(`${apiUrl}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${refreshedToken}`
            }
          });
        }
      }

      if (response.ok) {
        const data = await response.json();
        setUser(data);

        // Merge guest wishlist
        const guestWishlistRaw = localStorage.getItem('guest_wishlist');
        if (guestWishlistRaw) {
          try {
            const productIds = JSON.parse(guestWishlistRaw);
            if (Array.isArray(productIds) && productIds.length > 0) {
              await fetch(`${apiUrl}/api/v1/wishlist/merge`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productIds }),
              });
            }
          } catch {
          } finally {
            localStorage.removeItem('guest_wishlist');
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      fetchUser();
    });

    const interval = setInterval(() => {
      if (Cookies.get('accessToken')) {
        refreshAccessToken();
      }
    }, 8 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const logout = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
    } finally {
      Cookies.remove('accessToken');
      setUser(null);
      router.push('/');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
