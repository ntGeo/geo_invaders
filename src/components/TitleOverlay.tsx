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
  const topPlayer = leaderboard[0] ?? null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center px-5 py-4 text-center overflow-y-auto">
      <div className="w-full max-w-[420px] my-auto flex flex-col items-center">
        {/* Bespoke inline SVG crest & title lockup */}
        <svg
          viewBox="0 0 360 94"
          className="w-full max-w-[330px] h-auto mb-2.5"
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

        <p className="text-sm text-slate-400 mb-4">
          Defiende la línea orbital oleada tras oleada
        </p>

        {/* Top #1 player + link to view Top 10 side-by-side */}
        <div className="w-full max-w-[350px] flex items-center justify-between gap-3 px-4 py-2.5 mb-4 rounded-xl bg-[#0B1020]/90 border border-white/10">
          <div className="min-w-0 text-left">
            <div className="text-[10px] text-slate-400 font-medium">
              Mayor puntaje
            </div>
            {topPlayer ? (
              <div className="flex items-baseline gap-2 text-sm truncate">
                <span className="font-display font-bold text-amber-300 tracking-wider">
                  {topPlayer.alias}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono-num font-bold text-white">
                  {topPlayer.score.toLocaleString('es-ES')} pts
                </span>
              </div>
            ) : highScore > 0 ? (
              <div className="text-sm font-mono-num font-bold text-white truncate">
                {highScore.toLocaleString('es-ES')} pts
              </div>
            ) : (
              <div className="text-xs text-slate-400 truncate">
                Sin marcas aún
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            className="min-h-[40px] px-2 py-1 text-xs font-medium text-cyan-300 hover:text-cyan-200 underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            {showLeaderboard ? 'Cerrar Top 10' : 'Ver mejores 10'}
          </button>
        </div>

        {showLeaderboard ? (
          <div className="w-full max-w-[350px] mb-5">
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

        <button
          type="button"
          onClick={onToggleAutoFire}
          className="mt-2.5 min-h-[40px] px-4 py-1.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2 rounded-lg"
        >
          <span
            className={`inline-block w-3.5 h-3.5 rounded border ${
              autoFire
                ? 'bg-cyan-400 border-cyan-300'
                : 'border-slate-500 bg-transparent'
            }`}
            aria-hidden="true"
          />
          <span>Auto-disparo: {autoFire ? 'Activado' : 'Desactivado'}</span>
        </button>

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
