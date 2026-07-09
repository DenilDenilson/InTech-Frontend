export interface Person {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface PersonPayload {
  first_name: string;
  last_name: string;
  email: string;
}

export interface PersonFilters {
  email?: string;
  last_name?: string;
  ordering?: 'created_at' | '-created_at';
  page?: number;
}