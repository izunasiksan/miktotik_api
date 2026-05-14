import React, { useState, useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import Breadcrumbs from '../ui/Breadcrumbs.jsx';
import { ChevronDown } from 'lucide-react';

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const tickingRef = useRef(false);
  const mainRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Auto-hide header on scroll with hysteresis to prevent jitter
  useEffect(() => {
    const scrollContainer = mainRef.current;
    if (!scrollContainer) return;
    const THRESHOLD_START = 100;   // start hiding after 100px
    const DELTA_TOLERANCE = 6;     // minimal movement to trigger state change

    const onScroll = () => {
      const run = () => {
        const current = scrollContainer.scrollTop;
        const last = lastScrollTopRef.current;
        const delta = current - last;

        if (current < THRESHOLD_START) {
          if (!isHeaderVisible) setIsHeaderVisible(true);
        } else {
          if (delta > DELTA_TOLERANCE) {
            if (isHeaderVisible) setIsHeaderVisible(false);
          } else if (delta < -DELTA_TOLERANCE) {
            if (!isHeaderVisible) setIsHeaderVisible(true);
          }
        }
        lastScrollTopRef.current = current <= 0 ? 0 : current;
        tickingRef.current = false;
      };

      if (!tickingRef.current) {
        tickingRef.current = true;
        window.requestAnimationFrame(run);
      }
    };

    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', onScroll);
  }, [isHeaderVisible]);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      
      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        <Navbar 
          toggleSidebar={toggleSidebar} 
          isVisible={isHeaderVisible}
          setIsVisible={setIsHeaderVisible}
        />
        
        {/* Floating Show Header Button */}
        {!isHeaderVisible && (
          <button
            onClick={() => setIsHeaderVisible(true)}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-30 bg-white/90 backdrop-blur-md border border-slate-200 border-t-0 rounded-b-xl px-4 py-1 shadow-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-all animate-in slide-in-from-top-full duration-300 group"
            title="Show Header"
          >
            <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
          </button>
        )}
        
        {/* Scrollable Area */}
        <main 
          ref={mainRef}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto max-w-7xl">
            <Breadcrumbs />
            <div className="mt-4">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
