import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { transcript, context } = await req.json();
    
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    // Get all available services for context
    const services = await db.service.findMany({
      include: { 
        addons: {
          where: { isActive: true }
        }
      }
    });

    console.log('Found services:', services.length);
    
    // Prepare services data for the prompt
    const servicesData = services.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      price: s.price,
      duration: s.duration,
      features: s.features,
      addons: s.addons.map(a => ({ 
        id: a.id, 
        name: a.name, 
        price: a.price, 
        duration: a.duration 
      }))
    }));

    // Safely stringify services data
    let servicesJson = '';
    try {
      servicesJson = JSON.stringify(servicesData, null, 2);
    } catch (stringifyError) {
      console.error('Error stringifying services data:', stringifyError);
      servicesJson = '[]'; // Fallback to empty array
    }

    const systemPrompt = "You are a booking assistant for ServiceSync, a professional appointment booking platform.\n\n" +
      "Available services:\n" +
      servicesJson + "\n\n" +
      "CONVERSATION CONTEXT:\n" +
      (context ? `Previous service: ${context.previousService?.title || 'None'}\n` +
      `Previous date: ${context.previousDate || 'None'}\n` +
      `Previous slots: ${context.previousSlots?.length || 0} slots\n` +
      `Conversation step: ${context.conversationStep}\n\n` : "No previous context\n\n") +
      "Your task:\n" +
      "1. Understand user intent from their voice input\n" +
      "2. If user is refining a previous selection (e.g., 'book 9am'), use the context to understand what they're referring to\n" +
      "3. Match to the most relevant service(s) based on the user's request\n" +
      "4. Extract date/time preferences (handle 'tomorrow', 'next week', 'this weekend', 'afternoon', 'evening', etc.)\n" +
      "5. Handle complex queries like:\n" +
      "   - 'Show me the cheapest service' → Find lowest price\n" +
      "   - 'I want something relaxing under £100' → Filter by price and semantic meaning\n" +
      "   - 'What's the most popular service?' → Consider booking frequency\n" +
      "   - 'Book me for this weekend' → Find Saturday/Sunday slots\n" +
      "   - 'I need a quick appointment' → Find shorter duration services\n" +
      "6. If user selects a specific time (e.g., 'book 9am'), set selectedTime in response\n" +
      "7. Respond naturally and conversationally, remembering previous context\n\n" +
      "CRITICAL: You must return ONLY valid JSON without any markdown formatting, code blocks, or additional text. Do not wrap the response in ```json``` or any other formatting. Return ONLY the raw JSON object.\n\n" +
      "Required JSON format:\n" +
      "{\n" +
      "  \"intent\": \"search\" | \"book\" | \"query\",\n" +
      "  \"matchedServices\": [\n" +
      "    {\n" +
      "      \"serviceId\": \"service_id_here\",\n" +
      "      \"confidence\": 0.95,\n" +
      "      \"reason\": \"Matches user's request for [specific reason]\"\n" +
      "    }\n" +
      "  ],\n" +
      "  \"datePreference\": \"2025-01-20\" | \"tomorrow\" | \"next week\" | \"this weekend\" | \"today\",\n" +
      "  \"timePreference\": \"14:00\" | \"afternoon\" | \"evening\" | \"morning\" | \"any\",\n" +
      "  \"selectedTime\": \"09:00\" | \"14:00\" | null,\n" +
      "  \"priceFilter\": { \"min\": 0, \"max\": 100 },\n" +
      "  \"response\": \"Natural, conversational response to the user\",\n" +
      "  \"contextUpdate\": {\n" +
      "    \"conversationStep\": \"service_selected\" | \"date_selected\" | \"time_selected\" | \"ready_to_book\"\n" +
      "  }\n" +
      "}\n\n" +
      "If no services match, return matchedServices as an empty array but still provide a helpful response.";

    const result = await generateText({
      model: google('gemini-2.0-flash'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User said: "${transcript}"` }
      ],
      temperature: 0.7,
    });

    // Parse the JSON response
    let aiData: {
      intent: string;
      matchedServices: Array<{ serviceId: string; confidence: number; reason: string }>;
      datePreference?: string;
      timePreference?: string;
      selectedTime?: string;
      priceFilter?: { min?: number; max?: number };
      response: string;
      contextUpdate?: {
        conversationStep: string;
      };
    };
    try {
      // Clean the response text to remove markdown formatting
      let cleanText = result.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      aiData = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', result.text);
      console.error('Parse error:', parseError);
      return NextResponse.json({
        intent: 'query',
        matchedServices: [],
        response: "I'm sorry, I had trouble understanding your request. Could you please try again?",
        error: 'Failed to parse AI response'
      });
    }

    return NextResponse.json(aiData);

  } catch (error) {
    console.error('Voice processing error:', error);
    return NextResponse.json({
      intent: 'query',
      matchedServices: [],
      response: "I'm sorry, I encountered an error processing your request. Please try again.",
      error: 'Internal server error'
    }, { status: 500 });
  }
}
