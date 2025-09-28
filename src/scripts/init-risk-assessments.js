#!/usr/bin/env node

/**
 * Initialize risk assessments for all existing customers
 * This script is optional - the system works automatically
 * Run this only if you want to pre-populate risk data for existing customers
 */

import { PrismaClient } from '../generated/prisma/index.js';
import { RiskAssessmentService } from '../lib/risk-assessment.js';

const prisma = new PrismaClient();

async function initializeRiskAssessments() {
  console.log('🚀 Starting risk assessment initialization...');
  console.log('ℹ️  Note: This is optional - the system works automatically!');
  
  try {
    // Get all unique clients who have appointments
    const clients = await prisma.appointment.findMany({
      select: { clientId: true },
      distinct: ['clientId'],
    });

    console.log(`📊 Found ${clients.length} unique clients with appointments`);

    let successCount = 0;
    let errorCount = 0;

    for (const client of clients) {
      try {
        console.log(`🔄 Processing client ${client.clientId}...`);
        await RiskAssessmentService.updateCustomerRisk(client.clientId);
        successCount++;
        console.log(`✅ Risk assessment created for client ${client.clientId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing client ${client.clientId}:`, error.message);
      }
    }

    console.log('\n📈 Risk Assessment Initialization Complete!');
    console.log(`✅ Successfully processed: ${successCount} clients`);
    console.log(`❌ Errors: ${errorCount} clients`);
    
    // Get risk statistics
    const stats = await prisma.customerRisk.groupBy({
      by: ['riskLevel'],
      _count: {
        riskLevel: true,
      },
    });

    console.log('\n📊 Risk Level Distribution:');
    stats.forEach(stat => {
      console.log(`  ${stat.riskLevel}: ${stat._count.riskLevel} customers`);
    });

    console.log('\n🎉 The risk assessment system is now fully operational!');
    console.log('💡 Risk assessments will be created automatically for new customers.');

  } catch (error) {
    console.error('💥 Fatal error during initialization:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeRiskAssessments()
  .then(() => {
    console.log('\n✨ Initialization completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  });
