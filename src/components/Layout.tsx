import { useState } from 'react';
import {
  LayoutDashboard,
  FolderSearch,
  Network,
  MapPin,
  Brain,
  Bell,
  BarChart3,
  FileText,
  Play,
  Shield,
  LogOut,
  Menu,
  X,
  Activity,
  ScrollText,
} from 'lucide-react';
import type { Officer } from '@/types';
import { useAccess } from '@/context/AccessContext';
import type { Permission } from '@/services/access';

export type ViewName =
  | 'dashboard'
  | 'cases'
  | 'money-trail'
  | 'predictions'
  | 'map'
  | 'xai'
  | 'alerts'
  | 'analytics'
  | 'reports'
  | 'audit';

interface LayoutProps {
  officer: Officer;
  currentView: ViewName;
  onNavigate: (view: ViewName) => void;
  onLogout: () => void;
  onRunDemo: () => void;
  alertCount: number;
  children: React.ReactNode;
}

const navItems: { view: ViewName; label: string; icon: React.ComponentType<{ className?: string }>; permission?: Permission }[] = [
  { view: 'dashboard', label: 'Command Dashboard', icon: LayoutDashboard },
  { view: 'cases', label: 'Case Investigation', icon: FolderSearch },
  { view: 'money-trail', label: 'Money Trail Graph', icon: Network },
  { view: 'predictions', label: 'Cash-Out Prediction', icon: Activity },
  { view: 'map', label: 'GIS Map', icon: MapPin },
  { view: 'xai', label: 'Explainable AI', icon: Brain },
  { view: 'alerts', label: 'Alerts', icon: Bell },
  { view: 'analytics', label: 'Analytics', icon: BarChart3 },
  { view: 'reports', label: 'Reports', icon: FileText },
  { view: 'audit', label: 'Audit Log', icon: ScrollText, permission: 'audit.view' },
];

export default function Layout({
  officer,
  currentView,
  onNavigate,
  onLogout,
  onRunDemo,
  alertCount,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { can } = useAccess();
  const visibleNav = navItems.filter((n) => !n.permission || can(n.permission));

  const currentLabel = navItems.find((n) => n.view === currentView)?.label ?? '';

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar */}
      <aside
        className={`print:hidden fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-navy-900 border-r border-navy-700 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-navy-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-800/50 flex items-center justify-center glow-cyan">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">CYBERTRACE AI</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">SIH26184</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-500 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.view;
            return (
              <button
                key={item.view}
                onClick={() => {
                  onNavigate(item.view);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? 'bg-gradient-to-r from-cyan-900/30 to-blue-900/20 text-cyan-300 border border-cyan-800/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.view === 'alerts' && alertCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Demo button */}
        <div className="px-3 py-3 border-t border-navy-700">
          <button
            onClick={onRunDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            Run Demo Case
          </button>
        </div>

        {/* Officer info */}
        <div className="px-3 py-3 border-t border-navy-700">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center text-cyan-400 font-bold text-sm">
              {officer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{officer.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{officer.rank} · {officer.badge} · <span className="capitalize">{officer.role}</span></p>
            </div>
            <button onClick={onLogout} aria-label="Sign out" title="Sign out" className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="print:hidden sticky top-0 z-30 bg-navy-900/90 backdrop-blur-md border-b border-navy-700 px-4 lg:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">{currentLabel}</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{officer.unit}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-500 pulse-dot" />
            <span className="font-mono">SYSTEM ONLINE</span>
          </div>
          <div className="hidden sm:block text-xs text-slate-500 font-mono">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 print:overflow-visible print:p-0">{children}</main>
      </div>
    </div>
  );
}
