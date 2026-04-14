-- 018_llm_usage_log.sql
-- Tracks every LLM API call per user for observability and future rate-limiting.

CREATE TABLE IF NOT EXISTS public.llm_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id uuid REFERENCES public.households(id) ON DELETE SET NULL,
  endpoint text NOT NULL,          -- 'import-recipe', 'translate-ingredient', etc.
  model text NOT NULL,             -- 'gemini-3-flash-preview', 'gemini-2.5-flash', etc.
  input_tokens int,
  output_tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_user ON public.llm_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON public.llm_usage_log(created_at);

-- RLS: only service-role inserts/reads; no direct user access
ALTER TABLE public.llm_usage_log ENABLE ROW LEVEL SECURITY;
