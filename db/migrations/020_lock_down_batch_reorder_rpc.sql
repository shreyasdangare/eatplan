-- NOT YET APPLIED. Review, then apply via Supabase migrations.
-- Fixes advisors: anon/authenticated_security_definer_function_executable (0028/0029)
-- and function_search_path_mutable (0011) for batch_reorder_shopping_list.
--
-- The only caller is app/api/shopping-list/reorder/route.ts, which uses the
-- service-role client after resolving the caller's household server-side.
-- Today any anon/authenticated client can call /rest/v1/rpc/batch_reorder_shopping_list
-- with an arbitrary p_household_id and reorder another household's list
-- (SECURITY DEFINER bypasses RLS).

alter function public.batch_reorder_shopping_list(uuid, jsonb)
  set search_path = '';

revoke execute on function public.batch_reorder_shopping_list(uuid, jsonb) from public;
revoke execute on function public.batch_reorder_shopping_list(uuid, jsonb) from anon;
revoke execute on function public.batch_reorder_shopping_list(uuid, jsonb) from authenticated;
grant execute on function public.batch_reorder_shopping_list(uuid, jsonb) to service_role;

-- Rollback:
-- grant execute on function public.batch_reorder_shopping_list(uuid, jsonb) to anon, authenticated;
-- alter function public.batch_reorder_shopping_list(uuid, jsonb) reset search_path;
