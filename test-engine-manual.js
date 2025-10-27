/**
 * MANUAL ENGINE TEST
 * 
 * Run this script to test the pricing engine with sample data:
 * node test-engine-manual.js
 * 
 * This demonstrates the engine working outside of tests.
 */

// Import the engine (via Jest's module resolution)
const { priceUnit } = require('./src/pricing/engine.ts');

// Sample unit data
const unit = {
  unitId: 'A101',
  floorplanCode: 'A1',
  floorplanLabel: 'A1 - 1x1',
  status: 'vacant',
  currentRent: 1500,
  vacantDays: 15,
  amenityAdj: 0,
};

// Sample configuration
const config = {
  priceResponse: 'standard',
  comfortTarget: 0.95,
  maxWeeklyDec: 0.05,
  minFloorVsCurrentRent: 0.90,
  minGapToNextTier: { 'A1': 150 },
  stopDownBuffer: { 'A1': 75 },
  referenceTerm: 14,
  availableTerms: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  vacancyAgePricing: {
    enabled: true,
    discountPerDay: 0.002,
    maxDiscount: 0.10,
    thresholdDays: 30,
  },
  seasonalityEnabled: true,
  seasonalityMultipliers: [1.0, 1.0, 1.05, 1.08, 1.10, 1.12, 1.10, 1.08, 1.05, 1.02, 1.0, 1.0],
  trendOverridePctByFP: {},
  flags: {
    enableSimulation: false,
    enableCarryForward: true,
  },
};

// Sample context
const context = {
  floorplanTrends: {
    'A1': {
      code: 'A1',
      trending: 0.92, // Below target
      current: 0.92,
      bandLow: 0.93,
      bandHigh: 0.96,
      bedrooms: 1,
    },
  },
  communityMetrics: {
    trendingOccupancy: 0.93,
    currentOccupancy: 0.93,
    target: 0.95,
  },
  carryForwardBaselines: {},
  startingRents: { 'A1': 1500 },
  today: new Date('2025-10-27'),
};

// Price the unit!
console.log('🧮 Testing Pricing Engine\n');
console.log('Input:');
console.log(`  Unit: ${unit.unitId} (${unit.floorplanLabel})`);
console.log(`  Current Rent: $${unit.currentRent}`);
console.log(`  Status: ${unit.status}`);
console.log(`  Trending Occupancy: ${(context.floorplanTrends['A1'].trending * 100).toFixed(1)}%`);
console.log(`  Target: ${(config.comfortTarget * 100).toFixed(1)}%\n`);

try {
  const result = priceUnit(unit, config, context);
  
  console.log('✅ Result:');
  console.log(`  Baseline Rent: $${result.baselineRent}`);
  console.log(`  Reference Rent (${result.referenceTerm} mo): $${result.referenceRent}`);
  console.log(`  Change: ${result.delta.dollarChange >= 0 ? '+' : ''}$${result.delta.dollarChange} (${result.delta.percentChange.toFixed(1)}%)\n`);
  
  console.log('📋 Reasons:');
  result.reasons.forEach(r => {
    if (r.applied) {
      console.log(`  • ${r.description}`);
    }
  });
  
  console.log('\n🏷️  Flags:');
  Object.entries(result.flags).forEach(([key, value]) => {
    if (value) {
      console.log(`  • ${key}: ${value}`);
    }
  });
  
  console.log('\n📊 Term Pricing:');
  result.termPricing.slice(0, 5).forEach(t => {
    console.log(`  ${t.term} mo: $${t.price} - ${t.notes}`);
  });
  console.log('  ...');
  
  console.log('\n✅ Engine test successful!\n');
} catch (error) {
  console.error('❌ Engine test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

