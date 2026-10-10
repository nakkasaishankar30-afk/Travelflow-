import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Plane, 
  Car, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Sparkles, 
  ShieldCheck, 
  DollarSign, 
  HelpCircle, 
  ArrowUpRight, 
  BadgePercent,
  Search,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { collection, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';

export interface PartnerOffer {
  id: string;
  partnerName: string;
  category: 'hotel' | 'flight' | 'cab';
  title: string;
  description: string;
  badge: string;
  rating: number;
  promoCode: string;
  discount: string;
  cashback: string;
  startingPrice: string;
  trackingUrl: string;
  logo: string;
  perks: string[];
}

const PARTNER_OFFERS: PartnerOffer[] = [
  // Hotels
  {
    id: 'h-booking',
    partnerName: 'Booking.com',
    category: 'hotel',
    title: 'Global Hotels, Villas & Resorts',
    description: 'Over 28 million listings worldwide with free cancellation on most stays.',
    badge: 'Premier Partner',
    rating: 4.8,
    promoCode: 'BOOKTF10',
    discount: 'Up to 15% OFF',
    cashback: '5% Extra Cashback',
    startingPrice: '₹1,800/night',
    trackingUrl: 'https://www.booking.com/?aid=travelflow&utm_source=travelflow',
    logo: '🏨',
    perks: ['Free Cancellation', 'No Prepayment Required', 'Instant Confirmation']
  },
  {
    id: 'h-agoda',
    partnerName: 'Agoda',
    category: 'hotel',
    title: 'Southeast Asia & Luxury Stays',
    description: 'Exclusive member deals on beach resorts, heritage havelis, and boutique stays.',
    badge: 'Best Price Guarantee',
    rating: 4.7,
    promoCode: 'AGODATF12',
    discount: '12% Instant OFF',
    cashback: '5% Extra Cashback',
    startingPrice: '₹1,450/night',
    trackingUrl: 'https://www.agoda.com/?cid=travelflow&utm_source=travelflow',
    logo: '🌴',
    perks: ['Price Match Guarantee', 'Secret Member Deals', '24/7 Support']
  },
  {
    id: 'h-mmt',
    partnerName: 'MakeMyTrip Hotels',
    category: 'hotel',
    title: 'Curated Indian Homestays & Resorts',
    description: 'Verified properties across 4,000+ Indian cities and hill stations.',
    badge: 'India Favourite',
    rating: 4.9,
    promoCode: 'MMTTRAVEL',
    discount: '₹1,500 OFF',
    cashback: '5% Extra Cashback',
    startingPrice: '₹2,200/night',
    trackingUrl: 'https://www.makemytrip.com/hotels/?utm_source=travelflow',
    logo: '🇮🇳',
    perks: ['Couple Friendly', 'Free Breakfast Included', 'Assured Stays']
  },

  // Flights
  {
    id: 'f-skyscanner',
    partnerName: 'Skyscanner',
    category: 'flight',
    title: 'Global Airfare Comparison',
    description: 'Compare 1,000+ airlines worldwide for the lowest prices without hidden fees.',
    badge: 'Global Aggregator',
    rating: 4.9,
    promoCode: 'SKYTF5',
    discount: 'Best Market Fare',
    cashback: '₹400 Flat Cashback',
    startingPrice: '₹3,200',
    trackingUrl: 'https://www.skyscanner.co.in/?utm_source=travelflow',
    logo: '✈️',
    perks: ['No Hidden Charges', 'Cheapest Month Finder', 'Price Drop Alerts']
  },
  {
    id: 'f-indigo',
    partnerName: 'IndiGo Airlines',
    category: 'flight',
    title: 'India’s Leading Low-Cost Carrier',
    description: 'On-time flights connecting 80+ domestic and 30+ international airports.',
    badge: 'Official Flight Partner',
    rating: 4.8,
    promoCode: '6EFLOW',
    discount: '₹600 OFF on Roundtrips',
    cashback: '₹300 Cashback',
    startingPrice: '₹2,800',
    trackingUrl: 'https://www.goindigo.in/?utm_source=travelflow',
    logo: '🛫',
    perks: ['On-time Performance', 'Complimentary Web Check-in', 'Direct Routes']
  },
  {
    id: 'f-emirates',
    partnerName: 'Emirates',
    category: 'flight',
    title: 'Luxury International Travel',
    description: 'Award-winning service flying to 140+ global destinations via Dubai hub.',
    badge: 'Global Premium',
    rating: 4.9,
    promoCode: 'EKFLOW',
    discount: '5% Special Saver',
    cashback: '₹2,000 Flat Cashback',
    startingPrice: '₹24,500',
    trackingUrl: 'https://www.emirates.com/?utm_source=travelflow',
    logo: '🌍',
    perks: ['Complimentary Gourmet Dining', '5,000+ Channels of ICE', 'Chauffeur Drive']
  },

  // Cabs & Transfers
  {
    id: 'c-uber',
    partnerName: 'Uber Intercity & Airport',
    category: 'cab',
    title: 'Reliable City & Airport Transfers',
    description: 'Seamless airport pickups and intercity one-way travel in 30+ cities.',
    badge: 'Top Reliability',
    rating: 4.7,
    promoCode: 'UBERTF50',
    discount: '₹150 OFF Airport Rides',
    cashback: '10% Cashback',
    startingPrice: '₹399',
    trackingUrl: 'https://www.uber.com/in/en/?utm_source=travelflow',
    logo: '🚗',
    perks: ['Live GPS Tracking', 'Verified Drivers', '24/7 Safety Helpline']
  },
  {
    id: 'c-savaari',
    partnerName: 'Savaari Car Rentals',
    category: 'cab',
    title: 'Chauffeur-Driven Outstation Cabs',
    description: 'Round-trip and one-way outstation cabs across 2,000+ cities in India.',
    badge: 'Outstation Specialist',
    rating: 4.8,
    promoCode: 'SAVFLOW',
    discount: '10% OFF Outstation',
    cashback: '₹250 Flat Cashback',
    startingPrice: '₹11/km',
    trackingUrl: 'https://www.savaari.com/?utm_source=travelflow',
    logo: '🚙',
    perks: ['Clean Sanitized Cabs', 'Experienced Highway Drivers', 'Zero Cancellation Fee']
  },
  {
    id: 'c-ola',
    partnerName: 'Ola Outstation',
    category: 'cab',
    title: 'Prime Sedans & SUVs',
    description: 'Comfortable road trips with flexible packages and transparent billing.',
    badge: 'Instant Booking',
    rating: 4.6,
    promoCode: 'OLATF',
    discount: '₹200 OFF on 2-Day Rental',
    cashback: '8% Cashback',
    startingPrice: '₹12/km',
    trackingUrl: 'https://www.olacabs.com/?utm_source=travelflow',
    logo: '🚕',
    perks: ['Free WiFi on Prime', 'AC cabs', 'Transparent Tolls & Taxes']
  }
];

interface PartnerBookingsProps {
  initialCategory?: 'all' | 'hotel' | 'flight' | 'cab';
  destinationName?: string;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  isVip?: boolean;
}

export const PartnerBookingsSection: React.FC<PartnerBookingsProps> = ({
  initialCategory = 'all',
  destinationName,
  openAuthModal,
  isVip = false
}) => {
  const { user, db, signIn } = useFirebase();
  const [activeTab, setActiveTab] = useState<'all' | 'hotel' | 'flight' | 'cab'>(initialCategory);
  const [selectedOffer, setSelectedOffer] = useState<PartnerOffer | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeSubView, setActiveSubView] = useState<'offers' | 'myReferrals'>('offers');
  
  // Tracked referral clicks from Firestore
  const [referralClicks, setReferralClicks] = useState<any[]>([]);
  const [loadingClicks, setLoadingClicks] = useState(false);

  // Claim modal state
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimSelectedClick, setClaimSelectedClick] = useState<any>(null);
  const [partnerRefInput, setPartnerRefInput] = useState('');
  const [bookingAmountInput, setBookingAmountInput] = useState('');
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    setLoadingClicks(true);
    const clicksRef = collection(db, 'users', user.uid, 'referralClicks');
    const unsub = onSnapshot(clicksRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReferralClicks(docs.sort((a: any, b: any) => new Date(b.clickedAt || 0).getTime() - new Date(a.clickedAt || 0).getTime()));
      setLoadingClicks(false);
    }, (err) => {
      console.warn('PartnerBookings clicks listener error:', err);
      setLoadingClicks(false);
    });
    return () => unsub();
  }, [user, db]);

  const handlePartnerClick = async (offer: PartnerOffer) => {
    setSelectedOffer(offer);
    setTransferModalOpen(true);

    if (user && db) {
      try {
        const clickId = `clk_${offer.id}_${Date.now()}`;
        const refDoc = doc(db, 'users', user.uid, 'referralClicks', clickId);
        await setDoc(refDoc, {
          id: clickId,
          userId: user.uid,
          partnerName: offer.partnerName,
          category: offer.category,
          destination: destinationName || 'Explore',
          referralUrl: offer.trackingUrl,
          status: 'clicked',
          potentialCommission: offer.category === 'hotel' ? 650 : offer.category === 'flight' ? 500 : 250,
          promoCode: offer.promoCode,
          clickedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error('Error logging referral click:', err);
      }
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db || !claimSelectedClick) return;

    try {
      const clickRef = doc(db, 'users', user.uid, 'referralClicks', claimSelectedClick.id);
      const parsedAmount = parseFloat(bookingAmountInput) || 5000;
      const earnedCashback = Math.round(parsedAmount * 0.05);

      await updateDoc(clickRef, {
        status: 'eligible',
        partnerBookingRef: partnerRefInput.trim(),
        bookingAmount: parsedAmount,
        earnedCashback,
        claimedAt: new Date().toISOString()
      });

      setClaimSuccess(true);
      setTimeout(() => {
        setClaimSuccess(false);
        setClaimModalOpen(false);
        setPartnerRefInput('');
        setBookingAmountInput('');
      }, 2000);
    } catch (err) {
      console.error('Error submitting partner claim:', err);
      alert('Could not submit booking claim. Please check your network.');
    }
  };

  const filteredOffers = PARTNER_OFFERS.filter(o => activeTab === 'all' || o.category === activeTab);

  return (
    <div className="space-y-8">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-flex items-center gap-1.5 mb-2">
            <ShieldCheck size={14} /> Official Travel Partnerships
          </span>
          <h2 className="text-3xl font-black uppercase italic tracking-tight text-white">
            Exclusive Partner Perks & Cashbacks
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Book flights, stays, and cabs through verified partners. Earn 5% cashback on all eligible completed trips!
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveSubView('offers')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeSubView === 'offers' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}
          >
            Partner Deals
          </button>
          <button
            onClick={() => {
              if (!user && openAuthModal) {
                openAuthModal('login');
              } else {
                setActiveSubView('myReferrals');
              }
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${activeSubView === 'myReferrals' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:text-white'}`}
          >
            My Cashbacks & Clicks
            {referralClicks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-500 text-black text-[10px] font-black">
                {referralClicks.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeSubView === 'offers' ? (
        <>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'All Partners' },
              { id: 'hotel', label: 'Hotels & Stays' },
              { id: 'flight', label: 'Flights & Airfare' },
              { id: 'cab', label: 'Cabs & Transfers' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border ${activeTab === tab.id ? 'bg-zinc-800 text-white border-blue-500/50 shadow-md' : 'bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Partner Offers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <div 
                key={offer.id}
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 hover:border-blue-500/40 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-black/60 border border-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                        {offer.logo}
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-white uppercase italic leading-tight">
                          {offer.partnerName}
                        </h4>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          {offer.badge}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-xl border border-amber-500/20">
                      ★ {offer.rating}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-black text-sm text-zinc-200 mt-2">{offer.title}</h5>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed mt-1">
                      {offer.description}
                    </p>
                  </div>

                  {/* Highlights & Coupons */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800">
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                          Promo: {offer.promoCode}
                        </p>
                        <p className="text-xs font-bold text-white mt-0.5">{offer.discount}</p>
                      </div>
                      <button
                        onClick={() => handleCopyCode(offer.promoCode)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold uppercase transition-colors flex items-center gap-1"
                      >
                        {copiedCode === offer.promoCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedCode === offer.promoCode ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {offer.perks.map((perk, i) => (
                        <span key={i} className="text-[9px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md">
                          ✓ {perk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer & Booking Action */}
                <div className="pt-6 mt-6 border-t border-zinc-800/80 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Fares From</span>
                    <span className="text-base font-black text-white italic">{offer.startingPrice}</span>
                  </div>
                  
                  <button
                    onClick={() => handlePartnerClick(offer)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-900/30 transition-all active:scale-95"
                  >
                    Book on Partner <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* My Tracked Referrals & Claim Cashback Section */
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight">
                How Partner Cashback Works
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-1 max-w-xl">
                1. Click any partner deal and complete your reservation on their website.<br />
                2. Return here and click <strong>Claim Booking</strong> with your partner PNR or confirmation ID.<br />
                3. Receive verified 5% cashback directly to your TravelFlow balance!
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Total Tracked Clicks</span>
              <span className="text-2xl font-black text-blue-400">{referralClicks.length}</span>
            </div>
          </div>

          {loadingClicks ? (
            <div className="py-12 text-center text-zinc-500 font-bold">Loading your partner activity...</div>
          ) : referralClicks.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/40 rounded-3xl border border-dashed border-zinc-800">
              <Sparkles size={36} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-white font-black text-lg uppercase italic">No referral clicks yet</p>
              <p className="text-zinc-500 text-xs font-medium mt-1 max-w-md mx-auto">
                Explore our partner offerings above. Every booking through our partner links earns you exclusive discounts and cashbacks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {referralClicks.map((click) => (
                <div 
                  key={click.id}
                  className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-center font-bold text-blue-400 text-sm">
                      {click.category === 'hotel' ? '🏨' : click.category === 'flight' ? '✈️' : '🚗'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base text-white uppercase italic">{click.partnerName}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          click.status === 'eligible' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : click.status === 'confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {click.status === 'eligible' ? 'Claim Submitted' : click.status === 'confirmed' ? 'Cashback Credited' : 'Visited Partner'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                        Clicked on {new Date(click.clickedAt).toLocaleDateString()} · Token: {click.id.slice(-8).toUpperCase()}
                      </p>
                      {click.partnerBookingRef && (
                        <p className="text-xs text-blue-400 font-mono mt-1">
                          Booking ID: {click.partnerBookingRef}
                          {click.earnedCashback && ` (₹${click.earnedCashback} Cashback)`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {click.status === 'clicked' ? (
                      <button
                        onClick={() => {
                          setClaimSelectedClick(click);
                          setClaimModalOpen(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                      >
                        Claim Booking
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={16} /> Claim Pending Approval
                      </span>
                    )}

                    <a 
                      href={click.referralUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-white transition-colors"
                      title="Reopen Partner"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Referral Transfer Modal */}
      <AnimatePresence>
        {transferModalOpen && selectedOffer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl relative space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-3xl flex items-center justify-center mx-auto mb-4">
                  {selectedOffer.logo}
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  Transferring to {selectedOffer.partnerName}
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  We're routing you through our official secure tracking link to activate discounts and cashback.
                </p>
              </div>

              {/* Coupon Box */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                  Exclusive Coupon Code
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-mono font-black text-emerald-400 tracking-wider">
                    {selectedOffer.promoCode}
                  </span>
                  <button
                    onClick={() => handleCopyCode(selectedOffer.promoCode)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white uppercase transition-colors"
                  >
                    {copiedCode === selectedOffer.promoCode ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">Apply this code on the partner checkout page.</p>
              </div>

              {/* Security & Token Info */}
              <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Tracking Status:</span>
                  <span className="text-emerald-400 font-bold">Active & Verified</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cashback Tier:</span>
                  <span className="text-white font-bold">{selectedOffer.cashback}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
                <a
                  href={selectedOffer.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setTransferModalOpen(false)}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all"
                >
                  Continue <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Claim Booking Modal */}
      <AnimatePresence>
        {claimModalOpen && claimSelectedClick && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl relative space-y-6"
            >
              <div className="text-center space-y-2">
                <span className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 text-2xl flex items-center justify-center mx-auto mb-2">
                  🎁
                </span>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  Claim Partner Cashback
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Enter your {claimSelectedClick.partnerName} booking reference ID to claim your 5% reward.
                </p>
              </div>

              {claimSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="text-lg font-black text-white uppercase italic">Booking Submitted!</h4>
                  <p className="text-xs text-zinc-400 font-medium">
                    Your claim is being validated with {claimSelectedClick.partnerName}. Cashback will reflect in your wallet shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleClaimSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Partner Booking ID / PNR Number
                    </label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. BK-982314 or 6E-W83Q7"
                      value={partnerRefInput}
                      onChange={(e) => setPartnerRefInput(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Total Booking Amount (INR)
                    </label>
                    <input 
                      required
                      type="number"
                      placeholder="e.g. 4500"
                      value={bookingAmountInput}
                      onChange={(e) => setBookingAmountInput(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {bookingAmountInput && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-400">
                      <span>Estimated 5% Cashback:</span>
                      <span>₹{Math.round((parseFloat(bookingAmountInput) || 0) * 0.05)}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setClaimModalOpen(false)}
                      className="flex-1 py-3.5 bg-zinc-900 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                    >
                      Submit Claim
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
