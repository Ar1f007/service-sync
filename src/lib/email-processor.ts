// Background email processor
import { processEmailQueue } from './email';

let isProcessing = false;

export async function startEmailProcessor() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  // Process emails every 30 seconds
  const interval = setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (error) {
      console.error('Email processor error:', error);
    }
  }, 30000); // 30 seconds

  // Also process immediately on startup
  try {
    await processEmailQueue();
  } catch (error) {
    console.error('Initial email processing error:', error);
  }

  // Return cleanup function
  return () => {
    clearInterval(interval);
    isProcessing = false;
  };
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  startEmailProcessor().catch(console.error);
}
