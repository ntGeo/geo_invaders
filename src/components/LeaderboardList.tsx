import { formatScoreDate } from '../game/leaderboard';
import type { LeaderboardEntry } from '../game/types';

interface LeaderboardListProps {
  entries: LeaderboardEntry[];
  highlightId?: string | null;
}

export function LeaderboardList({ entries, highlightId }: LeaderboardListProps) {
  if (entries.length === 0) {
    return (
      <div className="bg-[#060913] border border-white/10 rounded-xl px-4 py-6 text-center">
        <p className="text-xs text-slate-400">
          Aún no hay marcas registradas. Sé el primero en guardar tu apodo.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#060913] border border-white/10 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[34px_1fr_auto_auto] gap-2 px-3 py-2 border-b border-white/10 text-[10px] text-slate-400 font-medium text-left">
        <span>#</span>
        <span>Apodo</span>
        <span className="text-right">Fecha</span>
        <span className="text-right min-w-[58px]">Puntos</span>
      </div>
      <div className="max-h-[220px] overflow-y-auto divide-y divide-white/5">
        {entries.map((entry, idx) => {
          const isHighlighted = highlightId && entry.id === highlightId;
          return (
            <div
              key={entry.id}
              className={`grid grid-cols-[34px_1fr_auto_auto] gap-2 px-3 py-2 items-center text-xs ${
                isHighlighted ? 'bg-cyan-400/15 text-white' : 'text-slate-200'
              }`}
            >
              <span
                className={`font-mono-num font-bold text-left ${
                  idx === 0
                    ? 'text-amber-300'
                    : idx === 1
                      ? 'text-slate-300'
                      : idx === 2
                        ? 'text-orange-300'
                        : 'text-slate-500'
                }`}
              >
                {idx + 1}
              </span>
              <span className="font-display font-bold tracking-wider text-left truncate">
                {entry.alias}
              </span>
              <span className="text-[11px] text-slate-400 font-mono-num whitespace-nowrap text-right">
                {formatScoreDate(entry.createdAt)}
              </span>
              <span className="font-mono-num font-bold text-cyan-300 text-right min-w-[58px]">
                {entry.score.toLocaleString('es-ES')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
