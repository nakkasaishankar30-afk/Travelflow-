import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Calendar, 
  User, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Navigation, 
  Clock, 
  Car, 
  Plane, 
  Train, 
  CheckCircle2, 
  Share2, 
  Heart, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Luggage,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { doc, setDoc, collection } from 'firebase/firestore';

interface MultiStopPlannerProps {
  origin: any;
  setOrigin: (o: any) => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  allDestinations: any[];
  isVip?: boolean;
  onOpenPremium?: () => void;
}

export const MultiStopPlanner: React.FC<MultiStopPlannerProps> = ({
  origin,
  setOrigin,
  openAuthModal,
  allDestinations,
  isVip = false,
  onOpenPremium
}) => {
  const { user, db, signIn } = useFirebase();
  const [stops, setStops] = useState<Array<{ id: string; name: string; days: number }>>([
    { id: '1', name: 'Delhi', days: 2 },
    { id: '2', name: 'Agra', days: 1 },
    { id: '3', name: 'Jaipur', days: 2 }
  ]);
  const [travelers, setTravelers] = useState(2);
  const [budget, setBudget] = useState('₹40,000');
  const [interests, setInterests] = useState('Heritage, Scenic, Local Cuisine');
  const [newStopInput, setNewStopInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick preset circuits
  const PRESET_CIRCUITS = [
    {
      name: 'Golden Triangle (India)',
      stops: [{ name: 'Delhi', days: 2 }, { name: 'Agra', days: 1 }, { name: 'Jaipur', days: 2 }],
      budget: '₹35,000',
      interests: 'Heritage, Architecture, Food'
    },
    {
      name: 'South India Backwaters & Hills',
      stops: [{ name: 'Kochi', days: 2 }, { name: 'Munnar', days: 2 }, { name: 'Alleppey', days: 2 }],
      budget: '₹42,000',
      interests: 'Tea Hills, Houseboats, Nature'
    },
    {
      name: 'Classic European Tour',
      stops: [{ name: 'Paris', days: 3 }, { name: 'Swiss Alps', days: 3 }, { name: 'Rome', days: 3 }],
      budget: '₹2,50,000',
      interests: 'Art, Alpine Mountains, Romance'
    },
    {
      name: 'Southeast Asia Island & City',
      stops: [{ name: 'Singapore', days: 3 }, { name: 'Bangkok', days: 2 }, { name: 'Bali', days: 4 }],
      budget: '₹1,20,000',
      interests: 'Tropical Beaches, Street Food, Culture'
    }
  ];

  const handleAddStop = (nameToAdd?: string) => {
    const val = (nameToAdd || newStopInput).trim();
    if (!val) return;
    if (stops.length >= 8 && !isVip) {
      if (onOpenPremium) onOpenPremium();
      else alert('Free plan supports up to 8 stops. Upgrade to VIP Explorer for unlimited multi-stop circuits!');
      return;
    }
    setStops([...stops, { id: Math.random().toString(36).substr(2, 9), name: val, days: 2 }]);
    setNewStopInput('');
  };

  const handleRemoveStop = (id: string) => {
    if (stops.length <= 2) {
      alert('A multi-stop route requires at least 2 destinations.');
      return;
    }
    setStops(stops.filter(s => s.id !== id));
  };

  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === stops.length - 1) return;
    const newStops = [...stops];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    setStops(newStops);
  };

  const handleUpdateDays = (id: string, days: number) => {
    setStops(stops.map(s => s.id === id ? { ...s, days: Math.max(1, Math.min(10, days)) } : s));
  };

  const handleApplyPreset = (preset: typeof PRESET_CIRCUITS[0]) => {
    setStops(preset.stops.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) })));
    setBudget(preset.budget);
    setInterests(preset.interests);
    setPlanResult(null);
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stops.length < 2) {
      alert('Please add at least 2 stops to plan a circuit.');
      return;
    }

    setLoading(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/ai/multi-stop-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin?.name || 'Current Location',
          stops: stops.map(s => ({ name: s.name, days: s.days })),
          travelers,
          budget,
          interests
        })
      });
      const data = await response.json();
      setPlanResult(data);
    } catch (err) {
      console.error('Error generating multi-stop plan:', err);
      alert('Failed to generate multi-stop plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToMyTrips = async () => {
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      else signIn();
      return;
    }
    if (!planResult) return;

    try {
      const tripId = `circuit-${Date.now()}`;
      // Adapt multi-stop structure to standard Itinerary format for My Trips
      const allDays: any[] = [];
      let currentDayIndex = 1;
      
      planResult.stops?.forEach((stop: any) => {
        stop.dayPlans?.forEach((dp: any) => {
          allDays.push({
            day: currentDayIndex++,
            activities: [
              { time: '09:00 AM', activity: `Morning in ${stop.destination}`, description: dp.morning, estimatedCost: '₹600' },
              { time: '02:00 PM', activity: `Afternoon in ${stop.destination}`, description: dp.afternoon, estimatedCost: '₹1,000' },
              { time: '07:30 PM', activity: `Evening in ${stop.destination}`, description: dp.evening, estimatedCost: '₹1,200' }
            ],
            food: [dp.recommendedFood || `${stop.destination} Delicacy`]
          });
        });
      });

      await setDoc(doc(db, 'users', user.uid, 'itineraries', tripId), {
        id: tripId,
        userId: user.uid,
        title: planResult.title,
        destination: stops.map(s => s.name).join(' → '),
        isMultiStop: true,
        stops: stops.map(s => s.name),
        totalDays: planResult.totalDays,
        days: allDays,
        generalTips: planResult.routeTips || [],
        createdAt: new Date().toISOString()
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving multi-stop trip:', err);
      alert('Could not save trip. Check your connection.');
    }
  };

  return (
    <div className="space-y-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-zinc-900 border border-blue-500/20 rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[90px] pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest border border-blue-500/30 mb-4">
            <Layers size={14} /> Multi-Stop Itineraries
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white mb-4">
            Design Your Grand Multi-City Tour
          </h2>
          <p className="text-zinc-400 text-base md:text-lg font-medium leading-relaxed">
            Chain multiple destinations into a seamless route. Get inter-city transit recommendations, cumulative travel times, and balanced day-by-day plans powered by AI.
          </p>
        </div>
      </div>

      {/* Preset Circuits Bar */}
      <div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Popular Circuit Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRESET_CIRCUITS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleApplyPreset(p)}
              className="text-left p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/40 hover:bg-zinc-900 transition-all group"
            >
              <p className="font-black text-sm text-white group-hover:text-blue-400 transition-colors uppercase italic truncate">
                {p.name}
              </p>
              <p className="text-xs text-zinc-500 mt-1 font-bold">
                {p.stops.map(s => s.name).join(' → ')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Circuit Builder & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Sequential Stops List */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Trip Route Stops</h3>
              <p className="text-xs text-zinc-500 font-bold mt-1">Starting point: {origin?.name || 'Current Location'}</p>
            </div>
            <span className="text-xs font-mono font-bold bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-xl">
              {stops.length} Stops ({stops.reduce((sum, s) => sum + s.days, 0)} Days)
            </span>
          </div>

          {/* Sequential Stop Cards */}
          <div className="space-y-3 mb-6">
            {stops.map((stop, idx) => (
              <div 
                key={stop.id}
                className="flex items-center gap-3 p-4 bg-black/40 border border-zinc-800 rounded-2xl group hover:border-zinc-700 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs">
                  {idx + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-black text-base text-white uppercase italic truncate">{stop.name}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    Stop {idx + 1} of {stops.length}
                  </p>
                </div>

                {/* Days Counter */}
                <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 font-bold">Nights:</span>
                  <input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={stop.days}
                    onChange={(e) => handleUpdateDays(stop.id, parseInt(e.target.value) || 1)}
                    className="w-10 bg-transparent text-white font-black text-center text-xs focus:outline-none"
                  />
                </div>

                {/* Reorder Buttons */}
                <div className="flex flex-col gap-1">
                  <button 
                    disabled={idx === 0}
                    onClick={() => handleMoveStop(idx, 'up')}
                    className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button 
                    disabled={idx === stops.length - 1}
                    onClick={() => handleMoveStop(idx, 'down')}
                    className="p-1 text-zinc-600 hover:text-white disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Delete Button */}
                <button 
                  onClick={() => handleRemoveStop(stop.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Remove Stop"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Stop Input & Suggestions */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Add destination (e.g. Udaipur, Tokyo, London...)"
                value={newStopInput}
                onChange={(e) => setNewStopInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStop(); } }}
                className="flex-1 px-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button 
                type="button"
                onClick={() => handleAddStop()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus size={16} /> Add Stop
              </button>
            </div>

            {/* Quick Pick Pills from Catalog */}
            <div className="flex flex-wrap gap-1.5 items-center pt-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase mr-1">Quick Add:</span>
              {['Goa', 'Kashmir', 'Manali', 'Paris', 'Dubai', 'Tokyo', 'Varanasi', 'Bali'].map(destName => (
                <button
                  key={destName}
                  type="button"
                  onClick={() => handleAddStop(destName)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase transition-colors"
                >
                  + {destName}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Parameters & Generate Button */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 md:p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Circuit Details</h3>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Travelers</label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  type="number"
                  min={1}
                  max={20}
                  value={travelers}
                  onChange={(e) => setTravelers(parseInt(e.target.value) || 1)}
                  className="w-full pl-12 pr-4 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Estimated Budget</label>
              <select 
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full px-4 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-blue-500"
              >
                <option>₹25,000 - ₹40,000</option>
                <option>₹40,000 - ₹80,000</option>
                <option>₹80,000 - ₹1,50,000</option>
                <option>₹1,50,000+</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Interests & Priorities</label>
              <input 
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Heritage, Nature, Food, Adventure..."
                className="w-full px-4 py-3 bg-black/40 border border-zinc-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Route Polyline Preview Card */}
            <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800 space-y-2">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Navigation size={12} /> Sequential Journey
              </p>
              <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                {origin?.name || 'Your Location'} → {stops.map(s => s.name).join(' → ')}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <button 
              type="button"
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Synthesizing Multi-City Route...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate Multi-Stop Itinerary
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Multi-Stop Itinerary Results */}
      <AnimatePresence>
        {planResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 md:p-12 space-y-10"
          >
            {/* Title & Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800">
              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/20 inline-block mb-3">
                  AI Circuit Plan Ready
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-white uppercase italic tracking-tight">
                  {planResult.title}
                </h3>
                <p className="text-zinc-400 text-sm mt-2 max-w-2xl font-medium">
                  {planResult.routeSummary}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveToMyTrips}
                  className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${saveSuccess ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30'}`}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 size={16} /> Saved to My Trips!
                    </>
                  ) : (
                    <>
                      <Heart size={16} /> Save Circuit
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Stops Breakdown with Inter-city transit cards */}
            <div className="space-y-8">
              {planResult.stops?.map((stop: any, sIdx: number) => (
                <div key={sIdx} className="space-y-6">
                  {/* Destination Header Card */}
                  <div className="p-6 md:p-8 bg-black/40 border border-zinc-800 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                        {sIdx + 1}
                      </div>
                      <div>
                        <h4 className="text-2xl font-black text-white uppercase italic tracking-tight">
                          Stop {sIdx + 1}: {stop.destination}
                        </h4>
                        <p className="text-xs text-zinc-400 font-medium mt-0.5">{stop.highlight}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-4 py-2 rounded-xl self-start md:self-auto">
                      {stop.daysCount} Days Stay
                    </span>
                  </div>

                  {/* Day by Day Plan for this stop */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 md:pl-8 border-l-2 border-zinc-800 ml-6">
                    {stop.dayPlans?.map((dp: any, dIdx: number) => (
                      <div key={dIdx} className="p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-blue-400 uppercase tracking-widest">
                            Day {dp.dayNumber}
                          </span>
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">
                            {stop.destination}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs font-medium text-zinc-300">
                          <p><strong className="text-zinc-500">Morning:</strong> {dp.morning}</p>
                          <p><strong className="text-zinc-500">Afternoon:</strong> {dp.afternoon}</p>
                          <p><strong className="text-zinc-500">Evening:</strong> {dp.evening}</p>
                          {dp.recommendedFood && (
                            <p className="pt-2 border-t border-zinc-800/60 text-amber-400 text-[11px] font-bold">
                              🍽️ Taste: {dp.recommendedFood}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inter-city transit card if not last stop */}
                  {stop.travelToNext && (
                    <div className="my-6 p-6 bg-gradient-to-r from-blue-950/30 to-purple-950/20 border border-blue-500/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ml-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                          <Train size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-300 uppercase tracking-wider">
                            Transit to {planResult.stops[sIdx + 1]?.destination}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5">{stop.travelToNext.tips}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono font-bold text-zinc-300">
                        <span>⏱️ {stop.travelToNext.duration}</span>
                        <span>💵 {stop.travelToNext.estimatedCost}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Route Tips & Packing Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
              <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <h5 className="font-black text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Luggage size={16} className="text-blue-400" /> Multi-Stop Packing Tips
                </h5>
                <ul className="space-y-2">
                  {planResult.packingHighlights?.map((item: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="text-blue-500">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800">
                <h5 className="font-black text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" /> Road & Rail Intelligence
                </h5>
                <ul className="space-y-2">
                  {planResult.routeTips?.map((tip: string, i: number) => (
                    <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="text-emerald-500">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
