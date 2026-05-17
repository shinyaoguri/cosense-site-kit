// Internal Cosense API response types. These are NOT exported from core —
// they're the wire format we're isolating from the rest of the framework.
// If the API changes, this file (plus normalize.ts) is the only place to fix.

export interface CosenseListItem {
  id: string;
  title: string;
  image: string | null;
  descriptions: string[];
  user: { id: string; name?: string; displayName?: string };
  pin: number;
  views: number;
  linked: number;
  commitId?: string;
  created: number;
  updated: number;
  accessed?: number;
  lastAccessed?: number | null;
  snapshotCreated?: number | null;
  snapshotCount?: number;
  pageRank?: number;
  linksHash?: string;
}

export interface CosenseListResponse {
  projectName: string;
  skip: number;
  limit: number;
  count: number;
  pages: CosenseListItem[];
}

export interface CosenseLine {
  id: string;
  text: string;
  userId: string;
  created: number;
  updated: number;
}

export interface CosenseUser {
  id: string;
  name?: string;
  displayName?: string;
  photo?: string;
}

export interface CosensePageResponse {
  id: string;
  title: string;
  image: string | null;
  descriptions: string[];
  user: CosenseUser;
  lastUpdateUser?: CosenseUser;
  pin: number;
  views: number;
  linked: number;
  commitId?: string;
  created: number;
  updated: number;
  persistent: boolean;
  lines: CosenseLine[];
  links: string[];
  icons?: Record<string, number>;
  files?: string[];
  collaborators?: CosenseUser[];
}
