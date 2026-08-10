import React from 'react';
import { IconCloud } from './ui/interactive-icon-cloud';

interface CyberLoaderProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  title?: string;
  subtitle?: string;
  iconSlugs?: string[];
}

export const CyberLoader: React.FC<CyberLoaderProps> = React.memo(({
  fullScreen = false,
  size = 'lg',
  title = 'INITIALIZING SYSTEM ENGINE...',
  subtitle = 'Scanning microservices & neural agents',
  iconSlugs
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-[9999] bg-[#030508]/80 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-white transition-all duration-300'
    : 'flex flex-col items-center justify-center p-6 w-full text-white select-none';

  const cloudSizeMap = {
    sm: 'w-44 h-44',
    md: 'w-60 h-60',
    lg: 'w-80 h-80',
    xl: 'w-[420px] h-[420px]'
  };

  return (
    <div className={containerClasses}>
      {/* 3D Interactive Tech Icon Cloud Sphere */}
      <div className={`relative ${cloudSizeMap[size]} flex items-center justify-center overflow-hidden`}>
        <IconCloud iconSlugs={iconSlugs} />
      </div>

      {/* Cyber Soundwave Spectrum Equalizer */}
      <div className="flex items-end gap-1.5 h-5 mt-4">
        {[40, 75, 100, 60, 90, 45, 80, 50, 95, 30, 85, 65].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300 rounded-full animate-bounce shadow-[0_0_6px_#10b981]"
            style={{
              height: `${h}%`,
              animationDelay: `${(i * 0.08).toFixed(2)}s`,
              animationDuration: '0.8s'
            }}
          />
        ))}
      </div>

      {/* Futuristic HUD Scanning Status Labels */}
      {title && (
        <div className="mt-4 flex flex-col items-center space-y-1 text-center max-w-md">
          <div className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="relative">
              {title}
              {/* Laser scan line overlay */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent animate-[shimmer_2s_infinite]" />
            </span>
          </div>

          {subtitle && (
            <div className="text-[11px] font-sans text-[#94a3b8] font-medium tracking-wide">
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
