import type { AlienTier } from './types';

export const SQUID_FRAMES: string[][] = [
  [
    '...##...',
    '..####..',
    '.######.',
    '##.##.##',
    '########',
    '..#..#..',
    '.#.##.#.',
    '#.#..#.#',
  ],
  [
    '...##...',
    '..####..',
    '.######.',
    '##.##.##',
    '########',
    '.#.##.#.',
    '#......#',
    '.#....#.',
  ],
];

export const CRAB_FRAMES: string[][] = [
  [
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '...##.##...',
  ],
  [
    '..#.....#..',
    '#..#...#..#',
    '#.#######.#',
    '###.###.###',
    '###########',
    '.#########.',
    '..#.....#..',
    '.#.......#.',
  ],
];

export const OCTOPUS_FRAMES: string[][] = [
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '...##..##...',
    '..##.##.##..',
    '##........##',
  ],
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '..###..###..',
    '.##..##..##.',
    '..##....##..',
  ],
];

export const UFO_SPRITE: string[] = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##.##.##.##.##.',
  '################',
  '..###..##..###..',
  '...#........#...',
];

export const PLAYER_SPRITE: string[] = [
  '......#......',
  '.....###.....',
  '.....###.....',
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
];

export const BUNKER_TEMPLATE: string[] = [
  '....##############....',
  '...################...',
  '..##################..',
  '.####################.',
  '######################',
  '######################',
  '######################',
  '######################',
  '######################',
  '######################',
  '######################',
  '#######........#######',
  '######..........######',
  '#####............#####',
  '#####............#####',
  '#####............#####',
];

export const ALIEN_COLORS: Record<AlienTier, string> = {
  squid: '#FB7185',
  crab: '#22D3EE',
  octopus: '#34D399',
};

export function getAlienSprite(tier: AlienTier, frame: 0 | 1): string[] {
  if (tier === 'squid') return SQUID_FRAMES[frame];
  if (tier === 'crab') return CRAB_FRAMES[frame];
  return OCTOPUS_FRAMES[frame];
}

export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  matrix: string[],
  x: number,
  y: number,
  pixelSize: number,
  color: string
): void {
  ctx.fillStyle = color;
  for (let r = 0; r < matrix.length; r++) {
    const row = matrix[r];
    let runStart = -1;
    for (let c = 0; c <= row.length; c++) {
      const filled = c < row.length && row[c] === '#';
      if (filled && runStart === -1) {
        runStart = c;
      } else if (!filled && runStart !== -1) {
        ctx.fillRect(
          Math.round(x + runStart * pixelSize),
          Math.round(y + r * pixelSize),
          Math.round((c - runStart) * pixelSize),
          Math.ceil(pixelSize)
        );
        runStart = -1;
      }
    }
  }
}
