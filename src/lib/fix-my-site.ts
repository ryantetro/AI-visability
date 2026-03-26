import { getSupabaseClient } from '@/lib/supabase';

/* ── Types ──────────────────────────────────────────────────────── */

export interface FixMySiteOrder {
  id: string;
  user_id: string;
  domain: string;
  status: 'ordered' | 'in_progress' | 'delivered' | 'refunded';
  notes: string | null;
  files_requested: string[];
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
}

export type FixMySiteStatus = FixMySiteOrder['status'];

export const VALID_FILES_REQUESTED = [
  'robots_txt',
  'llms_txt',
  'structured_data',
  'sitemap',
  'meta_tags',
  'schema_markup',
] as const;

/* ── CRUD ───────────────────────────────────────────────────────── */

export async function createOrder(
  userId: string,
  domain: string,
  notes?: string,
  filesRequested?: string[],
): Promise<FixMySiteOrder> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('fix_my_site_orders')
    .insert({
      user_id: userId,
      domain,
      notes: notes || null,
      files_requested: filesRequested ?? [...VALID_FILES_REQUESTED],
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create Fix My Site order: ${error?.message ?? 'unknown'}`);
  }

  return data as FixMySiteOrder;
}

export async function getOrdersByUser(userId: string): Promise<FixMySiteOrder[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('fix_my_site_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return (data ?? []) as FixMySiteOrder[];
}

export async function getOrderById(orderId: string): Promise<FixMySiteOrder | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('fix_my_site_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) return null;
  return data as FixMySiteOrder;
}

export async function updateOrderStatus(
  orderId: string,
  status: FixMySiteStatus,
): Promise<FixMySiteOrder> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = {
    status,
    updated_at: now,
  };

  if (status === 'delivered') {
    updates.completed_at = now;
  }

  const { data, error } = await supabase
    .from('fix_my_site_orders')
    .update(updates)
    .eq('id', orderId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to update order status: ${error?.message ?? 'unknown'}`);
  }

  return data as FixMySiteOrder;
}

export async function setStripeIds(
  orderId: string,
  sessionId: string,
  paymentIntentId: string | null,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('fix_my_site_orders')
    .update({
      stripe_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    throw new Error(`Failed to store Stripe IDs: ${error.message}`);
  }
}
