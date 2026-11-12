import { arcadeAudio } from './audio';
import {
  ALIEN_COLORS,
  BUNKER_TEMPLATE,
  PLAYER_SPRITE,
  UFO_SPRITE,
  drawPixelSprite,
  getAlienSprite,
} from './sprites';
import {
  type Alien,
  type AlienTier,
  BUNKER_Y,
  type Bullet,
  type Bunker,
  type EnemyBulletType,
  type FloatingText,
  type GameState,
  type HudSnapshot,
  type InputState,
  PLAYER_Y,
  type Particle,
  type Player,
  type PowerUpDrop,
  type PowerUpType,
  type Star,
  type Ufo,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './types';

const HIGH_SCORE_STORAGE_KEY = 'invasores_high_score_v1';
const PARTICLE_POOL_SIZE = 180;
const BULLET_POOL_SIZE = 32;
const FLOATING_TEXT_POOL_SIZE = 16;

export class SpaceInvadersEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onHudChange: (snapshot: HudSnapshot) => void;

  private rafId: number | null = null;
  private lastTimestamp = 0;

  private gameState: GameState = 'TITLE_MENU';
  private score = 0;
  private highScore = 0;
  private isNewRecord = false;
  private wave = 1;
  private lives = 3;
  private shotsFired = 0;
  private shotsHit = 0;
  private enemiesDefeated = 0;

  private hitstopTimer = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private screenFlashAlpha = 0;
  private screenFlashColor = '#ffffff';

  private waveBannerTimer = 0;
  private waveClearDelay = 0;

  private activePowerUp: PowerUpType | null = null;
  private powerUpTimer = 0;

  private player: Player;
  private aliens: Alien[] = [];
  private bunkers: Bunker[] = [];
  private ufo: Ufo;
  private ufoSpawnTimer = 14;
  private powerUpDrop: PowerUpDrop;

  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private stars: Star[] = [];

  // Formation march state
  private marchDir: 1 | -1 = 1;
  private marchFrame: 0 | 1 = 0;
  private marchTimer = 0;
  private marchStepCount = 0;
  private enemyFireTimer = 1.1;

  private input: InputState = {
    leftHeld: false,
    rightHeld: false,
    fireHeld: false,
    fireBufferTimer: 0,
    touchLeftHeld: false,
    touchRightHeld: false,
    touchFireHeld: false,
    dragDeltaX: 0,
    autoFire: false,
  };

  private lastHudSignature = '';

  constructor(canvas: HTMLCanvasElement, onHudChange: (snapshot: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('No se pudo inicializar el contexto 2D del canvas');
    }
    this.ctx = context;
    this.onHudChange = onHudChange;
    this.highScore = this.loadHighScore();

    this.player = this.createInitialPlayer();
    this.ufo = {
      active: false,
      x: 0,
      y: 66,
      width: 56,
      height: 24,
      vx: 150,
      points: 150,
      flashTimer: 0,
      soundTimer: 0,
    };
    this.powerUpDrop = {
      active: false,
      x: 0,
      y: 0,
      vy: 135,
      width: 28,
      height: 28,
      type: 'DOUBLE',
      pulse: 0,
    };

    this.initPools();
    this.initStars();
    this.setupWave(1, true);
    this.emitHud(true);
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_STORAGE_KEY);
      const parsed = saved ? parseInt(saved, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(val: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(val));
    } catch {
      // Ignore storage failures in restricted contexts
    }
  }

  private createInitialPlayer(): Player {
    return {
      x: WORLD_WIDTH / 2 - 26,
      y: PLAYER_Y,
      width: 52,
      height: 32,
      speed: 420,
      cooldown: 0,
      invulnTimer: 0,
      flashTimer: 0,
      recoilSquash: 0,
      shieldActive: false,
    };
  }

  private initPools(): void {
    this.bullets = Array.from({ length: BULLET_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 4,
      height: 14,
      isPlayer: true,
      animPhase: 0,
    }));

    this.particles = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 3,
      color: '#ffffff',
      life: 0,
      maxLife: 1,
      gravity: 0,
    }));

    this.floatingTexts = Array.from({ length: FLOATING_TEXT_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -38,
      text: '',
      color: '#ffffff',
      life: 0,
      maxLife: 1,
    }));
  }

  private initStars(): void {
    this.stars = Array.from({ length: 85 }, (_, i) => {
      const layer = i % 3;
      return {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        size: layer === 0 ? 1.2 : layer === 1 ? 1.8 : 2.5,
        speed: layer === 0 ? 12 : layer === 1 ? 26 : 44,
        alpha: layer === 0 ? 0.35 : layer === 1 ? 0.6 : 0.85,
        twinklePhase: Math.random() * Math.PI * 2,
      };
    });
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      this.render(now / 1000);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public startNewGame(): void {
    arcadeAudio.unlock();
    this.score = 0;
    this.isNewRecord = false;
    this.wave = 1;
    this.lives = 3;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.enemiesDefeated = 0;
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.player = this.createInitialPlayer();
    this.clearTransientEntities();
    this.setupWave(1, true);
    this.gameState = 'PLAYING';
    this.waveBannerTimer = 1.4;
    this.emitHud(true);
  }

  public togglePause(): void {
    if (this.gameState === 'PLAYING') {
      this.gameState = 'PAUSED';
      this.clearHeldInputs();
      this.emitHud(true);
    } else if (this.gameState === 'PAUSED') {
      arcadeAudio.unlock();
      this.gameState = 'PLAYING';
      this.emitHud(true);
    }
  }

  public returnToTitle(): void {
    this.gameState = 'TITLE_MENU';
    this.clearHeldInputs();
    this.clearTransientEntities();
    this.setupWave(1, true);
    this.emitHud(true);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public setKeyInput(code: string, isDown: boolean): void {
    if (code === 'ArrowLeft' || code === 'KeyA') {
      this.input.leftHeld = isDown;
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.input.rightHeld = isDown;
    } else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      if (isDown && !this.input.fireHeld) {
        this.input.fireBufferTimer = 0.12;
      }
      this.input.fireHeld = isDown;
    }
  }

  public setTouchButton(button: 'left' | 'right' | 'fire', isDown: boolean): void {
    arcadeAudio.unlock();
    if (button === 'left') {
      this.input.touchLeftHeld = isDown;
    } else if (button === 'right') {
      this.input.touchRightHeld = isDown;
    } else if (button === 'fire') {
      if (isDown && !this.input.touchFireHeld) {
        this.input.fireBufferTimer = 0.12;
      }
      this.input.touchFireHeld = isDown;
    }
  }

  public addTouchDragDelta(worldDx: number): void {
    arcadeAudio.unlock();
    this.input.dragDeltaX += worldDx;
  }

  public triggerBufferedFire(): void {
    arcadeAudio.unlock();
    this.input.fireBufferTimer = 0.12;
  }

  public setAutoFire(enabled: boolean): void {
    this.input.autoFire = enabled;
  }

  public clearHeldInputs(): void {
    this.input.leftHeld = false;
    this.input.rightHeld = false;
    this.input.fireHeld = false;
    this.input.touchLeftHeld = false;
    this.input.touchRightHeld = false;
    this.input.touchFireHeld = false;
    this.input.fireBufferTimer = 0;
    this.input.dragDeltaX = 0;
  }

  private clearTransientEntities(): void {
    for (const b of this.bullets) b.active = false;
    for (const p of this.particles) p.active = false;
    for (const f of this.floatingTexts) f.active = false;
    this.ufo.active = false;
    this.powerUpDrop.active = false;
    this.ufoSpawnTimer = 13 + Math.random() * 7;
  }

  private setupWave(waveNumber: number, rebuildBunkers: boolean): void {
    this.aliens = [];
    const cols = 11;
    const rows = 5;
    const colSpacing = 50;
    const rowSpacing = 42;
    const formationWidth = (cols - 1) * colSpacing + 42;
    const startX = (WORLD_WIDTH - formationWidth) / 2;
    // Start slightly lower on higher waves, capped safely above bunkers
    const waveDropOffset = Math.min((waveNumber - 1) * 18, 126);
    const startY = 122 + waveDropOffset;

    let id = 0;
    for (let r = 0; r < rows; r++) {
      const tier: AlienTier = r === 0 ? 'squid' : r <= 2 ? 'crab' : 'octopus';
      const points = tier === 'squid' ? 30 : tier === 'crab' ? 20 : 10;
      const width = tier === 'squid' ? 28 : tier === 'crab' ? 36 : 40;
      const height = 28;

      for (let c = 0; c < cols; c++) {
        this.aliens.push({
          id: id++,
          row: r,
          col: c,
          tier,
          x: startX + c * colSpacing + (40 - width) / 2,
          y: startY + r * rowSpacing,
          width,
          height,
          alive: true,
          points,
          flashTimer: 0,
          windupTimer: 0,
        });
      }
    }

    this.marchDir = 1;
    this.marchFrame = 0;
    this.marchTimer = 0.45;
    this.marchStepCount = 0;
    this.enemyFireTimer = Math.max(0.55, 1.25 - (waveNumber - 1) * 0.09);
    this.waveClearDelay = 0;

    if (rebuildBunkers) {
      this.bunkers = this.createBunkers();
    }
  }

  private createBunkers(): Bunker[] {
    const count = 4;
    const cols = BUNKER_TEMPLATE[0].length;
    const rows = BUNKER_TEMPLATE.length;
    const cellSize = 3.5;
    const bunkerWidth = cols * cellSize;
    const margin = 74;
    const usable = WORLD_WIDTH - margin * 2 - bunkerWidth;
    const step = usable / (count - 1);

    const list: Bunker[] = [];
    for (let i = 0; i < count; i++) {
      const cells = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells[r * cols + c] = BUNKER_TEMPLATE[r][c] === '#' ? 1 : 0;
        }
      }
      list.push({
        x: Math.round(margin + i * step),
        y: BUNKER_Y,
        cellSize,
        cols,
        rows,
        cells,
      });
    }
    return list;
  }

  private update(dt: number): void {
    // Always animate starfield subtly
    const starSpeedFactor = this.gameState === 'PLAYING' ? 1 : 0.45;
    for (const star of this.stars) {
      star.y += star.speed * starSpeedFactor * dt;
      star.twinklePhase += dt * 2.2;
      if (star.y > WORLD_HEIGHT) {
        star.y = -4;
        star.x = Math.random() * WORLD_WIDTH;
      }
    }

    if (this.gameState !== 'PLAYING') {
      return;
    }

    // Screen flash & shake decay even during hitstop
    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 2.8);
    }
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    if (this.waveBannerTimer > 0) {
      this.waveBannerTimer = Math.max(0, this.waveBannerTimer - dt);
    }

    // Active power-up countdown
    if (this.activePowerUp && this.activePowerUp !== 'SHIELD') {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null;
        this.powerUpTimer = 0;
      }
    }

    this.updatePlayer(dt);
    this.updateWaveClearOrAliens(dt);
    this.updateUfo(dt);
    this.updatePowerUpDrop(dt);
    this.updateBullets(dt);
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    this.emitHud(false);
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    if (p.cooldown > 0) p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.invulnTimer > 0) p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    if (p.flashTimer > 0) p.flashTimer = Math.max(0, p.flashTimer - dt);
    if (p.recoilSquash > 0) p.recoilSquash = Math.max(0, p.recoilSquash - dt * 7);
    if (this.input.fireBufferTimer > 0) {
      this.input.fireBufferTimer = Math.max(0, this.input.fireBufferTimer - dt);
    }

    let moveDir = 0;
    if (this.input.leftHeld || this.input.touchLeftHeld) moveDir -= 1;
    if (this.input.rightHeld || this.input.touchRightHeld) moveDir += 1;

    p.x += moveDir * p.speed * dt;

    if (this.input.dragDeltaX !== 0) {
      p.x += this.input.dragDeltaX;
      this.input.dragDeltaX = 0;
    }

    const minX = 24;
    const maxX = WORLD_WIDTH - p.width - 24;
    if (p.x < minX) p.x = minX;
    if (p.x > maxX) p.x = maxX;

    const wantsFire =
      this.input.fireHeld ||
      this.input.touchFireHeld ||
      this.input.fireBufferTimer > 0 ||
      this.input.autoFire;

    if (wantsFire && p.cooldown <= 0 && this.waveClearDelay <= 0) {
      this.firePlayerShot();
      this.input.fireBufferTimer = 0;
    }
  }

  private firePlayerShot(): void {
    const p = this.player;
    const activePlayerBullets = this.bullets.filter((b) => b.active && b.isPlayer).length;
    const isDouble = this.activePowerUp === 'DOUBLE';
    const isRapid = this.activePowerUp === 'RAPID';
    const maxPlayerBullets = isDouble ? 4 : isRapid ? 3 : 2;

    if (activePlayerBullets >= maxPlayerBullets) return;

    p.cooldown = isRapid ? 0.16 : 0.29;
    p.recoilSquash = 1;
    this.shotsFired += isDouble ? 2 : 1;

    const centerX = p.x + p.width / 2;
    const topY = p.y - 6;

    if (isDouble) {
      this.spawnBullet(centerX - 13, topY, 0, -690, true);
      this.spawnBullet(centerX + 13, topY, 0, -690, true);
      this.spawnBurst(centerX - 13, topY, '#38BDF8', 4, 80);
      this.spawnBurst(centerX + 13, topY, '#38BDF8', 4, 80);
    } else {
      this.spawnBullet(centerX, topY, 0, -670, true);
      this.spawnBurst(centerX, topY, '#38BDF8', 5, 95);
    }

    arcadeAudio.playShoot(isDouble || isRapid);
  }

  private updateWaveClearOrAliens(dt: number): void {
    const livingAliens = this.aliens.filter((a) => a.alive);

    if (livingAliens.length === 0) {
      if (this.waveClearDelay <= 0) {
        this.waveClearDelay = 1.55;
        arcadeAudio.playWaveClear();
        this.spawnFloatingText(
          WORLD_WIDTH / 2,
          WORLD_HEIGHT * 0.42,
          `OLEADA ${this.wave} COMPLETADA`,
          '#34D399',
          1.45
        );
      } else {
        this.waveClearDelay -= dt;
        if (this.waveClearDelay <= 0) {
          this.wave += 1;
          // Refresh bunkers partially or rebuild every 2 waves
          const rebuild = this.wave % 2 === 1;
          this.setupWave(this.wave, rebuild);
          this.waveBannerTimer = 1.4;
          this.emitHud(true);
        }
      }
      return;
    }

    // Update alien hit flashes & windup telegraphs
    for (const alien of livingAliens) {
      if (alien.flashTimer > 0) alien.flashTimer = Math.max(0, alien.flashTimer - dt);
      if (alien.windupTimer > 0) {
        alien.windupTimer -= dt;
        if (alien.windupTimer <= 0) {
          this.fireAlienProjectile(alien);
        }
      }
    }

    // Nonlinear classic Space Invaders march speed!
    const ratio = livingAliens.length / 55;
    const waveSpeedFactor = Math.max(0.55, 1 - (this.wave - 1) * 0.06);
    const stepInterval = (0.048 + Math.pow(ratio, 1.35) * 0.54) * waveSpeedFactor;

    this.marchTimer -= dt;
    if (this.marchTimer <= 0) {
      this.marchTimer = stepInterval;
      this.marchFrame = this.marchFrame === 0 ? 1 : 0;
      arcadeAudio.playMarchStep(this.marchStepCount++);

      const stepX = 11 * this.marchDir;
      let hitWall = false;
      for (const alien of livingAliens) {
        const nextX = alien.x + stepX;
        if (nextX < 22 || nextX + alien.width > WORLD_WIDTH - 22) {
          hitWall = true;
          break;
        }
      }

      if (hitWall) {
        this.marchDir = this.marchDir === 1 ? -1 : 1;
        for (const alien of livingAliens) {
          alien.y += 20;
        }
      } else {
        for (const alien of livingAliens) {
          alien.x += stepX;
        }
      }

      // Erode bunkers if aliens descend into them & check invasion
      for (const alien of livingAliens) {
        this.erodeBunkerByBox(alien.x, alien.y, alien.width, alien.height);
        if (alien.y + alien.height >= PLAYER_Y + 4) {
          this.triggerInvasionGameOver();
          return;
        }
      }
    }

    // Enemy shooting selection (only bottom-most alive alien per column can shoot)
    this.enemyFireTimer -= dt;
    if (this.enemyFireTimer <= 0) {
      const baseCooldown = Math.max(0.36, 1.15 - (this.wave - 1) * 0.085);
      const speedBonus = (1 - ratio) * 0.35;
      this.enemyFireTimer = Math.max(0.28, baseCooldown - speedBonus) * (0.75 + Math.random() * 0.5);

      const shooters = this.getBottomColumnAliens(livingAliens);
      if (shooters.length > 0) {
        // Slight bias toward column near player
        const playerCenter = this.player.x + this.player.width / 2;
        let chosen: Alien;
        if (Math.random() < 0.45) {
          shooters.sort(
            (a, b) =>
              Math.abs(a.x + a.width / 2 - playerCenter) -
              Math.abs(b.x + b.width / 2 - playerCenter)
          );
          chosen = shooters[Math.floor(Math.random() * Math.min(2, shooters.length))];
        } else {
          chosen = shooters[Math.floor(Math.random() * shooters.length)];
        }
        if (chosen.windupTimer <= 0) {
          chosen.windupTimer = 0.22;
        }
      }
    }
  }

  private getBottomColumnAliens(livingAliens: Alien[]): Alien[] {
    const byCol = new Map<number, Alien>();
    for (const alien of livingAliens) {
      const existing = byCol.get(alien.col);
      if (!existing || alien.row > existing.row) {
        byCol.set(alien.col, alien);
      }
    }
    return Array.from(byCol.values());
  }

  private fireAlienProjectile(alien: Alien): void {
    if (!alien.alive || this.gameState !== 'PLAYING') return;
    const bx = alien.x + alien.width / 2;
    const by = alien.y + alien.height + 2;

    const types: EnemyBulletType[] = ['zigzag', 'cross', 'plunger'];
    const bulletType =
      alien.tier === 'squid'
        ? 'zigzag'
        : alien.tier === 'crab'
          ? types[Math.floor(Math.random() * 2)]
          : 'plunger';

    const baseSpeed = 275 + Math.min(this.wave * 20, 140);
    const speed = bulletType === 'zigzag' ? baseSpeed * 1.18 : baseSpeed;
    this.spawnBullet(bx, by, 0, speed, false, bulletType);
  }

  private updateUfo(dt: number): void {
    if (!this.ufo.active) {
      this.ufoSpawnTimer -= dt;
      if (this.ufoSpawnTimer <= 0) {
        const fromLeft = Math.random() < 0.5;
        const bonusPool = [100, 150, 200, 300];
        this.ufo.active = true;
        this.ufo.x = fromLeft ? -this.ufo.width - 10 : WORLD_WIDTH + 10;
        this.ufo.y = 66;
        this.ufo.vx = fromLeft ? 155 : -155;
        this.ufo.points = bonusPool[Math.floor(Math.random() * bonusPool.length)];
        this.ufo.flashTimer = 0;
        this.ufo.soundTimer = 0;
        this.ufoSpawnTimer = 15 + Math.random() * 9;
      }
      return;
    }

    this.ufo.x += this.ufo.vx * dt;
    this.ufo.soundTimer += dt;
    if (this.ufo.soundTimer >= 0.16) {
      this.ufo.soundTimer = 0;
      arcadeAudio.playUfoPulse(this.ufo.x * 0.05);
    }

    if (
      (this.ufo.vx > 0 && this.ufo.x > WORLD_WIDTH + 20) ||
      (this.ufo.vx < 0 && this.ufo.x + this.ufo.width < -20)
    ) {
      this.ufo.active = false;
    }
  }

  private updatePowerUpDrop(dt: number): void {
    const drop = this.powerUpDrop;
    if (!drop.active) return;

    drop.y += drop.vy * dt;
    drop.pulse += dt * 6;

    // Player pickup collision
    if (
      this.rectsOverlap(
        drop.x - drop.width / 2,
        drop.y - drop.height / 2,
        drop.width,
        drop.height,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      )
    ) {
      drop.active = false;
      this.applyPowerUp(drop.type);
      return;
    }

    if (drop.y > WORLD_HEIGHT + 30) {
      drop.active = false;
    }
  }

  private applyPowerUp(type: PowerUpType): void {
    arcadeAudio.playPowerUp();
    if (type === 'SHIELD') {
      this.player.shieldActive = true;
      if (!this.activePowerUp) {
        this.activePowerUp = 'SHIELD';
      }
      this.spawnFloatingText(
        this.player.x + this.player.width / 2,
        this.player.y - 16,
        'ESCUDO ACTIVO',
        '#38BDF8',
        1.1
      );
    } else {
      this.activePowerUp = type;
      this.powerUpTimer = 10;
      const label = type === 'DOUBLE' ? 'DOBLE LÁSER' : 'CADENCIA RÁPIDA';
      const color = type === 'DOUBLE' ? '#FBBF24' : '#34D399';
      this.spawnFloatingText(
        this.player.x + this.player.width / 2,
        this.player.y - 16,
        label,
        color,
        1.1
      );
    }
    this.spawnBurst(
      this.player.x + this.player.width / 2,
      this.player.y + 10,
      '#38BDF8',
      16,
      160
    );
    this.emitHud(true);
  }

  private updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.animPhase += dt * 16;

      if (b.y < -30 || b.y > WORLD_HEIGHT + 30) {
        b.active = false;
        continue;
      }

      // Check bunker collision
      if (this.checkBulletBunkerCollision(b)) {
        b.active = false;
        continue;
      }

      if (b.isPlayer) {
        // Check bullet vs enemy bullet cancellation
        let cancelled = false;
        for (const other of this.bullets) {
          if (!other.active || other.isPlayer) continue;
          if (
            this.rectsOverlap(
              b.x - 4,
              b.y,
              8,
              b.height,
              other.x - 5,
              other.y,
              10,
              other.height
            )
          ) {
            b.active = false;
            other.active = false;
            this.spawnBurst(b.x, b.y, '#FDE047', 6, 110);
            cancelled = true;
            break;
          }
        }
        if (cancelled) continue;

        // Check UFO collision
        if (
          this.ufo.active &&
          this.rectsOverlap(
            b.x - b.width / 2,
            b.y,
            b.width,
            b.height,
            this.ufo.x,
            this.ufo.y,
            this.ufo.width,
            this.ufo.height
          )
        ) {
          b.active = false;
          this.destroyUfo();
          continue;
        }

        // Check alien collision
        for (const alien of this.aliens) {
          if (!alien.alive) continue;
          if (
            this.rectsOverlap(
              b.x - b.width / 2,
              b.y,
              b.width,
              b.height,
              alien.x,
              alien.y,
              alien.width,
              alien.height
            )
          ) {
            b.active = false;
            this.destroyAlien(alien);
            break;
          }
        }
      } else {
        // Enemy bullet vs Player
        const p = this.player;
        if (
          p.invulnTimer <= 0 &&
          this.rectsOverlap(
            b.x - 4,
            b.y,
            8,
            b.height,
            p.x + 4,
            p.y + 4,
            p.width - 8,
            p.height - 4
          )
        ) {
          b.active = false;
          this.damagePlayer();
        }
      }
    }
  }

  private destroyAlien(alien: Alien): void {
    alien.alive = false;
    this.shotsHit += 1;
    this.enemiesDefeated += 1;
    this.addScore(alien.points);

    const color = ALIEN_COLORS[alien.tier];
    const cx = alien.x + alien.width / 2;
    const cy = alien.y + alien.height / 2;

    arcadeAudio.playAlienHit(alien.tier);
    this.spawnBurst(cx, cy, color, 14, 180);
    this.spawnBurst(cx, cy, '#FFFFFF', 4, 120);
    this.addShake(0.11, 3.2);

    // Occasional tactical power-up drop from top-row Squids when none active
    if (
      alien.tier === 'squid' &&
      !this.powerUpDrop.active &&
      Math.random() < 0.14
    ) {
      this.spawnPowerUpDrop(cx, cy);
    }
  }

  private destroyUfo(): void {
    const cx = this.ufo.x + this.ufo.width / 2;
    const cy = this.ufo.y + this.ufo.height / 2;
    const pts = this.ufo.points;

    this.ufo.active = false;
    this.shotsHit += 1;
    this.enemiesDefeated += 1;
    this.addScore(pts);

    arcadeAudio.playUfoDestroy();
    this.hitstopTimer = 0.045;
    this.addShake(0.24, 7.5);
    this.screenFlashColor = '#F43F5E';
    this.screenFlashAlpha = 0.14;

    this.spawnBurst(cx, cy, '#FB7185', 26, 240);
    this.spawnBurst(cx, cy, '#FDE047', 12, 180);
    this.spawnFloatingText(cx, cy, `+${pts}`, '#FDE047', 1.15);

    if (!this.powerUpDrop.active) {
      this.spawnPowerUpDrop(cx, cy);
    }
  }

  private spawnPowerUpDrop(x: number, y: number): void {
    const pool: PowerUpType[] = this.player.shieldActive
      ? ['DOUBLE', 'RAPID']
      : ['DOUBLE', 'RAPID', 'SHIELD'];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.powerUpDrop.active = true;
    this.powerUpDrop.x = x;
    this.powerUpDrop.y = y;
    this.powerUpDrop.type = chosen;
    this.powerUpDrop.pulse = 0;
  }

  private damagePlayer(): void {
    const p = this.player;
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;

    if (p.shieldActive) {
      p.shieldActive = false;
      if (this.activePowerUp === 'SHIELD') {
        this.activePowerUp = null;
      }
      p.invulnTimer = 1.0;
      p.flashTimer = 0.22;
      this.hitstopTimer = 0.035;
      this.addShake(0.18, 6);
      this.spawnBurst(cx, cy, '#38BDF8', 22, 220);
      this.spawnFloatingText(cx, cy - 18, 'ESCUDO ROTO', '#38BDF8', 0.9);
      arcadeAudio.playBunkerHit();
      this.emitHud(true);
      return;
    }

    this.lives -= 1;
    p.invulnTimer = 1.8;
    p.flashTimer = 0.3;
    this.hitstopTimer = 0.065;
    this.addShake(0.36, 11);
    this.screenFlashColor = '#EF4444';
    this.screenFlashAlpha = 0.24;

    arcadeAudio.playPlayerHit();
    this.spawnBurst(cx, cy, '#38BDF8', 28, 250);
    this.spawnBurst(cx, cy, '#F8FAFC', 14, 190);

    if (this.lives <= 0) {
      this.lives = 0;
      this.gameState = 'GAME_OVER';
      this.clearHeldInputs();
    }
    this.emitHud(true);
  }

  private triggerInvasionGameOver(): void {
    this.lives = 0;
    this.hitstopTimer = 0.07;
    this.addShake(0.42, 13);
    this.screenFlashColor = '#EF4444';
    this.screenFlashAlpha = 0.3;
    arcadeAudio.playPlayerHit();
    this.gameState = 'GAME_OVER';
    this.clearHeldInputs();
    this.emitHud(true);
  }

  private addScore(points: number): void {
    const prevThreshold = Math.floor(this.score / 2500);
    this.score += points;
    const nextThreshold = Math.floor(this.score / 2500);

    // Bonus life every 2500 pts up to 5 lives
    if (nextThreshold > prevThreshold && this.lives < 5) {
      this.lives += 1;
      arcadeAudio.playPowerUp();
      this.spawnFloatingText(
        this.player.x + this.player.width / 2,
        this.player.y - 24,
        '+1 VIDA',
        '#34D399',
        1.2
      );
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewRecord = true;
      this.saveHighScore(this.highScore);
    }
  }

  private checkBulletBunkerCollision(b: Bullet): boolean {
    for (const bunker of this.bunkers) {
      const bw = bunker.cols * bunker.cellSize;
      const bh = bunker.rows * bunker.cellSize;
      if (
        b.x + 2 < bunker.x ||
        b.x - 2 > bunker.x + bw ||
        b.y + b.height < bunker.y ||
        b.y > bunker.y + bh
      ) {
        continue;
      }

      const startY = b.isPlayer ? b.y : b.y + b.height;
      const col = Math.floor((b.x - bunker.x) / bunker.cellSize);
      const row = Math.floor((startY - bunker.y) / bunker.cellSize);

      // Scan small vertical slice along bullet length
      const minR = Math.max(0, Math.min(bunker.rows - 1, row - 1));
      const maxR = Math.max(0, Math.min(bunker.rows - 1, row + 2));
      const minC = Math.max(0, Math.min(bunker.cols - 1, col - 1));
      const maxC = Math.max(0, Math.min(bunker.cols - 1, col + 1));

      let hitRow = -1;
      let hitCol = -1;
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          if (bunker.cells[r * bunker.cols + c] === 1) {
            hitRow = r;
            hitCol = c;
            break;
          }
        }
        if (hitRow !== -1) break;
      }

      if (hitRow !== -1) {
        // Carve crater around impact
        const radius = b.isPlayer ? 1.8 : 2.3;
        for (let r = Math.max(0, hitRow - 3); r <= Math.min(bunker.rows - 1, hitRow + 3); r++) {
          for (let c = Math.max(0, hitCol - 3); c <= Math.min(bunker.cols - 1, hitCol + 3); c++) {
            const dist = Math.hypot(c - hitCol, r - hitRow);
            if (dist <= radius + (Math.random() * 0.55 - 0.15)) {
              bunker.cells[r * bunker.cols + c] = 0;
            }
          }
        }
        arcadeAudio.playBunkerHit();
        this.spawnBurst(
          bunker.x + hitCol * bunker.cellSize,
          bunker.y + hitRow * bunker.cellSize,
          '#34D399',
          6,
          100
        );
        return true;
      }
    }
    return false;
  }

  private erodeBunkerByBox(x: number, y: number, w: number, h: number): void {
    for (const bunker of this.bunkers) {
      const bw = bunker.cols * bunker.cellSize;
      const bh = bunker.rows * bunker.cellSize;
      if (!this.rectsOverlap(x, y, w, h, bunker.x, bunker.y, bw, bh)) continue;

      const c0 = Math.max(0, Math.floor((x - bunker.x) / bunker.cellSize));
      const c1 = Math.min(bunker.cols - 1, Math.floor((x + w - bunker.x) / bunker.cellSize));
      const r0 = Math.max(0, Math.floor((y - bunker.y) / bunker.cellSize));
      const r1 = Math.min(bunker.rows - 1, Math.floor((y + h - bunker.y) / bunker.cellSize));

      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          bunker.cells[r * bunker.cols + c] = 0;
        }
      }
    }
  }

  private spawnBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    isPlayer: boolean,
    bulletType?: EnemyBulletType
  ): void {
    for (const b of this.bullets) {
      if (!b.active) {
        b.active = true;
        b.x = x;
        b.y = y;
        b.vx = vx;
        b.vy = vy;
        b.width = isPlayer ? 4 : 6;
        b.height = isPlayer ? 15 : 14;
        b.isPlayer = isPlayer;
        b.bulletType = bulletType;
        b.animPhase = 0;
        return;
      }
    }
  }

  private spawnBurst(x: number, y: number, color: string, count: number, maxSpeed: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * maxSpeed;
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = 2.2 + Math.random() * 2.8;
        p.color = color;
        p.maxLife = 0.26 + Math.random() * 0.34;
        p.life = p.maxLife;
        p.gravity = 90;
        spawned++;
        if (spawned >= count) return;
      }
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    duration = 1.0
  ): void {
    for (const f of this.floatingTexts) {
      if (!f.active) {
        f.active = true;
        f.x = x;
        f.y = y;
        f.vy = -34;
        f.text = text;
        f.color = color;
        f.life = duration;
        f.maxLife = duration;
        return;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.96;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (const f of this.floatingTexts) {
      if (!f.active) continue;
      f.y += f.vy * dt;
      f.life -= dt;
      if (f.life <= 0) {
        f.active = false;
      }
    }
  }

  private addShake(duration: number, intensity: number): void {
    this.shakeTime = Math.max(this.shakeTime, duration);
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  private rectsOverlap(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private emitHud(force: boolean): void {
    const roundedPowerUp = this.activePowerUp
      ? this.activePowerUp === 'SHIELD'
        ? 1
        : Math.ceil(this.powerUpTimer)
      : 0;
    const waveBanner = this.waveBannerTimer > 0 ? this.wave : null;
    const signature = `${this.gameState}|${this.score}|${this.highScore}|${this.wave}|${this.lives}|${this.activePowerUp ?? 'NONE'}|${roundedPowerUp}|${waveBanner ?? 'NONE'}|${this.isNewRecord}`;

    if (!force && signature === this.lastHudSignature) return;
    this.lastHudSignature = signature;

    this.onHudChange({
      gameState: this.gameState,
      score: this.score,
      highScore: this.highScore,
      wave: this.wave,
      lives: this.lives,
      activePowerUp: this.activePowerUp,
      powerUpTimeLeft: roundedPowerUp,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      enemiesDefeated: this.enemiesDefeated,
      waveBanner,
      isNewRecord: this.isNewRecord,
    });
  }

  private render(timeSec: number): void {
    const ctx = this.ctx;
    ctx.save();

    // Deep space backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#050812');
    grad.addColorStop(0.65, '#090F22');
    grad.addColorStop(1, '#0C142B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Subtle horizon glow near defense line
    const horizonGrad = ctx.createRadialGradient(
      WORLD_WIDTH / 2,
      PLAYER_Y + 40,
      40,
      WORLD_WIDTH / 2,
      PLAYER_Y + 40,
      WORLD_WIDTH * 0.7
    );
    horizonGrad.addColorStop(0, 'rgba(34, 211, 238, 0.08)');
    horizonGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, PLAYER_Y - 180, WORLD_WIDTH, 260);

    // Camera shake transform
    if (this.shakeTime > 0 && this.gameState === 'PLAYING') {
      const mag = this.shakeIntensity * (this.shakeTime / 0.35);
      const ox = (Math.random() * 2 - 1) * mag;
      const oy = (Math.random() * 2 - 1) * mag;
      ctx.translate(ox, oy);
    }

    // Parallax starfield
    for (const star of this.stars) {
      const twinkle = 0.72 + Math.sin(star.twinklePhase) * 0.28;
      ctx.fillStyle = `rgba(226, 232, 240, ${(star.alpha * twinkle).toFixed(2)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    // Ground defense baseline
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.fillRect(24, PLAYER_Y + 40, WORLD_WIDTH - 48, 2);

    if (this.gameState === 'TITLE_MENU') {
      this.renderTitleBackdropAliens(ctx, timeSec);
      ctx.restore();
      return;
    }

    // Bunkers
    this.renderBunkers(ctx);

    // UFO
    if (this.ufo.active) {
      drawPixelSprite(ctx, UFO_SPRITE, this.ufo.x, this.ufo.y, 3.5, '#FB7185');
      // Subtle underglow
      ctx.fillStyle = 'rgba(251, 113, 133, 0.16)';
      ctx.fillRect(this.ufo.x + 6, this.ufo.y + this.ufo.height, this.ufo.width - 12, 3);
    }

    // Aliens
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      const sprite = getAlienSprite(alien.tier, this.marchFrame);
      const pixelSize = alien.width / sprite[0].length;
      const baseColor = alien.flashTimer > 0 ? '#FFFFFF' : ALIEN_COLORS[alien.tier];

      // Visible windup telegraph before shooting
      if (alien.windupTimer > 0) {
        const pulse = Math.sin(timeSec * 45) > 0;
        ctx.fillStyle = pulse ? 'rgba(253, 224, 71, 0.35)' : 'rgba(251, 113, 133, 0.25)';
        ctx.beginPath();
        ctx.arc(
          alien.x + alien.width / 2,
          alien.y + alien.height + 4,
          7,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      drawPixelSprite(ctx, sprite, alien.x, alien.y, pixelSize, baseColor);
    }

    // Power-up drop
    if (this.powerUpDrop.active) {
      this.renderPowerUpDrop(ctx);
    }

    // Player Cannon
    this.renderPlayer(ctx, timeSec);

    // Bullets
    this.renderBullets(ctx);

    // Particles
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Floating score / status popups
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of this.floatingTexts) {
      if (!f.active) continue;
      const alpha = Math.min(1, (f.life / f.maxLife) * 1.4);
      ctx.globalAlpha = alpha;
      ctx.font = '700 18px "Chakra Petch", sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;

    // Screen impact flash
    if (this.screenFlashAlpha > 0) {
      ctx.fillStyle = this.screenFlashColor;
      ctx.globalAlpha = this.screenFlashAlpha;
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderTitleBackdropAliens(ctx: CanvasRenderingContext2D, timeSec: number): void {
    // Calm atmospheric silhouetted formation drifting high & low outside center card area
    ctx.save();
    ctx.globalAlpha = 0.22;
    const driftX = Math.sin(timeSec * 0.65) * 28;
    const frame: 0 | 1 = Math.floor(timeSec * 1.4) % 2 === 0 ? 0 : 1;

    for (let c = 0; c < 7; c++) {
      const x = 96 + c * 82 + driftX;
      drawPixelSprite(ctx, getAlienSprite('squid', frame), x + 4, 86, 3.2, '#FB7185');
      drawPixelSprite(ctx, getAlienSprite('crab', frame), x, 134, 3.1, '#22D3EE');
    }

    ctx.globalAlpha = 0.35;
    const demoX = WORLD_WIDTH / 2 - 26 + Math.sin(timeSec * 1.1) * 120;
    drawPixelSprite(ctx, PLAYER_SPRITE, demoX, PLAYER_Y, 4, '#38BDF8');
    ctx.restore();
  }

  private renderBunkers(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#34D399';
    for (const bunker of this.bunkers) {
      const s = bunker.cellSize;
      for (let r = 0; r < bunker.rows; r++) {
        for (let c = 0; c < bunker.cols; c++) {
          if (bunker.cells[r * bunker.cols + c] === 1) {
            ctx.fillRect(
              Math.round(bunker.x + c * s),
              Math.round(bunker.y + r * s),
              Math.ceil(s),
              Math.ceil(s)
            );
          }
        }
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, timeSec: number): void {
    const p = this.player;
    if (p.invulnTimer > 0 && Math.floor(timeSec * 16) % 2 === 0 && p.flashTimer <= 0) {
      return;
    }

    const color =
      p.flashTimer > 0
        ? '#FFFFFF'
        : this.activePowerUp === 'DOUBLE'
          ? '#FBBF24'
          : this.activePowerUp === 'RAPID'
            ? '#34D399'
            : '#38BDF8';

    ctx.save();
    const cx = p.x + p.width / 2;
    const cy = p.y + p.height;
    ctx.translate(cx, cy);
    // Recoil squash-and-stretch
    const scaleX = 1 + p.recoilSquash * 0.14;
    const scaleY = 1 - p.recoilSquash * 0.16;
    ctx.scale(scaleX, scaleY);
    drawPixelSprite(ctx, PLAYER_SPRITE, -p.width / 2, -p.height, 4, color);

    // Thruster flame
    const flicker = 4 + Math.sin(timeSec * 42) * 2.5;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.fillRect(-5, 1, 10, flicker);
    ctx.restore();

    // Energy shield arc
    if (p.shieldActive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height * 0.55, 36, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderBullets(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      if (b.isPlayer) {
        const isBoosted = this.activePowerUp === 'DOUBLE' || this.activePowerUp === 'RAPID';
        ctx.fillStyle = isBoosted ? '#FDE047' : '#7DD3FC';
        ctx.fillRect(b.x - 2, b.y, 4, b.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(b.x - 1, b.y + 1, 2, b.height - 4);
      } else {
        if (b.bulletType === 'zigzag') {
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          const zig = Math.sin(b.animPhase) * 4;
          ctx.moveTo(b.x - zig, b.y);
          ctx.lineTo(b.x + zig, b.y + 5);
          ctx.lineTo(b.x - zig, b.y + 10);
          ctx.lineTo(b.x + zig, b.y + 14);
          ctx.stroke();
        } else if (b.bulletType === 'cross') {
          ctx.fillStyle = '#C084FC';
          const offset = Math.sin(b.animPhase) * 3;
          ctx.fillRect(b.x - 1.5, b.y, 3, 14);
          ctx.fillRect(b.x - 5, b.y + 5 + offset * 0.4, 10, 3);
        } else {
          ctx.fillStyle = '#FB7185';
          ctx.fillRect(b.x - 2, b.y, 4, 12);
          ctx.fillRect(b.x - 4.5, b.y + 10, 9, 3);
        }
      }
    }
  }

  private renderPowerUpDrop(ctx: CanvasRenderingContext2D): void {
    const d = this.powerUpDrop;
    const color =
      d.type === 'DOUBLE' ? '#FBBF24' : d.type === 'RAPID' ? '#34D399' : '#38BDF8';
    const label = d.type === 'DOUBLE' ? '2X' : d.type === 'RAPID' ? '⚡' : '◈';
    const scale = 1 + Math.sin(d.pulse) * 0.08;

    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = 'rgba(11, 16, 32, 0.92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 28, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '700 13px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
}
