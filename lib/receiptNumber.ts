import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Production requirement: receipt generation must be atomic and yearly-reset.
 * We rely on a Postgres function exposed via RPC.
 *
 * Create in Supabase (SQL):
 *   create or replace function next_receipt_number()
 *   returns text
 *   language plpgsql
 *   as $$
 *   declare y int := extract(year from now() at time zone 'Asia/Kolkata');
 *   declare new_counter int;
 *   begin
 *     -- ensure row exists
 *     insert into receipt_counter(id, year, counter)
 *       values (1, y, 0)
 *       on conflict (id) do nothing;
 *
 *     -- reset if year changed
 *     update receipt_counter
 *       set year = y, counter = 0
 *       where id = 1 and year <> y;
 *
 *     update receipt_counter
 *       set counter = counter + 1
 *       where id = 1
 *       returning counter into new_counter;
 *
 *     return 'RCP-' || y::text || '-' || lpad(new_counter::text, 4, '0');
 *   end;
 *   $$;
 */
export async function getNextReceiptNumber(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin.rpc("next_receipt_number");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to generate receipt number");
  return String(data);
}

