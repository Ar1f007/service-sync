import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { query, priceRange, features, sortBy } = await req.json();
    
    // Get all services with their appointment counts for popularity calculation
    const services = await db.service.findMany({
      include: {
        addons: {
          where: { isActive: true }
        },
        appointments: {
          where: { status: 'confirmed' },
          select: { id: true }
        }
      }
    });

    // Score services based on query and criteria
    const scored = services.map(service => {
      let score = 0;
      const serviceText = `${service.title} ${service.description || ''} ${service.features.join(' ')}`.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Text matching score
      if (serviceText.includes(queryLower)) {
        score += 50;
      }
      
      // Feature matching
      if (features && features.length > 0) {
        const matchingFeatures = features.filter((feature: string) => 
          service.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
        );
        score += matchingFeatures.length * 10;
      }
      
      // Price range matching
      if (priceRange) {
        if (priceRange.min && service.price >= priceRange.min) score += 10;
        if (priceRange.max && service.price <= priceRange.max) score += 10;
        if (priceRange.min && priceRange.max && 
            service.price >= priceRange.min && service.price <= priceRange.max) {
          score += 20;
        }
      }
      
      // Popularity score (based on booking count)
      const popularity = service.appointments.length;
      score += Math.min(popularity * 2, 30); // Cap at 30 points
      
      // Duration-based scoring for specific queries
      if (queryLower.includes('quick') || queryLower.includes('fast')) {
        if (service.duration <= 30) score += 15;
        else if (service.duration <= 60) score += 10;
      }
      
      if (queryLower.includes('relaxing') || queryLower.includes('spa')) {
        if (service.duration >= 60) score += 15;
        if (service.title.toLowerCase().includes('massage') || 
            service.title.toLowerCase().includes('facial')) {
          score += 20;
        }
      }
      
      if (queryLower.includes('cheap') || queryLower.includes('budget') || queryLower.includes('affordable')) {
        // Lower price = higher score
        const maxPrice = Math.max(...services.map(s => s.price));
        score += Math.round((maxPrice - service.price) / maxPrice * 20);
      }
      
      if (queryLower.includes('premium') || queryLower.includes('luxury') || queryLower.includes('best')) {
        // Higher price = higher score for premium queries
        const maxPrice = Math.max(...services.map(s => s.price));
        score += Math.round(service.price / maxPrice * 15);
      }

      return {
        ...service,
        score,
        popularity,
        relevance: score > 30 ? 'high' : score > 15 ? 'medium' : 'low'
      };
    });

    // Sort by score and then by popularity
    const sorted = scored.sort((a, b) => {
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      if (sortBy === 'popularity') return b.popularity - a.popularity;
      if (sortBy === 'duration_low') return a.duration - b.duration;
      if (sortBy === 'duration_high') return b.duration - a.duration;
      
      // Default: score first, then popularity
      if (b.score !== a.score) return b.score - a.score;
      return b.popularity - a.popularity;
    });

    // Filter out very low relevance results
    const filtered = sorted.filter(service => service.score > 5);

    return NextResponse.json({
      recommendations: filtered.slice(0, 5), // Top 5 recommendations
      total: filtered.length,
      query: query,
      appliedFilters: {
        priceRange,
        features,
        sortBy
      }
    });

  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json({
      error: 'Failed to get recommendations',
      recommendations: [],
      total: 0
    }, { status: 500 });
  }
}

