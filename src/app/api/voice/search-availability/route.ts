import { NextResponse } from 'next/server';
import { addDays, format, parseISO } from 'date-fns';

export async function POST(req: Request) {
  try {
    const { serviceId, datePreference, timePreference } = await req.json();
    
    if (!serviceId) {
      return NextResponse.json({ error: 'Service ID is required' }, { status: 400 });
    }

    // Parse date preference (handle "tomorrow", "next week", etc.)
    const targetDate = parseDatePreference(datePreference);
    
    // Check availability for target date
    const availability = await checkAvailability(serviceId, targetDate);
    
    if (availability.length === 0) {
      // Find next 3 available days
      const nextAvailable = await findNextAvailableDays(serviceId, targetDate, 3);
      return NextResponse.json({
        available: false,
        requestedDate: format(targetDate, 'yyyy-MM-dd'),
        alternatives: nextAvailable,
        message: `Unfortunately, ${format(targetDate, 'MMMM do')} is fully booked. Here are the next available dates:`
      });
    }
    
    // Filter by time preference if specified
    let filteredSlots = availability;
    if (timePreference && timePreference !== 'any') {
      filteredSlots = filterSlotsByTimePreference(availability, timePreference);
    }
    
    return NextResponse.json({
      available: true,
      slots: filteredSlots,
      date: format(targetDate, 'yyyy-MM-dd'),
      totalSlots: availability.length,
      filteredSlots: filteredSlots.length
    });

  } catch (error) {
    console.error('Availability search error:', error);
    return NextResponse.json({
      error: 'Failed to search availability',
      available: false,
      message: 'Sorry, I encountered an error while checking availability. Please try again.'
    }, { status: 500 });
  }
}

function parseDatePreference(pref: string): Date {
  const today = new Date();
  const lower = pref.toLowerCase();
  
  if (lower.includes('today')) return today;
  if (lower.includes('tomorrow')) return addDays(today, 1);
  if (lower.includes('next week')) return addDays(today, 7);
  if (lower.includes('weekend')) {
    const day = today.getDay();
    // If it's weekend, find next weekend
    if (day === 0 || day === 6) {
      return addDays(today, 7 - day);
    }
    // Otherwise find this weekend
    return addDays(today, 6 - day);
  }
  if (lower.includes('next month')) return addDays(today, 30);
  
  // Try parsing as date
  try {
    const parsed = parseISO(pref);
    if (Number.isNaN(parsed.getTime())) {
      return today;
    }
    return parsed;
  } catch {
    return today;
  }
}

async function checkAvailability(serviceId: string, date: Date) {
  try {
    const dateStr = format(date, 'yyyy-MM-dd');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const response = await fetch(
      `${baseUrl}/api/availability?serviceId=${serviceId}&date=${dateStr}&includeSuggestions=true`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      console.error('Availability API error:', response.status, response.statusText);
      return [];
    }
    
    const data = await response.json();
    return data.slots?.filter((s: { available: boolean }) => s.available).map((slot: { slot: string; available: boolean; conflictCount: number; status: string }) => ({
      time: slot.slot,
      date: dateStr,
      status: slot.status as 'available' | 'waitlist' | 'full'
    })) || [];
  } catch (error) {
    console.error('Error checking availability:', error);
    return [];
  }
}

function filterSlotsByTimePreference(slots: { time: string; date: string; status: string }[], timePreference: string) {
  const lower = timePreference.toLowerCase();
  
  if (lower.includes('morning')) {
    return slots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour >= 9 && hour < 12;
    });
  }
  
  if (lower.includes('afternoon')) {
    return slots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour >= 12 && hour < 17;
    });
  }
  
  if (lower.includes('evening')) {
    return slots.filter(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      return hour >= 17 && hour <= 20;
    });
  }
  
  // If specific time like "14:00" or "2 PM"
  if (lower.includes('pm') || lower.includes('am') || lower.includes(':')) {
    const timeMatch = timePreference.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[3]?.toLowerCase();
      
      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;
      
      return slots.filter(slot => {
        const slotHour = parseInt(slot.time.split(':')[0]);
        return Math.abs(slotHour - hour) <= 1; // Within 1 hour
      });
    }
  }
  
  return slots;
}

async function findNextAvailableDays(serviceId: string, startDate: Date, count: number) {
  const results = [];
  let currentDate = addDays(startDate, 1);
  let attempts = 0;
  
  while (results.length < count && attempts < 30) {
    const slots = await checkAvailability(serviceId, currentDate);
    if (slots.length > 0) {
      results.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        dayName: format(currentDate, 'EEEE, MMMM do'),
        availableSlots: slots.slice(0, 3).map(slot => ({
          time: slot.time,
          date: format(currentDate, 'yyyy-MM-dd'),
          status: slot.status
        })),
        totalAvailable: slots.length
      });
    }
    currentDate = addDays(currentDate, 1);
    attempts++;
  }
  
  return results;
}
