import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  MapPin, 
  Trash2, 
  Plus, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  ChevronDown, 
  Clock, 
  Layers, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

interface Activity {
  time?: string;
  name: string;
  type?: string;
  location?: string;
  cost?: string;
}

interface DayPlan {
  day: number;
  activities: Activity[];
}

interface Itinerary {
  id?: string;
  title: string;
  destination: string;
  days: DayPlan[];
  createdAt?: string;
  budget?: string;
  notes?: string;
}

interface TripsScreenProps {
  setActiveTab: (tab: string) => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  setSelectedDest?: (dest: any) => void;
}

export const TripsScreen: React.FC<TripsScreenProps> = ({
  setActiveTab,
  openAuthModal,
  setSelectedDest
}) => {
  const { user, db } = useFirebase();
  const [trips, setTrips] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const itinerariesRef = collection(db, 'users', user.uid, 'itineraries');
    const unsubscribe = onSnapshot(
      itinerariesRef, 
      (snapshot) => {
        const tripsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Itinerary));
        
        setTrips(tripsData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching itineraries:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db]);

  const deleteTrip = async (tripId: string) => {
    if (!user || !window.confirm('Remove this journey from your saved trips?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'itineraries', tripId));
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const handleShare = (trip: Itinerary) => {
    if (navigator.clipboard && trip.id) {
      navigator.clipboard.writeText(`${window.location.origin}/#trip=${trip.id}`);
      setCopiedTripId(trip.id);
      setTimeout(() => setCopiedTripId(null), 2500);
    }
  };

  // Curated inspiration for travelers starting fresh
  const sampleInspirations = [
    {
      title: 'Kashmir Valley & Meadow Trek',
      destination: 'Kashmir, India',
      duration: '5 Days',
      vibe: 'Alpine Serenity',
      image: '/src/assets/images/kashmir_valley_1790916292398.jpg'
    },
    {
      title: 'Munnar Misty Tea Highlands',
      destination: 'Kerala, India',
      duration: '4 Days',
      vibe: 'Cloud Forest & Waterfalls',
      image: '/src/assets/images/munnar_tea_gardens_1790916361869.jpg'
    },
    {
      title: 'Ubud Sacred Waterways & Terraces',
      destination: 'Bali, Indonesia',
      duration: '6 Days',
      vibe: 'Tropical Sanctuary',
      image: '/src/assets/images/bali_tegalalang_rice_terrace_1790916773229.jpg'
    }
  ];

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 max-w-7xl mx-auto min-h-screen text-stone-100">
      {/* Peaceful Header Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-10 border border-emerald-950/70 shadow-2xl bg-gradient-to-br from-[#06140c] via-[#091b12] to-[#040e08]">
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img 
            src="/src/assets/images/hampi_ruins_1790916383616.jpg" 
            alt="Nature backdrop" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/50 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <Compass size={13} className="text-emerald-400" />
              <span>Itinerary Sanctuary</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2 font-serif">
              My Journeys & Plans
            </h1>
            <p className="text-stone-300 text-sm sm:text-base max-w-xl leading-relaxed">
              Curate, revisit, and embark upon peaceful itineraries. Tailored day-by-day schedules synchronized across your devices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('planner')}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Plan New Trip</span>
            </button>
            <button
              onClick={() => setActiveTab('multistop')}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0d2218] hover:bg-[#122e20] text-emerald-200 border border-emerald-800/60 font-semibold text-sm transition-all cursor-pointer"
            >
              <Layers size={16} />
              <span>Multi-Stop Circuit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guest state banner */}
      {!user && (
        <div className="mb-10 p-6 rounded-3xl bg-[#091a11]/90 border border-emerald-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/60 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Sign in to save and sync itineraries</h3>
              <p className="text-xs text-stone-300">Keep your journeys backed up securely in your private cloud notebook.</p>
            </div>
          </div>
          <button
            onClick={() => openAuthModal ? openAuthModal('signup') : setActiveTab('explore')}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all whitespace-nowrap shadow-md cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-3 border-emerald-900 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-stone-400 font-medium tracking-wide">Retrieving your serene journeys...</p>
        </div>
      ) : trips.length === 0 ? (
        /* Empty State */
        <div className="space-y-12">
          <div className="p-8 sm:p-14 rounded-3xl bg-[#08170f]/90 border border-emerald-950 text-center max-w-2xl mx-auto shadow-xl">
            <div className="w-20 h-20 rounded-3xl bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Compass size={36} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 font-serif">No journeys scheduled yet</h3>
            <p className="text-stone-300 text-sm leading-relaxed mb-8 max-w-md mx-auto">
              Your future adventures will be beautifully outlined here. Use our nature-focused AI generator or multi-stop planner to create your first expedition.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('planner')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                Launch AI Trip Planner
              </button>
              <button
                onClick={() => setActiveTab('explore')}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#0d2218] hover:bg-[#122e20] text-emerald-300 border border-emerald-800/60 font-semibold text-sm transition-all cursor-pointer"
              >
                Browse Sanctuaries
              </button>
            </div>
          </div>

          {/* Inspiration Cards */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white font-serif">Inspiration for Your First Journey</h3>
                <p className="text-xs text-stone-400">Hand-crafted routes immersed in mountains, tea estates, and ancient heritage.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sampleInspirations.map((insp, idx) => (
                <div 
                  key={idx}
                  className="rounded-3xl overflow-hidden bg-[#07150e] border border-emerald-950 hover:border-emerald-700/60 transition-all group shadow-lg flex flex-col"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img 
                      src={insp.image} 
                      alt={insp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07150e] via-transparent to-black/20" />
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 text-[11px] font-semibold border border-white/10">
                      {insp.vibe}
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-900/80 text-white text-[11px] font-bold">
                      {insp.duration}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-300 transition-colors">
                        {insp.title}
                      </h4>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-400" />
                        <span>{insp.destination}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('planner')}
                      className="mt-5 w-full py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span>Customize in Planner</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Trips List */
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Showing {trips.length} active {trips.length === 1 ? 'journey' : 'journeys'}</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} />
              <span>Cloud synchronized</span>
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {trips.map((trip) => {
              const isExpanded = expandedTripId === trip.id;
              const totalActivities = trip.days?.reduce((acc, d) => acc + (d.activities?.length || 0), 0) || 0;

              return (
                <motion.div
                  key={trip.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl bg-[#081810]/95 border border-emerald-950 hover:border-emerald-800/60 transition-all p-6 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-900/40 border border-emerald-700/40 text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2">
                          <MapPin size={11} />
                          {trip.destination}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
                          {trip.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleShare(trip)}
                          title="Share Itinerary"
                          className="p-2 rounded-xl text-stone-400 hover:text-emerald-300 hover:bg-emerald-950/60 transition-colors cursor-pointer"
                        >
                          <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => trip.id && deleteTrip(trip.id)}
                          title="Delete trip"
                          className="p-2 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {copiedTripId === trip.id && (
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 size={14} /> Link copied to clipboard!
                      </div>
                    )}

                    {/* Stats pills */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                      <span className="px-3 py-1 rounded-xl bg-[#0c2217] text-stone-200 border border-emerald-900/60 flex items-center gap-1.5">
                        <Calendar size={13} className="text-emerald-400" />
                        <span>{trip.days?.length || 1} Days</span>
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-[#0c2217] text-stone-200 border border-emerald-900/60 flex items-center gap-1.5">
                        <Compass size={13} className="text-emerald-400" />
                        <span>{totalActivities} Experiences</span>
                      </span>
                      {trip.createdAt && (
                        <span className="px-3 py-1 rounded-xl bg-[#0c2217] text-stone-400 border border-emerald-900/40 flex items-center gap-1.5">
                          <Clock size={13} />
                          <span>Planned {new Date(trip.createdAt).toLocaleDateString()}</span>
                        </span>
                      )}
                    </div>

                    {/* Day-by-Day Accordion */}
                    <div className="mt-4 pt-4 border-t border-emerald-950/80">
                      <button
                        onClick={() => setExpandedTripId(isExpanded ? null : (trip.id || null))}
                        className="w-full flex items-center justify-between text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition-colors py-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide daily itinerary' : 'View daily itinerary schedule'}</span>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 pt-3 overflow-hidden"
                          >
                            {trip.days?.map((day) => (
                              <div key={day.day} className="p-3.5 rounded-2xl bg-[#05110a] border border-emerald-950/70">
                                <h5 className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                                  <Calendar size={12} /> Day {day.day}
                                </h5>
                                <div className="space-y-2">
                                  {day.activities?.map((act, aIdx) => (
                                    <div key={aIdx} className="flex items-start gap-2 text-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        <p className="font-semibold text-stone-200">{act.name}</p>
                                        {(act.time || act.cost) && (
                                          <p className="text-[11px] text-stone-400">
                                            {act.time && `${act.time} · `}{act.cost && `Est. ${act.cost}`}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-emerald-950/80 flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-800 text-emerald-200 hover:text-white border border-emerald-800/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Compass size={14} />
                      <span>Explore Destination</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('planner')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>Regenerate in AI</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
