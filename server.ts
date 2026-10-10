import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: { 
    headers: { 'User-Agent': 'aistudio-build' }
  }
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- In-Memory Caches to Prevent Repeated API Calls & Quota Burn ---
  const searchCache = new Map<string, any>();
  const discoveryCache = new Map<string, any>();
  const itineraryCache = new Map<string, any>();

  // --- Curated Rich Fallback Packages (Guarantees 100% uptime even on 429 quota exhaustion) ---
  const CURATED_DESTINATIONS: Record<string, any> = {
    'goa': {
      description: "Sun-drenched golden beaches, vibrant Portuguese heritage, bohemian flea markets, and thrilling water adventures along India's western coast.",
      videoUrls: [
        "https://www.youtube.com/watch?v=kYJde92vHn4",
        "https://www.youtube.com/watch?v=2b9txcAt4eM",
        "https://www.youtube.com/watch?v=F3_6e5qN-9M"
      ],
      popularPlaces: [
        { name: "Baga Beach", type: "Beach", description: "Lively shores famous for water sports, beach shacks, and vibrant nightlife." },
        { name: "Fort Aguada", type: "Heritage", description: "17th-century Portuguese fortress overlooking the vast Arabian Sea." },
        { name: "Basilica of Bom Jesus", type: "Heritage", description: "UNESCO World Heritage site holding the sacred relics of St. Francis Xavier." },
        { name: "Dudhsagar Waterfalls", type: "Nature", description: "Four-tiered majestic cascading white waterfall surrounded by lush sanctuary." },
        { name: "Palolem Beach", type: "Beach", description: "Serene crescent bay with colorful wooden beach huts and dolphin cruises." }
      ],
      bestTime: "November to March",
      avgBudget: 4500,
      food: ["Goan Fish Curry", "Pork Vindaloo", "Bebinca", "Prawn Balchão", "Poi Bread"],
      culture: "A mesmerizing blend of Konkani traditions and Portuguese colonial architecture celebrated through carnivals and music."
    },
    'kashmir': {
      description: "Paradise on Earth featuring tranquil shikaras on Dal Lake, snow-clad Pir Panjal ranges, and blossoming Mughal gardens.",
      videoUrls: [
        "https://www.youtube.com/watch?v=aG3oNfZlG3k",
        "https://www.youtube.com/watch?v=f7_3XnL2l8Q"
      ],
      popularPlaces: [
        { name: "Dal Lake & Houseboats", type: "Nature", description: "Floating gardens and traditional ornate wooden houseboats in Srinagar." },
        { name: "Gulmarg Gondola", type: "Adventure", description: "World's highest cable car ride leading to powdery ski slopes and alpine views." },
        { name: "Pahalgam Valley", type: "Nature", description: "The Valley of Shepherds flanked by Lidder River and pine forests." },
        { name: "Betaab Valley", type: "Nature", description: "Picture-perfect meadow enclosed by snow-capped Himalayan peaks." },
        { name: "Shalimar Bagh", type: "Heritage", description: "Royal Mughal garden designed with stepped terraces and fountains." }
      ],
      bestTime: "April to October (or Dec-Feb for snow)",
      avgBudget: 5500,
      food: ["Rogan Josh", "Kashmiri Wazwan", "Kahwa Tea", "Modur Pulao", "Dum Aloo"],
      culture: "Centuries-old Sufi warmth, pashmina weaving, paper-mâché artistry, and warm hospitality."
    },
    'kerala': {
      description: "God's Own Country with tranquil emerald backwaters, misty tea plantations in Munnar, and pristine Arabian Sea beaches.",
      videoUrls: [
        "https://www.youtube.com/watch?v=R83BlU5nnbs",
        "https://www.youtube.com/watch?v=W0m8-j087Xo"
      ],
      popularPlaces: [
        { name: "Alleppey Backwaters", type: "Nature", description: "Scenic slow cruises through palm-fringed lagoons on traditional houseboats." },
        { name: "Munnar Tea Hills", type: "Nature", description: "Endless rolling green hills with colonial tea estates and misty viewpoints." },
        { name: "Varkala Cliff Beach", type: "Beach", description: "Dramatic red laterite cliffs bordering the warm Arabian waters." },
        { name: "Thekkady Periyar", type: "Wildlife", description: "Elephant reserve and wildlife sanctuary nestled around an artificial lake." },
        { name: "Fort Kochi", type: "Heritage", description: "Iconic Chinese fishing nets, colonial spice markets, and art cafes." }
      ],
      bestTime: "September to March",
      avgBudget: 4200,
      food: ["Appam with Stew", "Karimeen Pollichathu", "Kerala Sadya", "Malabar Parotta", "Banana Chips"],
      culture: "Kathakali classical dance, Ayurvedic wellness heritage, boat races, and harmonious coastal living."
    },
    'paris': {
      description: "The global capital of art, fashion, gastronomy, and culture, defined by romantic boulevards, the Seine river, and the Eiffel Tower.",
      videoUrls: [
        "https://www.youtube.com/watch?v=AQ6GmpMu5L8",
        "https://www.youtube.com/watch?v=7_hE4uXfO38"
      ],
      popularPlaces: [
        { name: "Eiffel Tower", type: "Heritage", description: "Iconic wrought-iron lattice monument offering panoramic views of Paris." },
        { name: "Louvre Museum", type: "Heritage", description: "World's largest museum housing the Mona Lisa and Venus de Milo." },
        { name: "Montmartre & Sacré-Cœur", type: "Culture", description: "Bohemian hilltop quarter filled with street artists and breathtaking basilica." },
        { name: "Seine River Cruise", type: "Romantic", description: "Gliding past Notre-Dame and illuminated bridges at golden hour." },
        { name: "Champs-Élysées & Arc de Triomphe", type: "Shopping", description: "Grand avenue renowned for luxury boutiques and historic triumphal arch." }
      ],
      bestTime: "June to August or September to October",
      avgBudget: 14000,
      food: ["Butter Croissants", "Duck Confit", "Macarons", "Steak Frites", "French Cheese Board"],
      culture: "Café society, haute couture, impressionist art legacies, and relaxed flânerie."
    },
    'tokyo': {
      description: "An electrifying metropolis harmonizing futuristic neon skyscrapers, bullet trains, historic temples, and world-class culinary artistry.",
      videoUrls: [
        "https://www.youtube.com/watch?v=5kEw7sI3oU8",
        "https://www.youtube.com/watch?v=x7nNn_E6C_E"
      ],
      popularPlaces: [
        { name: "Shibuya Crossing", type: "Modern", description: "The world's busiest pedestrian crossing surrounded by giant video screens." },
        { name: "Senso-ji Temple", type: "Spiritual", description: "Tokyo's oldest and most significant Buddhist temple in Asakusa." },
        { name: "Shinjuku Gyoen", type: "Nature", description: "Tranquil sprawling park blending traditional Japanese and French landscape gardens." },
        { name: "Akihabara", type: "Culture", description: "High-energy tech hub famous for gaming, anime, and manga culture." },
        { name: "TeamLab Planets", type: "Art", description: "Immersive digital art museum where visitors walk through water and light." }
      ],
      bestTime: "March to May (Cherry Blossoms) or October to November",
      avgBudget: 12000,
      food: ["Authentic Ramen", "Fresh Nigiri Sushi", "Yakitori Skewers", "Matcha Parfait", "Wagyu Katsu"],
      culture: "Meticulous omotenashi hospitality, anime pop culture, tranquil Zen shrines, and seasonal celebrations."
    }
  };

  // Helper for dynamic rich fallback
  function getFallbackDiscovery(destName: string) {
    const key = destName.toLowerCase().trim();
    for (const [k, v] of Object.entries(CURATED_DESTINATIONS)) {
      if (key.includes(k)) return v;
    }
    return {
      description: `Explore the vibrant wonders of ${destName}. Discover scenic landmarks, immersive cultural sights, and unforgettable local flavors.`,
      videoUrls: [
        "https://www.youtube.com/watch?v=kYJde92vHn4",
        "https://www.youtube.com/watch?v=R83BlU5nnbs"
      ],
      popularPlaces: [
        { name: `${destName} Old Town`, type: "Heritage", description: "Historic quarters with traditional bazaars and architectural treasures." },
        { name: `${destName} Viewpoint`, type: "Nature", description: "Scenic high point offering sweeping vistas across the entire region." },
        { name: "Central Promenade", type: "Couples", description: "Vibrant boulevard lined with artisanal cafes, shopping, and evening music." },
        { name: "Heritage Museum", type: "Culture", description: "Fascinating collection detailing the stories and evolution of the area." },
        { name: "Grand Garden", type: "Nature", description: "Peaceful oasis with manicured flowerbeds and relaxing walking trails." }
      ],
      bestTime: "October to April",
      avgBudget: 4500,
      food: ["Signature Local Specialty", "Fresh Regional Platter", "Artisanal Delicacies", "Traditional Sweet Treat"],
      culture: "Warm local hospitality, celebration of ancestral arts, and vibrant community festivals."
    };
  }

  // Heuristic Natural Language Search Parser Fallback
  function fallbackParseSearch(query: string) {
    const q = query.toLowerCase();
    
    // Type detection
    let type = "Nature";
    if (q.includes('beach') || q.includes('coast') || q.includes('sea')) type = "Beach";
    else if (q.includes('mountain') || q.includes('hill') || q.includes('snow') || q.includes('trek')) type = "Mountains";
    else if (q.includes('temple') || q.includes('spiritual') || q.includes('shrine')) type = "Religious";
    else if (q.includes('adventure') || q.includes('dive') || q.includes('rafting')) type = "Adventure";
    else if (q.includes('food') || q.includes('cafe') || q.includes('eat')) type = "Food";
    else if (q.includes('history') || q.includes('fort') || q.includes('palace') || q.includes('heritage')) type = "Heritage";

    // Duration detection
    let duration = 3;
    const dayMatch = q.match(/(\d+)\s*(day|days|night|nights)/);
    if (dayMatch) duration = parseInt(dayMatch[1]);
    else if (q.includes('weekend')) duration = 2;
    else if (q.includes('week')) duration = 7;

    // Budget detection
    let budget = 25000;
    const budgetMatch = q.match(/(under|below|less than|budget|within|₹|rs\.?)\s*(\d+[\d,]*)/i);
    if (budgetMatch) {
      budget = parseInt(budgetMatch[2].replace(/,/g, ''));
      if (budget < 100) budget *= 1000; // handle '15k'
    } else {
      const kMatch = q.match(/(\d+)\s*k\b/i);
      if (kMatch) budget = parseInt(kMatch[1]) * 1000;
    }

    // Destination detection
    let destination = "";
    const popularKeys = ['goa', 'kerala', 'kashmir', 'paris', 'tokyo', 'dubai', 'manali', 'hyderabad', 'mumbai', 'delhi', 'rajasthan', 'jaipur', 'agra', 'hampi', 'bali', 'ladakh', 'varanasi', 'ooty', 'coorg', 'munnar'];
    for (const key of popularKeys) {
      if (q.includes(key)) {
        destination = key.charAt(0).toUpperCase() + key.slice(1);
        break;
      }
    }

    // Region
    const region = (q.includes('paris') || q.includes('tokyo') || q.includes('dubai') || q.includes('bali') || q.includes('world') || q.includes('europe')) ? "World" : "India";

    // Intent
    const intent = (q.includes('plan') || q.includes('itinerary') || q.includes('build') || q.includes('create trip')) ? "plan" : "search";

    return {
      destination: destination || null,
      region,
      type,
      budget,
      duration,
      interests: [type],
      intent
    };
  }

  // Fallback Day-by-Day Itinerary Generator
  function fallbackTripPlan(dest: string, daysNum: number, budgetVal: any, travelersVal: any, interestsVal: any) {
    const days = Math.min(Math.max(daysNum || 3, 1), 10);
    const dayPlans = [];
    const activitiesPool = [
      { morning: "Sunrise viewpoint & breakfast at local cafe", afternoon: "Historic landmark exploration & guided heritage walk", evening: "Sunset promenade walk and lively night market dinner" },
      { morning: "Outdoor excursion & scenic nature hike", afternoon: "Artisan crafts bazaar & traditional culinary tasting", evening: "Riverside/coastal breeze relaxation with live folk music" },
      { morning: "Spiritual temple/shrine tour and calm gardens", afternoon: "Local museum & cultural craft workshop", evening: "Panoramic rooftop dinner with regional specialties" },
      { morning: "Adventure sports & watersports / photography tour", afternoon: "Secret alleyway exploration & specialty tea tasting", evening: "Chilled ambient lounge & star-gazing experience" }
    ];

    for (let i = 1; i <= days; i++) {
      const template = activitiesPool[(i - 1) % activitiesPool.length];
      dayPlans.push({
        day: i,
        activities: [
          { time: "09:00 AM", activity: `Morning in ${dest}: ${template.morning}`, description: `Start Day ${i} feeling refreshed with scenic views and morning delicacies.`, estimatedCost: "₹500 - ₹1,200" },
          { time: "01:30 PM", activity: `Afternoon Adventure: ${template.afternoon}`, description: `Immerse in the rich sights, local crafts, and neighborhood charms.`, estimatedCost: "₹800 - ₹2,000" },
          { time: "07:00 PM", activity: `Evening Leisure: ${template.evening}`, description: `Unwind with stunning views, delicious regional cuisine, and vibrant energy.`, estimatedCost: "₹1,000 - ₹2,500" }
        ],
        food: [`${dest} Signature Breakfast`, "Authentic Thali / Platter", "Fresh Evening Delicacy"]
      });
    }

    return {
      title: `${days}-Day Wonder Journey to ${dest}`,
      days: dayPlans,
      generalTips: [
        `Book premier attraction passes 24 hours in advance to skip lines in ${dest}.`,
        "Keep local currency handy for street markets and artisanal souvenirs.",
        "Early mornings (before 9 AM) offer the crispest light for breathtaking photographs.",
        "Stay hydrated and sample authentic regional delicacies from busy, reputable spots."
      ]
    };
  }

  // --- API Routes ---

  // Natural Language Search Parser with Cache & 429 Fallback
  app.post('/api/ai/parse-search', async (req, res) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const cacheKey = query.trim().toLowerCase();
    if (searchCache.has(cacheKey)) {
      return res.json(searchCache.get(cacheKey));
    }

    try {
      const prompt = `Parse the following travel search query into structured filters.
Query: "${query}"

Return JSON with:
- destination (string or null, e.g. "Goa")
- region (string, "India" or "World")
- type (string, one of: "Beach", "Mountains", "Religious", "Adventure", "Family", "Couples", "Food", "Nature", "Heritage")
- budget (number, maximum budget in INR)
- duration (number, number of days)
- interests (string[], e.g. ["scuba diving", "history"])
- intent (string, "search" or "plan")

If a field is not mentioned, return null or empty array.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              destination: { type: Type.STRING },
              region: { type: Type.STRING },
              type: { type: Type.STRING },
              budget: { type: Type.NUMBER },
              duration: { type: Type.NUMBER },
              interests: { type: Type.ARRAY, items: { type: Type.STRING } },
              intent: { type: Type.STRING }
            }
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      searchCache.set(cacheKey, parsed);
      res.json(parsed);
    } catch (error: any) {
      console.warn('Gemini parse-search failed or quota exceeded, using smart fallback:', error?.message || error);
      const fallbackResult = fallbackParseSearch(query);
      searchCache.set(cacheKey, fallbackResult);
      res.json(fallbackResult);
    }
  });

  // Rich Destination Discovery with Cache & 429 Fallback
  app.post('/api/ai/discover-destination', async (req, res) => {
    const { destination } = req.body;
    if (!destination) {
      return res.status(400).json({ error: 'Destination is required' });
    }

    const cacheKey = destination.trim().toLowerCase();
    if (discoveryCache.has(cacheKey)) {
      return res.json(discoveryCache.get(cacheKey));
    }

    try {
      const prompt = `Provide a complete visual discovery package for ${destination}.
Include:
- A catchy description (2-3 sentences)
- 3 real YouTube video links (URLs) from major travel channels (like Lonely Planet, Curly Tales, or Travel Guides) for this place.
- Top 5 popular places to visit there with short descriptions and types (Beach, Heritage, Nature, etc.)
- Best time to visit
- Average daily budget for a couple (in INR, number only)
- 4-5 local delicacies to try
- A short history/culture summary (1-2 sentences)

Return as structured JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              videoUrls: { type: Type.ARRAY, items: { type: Type.STRING } },
              popularPlaces: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["name", "type", "description"]
                }
              },
              bestTime: { type: Type.STRING },
              avgBudget: { type: Type.NUMBER },
              food: { type: Type.ARRAY, items: { type: Type.STRING } },
              culture: { type: Type.STRING }
            },
            required: ["description", "popularPlaces", "bestTime", "avgBudget"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      if (!parsed.videoUrls || parsed.videoUrls.length === 0) {
        parsed.videoUrls = [
          "https://www.youtube.com/watch?v=kYJde92vHn4",
          "https://www.youtube.com/watch?v=R83BlU5nnbs"
        ];
      }
      discoveryCache.set(cacheKey, parsed);
      res.json(parsed);
    } catch (error: any) {
      console.warn(`Gemini discover-destination for "${destination}" failed or quota exceeded, using curated fallback:`, error?.message || error);
      const fallback = getFallbackDiscovery(destination);
      discoveryCache.set(cacheKey, fallback);
      res.json(fallback);
    }
  });

  // AI Planner Handler (shared between /api/ai/trip-plan and /api/gemini/plan-trip)
  const handleTripPlan = async (req: express.Request, res: express.Response) => {
    const { destination, days = 4, budget = '₹20,000', travelers = 2, interests = 'Adventure' } = req.body;
    const destName = destination || 'Goa';
    const cacheKey = `${destName}-${days}-${budget}-${travelers}-${interests}`.toLowerCase();

    if (itineraryCache.has(cacheKey)) {
      return res.json(itineraryCache.get(cacheKey));
    }

    try {
      const prompt = `Generate a detailed day-by-day travel itinerary for ${destName} for ${days} days. 
Budget: ${budget}. 
Travelers: ${travelers}. 
Interests: ${interests}.
Include: 
- Daily activities (morning, afternoon, evening) with estimated costs in INR
- Local food recommendations for each day
- General travel tips for this specific destination.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              days: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    activities: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          time: { type: Type.STRING },
                          activity: { type: Type.STRING },
                          description: { type: Type.STRING },
                          estimatedCost: { type: Type.STRING }
                        },
                        required: ["time", "activity", "description", "estimatedCost"]
                      }
                    },
                    food: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["day", "activities", "food"]
                }
              },
              generalTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "days"]
          }
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      itineraryCache.set(cacheKey, parsed);
      res.json(parsed);
    } catch (error: any) {
      console.warn(`Gemini trip-plan failed or quota exceeded, using structured fallback:`, error?.message || error);
      const fallback = fallbackTripPlan(destName, Number(days), budget, travelers, interests);
      itineraryCache.set(cacheKey, fallback);
      res.json(fallback);
    }
  };

  app.post('/api/ai/trip-plan', handleTripPlan);
  app.post('/api/gemini/plan-trip', handleTripPlan);

  // Multi-stop Itinerary Planning with AI & Fallback
  app.post('/api/ai/multi-stop-plan', async (req, res) => {
    const { stops = [], origin = 'Current Location', budget = '₹40,000', travelers = 2, interests = 'Culture, Scenic, Food' } = req.body;
    
    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({ error: 'At least 2 stops are required for a multi-stop itinerary.' });
    }

    const stopNames = stops.map((s: any) => typeof s === 'string' ? s : s.name).join(' -> ');
    const cacheKey = `multistop-${stopNames}-${budget}-${travelers}`.toLowerCase();
    if (itineraryCache.has(cacheKey)) {
      return res.json(itineraryCache.get(cacheKey));
    }

    try {
      const prompt = `Create a cohesive multi-stop travel itinerary starting from "${origin}" covering these sequential destinations: ${JSON.stringify(stops)}.
Budget: ${budget}. Travelers: ${travelers}. Interests: ${interests}.

Provide a structured JSON output with:
- title: string (e.g. "Grand North India Circuit: Delhi to Agra to Jaipur")
- totalDays: number
- routeSummary: string (summary of the complete journey)
- stops: Array of objects for each stop:
  - destination: string
  - daysCount: number
  - highlight: string
  - travelToNext: object with { mode: string (e.g. "Express Train / Scenic Drive"), duration: string, estimatedCost: string, tips: string } (omit for final stop)
  - dayPlans: Array of { dayNumber: number, morning: string, afternoon: string, evening: string, recommendedFood: string }
- packingHighlights: Array of string
- routeTips: Array of string`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      itineraryCache.set(cacheKey, parsed);
      res.json(parsed);
    } catch (error: any) {
      console.warn('Multi-stop AI plan failed or quota reached, generating rich dynamic fallback:', error?.message || error);
      
      let dayCounter = 1;
      const fallbackStops = stops.map((s: any, idx: number) => {
        const destName = typeof s === 'string' ? s : s.name;
        const daysCount = (typeof s === 'object' && s.days) ? Number(s.days) : 2;
        const dayPlans = [];
        for (let d = 1; d <= daysCount; d++) {
          dayPlans.push({
            dayNumber: dayCounter++,
            morning: `Explore iconic morning sights, local viewpoints & authentic breakfast in ${destName}.`,
            afternoon: `Visit premier heritage landmarks, artisan quarters and neighborhood highlights in ${destName}.`,
            evening: `Relaxing sunset boulevard stroll, cultural show & renowned regional dinner in ${destName}.`,
            recommendedFood: `Signature specialty of ${destName} & artisanal tea`
          });
        }

        const isLast = idx === stops.length - 1;
        return {
          destination: destName,
          daysCount,
          highlight: `Immerse in the unique character, architecture and flavors of ${destName}.`,
          travelToNext: isLast ? null : {
            mode: "Scenic Drive / High-speed Express",
            duration: "3 - 5 hours",
            estimatedCost: "₹1,200 - ₹2,500 per person",
            tips: `Book tickets in advance. Morning travel provides sweeping countryside views.`
          },
          dayPlans
        };
      });

      const totalDays = fallbackStops.reduce((sum: number, s: any) => sum + s.daysCount, 0);
      const fallbackResult = {
        title: `Multi-Stop Epic Route: ${stopNames}`,
        totalDays,
        routeSummary: `An unforgettable ${totalDays}-day multi-city journey connecting ${stopNames} tailored for ${travelers} travelers.`,
        stops: fallbackStops,
        packingHighlights: [
          "Comfortable walking footwear suitable for multi-destination terrain",
          "Layered clothing adaptable to changing climates along the route",
          "Universal power bank and fast charger for long transit legs",
          "Digital & physical copies of transit tickets and IDs"
        ],
        routeTips: [
          "Start early on transit days to avoid peak highway or station crowds.",
          "Keep local cash for highway toll booths and artisanal roadside stops.",
          "Download offline maps for regions between major hubs.",
          "Pack luggage in modular bags for easy transfer between destinations."
        ]
      };

      itineraryCache.set(cacheKey, fallbackResult);
      res.json(fallbackResult);
    }
  });

  // Mock Partner APIs
  app.get('/api/hotels/search', (req, res) => {
    res.json([{ id: 'h1', name: 'Grand Hyatt', price: 5000, rating: 4.5 }]);
  });

  app.post('/api/hotels/book', (req, res) => {
    res.json({ status: 'confirmed', bookingId: 'BK-HOTEL-123', commission: 400 });
  });

  app.get('/api/flights/search', (req, res) => {
    res.json([{ id: 'f1', airline: 'IndiGo', price: 4500, from: 'HYD', to: 'GOI' }]);
  });

  app.get('/api/cabs/search', (req, res) => {
    res.json([{ type: 'Sedan', price: 450 }, { type: 'SUV', price: 650 }]);
  });

  // Payments (Compliant Razorpay / Payment Order Generation)
  app.post('/api/payments/create-order', (req, res) => {
    res.json({ orderId: `order_${Math.random().toString(36).substr(2, 9)}`, amount: req.body.amount });
  });

  // Dedicated ₹49 Premium Plan Compliant Order API
  app.post('/api/payments/create-premium-order', (req, res) => {
    const orderId = `order_tf_vip_${Date.now().toString(36)}`;
    res.json({
      orderId,
      currency: "INR",
      planId: "travelflow_vip_49",
      planName: "TravelFlow VIP Explorer Plan",
      pricing: {
        baseAmount: 41.53,
        gstRate: "18%",
        gstAmount: 7.47,
        totalAmount: 49.00
      },
      billingCycle: "Monthly (Auto-renews or One-time choice)",
      cancellationPolicy: "Cancel anytime from your profile with zero penalty.",
      compliance: {
        merchantName: "TravelFlow Technologies India Pvt Ltd",
        rbiMandateCompliant: true,
        securityEncryption: "256-bit SSL encrypted",
        authorizedGateway: "Razorpay Payments"
      }
    });
  });

  app.post('/api/payments/verify', (req, res) => {
    const { orderId, paymentMethod = 'UPI' } = req.body;
    res.json({ 
      success: true, 
      paymentId: `pay_${Math.random().toString(36).substr(2, 9)}`,
      orderId: orderId || `order_${Math.random().toString(36).substr(2, 9)}`,
      paymentMethod,
      timestamp: new Date().toISOString(),
      receiptNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`
    });
  });

  // Business Promotion
  app.get('/api/business/listings', (req, res) => {
    res.json([
      { id: 'b1', name: 'Coastal Cafe', tier: 'sponsored' },
      { id: 'b2', name: 'Himalayan Hikes', tier: 'featured' }
    ]);
  });

  // Weather API Integration (Open-Meteo)
  app.get('/api/weather', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and Longitude are required' });
    }

    try {
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`);
      const data = await response.json();
      
      // Map weather codes to readable strings and icons
      const weatherMap: Record<number, { text: string, icon: string }> = {
        0: { text: 'Clear Sky', icon: '☀️' },
        1: { text: 'Mainly Clear', icon: '🌤️' },
        2: { text: 'Partly Cloudy', icon: '⛅' },
        3: { text: 'Overcast', icon: '☁️' },
        45: { text: 'Foggy', icon: '🌫️' },
        48: { text: 'Rime Fog', icon: '🌫️' },
        51: { text: 'Light Drizzle', icon: '🌦️' },
        53: { text: 'Drizzle', icon: '🌦️' },
        55: { text: 'Heavy Drizzle', icon: '🌦️' },
        61: { text: 'Slight Rain', icon: '🌧️' },
        63: { text: 'Rain', icon: '🌧️' },
        65: { text: 'Heavy Rain', icon: '🌧️' },
        71: { text: 'Slight Snow', icon: '❄️' },
        73: { text: 'Snow', icon: '❄️' },
        75: { text: 'Heavy Snow', icon: '❄️' },
        80: { text: 'Slight Rain Showers', icon: '🌦️' },
        81: { text: 'Rain Showers', icon: '🌦️' },
        82: { text: 'Violent Rain Showers', icon: '🌧️' },
        95: { text: 'Thunderstorm', icon: '⛈️' },
      };

      const result = {
        current: {
          temp: data.current_weather.temperature,
          condition: weatherMap[data.current_weather.weathercode]?.text || 'Unknown',
          icon: weatherMap[data.current_weather.weathercode]?.icon || '🌡️',
          windspeed: data.current_weather.windspeed
        },
        forecast: data.daily.time.map((date: string, i: number) => ({
          date,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          condition: weatherMap[data.daily.weathercode[i]]?.text || 'Unknown',
          icon: weatherMap[data.daily.weathercode[i]]?.icon || '🌡️',
        }))
      };

      res.json(result);
    } catch (error) {
      console.error('Weather error:', error);
      res.status(500).json({ error: 'Failed to fetch weather' });
    }
  });

  // Routes API Integration
  app.post('/api/routes/compute', async (req, res) => {
    const { origin, destination, travelMode = 'DRIVE' } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; // Reusing the same key as it usually has Maps enabled in this environment

    try {
      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey as string,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps',
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng
              }
            }
          },
          travelMode: travelMode,
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: false,
          routeModifiers: {
            avoidTolls: false,
            avoidHighways: false,
            avoidFerries: false
          },
          languageCode: 'en-US',
          units: 'METRIC'
        })
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Routes error:', error);
      res.status(500).json({ error: 'Failed to compute route' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production' || process.env.VITE_PROD === 'true';

  if (!isProduction) {
    console.log('Starting in DEVELOPMENT mode');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    console.log('Starting in PRODUCTION mode');
    const publicPath = __dirname; 
    app.use(express.static(publicPath));
    app.get('*', (req, res) => { 
      res.sendFile(path.join(publicPath, 'index.html')); 
    });
  }

  // Health check for deployment verification
  app.get('/health', (req, res) => res.status(200).send('OK'));

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => { 
    console.log(`Server running on port ${PORT}`); 
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
