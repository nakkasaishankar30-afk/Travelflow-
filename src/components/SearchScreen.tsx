import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Sparkles, 
  SlidersHorizontal, 
  Map as MapIcon, 
  Grid, 
  Heart, 
  Star, 
  ChevronRight, 
  Calendar, 
  DollarSign, 
  Compass, 
  Layers,
  Check,
  RefreshCw
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface SearchScreenProps {
  destinations: any[];
  origin: any;
  setOrigin: (origin: any) => void;
  setSelectedDest: (dest: any) => void;
  setActiveTab: (tab: string) => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  setAiFilters?: (filters: any) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  destinations,
  origin,
  setOrigin,
  setSelectedDest,
  setActiveTab,
  openAuthModal,
  setAiFilters
}) => {
  const { user, db, signIn } = useFirebase();
  const [query, setQuery] = useState('');
  const [showOriginPicker, setShowOriginPicker] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('All');
  const [budgetFilter, setBudgetFilter] = useState('All');
  const [durationFilter, setDurationFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Distance helper
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const savedLocations = [
    { id: 'l1', name: 'Hyderabad', lat: 17.3850, lng: 78.4867, type: 'City', icon: '💎' },
    { id: 'l2', name: 'Mumbai', lat: 19.0760, lng: 72.8777, type: 'City', icon: '🌊' },
    { id: 'l3', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, type: 'City', icon: '🏛️' },
    { id: 'l4', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'City', icon: '💻' },
    { id: 'l5', name: 'London (UK)', lat: 51.5074, lng: -0.1278, type: 'Global', icon: '🇬🇧' },
    { id: 'l6', name: 'Paris (FR)', lat: 48.8566, lng: 2.3522, type: 'Global', icon: '🇫🇷' },
  ];

  const handleGpsDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          id: 'live-gps',
          name: 'Current Location (GPS)',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isGps: true
        });
        setIsDetectingGps(false);
        setShowOriginPicker(false);
      },
      (err) => {
        console.warn('GPS location error:', err);
        setOrigin({
          id: 'hyd',
          name: 'Hyderabad (Default Hub)',
          lat: 17.3850,
          lng: 78.4867,
          isGps: false
        });
        setIsDetectingGps(false);
        setShowOriginPicker(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const quickSuggestions = [
    'Misty hill stations',
    'Quiet beaches under ₹15,000',
    'Tea plantations & backwaters',
    'Himalayan road trips',
    'Ancient temple ruins',
    'Alpine mountain villages'
  ];

  const handleAiSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsAiSearching(true);
    try {
      const response = await fetch('/api/ai/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const parsed = await response.json();
      if (setAiFilters) setAiFilters(parsed);

      if (parsed.intent === 'plan') {
        setActiveTab('planner');
      } else if (parsed.destination) {
        const match = destinations.find(d => d.name.toLowerCase().includes(parsed.destination.toLowerCase()));
        if (match) {
          setSelectedDest(match);
          setActiveTab('dest-detail');
        }
      }
    } catch (err) {
      console.error('AI search error:', err);
    } finally {
      setIsAiSearching(false);
    }
  };

  const filteredDestinations = useMemo(() => {
    let list = [...destinations];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(d => 
        d.name.toLowerCase().includes(q) ||
        d.location.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q) ||
        (d.subRegion && d.subRegion.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q)
      );
    }

    if (selectedVibe !== 'All') {
      const v = selectedVibe.toLowerCase();
      list = list.filter(d => {
        const t = (d.type || '').toLowerCase();
        const tag = (d.tag || '').toLowerCase();
        const desc = (d.description || '').toLowerCase();
        if (v === 'beaches') return t.includes('beach') || tag.includes('beach') || desc.includes('beach') || desc.includes('coast');
        if (v === 'mountains') return t.includes('mountain') || tag.includes('mountain') || tag.includes('hill') || desc.includes('mountain') || desc.includes('himalaya');
        if (v === 'wildlife') return t.includes('wildlife') || t.includes('nature') || tag.includes('wildlife') || desc.includes('wildlife') || desc.includes('sanctuary');
        if (v === 'historical places') return t.includes('heritage') || t.includes('historical') || tag.includes('heritage') || desc.includes('temple') || desc.includes('palace');
        if (v === 'cities') return t.includes('city') || tag.includes('city') || desc.includes('city');
        return t === v || tag === v;
      });
    }

    if (regionFilter !== 'All') {
      list = list.filter(d => d.region.toLowerCase() === regionFilter.toLowerCase());
    }

    if (budgetFilter !== 'All') {
      if (budgetFilter === '< ₹10k') list = list.filter(d => d.budget < 10000);
      if (budgetFilter === '₹10k–₹25k') list = list.filter(d => d.budget >= 10000 && d.budget <= 25000);
      if (budgetFilter === '₹25k–₹50k') list = list.filter(d => d.budget > 25000 && d.budget <= 50000);
      if (budgetFilter === '₹50k+') list = list.filter(d => d.budget > 50000);
    }

    if (durationFilter !== 'All') {
      if (durationFilter === 'Weekend (2–3d)') list = list.filter(d => d.duration >= 2 && d.duration <= 3);
      if (durationFilter === '4–7 Days') list = list.filter(d => d.duration >= 4 && d.duration <= 7);
      if (durationFilter === '8+ Days') list = list.filter(d => d.duration >= 8);
    }

    if (origin) {
      list.sort((a, b) => {
        const dA = calculateDistanceKm(origin.lat, origin.lng, a.lat, a.lng);
        const dB = calculateDistanceKm(origin.lat, origin.lng, b.lat, b.lng);
        return dA - dB;
      });
    }

    return list;
  }, [destinations, query, selectedVibe, regionFilter, budgetFilter, durationFilter, origin]);

  return (
    <div className="pt-24 pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-stone-100">
      {/* Header */}
      <div className="max-w-3xl mb-8">
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/90 mb-1 flex items-center gap-1.5">
          <Search size={14} className="text-emerald-400" /> Discover Anywhere
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Search Sanctuaries & Routes
        </h1>
        <p className="text-sm text-stone-400 mt-1">
          Find serene landscapes, filter by travel budget or duration, and compute distances from your home.
        </p>
      </div>

      {/* Origin & Search Bar Box */}
      <div className="bg-[#0a1811] border border-emerald-900/40 rounded-3xl p-5 sm:p-6 mb-8 shadow-2xl relative">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
          {/* Starting From Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOriginPicker(!showOriginPicker)}
              className="w-full md:w-64 flex items-center justify-between p-3.5 bg-[#06100c] border border-emerald-950 hover:border-emerald-700/50 rounded-2xl transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="truncate">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Starting Point</p>
                  <p className="text-xs font-bold text-white truncate">
                    {origin ? origin.name : 'Choose Origin'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-stone-500 flex-shrink-0" />
            </button>

            {/* Origin Picker Dropdown */}
            <AnimatePresence>
              {showOriginPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 top-full mt-2 w-80 bg-[#08160f] border border-emerald-900/60 rounded-3xl p-5 shadow-2xl z-50"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Starting Location</h4>
                    <button
                      onClick={() => setShowOriginPicker(false)}
                      className="text-stone-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isDetectingGps}
                    onClick={handleGpsDetect}
                    className="w-full p-3.5 mb-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/40 rounded-2xl flex items-center gap-3 transition-colors text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                      {isDetectingGps ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Navigation size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {isDetectingGps ? 'Locating via GPS...' : 'Use My GPS Location'}
                      </p>
                      <p className="text-[10px] text-emerald-300/80">Accurate road & flight distance</p>
                    </div>
                  </button>

                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">Or Popular Hubs</p>
                  <div className="grid grid-cols-2 gap-2">
                    {savedLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setOrigin(loc);
                          setShowOriginPicker(false);
                        }}
                        className="p-2.5 bg-[#06100c] hover:bg-emerald-950/40 border border-emerald-950 hover:border-emerald-800/40 rounded-xl text-left text-xs font-medium text-stone-200 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>{loc.icon}</span>
                        <span className="truncate">{loc.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Input Bar */}
          <form onSubmit={handleAiSearchSubmit} className="flex-1 flex items-center gap-2 relative">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search mountains, lakes, budget, or 'quiet beaches in South India'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-[#06100c] border border-emerald-950 focus:border-emerald-600 rounded-2xl text-stone-100 placeholder:text-stone-500 text-sm focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isAiSearching}
              className="px-5 sm:px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer shadow-lg shadow-emerald-950/40"
            >
              {isAiSearching ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </form>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="mt-4 pt-3.5 border-t border-emerald-950/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider flex-shrink-0">
            Inspire:
          </span>
          {quickSuggestions.map((sug) => (
            <button
              key={sug}
              onClick={() => setQuery(sug)}
              className="text-[11px] text-stone-300 hover:text-emerald-300 bg-[#06100c] hover:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-950/80 whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and View Toggles */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Vibe / Theme Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {['All', 'Beaches', 'Mountains', 'Wildlife', 'Historical Places', 'Cities', 'Nature', 'Adventure'].map((vibe) => (
            <button
              key={vibe}
              onClick={() => setSelectedVibe(vibe)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedVibe === vibe
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-[#0a1811] text-stone-400 hover:text-white border border-emerald-900/30'
              }`}
            >
              {vibe === 'All' ? 'All Categories' : vibe}
            </button>
          ))}
        </div>

        {/* Region & Budget Dropdowns */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 bg-[#0a1811] border border-emerald-900/40 rounded-xl text-xs font-bold text-stone-200 focus:outline-none"
          >
            <option value="All">All Regions</option>
            <option value="India">🇮🇳 India</option>
            <option value="World">🌍 Worldwide</option>
          </select>

          <select
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
            className="px-3 py-2 bg-[#0a1811] border border-emerald-900/40 rounded-xl text-xs font-bold text-stone-200 focus:outline-none"
          >
            <option value="All">Any Budget</option>
            <option value="< ₹10k">Under ₹10k</option>
            <option value="₹10k–₹25k">₹10k–₹25k</option>
            <option value="₹25k–₹50k">₹25k–₹50k</option>
            <option value="₹50k+">₹50k+</option>
          </select>

          <button
            onClick={() => setActiveTab('map')}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <MapIcon size={14} /> Map View
          </button>
        </div>
      </div>

      {/* Results Count Banner */}
      <div className="flex items-center justify-between mb-6 text-xs text-stone-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredDestinations.length}</strong> tranquil destinations
          {origin && <span> · sorted by distance from <strong>{origin.name}</strong></span>}
        </span>
        {query && (
          <button
            onClick={() => setQuery('')}
            className="text-emerald-400 hover:underline font-bold text-xs"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Destinations Grid */}
      {filteredDestinations.length === 0 ? (
        <div className="py-20 text-center bg-[#0a1811]/60 border border-emerald-900/30 rounded-3xl">
          <Search size={40} className="text-stone-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">No destinations match this search</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto mb-6">
            Try resetting filters or ask our AI trip planner to discover and generate a guide for any location worldwide.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedVibe('All');
              setBudgetFilter('All');
              setRegionFilter('All');
            }}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDestinations.map((dest, i) => {
            const distanceKm = origin && dest.lat && dest.lng 
              ? calculateDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng)
              : null;

            return (
              <motion.div
                key={dest.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 6) * 0.05 }}
                onClick={() => {
                  setSelectedDest(dest);
                  setActiveTab('dest-detail');
                }}
                className="group cursor-pointer bg-[#0c1c14] border border-emerald-900/30 hover:border-emerald-500/50 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-emerald-950/40"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-emerald-200 bg-[#06100c]/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-800/40">
                        {dest.region === 'India' ? '🇮🇳' : '🌍'} {dest.type}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                        {dest.name}
                      </h3>
                      <p className="text-xs text-stone-300 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-emerald-400" />
                        <span>{dest.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {dest.description}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-stone-400 font-medium">
                      <span>₹{dest.budget.toLocaleString()}</span>
                      <span aria-hidden="true">·</span>
                      <span>{dest.duration} Days</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-amber-300 font-bold">★ {dest.rating}</span>
                    </div>

                    <span className="text-emerald-400 font-bold text-[11px]">
                      View →
                    </span>
                  </div>

                  {distanceKm !== null && (
                    <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-[11px] text-emerald-300 flex items-center justify-between">
                      <span>Distance from origin:</span>
                      <span className="font-bold">{distanceKm.toLocaleString()} km</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
