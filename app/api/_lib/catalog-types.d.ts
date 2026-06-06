declare module "@/app/api/_lib/landtop" {
  export function fetchLandtopCatalog(options?: { query?: string; refresh?: boolean }): Promise<{
    source: string;
    sourceUrls: string[];
    query: string;
    refresh: boolean;
    cacheSeconds: number;
    fetchedAt: string;
    fetchedVia: string[];
    warnings: string[];
    total: number;
    products: unknown[];
  }>;
}

declare module "@/app/api/_lib/jyes" {
  export function fetchJyesCatalog(options?: { query?: string; refresh?: boolean }): Promise<{
    source: string;
    sourceUrl: string;
    query: string;
    fetchedAt: string;
    total: number;
    products: unknown[];
  }>;
}
