#!/usr/bin/env tsx

/**
 * Database Index Maintenance Script for NextWiki
 * 
 * This script helps maintain and optimize search indexes for optimal performance.
 * It can:
 * - Analyze index usage and performance
 * - Rebuild indexes when needed
 * - Optimize trigram and full-text search indexes
 * - Report on index health and statistics
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { db } from "../index.js";
import { sql } from "drizzle-orm";
import { logger } from "@repo/logger";

// Load environment variables
const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(".env file loaded successfully");
} else {
  logger.warn("No .env file found, relying on environment variables");
}

interface IndexInfo {
  schemaname: string;
  tablename: string;
  indexname: string;
  indexdef: string;
  indexsize: string;
  indexscans: number;
  indextuples: number;
}

interface IndexStats {
  indexname: string;
  indexsize: string;
  indexscans: number;
  indextuples: number;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
}

/**
 * Get information about all search-related indexes
 */
async function getSearchIndexes(): Promise<IndexInfo[]> {
  const result = await db.execute(sql`
    SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as indexsize,
        COALESCE(idx_scan, 0) as indexscans,
        COALESCE(idx_tup_read, 0) as indextuples
    FROM pg_indexes 
    LEFT JOIN pg_stat_user_indexes ON pg_stat_user_indexes.indexrelname = pg_indexes.indexname
    WHERE tablename = 'wiki_pages' 
      AND (indexname LIKE '%search%' 
           OR indexname LIKE '%title%' 
           OR indexname LIKE '%content%' 
           OR indexname LIKE '%trgm%'
           OR indexname LIKE '%path%')
    ORDER BY indexname
  `);
  
  return result.rows as unknown as IndexInfo[];
}

/**
 * Get detailed statistics for search indexes
 */
async function getIndexStats(): Promise<IndexStats[]> {
  const result = await db.execute(sql`
    SELECT 
        indexrelname as indexname,
        pg_size_pretty(pg_relation_size(indexrelid)) as indexsize,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        COALESCE(idx_scan, 0) as indexscans,
        COALESCE(idx_tup_read, 0) as indextuples
    FROM pg_stat_user_indexes pgsui
    JOIN pg_indexes pgi ON pgi.indexname = pgsui.indexrelname
    WHERE pgi.tablename = 'wiki_pages' 
      AND (pgi.indexname LIKE '%search%' 
           OR pgi.indexname LIKE '%title%' 
           OR pgi.indexname LIKE '%content%' 
           OR pgi.indexname LIKE '%trgm%'
           OR pgi.indexname LIKE '%path%')
    ORDER BY idx_scan DESC NULLS LAST
  `);
  
  return result.rows as unknown as IndexStats[];
}

/**
 * Check if required extensions are installed
 */
async function checkExtensions(): Promise<void> {
  logger.info("Checking required PostgreSQL extensions...");
  
  const result = await db.execute(sql`
    SELECT extname, extversion 
    FROM pg_extension 
    WHERE extname IN ('pg_trgm')
  `);
  
  const extensions = result.rows as { extname: string; extversion: string }[];
  
  if (extensions.length === 0) {
    logger.warn("pg_trgm extension is not installed");
    logger.info("Installing pg_trgm extension...");
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    logger.info("pg_trgm extension installed successfully");
  } else {
    logger.info("Required extensions are installed:");
    extensions.forEach(ext => {
      logger.info(`  - ${ext.extname} v${ext.extversion}`);
    });
  }
}

/**
 * Run the index optimization script
 */
async function optimizeIndexes(): Promise<void> {
  logger.info("Running search index optimization...");
  
  const optimizationScript = fs.readFileSync(
    path.join(process.cwd(), "src/migrations/optimize-search-indexes.sql"), 
    "utf8"
  );
  
  // Split the script into individual statements
  const statements = optimizationScript
    .split(";")
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith("--"));
  
  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await db.execute(sql.raw(statement));
        logger.info(`Executed: ${statement.substring(0, 50)}...`);
      } catch (error) {
        logger.error(`Failed to execute statement: ${statement.substring(0, 50)}...`);
        if (error instanceof Error) {
          logger.error(error.message);
        } else {
          logger.error(String(error));
        }
        // Continue with other statements
      }
    }
  }
  
  logger.info("Index optimization completed");
}

/**
 * Analyze search index performance and suggest improvements
 */
