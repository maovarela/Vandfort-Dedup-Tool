// /lib/db.ts
// IndexedDB schema and helpers. Full wiring lands in Session 4 —
// this file is the schema source of truth from Session 1 onward.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ClaudeCacheEntry,
  DuplicateGroup,
  MergeLogEntry,
  Scan,
} from "@/types";

export const DB_NAME = "vandfort-dedup";
export const DB_VERSION = 1;

export interface VandfortDB extends DBSchema {
  scans: {
    key: string;
    value: Scan;
  };
  groups: {
    key: string;
    value: DuplicateGroup;
    indexes: { "by-scan": string; "by-status": string };
  };
  mergeLog: {
    key: string;
    value: MergeLogEntry;
    indexes: { "by-group": string };
  };
  claudeCache: {
    key: string;
    value: ClaudeCacheEntry;
  };
}

let dbPromise: Promise<IDBPDatabase<VandfortDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<VandfortDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in the browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<VandfortDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("scans")) {
          db.createObjectStore("scans", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("groups")) {
          const groups = db.createObjectStore("groups", { keyPath: "id" });
          groups.createIndex("by-scan", "scanId");
          groups.createIndex("by-status", "status");
        }
        if (!db.objectStoreNames.contains("mergeLog")) {
          const log = db.createObjectStore("mergeLog", { keyPath: "id" });
          log.createIndex("by-group", "groupId");
        }
        if (!db.objectStoreNames.contains("claudeCache")) {
          db.createObjectStore("claudeCache", { keyPath: "hash" });
        }
      },
    });
  }
  return dbPromise;
}

export async function clearAllStores(): Promise<{
  scans: number;
  groups: number;
  mergeLog: number;
  claudeCache: number;
}> {
  const db = await getDB();
  const counts = {
    scans: await db.count("scans"),
    groups: await db.count("groups"),
    mergeLog: await db.count("mergeLog"),
    claudeCache: await db.count("claudeCache"),
  };
  await Promise.all([
    db.clear("scans"),
    db.clear("groups"),
    db.clear("mergeLog"),
    db.clear("claudeCache"),
  ]);
  return counts;
}

export async function getStoreCounts(): Promise<{
  scans: number;
  groups: number;
  mergeLog: number;
  claudeCache: number;
}> {
  const db = await getDB();
  return {
    scans: await db.count("scans"),
    groups: await db.count("groups"),
    mergeLog: await db.count("mergeLog"),
    claudeCache: await db.count("claudeCache"),
  };
}
