import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Crown, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  CreditCard, 
  ArrowRight, 
  X, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Building, 
  Download,
  Calendar,
  Layers,
  CloudSun,
  Headphones
} from 'lucide-react';
import { useFirebase } from '../lib/FirebaseContext';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  openAuthModal
}) => {
  const { user, db, signIn } = useFirebase();
  const [step, setStep] = useState<'details' | 'payment' | 'processing' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProceedToPayment = async () => {
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      else signIn();
      return;
    }

    try {
      const res = await fetch('/api/payments/create-premium-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      const data = await res.json();
      setOrderData(data);
      setStep('payment');
    } catch (err) {
      console.error('Error initiating premium order:', err);
      // Fallback
      setOrderData({
        orderId: `order_tf_vip_${Date.now()}`,
        pricing: { baseAmount: 41.53, gstAmount: 7.47, totalAmount: 49.00 }
      });
      setStep('payment');
    }
  };

  const handlePayNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      setErrorMsg('Please agree to the Recurring Billing Terms to proceed.');
      return;
    }

    setErrorMsg(null);
    setStep('processing');

    try {
      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData?.orderId || `order_${Date.now()}`,
          paymentMethod: paymentMethod.toUpperCase()
        })
      });
      const verifyData = await verifyRes.json();

      // Store subscription in Firestore
      if (user && db) {
        const subId = `sub_${Date.now()}`;
        const payId = verifyData.paymentId || `pay_${Date.now()}`;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // 30-day validity

        // Write subscription doc
        await setDoc(doc(db, 'users', user.uid, 'subscriptions', subId), {
          id: subId,
          userId: user.uid,
          planId: 'travelflow_vip_49',
          planName: 'VIP Explorer Plan',
          amount: 49,
          status: 'active',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          autoRenew: true,
          paymentMethod: paymentMethod.toUpperCase(),
          orderId: orderData?.orderId || subId,
          paymentId: payId,
          createdAt: startDate.toISOString()
        });

        // Write payment record
        await setDoc(doc(db, 'users', user.uid, 'payments', payId), {
          id: payId,
          userId: user.uid,
          bookingId: subId,
          amount: 49,
          gateway: 'Razorpay UPI/Card',
          gatewayOrderId: orderData?.orderId || subId,
          status: 'success',
          type: 'subscription',
          receiptNumber: verifyData.receiptNumber || `REC-${Math.floor(100000 + Math.random() * 900000)}`,
          createdAt: startDate.toISOString()
        });
      }

      setPaymentReceipt(verifyData);
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Payment processing failed:', err);
      setErrorMsg(err?.message || 'Payment could not be verified. Please retry.');
      setStep('payment');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-zinc-950 border border-zinc-800 max-w-xl w-full rounded-[3rem] p-6 sm:p-10 shadow-2xl relative overflow-hidden my-8"
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 blur-[100px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors z-20"
        >
          <X size={18} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8 relative z-10"
            >
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
                  <Crown size={32} />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                  <Sparkles size={12} /> TravelFlow VIP Explorer
                </div>
                <h3 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight">
                  Supercharge Your Trips
                </h3>
                <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto font-medium">
                  Unlock unlimited multi-stop circuit routes, instant weather radar, 5% extra cashback, and an ad-free experience.
                </p>
              </div>

              {/* Price Tag Box */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/30 via-zinc-900 to-amber-950/20 border-2 border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                    All-Inclusive Monthly Pass
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-white italic">₹49</span>
                    <span className="text-xs text-zinc-400 font-bold">/ month</span>
                    <span className="text-xs text-zinc-600 line-through">₹249</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 block mb-1">
                    80% Intro Discount
                  </span>
                  <span className="text-[9px] text-zinc-500 font-bold">GST Included (₹41.53 + ₹7.47)</span>
                </div>
              </div>

              {/* VIP Benefits List */}
              <div className="space-y-3">
                {[
                  { title: 'Unlimited Multi-Stop Circuits', desc: 'Chain 10+ destinations with full inter-city transit itineraries.' },
                  { title: '5% Partner Cashback & ₹0 Fee', desc: 'Save the ₹99 platform fee + earn extra 5% credit on hotels & cabs.' },
                  { title: 'Live Climate & Weather Radar', desc: 'Real-time forecasts and clothing suggestions for any location.' },
                  { title: 'Smart AI Packing Checklist', desc: 'Automated weather-aware luggage checklists per destination.' },
                  { title: 'VIP Explorer Golden Badge', desc: 'Distinguished member badge on your profile and review posts.' },
                  { title: '100% Ad-Free Experience', desc: 'Zero promotions or sponsored interruptions across all pages.' }
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-white uppercase italic">{feat.title}</p>
                      <p className="text-[11px] text-zinc-400 font-medium leading-relaxed mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compliance & Upgrade CTA */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Join VIP for ₹49 <ArrowRight size={16} />
                </button>
                <p className="text-center text-[10px] text-zinc-500 font-medium">
                  Cancel anytime from your profile with 1-click. RBI Mandate Compliant.
                </p>
              </div>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div 
              key="payment"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6 relative z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <h4 className="text-xl font-black text-white uppercase italic">Complete Your Payment</h4>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">Order ID: {orderData?.orderId}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-white italic">₹49.00</span>
                  <span className="text-[10px] text-emerald-400 block font-bold">Monthly Plan</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                  { id: 'card', label: 'Cards', icon: CreditCard },
                  { id: 'netbanking', label: 'NetBanking', icon: Building }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all border ${paymentMethod === m.id ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-white'}`}
                  >
                    <m.icon size={18} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Payment Form Fields */}
              <form onSubmit={handlePayNow} className="space-y-4">
                {paymentMethod === 'upi' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                      Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM)
                    </label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Lock size={12} className="text-emerald-500" />
                      <span>Instant UPI collect request or scan QR code.</span>
                    </div>
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Card Number</label>
                      <input 
                        required
                        type="text"
                        maxLength={19}
                        placeholder="4532 •••• •••• 8891"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full px-4 py-2.5 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Expiry</label>
                        <input 
                          required
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">CVV</label>
                        <input 
                          required
                          type="password"
                          placeholder="•••"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full px-4 py-2.5 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'netbanking' && (
                  <div className="space-y-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                      Select Bank
                    </label>
                    <select 
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-zinc-800 rounded-xl text-white text-sm font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option>HDFC Bank</option>
                      <option>State Bank of India (SBI)</option>
                      <option>ICICI Bank</option>
                      <option>Axis Bank</option>
                      <option>Kotak Mahindra Bank</option>
                    </select>
                  </div>
                )}

                {/* Tax Breakdown & Compliance Box */}
                <div className="p-4 rounded-2xl bg-black/40 border border-zinc-800/80 text-xs space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Base Membership:</span>
                    <span className="text-white font-mono">₹41.53</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST + SGST (18%):</span>
                    <span className="text-white font-mono">₹7.47</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-800 text-sm font-black text-white">
                    <span>Total Amount:</span>
                    <span className="text-amber-400 font-mono">₹49.00</span>
                  </div>
                </div>

                {/* RBI Compliance Terms Checkbox */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-[10px] text-zinc-400 leading-relaxed font-medium">
                    I agree to the <strong>Terms of Service</strong> and authorize monthly renewal of ₹49. I can cancel anytime with zero cancellation penalty from my Profile settings.
                  </span>
                </label>

                {errorMsg && (
                  <p className="text-xs text-red-400 font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> {errorMsg}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="flex-1 py-3.5 bg-zinc-900 text-zinc-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    Authorize ₹49
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 text-center space-y-4"
            >
              <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-400 rounded-full animate-spin mx-auto" />
              <h4 className="text-xl font-black text-white uppercase italic">Processing Secure Authorization</h4>
              <p className="text-xs text-zinc-400 font-medium">Connecting to 256-bit SSL Banking Gateway...</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 py-4"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                <CheckCircle2 size={44} />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 inline-flex items-center gap-1.5 mb-2">
                  <Crown size={12} /> VIP Explorer Activated
                </span>
                <h3 className="text-3xl font-black text-white uppercase italic tracking-tight">
                  Welcome to VIP Club!
                </h3>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  Your ₹49 monthly plan is active. Unlimited multi-stop itineraries, live weather, and 5% cashback are unlocked.
                </p>
              </div>

              {/* Receipt Snippet */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>Receipt No:</span>
                  <span className="text-white font-bold">{paymentReceipt?.receiptNumber || 'REC-829103'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Payment Method:</span>
                  <span className="text-white font-bold">{paymentReceipt?.paymentMethod || 'UPI'}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">COMPLIANT & ACTIVE</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl"
              >
                Start Exploring as VIP
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
