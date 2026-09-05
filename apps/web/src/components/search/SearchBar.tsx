'use client';

import { useState, useEffect, useRef, startTransition, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Loader2, History, Tag, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { autocompleteProducts } from '@/lib/api/search';
import Link from 'next/link';
import Image from 'next/image';

type AutocompleteResult = {
  products: Array<{ id: string; name: string; slug: string; basePrice: number; images: string[] }>;
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
};

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<AutocompleteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        startTransition(() => {
          setRecentSearches(JSON.parse(saved));
        });
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim().length === 0) {
      startTransition(() => {
        setResults(null);
        setSelectedIndex(-1);
        setError(null);
      });
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    startTransition(() => {
      setIsLoading(true);
      setError(null);
    });

    autocompleteProducts(debouncedQuery, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setResults(data);
          setIsOpen(true);
          setSelectedIndex(-1);
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.warn('Autocomplete request unfulfilled', err);
        startTransition(() => {
          setResults({ products: [], categories: [], brands: [] });
        });
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        startTransition(() => {
          setIsLoading(false);
        });
      });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const updated = [term.trim(), ...recentSearches.filter(t => t !== term.trim())].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const removeRecentSearch = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = recentSearches.filter(t => t !== term);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      saveRecentSearch(query);
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const flattenItems = useCallback(() => {
    if (!results) return [];
    const items: Array<{ type: string; item: any; href: string }> = [];
    results.categories.forEach(c => items.push({ type: 'category', item: c, href: `/categories/${c.slug}` }));
    results.brands.forEach(b => items.push({ type: 'brand', item: b, href: `/brands/${b.slug}` }));
    results.products.forEach(p => items.push({ type: 'product', item: p, href: `/products/${p.slug}` }));
    return items;
  }, [results]);

  const allItems = useMemo(() => flattenItems(), [flattenItems]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allItems.length) {
        const item = allItems[selectedIndex];
        setIsOpen(false);
        saveRecentSearch(item.item.name);
        router.push(item.href);
      } else {
        handleSearch();
      }
    }
  };

  const hasResults = results && (results.products.length > 0 || results.categories.length > 0 || results.brands.length > 0);
  const showRecent = !query.trim() && recentSearches.length > 0;
  const dropdownId = 'search-dropdown';

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search for products, categories, brands..."
          className="pl-10 pr-10 h-10 bg-muted/50 border-transparent focus-visible:bg-background focus-visible:ring-primary rounded-full transition-all"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          aria-label="Search"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={dropdownId}
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query.length > 0 && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
            onClick={() => {
              setQuery('');
              setResults(null);
              setSelectedIndex(-1);
              setError(null);
            }}
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        )}
      </form>

      {isOpen && (showRecent || hasResults || error || (query.trim() && !hasResults && !isLoading)) && (
        <div id={dropdownId} className="absolute top-[calc(100%+8px)] w-[120%] -left-[10%] sm:w-full sm:left-0 rounded-xl border bg-background/95 backdrop-blur-md shadow-xl z-50 overflow-hidden ring-1 ring-black/5 flex flex-col max-h-[70vh]">
          {showRecent ? (
            <div className="py-2">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Searches</span>
                <button 
                  type="button" 
                  onClick={() => { setRecentSearches([]); localStorage.removeItem('recentSearches'); }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear All
                </button>
              </div>
              <ul>
                {recentSearches.map((term) => (
                  <li key={term}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => {
                        setQuery(term);
                        setIsOpen(false);
                        saveRecentSearch(term);
                        router.push(`/search?q=${encodeURIComponent(term)}`);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{term}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => removeRecentSearch(e, term)}
                        className="p-1 hover:bg-muted rounded-full"
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : error ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <Search className="h-8 w-8 text-destructive/50 mb-3" />
              <p className="text-sm font-medium text-foreground">Something went wrong</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          ) : hasResults ? (
            <div className="overflow-y-auto overscroll-contain">
              <div className="py-2">
                {/* Categories */}
                {results.categories.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categories</div>
                    <ul>
                      {results.categories.map((cat) => {
                        const idx = allItems.findIndex(i => i.type === 'category' && i.item.id === cat.id);
                        return (
                          <li key={cat.id}>
                            <Link
                              href={`/categories/${cat.slug}`}
                              className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${selectedIndex === idx ? 'bg-muted/80' : ''}`}
                              onClick={() => setIsOpen(false)}
                              role="option"
                              aria-selected={selectedIndex === idx}
                              id={selectedIndex === idx ? `search-option-${idx}` : undefined}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Package className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium">{cat.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Brands */}
                {results.brands.length > 0 && (
                  <div className="mb-2">
                    <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Brands</div>
                    <ul>
                      {results.brands.map((brand) => {
                        const idx = allItems.findIndex(i => i.type === 'brand' && i.item.id === brand.id);
                        return (
                          <li key={brand.id}>
                            <Link
                              href={`/brands/${brand.slug}`}
                              className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${selectedIndex === idx ? 'bg-muted/80' : ''}`}
                              onClick={() => setIsOpen(false)}
                              role="option"
                              aria-selected={selectedIndex === idx}
                              id={selectedIndex === idx ? `search-option-${idx}` : undefined}
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Tag className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium">{brand.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Products */}
                {results.products.length > 0 && (
                  <div>
                    <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Products</div>
                    <ul>
                      {results.products.map((product) => {
                        const idx = allItems.findIndex(i => i.type === 'product' && i.item.id === product.id);
                        return (
                          <li key={product.id}>
                            <Link
                              href={`/products/${product.slug}`}
                              className={`flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors ${selectedIndex === idx ? 'bg-muted/80' : ''}`}
                              onClick={() => {
                                setIsOpen(false);
                                saveRecentSearch(product.name);
                              }}
                              role="option"
                              aria-selected={selectedIndex === idx}
                              id={selectedIndex === idx ? `search-option-${idx}` : undefined}
                            >
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted border border-border/50">
                                {product.images && product.images[0] ? (
                                  <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
                                ) : (
                                  <div className="h-full w-full flex items-center justify-center bg-secondary/50 text-muted-foreground">
                                    <Package className="h-4 w-4" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 overflow-hidden">
                                <span className="truncate text-sm font-medium text-foreground">{product.name}</span>
                                <span className="text-xs font-medium text-primary">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(product.basePrice)}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-muted/20 p-2">
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  onClick={() => handleSearch()}
                >
                  <Search className="h-4 w-4" />
                  View all results for &quot;{query}&quot;
                </button>
              </div>
            </div>
          ) : query.trim() && !isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">
                We couldn&apos;t find anything matching &quot;{query}&quot;
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}