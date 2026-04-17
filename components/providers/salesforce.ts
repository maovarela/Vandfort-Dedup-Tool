// /components/providers/salesforce.ts
// Salesforce uses PKCE — no Worker needed, no client_secret in browser.
// Full implementation in Session 6.

import type { CRMProvider, AuthResult } from "./index";
import type { CRMRecord, MergeResult, ObjectType, Property } from "@/types";

const SF_CLIENT_ID = process.env.NEXT_PUBLIC_SF_CLIENT_ID!;
const SF_REDIRECT_URI = process.env.NEXT_PUBLIC_SF_REDIRECT_URI!;
const SF_AUTH_URL = "https://login.salesforce.com/services/oauth2/authorize";
const SF_TOKEN_URL = "https://login.salesforce.com/services/oauth2/token";

const TOKEN_KEY = "vf_sf_token";
const INSTANCE_KEY = "vf_sf_instance";
const VERIFIER_KEY = "vf_sf_verifier";

export class SalesforceProvider implements CRMProvider {
  name = "salesforce" as const;

  private async generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    const verifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    const encoded = new TextEncoder().encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return { verifier, challenge };
  }

  async authenticate(): Promise<AuthResult> {
    const { verifier, challenge } = await this.generatePKCE();
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SF_CLIENT_ID,
      redirect_uri: SF_REDIRECT_URI,
      code_challenge: challenge,
      code_challenge_method: "S256",
      scope: "api refresh_token",
    });
    window.location.href = `${SF_AUTH_URL}?${params}`;
    return new Promise(() => {});
  }

  async handleCallback(code: string): Promise<AuthResult> {
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) throw new Error("PKCE verifier missing — restart OAuth flow");
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: SF_CLIENT_ID,
      redirect_uri: SF_REDIRECT_URI,
      code,
      code_verifier: verifier,
    });
    const res = await fetch(SF_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) throw new Error(`Salesforce token exchange failed: ${res.status}`);
    const data = await res.json();
    sessionStorage.setItem(TOKEN_KEY, data.access_token);
    sessionStorage.setItem(INSTANCE_KEY, data.instance_url);
    sessionStorage.removeItem(VERIFIER_KEY);
    return {
      token: data.access_token,
      instanceUrl: data.instance_url,
    };
  }

  isAuthenticated(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  }

  disconnect(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(INSTANCE_KEY);
  }

  async *fetchRecords(
    objectType: ObjectType,
    fields: string[]
  ): AsyncGenerator<CRMRecord[]> {
    // TODO: implement in Session 6
    // Use Salesforce Bulk API 2.0 for orgs > 100K records
    // Handle managed package namespaced fields
    const token = sessionStorage.getItem(TOKEN_KEY);
    const instanceUrl = sessionStorage.getItem(INSTANCE_KEY);
    if (!token || !instanceUrl) throw new Error("Not authenticated");
    const sfObject = objectType === "company" ? "Account" : "Contact";
    const soql = `SELECT Id,${fields.join(",")},CreatedDate,LastModifiedDate FROM ${sfObject} LIMIT 200`;
    const res = await fetch(
      `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Salesforce query error: ${res.status}`);
    const data = await res.json();
    yield data.records.map((r: Record<string, unknown>) => ({
      id: r.Id as string,
      objectType,
      properties: r as Record<string, string | null>,
      createdAt: r.CreatedDate as string,
      updatedAt: r.LastModifiedDate as string,
    }));
  }

  async mergeRecords(primaryId: string, secondaryIds: string[]): Promise<MergeResult> {
    // TODO: implement in Session 6
    // Salesforce merges up to 2 records at a time
    const token = sessionStorage.getItem(TOKEN_KEY);
    const instanceUrl = sessionStorage.getItem(INSTANCE_KEY);
    if (!token || !instanceUrl) throw new Error("Not authenticated");
    return { success: false, primaryId, mergedIds: secondaryIds, error: "Not yet implemented" };
  }

  async getAvailableProperties(objectType: ObjectType): Promise<Property[]> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const instanceUrl = sessionStorage.getItem(INSTANCE_KEY);
    if (!token || !instanceUrl) throw new Error("Not authenticated");
    const sfObject = objectType === "company" ? "Account" : "Contact";
    const res = await fetch(
      `${instanceUrl}/services/data/v60.0/sobjects/${sfObject}/describe`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error(`Salesforce describe error: ${res.status}`);
    const data = await res.json();
    return data.fields.map((f: Record<string, string>) => ({
      name: f.name,
      label: f.label,
      type: f.type,
    }));
  }
}
