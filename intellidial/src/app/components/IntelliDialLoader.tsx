"use client";

import { useEffect, useRef } from "react";

/**
 * IntelliDial Loading Component
 * Animated text loader matching exact brand colors: dark blue-gray "Intelli" + teal "dial"
 * Left-to-right fill animation with transparent base and border
 */
export function IntelliDialLoader({ className = "", size = "lg", fullScreen = false }: { className?: string; size?: "sm" | "md" | "lg"; fullScreen?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Exact colors from brand image (screenshot):
  // "Intelli" = navy (#2E3742 from screenshot, or use standard navy)
  // "dial" = teal (#1AABA1 from screenshot)
  const intelliColor = "#2E3742"; // Navy (from screenshot)
  const dialColor = "#1AABA1"; // Teal (from screenshot)

  const fontSize = size === 'sm' ? '1.25rem' : size === 'md' ? '1.5rem' : '1.875rem';

  // For full-screen loaders - RAW DOM WITH FORCE CENTERING
  useEffect(() => {
    if (!fullScreen || typeof window === 'undefined') return;

    // Remove any existing loader first
    const existing = document.getElementById('intellidial-loader-raw');
    if (existing) existing.remove();

    // Create container using raw DOM
    const container = document.createElement('div');
    container.id = 'intellidial-loader-raw';
    
    // Create inner wrapper
    const wrapper = document.createElement('div');
    wrapper.id = 'intellidial-loader-wrapper';

    // Create base text (invisible)
    const baseText = document.createElement('span');
    baseText.textContent = 'Intellidial';
    baseText.id = 'intellidial-loader-base';

    // Create animated fill text
    const fillText = document.createElement('span');
    fillText.textContent = 'Intellidial';
    fillText.className = 'intellidial-fill-animation';
    fillText.id = 'intellidial-loader-fill';

    wrapper.appendChild(baseText);
    wrapper.appendChild(fillText);
    container.appendChild(wrapper);
    document.body.appendChild(container);
    containerRef.current = container;

    // Inject global CSS with maximum specificity
    const styleId = 'intellidial-loader-force-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #intellidial-loader-raw {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background-color: white !important;
          z-index: 2147483647 !important;
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        #intellidial-loader-wrapper {
          position: relative !important;
          display: inline-block !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #intellidial-loader-base {
          font-family: Space Grotesk, Inter, system-ui, sans-serif !important;
          font-size: ${fontSize} !important;
          font-weight: 700 !important;
          letter-spacing: -0.025em !important;
          position: relative !important;
          display: inline-block !important;
          opacity: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #intellidial-loader-fill {
          font-family: Space Grotesk, Inter, system-ui, sans-serif !important;
          font-size: ${fontSize} !important;
          font-weight: 700 !important;
          letter-spacing: -0.025em !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          display: inline-block !important;
          background: linear-gradient(to right, ${intelliColor} 0%, ${intelliColor} 55%, ${dialColor} 55%, ${dialColor} 100%) !important;
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          background-size: 100% 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Force center using requestAnimationFrame - recalculate every frame
    const forceCenter = () => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Use setProperty with important flag - this actually works
      container.style.setProperty('position', 'fixed', 'important');
      container.style.setProperty('top', '0px', 'important');
      container.style.setProperty('left', '0px', 'important');
      container.style.setProperty('right', '0px', 'important');
      container.style.setProperty('bottom', '0px', 'important');
      container.style.setProperty('width', `${vw}px`, 'important');
      container.style.setProperty('height', `${vh}px`, 'important');
      container.style.setProperty('display', 'flex', 'important');
      container.style.setProperty('align-items', 'center', 'important');
      container.style.setProperty('justify-content', 'center', 'important');
      container.style.setProperty('z-index', '2147483647', 'important');
      container.style.setProperty('background-color', 'white', 'important');
      container.style.setProperty('margin', '0px', 'important');
      container.style.setProperty('padding', '0px', 'important');
      
      // ALSO manually position wrapper using exact pixel calculations as backup
      const wrapper = document.getElementById('intellidial-loader-wrapper');
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const centerX = vw / 2;
        const centerY = vh / 2;
        const wrapperWidth = rect.width || 200;
        const wrapperHeight = rect.height || 50;
        wrapper.style.setProperty('position', 'absolute', 'important');
        wrapper.style.setProperty('left', `${centerX - wrapperWidth / 2}px`, 'important');
        wrapper.style.setProperty('top', `${centerY - wrapperHeight / 2}px`, 'important');
        wrapper.style.setProperty('transform', 'none', 'important');
      }
      
      animationFrameRef.current = requestAnimationFrame(forceCenter);
    };

    // Start immediately and keep running
    forceCenter();
    const resizeHandler = () => forceCenter();
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('scroll', forceCenter);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', forceCenter);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current);
      }
    };
  }, [fullScreen, fontSize, intelliColor, dialColor]);

  // For inline loaders
  if (!fullScreen) {
    return (
      <div className={`flex items-center justify-center w-full ${className}`}>
        <div className="relative inline-block">
          <span
            className={`text-${size === 'sm' ? 'xl' : size === 'md' ? '2xl' : '3xl'} font-display font-bold tracking-tight relative inline-block opacity-0`}
          >
            Intellidial
          </span>
          <span
            className={`text-${size === 'sm' ? 'xl' : size === 'md' ? '2xl' : '3xl'} font-display font-bold tracking-tight absolute top-0 left-0 intellidial-fill-animation inline-block`}
            style={{
              background: `linear-gradient(to right, ${intelliColor} 0%, ${intelliColor} 55%, ${dialColor} 55%, ${dialColor} 100%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              WebkitTextStroke: "0px transparent",
              backgroundSize: "100% 100%",
            }}
          >
            Intellidial
          </span>
        </div>
      </div>
    );
  }

  // Full screen - rendered via raw DOM, return null
  return null;
}
