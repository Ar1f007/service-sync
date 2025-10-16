'use client';

import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VoiceSearchButtonProps } from '@/types/voice';
import { useRef, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

export function VoiceSearchButton({ 
  onTranscript, 
  isListening, 
  onListeningChange 
}: VoiceSearchButtonProps) {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  const isHoldingRef = useRef(false);
  const hasStartedRef = useRef(false);

  // Only sync listening state when it actually changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: <noneed>
    useEffect(() => {
    if (listening !== isListening) {
      onListeningChange(listening);
    }
  }, [listening]);

  // Only send transcript when user releases the button
  // biome-ignore lint/correctness/useExhaustiveDependencies: <noneed>
  useEffect(() => {
    // If we were listening but now we're not, and we're not holding anymore
    if (!listening && hasStartedRef.current && !isHoldingRef.current) {
      if (transcript.trim()) {
        onTranscript(transcript.trim());
      }
      hasStartedRef.current = false;
    }
  }, [listening, transcript]);

  const handleMouseDown = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (!listening) {
      isHoldingRef.current = true;
      hasStartedRef.current = true;
      resetTranscript();
      SpeechRecognition.startListening({ 
        continuous: true,
        language: 'en-US' 
      });
    }
  };

  const handleMouseUp = () => {
    isHoldingRef.current = false;
    if (listening) {
      SpeechRecognition.stopListening();
    }
  };

  const handleMouseLeave = () => {
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      if (listening) {
        SpeechRecognition.stopListening();
      }
    }
  };

  // Show browser support warning
  if (!browserSupportsSpeechRecognition) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="lg"
        disabled
        className="gap-2 min-w-[140px] select-none opacity-50"
      >
        <MicOff className="h-5 w-5" />
        Not Supported
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isListening ? "destructive" : "default"}
      size="lg"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      className="gap-2 min-w-[140px] select-none"
    >
      {isListening ? (
        <>
          <MicOff className="h-5 w-5 animate-pulse" />
          Release to Stop
        </>
      ) : (
        <>
          <Mic className="h-5 w-5" />
          Hold to Speak
        </>
      )}
    </Button>
  );
}