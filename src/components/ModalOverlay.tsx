import { useEffect, useState } from 'react';
import {
  isValidAlias,
  loadLastAlias,
  normalizeAlias,
  qualifiesForLeaderboard,
} from '../game/leaderboard';
import type { HudSnapshot, LeaderboardEntry } from '../game/types';
import { LeaderboardList } from './LeaderboardList';

interface ModalOverlayProps {
  hud: HudSnapshot;
  autoFire: boolean;
  leaderboard: LeaderboardEntry[];
  savedEntryId: string | null;
  onSaveScore: (alias: string) => void;
  onToggleAutoFire: () => void;
  onResume: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
}

export function ModalOverlay({
  hud,
  autoFire,
  leaderboard,
  savedEntryId,
  onSaveScore,
  onToggleAutoFire,
  onResume,
  onRestart,
  onReturnToTitle,
}: ModalOverlayProps) {
  const [alias, setAlias] = useState(() => loadLastAlias());
  const [aliasError, setAliasError] = useState('');

  useEffect(() => {
    if (hud.gameState === 'GAME_OVER') {
      setAlias(loadLastAlias());
      setAliasError('');
    }
  }, [hud.gameState]);

  if (hud.gameState !== 'PAUSED' && hud.gameState !== 'GAME_OVER') {
    return null;
  }

  const accuracy =
    hud.shotsFired > 0
      ? Math.min(100, Math.round((hud.shotsHit / hud.shotsFired) * 100))
      : 0;

  if (hud.gameState === 'PAUSED') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center px-5 bg-[#050812]/80">
        <div className="w-full max-w-[340px] bg-[#0B1020] border border-white/15 rounded-2xl p-6 text-center shadow-2xl">
          <h2 className="font-display text-2xl font-bold text-white tracking-wide mb-1">
            Juego en Pausa
          </h2>
          <p className="text-xs text-slate-400 mb-6 font-mono-num">
            Oleada {hud.wave} · {hud.score.toLocaleString('es-ES')} puntos
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onResume}
              className="w-full min-h-[46px] px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300"
            >
              Reanudar
            </button>

            <button
              type="button"
              onClick={onToggleAutoFire}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
            >
              Auto-disparo: {autoFire ? 'Activado' : 'Desactivado'}
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
            >
              Reiniciar
            </button>

            <button
              type="button"
              onClick={onReturnToTitle}
              className="w-full min-h-[42px] px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
            >
              Menú Principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const canEnterTop10 = qualifiesForLeaderboard(hud.score, leaderboard);
  const showAliasForm = canEnterTop10 && !savedEntryId;

  const handleAliasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = normalizeAlias(e.target.value);
    setAlias(cleaned);
    if (aliasError && cleaned.length >= 3) {
      setAliasError('');
    }
  };

  const handleSubmitAlias = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAlias(alias)) {
      setAliasError('El apodo debe tener entre 3 y 5 caracteres.');
      return;
    }
    setAliasError('');
    onSaveScore(alias);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-5 bg-[#050812]/88">
      <div className="w-full max-w-[390px] max-h-[94%] overflow-y-auto bg-[#0B1020] border border-white/15 rounded-2xl p-4 sm:p-5 text-center shadow-2xl">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-rose-400 tracking-wide mb-0.5">
          Fin de la Partida
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          {hud.isNewRecord
            ? 'Nuevo récord personal alcanzado'
            : canEnterTop10
              ? 'Tu puntuación entra en los 10 mejores'
              : 'La flota invasora rompió la defensa'}
        </p>

        {/* Compact 4-stat summary */}
        <div className="bg-[#060913] border border-white/10 rounded-xl p-3 mb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[10px] text-slate-400">Puntos</div>
              <div className="text-sm sm:text-base font-bold text-white font-mono-num">
                {hud.score.toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Récord</div>
              <div className="text-sm sm:text-base font-bold text-cyan-300 font-mono-num">
                {hud.highScore.toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Oleada</div>
              <div className="text-sm sm:text-base font-bold text-emerald-300 font-mono-num">
                {hud.wave}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Precisión</div>
              <div className="text-sm sm:text-base font-bold text-slate-200 font-mono-num">
                {accuracy}%
              </div>
            </div>
          </div>
        </div>

        {/* Nickname entry form (3-5 chars) */}
        {showAliasForm && (
          <form
            onSubmit={handleSubmitAlias}
            className="bg-[#060913] border border-cyan-400/30 rounded-xl p-3.5 mb-4 text-left"
          >
            <label
              htmlFor="player-alias-input"
              className="block text-xs font-medium text-slate-200 mb-2"
            >
              Ingresa tu apodo (3 a 5 caracteres)
            </label>
            <div className="flex items-stretch gap-2">
              <input
                id="player-alias-input"
                type="text"
                value={alias}
                onChange={handleAliasChange}
                minLength={3}
                maxLength={5}
                autoComplete="nickname"
                autoCapitalize="characters"
                placeholder="EJ. NEO"
                className="flex-1 min-w-0 min-h-[44px] px-3 rounded-lg bg-[#0B1020] border border-white/15 focus:border-cyan-400 focus:outline-none text-white font-display font-bold text-base tracking-widest uppercase placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={alias.length < 3}
                className="min-h-[44px] px-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-display font-bold text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Guardar
              </button>
            </div>
            {aliasError ? (
              <p className="mt-1.5 text-[11px] text-rose-400">{aliasError}</p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400 font-mono-num">
                {alias.length}/5 caracteres
              </p>
            )}
          </form>
        )}

        {/* Top 10 Leaderboard */}
        <div className="mb-4 text-left">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <h3 className="font-display text-xs font-bold text-slate-300 tracking-wide">
              Mejores 10 Puntajes
            </h3>
            {savedEntryId && (
              <span className="text-[11px] text-emerald-300 font-medium">
                Marca guardada
              </span>
            )}
          </div>
          <LeaderboardList entries={leaderboard} highlightId={savedEntryId} />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[46px] px-6 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-base tracking-wide transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Jugar de Nuevo
          </button>

          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full min-h-[40px] px-4 py-1.5 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
          >
            Menú Principal
          </button>
        </div>
      </div>
    </div>
  );
}
