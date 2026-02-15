#!/usr/bin/env node
/**
 * Pat Ina Sourcing Script
 * Finds vintage MTBs that could be sourced for resale
 * Leverages MTB Hunter scraper data
 */

const fs = require('fs');
const path = require('path');

// Load MTB Hunter listings
const mtbHunterData = path.join(__dirname, '../../mtb-hunter/js/listings.js');

// Target brands and their resale potential (realistic 30-50% markup)
const SOURCING_TARGETS = {
  'Klein': { markup: 1.5, minProfit: 200 },
  'Yeti': { markup: 1.5, minProfit: 200 },
  'Fat Chance': { markup: 1.5, minProfit: 200 },
  'Ritchey': { markup: 1.4, minProfit: 150 },
  'GT': { markup: 1.4, minProfit: 100 },
  'Specialized': { markup: 1.3, minProfit: 80 },
  'Trek': { markup: 1.3, minProfit: 60 },
  'Fisher': { markup: 1.3, minProfit: 50 },
  'Marin': { markup: 1.3, minProfit: 60 },
  'Scott': { markup: 1.3, minProfit: 70 },
  'Bontrager': { markup: 1.5, minProfit: 200 },
  'Cannondale': { markup: 1.3, minProfit: 100 },
  'Other': { markup: 1.25, minProfit: 40 },
};

function loadListings() {
  try {
    const content = fs.readFileSync(mtbHunterData, 'utf-8');
    // Extract JSON from window.mtbData = {...}
    const match = content.match(/window\.mtbData\s*=\s*({[\s\S]*});?/);
    if (match) {
      const data = JSON.parse(match[1]);
      return data.listings || [];
    }
  } catch (e) {
    console.error('Could not load MTB Hunter data:', e.message);
    return [];
  }
  return [];
}

function analyzeSourcingOpportunity(listing) {
  const target = SOURCING_TARGETS[listing.brand] || SOURCING_TARGETS['Other'];
  
  // Calculate potential profit based on markup
  const buyPrice = listing.price;
  const potentialSell = Math.round(buyPrice * target.markup);
  const profit = potentialSell - buyPrice;
  
  // Score based on: deal score + vintage bonus + grail bonus + profit
  let score = (listing.dealScore || 0);
  if (listing.isVintage) score += 30;
  if (listing.isGrail) score += 40;
  score += Math.min(profit / 10, 30); // Up to 30 points for profit
  
  // Only include if minimum profit threshold met and decent deal
  if (profit < target.minProfit) return null;
  if (listing.dealScore < 20 && !listing.isVintage) return null;
  
  return {
    ...listing,
    buyPrice,
    potentialSell,
    profit,
    profitMargin: Math.round((profit / potentialSell) * 100),
    score: Math.round(score)
  };
}

function main() {
  console.log('🔍 Pat Ina Sourcing Scanner\n');
  
  const listings = loadListings();
  console.log(`📊 Loaded ${listings.length} listings from MTB Hunter\n`);
  
  const opportunities = listings
    .map(analyzeSourcingOpportunity)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  
  console.log(`🎯 Found ${opportunities.length} sourcing opportunities:\n`);
  
  if (opportunities.length === 0) {
    console.log('No opportunities found matching criteria.');
    return;
  }
  
  // Top 10 opportunities
  const top10 = opportunities.slice(0, 10);
  
  top10.forEach((opp, i) => {
    console.log(`${i + 1}. ${opp.brand} - ${opp.title.slice(0, 40)}`);
    console.log(`   💰 Buy: €${opp.buyPrice} → Sell: €${opp.potentialSell} (Profit: €${opp.profit}, ${opp.profitMargin}%)`);
    console.log(`   📍 ${opp.location} (${opp.country.toUpperCase()})`);
    console.log(`   🔗 ${opp.sourceUrl}\n`);
  });
  
  // Save to JSON
  const output = {
    scannedAt: new Date().toISOString(),
    totalListings: listings.length,
    opportunities: opportunities.length,
    top10: top10
  };
  
  const outputPath = path.join(__dirname, '../sourcing-leads.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved to ${outputPath}`);
}

main();
