#!/usr/bin/env node

/**
 * Email Queue Processing Script
 * Run this script periodically to process pending emails
 * 
 * Usage:
 * - Manual: node src/scripts/process-emails.js
 */

const { processEmailQueue } = require('../lib/email');

async function main() {
  try {
    console.log('Starting email queue processing...');
    await processEmailQueue();
    console.log('Email queue processing completed');
  } catch (error) {
    console.error('Failed to process email queue:', error);
    process.exit(1);
  }
}

main();
