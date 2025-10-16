'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VoiceSearchButton } from './VoiceSearchButton';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { Loader2, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VoiceSearchModalProps } from '@/types/voice';

// Helper function to format time for display
function formatTime(timeString: string): string {
  try {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const min = parseInt(minutes);
    
    if (hour === 0) {
      return `12:${min.toString().padStart(2, '0')} AM`;
    } else if (hour < 12) {
      return `${hour}:${min.toString().padStart(2, '0')} AM`;
    } else if (hour === 12) {
      return `12:${min.toString().padStart(2, '0')} PM`;
    } else {
      return `${hour - 12}:${min.toString().padStart(2, '0')} PM`;
    }
  } catch {
    return timeString; // Fallback to original string if parsing fails
  }
}

export function VoiceSearchModal({ 
  open, 
  onOpenChange, 
  onBookingConfirmed 
}: VoiceSearchModalProps) {
  const {
    isListening,
    isProcessing,
    transcript,
    aiResponse,
    matchedService,
    availableSlots,
    suggestedDate,
    error,
    context,
    handleTranscript,
    setIsListening,
    reset,
    retry
  } = useVoiceSearch();

  const handleConfirmBooking = React.useCallback((slot: { time: string }) => {
    console.log('Confirming booking with:', { serviceId: matchedService?.id, date: suggestedDate, time: slot.time });
    if (matchedService && suggestedDate) {
      onBookingConfirmed(matchedService.id, suggestedDate, slot.time);
      reset();
      onOpenChange(false);
    }
  }, [matchedService, suggestedDate, onBookingConfirmed, reset, onOpenChange]);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Auto-trigger booking if conversation step is ready_to_book
  React.useEffect(() => {
    if (context.conversationStep === 'ready_to_book' && matchedService && suggestedDate && availableSlots.length === 1) {
      const slot = availableSlots[0];
      console.log('Auto-triggering booking for:', slot);
      setTimeout(() => {
        handleConfirmBooking(slot);
      }, 1000); // Small delay to show the user what's happening
    }
  }, [context.conversationStep, matchedService, suggestedDate, availableSlots, handleConfirmBooking]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>🎤 Voice Search Booking</span>
            {isListening && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                Listening...
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Input Section */}
          <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
            <VoiceSearchButton
              onTranscript={handleTranscript}
              isListening={isListening}
              onListeningChange={setIsListening}
            />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Try: "Book a haircut for tomorrow" or "Show me massage appointments this weekend"
            </p>
          </div>

          {/* Context Display */}
          {context.conversationStep !== 'initial' && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                {context.previousService?.title && `Service: ${context.previousService.title}`}
                {context.previousDate && ` • Date: ${context.previousDate}`}
                {context.previousSlots && ` • ${context.previousSlots.length} slots available`}
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm font-medium text-red-900">Error</p>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={retry}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          )}

          {/* Transcript Display */}
          {transcript && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900">You said:</p>
              <p className="text-blue-700 mt-1">{transcript}</p>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing your request...</span>
            </div>
          )}

          {/* Ready to Book Message */}
          {context.conversationStep === 'ready_to_book' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-green-900">
                  Perfect! I'm ready to book your {matchedService?.title} for {suggestedDate} at {availableSlots[0]?.time}. 
                  Opening booking form...
                </p>
              </div>
            </div>
          )}

          {/* AI Response */}
          {aiResponse && !isProcessing && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="text-sm font-medium text-green-900">ServiceSync:</p>
              </div>
              <p className="text-green-700 mt-1">{aiResponse}</p>
            </div>
          )}

          {/* Matched Service */}
          {matchedService && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold text-lg">{matchedService.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{matchedService.description}</p>
              <div className="flex gap-4 mt-3">
                <span className="text-sm flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {matchedService.duration} min
                </span>
                <span className="text-sm font-medium">£{matchedService.price}</span>
              </div>
              {matchedService.features && matchedService.features.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">Features:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {matchedService.features.map((feature) => (
                      <span 
                        key={feature}
                        className="text-xs bg-muted px-2 py-1 rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Available Slots */}
          {availableSlots.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Available Time Slots for {suggestedDate}
              </h4>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {availableSlots.map((slot, idx) => (
                  <Button
                    key={`${slot.time}-${idx}`}
                    variant="outline"
                    className="justify-between h-auto p-3"
                    onClick={() => handleConfirmBooking(slot)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{formatTime(slot.time)}</span>
                      <span className="text-xs text-muted-foreground">
                        {slot.status === 'available' ? '✓ Available' : '⏳ Waitlist'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {slot.status === 'available' ? 'Book Now' : 'Join Waitlist'}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* No Slots Available */}
          {matchedService && availableSlots.length === 0 && !isProcessing && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                No time slots are currently available for this service. 
                Please try a different date or contact us for assistance.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={reset}
              disabled={isProcessing}
            >
              Clear
            </Button>
            <Button 
              variant="outline" 
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
