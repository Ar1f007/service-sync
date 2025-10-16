# Voice Search System Documentation

## Overview

The ServiceSync Voice Search System allows users to book appointments using natural language voice commands. The system uses Web Speech API for voice input and Google Gemini Pro for intelligent natural language processing.

## Features

### 🎤 Voice Input
- **Browser-native speech recognition** using Web Speech API
- **Real-time transcription** with visual feedback
- **Cross-browser compatibility** (Chrome, Edge, Safari)
- **Error handling** with user-friendly messages

### 🤖 AI Processing
- **Google Gemini Pro integration** for natural language understanding
- **Intent recognition** for booking, searching, and querying
- **Service matching** with confidence scoring
- **Date/time parsing** (tomorrow, next week, weekend, etc.)
- **Complex query handling** (cheapest, most popular, price ranges)

### 📅 Availability Integration
- **Real-time slot checking** using existing availability API
- **Smart date parsing** for natural language dates
- **Alternative suggestions** when slots are unavailable
- **Time preference filtering** (morning, afternoon, evening)

### 🎯 User Experience
- **Conversational interface** with natural responses
- **Visual feedback** during processing
- **Error recovery** with retry options
- **Form pre-filling** for seamless booking

## Technical Architecture

### Frontend Components

#### VoiceSearchButton
```typescript
// Location: src/components/voice/VoiceSearchButton.tsx
// Purpose: Voice input trigger with browser compatibility checks
// Features: Error handling, visual feedback, accessibility
```

#### VoiceSearchModal
```typescript
// Location: src/components/voice/VoiceSearchModal.tsx
// Purpose: Main voice search interface
// Features: Transcript display, AI responses, slot selection
```

#### useVoiceSearch Hook
```typescript
// Location: src/hooks/useVoiceSearch.ts
// Purpose: Voice search state management
// Features: API orchestration, error handling, state updates
```

### Backend APIs

#### Voice Processing API
```typescript
// Endpoint: POST /api/voice/process
// Purpose: AI-powered intent recognition and service matching
// AI Model: Google Gemini Pro (gemini-1.5-pro)
// Input: Voice transcript
// Output: Structured booking intent with matched services
```

#### Availability Search API
```typescript
// Endpoint: POST /api/voice/search-availability
// Purpose: Find available time slots for matched services
// Features: Date parsing, time filtering, alternative suggestions
// Integration: Uses existing /api/availability endpoint
```

#### Recommendation API
```typescript
// Endpoint: POST /api/voice/recommend
// Purpose: Handle complex queries (cheapest, most popular, etc.)
// Features: Semantic scoring, popularity ranking, price filtering
// Use Cases: "Show me the cheapest service", "What's most popular?"
```

## Voice Commands

### Basic Booking Commands
- "Book a haircut for tomorrow"
- "I want a massage this weekend"
- "Schedule a facial for next Friday"
- "Book the premium package for this afternoon"

### Complex Queries
- "Show me the cheapest service available"
- "What's the most popular treatment?"
- "I want something relaxing under £100"
- "Book me for a quick appointment"
- "Show me luxury services"

### Time Expressions
- **Relative dates**: "tomorrow", "next week", "this weekend"
- **Time periods**: "morning", "afternoon", "evening"
- **Specific times**: "2 PM", "14:00", "afternoon"

## API Integration

