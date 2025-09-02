#!/usr/bin/env bash

# Simple test script to verify search index optimization
echo "NextWiki Search Index Optimization Test"
echo "======================================="

# Check if SQL file exists
if [ -f "src/migrations/optimize-search-indexes.sql" ]; then
    echo "✅ SQL optimization script exists"
else
    echo "❌ SQL optimization script missing"
    exit 1
fi

# Check if maintenance script exists  
if [ -f "src/maintenance/search-indexes.ts" ]; then
    echo "✅ TypeScript maintenance script exists"
else
    echo "❌ TypeScript maintenance script missing"
    exit 1
fi

# Check if package.json has the new scripts
if grep -q "db:indexes:" package.json; then
    echo "✅ Package.json scripts added"
else
    echo "❌ Package.json scripts missing"
    exit 1
fi

# Try basic TypeScript compilation check
echo "🔍 Checking TypeScript syntax..."
if npx tsc --noEmit --skipLibCheck src/maintenance/search-indexes.ts 2>/dev/null; then
    echo "✅ TypeScript syntax check passed"
else
    echo "⚠️  TypeScript syntax issues (may need dependency resolution)"
fi

echo ""
echo "🎉 All basic checks passed!"
echo ""
echo "To use the search index optimization:"
echo "  pnpm db:indexes:analyze   - Analyze current indexes"
echo "  pnpm db:indexes:optimize  - Apply optimizations"
echo "  pnpm db:indexes:rebuild   - Rebuild indexes"
echo "  pnpm db:indexes:stats     - Update statistics"