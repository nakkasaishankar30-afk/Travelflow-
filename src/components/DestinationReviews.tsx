import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  MessageSquare, 
  Send, 
  ThumbsUp, 
  Trash2, 
  User as UserIcon, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Award,
  Filter,
  ChevronDown
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import { useFirebase } from '../lib/FirebaseContext';

export interface ReviewItem {
  id: string;
  destinationId: string;
  destinationName: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  travelType?: string;
  travelerTip?: string;
  helpfulCount?: number;
  helpfulUsers?: string[];
  createdAt: any;
  isCurated?: boolean;
}

interface DestinationReviewsProps {
  destinationId: string;
  destinationName: string;
  baseRating?: number;
  openAuthModal?: (mode?: 'login' | 'signup') => void;
  onRatingUpdate?: (avgRating: number, totalReviews: number) => void;
}

const TRAVEL_TYPES = [
  { label: 'Solo Traveler', icon: '🎒' },
  { label: 'Couples Getaway', icon: '💑' },
  { label: 'Family Vacation', icon: '👨‍👩‍👧‍👦' },
  { label: 'Friends Trip', icon: '🎉' },
  { label: 'Adventure / Trek', icon: '🧗' },
];

const RATING_LABELS: Record<number, string> = {
  1: 'Disappointing 😞',
  2: 'Could be better 😐',
  3: 'Good experience 🙂',
  4: 'Great adventure! 😄',
  5: 'Exceptional & Unforgettable! 🌟',
};

// Curated starter reviews for realistic initial display if none in Firestore yet
const CURATED_SEED_REVIEWS: Record<string, Omit<ReviewItem, 'id'>[]> = {
  default: [
    {
      destinationId: 'default',
      destinationName: 'Destination',
      userId: 'curated-1',
      userName: 'Aarav Mehta',
      userPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
      rating: 5,
      comment: 'Absolutely magical place! The sunrise views and local hospitality exceeded all my expectations. Wandering the scenic trails was peaceful and rejuvenating.',
      travelType: 'Solo Traveler',
      travelerTip: 'Start early morning around 6:00 AM to avoid crowds and catch the best photography lighting!',
      helpfulCount: 14,
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      isCurated: true,
    },
    {
      destinationId: 'default',
      destinationName: 'Destination',
      userId: 'curated-2',
      userName: 'Priya & Rohan Sharma',
      userPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
      rating: 5,
      comment: 'Planned our anniversary trip through TravelFlow and it was flawless. Authentic local food and stunning panoramic views. Highly recommend booking guided walks.',
      travelType: 'Couples Getaway',
      travelerTip: 'Do not miss the evening sunset vantage point, and carry a warm layer as temperatures dip quickly.',
      helpfulCount: 9,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      isCurated: true,
    }
  ]
};

