interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const containerSize = size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-12 h-12' : 'w-20 h-20';
  const titleSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl' : 'text-4xl';
  const subtitleSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-3">
      <div className={`${containerSize} relative flex-shrink-0`}>
        <div className={`${containerSize} rounded-xl flex items-center justify-center overflow-hidden`}
          style={{ background: 'linear-gradient(145deg, rgba(255,255,255,.08), rgba(4,9,15,.8))', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 12px 30px rgba(0,0,0,.35), 0 0 20px rgba(214,40,40,.18)' }}>
          <img src="/icons/logo-bureaux.png" alt="" className="w-full h-full object-cover scale-110" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#08111D] shadow-[0_0_10px_rgba(52,211,153,.7)]" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${titleSize} font-black tracking-tight zd-logo-metal`} style={{ letterSpacing: '-0.03em' }}>
            Z<span>&amp;</span>D
          </span>
          <span className={`${subtitleSize} text-metal-400 font-medium tracking-widest uppercase`}>
            Thermoliner
          </span>
        </div>
      )}
    </div>
  );
}
