export interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  owner: string | null;
  created_at: string;
}

export interface ProductPayload {
  name: string;
  sku: string;
  price: string;
  owner: string | null;
}

export interface ProductFilters {
  sku?: string;
  price_min?: number | string;
  price_max?: number | string;
  q?: string;
  ordering?: 'price' | '-price' | 'created_at' | '-created_at';
  page?: number;
}