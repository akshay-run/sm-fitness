import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Production requirement: code generation must be atomic (no race conditions).
 * We rely on a Postgres function exposed via RPC.
 *
 * Create in Supabase (SQL):
 *   create or replace function next_member_code()
 *   returns text
 *   language plpgsql
 *   as $$
 *   declare new_counter int;
 *   begin
 *     update member_code_counter
 *       set counter = counter + 1
 *       where id = 1
 *       returning counter into new_counter;
 *     return 'GYM-' || lpad(new_counter::text, 3, '0');
 *   end;
 *   $$;
 */
export async function getNextMemberCode(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin.rpc("next_member_code");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to generate member code");
  return String(data);
}