export const DestinationReviews: React.FC<DestinationReviewsProps> = ({
  destinationId,
  destinationName,
  baseRating = 4.8,
  openAuthModal,
  onRatingUpdate,
}) => {
  const { user, db } = useFirebase();

  // Firestore reviews state
  const [firestoreReviews, setFirestoreReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [travelType, setTravelType] = useState('Couples Getaway');
  const [travelerTip, setTravelerTip] = useState('');
  const [isVisited, setIsVisited] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // UI state
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>('newest');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Normalized destination key for robust matching
  const normalizedDestId = useMemo(() => {
    return (destinationId || destinationName || 'dest')
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '-');
  }, [destinationId, destinationName]);

  // Real-time Firestore reviews listener
  useEffect(() => {
    if (!db) {
      setLoadingReviews(false);
      return;
    }

    setLoadingReviews(true);

    // Query reviews matching destinationId
    const q = query(
      collection(db, 'reviews'),
      where('destinationId', 'in', [destinationId, normalizedDestId, destinationName])
    );

    let fallbackUnsub: (() => void) | null = null;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: ReviewItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            destinationId: data.destinationId || destinationId,
            destinationName: data.destinationName || destinationName,
            userId: data.userId,
            userName: data.userName || 'Verified Traveler',
            userEmail: data.userEmail,
            userPhoto: data.userPhoto,
            rating: Number(data.rating) || 5,
            comment: data.comment || '',
            travelType: data.travelType || 'Traveler',
            travelerTip: data.travelerTip || '',
            helpfulCount: data.helpfulCount || 0,
            helpfulUsers: data.helpfulUsers || [],
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
            isCurated: false,
          });
        });

        setFirestoreReviews(items);
        setLoadingReviews(false);
      },
      (error) => {
        console.warn('Could not query reviews with multi-in, falling back to simple query:', error);
        // Fallback to simple equality match
        try {
          const fallbackQuery = query(
            collection(db, 'reviews'),
            where('destinationId', '==', destinationId)
          );
          fallbackUnsub = onSnapshot(fallbackQuery, (snapshot) => {
            const items: ReviewItem[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              items.push({
                id: docSnap.id,
                destinationId: data.destinationId || destinationId,
                destinationName: data.destinationName || destinationName,
                userId: data.userId,
                userName: data.userName || 'Verified Traveler',
                userEmail: data.userEmail,
                userPhoto: data.userPhoto,
                rating: Number(data.rating) || 5,
                comment: data.comment || '',
                travelType: data.travelType || 'Traveler',
                travelerTip: data.travelerTip || '',
                helpfulCount: data.helpfulCount || 0,
                helpfulUsers: data.helpfulUsers || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
                isCurated: false,
              });
            });
            setFirestoreReviews(items);
            setLoadingReviews(false);
          }, (fallbackError) => {
            console.warn('Fallback reviews listener error:', fallbackError);
            setLoadingReviews(false);
          });
        } catch (e) {
          console.error('Reviews listener error:', e);
          setLoadingReviews(false);
        }
      }
    );

    return () => {
      unsubscribe();
      if (fallbackUnsub) fallbackUnsub();
    };
  }, [db, destinationId, normalizedDestId, destinationName]);

  // Combined reviews: Real Firestore reviews take precedence + curated seed reviews
  const allReviews = useMemo(() => {
    if (firestoreReviews.length > 0) {
      return firestoreReviews;
    }
    // Seed reviews tagged with current destination name
    const seeds = CURATED_SEED_REVIEWS[destinationId] || CURATED_SEED_REVIEWS.default;
    return seeds.map((s, index) => ({
      ...s,
      id: `seed-${index}`,
      destinationId,
      destinationName,
    }));
  }, [firestoreReviews, destinationId, destinationName]);

  // Calculated average rating & count
  const { averageRating, totalCount, ratingDistribution } = useMemo(() => {
    if (allReviews.length === 0) {
      return {
        averageRating: baseRating,
        totalCount: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    allReviews.forEach((r) => {
      const score = Math.min(5, Math.max(1, Math.round(r.rating)));
      dist[score] = (dist[score] || 0) + 1;
      sum += r.rating;
    });

    const avg = Number((sum / allReviews.length).toFixed(1));
    return {
      averageRating: avg,
      totalCount: allReviews.length,
      ratingDistribution: dist
    };
  }, [allReviews, baseRating]);

  // Notify parent of updated rating
  useEffect(() => {
    if (onRatingUpdate) {
      onRatingUpdate(averageRating, totalCount);
    }
  }, [averageRating, totalCount, onRatingUpdate]);

  // Filtered and sorted reviews
  const displayedReviews = useMemo(() => {
    let list = [...allReviews];

    if (filterRating !== 'all') {
      list = list.filter((r) => Math.round(r.rating) === filterRating);
    }

    list.sort((a, b) => {
      if (sortBy === 'highest') {
        return b.rating - a.rating;
      }
      // newest
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return list;
  }, [allReviews, filterRating, sortBy]);

  // Check if current logged in user already left a review in Firestore
  const userExistingReview = useMemo(() => {
    if (!user) return null;
    return firestoreReviews.find((r) => r.userId === user.uid);
  }, [user, firestoreReviews]);

  // Submit review to Firestore
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      if (openAuthModal) openAuthModal('login');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg('Please write at least a few words about your visit (minimum 5 characters).');
      return;
    }

    setSubmitting(true);

    try {
      const reviewPayload = {
        destinationId: normalizedDestId,
        destinationName,
        userId: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || 'Traveler',
        userEmail: user.email || '',
        userPhoto: user.photoURL || '',
        rating: Number(rating),
        comment: comment.trim(),
        travelType,
        travelerTip: travelerTip.trim(),
        isVisited,
        helpfulCount: 0,
        helpfulUsers: [],
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reviews'), reviewPayload);

      setSubmitSuccess(true);
      setComment('');
      setTravelerTip('');
      setIsFormOpen(false);

      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (err: any) {
      console.error('Error submitting review to Firestore:', err);
      setErrorMsg(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete your review?')) return;

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
    } catch (err: any) {
      console.error('Error deleting review:', err);
      alert('Could not delete review: ' + (err.message || 'Unknown error'));
    }
  };

  // Helpful vote
  const handleHelpfulVote = async (review: ReviewItem) => {
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      return;
    }

    if (review.isCurated) {
      // Local optimistic increment for curated reviews
      review.helpfulCount = (review.helpfulCount || 0) + 1;
      return;
    }

    const currentHelpful = review.helpfulUsers || [];
    const hasVoted = currentHelpful.includes(user.uid);

    try {
      const reviewRef = doc(db, 'reviews', review.id);
      if (hasVoted) {
        await updateDoc(reviewRef, {
          helpfulCount: increment(-1),
          helpfulUsers: currentHelpful.filter((id) => id !== user.uid)
        });
      } else {
        await updateDoc(reviewRef, {
          helpfulCount: increment(1),
          helpfulUsers: [...currentHelpful, user.uid]
        });
      }
    } catch (err) {
      console.error('Error updating helpful vote:', err);
    }
  };

  const formatDate = (dateStr: any) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <section className="mt-16 pt-12 border-t border-zinc-800" id="destination-reviews-section">
      {/* Header & Stats Card */}
      <div className="bg-zinc-900 border border-zinc-800 text-white rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden mb-12">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Overall Score */}
          <div className="lg:col-span-4 text-center lg:text-left border-b lg:border-b-0 lg:border-r border-zinc-800 pb-8 lg:pb-0 lg:pr-8">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-4">
              <Award size={12} /> Traveler Ratings
            </span>
            <div className="flex items-baseline justify-center lg:justify-start gap-3 mb-2">
              <span className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none text-white">
                {averageRating}
              </span>
              <span className="text-zinc-500 font-bold text-xl">/ 5.0</span>
            </div>

            {/* Stars */}
            <div className="flex items-center justify-center lg:justify-start gap-1 text-amber-400 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}
                />
              ))}
            </div>
            <p className="text-zinc-500 text-xs font-semibold">
              Based on <strong className="text-white">{totalCount}</strong> verified traveler review{totalCount === 1 ? '' : 's'}
            </p>
          </div>

          {/* Rating Breakdown Bars */}
          <div className="lg:col-span-5 space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0;
              const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-black flex items-center justify-end gap-1 text-zinc-400">
                    {stars} <Star size={10} className="fill-amber-400 text-amber-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        stars >= 4 ? 'bg-amber-400' : stars === 3 ? 'bg-blue-400' : 'bg-zinc-600'
                      }`}
                    />
                  </div>
                  <span className="w-10 text-right text-[11px] font-mono text-zinc-500">
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTA Button */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-end justify-center">
            {user ? (
              <button
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black rounded-2xl shadow-xl hover:shadow-amber-500/25 transition-all flex items-center justify-center gap-2 group text-sm uppercase tracking-wider active:scale-95"
              >
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                {isFormOpen ? 'Close Form' : userExistingReview ? 'Write Another Review' : 'Rate & Review'}
              </button>
            ) : (
              <div className="text-center lg:text-right">
                <button
                  onClick={() => openAuthModal?.('login')}
                  className="px-6 py-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider backdrop-blur-md active:scale-95"
                >
                  <Sparkles size={16} className="text-amber-400" />
                  Sign In to Review
                </button>
                <p className="text-[10px] text-zinc-500 mt-2">Share your journey with fellow travelers</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      <AnimatePresence>
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-5 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-3xl flex items-center gap-4 text-emerald-400"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h4 className="font-black text-emerald-100">Review published successfully!</h4>
              <p className="text-xs text-emerald-400">
                Your experience for <strong>{destinationName}</strong> is now live in the TravelFlow community.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Submission Form */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-12"
          >
            <form
              onSubmit={handleSubmitReview}
              className="bg-zinc-950 border-2 border-zinc-800 rounded-[3rem] p-8 md:p-10 shadow-xl relative"
            >
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-900">
                <div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare size={14} /> Traveler Feedback
                  </span>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">
                    Share Your {destinationName} Experience
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-zinc-500 hover:text-white text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Star Rating Picker */}
              <div className="mb-8">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">
                  Your Overall Star Rating *
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-zinc-900 p-2.5 rounded-2xl border border-zinc-800">
                    {[1, 2, 3, 4, 5].map((starValue) => {
                      const isActive = (hoverRating || rating) >= starValue;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onMouseEnter={() => setHoverRating(starValue)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(starValue)}
                          className="p-1 rounded-xl transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            size={28}
                            className={`transition-colors ${
                              isActive
                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                : 'text-zinc-700'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-sm font-black text-amber-500 italic">
                    {RATING_LABELS[hoverRating || rating]}
                  </span>
                </div>
              </div>

              {/* Travel Style Selection */}
              <div className="mb-8">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">
                  How did you travel?
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {TRAVEL_TYPES.map((type) => {
                    const isSelected = travelType === type.label;
                    return (
                      <button
                        key={type.label}
                        type="button"
                        onClick={() => setTravelType(type.label)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Text Review */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-500">
                    Your Review & Highlights *
                  </label>
                  <span className="text-[10px] text-zinc-600 font-bold">
                    {comment.length} / 1000 characters
                  </span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`What made your visit to ${destinationName} memorable? Tell future travelers about hidden spots, weather, food, local vibe, and must-see attractions...`}
                  rows={4}
                  maxLength={1000}
                  required
                  className="w-full p-4 rounded-2xl bg-zinc-900 border-2 border-zinc-800 focus:border-blue-500 focus:outline-none text-white text-sm placeholder:text-zinc-600 leading-relaxed font-medium transition-colors"
                />
              </div>

              {/* Traveler Tip */}
              <div className="mb-8">
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-500 mb-2">
                  Insider Tip for Others (Optional)
                </label>
                <input
                  type="text"
                  value={travelerTip}
                  onChange={(e) => setTravelerTip(e.target.value)}
                  placeholder="e.g. Try the local kahwa early morning, rent a scooter for exploring..."
                  maxLength={150}
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border-2 border-zinc-800 focus:border-blue-500 focus:outline-none text-white text-sm placeholder:text-zinc-600 font-medium transition-colors"
                />
              </div>

              {/* Visited Verification Checkbox */}
              <div className="mb-8 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visited-toggle"
                  checked={isVisited}
                  onChange={(e) => setIsVisited(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-2 border-zinc-800 bg-zinc-900 text-blue-500 focus:ring-blue-500/20 cursor-pointer accent-blue-500"
                />
                <label htmlFor="visited-toggle" className="text-xs font-bold text-zinc-400 cursor-pointer select-none">
                  I personally visited <strong>{destinationName}</strong> and this review reflects my genuine travel experience.
                </label>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-2xl">
                  {errorMsg}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Post Review
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-6 py-4 text-xs font-black uppercase text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        {/* Rating Filter Pills */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-600 mr-1 flex items-center gap-1">
            <Filter size={13} /> Filter:
          </span>
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterRating === 'all'
                ? 'bg-white text-black shadow-md'
                : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            All ({totalCount})
          </button>
          {[5, 4, 3].map((starNum) => {
            const count = ratingDistribution[starNum] || 0;
            return (
              <button
                key={starNum}
                onClick={() => setFilterRating(starNum)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  filterRating === starNum
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                <span>{starNum}</span>
                <Star size={11} className="fill-current" />
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-black uppercase tracking-wider text-zinc-600">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-1.5 px-3 rounded-xl border-none outline-none cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="highest">Highest Rating</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {loadingReviews ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] animate-pulse h-40" />
            ))}
          </div>
        ) : displayedReviews.length === 0 ? (
          <div className="text-center py-16 bg-zinc-950 rounded-[3rem] border border-dashed border-zinc-800">
            <MessageSquare size={36} className="text-zinc-800 mx-auto mb-3" />
            <h4 className="text-lg font-black text-zinc-600 uppercase tracking-tight">No reviews match your filter</h4>
            <p className="text-zinc-700 text-xs mt-1 uppercase font-bold tracking-widest">Try another star rating or be the first to review!</p>
          </div>
        ) : (
          displayedReviews.map((review) => {
            const isAuthor = user && user.uid === review.userId;
            const hasVotedHelpful = user && (review.helpfulUsers || []).includes(user.uid);

            return (
              <motion.div
                key={review.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group relative"
              >
                {/* Top Row: User Avatar & Info */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    {review.userPhoto ? (
                      <img
                        src={review.userPhoto}
                        alt={review.userName}
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-zinc-900 shadow-md"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-white font-black text-base flex items-center justify-center shadow-md border border-zinc-700">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-white text-base leading-snug">
                          {review.userName}
                        </h4>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 size={11} /> Visited
                        </span>
                        {isAuthor && (
                          <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatDate(review.createdAt)}
                        </span>
                        {review.travelType && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-400 font-bold">{review.travelType}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stars + Author Delete Action */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                      <Star size={14} className="fill-amber-400 text-amber-400" />
                      <span className="font-black text-sm text-amber-500 leading-none">
                        {review.rating.toFixed(1)}
                      </span>
                    </div>

                    {isAuthor && !review.isCurated && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        title="Delete your review"
                        className="p-2 text-zinc-700 hover:text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Review Body */}
                <p className="text-zinc-400 text-sm leading-relaxed font-medium mb-4 whitespace-pre-line">
                  {review.comment}
                </p>

                {/* Insider Traveler Tip Callout */}
                {review.travelerTip && (
                  <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs">
                      💡
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-0.5">
                        Traveler's Insider Tip
                      </p>
                      <p className="text-xs text-blue-100 font-semibold">{review.travelerTip}</p>
                    </div>
                  </div>
                )}

                {/* Bottom Row: Helpful Button */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-900 text-xs">
                  <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    Verified Experience
                  </span>

                  <button
                    onClick={() => handleHelpfulVote(review)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all text-xs ${
                      hasVotedHelpful
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    <ThumbsUp size={12} className={hasVotedHelpful ? 'fill-white' : ''} />
                    <span>Helpful</span>
                    {(review.helpfulCount || 0) > 0 && (
                      <span className="font-mono text-[10px] ml-0.5">({review.helpfulCount})</span>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
};
