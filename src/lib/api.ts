import type { Period, Phase } from "@shared/challenge";

export interface ChallengeInfo {
  start: string;
  end: string;
  finalWeeksStart: string;
  publicMinSteps: number;
  maxWeeklySteps: number;
  timeZone: string;
  today: string;
  phase: Phase;
  currentWeek: number | null;
  periods: Period[];
}

export interface OwnEntry {
  week: number;
  steps: number;
  updatedAt: string;
}

export interface BoardRow {
  id: string;
  name: string;
  isMe: boolean;
  weeks: Record<string, number>;
  total: number;
}

export interface Leaderboard {
  phase: Phase;
  othersHidden: boolean;
  publicMinSteps: number;
  rows: BoardRow[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type TokenSource = () => Promise<string | null>;

async function request<T>(path: string, getToken?: TokenSource, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (getToken) {
    const token = await getToken();
    if (!token) throw new ApiError("Not signed in", 401);
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  challenge: () => request<ChallengeInfo>("/api/challenge"),
  me: (t: TokenSource) => request<{ displayName: string }>("/api/me", t),
  setName: (t: TokenSource, displayName: string) =>
    request<{ displayName: string }>("/api/me", t, { method: "PUT", body: JSON.stringify({ displayName }) }),
  deleteMe: (t: TokenSource) => request<{ deleted: true }>("/api/me", t, { method: "DELETE" }),
  entries: (t: TokenSource) => request<{ entries: OwnEntry[] }>("/api/me/entries", t),
  saveEntry: (t: TokenSource, week: number, steps: number) =>
    request<OwnEntry>(`/api/me/entries/${week}`, t, { method: "PUT", body: JSON.stringify({ steps }) }),
  leaderboard: (t: TokenSource) => request<Leaderboard>("/api/leaderboard", t),
};
