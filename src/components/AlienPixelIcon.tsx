import {
  ALIEN_COLORS,
  CRAB_FRAMES,
  OCTOPUS_FRAMES,
  PLAYER_SPRITE,
  SQUID_FRAMES,
  UFO_SPRITE,
} from '../game/sprites';

type IconKind = 'squid' | 'crab' | 'octopus' | 'ufo' | 'player';

interface AlienPixelIconProps {
  kind: IconKind;
  className?: string;
}

const MATRIX_MAP: Record<IconKind, { matrix: string[]; color: string }> = {
  squid: { matrix: SQUID_FRAMES[0], color: ALIEN_COLORS.squid },
  crab: { matrix: CRAB_FRAMES[0], color: ALIEN_COLORS.crab },
  octopus: { matrix: OCTOPUS_FRAMES[0], color: ALIEN_COLORS.octopus },
  ufo: { matrix: UFO_SPRITE, color: '#FB7185' },
  player: { matrix: PLAYER_SPRITE, color: '#38BDF8' },
};

export function AlienPixelIcon({ kind, className = 'w-6 h-5' }: AlienPixelIconProps) {
  const { matrix, color } = MATRIX_MAP[kind];
  const rows = matrix.length;
  const cols = matrix[0].length;

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {matrix.map((row, r) =>
        row.split('').map((cell, c) =>
          cell === '#' ? (
            <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={color} />
          ) : null
        )
      )}
    </svg>
  );
}
