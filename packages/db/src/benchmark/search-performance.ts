#!/usr/bin/env tsx

/**
 * Search Performance Benchmark Script for NextWiki
 * 
 * This script measures search query performance before and after index optimization.
 * It provides concrete metrics to demonstrate the indexing improvements.
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
}

interface BenchmarkResult {
  query: string;
  executionTime: number;
  resultCount: number;
  queryPlan?: string;
}

/**
 * Execute a search query and measure performance
 */
async function benchmarkQuery(query: string, description: string): Promise<BenchmarkResult> {
  const startTime = process.hrtime.bigint();
  
  try {
    const result = await db.execute(sql`
      SELECT 
        id, title, path,
        ts_rank(search, plainto_tsquery('english', ${query})) as rank,
        similarity(title, ${query}) as title_similarity,
        similarity(content, ${query}) as content_similarity
      FROM wiki_pages
      WHERE search @@ plainto_tsquery('english', ${query})
         OR similarity(title, ${query}) > 0.3
         OR similarity(content, ${query}) > 0.2
      ORDER BY rank DESC, title_similarity DESC, content_similarity DESC
      LIMIT 10
    `);
    
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    return {
      query: description,
      executionTime,
      resultCount: result.rows.length
    };
  } catch (error) {
    logger.error(`Benchmark failed for query "${description}":`, error);
    return {
      query: description,
      executionTime: -1,
      resultCount: 0
    };
  }
}

/**
 * Get query execution plan for analysis
 */
async function getQueryPlan(query: string): Promise<string> {
  try {
    const result = await db.execute(sql`
      EXPLAIN ANALYZE
      SELECT id, title, path
      FROM wiki_pages
      WHERE search @@ plainto_tsquery('english', ${query})
         OR similarity(title, ${query}) > 0.3
      LIMIT 10
    `);
    
    return result.rows.map((row: any) => row['QUERY PLAN']).join('\n');
  } catch (error) {
    return `Error getting query plan: ${error}`;
  }
}

/**
 * Run comprehensive search performance benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log("🚀 NextWiki Search Performance Benchmark");
  console.log("=========================================");
  
  const testQueries = [
    { query: "NextWiki", desc: "Exact term match" },
    { query: "search features", desc: "Multi-word search" },
    { query: "dokumentation", desc: "Fuzzy match (typo)" },
    { query: "markdown editor", desc: "Feature search" },
    { query: "configuration", desc: "Long word search" }
  ];
  
  const results: BenchmarkResult[] = [];
  
  console.log("\n📊 Running benchmark queries...\n");
  
  for (const test of testQueries) {
    process.stdout.write(`Testing "${test.desc}"... `);
    const result = await benchmarkQuery(test.query, test.desc);
    results.push(result);
    
    if (result.executionTime >= 0) {
      console.log(`✅ ${result.executionTime.toFixed(2)}ms (${result.resultCount} results)`);
    } else {
      console.log(`❌ Failed`);
    }
  }
  
  console.log("\n📈 Performance Summary:");
  console.log("======================");
  
  const validResults = results.filter(r => r.executionTime >= 0);
  
  if (validResults.length > 0) {
    const avgTime = validResults.reduce((sum, r) => sum + r.executionTime, 0) / validResults.length;
    const maxTime = Math.max(...validResults.map(r => r.executionTime));
    const minTime = Math.min(...validResults.map(r => r.executionTime));
    const totalResults = validResults.reduce((sum, r) => sum + r.resultCount, 0);
    
    console.log(`Average Query Time: ${avgTime.toFixed(2)}ms`);
    console.log(`Fastest Query: ${minTime.toFixed(2)}ms`);
    console.log(`Slowest Query: ${maxTime.toFixed(2)}ms`);
    console.log(`Total Results Found: ${totalResults}`);
    
    // Performance assessment
    if (avgTime < 10) {
      console.log("🚀 Excellent performance! Indexes are working optimally.");
    } else if (avgTime < 50) {
      console.log("✅ Good performance. Search is responsive.");
    } else if (avgTime < 100) {
      console.log("⚠️  Moderate performance. Consider running pnpm db:indexes:optimize");
    } else {
      console.log("🐌 Slow performance. Run pnpm db:indexes:optimize immediately!");
    }
  } else {
    console.log("❌ No valid results. Check database connection and data.");
  }
  
  console.log("\n🔍 Detailed Results:");
  console.log("====================");
  results.forEach(result => {
    const status = result.executionTime >= 0 ? "✅" : "❌";
    console.log(`${status} ${result.query}: ${result.executionTime.toFixed(2)}ms (${result.resultCount} results)`);
  });
}

/**
 * Show index information
 */
async function showIndexInfo(): Promise<void> {
  console.log("\n🗂️  Current Search Indexes:");
  console.log("============================");
  
  try {
    const result = await db.execute(sql`
      SELECT 
          indexname,
          pg_size_pretty(pg_relation_size(indexname::regclass)) as size,
          indexdef
      FROM pg_indexes 
      WHERE tablename = 'wiki_pages' 
        AND (indexname LIKE '%search%' 
             OR indexname LIKE '%title%' 
             OR indexname LIKE '%content%' 
             OR indexname LIKE '%trgm%')
      ORDER BY pg_relation_size(indexname::regclass) DESC
    `);
    
    result.rows.forEach((row: any) => {
      console.log(`📋 ${row.indexname} (${row.size})`);
      console.log(`   ${row.indexdef.substring(0, 80)}...`);
    });
  } catch (error) {
    console.log("❌ Could not retrieve index information:", error);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const command = process.argv[2] || "benchmark";
  
  try {
    switch (command) {
      case "benchmark":
        await runBenchmarks();
        await showIndexInfo();
        break;
        
      case "indexes":
        await showIndexInfo();
        break;
        
      case "plan":
        const query = process.argv[3] || "NextWiki";
        console.log(`Query Plan for "${query}":`);
        console.log("=".repeat(40));
        const plan = await getQueryPlan(query);
        console.log(plan);
        break;
        
      default:
        console.log(`
NextWiki Search Performance Benchmark

Usage: tsx benchmark/search-performance.ts [command] [options]

Commands:
  benchmark  - Run comprehensive search performance tests (default)
  indexes    - Show current search index information  
  plan       - Show query execution plan for a search term
  
Examples:
  tsx benchmark/search-performance.ts benchmark
  tsx benchmark/search-performance.ts indexes  
  tsx benchmark/search-performance.ts plan "search term"
        `);
        process.exit(0);
    }
    
  } catch (error) {
    logger.error("Benchmark failed:", error);
    process.exit(1);
  }
}

// Run the main function if this file is executed directly
if (process.argv[1] && process.argv[1].includes("search-performance")) {
  main();
}

export { runBenchmarks, showIndexInfo, getQueryPlan };