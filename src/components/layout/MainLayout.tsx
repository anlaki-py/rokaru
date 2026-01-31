import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music, History, Settings, Keyboard, Shield, Menu, X, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
  status: string;
}

export const MainLayout = ({ children, showLogs, setShowLogs, status }: MainLayoutProps) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: Music, label: 'Converter', path: '/' },
  ];

  return (
    <div className="h-[100dvh] w-full bg-background text-primary font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* --- Mobile Floating Menu Button --- */}
      <div className="md:hidden fixed top-6 left-6 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-4 bg-surface/50 backdrop-blur-xl border border-white/10 text-primary rounded-2xl shadow-2xl active:scale-95 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="md:hidden fixed top-6 right-6 z-50">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className={cn(
            "p-4 backdrop-blur-xl border rounded-2xl shadow-2xl active:scale-95 transition-all",
            showLogs 
              ? "bg-primary text-background border-transparent" 
              : "bg-surface/50 text-primary border-white/10"
          )}
        >
          <Terminal className="w-6 h-6" />
        </button>
      </div>

      {/* --- Mobile Sidebar Overlay --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 z-[60] md:hidden backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#0c0c0e] border-r border-border z-[70] md:hidden flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                 <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">rōkaru</span>
                 <button 
                   onClick={() => setIsMobileMenuOpen(false)}
                   className="p-2 -mr-2 text-secondary hover:text-primary"
                 >
                   <X className="w-5 h-5" />
                 </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                      location.pathname === item.path
                        ? "bg-primary text-background font-semibold"
                        : "text-secondary hover:text-primary hover:bg-surface-highlight/30"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setShowLogs(!showLogs);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    showLogs
                      ? "bg-surface-highlight text-primary"
                      : "text-secondary hover:text-primary hover:bg-surface-highlight/30"
                  )}
                >
                  <Terminal className="w-5 h-5" />
                  <span>{showLogs ? 'Hide Logs' : 'View Logs'}</span>
                </button>
              </nav>

              <div className="mt-auto pt-6 border-t border-white/5">
                <Link
                  to="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                    location.pathname === '/settings'
                      ? "bg-primary text-background font-semibold"
                      : "text-secondary hover:text-primary hover:bg-surface-highlight/30"
                  )}
                >
                  <Settings className="w-5 h-5" />
                  <span>Settings</span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- Desktop Sidebar --- */}
      <aside className="hidden md:flex w-64 border-r border-border bg-surface/30 backdrop-blur-xl flex-col shrink-0 z-40">
        <div className="p-6">
          <span className="text-xl font-bold font-display tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            rōkaru
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                location.pathname === item.path
                  ? "bg-primary text-background shadow-lg shadow-white/5"
                  : "text-secondary hover:text-primary hover:bg-surface-highlight/50"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
              showLogs
                ? "bg-surface-highlight text-primary shadow-lg shadow-white/5"
                : "text-secondary hover:text-primary hover:bg-surface-highlight/50"
            )}
          >
            <Terminal className="w-5 h-5 shrink-0" />
            <span className="font-medium">{showLogs ? 'Hide Logs' : 'Show Logs'}</span>
          </button>
        </nav>

        <div className="p-4 mt-auto space-y-4">
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 bg-surface-highlight/20 p-2 rounded-lg border border-white/5">
            <Keyboard className="w-3 h-3" />
            <span>CMD+J for Logs</span>
          </div>

          <div className="flex flex-col gap-2">
            <Link
              to="/settings"
              className={cn(
                "w-full py-2 rounded-xl text-xs font-medium transition-all duration-200 border flex items-center justify-center gap-2",
                location.pathname === '/settings'
                  ? "bg-primary text-background border-transparent"
                  : "bg-transparent text-secondary border-border hover:border-secondary"
              )}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full">
        {/* Background Ambience */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-surface-highlight/10 rounded-full blur-[100px] opacity-30" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-surface-highlight/5 rounded-full blur-[100px] opacity-20" />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto pt-24 md:pt-0">
          {children}
          
          {/* Privacy Footer */}
          <div className="shrink-0 mt-auto p-6 text-center z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-highlight/20 border border-white/5 text-[10px] text-zinc-500 font-medium select-none">
              <Shield className="w-3 h-3" />
              <span>Files processed locally. No data leaves your device.</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};