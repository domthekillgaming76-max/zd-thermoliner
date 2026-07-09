import {
  LayoutDashboard, Users, Truck, Route, BarChart3, Settings, Wrench,
  MessageSquare, Briefcase, FileText, Shield, Receipt, Bot, Smartphone,
  GraduationCap, Calculator, User, Bell, Calendar, HelpCircle, Package,
  ClipboardList, MapPin, Map, Warehouse, TrendingUp, Landmark, Wallet, PieChart, Plug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Truck,
  Route,
  BarChart3,
  Settings,
  Wrench,
  MessageSquare,
  Briefcase,
  FileText,
  Shield,
  Receipt,
  Bot,
  Smartphone,
  GraduationCap,
  Calculator,
  User,
  Bell,
  Calendar,
  HelpCircle,
  Package,
  ClipboardList,
  MapPin,
  Map,
  Warehouse,
  TrendingUp,
  Landmark,
  Wallet,
  PieChart,
  Plug,
  // Legacy aliases
  Building2: Warehouse,
  Banknote: Landmark,
  Container: Package,
  Radio: Route,
  Archive: Shield,
  FileBarChart: BarChart3,
};

export const MODULE_ICON_OPTIONS = Object.keys(ICON_MAP).filter(
  k => !['Building2', 'Banknote', 'Container', 'Radio', 'Archive', 'FileBarChart'].includes(k),
);

export function resolveModuleIcon(name: string | null | undefined): LucideIcon {
  if (!name) return HelpCircle;
  return ICON_MAP[name] ?? HelpCircle;
}
