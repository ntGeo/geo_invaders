import { useState } from 'react';
import type { LeaderboardEntry } from '../game/types';
import { AlienPixelIcon } from './AlienPixelIcon';
import { LeaderboardList } from './LeaderboardList';

interface TitleOverlayProps {
  highScore: number;
  autoFire: boolean;
  leaderboard: LeaderboardEntry[];
  onToggleAutoFire: () => void;
  onStart: () => void;
}

export function TitleOverlay({
  highScore,
  autoFire,
  leaderboard,
  onToggleAutoFire,
  onStart,
}: TitleOverlayProps) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-5 py-6 text-center">
      <div className="w-full max-w-[420px] flex flex-col items-center">
        {/* Bespoke inline SVG crest & title lockup */}
        <svg
          viewBox="0 0 360 94"
          className="w-full max-w-[330px] h-auto mb-3"
          role="img"
          aria-label="Invasores"
        >
          <defs>
            <linearGradient id="titleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F8FAFC" />
              <stop offset="55%" stopColor="#7DD3FC" />
              <stop offset="100%" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <g transform="translate(164, 4)" fill="#22D3EE">
            <rect x="12" y="0" width="8" height="4" />
            <rect x="4" y="4" width="24" height="4" />
            <rect x="0" y="8" width="32" height="4" />
            <rect x="4" y="12" width="6" height="4" fill="#060913" />
            <rect x="22" y="12" width="6" height="4" fill="#060913" />
            <rect x="0" y="12" width="4" height="4" />
            <rect x="10" y="12" width="12" height="4" />
            <rect x="28" y="12" width="4" height="4" />
            <rect x="4" y="16" width="24" height="4" />
          </g>
          <text
            x="180"
            y="68"
            textAnchor="middle"
            fill="url(#titleGrad)"
            style={{
              fontFamily: '"Chakra Petch", sans-serif',
              fontWeight: 700,
              fontSize: '46px',
              letterSpacing: '0.1em',
            }}
          >
            INVASORES
          </text>
          <line
            x1="44"
            y1="82"
            x2="316"
            y2="82"
            stroke="rgba(56, 189, 248, 0.35)"
            strokeWidth="1.5"
          />
        </svg>

        <p className="text-sm text-slate-400 mb-5">
          Defiende la línea orbital oleada tras oleada
          {highScore > 0 && (
            <>
              <span className="mx-2 text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-300 font-mono-num">
                Récord {highScore.toLocaleString('es-ES')}
              </span>
            </>
          )}
        </p>

        {showLeaderboard ? (
          <div className="w-full max-w-[350px] mb-5">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h2 className="font-display text-sm font-bold text-slate-200 tracking-wide">
                Mejores 10 Puntajes
              </h2>
              <button
                type="button"
                onClick={() => setShowLeaderboard(false)}
                className="min-h-[36px] px-2.5 text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                Volver
              </button>
            </div>
            <LeaderboardList entries={leaderboard} />
          </div>
        ) : (
          <div className="w-full max-w-[300px] bg-[#0B1020]/90 border border-white/10 rounded-xl px-5 py-4 mb-5">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-left items-center">
              <div className="flex items-center gap-3">
                <AlienPixelIcon kind="ufo" className="w-7 h-3.5 shrink-0" />
                <span className="text-xs text-rose-300 font-mono-num">??? PTS</span>
              </div>
              <div className="flex items-center gap-3">
                <AlienPixelIcon kind="squid" className="w-5 h-5 shrink-0" />
                <span className="text-xs text-slate-200 font-mono-num">30 PTS</span>
              </div>
              <div className="flex items-center gap-3">
                <AlienPixelIcon kind="crab" className="w-6 h-4.5 shrink-0" />
                <span className="text-xs text-slate-200 font-mono-num">20 PTS</span>
              </div>
              <div className="flex items-center gap-3">
                <AlienPixelIcon kind="octopus" className="w-6 h-4.5 shrink-0" />
                <span className="text-xs text-slate-200 font-mono-num">10 PTS</span>
              </div>
            </div>
          </div>
        )}

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onStart}
          className="w-full max-w-[260px] min-h-[48px] px-8 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-slate-950 font-display font-bold text-lg tracking-wide transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
          Jugar
        </button>

        <div className="mt-2.5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            className="min-h-[40px] px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-200 font-medium transition-colors cursor-pointer rounded-lg"
          >
            {showLeaderboard ? 'Ver puntuación alien' : 'Mejores 10'}
          </button>

          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>

          <button
            type="button"
            onClick={onToggleAutoFire}
            className="min-h-[40px] px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2 rounded-lg"
          >
            <span
              className={`inline-block w-3.5 h-3.5 rounded border ${
                autoFire
                  ? 'bg-cyan-400 border-cyan-300'
                  : 'border-slate-500 bg-transparent'
              }`}
              aria-hidden="true"
            />
            <span>Auto-disparo: {autoFire ? 'Sí' : 'No'}</span>
          </button>
        </div>

        {/* Single flat control-hint line */}
        <p className="mt-4 text-[11px] sm:text-xs text-slate-400 leading-relaxed max-w-[380px]">
          PC: ← → Mover · Espacio Disparar · Esc Pausa
          <span className="mx-1.5 text-slate-600" aria-hidden="true">
            |
          </span>
          Móvil: Deslizar o Botones
        </p>
      </div>
    </div>
  );
}
