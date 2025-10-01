'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

export default function WaitlistCleanupButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    cleanedCount?: number;
    error?: string;
  } | null>(null);

  const handleCleanup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/waitlist/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: 'Failed to process cleanup request',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleCleanup}
          disabled={isLoading}
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Expired Entries
            </>
          )}
        </Button>
        
        <div className="text-sm text-gray-500">
          Remove expired waitlist entries and notify next in queue
        </div>
      </div>

      {result && (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          {result.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {result.success ? (
              <div>
                <p className="font-medium">{result.message}</p>
                {result.cleanedCount !== undefined && result.cleanedCount > 0 && (
                  <p className="text-sm mt-1">
                    {result.cleanedCount} expired entries were processed and the next people in queue have been notified.
                  </p>
                )}
                {result.cleanedCount === 0 && (
                  <p className="text-sm mt-1">
                    No expired entries found. All waitlist entries are current.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-medium">Cleanup Failed</p>
                <p className="text-sm mt-1">{result.error}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
