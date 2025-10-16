export interface VoiceSearchState {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  aiResponse: string;
  matchedService: Service | null;
  availableSlots: TimeSlot[];
  suggestedDate: string | null;
  // Context for maintaining conversation state
  context: {
    previousService?: Service;
    previousDate?: string;
    previousSlots?: TimeSlot[];
    conversationStep: 'initial' | 'service_selected' | 'date_selected' | 'time_selected' | 'ready_to_book';
  };
}

export interface TimeSlot {
  date: string;
  time: string;
  status: 'available' | 'waitlist' | 'full';
}

export interface AIBookingIntent {
  action: 'search' | 'book' | 'modify' | 'query';
  serviceName?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  priceRange?: { min?: number; max?: number };
  features?: string[];
  needsConfirmation: boolean;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number;
  features: string[];
}

export interface VoiceSearchResponse {
  intent: 'search' | 'book' | 'query';
  matchedServices: Array<{
    serviceId: string;
    confidence: number;
    reason: string;
  }>;
  datePreference?: string;
  timePreference?: string;
  priceFilter?: { min?: number; max?: number };
  response: string;
}

export interface AvailabilityResponse {
  available: boolean;
  slots?: TimeSlot[];
  date?: string;
  requestedDate?: string;
  alternatives?: Array<{
    date: string;
    dayName: string;
    availableSlots: TimeSlot[];
  }>;
  message?: string;
}

export interface VoiceSearchButtonProps {
  onTranscript: (text: string) => void;
  isListening: boolean;
  onListeningChange: (listening: boolean) => void;
}

export interface VoiceSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingConfirmed: (serviceId: string, date: string, time: string) => void;
}

