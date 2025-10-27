# NextWiki Index Optimization Demo

This script demonstrates how to use the newly implemented search index optimization tools for NextWiki.

## Quick Start

```bash
# 1. Setup the database (if not already done)
pnpm db:setup

# 2. Analyze current search indexes
pnpm db:indexes:analyze

# 3. Apply optimizations 
pnpm db:indexes:optimize

# 4. Analyze again to see improvements
pnpm db:indexes:analyze
```

## What the Optimization Does

### Before Optimization
- ❌ Conflicting index names preventing proper GIN trigram creation
- ❌ Missing indexes on commonly queried columns (`path`, composite queries)
- ❌ Suboptimal trigram search performance

### After Optimization  
- ✅ Proper GIN trigram indexes for fast fuzzy search (`similarity()` function)
- ✅ Dedicated btree indexes for exact matches and prefix searches
- ✅ Composite indexes for common query patterns (published + updated)
- ✅ Clear index naming convention

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:indexes:analyze` | Shows current index usage and performance stats |
| `pnpm db:indexes:optimize` | Applies all index optimizations |
| `pnpm db:indexes:rebuild` | Rebuilds all search indexes (use if performance degrades) |
| `pnpm db:indexes:stats` | Updates PostgreSQL query planner statistics |

## Performance Impact

The optimization improves search performance by:

1. **Fuzzy Search**: Proper GIN trigram indexes make `similarity()` queries much faster
2. **Exact Search**: Dedicated btree indexes optimize exact title/path lookups  
3. **Composite Queries**: New indexes speed up common filtering patterns
4. **Query Planning**: Better statistics help PostgreSQL choose optimal query plans

## Example Usage

```bash
# Check current state
$ pnpm db:indexes:analyze
📊 Current Search Indexes:
================================================================================
Index: idx_search (GIN on tsvector)
  Size: 1.2 MB, Scans: 5,234
Index: trgm_idx_title (conflicting btree - needs fix)
  Size: 512 KB, Scans: 1,200

# Apply optimizations
$ pnpm db:indexes:optimize
✅ Dropped conflicting btree index
✅ Created GIN trigram indexes
✅ Added composite indexes
✅ Optimization completed successfully

# Check improved state  
$ pnpm db:indexes:analyze
📊 Current Search Indexes:
================================================================================
Index: idx_search (GIN on tsvector)  
  Size: 1.2 MB, Scans: 5,234
Index: trgm_idx_title_gin (GIN trigram)
  Size: 768 KB, Scans: 0 (newly created)
Index: trgm_idx_content_gin (GIN trigram)
  Size: 2.1 MB, Scans: 0 (newly created)
Index: idx_title_btree (btree for exact matches)
  Size: 384 KB, Scans: 0 (newly created)
```

## Monitoring

The `analyze` command shows important metrics:

- **Index Size**: Larger indexes may indicate need for cleanup
- **Scan Count**: Higher scans = more frequently used (good for important indexes)
- **Unused Indexes**: Zero scans may indicate unnecessary indexes

## Troubleshooting

### Common Issues

**Issue**: Search queries are slow after setup
**Solution**: Run `pnpm db:indexes:stats` to update query planner statistics

**Issue**: "pg_trgm extension not found" error
**Solution**: The optimization script automatically installs it

**Issue**: Index creation fails with "already exists"
**Solution**: The optimization script handles this gracefully with `IF NOT EXISTS`

### Getting Help

- Check the comprehensive documentation: `docs/search-indexing.md`
- Run the test script: `packages/db/test-indexing.sh`
- View the SQL optimization script: `packages/db/src/migrations/optimize-search-indexes.sql`