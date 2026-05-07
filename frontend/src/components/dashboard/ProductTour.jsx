import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '@radix-ui/react-portal';
import { useTour } from '@/context/TourContext';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronLeft, X, Sparkles, HelpCircle } from 'lucide-react';

export default function ProductTour() {
  const { isActive, currentStep, steps, nextStep, prevStep, endTour } = useTour();
  const [coords, setCoords] = useState(null);
  const step = steps[currentStep];

  // Update coordinates when step or window size changes
  useEffect(() => {
    if (!isActive) {
      setCoords(null);
      return;
    }

    // Update coordinates when step changes
    const updateCoords = () => {
      if (step.id === 'tour-welcome' || step.id === 'tour-finish') {
        setCoords(prev => (prev?.isCenter ? prev : { isCenter: true }));
        return;
      }

      // Small delay for layout stabilization
      setTimeout(() => {
        // Responsive targeting for navigation items
        const isMobile = window.innerWidth < 1024;
        let element = null;

        if (step.id.startsWith('tour-nav-')) {
          element = isMobile
            ? document.getElementById(`${step.id}-mobile`)
            : document.getElementById(`${step.id}-desktop`);
        }

        if (!element) {
          element = document.getElementById(step.id);
        }

        if (element) {
          const rect = element.getBoundingClientRect();
          // Ensure we have valid numbers before setting state
          if (rect.width > 0 || rect.height > 0) {
            setCoords({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              isCenter: false
            });
          }
        } else {
          setCoords(null);
        }
      }, 50);
    };

    // Trigger initial scroll and coordinate update
    const initTourStep = () => {
      const isMobile = window.innerWidth < 1024;
      let targetElement = null;

      if (step.id.startsWith('tour-nav-')) {
        targetElement = isMobile
          ? document.getElementById(`${step.id}-mobile`)
          : document.getElementById(`${step.id}-desktop`);
      }

      if (!targetElement) {
        targetElement = document.getElementById(step.id);
      }

      if (targetElement && step.id !== 'tour-welcome' && step.id !== 'tour-finish') {
        // Set scroll margin to account for sticky header/filters on mobile
        if (isMobile) {
          targetElement.style.scrollMarginTop = '140px';
        }

        // Detect if element is tall (likely a list or large chart)
        const isTall = targetElement.offsetHeight > window.innerHeight * 0.6;

        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: isTall ? 'start' : 'center'
        });
      }
      // Delay to let scroll finish before final coord check
      setTimeout(updateCoords, 500);
      updateCoords();
    };

    initTourStep();

    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true); // Capture phase for better tracking

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [isActive, currentStep, step.id]);

  if (!isActive) return null;

  return (
    <Portal className="fixed inset-0 z-[9999] pointer-events-none">
      {/* ── Spotlight Mask Overlay ── */}
      <AnimatePresence>
        {coords && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-auto"
          >
            <svg className="w-full h-full">
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {!coords.isCenter && typeof coords.width === 'number' && (
                    <motion.rect
                      initial={{
                        x: coords.left - 20,
                        y: coords.top - 20,
                        width: coords.width + 40,
                        height: coords.height + 40,
                        rx: 24
                      }}
                      animate={{
                        x: coords.left - 20,
                        y: coords.top - 20,
                        width: coords.width + 40,
                        height: coords.height + 40,
                        rx: 24
                      }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0" y="0"
                width="100%" height="100%"
                fill={coords.isCenter ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0.7)"}
                mask="url(#spotlight-mask)"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tooltip Bubble ── */}
      <AnimatePresence mode="wait">
        {coords && (
          <motion.div
            key={currentStep}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              ...(coords.isCenter || (window.innerWidth < 1024 && step.id.startsWith('tour-nav-')) ? {
                top: '50%',
                left: '50%',
                x: '-50%',
                y: '-50%',
                position: 'fixed'
              } : {
                bottom: '2rem',
                left: '50%',
                x: '-50%',
                position: 'fixed'
              })
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className={cn(
              "w-[90%] max-w-[440px] bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-2xl pointer-events-auto",
              "ring-1 ring-black/5"
            )}
          >
            {/* Header with Yui Icon */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <HelpCircle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-[0.6rem] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">Yui Assistant</h4>
                <h3 className="text-[0.95rem] font-black text-slate-900 leading-tight">{step.title}</h3>
              </div>
              <button
                onClick={endTour}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <p className="text-[0.8rem] font-medium text-slate-600 leading-relaxed mb-5">
              {step.content}
            </p>

            {/* Footer / Nav */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-50">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      i === currentStep ? "w-5 bg-emerald-500" : "w-1.5 bg-slate-200"
                    )}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <button
                    onClick={prevStep}
                    className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                <button
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 h-10 rounded-2xl text-[0.7rem] font-black hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95"
                >
                  {currentStep === steps.length - 1 ? 'SELESAI' : 'LANJUT'}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
