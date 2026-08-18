import React from 'react';
import { Bug, Activity, Map, AlertTriangle, Shield, Settings, LogOut, ChevronRight, Download, Eye, EyeOff, Search } from 'lucide-react';

const icons = {
  vector: Bug, // Placeholder for Mosquito/Vector icon
  activity: Activity,
  map: Map,
  alert: AlertTriangle,
  shield: Shield,
  settings: Settings,
  logout: LogOut,
  chevronRight: ChevronRight,
  download: Download,
  eye: Eye,
  eyeOff: EyeOff,
  search: Search
};

export default function Icon({ name, size = 24, color = 'currentColor', className = '' }) {
  const LucideIcon = icons[name] || Activity;
  return <LucideIcon size={size} color={color} className={className} />;
}
