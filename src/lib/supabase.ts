import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (has elevated permissions)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database types for TypeScript
export interface FunnelSession {
  id: string;
  email: string;
  customer_info: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  amount: number;
  current_step: string;
  upsells_accepted: string[];
  upsells_declined: string[];
  vault_id?: string;
  transaction_id?: string;
  payment_token?: string;
  coupon_code?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface SessionCreateData {
  email: string;
  customerInfo?: FunnelSession['customer_info'];
  products: FunnelSession['products'];
  couponCode?: string;
  metadata?: Record<string, any>;
}
