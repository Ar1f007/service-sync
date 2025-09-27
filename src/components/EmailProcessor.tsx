'use client';

import { useEffect } from 'react';

export default function EmailProcessor() {
  useEffect(() => {
    // Start email processor on client side
    const startProcessor = async () => {
      try {
        // Call the email processing API every 30 seconds
        const interval = setInterval(async () => {
          try {
            await fetch('/api/email/process', { method: 'GET' });
          } catch (error) {
            console.error('Email processing error:', error);
          }
        }, 30000); // 30 seconds

        // Process immediately on mount
        try {
          await fetch('/api/email/process', { method: 'GET' });
        } catch (error) {
          console.error('Initial email processing error:', error);
        }

        // Cleanup on unmount
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to start email processor:', error);
      }
    };

    startProcessor();
  }, []);

  return null; // This component doesn't render anything
}
