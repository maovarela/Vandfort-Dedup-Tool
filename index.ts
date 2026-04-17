// /components/providers/index.ts
import type { CRMRecord, MergeResult, ObjectType, Property } from "@/types";

export interface AuthResult {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  portalId?: string;      // HubSpot
  instanceUrl?: string;   // Salesforce
}

export interface CRMProvider {
  name: "hubspot" | "salesforce";

  /**
   * Initiates OAuth flow. Redirects browser to CRM login.
   * On return, exchanges code for tokens via proxy Worker.
   * Stores tokens in sessionStorage only.
   */
  authenticate(): Promise<AuthResult>;

  /**
   * Checks whether a valid token exists in sessionStorage.
   */
  isAuthenticated(): boolean;

  /**
   * Fetches records in paginated batches.
   * Yields arrays of records — caller accumulates them.
   * Respects rate limits internally (token bucket).
   */
  fetchRecords(
    objectType: ObjectType,
    fields: string[]
  ): AsyncGenerator<CRMRecord[]>;

  /**
   * Merges secondary records into primary.
   * Stores pre-merge snapshot before executing.
   * Returns structured result with CRM response.
   */
  mergeRecords(
    primaryId: string,
    secondaryIds: string[]
  ): Promise<MergeResult>;

  /**
   * Returns available properties for the given object type.
   * Used to populate the match rule field selector in Scan Config.
   */
  getAvailableProperties(objectType: ObjectType): Promise<Property[]>;

  /**
   * Clears tokens from sessionStorage.
   */
  disconnect(): void;
}
