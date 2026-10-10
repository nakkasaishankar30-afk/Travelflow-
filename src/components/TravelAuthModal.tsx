import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Sparkles, 
  MapPin, 
  Compass, 
  ArrowRight, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Plane,
  Heart
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';

interface TravelAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
  onSuccess?: () => void;
  asPage?: boolean;
}

export const TravelAuthModal: React.FC<TravelAuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'login',
  onSuccess,
  asPage = false
}) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest, resetPassword } = useFirebase();
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [forgotModal, setForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  if (!isOpen && !asPage) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setErrorMsg('Please enter your traveler name.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, name.trim());
        setSuccessMsg('Welcome aboard! Your passport has been created.');
      } else {
        await signInWithEmail(email, password);
        setSuccessMsg('Welcome back to TravelFlow!');
      }
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Would you like to create an account?');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please log in.');
      } else if (err.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMsg('Please provide a valid email address.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMsg('Signed in with Google! Ready for departure.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMsg('Google login was interrupted. You can also log in with email or as Guest.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAsGuest();
      setSuccessMsg('Logged in as Guest Explorer!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 600);
    } catch (err: any) {
      console.error('Guest sign in error:', err);
      setErrorMsg('Failed to sign in as guest.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrorMsg('Please enter your email to reset password.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      await resetPassword(resetEmail);
      setSuccessMsg(`Password reset instructions sent to ${resetEmail}`);
      setForgotModal(false);
      setResetEmail('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={asPage ? "min-h-screen relative w-full overflow-hidden" : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"}>
      {/* Backdrop for Modal mode */}
      {!asPage && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />
      )}

      {/* Scenic Travel Atmosphere Container */}
      <div className={`relative w-full ${asPage ? 'min-h-screen flex items-center justify-center py-16 px-4' : 'max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden my-auto'} z-10`}>
        
        {/* Vibrant Sunset Sky Gradient: Turquoise -> Sky Blue -> Coral -> Sunset Orange -> Royal Purple */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-sky-500 via-rose-400 via-amber-500 to-purple-800 -z-10" />

        {/* Radiant Sun Glow behind mountains */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/40 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-rose-500/30 rounded-full blur-[90px] pointer-events-none -z-10" />
        <div className="absolute -bottom-16 -left-16 w-80 h-80 bg-purple-600/40 rounded-full blur-[90px] pointer-events-none -z-10" />

        {/* Ambient Travel Scenery: Sunset Mountains, Clouds, Winding Road, Tiny Flying Airplane */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 opacity-60">
          
          {/* Animated/Floating Clouds */}
          <motion.div 
            animate={{ x: [-20, 30, -20] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-12 left-10 text-white/50"
          >
            <svg width="140" height="48" viewBox="0 0 140 48" fill="currentColor">
              <path d="M120 40c0-6.6-5.4-12-12-12-1.5 0-2.9.3-4.2.8C100.8 19 91.2 12 80 12c-12.7 0-23.3 9.1-25.5 21.2-2.1-1.3-4.6-2.2-7.5-2.2-7.7 0-14 6.3-14 14 0 .3 0 .7.1 1H120z" opacity="0.6"/>
            </svg>
          </motion.div>

          <motion.div 
            animate={{ x: [40, -20, 40] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-20 right-16 text-white/40"
          >
            <svg width="110" height="40" viewBox="0 0 110 40" fill="currentColor">
              <path d="M95 32c0-5.5-4.5-10-10-10-1.2 0-2.4.2-3.5.7C79 14.5 71 8 62 8c-10 0-18.5 7.2-20.2 17-1.7-1-3.7-1.8-6-1.8-6.1 0-11.1 5-11.1 11.1 0 .2 0 .5.1.7H95z" opacity="0.5"/>
            </svg>
          </motion.div>

          {/* Dotted Flowing Travel Path across the background connecting destinations */}
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#fef08a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <path 
              d="M 50 150 Q 250 40 450 180 T 850 140 T 1150 220" 
              fill="none" 
              stroke="url(#pathGradient)" 
              strokeWidth="2.5" 
              strokeDasharray="6 8"
              className="animate-pulse"
            />
          </svg>

          {/* Destination Pin 1: Goa 🏖️ */}
          <div className="absolute top-28 left-[15%] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-sm shadow-lg">
              🏖️
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest uppercase mt-1 drop-shadow">Goa</span>
          </div>

          {/* Destination Pin 2: Paris 🗼 */}
          <div className="absolute top-16 left-[52%] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-sm shadow-lg animate-bounce">
              🗼
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest uppercase mt-1 drop-shadow">Paris</span>
          </div>

          {/* Destination Pin 3: Tokyo ⛩️ */}
          <div className="absolute top-36 right-[12%] flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-sm shadow-lg">
              ⛩️
            </div>
            <span className="text-[10px] font-bold text-white tracking-widest uppercase mt-1 drop-shadow">Tokyo</span>
          </div>

          {/* Tiny Flying Airplane moving along flight path */}
          <motion.div
            animate={{ 
              x: [-100, 1100],
              y: [160, 110, 150, 120]
            }}
            transition={{ 
              duration: 16, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="absolute top-12 left-0 flex items-center gap-1 text-white"
          >
            <Plane size={24} className="rotate-12 fill-white drop-shadow-[0_4px_12px_rgba(255,255,255,0.8)]" />
            <div className="w-12 h-[2px] bg-gradient-to-l from-white/80 to-transparent rounded-full" />
          </motion.div>

          {/* Illustrated Mountain Silhouettes at bottom */}
          <svg className="absolute bottom-0 left-0 right-0 w-full h-48" preserveAspectRatio="none" viewBox="0 0 1200 240">
            {/* Far mountains (purple mist) */}
            <path d="M0,240 L0,160 Q180,60 380,140 Q550,40 760,150 Q960,80 1200,160 L1200,240 Z" fill="#4c1d95" opacity="0.35"/>
            {/* Mid mountains (warm sunset coral) */}
            <path d="M0,240 L0,180 Q220,100 480,180 Q700,90 940,190 Q1080,140 1200,190 L1200,240 Z" fill="#311042" opacity="0.5"/>
            {/* Foreground gentle rolling hills & winding road */}
            <path d="M0,240 L0,205 Q300,160 650,215 Q950,175 1200,210 L1200,240 Z" fill="#1e1b4b" opacity="0.8"/>
            {/* Winding road curve */}
            <path d="M480,240 Q550,215 620,240" stroke="#fcd34d" strokeWidth="4" strokeDasharray="6 6" fill="none" opacity="0.8"/>
          </svg>
        </div>

        {/* Modal Close Button */}
        {!asPage && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 z-30 w-11 h-11 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md border border-white/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-lg"
            title="Close"
          >
            <X size={20} />
          </button>
        )}

        {/* Main Content Layout: Side-by-Side on Desktop */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center p-6 sm:p-10 md:p-14 gap-10">
          
          {/* Left Column: Visual Brand & Emotional Travel Pitch */}
          <div className="lg:col-span-6 text-white space-y-6 text-center lg:text-left">
            
            {/* Flowing Road / Flight-Path Logo */}
            <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-xl px-5 py-2.5 rounded-full border border-white/30 shadow-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex items-center justify-center shadow-md">
                <Compass className="text-white animate-spin-slow" size={20} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black italic tracking-tighter uppercase leading-none">TravelFlow</span>
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight italic leading-[1.05] drop-shadow-md">
                Your Next Journey <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-sky-100">
                  Starts Right Here.
                </span>
              </h1>
              <p className="text-white/85 text-base sm:text-lg font-medium max-w-lg leading-relaxed drop-shadow">
                Discover breathtaking destinations, track scenic routes from your doorstep, and craft smart day-by-day itineraries with AI.
              </p>
            </div>

            {/* Travel Value Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl">
                <div className="text-2xl mb-1">🗺️</div>
                <p className="text-xs font-black uppercase tracking-wider">Exact Routes</p>
                <p className="text-[11px] text-white/70">From here to there</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl">
                <div className="text-2xl mb-1">🌤️</div>
                <p className="text-xs font-black uppercase tracking-wider">Live Weather</p>
                <p className="text-[11px] text-white/70">4-day forecast</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-2xl">
                <div className="text-2xl mb-1">✨</div>
                <p className="text-xs font-black uppercase tracking-wider">AI Itineraries</p>
                <p className="text-[11px] text-white/70">Tailored to your budget</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-3 text-xs text-white/75 font-semibold">
              <div className="flex -space-x-2">
                <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Traveler" />
                <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Traveler" />
                <img className="w-7 h-7 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80" alt="Traveler" />
              </div>
              <span>Joined by 10,000+ wanderers exploring India & the World</span>
            </div>
          </div>

          {/* Right Column: Floating Glassmorphism Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-zinc-950/90 backdrop-blur-2xl rounded-[2.5rem] p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden text-white"
            >
              {/* Subtle top rainbow indicator glow */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-400 via-rose-500 via-amber-400 to-purple-600" />

              {/* Segmented Switcher: Log In vs Sign Up */}
              <div className="flex p-1 bg-zinc-900 rounded-2xl mb-6 relative">
                <button
                  type="button"
                  onClick={() => { setMode('login'); setErrorMsg(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative z-10 ${
                    mode === 'login' 
                      ? 'bg-zinc-800 text-white shadow-md' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(null); }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative z-10 ${
                    mode === 'signup' 
                      ? 'bg-zinc-800 text-white shadow-md' 
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  Sign Up for Free
                </button>
              </div>

              {/* Header Title */}
              <div className="mb-6 text-center">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic uppercase">
                  {mode === 'login' ? 'Welcome Back!' : 'Create Your Passport'}
                </h2>
                <p className="text-zinc-400 text-xs sm:text-sm font-medium mt-1">
                  {mode === 'login' 
                    ? 'Log in to access your saved trips, routes & bookings.' 
                    : 'Join TravelFlow to explore anywhere and plan seamlessly.'}
                </p>
              </div>

              {/* Feedback Alert Banners */}
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-200 text-xs font-semibold"
                >
                  <AlertCircle size={18} className="flex-shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs font-semibold"
                >
                  <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {/* Social Login Options */}
              <div className="space-y-3 mb-6">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 rounded-2xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-sm active:scale-[0.98] group"
                >
                  {/* Official Google G Logo */}
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Apple & Guest Buttons */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg("Apple sign-in is enabled for iOS devices. Try Google or Email!");
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 bg-white text-black rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.66-.82 1.11-1.96.99-3.1-.96.04-2.12.64-2.8 1.44-.6.69-1.12 1.83-1 2.95 1.07.08 2.15-.55 2.81-1.29z"/>
                    </svg>
                    <span>Apple</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGuestSignIn}
                    disabled={loading}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded-2xl text-xs font-bold transition-all active:scale-[0.98]"
                    title="Explore without creating an account"
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Quick Guest</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-zinc-800 w-full" />
                <span className="bg-zinc-950 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 absolute">
                  or with email
                </span>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">
                      Traveler Name
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500">
                        <UserIcon size={17} />
                      </div>
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Wanderer"
                        className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500">
                      <Mail size={17} />
                    </div>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="explorer@travelflow.com"
                      className="w-full pl-11 pr-4 py-3 bg-zinc-900/50 border border-zinc-800 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-600 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-500">
                      <Lock size={17} />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-11 pr-11 py-3 bg-zinc-900/50 border border-zinc-800 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-600 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Extras: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-zinc-400">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-rose-500 focus:ring-rose-500/20 accent-rose-500 cursor-pointer"
                    />
                    <span className="font-semibold text-[11px]">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setForgotModal(true)}
                    className="text-rose-400 hover:text-rose-300 font-bold text-[11px] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Action Button: "Let's Go ✈️" */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-rose-500 via-amber-500 to-purple-600 hover:from-rose-600 hover:via-amber-600 hover:to-purple-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-rose-500/25 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                >
                  {loading ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <span>{mode === 'login' ? "Let's Go" : "Create Passport"}</span>
                      <span className="text-base">✈️</span>
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Friendly Prompt */}
              <div className="mt-6 text-center text-xs text-zinc-500">
                {mode === 'login' ? (
                  <p>
                    Don't have an account?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('signup')}
                      className="text-rose-400 hover:text-rose-300 font-black uppercase tracking-wider"
                    >
                      Sign Up for Free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have a passport?{' '}
                    <button 
                      type="button" 
                      onClick={() => setMode('login')}
                      className="text-rose-400 hover:text-rose-300 font-black uppercase tracking-wider"
                    >
                      Log In
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Forgot Password Mini-Modal */}
      <AnimatePresence>
        {forgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative border border-slate-100"
            >
              <button 
                onClick={() => setForgotModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-4">
                <Lock size={22} />
              </div>

              <h3 className="text-xl font-black text-slate-900 uppercase italic">Reset Password</h3>
              <p className="text-slate-500 text-xs mt-1 mb-5">
                Enter your registered travel email and we'll send you recovery steps.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="your-email@domain.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
                >
                  Send Recovery Link
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
