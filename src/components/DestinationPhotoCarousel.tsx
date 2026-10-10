import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Play, 
  Pause, 
  Camera, 
  MapPin, 
  Star, 
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';

interface DestinationPhotoCarouselProps {
  images: string[];
  dest: {
    id: string;
    name: string;
    location: string;
    type?: string;
    tag?: string;
    rating?: number;
  };
  currentRating?: number;
  totalReviews?: number;
  onRatingClick?: () => void;
}

export const DestinationPhotoCarousel: React.FC<DestinationPhotoCarouselProps> = ({
  images: rawImages,
  dest,
  currentRating = 4.8,
  totalReviews = 0,
  onRatingClick
}) => {
  // Ensure we have a valid list of images
  const images = React.useMemo(() => {
    if (!rawImages || rawImages.length === 0) {
      return ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'];
    }
    return rawImages.filter(img => typeof img === 'string' && img.trim().length > 0);
  }, [rawImages]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);

  // Touch gesture tracking for reliable mobile swiping
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const thumbnailContainerRef = useRef<HTMLDivElement>(null);

  // Bounds safe navigation
  const goToNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToIndex = useCallback((index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  }, [currentIndex]);

  // Autoplay timer
  useEffect(() => {
    if (!isAutoplay || isHovered || isLightboxOpen || images.length <= 1) return;
    const timer = setInterval(() => {
      goToNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [isAutoplay, isHovered, isLightboxOpen, images.length, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'Escape' && isLightboxOpen) {
        setIsLightboxOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, isLightboxOpen]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const activeThumb = thumbnailContainerRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentIndex]);

  // Native mobile touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const deltaX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45; // pixels
    if (deltaX > minSwipeDistance) {
      // Swiped Left -> Go Next
      goToNext();
    } else if (deltaX < -minSwipeDistance) {
      // Swiped Right -> Go Prev
      goToPrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Motion drag end handler for desktop & pointer
  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold) {
      goToNext();
    } else if (info.offset.x > swipeThreshold) {
      goToPrev();
    }
  };

  // Variants for smooth direction-aware sliding
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 1.04
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 32 },
        opacity: { duration: 0.3 },
        scale: { duration: 0.4 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? '-100%' : '100%',
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 320, damping: 32 },
        opacity: { duration: 0.25 }
      }
    })
  };

  return (
    <div className="relative mb-12 select-none">
      {/* Main Hero Carousel Box */}
      <div 
        className="relative aspect-video sm:aspect-[16/9] md:aspect-[21/9] min-h-[360px] sm:min-h-[440px] md:min-h-[500px] rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl border-4 border-emerald-950/60 bg-stone-950 group/carousel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${dest.name} photo gallery`}
      >
        {/* Animated Slide Image with Motion Drag */}
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <img
              src={images[currentIndex]}
              alt={`${dest.name} photograph ${currentIndex + 1} of ${images.length}`}
              className="w-full h-full object-cover select-none pointer-events-none"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>

        {/* Peaceful Atmospheric Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/35 to-stone-950/15 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/70 via-transparent to-stone-950/30 pointer-events-none" />

        {/* Top Floating Utility Badges: Image Counter, Autoplay Toggle, Fullscreen */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 flex items-center gap-2">
          {/* Autoplay button */}
          {images.length > 1 && (
            <button
              onClick={() => setIsAutoplay(prev => !prev)}
              aria-label={isAutoplay ? "Pause slideshow" : "Play slideshow"}
              title={isAutoplay ? "Pause Slideshow" : "Auto-cycle photos"}
              className={`p-2.5 sm:p-3 rounded-full backdrop-blur-md transition-all border ${
                isAutoplay 
                  ? 'bg-emerald-500/90 text-stone-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/30' 
                  : 'bg-stone-900/70 hover:bg-stone-900/90 text-stone-200 border-white/10 hover:border-white/30'
              }`}
            >
              {isAutoplay ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
            </button>
          )}

          {/* Photo Counter Badge */}
          <div className="bg-stone-900/75 backdrop-blur-md border border-white/10 text-stone-200 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-lg">
            <Camera size={13} className="text-emerald-400" />
            <span>
              <strong className="text-white">{currentIndex + 1}</strong>
              <span className="text-stone-400"> / {images.length}</span>
            </span>
          </div>

          {/* Fullscreen Lightbox Button */}
          <button
            onClick={() => setIsLightboxOpen(true)}
            aria-label="View photo in fullscreen gallery"
            title="Open Fullscreen Gallery"
            className="p-2.5 sm:p-3 rounded-full bg-stone-900/70 hover:bg-stone-900/95 text-stone-200 hover:text-white border border-white/10 hover:border-white/30 backdrop-blur-md transition-all shadow-lg active:scale-95"
          >
            <Maximize2 size={14} />
          </button>
        </div>

        {/* Navigation Arrow Controls (Overlay) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Previous photo"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-900/65 hover:bg-emerald-950/80 text-white hover:text-emerald-300 border border-white/15 hover:border-emerald-500/50 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100 hover:scale-105 active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Next photo"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-stone-900/65 hover:bg-emerald-950/80 text-white hover:text-emerald-300 border border-white/15 hover:border-emerald-500/50 backdrop-blur-md flex items-center justify-center transition-all duration-200 shadow-xl opacity-90 sm:opacity-0 sm:group-hover/carousel:opacity-100 hover:scale-105 active:scale-95"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Hero Details Overlay (Bottom Left) */}
        <div className="absolute bottom-6 sm:bottom-10 left-4 sm:left-10 z-20 max-w-2xl text-white pointer-events-none">
          <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
            {dest.type && (
              <span className="bg-emerald-600/90 text-white border border-emerald-400/40 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-md">
                {dest.type}
              </span>
            )}
            {dest.tag && (
              <span className="bg-stone-900/80 text-emerald-300 border border-emerald-800/50 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                {dest.tag}
              </span>
            )}
            <button
              onClick={onRatingClick}
              className="pointer-events-auto bg-stone-900/80 hover:bg-stone-900/95 text-amber-300 border border-amber-500/30 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1 shadow-md cursor-pointer hover:border-amber-400"
            >
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span>{currentRating.toFixed(1)}</span>
              {totalReviews > 0 && <span className="text-stone-400 font-normal">({totalReviews})</span>}
            </button>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase italic leading-none mb-3 sm:mb-4 drop-shadow-md">
            {dest.name}
          </h1>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap pointer-events-auto">
            <p className="text-stone-200 font-semibold flex items-center gap-1.5 text-sm sm:text-base">
              <MapPin size={17} className="text-emerald-400 flex-shrink-0" />
              <span>{dest.location}</span>
            </p>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name + ' ' + dest.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-stone-900/80 hover:bg-stone-800 border border-white/15 text-stone-200 hover:text-white backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:border-emerald-500/40"
            >
              <TrendingUp size={13} className="text-emerald-400" />
              <span>View Map</span>
            </a>

            <a
              href="#destination-reviews-section"
              className="bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Star size={13} className="fill-emerald-400 text-emerald-400" />
              <span>Reviews</span>
            </a>
          </div>
        </div>

        {/* Carousel Dot Indicators (Bottom Right Overlay) */}
        {images.length > 1 && (
          <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 z-20 flex items-center gap-1.5 bg-stone-950/60 backdrop-blur-md p-1.5 rounded-full border border-white/10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  goToIndex(i);
                }}
                aria-label={`Jump to photo ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'w-7 sm:w-9 bg-emerald-400 shadow-md shadow-emerald-400/50'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* Mobile Swipe Hint Indicator */}
        {images.length > 1 && (
          <div className="absolute top-4 left-4 z-20 sm:hidden flex items-center gap-1.5 bg-stone-900/60 backdrop-blur-md text-stone-300 text-[10px] px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
            <span className="inline-block animate-pulse">← Swipe →</span>
          </div>
        )}
      </div>

      {/* Interactive Thumbnail Ribbon Bar (Underneath Carousel) */}
      {images.length > 1 && showThumbnails && (
        <div className="mt-3 sm:mt-4 px-1">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
              <ImageIcon size={13} className="text-emerald-400" />
              <span>All Available Views ({images.length})</span>
            </div>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              Swipe or tap thumbnail to view
            </span>
          </div>

          <div
            ref={thumbnailContainerRef}
            className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-stone-800 scrollbar-track-transparent snap-x"
          >
            {images.map((img, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={() => goToIndex(idx)}
                  className={`relative flex-shrink-0 w-20 h-14 sm:w-28 sm:h-18 md:w-32 md:h-20 rounded-2xl overflow-hidden transition-all duration-200 snap-center group focus:outline-none ${
                    isActive
                      ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-stone-950 scale-102 shadow-lg'
                      : 'opacity-60 hover:opacity-100 border border-white/10 hover:border-white/30'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`${dest.name} thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400 rounded-2xl pointer-events-none" />
                  )}
                  <div className="absolute bottom-1 right-1 bg-stone-950/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-stone-200">
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Cinematic Fullscreen Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* Top Lightbox Header */}
            <div 
              className="w-full max-w-6xl flex items-center justify-between text-white z-30 pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight text-white">
                  {dest.name}
                </h3>
                <p className="text-stone-400 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-emerald-400" />
                  <span>{dest.location}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="bg-stone-900 border border-white/10 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-300">
                  {currentIndex + 1} of {images.length}
                </span>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  aria-label="Close fullscreen gallery"
                  className="p-2 sm:p-2.5 rounded-full bg-stone-800/80 hover:bg-stone-700 text-white transition-all border border-white/10 hover:border-white/30"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Central Fullscreen Image Stage */}
            <div 
              className="relative w-full max-w-6xl flex-1 flex items-center justify-center my-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence initial={false} custom={direction} mode="wait">
                <motion.img
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  src={images[currentIndex]}
                  alt={`${dest.name} fullscreen view ${currentIndex + 1}`}
                  className="max-h-[72vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl select-none"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                />
              </AnimatePresence>

              {/* Lightbox Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={goToPrev}
                    aria-label="Previous photo in fullscreen"
                    className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-stone-900/80 hover:bg-emerald-950 text-white hover:text-emerald-400 border border-white/20 backdrop-blur-md transition-all shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <ChevronLeft size={28} />
                  </button>

                  <button
                    onClick={goToNext}
                    aria-label="Next photo in fullscreen"
                    className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 rounded-full bg-stone-900/80 hover:bg-emerald-950 text-white hover:text-emerald-400 border border-white/20 backdrop-blur-md transition-all shadow-2xl hover:scale-105 active:scale-95"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Fullscreen Thumbnails Strip */}
            <div 
              className="w-full max-w-4xl flex items-center justify-center gap-2 overflow-x-auto pb-2"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => goToIndex(idx)}
                  className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden transition-all ${
                    idx === currentIndex
                      ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-105 opacity-100'
                      : 'opacity-40 hover:opacity-80'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
