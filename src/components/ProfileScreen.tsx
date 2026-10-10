import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Crown, 
  Calendar, 
  Heart, 
  Briefcase, 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  Sparkles, 
  BadgePercent, 
  Compass, 
  MapPin, 
  SlidersHorizontal, 
  Volume2, 
  Moon, 
  Bell, 
  CreditCard, 
  ExternalLink,
  Check,
  CheckCircle2,
  Lock,
  Headphones,
  Shield,
  Trash2,
  Download,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { PartnerBookingsSection } from './PartnerBookingsSection';

interface ProfileScreenProps {
  setActiveTab: (tab: string) => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  isVip?: boolean;
  onOpenPremium?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  setActiveTab,
  openAuthModal,
  isVip = false,
  onOpenPremium
}) => {
  const { user, logOut, deleteAccount } = useFirebase();
  const isAdmin = user?.email === 'nakkasaishankar30@gmail.com';

  const [activeSection, setActiveSection] = useState<'overview' | 'bookings' | 'preferences' | 'privacy' | 'support'>('overview');
  
  // Privacy & Danger zone state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publicProfile, setPublicProfile] = useState(false);
  const [saveLocationHistory, setSaveLocationHistory] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Local preferences state
  const [preferredVibe, setPreferredVibe] = useState('Mountains & Cloud Forests');
  const [travelPace, setTravelPace] = useState('Peaceful & Unhurried');
  const [unitSystem, setUnitSystem] = useState<'km' | 'miles'>('km');
  const [dietary, setDietary] = useState('Vegetarian / Local Farm-to-Table');
  const [soundscapes, setSoundscapes] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSavePreferences = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportData = () => {
    const data = {
      user: {
        uid: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
        exportedAt: new Date().toISOString()
      },
      preferences: {
        preferredVibe,
        travelPace,
        unitSystem,
        dietary
      },
      privacySettings: {
        publicProfile,
        saveLocationHistory,
        marketingEmails
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travelflow-export-${user?.uid || 'guest'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
      setActiveTab('explore');
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError('For security reasons, please log out and log in again before deleting your account.');
      } else {
        setDeleteError(err.message || 'Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pt-24 pb-24 px-4 sm:px-6 max-w-5xl mx-auto min-h-screen text-stone-100">
      {/* Nature-inspired Profile Hero Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-emerald-950/80 shadow-2xl bg-gradient-to-br from-[#06140c] via-[#091b12] to-[#040e08]">
        <div className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay">
          <img 
            src="/src/assets/images/kerala_backwaters_1790916342898.jpg" 
            alt="Kerala Backwaters" 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 p-6 sm:p-10 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-400 shadow-xl">
                <img 
                  src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'Serene Traveler')}&background=064e3b&color=a7f3d0&size=200`} 
                  alt="Profile Avatar" 
                  className="w-full h-full rounded-full object-cover border-2 border-[#091b12]"
                />
              </div>
              {isVip && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black flex items-center justify-center font-bold text-xs shadow-lg border-2 border-[#06140c]" title="VIP Explorer">
                  👑
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif">
                  {user ? (user.displayName || 'Traveler') : 'Guest Explorer'}
                </h1>
                {isVip ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
                    <Crown size={12} className="text-amber-400" />
                    <span>VIP Member</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold">
                    Standard Explorer
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-stone-300 mb-3">
                {user ? user.email : 'Explore sanctuaries worldwide. Sign in to sync itineraries.'}
              </p>

              {/* Status pill */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {user ? (
                  <button 
                    onClick={logOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => openAuthModal ? openAuthModal('login') : setActiveTab('explore')}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <User size={13} />
                    <span>Sign In / Create Account</span>
                  </button>
                )}

                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('admin')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-800/60 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ShieldCheck size={13} className="text-purple-400" />
                    <span>Admin Dashboard</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ₹49 VIP Upgrade Card */}
          <div className="w-full sm:w-auto p-4 sm:p-5 rounded-2xl bg-[#0b2318]/90 border border-emerald-800/60 sm:max-w-xs shadow-lg text-left">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Crown size={13} />
                <span>₹49 VIP Plan</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                {isVip ? 'ACTIVE' : 'POPULAR'}
              </span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed mb-3">
              {isVip 
                ? 'Your VIP membership is active! Enjoy multi-stop AI routing, 2x cashback, and ad-free serenity.'
                : 'Unlock multi-stop circuit routing, double cashback, and ad-free travel planning for just ₹49/month.'}
            </p>
            <button
              onClick={() => onOpenPremium ? onOpenPremium() : setActiveTab('premium')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isVip
                  ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 shadow-amber-900/40'
              }`}
            >
              <Sparkles size={14} />
              <span>{isVip ? 'Manage VIP Membership' : 'Upgrade to VIP for ₹49'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar border-b border-emerald-950/60">
        {[
          { id: 'overview', label: 'Overview & Shortcuts', icon: Compass },
          { id: 'bookings', label: 'Bookings & Cashback', icon: Briefcase },
          { id: 'preferences', label: 'Travel Preferences', icon: SlidersHorizontal },
          { id: 'privacy', label: 'Privacy & Security', icon: Shield },
          { id: 'support', label: 'Support & Concierge', icon: HelpCircle }
        ].map(tab => {
          const isActive = activeSection === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'bg-emerald-800/80 text-white border border-emerald-600/60 shadow-md shadow-emerald-950/40' 
                  : 'text-stone-400 hover:text-stone-200 hover:bg-emerald-950/40 border border-transparent'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-emerald-300' : 'text-stone-500'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Section Content */}
      <AnimatePresence mode="wait">
        {activeSection === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Planned Trips', val: 'My Trips', icon: Calendar, action: () => setActiveTab('trips') },
                { label: 'Saved Wishlist', val: 'Saved Escapes', icon: Heart, action: () => setActiveTab('saved') },
                { label: 'Verified Partners', val: 'Hotels & Flights', icon: Briefcase, action: () => setActiveSection('bookings') },
                { label: 'AI Circuit Planner', val: 'Launch', icon: Sparkles, action: () => setActiveTab('planner') }
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <button
                    key={i}
                    onClick={m.action}
                    className="p-5 rounded-3xl bg-[#081810]/90 border border-emerald-950 hover:border-emerald-700/60 text-left transition-all hover:scale-[1.02] shadow-lg cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 flex items-center justify-center mb-3 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                      <Icon size={18} />
                    </div>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-extrabold text-white flex items-center justify-between">
                      <span>{m.val}</span>
                      <ChevronRight size={14} className="text-emerald-400/60 group-hover:translate-x-1 transition-transform" />
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Nature Atmosphere Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#07160f]/90 border border-emerald-950 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white font-serif mb-1">Peaceful Travel Experience</h3>
                  <p className="text-xs text-stone-400">Customized settings to nurture tranquil discovery on Android & iPhone.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-300">Nature Mode Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Volume2 size={18} className="text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Soothing Nature Soundscapes</p>
                      <p className="text-[11px] text-stone-400">Gentle birdsong & flowing stream audio</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSoundscapes(!soundscapes)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${soundscapes ? 'bg-emerald-600' : 'bg-stone-800'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${soundscapes ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon size={18} className="text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Deep Forest Theme</p>
                      <p className="text-[11px] text-stone-400">OLED high-contrast, eye-protective tones</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60">
                    Always On
                  </span>
                </div>
              </div>
            </div>

            {/* Partner Cashback Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0b2419] to-[#0d2a1c] border border-emerald-800/70 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <BadgePercent size={24} />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-0.5">Partner Cashback Network</h4>
                  <p className="text-xs text-stone-300">
                    Earn up to 15% cashback on Booking.com, Agoda, Skyscanner, MakeMyTrip, and Savaari cabs.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSection('bookings')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shadow-md transition-all cursor-pointer"
              >
                View Eligible Partners & Deals
              </button>
            </div>
          </motion.div>
        )}

        {activeSection === 'bookings' && (
          <motion.div
            key="bookings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <PartnerBookingsSection 
              initialCategory="all"
              openAuthModal={openAuthModal}
              isVip={isVip}
            />
          </motion.div>
        )}

        {activeSection === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-[#081810]/90 border border-emerald-950 shadow-xl space-y-6"
          >
            <div>
              <h3 className="text-xl font-bold text-white font-serif mb-1">Travel Sanctuary Preferences</h3>
              <p className="text-xs text-stone-400">
                Tailor how our AI suggestions and discovery algorithms curate destinations for you.
              </p>
            </div>

            {/* Vibe Selection */}
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5">
                Preferred Landscape Atmosphere
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Mountains & Cloud Forests',
                  'Coastal Backwaters & Serene Beaches',
                  'Ancient Heritage & Sacred Sites',
                  'Wildlife Sanctuaries & Jungles'
                ].map(vibe => (
                  <button
                    key={vibe}
                    onClick={() => setPreferredVibe(vibe)}
                    className={`p-3.5 rounded-2xl text-xs font-semibold text-left transition-all border cursor-pointer ${
                      preferredVibe === vibe 
                        ? 'bg-emerald-900/60 border-emerald-600 text-white shadow-md' 
                        : 'bg-[#05110a] border-emerald-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel Pace */}
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5">
                Desired Travel Pace
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  'Peaceful & Unhurried',
                  'Balanced Sightseeing',
                  'Fast-Paced Explorer'
                ].map(pace => (
                  <button
                    key={pace}
                    onClick={() => setTravelPace(pace)}
                    className={`p-3 rounded-2xl text-xs font-semibold text-center transition-all border cursor-pointer ${
                      travelPace === pace 
                        ? 'bg-emerald-900/60 border-emerald-600 text-white shadow-md' 
                        : 'bg-[#05110a] border-emerald-950 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {pace}
                  </button>
                ))}
              </div>
            </div>

            {/* Units & Dietary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Distance Units
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUnitSystem('km')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      unitSystem === 'km' 
                        ? 'bg-emerald-700 text-white border-emerald-500' 
                        : 'bg-[#05110a] text-stone-400 border-emerald-950'
                    }`}
                  >
                    Kilometers (km)
                  </button>
                  <button
                    onClick={() => setUnitSystem('miles')}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      unitSystem === 'miles' 
                        ? 'bg-emerald-700 text-white border-emerald-500' 
                        : 'bg-[#05110a] text-stone-400 border-emerald-950'
                    }`}
                  >
                    Miles (mi)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Culinary Preference
                </label>
                <select
                  value={dietary}
                  onChange={(e) => setDietary(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#05110a] border border-emerald-950 text-xs font-medium text-stone-200 focus:outline-none focus:border-emerald-600"
                >
                  <option>Vegetarian / Local Farm-to-Table</option>
                  <option>Vegan & Plant-Based</option>
                  <option>Regional Traditional & Seafood</option>
                  <option>All Cuisines Welcome</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-950/80 flex items-center justify-between">
              <span className="text-xs text-stone-400">Settings automatically sync to your device session.</span>
              <button
                onClick={handleSavePreferences}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {savedSuccess ? <Check size={14} /> : <CheckCircle2 size={14} />}
                <span>{savedSuccess ? 'Preferences Saved!' : 'Save Preferences'}</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Privacy & Account Controls */}
        {activeSection === 'privacy' && (
          <motion.div
            key="privacy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="p-6 sm:p-8 rounded-3xl bg-[#081810]/90 border border-emerald-950 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white font-serif mb-1">Privacy Controls & Data Governance</h3>
                <p className="text-xs text-stone-400">
                  Full control over your location signals, private itineraries, and digital footprint.
                </p>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950 flex items-center justify-between">
                  <div className="max-w-md">
                    <p className="text-xs font-bold text-white">Public Profile on Community Reviews</p>
                    <p className="text-[11px] text-stone-400">When enabled, your display name is visible on destination reviews you publish.</p>
                  </div>
                  <button 
                    onClick={() => setPublicProfile(!publicProfile)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${publicProfile ? 'bg-emerald-600' : 'bg-stone-800'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${publicProfile ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950 flex items-center justify-between">
                  <div className="max-w-md">
                    <p className="text-xs font-bold text-white">GPS Route Calculation Caching</p>
                    <p className="text-[11px] text-stone-400">Allow ephemeral browser caching of driving/transit distances to optimize battery.</p>
                  </div>
                  <button 
                    onClick={() => setSaveLocationHistory(!saveLocationHistory)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${saveLocationHistory ? 'bg-emerald-600' : 'bg-stone-800'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${saveLocationHistory ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950 flex items-center justify-between">
                  <div className="max-w-md">
                    <p className="text-xs font-bold text-white">Cashback & Partner Alert Emails</p>
                    <p className="text-[11px] text-stone-400">Receive verified notifications when your eligible cashback claims are approved.</p>
                  </div>
                  <button 
                    onClick={() => setMarketingEmails(!marketingEmails)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${marketingEmails ? 'bg-emerald-600' : 'bg-stone-800'}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${marketingEmails ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              {/* Data Export Button */}
              <div className="pt-4 border-t border-emerald-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white mb-0.5">Export Personal Travel Notebook</h4>
                  <p className="text-xs text-stone-400">Download a portable JSON archive of your itineraries, preferences, and checklist items.</p>
                </div>
                <button
                  onClick={handleExportData}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-800/60 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>{exportSuccess ? 'Downloaded!' : 'Export JSON Data'}</span>
                </button>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="pt-6 border-t border-red-950/60">
                <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={15} />
                      <span>Danger Zone: Account Deletion</span>
                    </h4>
                    <p className="text-xs text-stone-400 leading-relaxed max-w-lg">
                      Permanently remove your account, cloud itineraries, wishlists, and partner referral history. This action is irreversible.
                    </p>
                  </div>
                  {user ? (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete Account</span>
                    </button>
                  ) : (
                    <span className="text-xs text-stone-500 italic">Sign in to manage account</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeSection === 'support' && (
          <motion.div
            key="support"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="p-6 sm:p-8 rounded-3xl bg-[#081810]/90 border border-emerald-950 shadow-xl">
              <h3 className="text-xl font-bold text-white font-serif mb-2">Frequently Asked Questions</h3>
              <p className="text-xs text-stone-400 mb-6">Learn more about our nature curation, ₹49 VIP pass, and cashbacks.</p>

              <div className="space-y-3">
                {[
                  {
                    q: 'How does the ₹49 VIP membership work?',
                    a: 'The ₹49 plan unlocks unlimited AI multi-stop route planning, priority 2x partner cashbacks, live weather forecasts, and an ad-free peaceful interface. Billing is transparent, cancelable anytime in one click.'
                  },
                  {
                    q: 'How do I claim my partner booking cashback?',
                    a: 'Click any partner link (Booking.com, Agoda, Skyscanner, Uber, etc.) in the app, complete your reservation on the partner site, and submit your PNR / booking reference under the Bookings tab to receive verified cashback.'
                  },
                  {
                    q: 'Can I use TravelFlow completely offline?',
                    a: 'Yes! Your saved wishlists and packing checklists are cached locally in your mobile browser, allowing you to view and check off items even without signal in remote mountains or forests.'
                  },
                  {
                    q: 'How are destinations curated?',
                    a: 'We hand-pick peaceful sanctuaries, historical monuments, hill stations, and coastal retreats across India and worldwide that emphasize natural beauty and peaceful exploration.'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-[#05110a] border border-emerald-950">
                    <h4 className="text-sm font-bold text-emerald-300 mb-1">{item.q}</h4>
                    <p className="text-xs text-stone-300 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>

              {/* Support Callout */}
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-[#0a2318] border border-emerald-800/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-800/60 text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-sm">Need help with a trip or partner claim?</h5>
                    <p className="text-xs text-stone-300">Our concierge team is available 24/7 to assist you.</p>
                  </div>
                </div>
                <a
                  href="mailto:support@travelflow.app?subject=Traveler%20Support%20Request"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap shadow-md transition-all cursor-pointer"
                >
                  Contact Concierge
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-3xl bg-[#0a1610] border border-red-900/60 text-white shadow-2xl relative"
          >
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2 font-serif">Permanently Delete Account?</h3>
            <p className="text-xs text-stone-300 mb-4 leading-relaxed">
              This will permanently delete your account (<span className="text-emerald-400 font-mono">{user?.email}</span>), along with all saved itineraries, checklists, and booking records.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/50 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
