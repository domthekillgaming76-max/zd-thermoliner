import {
  LayoutDashboard, Users, Building2, Truck, Banknote, Route, BarChart3, Settings, Wrench,
  FileBarChart, MessageSquare, Briefcase, FileText, Shield, Radio,
  Receipt, Bot, Smartphone, Archive, Map, Container, GraduationCap, Calculator, User,
  Bell, Calendar, HelpCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  Banknote,
  Route,
  BarChart3,
  Settings,
  Wrench,
  FileBarChart,
  MessageSquare,
  Briefcase,
  FileText,
  Shield,
  Radio,
  Receipt,
  Bot,
  Smartphone,
  Archive,
  Map,
  Container,
  GraduationCap,
  Calculator,
  User,
  Bell,
  Calendar,
  HelpCircle,
};

export const MODULE_ICON_OPTIONS = Object.keys(ICON_MAP);

export function resolveModuleIcon(name: string | null | undefined): LucideIcon {
  if (!name) return HelpCircle;
  return ICON_MAP[name] ?? HelpCircle;
}
