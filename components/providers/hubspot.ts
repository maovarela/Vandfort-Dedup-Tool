// /components/providers/hubspot.ts
// Full implementation in Session 2.
// Stub provided so TypeScript compiles from day one.

import type { CRMProvider, AuthResult } from "./index";
import type { CRMRecord, MergeResult, ObjectType, Property } from "@/types";

const HUBSPOT_CLIENT_ID = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID!;
const HUBSPOT_REDIRECT_URI = process.env.NEXT_PUBLIC_HUBSPOT_REDIRECT_URI!;
const OAUTH_PROXY_URL = process.env.NEXT_PUBLIC_OAUTH_PROXY_URL!;

const HUBSPOT_SCOPES = [
  "crm.objects.companies.read",
  "crm.objects.companies.write",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.schemas.companies.read",
  "crm.schemas.contacts.read",
].join(" ");

const TOKEN_KEY = "vf_hs_token";
const PORTAL_KEY = "vf_hs_portal";

export class HubSpotProvider implements CRMProvider {
  name = "hubspot" as const;

  authenticate(): Promise<AuthResult> {
    // Build OAuth URL and redirect
    const params = new URLSearchParams({
      client_id: HUBSPOT_CLIENT_ID,
      redirect_uri: HUBSPOT_REDIRECT_URI,
      scope: HUBSPOT_SCOPES,
      response_type: "code",
    });
    window.location.href = `https://app.hubspot.com/oauth/authorize?${params}`;
    // Never resolves — browser redirects
    return new Promise(() => {});
  }

  /**
   * Call this on the redirect callback page (/oauth/hubspot/callback).
   * Exchanges code for tokens via the stateless Cloudflare Worker proxy.
   * Stores tokens in sessionStorage only — never localStorage, never a server.
   */
  async handleCallback(code: string): Promise<AuthResult> {
    const res = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: HUBSPOT_REDIRECT_URI }),
    });
    if (!res.ok) throw new Error(`OAuth exchange failed: ${res.status}`);
    const data = await res.json();
    sessionStorage.setItem(TOKEN_KEY, data.access_token);
    sessionStorage.setItem(PORTAL_KEY, data.hub_id?.toString() ?? "");
    return {
      token: data.access_token,
      refreshToken: data.refresh_token,
      portalId: data.hub_id?.toString(),
    };
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }

  disconnect(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PORTAL_KEY);
  }

  async *fetchRecords(
    objectType: ObjectType,
    fields: string[]
  ): AsyncGenerator<CRMRecord[]> {
    // TODO: implement in Session 2
    // Paginated GET /crm/v3/objects/{objectType}
    // Token bucket: max 9 req/s
    // On 429: exponential backoff
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Not authenticated");
    let after: string | undefined;
    const hsType = objectType === "company" ? "companies" : "contacts";
    do {
      const params = new URLSearchParams({
        limit: "100",
        properties: fields.join(","),
        ...(after ? { after } : {}),
      });
      const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/${hsType}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HubSpot API error: ${res.status}`);
      const data = await res.json();
      const records: CRMRecord[] = data.results.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        objectType,
        properties: r.properties as Record<string, string | null>,
        createdAt: (r.createdAt as string) ?? "",
        updatedAt: (r.updatedAt as string) ?? "",
      }));
      yield records;
      after = data.paging?.next?.after;
    } while (after);
  }

  async mergeRecords(primaryId: string, secondaryIds: string[]): Promise<MergeResult> {
    // TODO: implement pre-merge snapshot in Session 2
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Not authenticated");
    const results: MergeResult[] = [];
    for (const secondaryId of secondaryIds) {
      const res = await fetch(
        `https://api.hubapi.com/crm/v3/objects/companies/merge`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ primaryObjectId: primaryId, objectIdToMerge: secondaryId }),
        }
      );
      results.push({
        success: res.ok,
        primaryId,
        mergedIds: [secondaryId],
        error: res.ok ? undefined : `HTTP ${res.status}`,
      });
    }
    return {
      success: results.every((r) => r.success),
      primaryId,
      mergedIds: secondaryIds,
      error: results.find((r) => !r.success)?.error,
    };
  }

  async getAvailableProperties(objectType: ObjectType): Promise<Property[]> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Not authenticated");
    const hsType = objectType === "company" ? "companies" : "contacts";
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/properties/${hsType}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`HubSpot properties error: ${res.status}`);
    const data = await res.json();
    return data.results.map((p: Record<string, string>) => ({
      name: p.name,
      label: p.label,
      type: p.type,
      groupName: p.groupName,
    }));
  }
}