async function analyzeIndexes(): Promise<void> {
  logger.info("Analyzing search index performance...");
  
  const indexes = await getSearchIndexes();
  const stats = await getIndexStats();
  
  console.log("\n📊 Current Search Indexes:");
  console.log("=" .repeat(80));
  
  indexes.forEach(idx => {
    const stat = stats.find(s => s.indexname === idx.indexname);
    console.log(`\nIndex: ${idx.indexname}`);
    console.log(`  Table: ${idx.tablename}`);
    console.log(`  Size: ${idx.indexsize}`);
    console.log(`  Scans: ${stat ? stat.idx_scan.toLocaleString() : 'N/A'}`);
    console.log(`  Tuples Read: ${stat ? stat.idx_tup_read.toLocaleString() : 'N/A'}`);
    console.log(`  Definition: ${idx.indexdef}`);
  });
  
  console.log("\n🔍 Performance Analysis:");
  console.log("=" .repeat(50));
  
  // Identify unused indexes
  const unusedIndexes = stats.filter(stat => stat.idx_scan === 0);
  if (unusedIndexes.length > 0) {
    console.log("\n⚠️  Unused Indexes (consider for removal):");
    unusedIndexes.forEach(idx => {
      console.log(`  - ${idx.indexname} (${idx.indexsize})`);
    });
  } else {
    console.log("✅ All search indexes are being used");
  }
  
  // Identify heavily used indexes
  const heavyUsedIndexes = stats.filter(stat => stat.idx_scan > 1000);
  if (heavyUsedIndexes.length > 0) {
    console.log("\n🔥 Heavily Used Indexes (good performance):");
    heavyUsedIndexes.forEach(idx => {
      console.log(`  - ${idx.indexname}: ${idx.idx_scan.toLocaleString()} scans (${idx.indexsize})`);
    });
  }
}

/**
 * Rebuild all search indexes
 */
async function rebuildIndexes(): Promise<void> {
  logger.info("Rebuilding search indexes...");
  
  const indexes = await getSearchIndexes();
  
  for (const idx of indexes) {
    try {
      logger.info(`Rebuilding index: ${idx.indexname}`);
      await db.execute(sql.raw(`REINDEX INDEX ${idx.indexname}`));
      logger.info(`✅ Rebuilt: ${idx.indexname}`);
    } catch (error) {
      logger.error(`❌ Failed to rebuild ${idx.indexname}:`, error);
    }
  }
  
  logger.info("Index rebuilding completed");
}

/**
 * Update table statistics for better query planning
 */
async function updateStatistics(): Promise<void> {
  logger.info("Updating table statistics...");
  
  await db.execute(sql`ANALYZE wiki_pages`);
  
  logger.info("Statistics updated successfully");
}

/**
 * Main function to handle command line arguments
 */
async function main(): Promise<void> {
  const command = process.argv[2] || "analyze";
  
  try {
    await checkExtensions();
    
    switch (command) {
      case "analyze":
        await analyzeIndexes();
        break;
        
      case "optimize":
        await optimizeIndexes();
        await updateStatistics();
        logger.info("✅ Optimization completed successfully");
        break;
        
      case "rebuild":
        await rebuildIndexes();
        await updateStatistics();
        logger.info("✅ Rebuild completed successfully");
        break;
        
      case "stats":
        await updateStatistics();
        logger.info("✅ Statistics updated successfully");
        break;
        
      default:
        console.log(`
NextWiki Database Index Maintenance

Usage: tsx maintenance/search-indexes.ts [command]

Commands:
  analyze   - Analyze current search indexes and performance (default)
  optimize  - Apply index optimizations and create missing indexes
  rebuild   - Rebuild all search indexes (use when performance degrades)
  stats     - Update table statistics for better query planning

Examples:
  tsx maintenance/search-indexes.ts analyze
  tsx maintenance/search-indexes.ts optimize
  tsx maintenance/search-indexes.ts rebuild
        `);
        process.exit(0);
    }
    
  } catch (error) {
    logger.error("Maintenance script failed:", error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (process.argv[1] && process.argv[1].includes("search-indexes")) {
  main();
}

export { 
  getSearchIndexes, 
  getIndexStats, 
  optimizeIndexes, 
  analyzeIndexes, 
  rebuildIndexes, 
  updateStatistics 
};