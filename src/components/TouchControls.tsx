import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  autoFire: boolean;
  onToggleAutoFire: () => void;
  onButtonState: (button: 'left' | 'right' | 'fire', isDown: boolean) => void;
}

export function TouchControls({
  autoFire,
  onToggleAutoFire,
  onButtonState,
}: TouchControlsProps) {
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);
  const [firePressed, setFirePressed] = useState(false);

  const activePointers = useRef<Map<number, 'left' | 'right' | 'fire'>>(new Map());

  const handlePress = (
    e: React.PointerEvent<HTMLButtonElement>,
    btn: 'left' | 'right' | 'fire'
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, btn);
    onButtonState(btn, true);
    if (btn === 'left') setLeftPressed(true);
    if (btn === 'right') setRightPressed(true);
    if (btn === 'fire') setFirePressed(true);
  };

  const handleRelease = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = activePointers.current.get(e.pointerId);
    if (!btn) return;
    activePointers.current.delete(e.pointerId);

    // Check if another pointer is still holding the same button
    let stillHeld = false;
    for (const activeBtn of activePointers.current.values()) {
      if (activeBtn === btn) {
        stillHeld = true;
        break;
      }
    }
    if (!stillHeld) {
      onButtonState(btn, false);
      if (btn === 'left') setLeftPressed(false);
      if (btn === 'right') setRightPressed(false);
      if (btn === 'fire') setFirePressed(false);
    }
  };

  return (
    <div
      className="w-full max-w-[720px] px-3 sm:px-5 pb-3 pt-1.5 flex items-center justify-between gap-3 select-none touch-none shrink-0 z-10"
      aria-label="Controles táctiles"
    >
      {/* Left thumb directional pair */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onPointerDown={(e) => handlePress(e, 'left')}
          onPointerUp={handleRelease}
          onPointerCancel={handleRelease}
          aria-label="Mover a la izquierda"
          className={`w-[68px] h-[58px] sm:w-[76px] sm:h-[62px] rounded-xl border flex items-center justify-center transition-transform cursor-pointer touch-none ${
            leftPressed
              ? 'bg-cyan-400/25 border-cyan-300 text-white scale-95'
              : 'bg-[#0B1020] border-white/15 text-slate-200'
          }`}
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        <button
          type="button"
          onPointerDown={(e) => handlePress(e, 'right')}
          onPointerUp={handleRelease}
          onPointerCancel={handleRelease}
          aria-label="Mover a la derecha"
          className={`w-[68px] h-[58px] sm:w-[76px] sm:h-[62px] rounded-xl border flex items-center justify-center transition-transform cursor-pointer touch-none ${
            rightPressed
              ? 'bg-cyan-400/25 border-cyan-300 text-white scale-95'
              : 'bg-[#0B1020] border-white/15 text-slate-200'
          }`}
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>

      {/* Right thumb auto-fire toggle + large fire trigger */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleAutoFire}
          aria-pressed={autoFire}
          className={`h-[58px] sm:h-[62px] px-3.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            autoFire
              ? 'bg-emerald-400/20 border-emerald-400/60 text-emerald-300'
              : 'bg-[#0B1020] border-white/15 text-slate-400 hover:text-slate-200'
          }`}
        >
          Auto
        </button>

        <button
          type="button"
          onPointerDown={(e) => handlePress(e, 'fire')}
          onPointerUp={handleRelease}
          onPointerCancel={handleRelease}
          aria-label="Disparar"
          className={`h-[58px] sm:h-[62px] min-w-[104px] sm:min-w-[118px] px-5 rounded-xl border flex items-center justify-center gap-2 font-display font-bold text-sm tracking-wide transition-transform cursor-pointer touch-none ${
            firePressed
              ? 'bg-cyan-300 border-cyan-200 text-slate-950 scale-95'
              : 'bg-cyan-400 border-cyan-300 text-slate-950'
          }`}
        >
          <Crosshair className="w-5 h-5" />
          <span>Disparar</span>
        </button>
      </div>
    </div>
  );
}
