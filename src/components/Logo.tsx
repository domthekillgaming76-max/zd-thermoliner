import { Truck } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'md' ? 'w-7 h-7' : 'w-12 h-12';
  const containerSize = size === 'sm' ? 'w-9 h-9' : size === 'md' ? 'w-12 h-12' : 'w-20 h-20';
  const titleSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-4xl';
  const subtitleSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-3">
      <div className={`${containerSize} relative flex-shrink-0`}>
        <div className={`${containerSize} bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-neon-sm`}
          style={{ boxShadow: '0 0 12px rgba(239,68,68,0.45), inset 0 1px 0 rgba(255,255,255,0.1)' }}>
          <Truck className={`${iconSize} text-white`} />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-dark-950 shadow-neon-sm" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${titleSize} font-black text-white tracking-tight`} style={{ letterSpacing: '-0.02em' }}>
            Z<span className="text-primary-500">&</span>D
          </span>
          <span className={`${subtitleSize} text-metal-400 font-medium tracking-widest uppercase`}>
            Thermoliner
          </span>
        </div>
      )}
    </div>
  );
}
