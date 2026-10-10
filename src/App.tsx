import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FirebaseProvider, useFirebase } from './lib/FirebaseContext';
import { TravelAuthModal } from './components/TravelAuthModal';
import { DestinationReviews } from './components/DestinationReviews';
import { MultiStopPlanner } from './components/MultiStopPlanner';
import { PartnerBookingsSection } from './components/PartnerBookingsSection';
import { PremiumModal } from './components/PremiumModal';
import { SavedScreen } from './components/SavedScreen';
import { SearchScreen } from './components/SearchScreen';
import { TripsScreen } from './components/TripsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { DestinationPhotoCarousel } from './components/DestinationPhotoCarousel';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  InfoWindow,
  useMap,
  useMapsLibrary,
  APILoadingStatus,
  useApiLoadingStatus
} from '@vis.gl/react-google-maps';
import { 
  Search, 
  MapPin, 
  Calendar, 
  User, 
  Heart, 
  Home as HomeIcon, 
  Compass, 
  Sparkles,
  LogOut,
  ChevronRight,
  TrendingUp,
  Map as MapIcon,
  Plus,
  Settings,
  CreditCard,
  Bell,
  HelpCircle,
  Shield,
  FileText,
  Briefcase,
  Star,
  LayoutDashboard,
  BarChart3,
  Users as UsersIcon,
  Globe,
  Store,
  DollarSign,
  Play,
  Info,
  Clock,
  Ticket,
  Headphones,
  Navigation,
  Map as MapIconLucide,
  DollarSign as PriceIcon,
  Timer,
  Bot,
  CloudSun,
  Thermometer,
  Wind,
  CheckCircle2,
  Trash2,
  Crown,
  Layers,
  Plane,
  Car,
  Train,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  Check,
  AlertCircle,
  Share2,
  Download,
  Copy,
  RefreshCw,
  Building2,
  BadgePercent,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc, onSnapshot, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';

declare const google: any;

// Haversine formula to compute distance in km between two geo-coordinates
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// GPS Location detection helper
export function detectCurrentLocation(callback: (loc: { name: string; lat: number; lng: number; isGps?: boolean }) => void) {
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        callback({
          name: 'My Current Location (GPS)',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isGps: true
        });
      },
      (err) => {
        console.warn('Geolocation unavailable or denied, falling back to Hyderabad:', err);
        callback({
          name: 'Current Location (Hyderabad)',
          lat: 17.3850,
          lng: 78.4867,
          isGps: false
        });
      },
      { timeout: 7000 }
    );
  } else {
    callback({
      name: 'Current Location (Hyderabad)',
      lat: 17.3850,
      lng: 78.4867,
      isGps: false
    });
  }
}

// --- Types ---
interface Activity {
  time: string;
  activity: string;
  description: string;
  estimatedCost: string;
}

interface DayPlan {
  day: number;
  activities: Activity[];
  food: string[];
}

interface Itinerary {
  id?: string;
  title: string;
  days: DayPlan[];
  generalTips: string[];
  destination?: string;
  createdAt?: string;
  userId?: string;
}

interface Hotel {
  id: string;
  name: string;
  price: string;
  rating: number;
  location: string;
  facilities: string[];
  image: string;
  description: string;
  category: string;
}

interface Flight {
  id: string;
  airline: string;
  from: string;
  to: string;
  departure: string;
  price: string;
  duration: string;
  category: string;
}

// ... existing mock data ...

