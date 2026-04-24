import type {
  ClubRequest,
  CRMPlayer,
  RequestPlayerMatch,
  ActivityLog,
  Shortlist,
} from '../types';
import { generateId, now } from '../utils/helpers';

const KEYS = {
  requests: 'fch_requests',
  players: 'fch_players',
  matches: 'fch_matches',
  logs: 'fch_logs',
  shortlists: 'fch_shortlists',
} as const;

function getAll<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function setAll<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export const db = {
  requests: {
    getAll: (): ClubRequest[] => getAll<ClubRequest>(KEYS.requests),
    getById: (id: string): ClubRequest | undefined =>
      getAll<ClubRequest>(KEYS.requests).find((r) => r.id === id),
    save: (item: ClubRequest): void => {
      const items = getAll<ClubRequest>(KEYS.requests);
      const idx = items.findIndex((r) => r.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      setAll(KEYS.requests, items);
    },
    delete: (id: string): void =>
      setAll(
        KEYS.requests,
        getAll<ClubRequest>(KEYS.requests).filter((r) => r.id !== id)
      ),
  },

  players: {
    getAll: (): CRMPlayer[] => getAll<CRMPlayer>(KEYS.players),
    getById: (id: string): CRMPlayer | undefined =>
      getAll<CRMPlayer>(KEYS.players).find((p) => p.id === id),
    save: (item: CRMPlayer): void => {
      const items = getAll<CRMPlayer>(KEYS.players);
      const idx = items.findIndex((p) => p.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      setAll(KEYS.players, items);
    },
    delete: (id: string): void =>
      setAll(
        KEYS.players,
        getAll<CRMPlayer>(KEYS.players).filter((p) => p.id !== id)
      ),
  },

  matches: {
    getAll: (): RequestPlayerMatch[] =>
      getAll<RequestPlayerMatch>(KEYS.matches),
    getByRequest: (requestId: string): RequestPlayerMatch[] =>
      getAll<RequestPlayerMatch>(KEYS.matches).filter(
        (m) => m.request_id === requestId
      ),
    getByPlayer: (playerId: string): RequestPlayerMatch[] =>
      getAll<RequestPlayerMatch>(KEYS.matches).filter(
        (m) => m.player_id === playerId
      ),
    saveAll: (newMatches: RequestPlayerMatch[]): void => {
      const existing = getAll<RequestPlayerMatch>(KEYS.matches);
      for (const m of newMatches) {
        const idx = existing.findIndex((e) => e.id === m.id);
        if (idx >= 0) existing[idx] = m;
        else existing.push(m);
      }
      setAll(KEYS.matches, existing);
    },
    deleteByRequest: (requestId: string): void =>
      setAll(
        KEYS.matches,
        getAll<RequestPlayerMatch>(KEYS.matches).filter(
          (m) => m.request_id !== requestId
        )
      ),
    deleteByPlayer: (playerId: string): void =>
      setAll(
        KEYS.matches,
        getAll<RequestPlayerMatch>(KEYS.matches).filter(
          (m) => m.player_id !== playerId
        )
      ),
  },

  logs: {
    getAll: (): ActivityLog[] => getAll<ActivityLog>(KEYS.logs),
    getByEntity: (entityType: string, entityId: string): ActivityLog[] =>
      getAll<ActivityLog>(KEYS.logs).filter(
        (l) => l.entity_type === entityType && l.entity_id === entityId
      ),
    add: (log: Omit<ActivityLog, 'id' | 'created_at'>): void => {
      const items = getAll<ActivityLog>(KEYS.logs);
      items.unshift({ ...log, id: generateId(), created_at: now() });
      if (items.length > 2000) items.splice(2000);
      setAll(KEYS.logs, items);
    },
  },

  shortlists: {
    getAll: (): Shortlist[] => getAll<Shortlist>(KEYS.shortlists),
    getByRequest: (requestId: string): Shortlist[] =>
      getAll<Shortlist>(KEYS.shortlists).filter(
        (s) => s.request_id === requestId
      ),
    getByPlayer: (playerId: string): Shortlist[] =>
      getAll<Shortlist>(KEYS.shortlists).filter(
        (s) => s.player_id === playerId
      ),
    exists: (requestId: string, playerId: string): boolean =>
      getAll<Shortlist>(KEYS.shortlists).some(
        (s) => s.request_id === requestId && s.player_id === playerId
      ),
    add: (requestId: string, playerId: string, notes = ''): Shortlist => {
      const item: Shortlist = {
        id: generateId(),
        request_id: requestId,
        player_id: playerId,
        shortlist_status: 'na_lista',
        notes,
        created_at: now(),
        updated_at: now(),
      };
      const items = getAll<Shortlist>(KEYS.shortlists);
      items.push(item);
      setAll(KEYS.shortlists, items);
      return item;
    },
    save: (item: Shortlist): void => {
      const items = getAll<Shortlist>(KEYS.shortlists);
      const idx = items.findIndex((s) => s.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      setAll(KEYS.shortlists, items);
    },
    delete: (id: string): void =>
      setAll(
        KEYS.shortlists,
        getAll<Shortlist>(KEYS.shortlists).filter((s) => s.id !== id)
      ),
    deleteByPair: (requestId: string, playerId: string): void =>
      setAll(
        KEYS.shortlists,
        getAll<Shortlist>(KEYS.shortlists).filter(
          (s) => !(s.request_id === requestId && s.player_id === playerId)
        )
      ),
  },
};
