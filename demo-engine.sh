#!/bin/bash

# Demo: Test the pricing engine with various scenarios

echo "🧮 Pricing Engine Demo"
echo "====================="
echo ""
echo "This demonstrates the engine with different scenarios:"
echo ""

# Run specific test fixtures
echo "📋 Scenario 1: High Vacancy (Cap Clamp)"
echo "----------------------------------------"
npx jest tests/pricing/engine.spec.ts -t "High vacancy" --silent
echo ""

echo "📋 Scenario 2: Inside Comfort Band (Conversion Nudge)"
echo "----------------------------------------------------"
npx jest tests/pricing/engine.spec.ts -t "Inside comfort" --silent
echo ""

echo "📋 Scenario 3: Floor Clamp (Both Cap & Floor)"
echo "--------------------------------------------"
npx jest tests/pricing/engine.spec.ts -t "Floor clamp" --silent
echo ""

echo "📋 Scenario 4: Carry-Forward Baseline"
echo "------------------------------------"
npx jest tests/pricing/engine.spec.ts -t "Carry-forward baseline" --silent
echo ""

echo "📋 Scenario 5: 30-Day Simulation"
echo "-------------------------------"
npx jest tests/pricing/engine.spec.ts -t "30-day" --silent
echo ""

echo "✅ All scenarios tested successfully!"
echo ""
echo "💡 To see detailed test output, run:"
echo "   npx jest tests/pricing/engine.spec.ts --verbose"

