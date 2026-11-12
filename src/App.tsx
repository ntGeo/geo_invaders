import { useCallback, useEffect, useRef, useState } from 'react';
import { HudOverlay } from './components/HudOverlay';
import { ModalOverlay } from './components/ModalOverlay';
import { TitleOverlay } from './components/TitleOverlay';
import { TouchControls } from './components/TouchControls';
import { arcadeAudio } from './game/audio';
import { SpaceInvadersEngine } from './game/engine';
import {
  loadCachedLeaderboard,
  qualifiesForLeaderboard,
  saveLeaderboardScore,
  subscribeLeaderboard,
} from './game/leaderboard';
import {
  type HudSnapshot,
  type LeaderboardEntry,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  gameState: 'TITLE_MENU',
  score: 0,
  highScore: 0,
  wave: 1,
  lives: 3,
  activePowerUp: null,
  powerUpTimeLeft: 0,
  shotsFired: 0,
  shotsHit: 0,
  enemiesDefeated: 0,
  waveBanner: null,
  isNewRecord: false,
};

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0
  );
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SpaceInvadersEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() =>
    loadCachedLeaderboard()
  );
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [autoFire, setAutoFire] = useState(() => detectTouchDevice());
  const [showTouchControls, setShowTouchControls] = useState(() =>
    detectTouchDevice()
  );

  // Direct canvas touch-drag & tap state
  const dragPointerIdRef = useRef<number | null>(null);
  const dragLastClientXRef = useRef(0);
  const dragStartClientXRef = useRef(0);
  const dragStartClientYRef = useRef(0);
  const dragMovedRef = useRef(false);

  // Initialize isolated 60fps canvas engine once
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new SpaceInvadersEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.setAutoFire(autoFire);
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Subscribe to global Firestore Top 10 leaderboard
  useEffect(() => {
    const unsubscribe = subscribeLeaderboard(
      (entries) => {
        setLeaderboard(entries);
        if (entries.length > 0) {
          engineRef.current?.syncHighScore(entries[0].score);
        }
      },
      (err) => {
        console.warn('No se pudo sincronizar el ranking global:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Keep engine auto-fire preference in sync
  useEffect(() => {
    engineRef.current?.setAutoFire(autoFire);
  }, [autoFire]);

  // Ensure savedEntryId resets whenever a new run begins
  useEffect(() => {
    if (hud.gameState === 'PLAYING') {
      setSavedEntryId(null);
    }
  }, [hud.gameState]);

  const handleToggleMute = useCallback(() => {
    arcadeAudio.unlock();
    const nextMuted = arcadeAudio.toggleMute();
    setMuted(nextMuted);
  }, []);

  // Keyboard bindings + blur safety
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) return;

      const state = engine.getGameState();

      if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (state === 'PLAYING' || state === 'PAUSED') {
          e.preventDefault();
          engine.togglePause();
        }
        return;
      }

      if (state === 'TITLE_MENU') {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) {
          e.preventDefault();
          setSavedEntryId(null);
          engine.startNewGame();
          return;
        }
      }

      if (state === 'GAME_OVER') {
        // Never allow Space (shoot key) or key-repeat to dismiss the Game Over modal
        if (e.code === 'Space') {
          e.preventDefault();
          return;
        }
        if (e.code === 'Enter' && !e.repeat) {
          const needsAlias =
            qualifiesForLeaderboard(hud.score, leaderboard) && !savedEntryId;
          if (!needsAlias) {
            e.preventDefault();
            setSavedEntryId(null);
            engine.startNewGame();
          }
          return;
        }
      }

      if (
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight' ||
        e.code === 'ArrowUp' ||
        e.code === 'Space' ||
        e.code === 'KeyA' ||
        e.code === 'KeyD' ||
        e.code === 'KeyW'
      ) {
        e.preventDefault();
        arcadeAudio.unlock();
        engine.setKeyInput(e.code, true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engineRef.current?.setKeyInput(e.code, false);
    };

    const clearInputs = () => {
      engineRef.current?.clearHeldInputs();
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearInputs();
        if (engineRef.current?.getGameState() === 'PLAYING') {
          engineRef.current.togglePause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handleToggleMute, hud.score, leaderboard, savedEntryId]);

  // Direct touch-drag & tap steering on the canvas playfield
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine || engine.getGameState() !== 'PLAYING') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Automatically reveal touch controls if user interacts with touch
    if (e.pointerType === 'touch' && !showTouchControls) {
      setShowTouchControls(true);
    }

    arcadeAudio.unlock();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragPointerIdRef.current = e.pointerId;
    dragLastClientXRef.current = e.clientX;
    dragStartClientXRef.current = e.clientX;
    dragStartClientYRef.current = e.clientY;
    dragMovedRef.current = false;
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine || engine.getGameState() !== 'PLAYING') return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;

    const dxScreen = e.clientX - dragLastClientXRef.current;
    dragLastClientXRef.current = e.clientX;

    if (
      Math.hypot(
        e.clientX - dragStartClientXRef.current,
        e.clientY - dragStartClientYRef.current
      ) > 8
    ) {
      dragMovedRef.current = true;
    }

    const scaleX = WORLD_WIDTH / rect.width;
    engine.addTouchDragDelta(dxScreen * scaleX);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragPointerIdRef.current !== e.pointerId) return;
    dragPointerIdRef.current = null;
    if (!dragMovedRef.current && engineRef.current?.getGameState() === 'PLAYING') {
      engineRef.current.triggerBufferedFire();
    }
  };

  const handleStart = () => {
    setSavedEntryId(null);
    engineRef.current?.startNewGame();
  };

  const handleSaveScore = async (alias: string) => {
    const newEntry = await saveLeaderboardScore(alias, hud.score, hud.wave);
    setSavedEntryId(newEntry.id);
    setLeaderboard((prev) =>
      [...prev, newEntry]
        .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
        .slice(0, 10)
    );
  };

  const handlePause = () => {
    engineRef.current?.togglePause();
  };

  const handleReturnToTitle = () => {
    setSavedEntryId(null);
    engineRef.current?.returnToTitle();
  };

  const handleTouchButton = (
    button: 'left' | 'right' | 'fire',
    isDown: boolean
  ) => {
    engineRef.current?.setTouchButton(button, isDown);
  };

  return (
    <main className="w-screen h-[100dvh] bg-[#060913] text-slate-100 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Top Perimeter HUD */}
      <div className="w-full max-w-[720px] shrink-0">
        <HudOverlay
          hud={hud}
          muted={muted}
          showTouchControls={showTouchControls}
          onToggleMute={handleToggleMute}
          onToggleTouchControls={() => setShowTouchControls((prev) => !prev)}
          onPause={handlePause}
        />
      </div>

      {/* Isolated 60fps Canvas Arena */}
      <div
        className="relative flex-1 min-h-0 w-full flex items-center justify-center px-2 sm:px-4 pb-2"
        style={{ containerType: 'size' }}
      >
        <div
          className="relative flex items-center justify-center rounded-xl overflow-hidden border border-white/10 bg-[#050812] shadow-2xl"
          style={{
            width: `min(calc(100cqw - 16px), calc((100cqh - 8px) * ${WORLD_WIDTH} / ${WORLD_HEIGHT}))`,
            height: `min(calc(100cqh - 8px), calc((100cqw - 16px) * ${WORLD_HEIGHT} / ${WORLD_WIDTH}))`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            className="w-full h-full block touch-none"
          />

          {/* Non-occluding wave start announcement */}
          {hud.gameState === 'PLAYING' && hud.waveBanner !== null && (
            <div className="pointer-events-none absolute inset-x-0 top-[22%] flex justify-center">
              <div className="px-4 py-1.5 bg-[#0B1020]/90 border border-cyan-400/30 rounded-lg">
                <span className="font-display text-lg sm:text-xl font-bold text-cyan-300 tracking-wider font-mono-num">
                  Oleada {hud.waveBanner}
                </span>
              </div>
            </div>
          )}

          {hud.gameState === 'TITLE_MENU' && (
            <TitleOverlay
              highScore={hud.highScore}
              autoFire={autoFire}
              leaderboard={leaderboard}
              onToggleAutoFire={() => setAutoFire((v) => !v)}
              onStart={handleStart}
            />
          )}

          <ModalOverlay
            hud={hud}
            autoFire={autoFire}
            leaderboard={leaderboard}
            savedEntryId={savedEntryId}
            onSaveScore={handleSaveScore}
            onToggleAutoFire={() => setAutoFire((v) => !v)}
            onResume={handlePause}
            onRestart={handleStart}
            onReturnToTitle={handleReturnToTitle}
          />
        </div>
      </div>

      {/* Dedicated Mobile Touch Controls Dock (shown automatically on touch screens or via toggle) */}
      {showTouchControls && hud.gameState === 'PLAYING' && (
        <TouchControls
          autoFire={autoFire}
          onToggleAutoFire={() => setAutoFire((v) => !v)}
          onButtonState={handleTouchButton}
        />
      )}
    </main>
  );
}
