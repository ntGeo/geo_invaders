export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type AlienTier = 'squid' | 'crab' | 'octopus';

export type PowerUpType = 'DOUBLE' | 'RAPID' | 'SHIELD';

export type EnemyBulletType = 'zigzag' | 'cross' | 'plunger';

export interface LeaderboardEntry {
  id: string;
  alias: string;
  score: number;
  wave: number;
  createdAt: number;
}

export interface HudSnapshot {
  gameState: GameState;
  score: number;
  highScore: number;
  wave: number;
  lives: number;
  activePowerUp: PowerUpType | null;
  powerUpTimeLeft: number;
  shotsFired: number;
  shotsHit: number;
  enemiesDefeated: number;
  waveBanner: number | null;
  isNewRecord: boolean;
}

export interface InputState {
  leftHeld: boolean;
  rightHeld: boolean;
  fireHeld: boolean;
  fireBufferTimer: number;
  touchLeftHeld: boolean;
  touchRightHeld: boolean;
  touchFireHeld: boolean;
  dragDeltaX: number;
  autoFire: boolean;
}

export interface Alien {
  id: number;
  row: number;
  col: number;
  tier: AlienTier;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  points: number;
  flashTimer: number;
  windupTimer: number;
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  cooldown: number;
  invulnTimer: number;
  flashTimer: number;
  recoilSquash: number;
  shieldActive: boolean;
}

export interface Bullet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isPlayer: boolean;
  bulletType?: EnemyBulletType;
  animPhase: number;
}

export interface Bunker {
  x: number;
  y: number;
  cellSize: number;
  cols: number;
  rows: number;
  cells: Uint8Array;
}

export interface Ufo {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  points: number;
  flashTimer: number;
  soundTimer: number;
}

export interface PowerUpDrop {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  width: number;
  height: number;
  type: PowerUpType;
  pulse: number;
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  twinklePhase: number;
}

export const WORLD_WIDTH = 720;
export const WORLD_HEIGHT = 860;
export const PLAYER_Y = 786;
export const BUNKER_Y = 682;
