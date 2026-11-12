import { Gamepad2, Pause, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';
import { AlienPixelIcon } from './AlienPixelIcon';

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  showTouchControls: boolean;
  onToggleMute: () => void;
  onToggleTouchControls: () => void;
  onPause: () => void;
}

export function HudOverlay({
  hud,
  muted,
  showTouchControls,
  onToggleMute,
  onToggleTouchControls,
  onPause,
}: HudOverlayProps) {
  const isPlayingOrPaused =
    hud.gameState === 'PLAYING' || hud.gameState === 'PAUSED';

  const powerUpLabel =
    hud.activePowerUp === 'DOUBLE'
      ? `Doble Láser ${hud.powerUpTimeLeft}s`
      : hud.activePowerUp === 'RAPID'
        ? `Cadencia ${hud.powerUpTimeLeft}s`
        : hud.activePowerUp === 'SHIELD'
          ? 'Escudo Activo'
          : null;

  return (
    <header className="w-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2 pointer-events-none select-none z-10">
      {/* Left: Score & Record */}
      <div className="flex items-center gap-4 sm:gap-6 min-w-0">
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            Puntos
          </span>
          <span className="text-base sm:text-xl font-bold text-white font-mono-num">
            {hud.score.toLocaleString('es-ES')}
          </span>
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
            Récord
          </span>
          <span className="text-base sm:text-xl font-bold text-cyan-300 font-mono-num">
            {hud.highScore.toLocaleString('es-ES')}
          </span>
        </div>

        {isPlayingOrPaused && (
          <div className="hidden xs:flex sm:flex flex-col leading-tight">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
              Oleada
            </span>
            <span className="text-base sm:text-xl font-bold text-emerald-300 font-mono-num">
              {hud.wave}
            </span>
          </div>
        )}
      </div>

      {/* Center: Active Power-Up (clean unboxed text) or Wave on tiny screens */}
      <div className="flex items-center gap-3 min-w-0">
        {isPlayingOrPaused && powerUpLabel && (
          <span className="text-xs font-display font-semibold text-amber-300 whitespace-nowrap truncate">
            {powerUpLabel}
          </span>
        )}
      </div>

      {/* Right: Lives + Utility Controls */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto shrink-0">
        {isPlayingOrPaused && (
          <div
            className="flex items-center gap-1 mr-1"
            aria-label={`Vidas restantes: ${hud.lives}`}
          >
            {Array.from({ length: Math.max(0, hud.lives) }).map((_, i) => (
              <AlienPixelIcon key={i} kind="player" className="w-4 h-3" />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleTouchControls}
          title={
            showTouchControls
              ? 'Ocultar controles táctiles'
              : 'Mostrar controles táctiles'
          }
          aria-label={
            showTouchControls
              ? 'Ocultar controles táctiles'
              : 'Mostrar controles táctiles'
          }
          className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300 ${
            showTouchControls
              ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-300'
              : 'bg-[#0B1020]/90 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? 'Activar sonido (M)' : 'Silenciar sonido (M)'}
          aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0B1020]/90 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {isPlayingOrPaused && (
          <button
            type="button"
            onClick={onPause}
            title="Pausa (Esc)"
            aria-label="Pausar partida"
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#0B1020]/90 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
