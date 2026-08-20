import React from 'react';
import { 
  Bug, Activity, Map, AlertTriangle, Shield, Settings, LogOut, ChevronRight, 
  Download, Eye, EyeOff, Search, AlertCircle, AlertOctagon, HelpCircle, 
  Sun, Cloud, CloudFog, Snowflake, CloudRain, CloudDrizzle, CloudLightning, 
  Thermometer, Droplet, Wind, MapPin, Check, CheckCircle, Info, ChevronDown, ChevronUp, Bell,
  Clock, ShieldCheck, Users, SearchX, ChevronLeft, Trash2, X
} from 'lucide-react';

const icons = {
  vector: Bug,
  activity: Activity,
  map: Map,
  alert: AlertTriangle,
  'alert-triangle': AlertTriangle,
  shield: Shield,
  settings: Settings,
  logout: LogOut,
  chevronRight: ChevronRight,
  download: Download,
  eye: Eye,
  eyeOff: EyeOff,
  search: Search,
  'alert-circle': AlertCircle,
  'alert-octagon': AlertOctagon,
  'help-circle': HelpCircle,
  sun: Sun,
  cloud: Cloud,
  'cloud-fog': CloudFog,
  snowflake: Snowflake,
  'cloud-rain': CloudRain,
  'cloud-drizzle': CloudDrizzle,
  'cloud-lightning': CloudLightning,
  thermometer: Thermometer,
  droplet: Droplet,
  wind: Wind,
  'map-pin': MapPin,
  check: Check,
  'check-circle': CheckCircle,
  info: Info,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  bell: Bell,
  clock: Clock,
  'shield-check': ShieldCheck,
  users: Users,
  'search-x': SearchX,
  'chevron-left': ChevronLeft,
  'trash-2': Trash2,
  x: X
};

export default function Icon({ name, size = 24, color = 'currentColor', className = '' }) {
  const LucideIcon = icons[name] || Activity;
  return <LucideIcon size={size} color={color} className={className} />;
}
