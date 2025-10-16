'use client';

import { useState } from 'react';
import type { Service, TimeSlot } from '@/types/voice';

export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [matchedService, setMatchedService] = useState<Service | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [suggestedDate, setSuggestedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState({
    previousService: undefined as Service | undefined,
    previousDate: undefined as string | undefined,
    previousSlots: undefined as TimeSlot[] | undefined,
    conversationStep: 'initial' as 'initial' | 'service_selected' | 'date_selected' | 'time_selected' | 'ready_to_book'
  });

  const handleTranscript = async (text: string) => {
    setTranscript(text);
    setIsProcessing(true);
    setError(null);
    setAiResponse('');

    try {
      // Step 1: Process with AI (include context)
      console.log('Processing transcript with AI:', text);
      console.log('Current context:', context);
      const aiResponse = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text,
          context: {
            previousService: context.previousService,
            previousDate: context.previousDate,
            previousSlots: context.previousSlots,
            conversationStep: context.conversationStep
          }
        })
      });

      if (!aiResponse.ok) {
        throw new Error(`AI processing failed: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      console.log('AI response:', aiData);
      
      setAiResponse(aiData.response || 'Processing your request...');
      
      // Update context based on AI response
      if (aiData.contextUpdate) {
        setContext(prev => ({
          ...prev,
          ...aiData.contextUpdate
        }));
      }
      
      // Handle time selection (if user is selecting a specific time)
      if (aiData.intent === 'book' && aiData.selectedTime && context.previousService && context.previousDate) {
        console.log('Time selection detected:', aiData.selectedTime);
        // Find the matching slot and trigger booking
        const selectedSlot = context.previousSlots?.find(slot => 
          slot.time === aiData.selectedTime || 
          slot.time.includes(aiData.selectedTime) ||
          aiData.selectedTime.includes(slot.time)
        );
        
        if (selectedSlot) {
          console.log('Found matching slot:', selectedSlot);
          // This will be handled by the parent component
          setMatchedService(context.previousService);
          setSuggestedDate(context.previousDate);
          setAvailableSlots([selectedSlot]);
          setContext(prev => ({ ...prev, conversationStep: 'ready_to_book' }));
          return;
        }
      }
      
      if (aiData.matchedServices && aiData.matchedServices.length > 0) {
        const topMatch = aiData.matchedServices[0];
        console.log('Top match:', topMatch);
        
        // Step 2: Fetch service details
        const serviceResponse = await fetch(`/api/services/${topMatch.serviceId}`);
        if (!serviceResponse.ok) {
          console.error(`Service fetch failed: ${serviceResponse.status}`, serviceResponse.statusText);
          throw new Error(`Service fetch failed: ${serviceResponse.status}`);
        }
        
        const service = await serviceResponse.json();
        console.log('Service details:', service);
        setMatchedService(service);
        
        // Update context with service
        setContext(prev => ({
          ...prev,
          previousService: service,
          conversationStep: 'service_selected'
        }));

        // Step 3: Search availability
        const availabilityResponse = await fetch('/api/voice/search-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: topMatch.serviceId,
            datePreference: aiData.datePreference || 'tomorrow',
            timePreference: aiData.timePreference || 'any'
          })
        });

        if (!availabilityResponse.ok) {
          throw new Error(`Availability search failed: ${availabilityResponse.status}`);
        }

        const availabilityData = await availabilityResponse.json();
        console.log('Availability data:', availabilityData);
        
        if (availabilityData.available) {
          const slots = availabilityData.slots || [];
          setAvailableSlots(slots);
          setSuggestedDate(availabilityData.date);
          setAiResponse(aiData.response + ` I found ${slots.length} available slots for ${availabilityData.date}.`);
          
          // Update context with date and slots
          setContext(prev => ({
            ...prev,
            previousDate: availabilityData.date,
            previousSlots: slots,
            conversationStep: 'date_selected'
          }));
        } else {
          // Show alternatives
          const alternatives = availabilityData.alternatives || [];
          if (alternatives.length > 0) {
            const slots = alternatives[0].availableSlots || [];
            setAvailableSlots(slots);
            setSuggestedDate(alternatives[0].date);
            setAiResponse(aiData.response + ` ${availabilityData.message} The next available date is ${alternatives[0].dayName}.`);
            
            // Update context with alternative date and slots
            setContext(prev => ({
              ...prev,
              previousDate: alternatives[0].date,
              previousSlots: slots,
              conversationStep: 'date_selected'
            }));
          } else {
            setAiResponse(aiData.response + ' Unfortunately, no slots are available in the near future.');
          }
        }
      } else {
        // No services matched
        setMatchedService(null);
        setAvailableSlots([]);
        setSuggestedDate(null);
        setAiResponse(aiData.response || 'I couldn\'t find any services matching your request. Could you please try again?');
      }
    } catch (error) {
      console.error('Voice search error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setAiResponse('Sorry, I encountered an error processing your request. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setTranscript('');
    setAiResponse('');
    setMatchedService(null);
    setAvailableSlots([]);
    setSuggestedDate(null);
    setError(null);
    setContext({
      previousService: undefined,
      previousDate: undefined,
      previousSlots: undefined,
      conversationStep: 'initial'
    });
  };

  const retry = () => {
    if (transcript) {
      handleTranscript(transcript);
    }
  };

  return {
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
  };
}
