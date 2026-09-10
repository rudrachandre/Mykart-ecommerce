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
let inProgressFetchUserPromise: Promise<User | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (inProgressRefreshPromise) {
    return inProgressRefreshPromise;
  }

  inProgressRefreshPromise = (async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mykart-ecommerce.onrender.com';
      const response = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.accessToken) {
          Cookies.set('accessToken', data.accessToken, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          });
          return data.accessToken;
        }
      }
      Cookies.remove('accessToken', { path: '/' });
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

  const fetchUserInternal = async (): Promise<User | null> => {
    let token: string | null | undefined = Cookies.get('accessToken');

    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || undefined;
    }

    if (!token) {
      token = await refreshAccessToken();
    }

    if (!token) {
      return null;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mykart-ecommerce.onrender.com';
      let response = await fetch(`${apiUrl}/api/v1/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          token = refreshedToken;
          response = await fetch(`${apiUrl}/api/v1/users/me`, {
            headers: {
              'Authorization': `Bearer ${refreshedToken}`
            }
          });
        }
      }

      if (response.ok) {
        const data = await response.json();

        // Merge guest wishlist if present
        if (typeof window !== 'undefined') {
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
        }
        return data;
      }
    } catch {
      // Ignore API errors, fall through to JWT payload
    }

    // Fallback: parse JWT token payload if /me endpoint fails
    try {
      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4 !== 0) base64 += '=';
          const payload = JSON.parse(atob(base64));
          if (payload.role) {
            return {
              id: payload.sub,
              email: payload.email || '',
              role: payload.role,
            };
          }
        }
      }
    } catch {
      // Ignore
    }

    return null;
  };

  const fetchUser = async () => {
    if (inProgressFetchUserPromise) {
      const result = await inProgressFetchUserPromise;
      setUser(result);
      setLoading(false);
      return;
    }

    inProgressFetchUserPromise = fetchUserInternal();
    try {
      const result = await inProgressFetchUserPromise;
      setUser(result);
    } finally {
      inProgressFetchUserPromise = null;
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://mykart-ecommerce.onrender.com';
      await fetch(`${apiUrl}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
    } finally {
      Cookies.remove('accessToken', { path: '/' });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
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
