# NextWiki Search Index Optimization

This document describes the search indexing improvements made to NextWiki for optimal search performance.

## 🔍 Search Index Overview

NextWiki uses a multi-layered search approach with PostgreSQL:

1. **Full-text search** using `tsvector` with weighted content (title weight 'A', content weight 'B')
2. **Trigram similarity search** using the `pg_trgm` extension for fuzzy matching
3. **Exact matching** using btree indexes for fast lookups
4. **Composite indexes** for common query patterns

## 🛠️ Index Optimizations Applied

### Fixed Index Conflicts

**Problem**: The original schema had conflicting index names:
- A btree index named `trgm_idx_title` 
- An attempt to create a GIN trigram index with the same name

**Solution**: Renamed indexes with clear, descriptive names:
- `trgm_idx_title_gin` - GIN trigram index for fuzzy title search
- `trgm_idx_content_gin` - GIN trigram index for fuzzy content search  
- `idx_title_btree` - Btree index for exact title matches and prefix searches
- `idx_path_btree` - Btree index for fast path lookups
- `idx_published_updated` - Composite index for filtering published pages by update time

### New Indexes Added

1. **GIN Trigram Indexes**: For fuzzy search using `similarity()` function
2. **Btree Path Index**: For fast page lookups by path
3. **Composite Index**: For common filtering patterns (published status + update time)

## 🚀 Performance Improvements

### Before Optimization
- Conflicting index names prevented proper trigram index creation
- Missing indexes on commonly queried columns (`path`, composite queries)
- Suboptimal search performance for fuzzy matching

### After Optimization  
- ✅ Proper GIN trigram indexes for fast fuzzy search
- ✅ Dedicated btree indexes for exact matches
- ✅ Composite indexes for common query patterns
- ✅ Clear index naming convention

## 🔧 Maintenance Tools

### Available Commands

```bash
# Analyze current search indexes and performance
pnpm db:indexes:analyze

# Apply index optimizations and create missing indexes  
pnpm db:indexes:optimize

# Rebuild all search indexes (use when performance degrades)
pnpm db:indexes:rebuild

# Update table statistics for better query planning
pnpm db:indexes:stats
```

### Index Maintenance Script

The maintenance script (`packages/db/src/maintenance/search-indexes.ts`) provides:

- **Analysis**: Reports on index usage, size, and performance
- **Optimization**: Applies the latest index improvements
- **Rebuilding**: Reconstructs indexes when needed
- **Statistics**: Updates PostgreSQL query planner statistics

## 📊 Index Usage Monitoring

### Analyzing Index Performance

```bash
pnpm db:indexes:analyze
```

This command shows:
- Current search indexes and their sizes
- Index scan counts and usage statistics
- Unused indexes (candidates for removal)
- Heavily used indexes (performance critical)

### Example Output

```
📊 Current Search Indexes:
================================================================================

Index: idx_search
  Table: wiki_pages
  Size: 1024 kB
  Scans: 15,234
  Tuples Read: 89,123
  Definition: CREATE INDEX idx_search ON wiki_pages USING gin (search)

Index: trgm_idx_title_gin  
  Table: wiki_pages
  Size: 512 kB
  Scans: 8,567
  Tuples Read: 34,891
  Definition: CREATE INDEX trgm_idx_title_gin ON wiki_pages USING gin (title gin_trgm_ops)

🔍 Performance Analysis:
==================================================
✅ All search indexes are being used
🔥 Heavily Used Indexes (good performance):
  - idx_search: 15,234 scans (1024 kB)
  - trgm_idx_title_gin: 8,567 scans (512 kB)
```

## 🏗️ Implementation Details

### Database Schema Changes

Updated `packages/db/src/schema/index.ts`:

```typescript
(t) => [
  // Vector search index for tsvector column - GIN index for full-text search
  index("idx_search").using("gin", t.search),
  // Btree index on title for exact matches and prefix searches  
  index("idx_title_btree").on(t.title),
  // Btree index on path for fast page lookups
  index("idx_path_btree").on(t.path),
  // Composite index for common query patterns (published pages by update time)
  index("idx_published_updated").on(t.isPublished, t.updatedAt),
]
```

### Migration Script

Created `packages/db/src/migrations/optimize-search-indexes.sql`:
- Drops conflicting btree index on title
- Creates proper GIN trigram indexes  
- Adds btree indexes for exact matching
- Includes comprehensive comments explaining each index

## 🔄 Regular Maintenance

### Recommended Schedule

- **Weekly**: Run `pnpm db:indexes:analyze` to monitor performance
- **Monthly**: Run `pnpm db:indexes:stats` to update query planner statistics  
- **As Needed**: Run `pnpm db:indexes:rebuild` if search performance degrades

### Signs That Maintenance is Needed

- Search queries becoming slower
- High database CPU usage during searches
- Error logs mentioning index issues
- `ANALYZE` command reports suggest index rebuilding

## 📈 Performance Metrics

### Key Performance Indicators

Monitor these metrics to ensure optimal search performance:

1. **Index Scan Count**: Higher is better for frequently used indexes
2. **Index Size**: Balance between performance and storage
3. **Query Response Time**: Measure search query execution time
4. **Cache Hit Ratio**: PostgreSQL buffer cache efficiency

### Benchmarking

To benchmark search performance:

1. Run search queries before optimization
2. Apply index optimizations  
3. Run the same queries after optimization
4. Compare execution times and query plans

## 🚨 Troubleshooting

### Common Issues

**Issue**: Search queries are slow
**Solution**: Run `pnpm db:indexes:analyze` to check index usage and `pnpm db:indexes:rebuild` if needed

**Issue**: pg_trgm extension not found
**Solution**: The maintenance script automatically installs it, or run `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

**Issue**: Index creation fails with "already exists" 
**Solution**: Use the optimization script which handles existing indexes gracefully

### Support

For issues or questions about search indexing:
1. Check the maintenance script output for detailed error messages
2. Review PostgreSQL logs for database-specific errors
3. Use `pnpm db:indexes:analyze` to get current index status
4. Consult the NextWiki documentation or create an issue on GitHub