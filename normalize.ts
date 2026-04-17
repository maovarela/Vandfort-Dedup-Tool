// /components/match/normalize.ts
// All normalization runs client-side in the Web Worker.

const LEGAL_SUFFIXES = [
  "inc", "llc", "ltd", "gmbh", "sas", "sarl", "sa", "bv", "ag",
  "spa", "sl", "srl", "pty", "corp", "co", "nv", "oy", "as",
  "ab", "aps", "kft", "sro", "zrt", "plc", "lp", "lllp",
];

const LEGAL_SUFFIX_REGEX = new RegExp(
  `\\b(${LEGAL_SUFFIXES.join("|")})\\.?\\s*$`,
  "i"
);

/** Normalize company name: lowercase, strip punctuation, strip legal suffixes */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, " ")
    .replace(LEGAL_SUFFIX_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize domain: strip protocol, www, trailing slash, lowercase */
export function normalizeDomain(domain: string | null | undefined): string {
  if (!domain) return "";
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .trim();
}

/** Extract domain root (e.g. company-a.com → company-a) for fuzzy matching */
export function domainRoot(domain: string | null | undefined): string {
  const normalized = normalizeDomain(domain);
  return normalized.replace(/\.[a-z]{2,}$/, "").replace(/\.[a-z]{2,}$/, "");
}

/** Normalize phone to digits only (E.164 compatible) */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/** Normalize email: lowercase, strip plus-addressing */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  return email.toLowerCase().trim();
}

/** Strip plus-addressing: user+tag@domain.com → user@domain.com */
export function emailRoot(email: string | null | undefined): string {
  const normalized = normalizeEmail(email);
  return normalized.replace(/\+[^@]*(@)/, "$1");
}

/**
 * Normalize EU VAT number.
 * Strips country prefix, spaces, dots, dashes.
 * e.g. FR 12 345 678 901 → 12345678901
 */
export function normalizeVAT(vat: string | null | undefined): string {
  if (!vat) return "";
  return vat
    .toUpperCase()
    .replace(/^[A-Z]{2}/, "")   // strip 2-letter country code
    .replace(/[\s.\-]/g, "")
    .trim();
}

/**
 * Normalize SIREN (French company identifier): 9 digits.
 * SIRET is SIREN (9) + NIC (5) = 14 digits.
 * We store both, matching on SIREN prefix.
 */
export function normalizeSIREN(siren: string | null | undefined): string {
  if (!siren) return "";
  const digits = siren.replace(/\D/g, "");
  if (digits.length === 14) return digits.slice(0, 9); // SIRET → SIREN
  if (digits.length === 9) return digits;
  return "";
}

/** Normalize UK Companies House number: 8 chars, zero-padded */
export function normalizeCompaniesHouse(number: string | null | undefined): string {
  if (!number) return "";
  const clean = number.replace(/\s/g, "").toUpperCase();
  return clean.padStart(8, "0");
}

/**
 * Simple transliteration for non-Latin characters.
 * Handles common accented characters without external libraries.
 */
export function transliterate(str: string): string {
  const map: Record<string, string> = {
    "à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a",
    "è":"e","é":"e","ê":"e","ë":"e",
    "ì":"i","í":"i","î":"i","ï":"i",
    "ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o",
    "ù":"u","ú":"u","û":"u","ü":"u",
    "ý":"y","ÿ":"y",
    "ñ":"n","ç":"c","ß":"ss",
    "À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A",
    "È":"E","É":"E","Ê":"E","Ë":"E",
    "Ì":"I","Í":"I","Î":"I","Ï":"I",
    "Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O",
    "Ù":"U","Ú":"U","Û":"U","Ü":"U",
    "Ý":"Y","Ñ":"N","Ç":"C",
  };
  return str.replace(/[^\u0000-\u007E]/g, (c) => map[c] ?? c);
}

/** Compute sorted token set for fuzzy matching */
export function tokenSet(str: string): string[] {
  return str
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .sort();
}

/** Pre-process a record's fields for all match passes */
export function preprocessRecord(properties: Record<string, string | null>): Record<string, string> {
  const p = properties;
  return {
    name_normalized:     normalizeName(p.name ?? p.company ?? p.Name),
    domain_normalized:   normalizeDomain(p.domain ?? p.website),
    domain_root:         domainRoot(p.domain ?? p.website),
    phone_normalized:    normalizePhone(p.phone ?? p.Phone),
    email_normalized:    normalizeEmail(p.email ?? p.Email),
    email_root:          emailRoot(p.email ?? p.Email),
    vat_normalized:      normalizeVAT(p.vat_number ?? p.tax_number ?? p.VAT_Number__c),
    siren_normalized:    normalizeSIREN(p.siren ?? p.siret ?? p.SIREN__c ?? p.SIRET__c),
    companies_house:     normalizeCompaniesHouse(p.companies_house_number ?? p.Companies_House__c),
    country:             (p.country ?? p.Country ?? "").toLowerCase().trim(),
    company_id:          p.associatedcompanyid ?? p.AccountId ?? "",
    full_name_normalized: normalizeName(
      [(p.firstname ?? p.FirstName), (p.lastname ?? p.LastName)].filter(Boolean).join(" ")
    ),
  };
}
