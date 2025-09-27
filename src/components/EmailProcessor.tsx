'use client';

import { useEffect } from 'react';
import { EMAIL_PROCESSING_INTERVAL } from '@/lib/utils';

export default function EmailProcessor() {
  useEffect(() => {
    const startProcessor = async () => {
      try {
        // Call the email processing API every hour
        const interval = setInterval(async () => {
          try {
            await fetch('/api/email/process', { method: 'GET' });
          } catch (error) {
            console.error('Email processing error:', error);
          }
        }, EMAIL_PROCESSING_INTERVAL); // Now uses 1 hour instead of 30 seconds

        // Process immediately on mount
        try {
          await fetch('/api/email/process', { method: 'GET' });
        } catch (error) {
          console.error('Initial email processing error:', error);
        }

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to start email processor:', error);
      }
    };

    startProcessor();
  }, []);

  return null;
}