### Environment Variables
```bash
# Required for Gemini Pro
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Required for availability checking
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Dependencies
```json
{
  "ai": "^5.0.72",
  "@ai-sdk/google": "^2.0.23",
  "@types/dom-speech-recognition": "^0.0.7"
}
```

## User Flow

### 1. Voice Input
1. User clicks "Voice Search" button
2. Browser requests microphone permission
3. User speaks their request
4. Web Speech API transcribes speech to text

### 2. AI Processing
1. Transcript sent to `/api/voice/process`
2. Gemini Pro analyzes intent and matches services
3. System extracts date/time preferences
4. Returns structured response with matched services

### 3. Availability Check
1. System calls `/api/voice/search-availability`
2. Checks availability for matched service and date
3. If unavailable, finds next 3 available days
4. Returns available time slots

### 4. User Confirmation
1. System displays matched service and available slots
2. User selects preferred time slot
3. Form is pre-filled with voice search results
4. User completes booking through existing flow

## Error Handling

### Voice Recognition Errors
- **No speech detected**: "No speech detected. Please try again."
- **Microphone access denied**: "Microphone access denied. Please allow microphone access."
- **Network error**: "Network error occurred. Please check your connection."
- **Browser not supported**: "Voice search not supported in this browser."

### AI Processing Errors
- **Service not found**: "I couldn't find any services matching your request."
- **No availability**: "No time slots are currently available for this service."
- **API errors**: "Sorry, I encountered an error processing your request."

### Recovery Options
- **Retry button**: Allows users to retry failed requests
- **Clear button**: Resets the voice search state
- **Manual fallback**: Users can still use traditional booking form

## Browser Compatibility

### Supported Browsers
- **Chrome**: Full support with Web Speech API
- **Edge**: Full support with Web Speech API
- **Safari**: Partial support (requires webkit prefix)
- **Firefox**: No native support (shows fallback message)

### Fallback Behavior
- **Unsupported browsers**: Shows "Voice search not supported" message
- **Permission denied**: Provides clear instructions for enabling microphone
- **API failures**: Graceful degradation to manual booking

## Performance Considerations

### Response Times
- **Voice recognition**: < 2 seconds
- **AI processing**: < 3 seconds
- **Availability check**: < 2 seconds
- **Total flow**: < 5 seconds

### Cost Optimization
- **Gemini Pro pricing**: ~$0.01 per 100 voice queries
- **Caching**: Service data cached for faster processing
- **Efficient queries**: Minimal API calls for optimal performance

## Testing Scenarios

### Basic Functionality
1. **Simple booking**: "Book a haircut for tomorrow"
2. **Service selection**: "I want a massage"
3. **Date specification**: "Book for next week"
4. **Time preference**: "Book for this afternoon"

### Complex Queries
1. **Price filtering**: "Show me services under £100"
2. **Popularity queries**: "What's the most popular service?"
3. **Feature matching**: "I want something relaxing"
4. **Duration preferences**: "Book me for a quick appointment"

### Error Scenarios
1. **No availability**: "Book facial for today" (when fully booked)
2. **Unclear speech**: Test with background noise
3. **Invalid requests**: "Book a pizza for tomorrow"
4. **Network issues**: Test with poor connectivity

### Edge Cases
1. **Weekend booking**: "Book for this weekend"
2. **Next month**: "Book for next month"
3. **Specific times**: "Book for 2:30 PM"
4. **Multiple services**: "Show me all massage services"

## Monitoring & Analytics

### Key Metrics
- **Voice recognition accuracy**: Target > 90%
- **AI matching accuracy**: Target > 85%
- **Booking completion rate**: Target > 80%
- **User satisfaction**: Track via feedback

### Error Tracking
- **Voice recognition errors**: Monitor error types and frequency
- **AI processing failures**: Track API response times and errors
- **Availability check failures**: Monitor availability API performance
- **User abandonment**: Track where users drop off in the flow

## Future Enhancements

### Planned Features
- **Multi-language support**: Spanish, French, German
- **Voice confirmation**: "Say yes to confirm" functionality
- **Smart suggestions**: Context-aware service recommendations
- **Voice analytics**: Detailed usage patterns and insights

### Technical Improvements
- **Offline support**: Service worker for offline voice recognition
- **Voice biometrics**: User identification via voice
- **Advanced NLP**: More sophisticated intent recognition
- **Real-time streaming**: Live transcription during speech

## Troubleshooting

### Common Issues

#### Voice Recognition Not Working
1. Check browser compatibility
2. Verify microphone permissions
3. Ensure HTTPS connection
4. Check for background noise

#### AI Processing Failures
1. Verify GOOGLE_GENERATIVE_AI_API_KEY is set
2. Check API quota and billing
3. Review error logs for specific issues
4. Test with simpler queries

#### Availability Check Issues
1. Verify NEXT_PUBLIC_APP_URL is correct
2. Check availability API endpoint
3. Ensure service IDs are valid
4. Review date format parsing

### Debug Commands
```bash
# Test voice processing
curl -X POST http://localhost:3000/api/voice/process \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Book a haircut for tomorrow"}'

# Test availability search
curl -X POST http://localhost:3000/api/voice/search-availability \
  -H "Content-Type: application/json" \
  -d '{"serviceId": "service_id", "datePreference": "tomorrow"}'

# Test recommendations
curl -X POST http://localhost:3000/api/voice/recommend \
  -H "Content-Type: application/json" \
  -d '{"query": "cheapest service", "priceRange": {"max": 100}}'
```

## Security Considerations

### Data Privacy
- **No audio storage**: Voice data processed in real-time only
- **Text processing**: Only transcribed text sent to AI services
- **Secure transmission**: All API calls use HTTPS
- **User consent**: Clear permission requests for microphone access

### API Security
- **Rate limiting**: Prevent abuse of voice processing APIs
- **Input validation**: Sanitize all voice transcripts
- **Error handling**: Avoid exposing sensitive information in errors
- **Authentication**: Ensure user is authenticated for booking

## Support

### Getting Help
- **Documentation**: This guide covers most common scenarios
- **Error messages**: Check browser console for detailed error logs
- **API testing**: Use debug commands to test individual components
- **User feedback**: Collect feedback to improve the system

### Contact
- **Technical issues**: Check error logs and debug commands
- **Feature requests**: Submit via project repository
- **Bug reports**: Include browser version and error details

---

*Last updated: January 2025*

