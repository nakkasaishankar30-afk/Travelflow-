import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Trash2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Plus, 
  BadgePercent, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Compass, 
  Share2, 
  Layers
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { collection, doc, deleteDoc, onSnapshot, addDoc, setDoc, updateDoc } from 'firebase/firestore';

interface SavedScreenProps {
  origin?: any;
  setSelectedDest: (dest: any) => void;
  setActiveTab: (tab: string) => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  allDestinations: any[];
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  origin,
  setSelectedDest,
  setActiveTab,
  openAuthModal,
  allDestinations
}) => {
  const { user, db, signIn } = useFirebase();
  const [activeSubTab, setActiveSubTab] = useState<'wishlist' | 'checklist' | 'coupons'>('wishlist');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState<'Essentials' | 'Clothing' | 'Gear' | 'Toiletries'>('Essentials');
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Calculate distance helper
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

  // Sync favorites
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    const favsRef = collection(db, 'users', user.uid, 'favorites');
    const unsub = onSnapshot(favsRef, (snap) => {
      const favList: any[] = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const found = allDestinations.find(d => d.id === data.destinationId || d.name.toLowerCase() === (data.destinationName || '').toLowerCase());
        if (found) {
          favList.push({ ...found, favoriteDocId: docSnap.id, savedAt: data.createdAt });
        } else {
          favList.push({
            id: data.destinationId,
            name: data.destinationName || 'Saved Destination',
            location: 'Scenic Sanctuary',
            image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
            rating: 4.8,
            budget: 15000,
            duration: 4,
            favoriteDocId: docSnap.id,
            savedAt: data.createdAt
          });
        }
      });
      setFavorites(favList);
      setLoading(false);
    }, (err) => {
      console.warn('SavedScreen favorites listener error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [user, db, allDestinations]);

  // Sync global packing checklist
  useEffect(() => {
    if (!user || !db) {
      setChecklistItems([
        { id: '1', task: 'Passport & Government ID cards', category: 'Essentials', completed: true },
        { id: '2', task: 'Breathable trail clothes & rain jacket', category: 'Clothing', completed: false },
        { id: '3', task: 'Universal power adapter & 20,000mAh bank', category: 'Gear', completed: true },
        { id: '4', task: 'Biodegradable sunscreen & repellent', category: 'Toiletries', completed: false },
        { id: '5', task: 'First aid kit with electrolyte sachets', category: 'Essentials', completed: false },
      ]);
      return;
    }
    const checklistRef = collection(db, 'users', user.uid, 'checklists');
    const unsub = onSnapshot(checklistRef, (snap) => {
      if (snap.empty) {
        // Initial default checklist
        const defaults = [
          { id: '1', task: 'Passport & Government ID cards', category: 'Essentials', completed: true },
          { id: '2', task: 'Breathable trail clothes & rain jacket', category: 'Clothing', completed: false },
          { id: '3', task: 'Universal power adapter & 20,000mAh bank', category: 'Gear', completed: true },
          { id: '4', task: 'Biodegradable sunscreen & repellent', category: 'Toiletries', completed: false },
          { id: '5', task: 'First aid kit with electrolyte sachets', category: 'Essentials', completed: false },
        ];
        setChecklistItems(defaults);
      } else {
        setChecklistItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    }, (err) => {
      console.warn('SavedScreen checklist listener error:', err);
    });
    return () => unsub();
  }, [user, db]);

  const removeFavorite = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'favorites', docId));
    } catch (err) {
      console.error('Error removing favorite:', err);
    }
  };

  const toggleChecklist = async (item: any) => {
    if (!user) {
      setChecklistItems(prev => prev.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t));
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid, 'checklists', item.id);
      await updateDoc(docRef, { completed: !item.completed });
    } catch (err) {
      // Local fallback
      setChecklistItems(prev => prev.map(t => t.id === item.id ? { ...t, completed: !t.completed } : t));
    }
  };

  const addChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const newItem = {
      id: crypto.randomUUID(),
      task: newTask.trim(),
      category: newCategory,
      completed: false,
      createdAt: new Date().toISOString()
    };

    if (!user) {
      setChecklistItems(prev => [newItem, ...prev]);
      setNewTask('');
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid, 'checklists', newItem.id), newItem);
      setNewTask('');
    } catch (err) {
      console.error('Checklist add error:', err);
    }
  };

  const deleteChecklistItem = async (itemId: string) => {
    if (!user) {
      setChecklistItems(prev => prev.filter(t => t.id !== itemId));
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'checklists', itemId));
    } catch (err) {
      console.error('Delete checklist error:', err);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const coupons = [
    { code: 'BOOKTF10', partner: 'Booking.com', discount: '15% OFF Stays + 5% Cashback', category: 'Hotels', validTill: 'Dec 2026', desc: 'Valid on 28M+ global eco-lodges, resorts and boutique hotels.' },
    { code: 'UBERTF50', partner: 'Uber Intercity', discount: '₹150 OFF Airport Rides', category: 'Cabs', validTill: 'Ongoing', desc: 'Seamless airport pickups and intercity sanctuary trips.' },
    { code: 'MMTEXPLORE', partner: 'MakeMyTrip', discount: 'Flat ₹1,200 OFF Flights', category: 'Flights', validTill: 'Dec 2026', desc: 'Applicable across domestic flights and international hops.' },
    { code: 'SAVFLOW', partner: 'Savaari Car Rentals', discount: '10% OFF Outstation Cabs', category: 'Cabs', validTill: 'Ongoing', desc: 'Verified highway chauffeurs for scenic mountain routes.' },
  ];

  return (
    <div className="pt-24 pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-stone-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400/90 mb-1 flex items-center gap-1.5">
            <Heart size={14} className="fill-emerald-400 text-emerald-400" /> Peaceful Sanctuary
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Saved & Checklists
          </h1>
          <p className="text-sm text-stone-400 mt-1">
            Your bookmarked nature destinations, packing essentials, and partner cashback coupons.
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-[#0a1811] p-1.5 rounded-2xl border border-emerald-900/40 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setActiveSubTab('wishlist')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'wishlist'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Heart size={14} className={activeSubTab === 'wishlist' ? 'fill-current' : ''} />
            <span>Wishlist ({favorites.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('checklist')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'checklist'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Packing List</span>
          </button>
          <button
            onClick={() => setActiveSubTab('coupons')}
            className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'coupons'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <BadgePercent size={14} />
            <span>Coupons</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Wishlist */}
      {activeSubTab === 'wishlist' && (
        <div>
          {!user ? (
            <div className="p-8 sm:p-12 text-center bg-[#0a1811]/70 border border-emerald-900/40 rounded-3xl mb-8">
              <Compass size={40} className="text-emerald-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sign in to sync your saved places</h3>
              <p className="text-stone-400 text-sm max-w-md mx-auto mb-6">
                Save tranquil escapes, compare distances from your hometown, and plan future journeys across devices.
              </p>
              <button
                onClick={() => openAuthModal ? openAuthModal('login') : signIn()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                Sign In to TravelFlow
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Loading your saved places...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="py-16 sm:py-24 text-center bg-[#0a1811]/60 border border-emerald-900/30 rounded-3xl">
              <Heart size={44} className="text-stone-600 mx-auto mb-4 stroke-[1.5]" />
              <h3 className="text-xl font-bold text-white mb-2">Your wishlist is peaceful and empty</h3>
              <p className="text-sm text-stone-400 max-w-sm mx-auto mb-6">
                Explore mountain retreats, serene lakes, and emerald coastlines. Tap the heart icon on any card to save it here.
              </p>
              <button
                onClick={() => setActiveTab('explore')}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                Discover Destinations
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((dest, idx) => {
                const distanceKm = origin && dest.lat && dest.lng 
                  ? calculateDistanceKm(origin.lat, origin.lng, dest.lat, dest.lng)
                  : null;

                return (
                  <motion.div
                    key={dest.favoriteDocId || dest.id || idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      setSelectedDest(dest);
                      setActiveTab('dest-detail');
                    }}
                    className="group cursor-pointer bg-[#0c1c14] border border-emerald-900/30 hover:border-emerald-500/50 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-emerald-950/40"
                  >
                    <div>
                      {/* Image */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={dest.image}
                          alt={dest.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Top controls */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-emerald-200 bg-[#06100c]/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-800/40">
                            {dest.region === 'India' ? '🇮🇳 India' : '🌍 World'} · {dest.type || 'Nature'}
                          </span>

                          <button
                            onClick={(e) => removeFavorite(dest.favoriteDocId, e)}
                            className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-500/80 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove from saved"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Name & Location */}
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

                      {/* Content Preview */}
                      <div className="p-5">
                        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {dest.description || 'Tranquil scenery, rich culture, and restorative nature sights.'}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 pt-0">
                      <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3 text-stone-400 font-medium">
                          <span>₹{(dest.budget || 15000).toLocaleString()}</span>
                          <span aria-hidden="true">·</span>
                          <span>{dest.duration || 4} Days</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-300 font-bold">★ {dest.rating || 4.8}</span>
                        </div>

                        <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform font-bold inline-flex items-center gap-1 text-[11px]">
                          View Guide →
                        </span>
                      </div>

                      {distanceKm !== null && (
                        <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-[11px] text-emerald-300 flex items-center justify-between">
                          <span>📍 Distance from {origin?.name?.split(' ')[0]}:</span>
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
      )}

      {/* Tab 2: Packing Checklist */}
      {activeSubTab === 'checklist' && (
        <div className="max-w-3xl mx-auto">
          {/* Add item bar */}
          <form onSubmit={addChecklistItem} className="p-4 sm:p-5 bg-[#0a1811] border border-emerald-900/40 rounded-3xl mb-8 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Plus size={16} className="text-emerald-400" /> Add Travel Essential
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g., Warm fleece, Hiking shoes, Water purifier..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="flex-1 px-4 py-3 bg-[#06100c] border border-emerald-950 rounded-2xl text-stone-100 placeholder:text-stone-500 text-sm focus:outline-none focus:border-emerald-500/60"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="px-4 py-3 bg-[#06100c] border border-emerald-950 rounded-2xl text-stone-300 text-xs font-bold focus:outline-none focus:border-emerald-500/60"
              >
                <option value="Essentials">Essentials</option>
                <option value="Clothing">Clothing</option>
                <option value="Gear">Gear</option>
                <option value="Toiletries">Toiletries</option>
              </select>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
              >
                Add Item
              </button>
            </div>
          </form>

          {/* Checklist counts */}
          <div className="flex items-center justify-between px-2 mb-4 text-xs font-bold text-stone-400">
            <span>
              {checklistItems.filter(i => i.completed).length} of {checklistItems.length} packed
            </span>
            <div className="w-32 sm:w-48 h-2 bg-[#0a1811] rounded-full overflow-hidden border border-emerald-950">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                style={{
                  width: `${checklistItems.length ? (checklistItems.filter(i => i.completed).length / checklistItems.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2.5">
            {checklistItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item)}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer group ${
                  item.completed
                    ? 'bg-[#08140e]/60 border-emerald-950/60 opacity-60'
                    : 'bg-[#0c1c14] border-emerald-900/30 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-emerald-800 group-hover:border-emerald-500 text-transparent'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${item.completed ? 'line-through text-stone-500' : 'text-stone-100'}`}>
                      {item.task}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChecklistItem(item.id);
                  }}
                  className="p-1.5 text-stone-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Partner Coupons & Cashback */}
      {activeSubTab === 'coupons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {coupons.map((c) => (
            <div
              key={c.code}
              className="p-6 bg-[#0c1c14] border border-emerald-900/30 rounded-3xl flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-emerald-500/40 transition-all"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full" />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/40">
                    {c.partner} · {c.category}
                  </span>
                  <span className="text-[10px] text-stone-400">Valid: {c.validTill}</span>
                </div>

                <h3 className="text-xl font-black text-white mb-1.5">{c.discount}</h3>
                <p className="text-xs text-stone-400 leading-relaxed mb-6">{c.desc}</p>
              </div>

              <div className="pt-4 border-t border-emerald-950/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-[#06100c] border border-emerald-800/50 font-mono text-sm font-bold text-emerald-300">
                    {c.code}
                  </span>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode === c.code ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('hotels')}
                  className="text-xs font-bold text-stone-300 hover:text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                >
                  Use Deal →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
