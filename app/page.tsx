"use client";

import { useState } from "react";
import { ArrowRight, Database, Shield } from "lucide-react";

type ComingSoon = "hubspot" | "salesforce" | null;

export default function LandingPage() {
  const [comingSoon, setComingSoon] = useState<ComingSoon>(null);

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col items-start gap-6 pt-8">
        <span className="inline-flex items-center gap-2 rounded-vf border border-vf-border bg-vf-surface px-3 py-1 text-xs text-vf-text-2">
          <Shield className="h-3.5 w-3.5 text-vf-accent" />
          Zero server storage. Runs entirely in your browser.
        </span>
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
          Find and merge duplicate
          <br />
          <span className="text-vf-accent">companies &amp; contacts</span>.
        </h1>
        <p className="max-w-2xl text-lg text-vf-text-2">
          Connect your CRM, scan for duplicates with a three-pass match engine,
          review side-by-side diffs, and merge with one click. Your records
          never leave the browser.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ProviderCard
          name="HubSpot"
          description="OAuth into your HubSpot portal. Scans companies and contacts via the CRM v3 API."
          onClick={() => setComingSoon("hubspot")}
          disabled={comingSoon !== null}
        />
        <ProviderCard
          name="Salesforce"
          description="PKCE OAuth into your Salesforce org. No client secret in the browser."
          onClick={() => setComingSoon("salesforce")}
          disabled={comingSoon !== null}
        />
      </section>

      {comingSoon && (
        <div className="rounded-vf border border-vf-border bg-vf-surface p-4 text-sm text-vf-text-2">
          <span className="text-vf-accent">
            {comingSoon === "hubspot" ? "HubSpot" : "Salesforce"} OAuth
          </span>{" "}
          wiring lands in Session {comingSoon === "hubspot" ? 2 : 6}. The
          provider stub is already in the repo at{" "}
          <code className="font-mono text-xs text-vf-text">
            components/providers/{comingSoon}.ts
          </code>
          .
        </div>
      )}

      <section className="grid gap-4 border-t border-vf-border pt-10 md:grid-cols-3">
        <Principle
          title="Client-side only"
          body="Records are fetched directly from HubSpot or Salesforce to your browser. Nothing is stored on Vandfort infrastructure."
        />
        <Principle
          title="Tokens in sessionStorage"
          body="OAuth tokens live only for the tab session. Close the tab and they're gone."
        />
        <Principle
          title="Three-pass matcher"
          body="Deterministic exact matches, fuzzy name/domain/address, and Claude for the ambiguous 70–85% zone."
        />
      </section>
    </div>
  );
}

function ProviderCard({
  name,
  description,
  onClick,
  disabled,
}: {
  name: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-4 rounded-vf border border-vf-border bg-vf-surface p-6 text-left transition-colors hover:border-vf-border-h disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-vf bg-vf-surface-2 text-vf-accent">
        <Database className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold">Connect {name}</h2>
        <p className="text-sm text-vf-text-2">{description}</p>
      </div>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-vf-accent transition-transform group-hover:translate-x-0.5">
        Continue <ArrowRight className="h-4 w-4" />
      </span>
    </button>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-vf-text">
        {title}
      </h3>
      <p className="text-sm text-vf-text-2">{body}</p>
    </div>
  );
}
