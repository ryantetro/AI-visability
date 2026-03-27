-- Seed script: Insert ~30 days of realistic AI crawler visit data
-- Domain: getpostgame.ai
-- Run this in Supabase SQL Editor to populate the Traffic tab
-- Safe to re-run: deletes previous seed data for 'getpostgame.ai' first

DELETE FROM ai_crawler_visits WHERE domain = 'getpostgame.ai';

-- Generate visits using a series of INSERT statements
-- Spread across the last 30 days with realistic patterns:
--   ChatGPT (GPTBot): heaviest crawler, 5-15 visits/day
--   Perplexity (PerplexityBot): moderate, 3-10 visits/day
--   Gemini (GoogleOther): moderate, 2-8 visits/day
--   Claude (ClaudeBot): lighter, 1-6 visits/day
--   Other (CCBot): occasional, 0-3 visits/day

DO $$
DECLARE
  d DATE;
  i INT;
  visit_count INT;
  paths TEXT[] := ARRAY['/', '/pricing', '/features', '/about', '/blog', '/docs', '/api', '/login', '/dashboard', '/settings', '/help', '/contact', '/blog/ai-visibility', '/blog/seo-tips', '/docs/getting-started'];
  rand_path TEXT;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, '1 day')::date LOOP

    -- GPTBot: 5-15 visits/day (heaviest)
    visit_count := 5 + floor(random() * 11)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'GPTBot',
        'indexing',
        rand_path,
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

    -- ChatGPT-User: 1-4 visits/day
    visit_count := 1 + floor(random() * 4)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'ChatGPT-User',
        'indexing',
        rand_path,
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ChatGPT-User/1.0; +https://openai.com/bot)',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

    -- PerplexityBot: 3-10 visits/day
    visit_count := 3 + floor(random() * 8)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'PerplexityBot',
        'citation',
        rand_path,
        'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

    -- GoogleOther: 2-8 visits/day
    visit_count := 2 + floor(random() * 7)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'GoogleOther',
        'training',
        rand_path,
        'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome/124.0.0.0 Safari/537.36',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

    -- ClaudeBot: 1-6 visits/day
    visit_count := 1 + floor(random() * 6)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'ClaudeBot',
        'indexing',
        rand_path,
        'Mozilla/5.0 (compatible; ClaudeBot/1.0; +https://www.anthropic.com/claude-bot)',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

    -- CCBot: 0-3 visits/day (occasional)
    visit_count := floor(random() * 4)::int;
    FOR i IN 1..visit_count LOOP
      rand_path := paths[1 + floor(random() * array_length(paths, 1))::int];
      INSERT INTO ai_crawler_visits (domain, bot_name, bot_category, page_path, user_agent, visited_at)
      VALUES (
        'getpostgame.ai',
        'CCBot',
        'training',
        rand_path,
        'CCBot/2.0 (https://commoncrawl.org/faq/)',
        d + (random() * INTERVAL '24 hours')
      );
    END LOOP;

  END LOOP;
END $$;

-- Verify
SELECT bot_name, COUNT(*) as visits, COUNT(DISTINCT page_path) as unique_paths
FROM ai_crawler_visits
WHERE domain = 'getpostgame.ai'
GROUP BY bot_name
ORDER BY visits DESC;
