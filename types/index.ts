// /types/index.ts
// Core types shared across providers, match engine, UI, and persistence layer.

export type ObjectType = "company" | "contact";

export type CRMType = "hubspot" | "salesforce";

export interface CRMRecord {
  id: string;
  objectType: ObjectType;
  properties: Record<string, string | null>;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  name: string;
  label: string;
  type: string;
  groupName?: string;
}

export interface MergeResult {
  success: boolean;
  primaryId: string;
  mergedIds: string[];
  error?: string;
}

export type MatchPass = "exact" | "fuzzy" | "claude";

export type GroupStatus = "pending" | "merged" | "skipped";

export type ScanStatus = "running" | "complete" | "failed" | "paused";

export interface MatchRule {
  field: string;
  algorithm: "exact" | "token-set" | "jaro-winkler" | "levenshtein";
  threshold?: number;
}

export interface ScanConfig {
  crmType: CRMType;
  objectType: ObjectType;
  fields: string[];
  rules: MatchRule[];
  fuzzyThreshold: number;
  useClaude: boolean;
  claudeCapPercent: number;
}

export interface MatchResult {
  recordAId: string;
  recordBId: string;
  confidence: number;
  pass: MatchPass;
  matchRule: string;
  reasoning?: string;
}

export interface DuplicateGroup {
  id: string;
  scanId: string;
  records: CRMRecord[];
  confidence: number;
  matchRule: string;
  pass: MatchPass;
  status: GroupStatus;
  primaryRecordId?: string;
  resolvedAt?: number;
}

export interface Scan {
  id: string;
  crmType: CRMType;
  objectType: ObjectType;
  portalId: string;
  startedAt: number;
  completedAt?: number;
  totalRecords: number;
  totalGroups: number;
  status: ScanStatus;
  config: ScanConfig;
}

export interface MergeLogEntry {
  id: string;
  groupId: string;
  primaryId: string;
  mergedIds: string[];
  executedAt: number;
  crmResponse: unknown;
  status: "success" | "failed";
  error?: string;
}

export interface ClaudeCacheEntry {
  hash: string;
  match: boolean;
  confidence: number;
  reasoning: string;
  cachedAt: number;
}

export interface ScanProgress {
  scanId: string;
  phase: "fetching" | "matching" | "complete";
  recordsFetched: number;
  totalRecords: number;
  groupsFound: number;
  currentPass?: MatchPass;
}
