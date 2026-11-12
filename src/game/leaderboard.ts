import {
  Timestamp,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { OperationType, db, handleFirestoreError } from '../firebase';
import type { LeaderboardEntry } from './types';

const LEADERBOARD_STORAGE_KEY = 'invasores_leaderboard_v1';
const HIGH_SCORE_STORAGE_KEY = 'invasores_high_score_v1';
const LAST_ALIAS_STORAGE_KEY = 'invasores_last_alias_v1';
const SCORES_COLLECTION = 'scores';
const MAX_ENTRIES = 10;

// Matches firebase-blueprint.json ScoreEntry.alias pattern: ^[A-Z0-9_\-]+$
const ALIAS_REGEX = /^[A-Z0-9_-]{3,5}$/;

export function normalizeAlias(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 5);
}

export function isValidAlias(raw: string): boolean {
  const cleaned = normalizeAlias(raw);
  return ALIAS_REGEX.test(cleaned);
}

export function loadLastAlias(): string {
  try {
    const saved = localStorage.getItem(LAST_ALIAS_STORAGE_KEY);
    return saved ? normalizeAlias(saved) : '';
  } catch {
    return '';
  }
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is LeaderboardEntry =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as LeaderboardEntry).id === 'string' &&
          typeof (item as LeaderboardEntry).alias === 'string' &&
          typeof (item as LeaderboardEntry).score === 'number' &&
          typeof (item as LeaderboardEntry).createdAt === 'number'
      )
      .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

function cacheLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
    if (entries.length > 0) {
      const existingHigh = parseInt(
        localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || '0',
        10
      );
      const topScore = Math.max(
        Number.isFinite(existingHigh) ? existingHigh : 0,
        entries[0].score
      );
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(topScore));
    }
  } catch {
    // Ignore storage quota/privacy mode errors
  }
}

export function qualifiesForLeaderboard(
  score: number,
  entries: LeaderboardEntry[]
): boolean {
  if (entries.length < MAX_ENTRIES) return true;
  const lowest = entries[entries.length - 1];
  return score > lowest.score;
}

export function subscribeLeaderboard(
  onUpdate: (entries: LeaderboardEntry[]) => void,
  onError?: (error: unknown) => void
): () => void {
  const q = query(
    collection(db, SCORES_COLLECTION),
    orderBy('score', 'desc'),
    limit(MAX_ENTRIES)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const entries: LeaderboardEntry[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          const rawCreatedAt = data.createdAt;
          let createdAtMs = Date.now();
          if (rawCreatedAt instanceof Timestamp) {
            createdAtMs = rawCreatedAt.toMillis();
          } else if (typeof rawCreatedAt === 'number') {
            createdAtMs = rawCreatedAt;
          }

          return {
            id: docSnap.id,
            alias: typeof data.alias === 'string' ? normalizeAlias(data.alias) : 'ANON',
            score: typeof data.score === 'number' ? data.score : 0,
            wave: typeof data.wave === 'number' ? data.wave : 1,
            createdAt: createdAtMs,
          };
        })
        .sort((a, b) => b.score - a.score || b.createdAt - a.createdAt)
        .slice(0, MAX_ENTRIES);

      cacheLeaderboard(entries);
      onUpdate(entries);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, SCORES_COLLECTION);
      } catch (wrapped) {
        if (onError) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function saveLeaderboardScore(
  aliasRaw: string,
  scoreRaw: number,
  waveRaw: number
): Promise<LeaderboardEntry> {
  const alias = normalizeAlias(aliasRaw);
  if (!isValidAlias(alias)) {
    throw new Error('El apodo debe tener entre 3 y 5 caracteres válidos (A-Z, 0-9, -, _).');
  }

  const score = Math.max(0, Math.min(10000000, Math.trunc(scoreRaw)));
  const wave = Math.max(1, Math.min(999, Math.trunc(waveRaw)));
  const docId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    localStorage.setItem(LAST_ALIAS_STORAGE_KEY, alias);
  } catch {
    // Ignore storage failures
  }

  const docPath = `${SCORES_COLLECTION}/${docId}`;
  try {
    await setDoc(doc(db, SCORES_COLLECTION, docId), {
      alias,
      score,
      wave,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    id: docId,
    alias,
    score,
    wave,
    createdAt: Date.now(),
  };
}

export function formatScoreDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    const d = new Date(timestamp);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }
}
