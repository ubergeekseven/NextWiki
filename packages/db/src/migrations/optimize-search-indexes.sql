-- Optimize search indexes for NextWiki
-- This migration fixes duplicate indexes and ensures optimal search performance

-- First, enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the existing btree index on title to avoid naming conflicts
DROP INDEX IF EXISTS trgm_idx_title;

-- Create proper GIN trigram indexes for fuzzy search
-- These indexes support similarity() function and fast trigram searches
CREATE INDEX IF NOT EXISTS trgm_idx_title_gin ON wiki_pages USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trgm_idx_content_gin ON wiki_pages USING GIN (content gin_trgm_ops);

-- Add a btree index on title for exact matches and prefix searches
-- This is useful for autocomplete and exact title lookups
CREATE INDEX IF NOT EXISTS idx_title_btree ON wiki_pages USING btree (title);

-- Add a btree index on path for fast path lookups
CREATE INDEX IF NOT EXISTS idx_path_btree ON wiki_pages USING btree (path);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_published_updated ON wiki_pages USING btree (is_published, updated_at DESC);

-- Add comments to explain the purpose of each index
COMMENT ON INDEX trgm_idx_title_gin IS 'Trigram GIN index on wiki page titles for fuzzy search using similarity()';
COMMENT ON INDEX trgm_idx_content_gin IS 'Trigram GIN index on wiki page content for fuzzy search using similarity()';  
COMMENT ON INDEX idx_title_btree IS 'Btree index on title for exact matches and prefix searches';
COMMENT ON INDEX idx_path_btree IS 'Btree index on path for fast page lookups by path';
COMMENT ON INDEX idx_published_updated IS 'Composite index for filtering published pages by update time';
COMMENT ON INDEX idx_search IS 'GIN index on tsvector search field for full-text search';

-- Display current search-related indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'wiki_pages' 
  AND (indexname LIKE '%search%' OR indexname LIKE '%title%' OR indexname LIKE '%content%' OR indexname LIKE '%trgm%')
ORDER BY indexname;