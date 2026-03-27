ALTER TABLE prompt_results
  ADD COLUMN IF NOT EXISTS mention_type text,
  ADD COLUMN IF NOT EXISTS position_context text,
  ADD COLUMN IF NOT EXISTS sentiment_label text,
  ADD COLUMN IF NOT EXISTS sentiment_strength smallint,
  ADD COLUMN IF NOT EXISTS sentiment_reasoning text,
  ADD COLUMN IF NOT EXISTS key_quote text,
  ADD COLUMN IF NOT EXISTS description_accuracy text,
  ADD COLUMN IF NOT EXISTS analysis_source text DEFAULT 'heuristic',
  ADD COLUMN IF NOT EXISTS competitors_json jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS monitoring_run_id uuid,
  ADD COLUMN IF NOT EXISTS run_weighted_score numeric(6,2),
  ADD COLUMN IF NOT EXISTS run_score_delta numeric(6,2),
  ADD COLUMN IF NOT EXISTS notable_score_change boolean NOT NULL DEFAULT false;

ALTER TABLE competitor_appearances
  ADD COLUMN IF NOT EXISTS previous_position integer,
  ADD COLUMN IF NOT EXISTS movement_delta integer,
  ADD COLUMN IF NOT EXISTS is_new_competitor boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN prompt_results.mention_type IS 'direct | indirect | not_mentioned';
COMMENT ON COLUMN prompt_results.position_context IS 'listed_ranking | prominent | passing | absent';
COMMENT ON COLUMN prompt_results.sentiment_label IS 'positive | neutral | negative | mixed';
COMMENT ON COLUMN prompt_results.sentiment_strength IS '1-10 intensity scale';
COMMENT ON COLUMN prompt_results.analysis_source IS 'llm | heuristic';
COMMENT ON COLUMN prompt_results.competitors_json IS '[{"name": "...", "position": 1}, ...]';
COMMENT ON COLUMN prompt_results.monitoring_run_id IS 'Shared identifier for one monitoring domain run';
COMMENT ON COLUMN prompt_results.run_weighted_score IS 'Domain weighted score captured for the monitoring run';
COMMENT ON COLUMN prompt_results.run_score_delta IS 'Difference from the prior monitoring run weighted score';
COMMENT ON COLUMN prompt_results.notable_score_change IS 'True when run_score_delta magnitude is greater than 10';
COMMENT ON COLUMN competitor_appearances.previous_position IS 'Most recent prior position for this competitor on the same engine';
COMMENT ON COLUMN competitor_appearances.movement_delta IS 'previous_position - position, positive means moved up';
COMMENT ON COLUMN competitor_appearances.is_new_competitor IS 'True when the competitor has not been seen previously for this domain/engine';