const DESTINATIONS = [
  // India - North
  { 
    id: 'kashmir', 
    name: 'Kashmir', 
    location: 'J&K, India', 
    image: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1566837945700-30057527ade0?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Trending', 
    type: 'Mountains', 
    region: 'India', 
    subRegion: 'North', 
    description: 'Heaven on Earth with tranquil Dal Lake shikaras and snow-capped peaks.', 
    lat: 34.0837, 
    lng: 74.7973, 
    rating: 4.9, 
    budget: 15000, 
    duration: 5 
  },
  { 
    id: 'leh', 
    name: 'Leh Ladakh', 
    location: 'Ladakh, India', 
    image: '/src/assets/images/leh_ladakh_mountains_1790918053741.jpg', 
    images: [
      '/src/assets/images/leh_ladakh_mountains_1790918053741.jpg',
      'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1626014303757-646736c0a0c4?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Adventure', 
    type: 'Adventure', 
    region: 'India', 
    subRegion: 'North', 
    description: 'High-altitude cold desert, ancient monasteries and crystal Pangong Lake.', 
    lat: 34.1526, 
    lng: 77.5771, 
    rating: 4.8, 
    budget: 25000, 
    duration: 7 
  },
  { 
    id: 'manali', 
    name: 'Manali', 
    location: 'Himachal, India', 
    image: '/src/assets/images/manali_mountains_1790916354568.jpg', 
    images: [
      '/src/assets/images/manali_mountains_1790916354568.jpg',
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Snow', 
    type: 'Mountains', 
    region: 'India', 
    subRegion: 'North', 
    description: 'Pine-fringed Himalayan slopes, Solang adventure valleys and cozy cafes.', 
    lat: 32.2432, 
    lng: 77.1892, 
    rating: 4.7, 
    budget: 12000, 
    duration: 4 
  },
  { 
    id: 'jaipur', 
    name: 'Jaipur', 
    location: 'Rajasthan, India', 
    image: '/src/assets/images/jaipur_palace_1790916328979.jpg', 
    images: [
      '/src/assets/images/jaipur_palace_1790916328979.jpg',
      'https://images.unsplash.com/photo-1609137144820-21b8b603a119?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Royal', 
    type: 'Heritage', 
    region: 'India', 
    subRegion: 'North', 
    description: 'The Pink City filled with royal palaces, Amber Fort and vibrant bazaars.', 
    lat: 26.9124, 
    lng: 75.7873, 
    rating: 4.8, 
    budget: 10000, 
    duration: 3 
  },
  { 
    id: 'udaipur', 
    name: 'Udaipur', 
    location: 'Rajasthan, India', 
    image: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1590766940554-634a7ed41450?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Romantic', 
    type: 'Couples', 
    region: 'India', 
    subRegion: 'North', 
    description: 'City of Lakes boasting royal marble palaces floating on Lake Pichola.', 
    lat: 24.5854, 
    lng: 73.7125, 
    rating: 4.9, 
    budget: 14000, 
    duration: 3 
  },
  { 
    id: 'agra', 
    name: 'Agra', 
    location: 'UP, India', 
    image: '/src/assets/images/taj_mahal_iconic_1790917691133.jpg', 
    images: [
      '/src/assets/images/taj_mahal_iconic_1790917691133.jpg',
      'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Iconic', 
    type: 'Heritage', 
    region: 'India', 
    subRegion: 'North', 
    description: 'Home of the timeless Taj Mahal and majestic Mughal architectural wonders.', 
    lat: 27.1751, 
    lng: 78.0421, 
    rating: 4.9, 
    budget: 8000, 
    duration: 2 
  },
  { 
    id: 'varanasi', 
    name: 'Varanasi', 
    location: 'UP, India', 
    image: '/src/assets/images/varanasi_ghats_spiritual_1790917736046.jpg', 
    images: [
      '/src/assets/images/varanasi_ghats_spiritual_1790917736046.jpg',
      'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1571536802807-30451e3955d8?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Spiritual', 
    type: 'Religious', 
    region: 'India', 
    subRegion: 'North', 
    description: 'Sacred river ghats on the Ganges, evening aarti ceremonies, and timeless mysticism.', 
    lat: 25.3176, 
    lng: 82.9739, 
    rating: 4.8, 
    budget: 7500, 
    duration: 3 
  },
  { 
    id: 'rishikesh', 
    name: 'Rishikesh', 
    location: 'Uttarakhand, India', 
    image: 'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Yoga', 
    type: 'Adventure', 
    region: 'India', 
    subRegion: 'North', 
    description: 'Yoga capital of the world offering white water river rafting and Himalayan calmness.', 
    lat: 30.0869, 
    lng: 78.2676, 
    rating: 4.7, 
    budget: 9000, 
    duration: 3 
  },

  // India - South
  { 
    id: 'goa', 
    name: 'Goa', 
    location: 'India', 
    image: '/src/assets/images/goa_beach_resort_1790916305902.jpg', 
    images: [
      '/src/assets/images/goa_beach_resort_1790916305902.jpg',
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1586500036706-41963de24d8b?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Beach', 
    type: 'Beach', 
    region: 'India', 
    subRegion: 'South', 
    description: 'Sun-kissed beaches, coastal cuisine, Portuguese architecture, and vibrant nightlife.', 
    lat: 15.2993, 
    lng: 74.1240, 
    rating: 4.7, 
    budget: 15000, 
    duration: 4 
  },
  { 
    id: 'kerala', 
    name: 'Alleppey (Kerala)', 
    location: 'Kerala, India', 
    image: '/src/assets/images/kerala_backwaters_1790916341882.jpg', 
    images: [
      '/src/assets/images/kerala_backwaters_1790916341882.jpg',
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Backwaters', 
    type: 'Nature', 
    region: 'India', 
    subRegion: 'South', 
    description: 'God’s Own Country with serene palm-fringed houseboats and tranquil lagoons.', 
    lat: 9.4981, 
    lng: 76.3388, 
    rating: 4.8, 
    budget: 18000, 
    duration: 4 
  },
  { 
    id: 'munnar', 
    name: 'Munnar', 
    location: 'Kerala, India', 
    image: '/src/assets/images/munnar_tea_gardens_1790918041763.jpg', 
    images: [
      '/src/assets/images/munnar_tea_gardens_1790918041763.jpg',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Tea Hills', 
    type: 'Nature', 
    region: 'India', 
    subRegion: 'South', 
    description: 'Rolling emerald tea plantations, misty mountain passes, and waterfalls.', 
    lat: 10.0889, 
    lng: 77.0595, 
    rating: 4.8, 
    budget: 10000, 
    duration: 3 
  },
  { 
    id: 'hyderabad', 
    name: 'Hyderabad', 
    location: 'Telangana, India', 
    image: 'https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Food', 
    type: 'Food', 
    region: 'India', 
    subRegion: 'South', 
    description: 'The City of Pearls famous for authentic Biryani, Charminar, and Golconda Fort.', 
    lat: 17.3850, 
    lng: 78.4867, 
    rating: 4.6, 
    budget: 7000, 
    duration: 2 
  },
  { 
    id: 'hampi', 
    name: 'Hampi', 
    location: 'Karnataka, India', 
    image: 'https://images.unsplash.com/photo-1600100397561-433ff4847f9a?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1600100397561-433ff4847f9a?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Heritage', 
    type: 'Religious', 
    region: 'India', 
    subRegion: 'South', 
    description: 'Surreal boulder-strewn UNESCO landscape of ancient Vijayanagara Empire ruins.', 
    lat: 15.3350, 
    lng: 76.4600, 
    rating: 4.7, 
    budget: 6000, 
    duration: 3 
  },
  { 
    id: 'ooty', 
    name: 'Ooty & Nilgiris', 
    location: 'Tamil Nadu, India', 
    image: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Hills', 
    type: 'Nature', 
    region: 'India', 
    subRegion: 'South', 
    description: 'Queen of Hill Stations with pine forests, toy train rides, and cool botanical gardens.', 
    lat: 11.4102, 
    lng: 76.6950, 
    rating: 4.6, 
    budget: 9500, 
    duration: 3 
  },
  { 
    id: 'coorg', 
    name: 'Coorg', 
    location: 'Karnataka, India', 
    image: 'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Coffee', 
    type: 'Nature', 
    region: 'India', 
    subRegion: 'South', 
    description: 'Scotland of India known for aromatic coffee plantations and Abbey Falls.', 
    lat: 12.3375, 
    lng: 75.8069, 
    rating: 4.7, 
    budget: 11000, 
    duration: 3 
  },

  // India - East & Northeast
  { 
    id: 'darjeeling', 
    name: 'Darjeeling', 
    location: 'West Bengal, India', 
    image: 'https://images.unsplash.com/photo-1626014303757-646736c0a0c4?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1626014303757-646736c0a0c4?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Himalayas', 
    type: 'Mountains', 
    region: 'India', 
    subRegion: 'East', 
    description: 'Scenic toy train rides and panoramic views of Kanchenjunga over lush tea estates.', 
    lat: 27.0410, 
    lng: 88.2663, 
    rating: 4.8, 
    budget: 12500, 
    duration: 4 
  },
  { 
    id: 'shillong', 
    name: 'Shillong & Meghalaya', 
    location: 'Meghalaya, India', 
    image: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Living Roots', 
    type: 'Nature', 
    region: 'India', 
    subRegion: 'Northeast', 
    description: 'Abode of Clouds featuring living root bridges, crystalline rivers, and Nohkalikai falls.', 
    lat: 25.5788, 
    lng: 91.8933, 
    rating: 4.9, 
    budget: 16000, 
    duration: 5 
  },
  { 
    id: 'andaman', 
    name: 'Andaman & Nicobar', 
    location: 'Havelock Island, India', 
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Coral Reefs', 
    type: 'Beach', 
    region: 'India', 
    subRegion: 'Islands', 
    description: 'Turquoise ocean waters, pristine Radhanagar beach, scuba diving, and bioluminescence.', 
    lat: 11.9761, 
    lng: 92.9876, 
    rating: 4.9, 
    budget: 32000, 
    duration: 6 
  },

  // World - Asia & Middle East
  { 
    id: 'tokyo', 
    name: 'Tokyo', 
    location: 'Japan', 
    image: '/src/assets/images/kyoto_temple_spring_1790917986476.jpg', 
    images: [
      '/src/assets/images/kyoto_temple_spring_1790917986476.jpg',
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Modern', 
    type: 'Heritage', 
    region: 'World', 
    subRegion: 'Asia', 
    description: 'Electrifying metropolis blending futuristic skyscrapers, neon lights, and sacred Zen shrines.', 
    lat: 35.6762, 
    lng: 139.6503, 
    rating: 4.9, 
    budget: 85000, 
    duration: 6 
  },
  { 
    id: 'bali', 
    name: 'Bali', 
    location: 'Indonesia', 
    image: '/src/assets/images/bali_temple_1790916816506.jpg', 
    images: [
      '/src/assets/images/bali_temple_1790916816506.jpg',
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1559628233-eb1b1a45564b?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Tropical', 
    type: 'Beach', 
    region: 'World', 
    subRegion: 'Asia', 
    description: 'Tropical island sanctuary famous for terraced rice paddies, cliffside temples, and surfing.', 
    lat: -8.3405, 
    lng: 115.0920, 
    rating: 4.8, 
    budget: 45000, 
    duration: 5 
  },
  { 
    id: 'dubai', 
    name: 'Dubai', 
    location: 'UAE', 
    image: '/src/assets/images/dubai_skyline_1790916829286.jpg', 
    images: [
      '/src/assets/images/dubai_skyline_1790916829286.jpg',
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Luxury', 
    type: 'Family', 
    region: 'World', 
    subRegion: 'Middle East', 
    description: 'Ultra-modern marvel boasting Burj Khalifa, desert safaris, and luxury marina promenades.', 
    lat: 25.2048, 
    lng: 55.2708, 
    rating: 4.7, 
    budget: 60000, 
    duration: 4 
  },
  { 
    id: 'maldives', 
    name: 'Maldives', 
    location: 'Indian Ocean', 
    image: '/src/assets/images/maldives_overwater_villa_1790918029026.jpg', 
    images: [
      '/src/assets/images/maldives_overwater_villa_1790918029026.jpg',
      'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Paradise', 
    type: 'Beach', 
    region: 'World', 
    subRegion: 'Asia', 
    description: 'Unrivaled luxury overwater villas, crystalline atolls, and vibrant coral marine life.', 
    lat: 3.2028, 
    lng: 73.2207, 
    rating: 4.9, 
    budget: 95000, 
    duration: 4 
  },
  { 
    id: 'singapore', 
    name: 'Singapore', 
    location: 'Southeast Asia', 
    image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Futuristic', 
    type: 'Family', 
    region: 'World', 
    subRegion: 'Asia', 
    description: 'Garden city with iconic Marina Bay Sands, Gardens by the Bay, and world-class street food.', 
    lat: 1.3521, 
    lng: 103.8198, 
    rating: 4.8, 
    budget: 65000, 
    duration: 4 
  },
  { 
    id: 'bangkok', 
    name: 'Bangkok', 
    location: 'Thailand', 
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1559628233-eb1b1a45564b?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Street Food', 
    type: 'Food', 
    region: 'World', 
    subRegion: 'Asia', 
    description: 'Vibrant street markets, golden Grand Palace temples, and animated Chao Phraya river life.', 
    lat: 13.7563, 
    lng: 100.5018, 
    rating: 4.7, 
    budget: 38000, 
    duration: 4 
  },

  // World - Europe
  { 
    id: 'paris', 
    name: 'Paris', 
    location: 'France', 
    image: '/src/assets/images/paris_effel_tower_1790916782362.jpg', 
    images: [
      '/src/assets/images/paris_effel_tower_1790916782362.jpg',
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Romantic', 
    type: 'Couples', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'Global capital of art, gastronomy, and haute couture defined by the iconic Eiffel Tower.', 
    lat: 48.8566, 
    lng: 2.3522, 
    rating: 4.8, 
    budget: 120000, 
    duration: 5 
  },
  { 
    id: 'rome', 
    name: 'Rome', 
    location: 'Italy', 
    image: '/src/assets/images/rome_colosseum_dusk_1790918012026.jpg', 
    images: [
      '/src/assets/images/rome_colosseum_dusk_1790918012026.jpg',
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Ancient', 
    type: 'Heritage', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'The Eternal City with the Colosseum, Roman Forum, Trevi Fountain, and Vatican treasures.', 
    lat: 41.9028, 
    lng: 12.4964, 
    rating: 4.9, 
    budget: 110000, 
    duration: 4 
  },
  { 
    id: 'venice', 
    name: 'Venice', 
    location: 'Italy', 
    image: '/src/assets/images/venice_canals_gondola_1790918067951.jpg', 
    images: [
      '/src/assets/images/venice_canals_gondola_1790918067951.jpg',
      'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1520175480921-4edfa2983e0f?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1498307833015-705c3327e37b?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Canals', 
    type: 'Couples', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'Floating city of romantic gondolas gliding down historic waterways under Rialto Bridge.', 
    lat: 45.4408, 
    lng: 12.3155, 
    rating: 4.8, 
    budget: 115000, 
    duration: 3 
  },
  { 
    id: 'swiss-alps', 
    name: 'Swiss Alps (Zermatt)', 
    location: 'Switzerland', 
    image: '/src/assets/images/swiss_alps_village_1790916801681.jpg', 
    images: [
      '/src/assets/images/swiss_alps_village_1790916801681.jpg',
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Alpine', 
    type: 'Mountains', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'Majestic Matterhorn peak, pristine ski chalets, and scenic cogwheel alpine trains.', 
    lat: 45.9763, 
    lng: 7.7491, 
    rating: 4.9, 
    budget: 145000, 
    duration: 5 
  },
  { 
    id: 'santorini', 
    name: 'Santorini', 
    location: 'Greece', 
    image: '/src/assets/images/santorini_sunset_1790917722113.jpg', 
    images: [
      '/src/assets/images/santorini_sunset_1790917722113.jpg',
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Sunset', 
    type: 'Couples', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'Dramatic volcanic caldera views, whitewashed cliffside villas, and legendary sunsets in Oia.', 
    lat: 36.3932, 
    lng: 25.4615, 
    rating: 4.9, 
    budget: 125000, 
    duration: 4 
  },
  { 
    id: 'london', 
    name: 'London', 
    location: 'United Kingdom', 
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Metropolis', 
    type: 'Heritage', 
    region: 'World', 
    subRegion: 'Europe', 
    description: 'Historic Thames riverfront, Big Ben, West End theatre district, and royal palaces.', 
    lat: 51.5074, 
    lng: -0.1278, 
    rating: 4.8, 
    budget: 130000, 
    duration: 5 
  },

  // World - Americas & Global
  { 
    id: 'grand-canyon', 
    name: 'Grand Canyon', 
    location: 'Arizona, USA', 
    image: '/src/assets/images/grand_canyon_majestic_1790917706973.jpg', 
    images: [
      '/src/assets/images/grand_canyon_majestic_1790917706973.jpg',
      'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Wonder', 
    type: 'Nature', 
    region: 'World', 
    subRegion: 'Americas', 
    description: 'Colossal red rock canyons carved by the Colorado River across millions of years.', 
    lat: 36.0544, 
    lng: -112.1401, 
    rating: 4.9, 
    budget: 140000, 
    duration: 4 
  },
  { 
    id: 'new-york', 
    name: 'New York City', 
    location: 'USA', 
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Skyline', 
    type: 'Heritage', 
    region: 'World', 
    subRegion: 'Americas', 
    description: 'The City That Never Sleeps with Central Park, Times Square, Broadway, and Empire State.', 
    lat: 40.7128, 
    lng: -74.0060, 
    rating: 4.8, 
    budget: 155000, 
    duration: 5 
  },
  { 
    id: 'sydney', 
    name: 'Sydney', 
    location: 'Australia', 
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=1200', 
    images: [
      'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
      'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=1200'
    ], 
    tag: 'Harbour', 
    type: 'Beach', 
    region: 'World', 
    subRegion: 'Oceania', 
    description: 'Iconic Sydney Opera House, Harbour Bridge, and world-renowned Bondi surfing shores.', 
    lat: -33.8688, 
    lng: 151.2093, 
    rating: 4.8, 
    budget: 145000, 
    duration: 5 
  }
];

const COMMISSION_RULES: Record<string, { type: 'PERCENTAGE' | 'FIXED_AMOUNT', value: number }> = {
  'hotel': { type: 'PERCENTAGE', value: 0.08 }, // 8%
  'flight': { type: 'FIXED_AMOUNT', value: 500 }, // ₹500 per booking
  'cab': { type: 'PERCENTAGE', value: 0.10 }, // 10%
  'activity': { type: 'PERCENTAGE', value: 0.15 }, // 15%
};

const HOTELS: Hotel[] = [
  { id: 'h1', name: 'Grand Hyatt Goa', price: '₹12,500', rating: 4.8, location: 'Bambolim, Goa', facilities: ['Pool', 'Spa', 'Free Wifi', 'Beach Front'], image: '/src/assets/images/goa_beach_resort_1790916305902.jpg', description: 'Luxury resort with stunning ocean views.', category: 'hotel' },
  { id: 'h2', name: 'Taj Palace Jaipur', price: '₹15,000', rating: 4.9, location: 'Jaipur, Rajasthan', facilities: ['Palace View', 'Heritage', 'Spa'], image: '/src/assets/images/jaipur_palace_1790916328979.jpg', description: 'Experience royal hospitality in a historic palace.', category: 'hotel' },
  { id: 'h3', name: 'Swiss Alpine Resort', price: '₹22,000', rating: 4.7, location: 'Zermatt, Switzerland', facilities: ['Ski In/Out', 'Mountain View', 'Sauna'], image: '/src/assets/images/swiss_alps_village_1790916801681.jpg', description: 'Cozy luxury in the heart of the Swiss Alps.', category: 'hotel' },
];

const FLIGHTS: Flight[] = [
  { id: 'f1', airline: 'IndiGo', from: 'HYD', to: 'GOI', departure: '08:30 AM', price: '₹4,500', duration: '1h 20m', category: 'flight' },
  { id: 'f2', airline: 'Air India', from: 'DEL', to: 'CDG', departure: '11:45 PM', price: '₹45,000', duration: '9h 30m', category: 'flight' },
  { id: 'f3', airline: 'Emirates', from: 'BOM', to: 'DXB', departure: '04:15 PM', price: '₹28,000', duration: '3h 15m', category: 'flight' },
];

// --- Components ---

const Navbar = ({ 
  activeTab, 
  setActiveTab,
  openAuthModal,
  isVip = false,
  onOpenPremium,
  origin,
  onOpenOrigin
}: { 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  openAuthModal?: (mode?: 'login' | 'signup') => void,
  isVip?: boolean,
  onOpenPremium?: () => void,
  origin?: any,
  onOpenOrigin?: () => void
}) => {
  const { user, logOut } = useFirebase();

  const navLinks = [
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'trips', label: 'My Trips', icon: Calendar },
    { id: 'saved', label: 'Saved', icon: Heart },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b px-4 sm:px-6 py-3.5 shadow-sm transition-colors duration-300 bg-[#06100c]/90 border-emerald-950/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); setActiveTab('explore'); }}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40 group-hover:scale-105 transition-transform">
            <Compass size={20} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white uppercase italic">TravelFlow</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <span className="hidden sm:block text-[9px] font-bold text-emerald-400/80 tracking-widest uppercase -mt-0.5">
              Nature & Sanctuaries
            </span>
          </div>
        </a>

        {/* 5 Main Tabs (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1.5 p-1 bg-[#091710] border border-emerald-950/80 rounded-2xl shadow-inner">
          {navLinks.map((item) => {
            const isActive = activeTab === item.id || (item.id === 'explore' && activeTab === 'home');
            const Icon = item.icon;

            return (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50' 
                    : 'text-stone-300 hover:text-white hover:bg-emerald-950/40'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-white' : 'text-emerald-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Origin quick pill */}
          {origin && (
            <button
              onClick={() => onOpenOrigin ? onOpenOrigin() : setActiveTab('search')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#091710] border border-emerald-950 text-[11px] font-bold text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <MapPin size={12} className="text-emerald-400" />
              <span className="max-w-[100px] truncate">{origin.name.split(' ')[0]}</span>
            </button>
          )}

          {/* ₹49 VIP Action Pill */}
          {isVip ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-black uppercase tracking-wider shadow-sm">
              <Crown size={14} className="text-amber-400" />
              <span className="hidden sm:inline">VIP Explorer</span>
            </div>
          ) : (
            <button
              onClick={() => onOpenPremium ? onOpenPremium() : setActiveTab('premium')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <Crown size={14} className="text-amber-400 animate-pulse" />
              <span>₹49 VIP</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-2 p-1 pr-2.5 rounded-full transition-colors cursor-pointer ${activeTab === 'profile' ? 'bg-emerald-950/70 border border-emerald-700/50' : 'hover:bg-emerald-950/40'}`}
              >
                <div className="relative">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-emerald-800 object-cover"
                  />
                  {isVip && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black rounded-full flex items-center justify-center text-[9px] font-black">
                      👑
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold hidden sm:inline text-stone-200">{user.displayName?.split(' ')[0]}</span>
              </button>
              <button 
                onClick={logOut}
                className="p-2 text-stone-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => openAuthModal ? openAuthModal('login') : setActiveTab('login')}
                className="px-3.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap rounded-xl text-stone-300 hover:text-white cursor-pointer"
              >
                Log In
              </button>
              <button 
                onClick={() => openAuthModal ? openAuthModal('signup') : setActiveTab('signup')}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all whitespace-nowrap cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const MapScreen = ({ onBack, setSelectedDest, setActiveTab }: { onBack: () => void, setSelectedDest: (d: any) => void, setActiveTab: (t: string) => void }) => {
  const [center, setCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [zoom, setZoom] = useState(5);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [activeMapCat, setActiveMapCat] = useState('All');
  const map = useMap();

  const handleExploreArea = () => {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    setActiveTab('explore');
  };

  const filteredDestinations = useMemo(() => {
    if (activeMapCat === 'All') return DESTINATIONS;
    return DESTINATIONS.filter(d => d.type === activeMapCat || d.tag === activeMapCat);
  }, [activeMapCat]);

  return (
    <div className="h-screen w-full relative">
      <div className="absolute top-24 left-6 z-10 flex flex-col gap-4">
        <button 
          onClick={onBack}
          className="bg-zinc-950 p-4 rounded-full shadow-2xl hover:bg-zinc-900 transition-all text-white flex items-center gap-3 font-black text-[10px] uppercase tracking-widest pr-8 border-4 border-zinc-900"
        >
          <ChevronRight className="rotate-180" size={20} /> Back
        </button>

        <div className="bg-zinc-950/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl border-4 border-zinc-900 w-64">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Discover Nearby</h3>
          <div className="grid grid-cols-2 gap-2">
            {['All', 'Hotels', 'Food', 'Beaches', 'Heritage', 'Nature', 'Fun'].map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveMapCat(cat)}
                className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${activeMapCat === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10">
        <button 
          onClick={handleExploreArea}
          className="bg-zinc-950 text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-zinc-900 transition-all flex items-center gap-3 border-4 border-zinc-900"
        >
          <Navigation size={18} /> Explore this area
        </button>
      </div>

      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        mapId="DEMO_MAP_ID"
        disableDefaultUI={true}
        gestureHandling="greedy"
        onCameraChanged={(ev) => {
          setCenter(ev.detail.center);
          setZoom(ev.detail.zoom);
        }}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {filteredDestinations.map((dest) => (
          <AdvancedMarker
            key={dest.id}
            position={{ lat: dest.lat || 0, lng: dest.lng || 0 }}
            onClick={() => setSelectedMarker(dest)}
          >
            <div className="group relative">
              <div className="bg-zinc-950 p-1 rounded-full shadow-xl border-4 border-blue-500 group-hover:scale-125 transition-transform duration-300">
                <img src={dest.image} className="w-10 h-10 rounded-full object-cover" />
              </div>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl">
                {dest.name}
              </div>
            </div>
          </AdvancedMarker>
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-4 max-w-[240px] bg-zinc-950 text-white">
              <img src={selectedMarker.image} className="w-full aspect-video object-cover rounded-2xl mb-4 shadow-sm" />
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-black text-white uppercase tracking-tight italic text-lg">{selectedMarker.name}</h3>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">⭐ {selectedMarker.rating}</span>
              </div>
              <p className="text-[10px] text-zinc-400 mb-4 font-medium leading-relaxed">{selectedMarker.description}</p>
              <button 
                onClick={() => {
                  setSelectedDest(selectedMarker);
                  setActiveTab('dest-detail');
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all"
              >
                View Details
              </button>
            </div>
          </InfoWindow>
        )}
      </Map>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-2xl px-6">
        <div className="bg-zinc-950/80 backdrop-blur-2xl p-4 rounded-[2.5rem] shadow-2xl border-4 border-zinc-900 flex gap-4 overflow-x-auto no-scrollbar">
          {DESTINATIONS.slice(0, 6).map((d) => (
            <button 
              key={d.id}
              onClick={() => {
                setSelectedMarker(d);
                setCenter({ lat: d.lat, lng: d.lng });
                setZoom(12);
              }}
              className="flex-shrink-0 flex items-center gap-3 p-2 bg-zinc-900 rounded-2xl border border-zinc-800 hover:border-blue-500/50 transition-all group"
            >
              <img src={d.image} className="w-10 h-10 rounded-xl object-cover" />
              <div className="text-left pr-4">
                <p className="text-[10px] font-black text-white uppercase tracking-tight italic leading-none">{d.name}</p>
                <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">{d.type}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const CATEGORIES = [
  { id: 'beaches', name: 'Beaches', icon: '🏖️' },
  { id: 'mountains', name: 'Mountains', icon: '🏔️' },
  { id: 'nature', name: 'Nature', icon: '🌲' },
  { id: 'wildlife', name: 'Wildlife', icon: '🐅' },
  { id: 'heritage', name: 'Heritage', icon: '🏛️' },
  { id: 'spiritual', name: 'Spiritual', icon: '🛕' },
  { id: 'adventure', name: 'Adventure', icon: '🧗' },
  { id: 'food', name: 'Food', icon: '🍜' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'nightlife', name: 'Nightlife', icon: '🌃' },
  { id: 'themeparks', name: 'Theme Parks', icon: '🎢' },
  { id: 'islands', name: 'Islands', icon: '🏝️' },
  { id: 'romantic', name: 'Romantic', icon: '💕' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧' },
  { id: 'photography', name: 'Photography', icon: '📸' },
  { id: 'wellness', name: 'Wellness', icon: '🧘' },
];

const SEARCH_OPTIONS = [
  { id: 'location', name: 'Search by Location', icon: '📍', description: 'Explore by city, state, or country' },
  { id: 'map', name: 'Explore on Map', icon: '🗺️', description: 'Discover places visually' },
  { id: 'interest', name: 'Search by Interest', icon: '❤️', description: 'Beaches, Mountains, Food, etc.' },
  { id: 'trending', name: 'Trending Now', icon: '🔥', description: 'Popular destinations this week' },
  { id: 'budget', name: 'Search by Budget', icon: '💰', description: 'Trips that fit your pocket' },
  { id: 'duration', name: 'Search by Duration', icon: '🕐', description: 'Weekend or long vacation' },
  { id: 'ai', name: 'AI Trip Search', icon: '🤖', description: 'Natural language planning' },
  { id: 'region', name: 'India / World', icon: '🌎', description: 'Explore by regions' },
];

// --- Components ---

const HomeScreen = ({ setActiveTab, setSelectedDest, origin, setOrigin, setAiFilters, setSearchQueryGlobal }: { setActiveTab: (tab: string) => void, setSelectedDest: (d: any) => void, origin: any, setOrigin: (o: any) => void, setAiFilters: (f: any) => void, setSearchQueryGlobal: (q: string) => void }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [showOriginPicker, setShowOriginPicker] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (!origin) {
      setShowOriginPicker(true);
      return;
    }

    setIsAiSearching(true);
    setSearchQueryGlobal(searchQuery);
    try {
      const response = await fetch('/api/ai/parse-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const filters = await response.json();
      setAiFilters(filters);
      
      if (filters.intent === 'plan') {
        setActiveTab('planner');
      } else if (filters.destination && filters.destination.length > 2) {
        // Try to find if this destination exists in our static list
        const found = DESTINATIONS.find(d => d.name.toLowerCase().includes(filters.destination.toLowerCase()));
        if (found) {
           setSelectedDest(found);
           setActiveTab('dest-detail');
        } else {
           setActiveTab('explore');
        }
      } else {
        setActiveTab('explore');
      }
    } catch (error) {
      console.error('Search error:', error);
      setActiveTab('explore');
    } finally {
      setIsAiSearching(false);
    }
  };

  const [isDetectingGps, setIsDetectingGps] = useState(false);

  const savedLocations = [
    { id: 'l1', name: 'Hyderabad', lat: 17.3850, lng: 78.4867, type: 'City', icon: '💎' },
    { id: 'l2', name: 'Mumbai', lat: 19.0760, lng: 72.8777, type: 'City', icon: '🌊' },
    { id: 'l3', name: 'Delhi NCR', lat: 28.6139, lng: 77.2090, type: 'City', icon: '🏛️' },
    { id: 'l4', name: 'Bengaluru', lat: 12.9716, lng: 77.5946, type: 'City', icon: '💻' },
    { id: 'l5', name: 'London (UK)', lat: 51.5074, lng: -0.1278, type: 'Global', icon: '🇬🇧' },
    { id: 'l6', name: 'Paris (FR)', lat: 48.8566, lng: 2.3522, type: 'Global', icon: '🇫🇷' },
  ];

  const handleGpsClick = () => {
    setIsDetectingGps(true);
    detectCurrentLocation((loc) => {
      setOrigin(loc);
      setIsDetectingGps(false);
      setShowOriginPicker(false);
    });
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto text-white">
      <section className="mb-16 text-center max-w-4xl mx-auto">
        <h1 className="text-6xl font-black text-white mb-12 tracking-tight leading-tight italic uppercase">
          Explore Anywhere
        </h1>
        
        <div className="bg-zinc-900/50 border-4 border-zinc-800 rounded-[3rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
          
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="flex-1 w-full text-left">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block ml-4">From</label>
              <button 
                type="button"
                onClick={() => setShowOriginPicker(true)}
                className="w-full flex items-center gap-3 px-6 py-4 bg-zinc-800/50 border-2 border-transparent hover:border-blue-500/30 rounded-2xl transition-all"
              >
                <div className="w-10 h-10 bg-blue-900/50 text-blue-400 rounded-full flex items-center justify-center font-black">
                  {origin ? '📍' : '🔵'}
                </div>
                <div>
                  <p className={`font-black uppercase italic ${origin ? 'text-white' : 'text-zinc-600'}`}>
                    {origin ? origin.name : 'Choose Start Location'}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    {origin?.isGps ? 'GPS Position Verified' : 'Starting Point'}
                  </p>
                </div>
              </button>
            </div>

            <div className="hidden md:flex items-center justify-center text-zinc-700">
              <ChevronRight size={32} strokeWidth={3} className="rotate-90 md:rotate-0" />
            </div>

            <div className="flex-1 w-full text-left">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block ml-4">To</label>
              <div className="relative group/input">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within/input:text-blue-400 transition-colors" size={24} />
                <input 
                  type="text" 
                  placeholder="Goa, Paris, Tokyo..." 
                  className="w-full pl-16 pr-6 py-5 bg-zinc-800/50 border-2 border-transparent focus:border-blue-500/30 focus:outline-none rounded-2xl transition-all font-black uppercase italic text-white placeholder:text-zinc-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isAiSearching}
              className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-[1.8rem] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 hover:-translate-y-1 active:scale-95"
            >
              {isAiSearching ? (
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
                />
              ) : <Sparkles size={24} />}
              Explore
            </button>
          </form>
        </div>

        <AnimatePresence>
          {showOriginPicker && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute left-1/2 -translate-x-1/2 mt-4 w-full max-w-md bg-zinc-900 border-4 border-zinc-800 rounded-[2.5rem] shadow-2xl z-50 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black uppercase italic text-white">Starting From?</h3>
                <button onClick={() => setShowOriginPicker(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                  <LogOut className="rotate-45" size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <button 
                  type="button"
                  disabled={isDetectingGps}
                  onClick={handleGpsClick}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-blue-900/30 bg-blue-950/30 hover:bg-blue-900/50 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    {isDetectingGps ? (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Navigation size={24} />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase tracking-tight text-blue-100">
                      {isDetectingGps ? 'Locating via GPS...' : 'Use Live GPS Location'}
                    </p>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest italic">
                      Browser Geolocation Coordinates
                    </p>
                  </div>
                </button>

                <div className="py-2 flex items-center gap-4">
                  <div className="h-[1px] flex-1 bg-zinc-800" />
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">or choose hub</span>
                  <div className="h-[1px] flex-1 bg-zinc-800" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {savedLocations.map((loc) => (
                    <button 
                      key={loc.id}
                      onClick={() => {
                        setOrigin(loc);
                        setShowOriginPicker(false);
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-[1.8rem] border-2 border-zinc-800 hover:border-blue-500 transition-all bg-zinc-800/50 group"
                    >
                      <span className="text-2xl group-hover:scale-125 transition-transform">{loc.icon}</span>
                      <p className="font-black uppercase text-[10px] tracking-widest text-zinc-300">{loc.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="mb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SEARCH_OPTIONS.map((opt) => (
            <button 
              key={opt.id}
              onClick={() => {
                if (opt.id === 'map') setActiveTab('map');
                if (opt.id === 'interest') setActiveTab('explore');
                if (opt.id === 'region') setActiveTab('explore');
              }}
              className="group p-6 bg-slate-900 border border-slate-800 rounded-[2rem] text-left hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-900/10 transition-all"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-slate-700 transition-all">
                {opt.icon}
              </div>
              <h3 className="font-bold text-white mb-1">{opt.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{opt.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <h2 className="text-2xl font-bold text-white mb-8">Search by Interest</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => setActiveTab('explore')}
              className="flex-shrink-0 flex flex-col items-center group"
            >
              <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center text-3xl mb-3 group-hover:bg-slate-800 group-hover:border-blue-500/30 group-hover:shadow-lg transition-all">
                {cat.icon}
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-white transition-colors">{cat.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">🔥 Trending Destinations</h2>
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button className="px-4 py-1.5 rounded-lg text-sm font-bold bg-slate-800 text-white shadow-sm">India</button>
            <button className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:text-white transition-colors">World</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {DESTINATIONS.filter(d => d.tag === 'Trending' || d.rating >= 4.8).slice(0, 4).map((dest, i) => (
            <motion.div 
              key={dest.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
              onClick={() => {
                setSelectedDest(dest);
                setActiveTab('dest-detail');
              }}
            >
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden mb-4 shadow-lg border border-slate-800">
                <img src={dest.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 text-white border border-white/10">
                  <Star size={10} fill="currentColor" className="text-amber-400" /> {dest.rating}
                </div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-xl font-bold">{dest.name}</h3>
                  <p className="text-xs opacity-80">{dest.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        <section className="bg-blue-600 rounded-[3rem] p-12 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <Sparkles className="text-blue-200 mb-6" size={40} />
            <h2 className="text-4xl font-bold mb-4 tracking-tight">AI Trip Search</h2>
            <p className="text-blue-100 mb-8 leading-relaxed text-lg">
              “I have ₹20,000 and 4 days. I want mountains, adventure and good food.”
            </p>
            <button 
              onClick={() => setActiveTab('planner')}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:shadow-white/20 transition-all flex items-center gap-2"
            >
              Try AI Planner <ChevronRight size={18} />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-150 transition-transform duration-1000" />
        </section>

        <section className="bg-slate-900 rounded-[3rem] p-12 text-white relative overflow-hidden group">
          <div className="relative z-10">
            <MapIconLucide className="text-slate-400 mb-6" size={40} />
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Explore on Map</h2>
            <p className="text-slate-400 mb-8 leading-relaxed text-lg">
              Discover hidden gems, beaches, and cafes visually. See what's nearby.
            </p>
            <button 
              onClick={() => setActiveTab('map')}
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all flex items-center gap-2"
            >
              Open Interactive Map <ChevronRight size={18} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2 group-hover:scale-150 transition-transform duration-1000" />
        </section>
      </div>
    </div>
  );
};


const PlannerScreen = ({ 
  aiFilters, 
  openAuthModal,
  origin,
  setOrigin,
  isVip = false,
  onOpenPremium,
  initialMode = 'single'
}: { 
  aiFilters?: any, 
  openAuthModal?: (m?: 'login' | 'signup') => void,
  origin?: any,
  setOrigin?: (o: any) => void,
  isVip?: boolean,
  onOpenPremium?: () => void,
  initialMode?: 'single' | 'multistop'
}) => {
  const { user, signIn, db } = useFirebase();
  const [plannerMode, setPlannerMode] = useState<'single' | 'multistop'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    destination: aiFilters?.destination || '',
    days: aiFilters?.duration || 4,
    budget: aiFilters?.budget ? `₹${aiFilters.budget.toLocaleString()}` : '₹20,000',
    travelers: 2,
    interests: aiFilters?.interests?.join(', ') || 'Beaches + Adventure'
  });

  useEffect(() => {
    if (aiFilters) {
      setFormData({
        destination: aiFilters.destination || '',
        days: aiFilters.duration || 4,
        budget: aiFilters.budget ? `₹${aiFilters.budget.toLocaleString()}` : '₹20,000',
        travelers: 2,
        interests: aiFilters.interests?.join(', ') || 'Beaches + Adventure'
      });
    }
  }, [aiFilters]);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  const handlePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      else signIn();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/gemini/plan-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      setItinerary({ ...data, destination: formData.destination });
    } catch (error) {
      console.error('Error planning trip:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    if (!user || !itinerary) return;
    
    try {
      const docId = crypto.randomUUID();
      const itineraryRef = doc(db, 'users', user.uid, 'itineraries', docId);
      await setDoc(itineraryRef, {
        ...itinerary,
        id: docId,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });
      alert('Trip saved to "My Trips"!');
    } catch (error) {
      console.error('Error saving trip:', error);
      alert('Failed to save trip.');
    }
  };

  if (itinerary) {
    return (
      <div className="pt-24 pb-12 px-6 max-w-4xl mx-auto text-white">
        <button 
          onClick={() => setItinerary(null)}
          className="text-sm font-medium text-zinc-500 hover:text-white mb-8 flex items-center gap-2 transition-colors uppercase tracking-widest"
        >
          <ChevronRight className="rotate-180" size={16} /> Back to Planner
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight italic uppercase">{itinerary.title}</h1>
            <div className="flex items-center gap-3 text-sm text-zinc-500 mt-2">
              <span>{formData.destination}</span>
              <span aria-hidden="true">·</span>
              <span>{formData.days} Days</span>
              <span aria-hidden="true">·</span>
              <span>{formData.budget}</span>
            </div>
          </div>
          <button 
            onClick={saveTrip}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
          >
            <Heart size={16} /> Save Trip
          </button>
        </div>

        <div className="space-y-12">
          {itinerary.days.map((dayPlan) => (
            <div key={dayPlan.day}>
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="bg-zinc-800 text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black">
                  {dayPlan.day}
                </span>
                Day {dayPlan.day}
              </h3>
              
              <div className="space-y-4 ml-11 border-l border-zinc-800 pl-8 relative">
                {dayPlan.activities.map((act, j) => (
                  <div key={j} className="relative">
                    <div className="absolute -left-[41px] top-2 w-4 h-4 bg-zinc-950 border-2 border-zinc-700 rounded-full" />
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono tabular-nums text-zinc-500 uppercase">{act.time}</span>
                        <span className="text-xs font-bold text-emerald-400">{act.estimatedCost}</span>
                      </div>
                      <h4 className="font-bold text-white mb-1 uppercase tracking-tight">{act.activity}</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{act.description}</p>
                    </div>
                  </div>
                ))}

                <div className="mt-6">
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Food Recommendations</h5>
                  <div className="flex flex-wrap gap-2 text-sm text-zinc-300 font-medium">
                    {dayPlan.food.map((f, k) => (
                      <span key={k}>{f}{k < dayPlan.food.length - 1 ? ' · ' : ''}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-blue-500/5 p-8 rounded-3xl border border-blue-500/20">
            <h3 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2 uppercase tracking-tight italic">
              <Sparkles size={20} /> Travel Tips
            </h3>
            <ul className="space-y-3">
              {itinerary.generalTips.map((tip, i) => (
                <li key={i} className="text-sm text-zinc-400 flex gap-3 font-medium">
                  <span className="text-blue-500 mt-1">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pt-24 pb-12 px-6 ${plannerMode === 'multistop' ? 'max-w-6xl' : 'max-w-3xl'} mx-auto text-white transition-all`}>
      {/* Mode Switcher */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
          <button
            type="button"
            onClick={() => setPlannerMode('single')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${plannerMode === 'single' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            Single Destination AI Plan
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode('multistop')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${plannerMode === 'multistop' ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
          >
            <Layers size={14} />
            <span>Multi-Stop Circuit Route</span>
          </button>
        </div>
      </div>

      {plannerMode === 'multistop' ? (
        <MultiStopPlanner 
          origin={origin}
          setOrigin={setOrigin || (() => {})}
          openAuthModal={openAuthModal}
          allDestinations={DESTINATIONS}
          isVip={isVip}
          onOpenPremium={onOpenPremium}
        />
      ) : (
        <div>
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight italic uppercase">AI Trip Planner</h1>
            <p className="text-zinc-500 font-medium">Tell us your destination, budget and duration, and we'll craft your day-by-day itinerary.</p>
          </div>

          <form onSubmit={handlePlan} className="space-y-6 bg-zinc-900/60 border border-zinc-800 rounded-[2.5rem] p-8">
        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Destination</label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input 
              required
              type="text" 
              placeholder="e.g. Bali, Indonesia"
              className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-colors text-white placeholder:text-zinc-700 font-bold"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Days</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="number" 
                min="1" max="14"
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-colors text-white font-bold"
                value={formData.days}
                onChange={(e) => setFormData({...formData, days: parseInt(e.target.value)})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Travelers</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="number" 
                min="1"
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-colors text-white font-bold"
                value={formData.travelers}
                onChange={(e) => setFormData({...formData, travelers: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Budget Range</label>
          <div className="relative">
            <select 
              className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-colors text-white font-bold appearance-none"
              value={formData.budget}
              onChange={(e) => setFormData({...formData, budget: e.target.value})}
            >
              <option>₹10,000 - ₹20,000</option>
              <option>₹20,000 - ₹50,000</option>
              <option>₹50,000 - ₹1,00,000</option>
              <option>₹1,00,000+</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Interests</label>
          <input 
            type="text" 
            placeholder="e.g. Museums, Cafes, Hiking"
            className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl focus:border-blue-500/50 focus:outline-none transition-colors text-white font-bold placeholder:text-zinc-700"
            value={formData.interests}
            onChange={(e) => setFormData({...formData, interests: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white py-5 rounded-[1.8rem] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-xl shadow-blue-900/20 hover:-translate-y-1 active:scale-95 mt-4"
        >
          {loading ? (
            <>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full"
              />
              Generating Plan...
            </>
          ) : (
            <>
              <Sparkles size={24} /> Generate Itinerary
            </>
          )}
        </button>
      </form>
    </div>
  )}
</div>
);
};

const ExploreScreen = ({ 
  searchQuery, 
  aiFilters, 
  onClearSearch, 
  setActiveTab, 
  setSelectedDest,
  openAuthModal,
  origin
}: { 
  searchQuery?: string, 
  aiFilters?: any, 
  onClearSearch?: () => void, 
  setActiveTab: (tab: string) => void, 
  setSelectedDest: (dest: any) => void,
  openAuthModal?: (m?: 'login' | 'signup') => void,
  origin?: any
}) => {
  const [activeRegion, setActiveTabRegion] = useState('All');
  const [activeSubRegion, setActiveSubRegion] = useState('All');
  const [activeCat, setActiveCat] = useState('All');
  const [budgetFilter, setBudgetFilter] = useState('All');
  const [durationFilter, setDurationFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Recommended');
  const [isAiDiscovering, setIsAiDiscovering] = useState(false);
  
  const { user, db, signIn } = useFirebase();
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (aiFilters) {
      if (aiFilters.region) setActiveTabRegion(aiFilters.region);
      if (aiFilters.type) setActiveCat(aiFilters.type);
      if (aiFilters.budget) {
        if (aiFilters.budget <= 5000) setBudgetFilter('Under ₹5,000');
        else if (aiFilters.budget <= 15000) setBudgetFilter('₹5,000–₹15,000');
        else if (aiFilters.budget <= 50000) setBudgetFilter('₹15,000–₹50,000');
        else setBudgetFilter('₹50,000+');
      }
      if (aiFilters.duration) {
        if (aiFilters.duration === 1) setDurationFilter('1 Day');
        else if (aiFilters.duration <= 3) setDurationFilter('2–3 Days');
        else if (aiFilters.duration <= 7) setDurationFilter('4–7 Days');
        else setDurationFilter('7+ Days');
      }
    }
  }, [aiFilters]);

  const filteredSpots = useMemo(() => {
    let spots = [...DESTINATIONS];
    
    if (searchQuery && !aiFilters) {
      const q = searchQuery.toLowerCase();
      spots = spots.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.type.toLowerCase().includes(q) || 
        s.region.toLowerCase().includes(q) ||
        (s.subRegion && s.subRegion.toLowerCase().includes(q)) ||
        s.location.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    } else if (aiFilters) {
      if (aiFilters.destination) {
        spots = spots.filter(s => s.name.toLowerCase().includes(aiFilters.destination.toLowerCase()));
      }
      if (aiFilters.region && aiFilters.region !== 'All') {
        spots = spots.filter(s => s.region.toLowerCase() === aiFilters.region.toLowerCase());
      }
      if (aiFilters.type) {
        spots = spots.filter(s => s.type.toLowerCase() === aiFilters.type.toLowerCase());
      }
      if (aiFilters.budget) {
        spots = spots.filter(s => s.budget <= aiFilters.budget);
      }
      if (aiFilters.duration) {
        spots = spots.filter(s => s.duration <= aiFilters.duration);
      }
    } else {
      if (activeRegion !== 'All') {
        spots = spots.filter(s => s.region === activeRegion);
      }
    }

    if (activeSubRegion !== 'All') {
      spots = spots.filter(s => s.subRegion === activeSubRegion);
    }

    if (activeCat !== 'All') {
      spots = spots.filter(s => s.type === activeCat);
    }

    if (budgetFilter !== 'All') {
      if (budgetFilter === 'Under ₹5,000') spots = spots.filter(s => s.budget < 5000);
      if (budgetFilter === '₹5,000–₹15,000') spots = spots.filter(s => s.budget >= 5000 && s.budget <= 15000);
      if (budgetFilter === '₹15,000–₹50,000') spots = spots.filter(s => s.budget > 15000 && s.budget <= 50000);
      if (budgetFilter === '₹50,000+') spots = spots.filter(s => s.budget > 50000);
    }

    if (durationFilter !== 'All') {
      if (durationFilter === '1 Day') spots = spots.filter(s => s.duration === 1);
      if (durationFilter === '2–3 Days') spots = spots.filter(s => s.duration >= 2 && s.duration <= 3);
      if (durationFilter === '4–7 Days') spots = spots.filter(s => s.duration >= 4 && s.duration <= 7);
      if (durationFilter === '7+ Days') spots = spots.filter(s => s.duration > 7);
    }

    // Sorting
    if (sortBy === 'Rating: High to Low') {
      spots.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'Budget: Low to High') {
      spots.sort((a, b) => a.budget - b.budget);
    } else if (sortBy === 'Budget: High to Low') {
      spots.sort((a, b) => b.budget - a.budget);
    } else if (sortBy === 'Distance' && origin) {
      spots.sort((a, b) => {
        const dA = calculateDistanceKm(origin.lat, origin.lng, a.lat, a.lng);
        const dB = calculateDistanceKm(origin.lat, origin.lng, b.lat, b.lng);
        return dA - dB;
      });
    }

    return spots;
  }, [activeRegion, activeSubRegion, activeCat, searchQuery, budgetFilter, durationFilter, sortBy, origin, aiFilters]);

  useEffect(() => {
    if (!user || !db) return;
    const favsRef = collection(db, 'users', user.uid, 'favorites');
    const unsubscribe = onSnapshot(favsRef, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => doc.data().destinationId));
    }, (error) => {
      console.warn('Favorites listener error:', error);
    });
    return () => unsubscribe();
  }, [user, db]);

  const toggleFavorite = async (spot: any) => {
    if (!user) {
      if (openAuthModal) openAuthModal('login');
      else signIn();
      return;
    }

    const spotId = spot.id;
    const isFav = favorites.includes(spotId);

    try {
      if (isFav) {
        await deleteDoc(doc(db, 'users', user.uid, 'favorites', spotId));
      } else {
        await setDoc(doc(db, 'users', user.uid, 'favorites', spotId), {
          id: spotId,
          userId: user.uid,
          destinationId: spotId,
          destinationName: spot.name,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAiDiscoverAnywhere = async (queryName: string) => {
    setIsAiDiscovering(true);
    try {
      const res = await fetch('/api/ai/discover-destination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: queryName })
      });
      const data = await res.json();
      const customDest = {
        id: queryName.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
        name: queryName,
        location: 'Global Discovery',
        image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800',
        images: ['https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800'],
        tag: 'AI Discovered',
        type: 'Heritage',
        region: 'World',
        subRegion: 'Global',
        description: data.description || `Explore scenic highlights, culture and flavors of ${queryName}.`,
        lat: 28.6139,
        lng: 77.2090,
        rating: 4.8,
        budget: data.avgBudget || 20000,
        duration: 4
      };
      setSelectedDest(customDest);
      setActiveTab('dest-detail');
    } catch (err) {
      console.error('AI discovery error:', err);
      alert('Could not discover this destination. Please try another query.');
    } finally {
      setIsAiDiscovering(false);
    }
  };

  return (
    <div className="pt-20 sm:pt-24 pb-28 px-4 sm:px-6 max-w-7xl mx-auto text-stone-100">
      {/* Peaceful Nature Hero Banner */}
      <div className="relative rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden mb-12 border border-emerald-900/40 shadow-2xl bg-[#091710]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1600"
            alt="Misty mountain valley"
            className="w-full h-full object-cover opacity-35 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#06100c] via-[#06100c]/70 to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-12 md:p-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/50 text-emerald-300 text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-md">
            <Compass size={14} className="text-emerald-400" />
            <span>Peaceful Journeys & Nature Sanctuaries</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight uppercase italic leading-none mb-4">
            Find Rest in the <span className="text-emerald-400">Wild</span>
          </h1>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed mb-8 max-w-2xl font-normal">
            Immerse yourself in misty mountain valleys, tranquil emerald backwaters, and restorative shores across India and worldwide.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('search')}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Search size={16} />
              <span>Search by Location & Vibe</span>
            </button>

            <button
              onClick={() => setActiveTab('multistop')}
              className="px-5 py-3 rounded-2xl bg-[#0a1811]/90 hover:bg-[#0e2218] border border-emerald-800/40 text-stone-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 backdrop-blur-md cursor-pointer"
            >
              <Layers size={16} className="text-emerald-400" />
              <span>Multi-Stop Circuit Route</span>
            </button>
          </div>

          {origin && (
            <div className="mt-6 pt-5 border-t border-emerald-900/30 flex items-center gap-2 text-xs text-stone-400">
              <MapPin size={14} className="text-emerald-400 flex-shrink-0" />
              <span>Calculating live travel distances from: <strong className="text-white">{origin.name}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Region Switcher & Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase italic">
            {searchQuery ? `Sanctuaries matching "${searchQuery}"` : 'Curated Destinations'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Browse handpicked escapes across India and international continents.
          </p>
        </div>

        {/* Main Region Selector */}
        <div className="flex bg-[#0a1811] p-1.5 rounded-2xl shadow-inner border border-emerald-900/40 self-start md:self-auto">
          {['All', 'India', 'World'].map(region => (
            <button 
              key={region}
              onClick={() => {
                setActiveTabRegion(region);
                setActiveSubRegion('All');
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeRegion === region 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {region === 'World' ? 'Worldwide' : region}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-region Filter Tabs */}
      {activeRegion !== 'All' && (
        <div className="mb-8 p-3 rounded-2xl bg-[#0a1811]/80 border border-emerald-900/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mr-2 whitespace-nowrap">
            {activeRegion === 'India' ? 'Regions in India:' : 'Continents:'}
          </span>
          {(activeRegion === 'India' 
            ? ['All', 'North', 'South', 'East', 'Northeast', 'Islands']
            : ['All', 'Europe', 'Asia', 'Middle East', 'Americas', 'Oceania']
          ).map(sub => (
            <button
              key={sub}
              onClick={() => setActiveSubRegion(sub)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeSubRegion === sub 
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50 shadow-sm' 
                  : 'bg-[#06100c] text-stone-400 hover:text-white'
              }`}
            >
              {sub === 'All' ? `All ${activeRegion}` : sub}
            </button>
          ))}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1 space-y-6 bg-[#0a1811]/60 p-6 rounded-3xl border border-emerald-900/30 self-start">
          {/* Sorting */}
          <div>
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#06100c] border border-emerald-950 rounded-xl text-stone-200 text-xs font-bold focus:outline-none focus:border-emerald-600"
            >
              <option>Recommended</option>
              <option>Rating: High to Low</option>
              <option>Budget: Low to High</option>
              <option>Budget: High to Low</option>
              {origin && <option>Distance</option>}
            </select>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Terrain & Vibe</h3>
            <div className="flex flex-wrap gap-2">
              {['All', 'Mountains', 'Beach', 'Nature', 'Heritage', 'Adventure', 'Food'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    activeCat === cat 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-[#06100c] text-stone-400 hover:text-white border border-emerald-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Budget Range */}
          <div>
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Budget Range</h3>
            <div className="space-y-1.5">
              {['All', 'Under ₹5,000', '₹5,000–₹15,000', '₹15,000–₹50,000', '₹50,000+'].map(b => (
                <button 
                  key={b}
                  onClick={() => setBudgetFilter(b)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    budgetFilter === b 
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40' 
                      : 'bg-[#06100c] text-stone-400 hover:text-stone-200 border border-emerald-950'
                  }`}
                >
                  <span>{b}</span>
                  <div className={`w-2 h-2 rounded-full ${budgetFilter === b ? 'bg-emerald-400' : 'bg-stone-700'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Ideal Duration */}
          <div>
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-3">Ideal Duration</h3>
            <div className="space-y-1.5">
              {['All', '1 Day', '2–3 Days', '4–7 Days', '7+ Days'].map(d => (
                <button 
                  key={d}
                  onClick={() => setDurationFilter(d)}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                    durationFilter === d 
                      ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40' 
                      : 'bg-[#06100c] text-stone-400 hover:text-stone-200 border border-emerald-950'
                  }`}
                >
                  <span>{d}</span>
                  <div className={`w-2 h-2 rounded-full ${durationFilter === d ? 'bg-emerald-400' : 'bg-stone-700'}`} />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Destination Cards Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredSpots.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[#0a1811]/60 border border-emerald-900/30 rounded-3xl p-8">
                <Compass size={40} className="text-stone-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">No matching destinations found</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto mb-6">
                  Try broadening your filters, or discover unlisted cities with Gemini AI.
                </p>
                {searchQuery && (
                  <button
                    onClick={() => handleAiDiscoverAnywhere(searchQuery)}
                    disabled={isAiDiscovering}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    {isAiDiscovering ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Discovering "{searchQuery}"...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>Discover "{searchQuery}" with AI</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            ) : filteredSpots.map((spot, i) => {
              const isFav = favorites.includes(spot.id);
              const distanceKm = origin && spot.lat && spot.lng 
                ? calculateDistanceKm(origin.lat, origin.lng, spot.lat, spot.lng) 
                : null;

              return (
                <motion.div 
                  key={spot.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i % 6) * 0.05 }}
                  className="group cursor-pointer bg-[#0c1c14] border border-emerald-900/30 hover:border-emerald-500/50 rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-emerald-950/40"
                  onClick={() => {
                    setSelectedDest(spot);
                    setActiveTab('dest-detail');
                  }}
                >
                  <div>
                    {/* Landscape Photography */}
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img 
                        src={spot.image} 
                        alt={spot.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* Quiet Location Tag & Favorite Button */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-200 bg-[#06100c]/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-800/40">
                          {spot.region === 'India' ? '🇮🇳 India' : '🌍 World'} · {spot.type}
                        </span>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(spot);
                          }}
                          className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                            isFav 
                              ? 'bg-rose-600 text-white shadow-md' 
                              : 'bg-black/50 text-white hover:bg-black/80'
                          }`}
                          title="Save to favorites"
                        >
                          <Heart size={14} fill={isFav ? "currentColor" : "none"} />
                        </button>
                      </div>

                      {/* Title & Location text */}
                      <div className="absolute bottom-3 left-4 right-4">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                          {spot.name}
                        </h3>
                        <p className="text-xs text-stone-300 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-emerald-400" />
                          <span>{spot.location}</span>
                        </p>
                      </div>
                    </div>

                    {/* Peaceful Description preview */}
                    <div className="p-5">
                      <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                        {spot.description}
                      </p>
                    </div>
                  </div>

                  {/* Clean unboxed footer */}
                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-emerald-950/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3 text-stone-400 font-medium">
                        <span>₹{spot.budget.toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>{spot.duration} Days</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-300 font-bold">★ {spot.rating}</span>
                      </div>

                      <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform font-bold inline-flex items-center gap-1 text-[11px]">
                        Explore Guide →
                      </span>
                    </div>

                    {distanceKm !== null && (
                      <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-900/30 text-[11px] text-emerald-300 flex items-center justify-between">
                        <span>Distance from {origin?.name?.split(' ')[0]}:</span>
                        <span className="font-bold">{distanceKm.toLocaleString()} km</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const HotelsScreen = ({ 
  onBook, 
  openAuthModal, 
  isVip 
}: { 
  onBook: (hotel: Hotel) => void, 
  openAuthModal?: (m?: 'login' | 'signup') => void,
  isVip?: boolean
}) => {
  const [view, setView] = useState<'partners' | 'curated'>('partners');

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tight">Hotels & Stays</h1>
          <p className="text-zinc-500 text-sm">Official partner rates, instant cashback, and curated boutique hotels.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setView('partners')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === 'partners' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            <Sparkles size={14} /> Partner Network (Cashback)
          </button>
          <button
            onClick={() => setView('curated')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'curated' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Curated Direct
          </button>
        </div>
      </div>

      {view === 'partners' ? (
        <PartnerBookingsSection 
          initialCategory="hotel" 
          openAuthModal={openAuthModal}
          isVip={isVip}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {HOTELS.map((hotel) => (
            <div key={hotel.id} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-sm group">
              <div className="relative aspect-video">
                <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 text-white">
                  <Heart size={12} className="text-red-500 fill-current" /> {hotel.rating}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-1">{hotel.name}</h3>
                <p className="text-zinc-500 text-sm mb-4">{hotel.location}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {hotel.facilities.map(f => (
                    <span key={f} className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 bg-zinc-800 px-2 py-1 rounded">{f}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Starting from</p>
                    <p className="text-xl font-bold text-white">{hotel.price}<span className="text-sm font-normal text-zinc-500">/night</span></p>
                  </div>
                  <button 
                    onClick={() => onBook(hotel)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors"
                  >
                    Book Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FlightsScreen = ({ 
  openAuthModal, 
  isVip 
}: { 
  openAuthModal?: (m?: 'login' | 'signup') => void,
  isVip?: boolean 
}) => {
  const [view, setView] = useState<'partners' | 'curated'>('partners');

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tight">Flight Search</h1>
          <p className="text-zinc-500 text-sm">Compare 1,000+ airlines via Skyscanner, MakeMyTrip & Emirates.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setView('partners')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === 'partners' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            <Sparkles size={14} /> Partner Fares (Cashback)
          </button>
          <button
            onClick={() => setView('curated')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'curated' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Scheduled Routes
          </button>
        </div>
      </div>

      {view === 'partners' ? (
        <PartnerBookingsSection 
          initialCategory="flight" 
          openAuthModal={openAuthModal}
          isVip={isVip}
        />
      ) : (
        <div className="space-y-4">
          {FLIGHTS.map((flight) => (
            <div key={flight.id} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center font-bold text-zinc-500">
                  {flight.airline[0]}
                </div>
                <div>
                  <h3 className="font-bold text-white">{flight.airline}</h3>
                  <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Economy</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{flight.from}</p>
                  <p className="text-xs text-zinc-500">{flight.departure}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{flight.duration}</p>
                  <div className="w-20 h-[1px] bg-zinc-800 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 border border-zinc-800 bg-zinc-900 rounded-full" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{flight.to}</p>
                  <p className="text-xs text-zinc-500">Arrival</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{flight.price}</p>
                  <p className="text-xs text-zinc-500">Per Adult</p>
                </div>
                <button className="bg-blue-600 text-white px-8 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 transition-colors">
                  Book
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CabsScreen = ({ 
  openAuthModal, 
  isVip 
}: { 
  openAuthModal?: (m?: 'login' | 'signup') => void,
  isVip?: boolean 
}) => {
  const [view, setView] = useState<'partners' | 'curated'>('partners');
  const options = [
    { type: 'Sedan', price: '₹450', description: '4 Seater, Budget friendly', icon: '🚗' },
    { type: 'SUV', price: '₹650', description: '6 Seater, Extra luggage space', icon: '🚙' },
    { type: 'Premium', price: '₹950', description: 'Luxury experience', icon: '✨' },
  ];

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tight">Cabs & Airport Transfers</h1>
          <p className="text-zinc-500 text-sm">Official taxi & outstation partners: Uber, Savaari Car Rentals, and Ola.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setView('partners')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === 'partners' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            <Sparkles size={14} /> Partner Cabs & Vouchers
          </button>
          <button
            onClick={() => setView('curated')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${view === 'curated' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            Fleet Estimates
          </button>
        </div>
      </div>

      {view === 'partners' ? (
        <PartnerBookingsSection 
          initialCategory="cab" 
          openAuthModal={openAuthModal}
          isVip={isVip}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {options.map((opt) => (
            <div key={opt.type} className="bg-zinc-900 p-8 rounded-[2rem] border border-zinc-800 shadow-sm hover:border-blue-500/30 transition-colors cursor-pointer group">
              <div className="text-4xl mb-6">{opt.icon}</div>
              <h3 className="text-xl font-bold text-white mb-1">{opt.type}</h3>
              <p className="text-sm text-zinc-500 mb-6">{opt.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <p className="text-2xl font-bold text-white">{opt.price}</p>
                <ChevronRight className="text-zinc-700 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CheckoutModal = ({ item, onClose }: { item: any, onClose: () => void }) => {
  const [step, setStep] = useState('review');
  const { user, db } = useFirebase();

  const handlePay = async () => {
    if (!user) return;
    setStep('loading');
    
    try {
      const totalAmount = parseInt(item.price.replace(/[^\d]/g, ''));
      const rule = COMMISSION_RULES[item.category as keyof typeof COMMISSION_RULES] || { type: 'PERCENTAGE', value: 0.1 };
      
      let commissionAmount = 0;
      if (rule.type === 'PERCENTAGE') {
        commissionAmount = totalAmount * rule.value;
      } else {
        commissionAmount = rule.value;
      }

      const partnerAmount = totalAmount - commissionAmount;
      const bookingId = crypto.randomUUID();

      await setDoc(doc(db, 'users', user.uid, 'bookings', bookingId), {
        id: bookingId,
        userId: user.uid,
        type: item.category || 'hotel',
        details: item,
        amount: totalAmount,
        commissionAmount: commissionAmount,
        partnerAmount: partnerAmount,
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });
      setStep('success');
    } catch (e) {
      console.error(e);
      setStep('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-zinc-950 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-zinc-800"
      >
        <AnimatePresence mode="wait">
          {step === 'review' && (
            <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Confirm Booking</h2>
              <div className="bg-zinc-900 p-6 rounded-2xl mb-8 border border-zinc-800">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Selected Item</p>
                <h4 className="font-bold text-white text-lg">{item.name}</h4>
                <div className="mt-4 pt-4 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-bold text-white">{item.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Platform Fee</span>
                    <span className="font-bold text-white">₹99</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-800">
                    <span className="text-white">Total</span>
                    <span className="text-blue-400">₹{parseInt(item.price.replace(/[^\d]/g, '')) + 99}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 py-4 text-sm font-bold text-zinc-500 hover:bg-zinc-900 rounded-2xl transition-colors">
                  Cancel
                </button>
                <button onClick={handlePay} className="flex-1 py-4 text-sm font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                  Pay Now
                </button>
              </div>
            </motion.div>
          )}

          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
              <p className="font-bold text-white">Processing Payment...</p>
              <p className="text-sm text-zinc-500 mt-2">Connecting to Razorpay gateway</p>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-12 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h2>
              <p className="text-zinc-500 mb-8">Your trip details have been sent to your email.</p>
              <button onClick={onClose} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800">
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const ActivitiesScreen = ({ onBook }: { onBook: (act: any) => void }) => {
  const acts = [
    { name: 'Scuba Diving', price: '₹4,500', location: 'Grande Island, Goa', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80&w=800', rating: 4.9, category: 'activity' },
    { name: 'Trekking', price: '₹1,200', location: 'Beas Kund, Manali', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&q=80&w=800', rating: 4.8, category: 'activity' },
    { name: 'Water Sports', price: '₹2,500', location: 'Baga Beach, Goa', image: 'https://images.unsplash.com/photo-1530122622335-ccad02e45ef3?auto=format&fit=crop&q=80&w=800', rating: 4.7, category: 'activity' },
  ];

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-white mb-8 tracking-tight italic uppercase">Top Experiences</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {acts.map((act, i) => (
          <div key={i} className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-sm group">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img src={act.image} alt={act.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">⭐ {act.rating}</span>
                <span className="text-lg font-bold text-white">{act.price}</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{act.name}</h3>
              <p className="text-sm text-zinc-500 mb-6">{act.location}</p>
              <button 
                onClick={() => onBook(act)}
                className="w-full py-3 bg-zinc-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all border border-zinc-700"
              >
                Book Experience
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RoutePolyline = ({ encodedPath }: { encodedPath: string }) => {
  const map = useMap();
  const maps = useMapsLibrary('geometry');

  useEffect(() => {
    if (!map || !maps || !encodedPath) return;

    const path = maps.encoding.decodePath(encodedPath);
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#3b82f6',
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, maps, encodedPath]);

  return null;
};

const PackingChecklist = ({ destinationId, destinationName }: { destinationId: string, destinationName: string }) => {
  const { user, db } = useFirebase();
  const [items, setItems] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const itemsRef = collection(db, 'users', user.uid, 'checklists', destinationId, 'items');
    const unsub = onSnapshot(itemsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(docs.sort((a: any, b: any) => (a.createdAt || 0) - (b.createdAt || 0)));
      setLoading(false);
    }, (error) => {
      console.warn('Checklist items listener error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, [user, db, destinationId]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim() || !user || !db) return;
    try {
      const itemsRef = collection(db, 'users', user.uid, 'checklists', destinationId, 'items');
      const id = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(itemsRef, id), {
        id,
        task: newTask.trim(),
        completed: false,
        createdAt: Date.now()
      });
      setNewTask('');
    } catch (err) {
      console.error("Error adding checklist item:", err);
    }
  };

  const toggleItem = async (id: string, completed: boolean) => {
    if (!user || !db) return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'checklists', destinationId, 'items', id);
      await updateDoc(itemRef, { completed: !completed });
    } catch (err) {
      console.error("Error toggling item:", err);
    }
  };

  const removeItem = async (id: string) => {
    if (!user || !db) return;
    try {
      const itemRef = doc(db, 'users', user.uid, 'checklists', destinationId, 'items', id);
      await deleteDoc(itemRef);
    } catch (err) {
      console.error("Error removing item:", err);
    }
  };

  if (!user) return null;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-4">
              <CheckCircle2 size={12} /> Travel Prep
            </span>
            <h3 className="text-3xl font-black uppercase italic tracking-tighter text-white">Packing Checklist</h3>
            <p className="text-zinc-500 text-sm font-medium">Personal list for {destinationName}</p>
          </div>
        </div>

        <form onSubmit={addItem} className="flex gap-3 mb-8">
          <input 
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add item (e.g. Sunscreen, Passport...)"
            className="flex-1 bg-black/50 border border-zinc-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95">
            <Plus size={24} />
          </button>
        </form>

        <div className="space-y-3">
          {loading ? (
             <div className="h-20 flex items-center justify-center text-zinc-600 italic">Loading checklist...</div>
          ) : items.length === 0 ? (
             <div className="py-10 text-center bg-black/20 rounded-3xl border border-dashed border-zinc-800">
               <p className="text-zinc-600 text-sm font-bold uppercase tracking-widest">List is empty</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-black/30 rounded-2xl border border-zinc-800/50 group">
                  <button 
                    onClick={() => toggleItem(item.id, item.completed)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-700 hover:border-emerald-500/50'}`}
                  >
                    {item.completed && <CheckCircle2 size={14} />}
                  </button>
                  <span className={`flex-1 text-sm font-medium ${item.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                    {item.task}
                  </span>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-zinc-700 hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const DestinationDetails = ({ 
  dest, 
  onBack, 
  setActiveTab, 
  origin,
  openAuthModal
}: { 
  dest: any, 
  onBack: () => void, 
  setActiveTab: (t: string) => void, 
  origin: any,
  openAuthModal?: (mode?: 'login' | 'signup') => void 
}) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [richData, setRichData] = useState<any>(null);
  const [loadingRich, setLoadingRich] = useState(true);
  const [weather, setWeather] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [route, setRoute] = useState<any>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentRating, setCurrentRating] = useState<number>(dest.rating || 4.8);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const images = dest.images || [dest.image];

  useEffect(() => {
    const fetchRichData = async () => {
      setLoadingRich(true);
      try {
        const response = await fetch('/api/ai/discover-destination', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destination: dest.name })
        });
        const data = await response.json();
        if (data && !data.error) {
          setRichData(data);
        } else {
          setRichData({
            description: dest.description,
            bestTime: "October to March",
            avgBudget: dest.budget,
            popularPlaces: [
              { name: `${dest.name} Highlights`, type: dest.type, description: `Iconic scenic spot showcasing the beauty of ${dest.name}.` }
            ],
            videoUrls: ["https://www.youtube.com/watch?v=kYJde92vHn4"]
          });
        }
      } catch (error) {
        console.error('Error fetching rich data:', error);
      } finally {
        setLoadingRich(false);
      }
    };

    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const response = await fetch(`/api/weather?lat=${dest.lat}&lng=${dest.lng}`);
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      } finally {
        setLoadingWeather(false);
      }
    };

    const fetchRoute = async () => {
      if (!origin) return;
      setLoadingRoute(true);
      try {
        const response = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: dest.lat, lng: dest.lng }
          })
        });
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          setRoute(data.routes[0]);
        }
      } catch (error) {
        console.error('Error fetching route:', error);
      } finally {
        setLoadingRoute(false);
      }
    };

    fetchRichData();
    fetchWeather();
    fetchRoute();
  }, [dest.name, dest.lat, dest.lng, origin]);

  const handleDragEnd = (event: any, info: any) => {
    if (images.length <= 1) return;
    const threshold = 50;
    if (info.offset.x < -threshold) {
      setCurrentImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    } else if (info.offset.x > threshold) {
      setCurrentImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-5xl mx-auto text-white">
      <button onClick={onBack} className="text-sm font-black text-zinc-500 hover:text-white mb-8 flex items-center gap-2 uppercase tracking-widest transition-colors">
        <ChevronRight className="rotate-180" size={16} /> Back to Discover
      </button>
      
      <div className="relative aspect-video rounded-[3rem] overflow-hidden mb-12 shadow-2xl group/gallery touch-none border-4 border-zinc-900">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentImgIndex}
            src={images[currentImgIndex]} 
            alt={`${dest.name} ${currentImgIndex + 1}`} 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            className="w-full h-full object-cover cursor-grab active:cursor-grabbing" 
          />
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-10 left-10 text-white pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">{dest.type}</span>
            <a 
              href="#destination-reviews-section"
              className="pointer-events-auto bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer"
            >
              ⭐ {currentRating} {totalReviews > 0 ? `(${totalReviews})` : ''}
            </a>
          </div>
          <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-none mb-4">{dest.name}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-white/70 font-bold flex items-center gap-1">
              <MapPin size={18} className="text-blue-400" /> {dest.location}
            </p>
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name + ' ' + dest.location)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <TrendingUp size={14} /> View on Map
            </a>
            <a 
              href="#destination-reviews-section"
              className="pointer-events-auto bg-amber-500/25 hover:bg-amber-500/40 border border-amber-300/40 text-amber-200 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Star size={13} className="fill-amber-300 text-amber-300" />
              <span>Reviews ({totalReviews})</span>
            </a>
          </div>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-10 right-10 flex gap-2 z-10">
            {images.map((_: any, i: number) => (
              <button 
                key={i} 
                onClick={() => setCurrentImgIndex(i)}
                className={`h-2 rounded-full transition-all ${i === currentImgIndex ? 'bg-white w-12' : 'bg-white/40 w-2 hover:bg-white/60'}`} 
              />
            ))}
          </div>
        )}
      </div>

      {origin && (
        <section className="mb-16">
          <div className="bg-zinc-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-zinc-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="flex-1 space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter">Your Journey</h3>
                  <div className="bg-zinc-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-zinc-700">
                    {origin.name} → {dest.name}
                  </div>
                </div>

                <div className="relative pl-12 space-y-12">
                  <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-500 via-zinc-700 to-emerald-500" />
                  
                  <div className="relative">
                    <div className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full border-4 border-zinc-900 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Origin</p>
                      <p className="text-xl font-black uppercase italic leading-none">{origin.name}</p>
                    </div>
                  </div>

                  {route ? (
                    <div className="bg-zinc-800/50 backdrop-blur-md p-6 rounded-2xl border border-zinc-800 inline-flex items-center gap-8 group hover:bg-zinc-800 transition-all cursor-default">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center">
                          <Navigation size={20} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Duration</p>
                          <p className="text-lg font-black italic">{Math.floor(parseInt(route.duration) / 3600)}h {Math.floor((parseInt(route.duration) % 3600) / 60)}m</p>
                        </div>
                      </div>
                      <div className="w-[1px] h-8 bg-zinc-800" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center">
                          <MapIcon size={20} />
                        </div>
                        <div>
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Distance</p>
                          <p className="text-lg font-black italic">{(route.distanceMeters / 1000).toFixed(1)} KM</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-20 flex items-center gap-3 text-zinc-500 italic text-sm">
                      <div className="w-5 h-5 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin" />
                      Calculating fastest route...
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute -left-[12px] top-1/2 -translate-y-1/2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Destination</p>
                      <p className="text-xl font-black uppercase italic leading-none">{dest.name}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-80 space-y-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Travel Options</p>
                {[
                  { mode: 'Flight', icon: '✈️', time: '2h 15m', fare: '₹4,500', active: true },
                  { mode: 'Train', icon: '🚆', time: '14h 30m', fare: '₹1,200' },
                  { mode: 'Bus', icon: '🚌', time: '18h 00m', fare: '₹900' },
                  { mode: 'Self Drive', icon: '🚗', time: route ? `${Math.floor(parseInt(route.duration) / 3600)}h ${Math.floor((parseInt(route.duration) % 3600) / 60)}m` : '---', fare: '₹3,500' },
                ].map((opt) => (
                  <button key={opt.mode} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${opt.active ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-600/20' : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{opt.icon}</span>
                      <div className="text-left">
                        <p className="font-black uppercase text-[10px] tracking-widest">{opt.mode}</p>
                        <p className="text-[8px] font-bold text-white/40 uppercase italic">{opt.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black italic text-sm">{opt.fare}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="md:col-span-2 space-y-12">
          <section>
            <h2 className="text-4xl font-black text-white mb-6 italic uppercase tracking-tighter">The Vibe</h2>
            <p className="text-zinc-500 text-xl leading-relaxed font-medium">
              {loadingRich ? 'Discovering details...' : richData?.description || dest.description}
            </p>
          </section>

          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Weather Forecast</h3>
              {weather && (
                <div className="flex items-center gap-2 text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
                  <span className="text-2xl">{weather.current.icon}</span>
                  <span className="font-black text-lg">{weather.current.temp}°C</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {loadingWeather ? (
                [1,2,3,4].map(i => <div key={i} className="h-32 bg-zinc-900 animate-pulse rounded-[2rem]" />)
              ) : weather?.forecast?.slice(0, 4).map((f: any, i: number) => (
                <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                    {i === 0 ? 'Today' : new Date(f.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <span className="text-3xl mb-3">{f.icon}</span>
                  <p className="text-lg font-black text-white italic leading-none mb-1">{Math.round(f.maxTemp)}°</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{f.condition}</p>
                </div>
              ))}
            </div>
          </section>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="p-8 bg-zinc-900/50 rounded-[3rem] border border-zinc-800 relative overflow-hidden group">
              <Clock className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h4 className="font-black text-zinc-500 uppercase tracking-widest text-[10px] mb-1 opacity-50">Best Time</h4>
              <p className="text-2xl font-black text-white italic leading-tight">{loadingRich ? '...' : richData?.bestTime || 'Oct - March'}</p>
            </div>
            <div className="p-8 bg-zinc-900/50 rounded-[3rem] border border-zinc-800 relative overflow-hidden group">
              <Ticket className="text-emerald-500 mb-4 group-hover:scale-110 transition-transform" size={40} />
              <h4 className="font-black text-zinc-500 uppercase tracking-widest text-[10px] mb-1 opacity-50">Couples Budget</h4>
              <p className="text-2xl font-black text-white italic leading-tight">₹{(richData?.avgBudget || dest.budget).toLocaleString()} / day</p>
            </div>
          </div>

          <section>
            <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter italic">Popular Spots in {dest.name}</h3>
            <div className="grid grid-cols-1 gap-4">
              {loadingRich ? (
                [1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900/50 animate-pulse rounded-[2rem]" />)
              ) : richData?.popularPlaces?.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-6 p-6 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] hover:border-blue-500/50 transition-all group">
                  <div className="w-16 h-16 bg-blue-900/20 rounded-2xl flex-shrink-0 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-xl text-white uppercase tracking-tight italic">{p.name}</h4>
                      <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{p.type}</span>
                    </div>
                    <p className="text-zinc-500 text-sm font-medium leading-relaxed">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Experience {dest.name}</h3>
              <div className="flex items-center gap-2 text-rose-500">
                <Play size={20} className="fill-current" />
                <span className="font-black text-xs uppercase tracking-widest">Travel Vlogs</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {loadingRich ? (
                [1,2].map(i => <div key={i} className="aspect-video bg-zinc-900/50 animate-pulse rounded-[2.5rem]" />)
              ) : richData?.videoUrls?.map((url: string, i: number) => {
                const vidId = getYouTubeId(url);
                if (!vidId) return null;
                return (
                  <div key={i} className="aspect-video rounded-[2.5rem] overflow-hidden shadow-xl border-4 border-zinc-800 bg-black">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={`https://www.youtube.com/embed/${vidId}`} 
                      title="Travel Video" 
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Destination Reviews & Star Ratings (Firestore synced) */}
          <DestinationReviews
            destinationId={dest.id || dest.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}
            destinationName={dest.name}
            baseRating={dest.rating}
            openAuthModal={openAuthModal}
            onRatingUpdate={(avg, count) => {
              setCurrentRating(avg);
              setTotalReviews(count);
            }}
          />

          <PackingChecklist 
            destinationId={dest.id || dest.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')} 
            destinationName={dest.name} 
          />
        </div>
        
        <div className="space-y-8">
          <div className="bg-zinc-900 text-white p-10 rounded-[4rem] sticky top-28 shadow-2xl overflow-hidden border-4 border-zinc-800">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl -mr-16 -mt-16" />
            <Bot className="text-purple-400 mb-6 relative z-10" size={48} />
            <h3 className="text-3xl font-black mb-2 uppercase tracking-tighter italic relative z-10 leading-tight text-purple-200">Build My<br />Dream Trip</h3>
            
            {origin && (
              <div className="mb-8 relative z-10 bg-white/5 p-4 rounded-2xl border border-white/5">
                 <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Journey</p>
                 <p className="text-lg font-black uppercase italic leading-none">{origin.name} → {dest.name}</p>
                 
                 <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/5">
                    <div className="text-center">
                       <Calendar size={14} className="mx-auto mb-1 text-zinc-500" />
                       <p className="text-[8px] font-bold text-zinc-400 uppercase">{dest.duration} Days</p>
                    </div>
                    <div className="text-center border-x border-white/5">
                       <UsersIcon size={14} className="mx-auto mb-1 text-zinc-500" />
                       <p className="text-[8px] font-bold text-zinc-400 uppercase">2 People</p>
                    </div>
                    <div className="text-center">
                       <DollarSign size={14} className="mx-auto mb-1 text-zinc-500" />
                       <p className="text-[8px] font-bold text-zinc-400 uppercase">₹{dest.budget.toLocaleString()}</p>
                    </div>
                 </div>
              </div>
            )}

            <button 
              onClick={() => setActiveTab('planner')}
              className="w-full py-5 bg-white text-black rounded-[2rem] font-black text-xl hover:bg-zinc-100 transition-all shadow-xl relative z-10 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              <Sparkles size={24} className="text-purple-500" />
              Generate My Trip
            </button>
            
            <div className="mt-12 pt-8 border-t border-white/10 space-y-6 relative z-10">
              {['Transportation', 'Hotel', 'Food', 'Places', 'Activities'].map((item) => (
                <button key={item} className="flex items-center justify-between w-full text-white/40 hover:text-white transition-colors group">
                  <span className="font-black text-[10px] uppercase tracking-[0.2em]">{item}</span>
                  <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-purple-500/50" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 p-10 rounded-[4rem] border border-zinc-800">
            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Route Map</h3>
            <div className="h-64 w-full rounded-[2.5rem] overflow-hidden border-4 border-zinc-800 mb-6">
              <Map
                defaultCenter={{ lat: dest.lat, lng: dest.lng }}
                defaultZoom={origin ? 5 : 13}
                mapId="DEMO_MAP_ID"
                disableDefaultUI
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                <AdvancedMarker position={{ lat: dest.lat, lng: dest.lng }}>
                  <Pin background={'#10b981'} borderColor={'#065f46'} glyphColor={'#ecfdf5'} />
                </AdvancedMarker>
                {origin && (
                  <AdvancedMarker position={{ lat: origin.lat, lng: origin.lng }}>
                    <Pin background={'#3b82f6'} borderColor={'#1e40af'} glyphColor={'#eff6ff'} />
                  </AdvancedMarker>
                )}
                {route?.polyline?.encodedPolyline && (
                  <RoutePolyline encodedPath={route.polyline.encodedPolyline} />
                )}
              </Map>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.name + ' ' + dest.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white py-3 rounded-2xl text-[10px] font-black uppercase text-blue-600 text-center hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
              >
                Open Maps
              </a>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest.name + ' ' + dest.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 py-3 rounded-2xl text-[10px] font-black uppercase text-white text-center hover:bg-blue-700 transition-all shadow-md"
              >
                Directions
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PremiumScreen = ({ 
  isVip = false, 
  onOpenPremium,
  openAuthModal 
}: { 
  isVip?: boolean, 
  onOpenPremium?: () => void,
  openAuthModal?: (m?: 'login' | 'signup') => void 
}) => {
  return (
    <div className="pt-24 pb-12 px-6 max-w-5xl mx-auto text-white">
      {isVip ? (
        <div className="bg-gradient-to-br from-amber-500/10 via-zinc-900 to-amber-950/20 border-2 border-amber-500/40 rounded-[3rem] p-10 md:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[100px] pointer-events-none" />
          
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-yellow-300 text-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-amber-500/30">
            <Crown size={48} strokeWidth={2.5} />
          </div>

          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-widest mb-4">
            Active VIP Explorer
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 uppercase italic tracking-tight">
            You Are on the VIP Plan!
          </h1>
          <p className="text-zinc-400 text-base max-w-xl mx-auto mb-10">
            Your ₹49 monthly subscription is active. You have full access to unlimited multi-stop routing, partner cashbacks, live weather, and premium concierge.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left mb-10">
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <Sparkles className="text-amber-400 mb-2" size={20} />
              <p className="text-xs font-black text-white uppercase italic">Multi-Stop Circuits</p>
              <p className="text-[11px] text-zinc-400 mt-1">Unlimited custom stops with AI timing & distance</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <BadgePercent className="text-emerald-400 mb-2" size={20} />
              <p className="text-xs font-black text-white uppercase italic">Double Cashback</p>
              <p className="text-[11px] text-zinc-400 mt-1">Eligible partner bookings earn up to 15% back</p>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800">
              <ShieldCheck className="text-blue-400 mb-2" size={20} />
              <p className="text-xs font-black text-white uppercase italic">Ad-Free Experience</p>
              <p className="text-[11px] text-zinc-400 mt-1">Zero sponsored banners and 24/7 dedicated support</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-950/60 px-5 py-2.5 rounded-2xl border border-zinc-800">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Next billing cycle in 30 days · ₹49/month · Cancel anytime</span>
          </div>
        </div>
      ) : (
        <div>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
              <Crown size={14} /> VIP Explorer Pass
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-none mb-4">
              Unlock the World for <span className="text-amber-400">₹49</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              Smart route circuits, weather intelligence, exclusive partner cashbacks, and ad-free travel planning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: 'Multi-Stop Circuit AI',
                desc: 'Plan 2 to 5 city itineraries with automated driving and flight legs, distances, and day-by-day itineraries.',
                icon: Layers,
                tag: 'Exclusive'
              },
              {
                title: 'Official Partner Cashback',
                desc: 'Earn flat cashbacks and discounts on Booking.com, MakeMyTrip, Skyscanner, Uber, and Savaari.',
                icon: BadgePercent,
                tag: 'Earn ₹500+'
              },
              {
                title: 'Live Weather & Travel Radar',
                desc: 'Daily temperature and precipitation forecasts for any spot in India or worldwide.',
                icon: CloudSun,
                tag: 'Real-time'
              },
              {
                title: 'Smart Packing Checklist',
                desc: 'Save and manage cloud packing items customized per destination, stored securely in Firestore.',
                icon: CheckCircle2,
                tag: 'Cloud Synced'
              },
              {
                title: 'Zero Ads & Priority Support',
                desc: 'Distraction-free interface with guaranteed 1-hour concierge support response for any questions.',
                icon: ShieldCheck,
                tag: 'VIP'
              },
              {
                title: 'Compliant & Transparent',
                desc: 'Clear upfront ₹49/mo pricing, instant email invoice, and 100% money-back refund guarantee.',
                icon: Lock,
                tag: 'Risk Free'
              }
            ].map((feat, i) => (
              <div key={i} className="p-8 bg-zinc-900/80 border border-zinc-800 rounded-[2.5rem] flex flex-col justify-between hover:border-amber-500/40 transition-all group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-colors">
                      <feat.icon size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/80 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase italic mb-2 tracking-tight">{feat.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Box & Checkout trigger */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-900 border-2 border-amber-500/30 rounded-[3rem] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-black text-amber-400 italic">₹49</span>
                <span className="text-zinc-500 font-bold uppercase text-xs tracking-wider">/ month (incl. all taxes)</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium max-w-md">
                Transparent billing: Cancel anytime with 1 click in settings. 7-day no-questions-asked refund policy.
              </p>
            </div>

            <button
              onClick={() => onOpenPremium ? onOpenPremium() : alert('Please use upgrade modal')}
              className="w-full md:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black uppercase text-sm tracking-widest hover:brightness-110 transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 active:scale-95 cursor-pointer"
            >
              <Crown size={20} />
              <span>Upgrade Now for ₹49</span>
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> 256-Bit SSL Secured</span>
            <span className="flex items-center gap-1.5"><Lock size={14} className="text-blue-400" /> RBI E-Mandate Compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-purple-400" /> Instant VIP Activation</span>
          </div>
        </div>
      )}
    </div>
  );
};

const BookingsScreen = ({ 
  openAuthModal, 
  isVip 
}: { 
  openAuthModal?: (m?: 'login' | 'signup') => void,
  isVip?: boolean 
}) => {
  const { user, db } = useFirebase();
  const [activeTab, setActiveTab] = useState<'direct' | 'referrals'>('direct');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'bookings'), (snap) => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      console.warn('Bookings listener error:', error);
      setLoading(false);
    });
    return () => unsub();
  }, [user, db]);

  return (
    <div className="pt-24 pb-12 px-6 max-w-5xl mx-auto text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tight">My Bookings</h1>
          <p className="text-zinc-500 text-sm">Direct platform reservations and tracked partner cashback claims.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'direct' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            Direct Bookings ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${activeTab === 'referrals' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
          >
            <BadgePercent size={14} /> Partner Referrals & Cashback
          </button>
        </div>
      </div>

      {activeTab === 'direct' ? (
        <div>
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-8 h-8 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-20 text-center bg-zinc-900/50 border border-zinc-800 rounded-[3rem]">
              <Briefcase className="mx-auto text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 font-bold mb-1">No active direct bookings found.</p>
              <p className="text-xs text-zinc-600">Browse curated hotels or switch to Partner Referrals to track external bookings.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(b => (
                <div key={b.id} className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full mb-2 inline-block">
                      {b.type}
                    </span>
                    <h3 className="text-xl font-bold text-white">{b.details?.name || 'Reservation'}</h3>
                    <p className="text-sm text-zinc-500 mt-1">Order ID: {b.id.split('-')[0].toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">₹{b.amount}</p>
                    <p className="text-xs font-bold text-emerald-500">CONFIRMED</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <PartnerBookingsSection 
          initialCategory="all"
          openAuthModal={openAuthModal}
          isVip={isVip}
        />
      )}
    </div>
  );
};

const HelpScreen = () => {
  return (
    <div className="pt-24 pb-12 px-6 max-w-2xl mx-auto text-white">
      <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Help & Support</h1>
      <p className="text-zinc-500 mb-12">We're here to make your travel flow smoothly.</p>
      
      <div className="space-y-4">
        {[
          'How do I cancel my booking?',
          'What is the platform fee for?',
          'How do I use the AI Trip Planner?',
          'Can I book for a large group?',
          'Is my payment data secure?',
        ].map((q, i) => (
          <button key={i} className="w-full p-6 text-left bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between hover:border-blue-500/30 transition-colors group">
            <span className="font-bold text-zinc-400 group-hover:text-white">{q}</span>
            <ChevronRight size={18} className="text-zinc-700 group-hover:text-blue-500" />
          </button>
        ))}
      </div>
      
      <div className="mt-16 p-8 bg-blue-600 rounded-[2.5rem] text-white text-center shadow-xl shadow-blue-900/20">
        <Headphones size={32} className="mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Still need help?</h3>
        <p className="text-blue-100 text-sm mb-6">Our support team is available 24/7.</p>
        <button className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all">Contact Us</button>
      </div>
    </div>
  );
};

const SettingsScreen = ({ 
  setActiveTab, 
  openAuthModal, 
  isVip, 
  onOpenPremium 
}: { 
  setActiveTab: (tab: string) => void,
  openAuthModal?: (mode?: 'login' | 'signup') => void,
  isVip?: boolean,
  onOpenPremium?: () => void
}) => {
  return (
    <ProfileScreen 
      setActiveTab={setActiveTab} 
      openAuthModal={openAuthModal} 
      isVip={isVip} 
      onOpenPremium={onOpenPremium} 
    />
  );
};

const AdminDashboard = () => {
  const { user } = useFirebase();
  const isAdmin = user?.email === 'nakkasaishankar30@gmail.com';
  const [activeTab, setActiveTab] = useState<'revenue' | 'management' | 'partners'>('revenue');
  const [selectedMgmtSection, setSelectedMgmtSection] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-24 px-6 max-w-xl mx-auto text-center text-white">
        <div className="w-16 h-16 rounded-3xl bg-red-950/60 border border-red-800 text-red-400 flex items-center justify-center mx-auto mb-6">
          <Shield size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 font-serif">Restricted Administrator Area</h2>
        <p className="text-xs text-stone-400 mb-6 leading-relaxed">
          Only verified administrators ({'nakkasaishankar30@gmail.com'}) can access platform reports, partner attribution metrics, and ecosystem settings.
        </p>
      </div>
    );
  }

  const revenueStats = [
    { label: "Today's Revenue", value: '₹45,200', icon: DollarSign, color: 'bg-emerald-600' },
    { label: "Partner Referrals", value: '₹18,500', icon: BadgePercent, color: 'bg-blue-600' },
    { label: "Hotel Commissions", value: '₹12,400', icon: Briefcase, color: 'bg-indigo-600' },
    { label: "₹49 VIP Subs", value: '₹19,600', icon: Crown, color: 'bg-amber-600' },
    { label: "Cab Commissions", value: '₹3,100', icon: TrendingUp, color: 'bg-orange-600' },
    { label: "Ad Revenue", value: '₹6,500', icon: Store, color: 'bg-purple-600' },
  ];

  const partnerMetrics = [
    { name: 'Booking.com', clicks: 342, bookings: 28, rate: '8.2%', commission: '₹8,400', status: 'Active' },
    { name: 'MakeMyTrip', clicks: 512, bookings: 49, rate: '9.5%', commission: '₹12,250', status: 'Active' },
    { name: 'Skyscanner', clicks: 289, bookings: 19, rate: '6.6%', commission: '₹4,750', status: 'Active' },
    { name: 'Uber Intercity', clicks: 194, bookings: 31, rate: '15.9%', commission: '₹3,100', status: 'Active' },
    { name: 'Savaari Cabs', clicks: 118, bookings: 14, rate: '11.8%', commission: '₹3,500', status: 'Active' },
    { name: 'Agoda Worldwide', clicks: 167, bookings: 12, rate: '7.1%', commission: '₹3,600', status: 'Active' },
  ];

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Admin Console</h1>
          <p className="text-zinc-500 mt-2">Manage Travel Flow ecosystem, partner referrals, and VIP subscriptions.</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          {(['revenue', 'partners', 'management'] as const).map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-zinc-500 hover:text-white'}`}
            >
              {tab === 'partners' ? 'Partners & Referrals' : tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'revenue' && (
          <motion.div key="rev" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {revenueStats.map((stat, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-sm">
                <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${stat.color.split('-')[1]}-900/20`}>
                  <stat.icon size={24} />
                </div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-bold text-white tabular-nums">{stat.value}</h3>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'partners' && (
          <motion.div key="part" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white">Partner Referral Conversions</h3>
                  <p className="text-zinc-500 text-xs">Real-time click-to-booking affiliate performance across flight, hotel, and cab networks.</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full">
                  Live Attribution
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      <th className="pb-4">Partner</th>
                      <th className="pb-4">Referral Clicks</th>
                      <th className="pb-4">Eligible Bookings</th>
                      <th className="pb-4">Conversion</th>
                      <th className="pb-4">Commission Earned</th>
                      <th className="pb-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {partnerMetrics.map((p, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-4 font-bold text-white">{p.name}</td>
                        <td className="py-4 text-zinc-400 font-mono">{p.clicks}</td>
                        <td className="py-4 text-emerald-400 font-bold font-mono">{p.bookings}</td>
                        <td className="py-4 text-zinc-300 font-mono">{p.rate}</td>
                        <td className="py-4 text-white font-bold">{p.commission}</td>
                        <td className="py-4 text-right">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                <h4 className="font-bold text-white mb-2">₹49 VIP Explorer Subscriptions</h4>
                <p className="text-xs text-zinc-400 mb-4">400 active monthly subscribers generating recurring platform revenue.</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">400</span>
                  <span className="text-xs text-zinc-500">Active Subscribers (₹19,600 / mo)</span>
                </div>
              </div>

              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
                <h4 className="font-bold text-white mb-2">Cashback Claims Pending Review</h4>
                <p className="text-xs text-zinc-400 mb-4">User submitted PNRs and booking references awaiting verification.</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-400">7</span>
                  <span className="text-xs text-zinc-500">Pending Claims (Est. ₹1,250 cashback)</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'management' && (
          <motion.div key="mgmt" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Users', icon: UsersIcon },
              { label: 'Destinations', icon: Globe },
              { label: 'Hotels', icon: Briefcase },
              { label: 'Partners', icon: Handshake },
              { label: 'Bookings', icon: FileText },
              { label: 'Reviews', icon: Sparkles },
              { label: 'Business Listings', icon: Store },
              { label: 'System Config', icon: Settings }
            ].map((m, i) => (
              <button key={i} className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-blue-500/50 hover:bg-zinc-800 transition-all group">
                <div className="w-12 h-12 bg-zinc-800 text-zinc-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-zinc-700 group-hover:text-blue-400 group-hover:shadow-sm transition-all">
                  <m.icon size={24} />
                </div>
                <span className="text-sm font-bold text-zinc-400 group-hover:text-white">{m.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ... replace existing TripsScreen or after it
const Handshake = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17 2 2 6-6"/><path d="m18 19 2 2"/><path d="m5 10 3-3 5 5"/><path d="m17 3 3 3"/><path d="m3 21 3-3"/><path d="m7.3 13 4.4 4.4"/><path d="m11.2 9.2 4.4 4.4"/><circle cx="12" cy="12" r="10"/></svg>
);


// --- Main App ---

function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const isHome = activeTab === 'home';
  const [searchQuery, setSearchQuery] = useState('');
  const [aiFilters, setAiFilters] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedDest, setSelectedDest] = useState<any>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isVip, setIsVip] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const { user, db, loading } = useFirebase();

  // Listen to active subscriptions for VIP status
  useEffect(() => {
    if (!user) {
      setIsVip(false);
      return;
    }
    const subQuery = query(
      collection(db, 'users', user.uid, 'subscriptions'),
      where('status', '==', 'active')
    );
    const unsub = onSnapshot(subQuery, (snap) => {
      setIsVip(!snap.empty);
    }, (err) => {
      console.error('Subscription error:', err);
    });
    return () => unsub();
  }, [user, db]);

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setAiFilters(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold tracking-tighter text-white mb-4 italic uppercase"
        >
          Travel Flow
        </motion.div>
        <motion.div 
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="w-32 h-1 bg-blue-600 rounded-full overflow-hidden"
        />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'login':
      case 'auth':
        return (
          <TravelAuthModal 
            isOpen={true} 
            onClose={() => setActiveTab('home')} 
            defaultMode="login" 
            asPage={true} 
            onSuccess={() => setActiveTab('home')} 
          />
        );
      case 'signup':
        return (
          <TravelAuthModal 
            isOpen={true} 
            onClose={() => setActiveTab('home')} 
            defaultMode="signup" 
            asPage={true} 
            onSuccess={() => setActiveTab('home')} 
          />
        );
      case 'home':
        return (
          <HomeScreen 
            setActiveTab={setActiveTab} 
            setSelectedDest={setSelectedDest} 
            origin={origin} 
            setOrigin={setOrigin} 
            setAiFilters={setAiFilters}
            setSearchQueryGlobal={setSearchQuery}
          />
        );
      case 'map':
        return <MapScreen onBack={() => setActiveTab('home')} setSelectedDest={setSelectedDest} setActiveTab={setActiveTab} />;
      case 'dest-detail':
        return selectedDest ? (
          <DestinationDetails 
            dest={selectedDest} 
            onBack={() => setActiveTab('home')} 
            setActiveTab={setActiveTab}
            origin={origin}
            openAuthModal={openAuthModal}
          />
        ) : (
          <HomeScreen 
            setActiveTab={setActiveTab} 
            setSelectedDest={setSelectedDest} 
            origin={origin} 
            setOrigin={setOrigin} 
            setAiFilters={setAiFilters}
            setSearchQueryGlobal={setSearchQuery}
          />
        );
      case 'explore':
        return (
          <ExploreScreen 
            searchQuery={searchQuery} 
            aiFilters={aiFilters}
            onClearSearch={clearSearch} 
            setActiveTab={setActiveTab}
            setSelectedDest={setSelectedDest}
            openAuthModal={openAuthModal}
            origin={origin}
          />
        );
      case 'hotels':
        return <HotelsScreen onBook={setSelectedItem} openAuthModal={openAuthModal} isVip={isVip} />;
      case 'flights':
        return <FlightsScreen openAuthModal={openAuthModal} isVip={isVip} />;
      case 'cabs':
        return <CabsScreen openAuthModal={openAuthModal} isVip={isVip} />;
      case 'activities':
        return <ActivitiesScreen onBook={setSelectedItem} />;
      case 'planner':
        return (
          <PlannerScreen 
            aiFilters={aiFilters} 
            openAuthModal={openAuthModal} 
            origin={origin}
            setOrigin={setOrigin}
            isVip={isVip}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            initialMode="single"
          />
        );
      case 'multistop':
        return (
          <PlannerScreen 
            aiFilters={aiFilters} 
            openAuthModal={openAuthModal} 
            origin={origin}
            setOrigin={setOrigin}
            isVip={isVip}
            onOpenPremium={() => setIsPremiumModalOpen(true)}
            initialMode="multistop"
          />
        );
      case 'search':
        return (
          <SearchScreen 
            destinations={DESTINATIONS} 
            origin={origin} 
            setOrigin={setOrigin} 
            setSelectedDest={setSelectedDest} 
            setActiveTab={setActiveTab} 
            openAuthModal={openAuthModal} 
            setAiFilters={setAiFilters} 
          />
        );
      case 'saved':
        return (
          <SavedScreen 
            origin={origin} 
            setSelectedDest={setSelectedDest} 
            setActiveTab={setActiveTab} 
            openAuthModal={openAuthModal} 
            allDestinations={DESTINATIONS} 
          />
        );
      case 'trips':
        return (
          <TripsScreen 
            setActiveTab={setActiveTab} 
            openAuthModal={openAuthModal} 
            setSelectedDest={setSelectedDest} 
          />
        );
      case 'bookings':
        return <BookingsScreen openAuthModal={openAuthModal} isVip={isVip} />;
      case 'premium':
        return (
          <PremiumScreen 
            isVip={isVip} 
            onOpenPremium={() => setIsPremiumModalOpen(true)} 
            openAuthModal={openAuthModal} 
          />
        );
      case 'help':
        return <HelpScreen />;
      case 'profile':
        return (
          <ProfileScreen 
            setActiveTab={setActiveTab} 
            openAuthModal={openAuthModal} 
            isVip={isVip} 
            onOpenPremium={() => setIsPremiumModalOpen(true)} 
          />
        );
      case 'admin':
        return <AdminDashboard />;
      default:
        return (
          <HomeScreen 
            setActiveTab={setActiveTab} 
            setSelectedDest={setSelectedDest} 
            origin={origin} 
            setOrigin={setOrigin} 
            setAiFilters={setAiFilters}
            setSearchQueryGlobal={setSearchQuery}
          />
        );
    }
  };

  return (
    <APIProvider 
      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyBC8puq_AAmuk3oijIYS0f7yRgQei-H04U"}
      libraries={['geometry', 'places']}
    >
      <div className="min-h-screen transition-colors duration-500 bg-[#060e0a] text-stone-200 selection:bg-emerald-500/30">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          openAuthModal={openAuthModal} 
          isVip={isVip}
          onOpenPremium={() => setIsPremiumModalOpen(true)}
          origin={origin}
          onOpenOrigin={() => setActiveTab('search')}
        />
        
        <main className="pb-28">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {selectedItem && (
          <CheckoutModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        )}

        <TravelAuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          defaultMode={authModalMode} 
          onSuccess={() => setAuthModalOpen(false)} 
        />

        <PremiumModal 
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)}
          onSuccess={() => {
            setIsVip(true);
            setIsPremiumModalOpen(false);
          }}
          openAuthModal={openAuthModal}
        />

        <footer className="border-t py-12 px-6 hidden md:block transition-colors duration-500 bg-[#040e08] border-emerald-950/80">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-900/40">
                <Compass size={18} />
              </div>
              <div>
                <span className="text-xl font-black italic tracking-tighter uppercase text-white">TravelFlow</span>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Peaceful Sanctuaries & Routes</p>
              </div>
            </div>
            <div className="flex gap-8 text-xs font-semibold text-stone-400">
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('explore'); }} className="hover:text-emerald-300 transition-colors">Explore</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('search'); }} className="hover:text-emerald-300 transition-colors">Search</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('trips'); }} className="hover:text-emerald-300 transition-colors">My Trips</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('saved'); }} className="hover:text-emerald-300 transition-colors">Saved</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('planner'); }} className="hover:text-emerald-300 transition-colors">AI Planner</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('premium'); }} className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-bold">
                <Crown size={13} /> ₹49 VIP
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); openAuthModal('login'); }} className="hover:text-white transition-colors">Traveler Login</a>
            </div>
            <div className="text-xs font-medium text-stone-500">© 2026 TravelFlow. Hand-crafted nature journeys worldwide.</div>
          </div>
        </footer>

        {/* 5 Main Tabs Mobile Navigation (Android & iPhone optimized with 48px touch targets & safe area padding) */}
        <nav 
          aria-label="Main Navigation"
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden backdrop-blur-2xl border-t px-2 py-2 flex justify-around items-center transition-colors duration-300 bg-[#06120c]/95 border-emerald-950/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] pb-safe"
        >
          {[
            { id: 'explore', label: 'Explore', icon: Compass },
            { id: 'search', label: 'Search', icon: Search },
            { id: 'trips', label: 'My Trips', icon: Calendar },
            { id: 'saved', label: 'Saved', icon: Heart },
            { id: 'profile', label: 'Profile', icon: User },
          ].map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'explore' && activeTab === 'home');
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all cursor-pointer min-h-[48px] ${
                  isActive
                    ? 'text-emerald-300 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-900/60 text-emerald-300 shadow-md shadow-emerald-950/80 scale-105' 
                    : 'text-stone-400'
                }`}>
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${
                  isActive ? 'text-emerald-300 font-bold' : 'text-stone-400 font-medium'
                }`}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shadow-sm shadow-emerald-400/50" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </APIProvider>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}
