-- BLOCK 6: List indexes on public.members (paste results before dropping any index).
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'members'
  AND schemaname = 'public';
