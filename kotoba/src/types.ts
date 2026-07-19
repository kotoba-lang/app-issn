/**
 * issn kotoba — record types.
 *
 * Per ADR-2605203000 Option B (PDS XRPC). ISO 3297 International Standard
 * Serial Number registry. Identifies serials / periodicals / journals.
 * Public bibliographic standard — 3-axis clean (no payment, no PII).
 *
 * Identity hierarchy:
 *   did:web:issn.etzhayyim.com                       — controller
 *   did:web:issn.etzhayyim.com:serial:{issn}         — Serial (8-digit, no hyphen)
 *   did:web:issn.etzhayyim.com:linking:{issnL}       — ISSN-L cluster (print+online)
 */

export const ISSN_DID_PREFIX = "did:web:issn.etzhayyim.com:" as const;

export type IssnSource =
  | "issn-portal"
  | "crossref"
  | "doaj"
  | "ndl"
  | "worldcat"
  | "other";

/** Physical medium of the serial. */
export type SerialMedium = "print" | "online" | "other";

// ─── Serial tier (slice 1) ──────────────────────────────────────────

export interface SerialRecord {
  did: string;
  /** ISSN, 8 chars, no hyphen, check digit may be 'X' (canonical key). */
  issn: string;
  title: string;
  /** ISSN-L (linking ISSN) clustering print + online manifestations. */
  issnL?: string;
  publisher?: string;
  /** ISO 3166-1 alpha-2 country of registration. */
  country?: string;
  /** ISO 639-1 / 639-3. */
  language?: string;
  medium?: SerialMedium;
  startYear?: number;
  endYear?: number;
  subjects?: string[];
  /** DOAJ-listed open-access flag. */
  openAccess?: boolean;
  source: IssnSource;
  sourceUrl?: string;
  collectedAt: string;
  createdAt: string;
}

export interface SerialView extends SerialRecord {
  serialUri: string;
}

export interface RegisterSerialInput {
  issn: string;
  title: string;
  issnL?: string;
  publisher?: string;
  country?: string;
  language?: string;
  medium?: SerialMedium;
  startYear?: number;
  endYear?: number;
  subjects?: string[];
  openAccess?: boolean;
  source: IssnSource;
  sourceUrl?: string;
}

export interface RegisterSerialOutput {
  status: "registered" | "alreadyExists" | "rejected" | "invalidChecksum";
  serialUri?: string;
  did?: string;
  issn?: string;
  error?: string;
}

export interface LookupInput {
  /** ISSN (hyphen stripped automatically). */
  issn?: string;
}

export interface LookupOutput {
  serial?: SerialView;
  error?: string;
}

export interface ListSerialsInput {
  language?: string;
  country?: string;
  medium?: SerialMedium;
  source?: IssnSource;
  openAccessOnly?: boolean;
  limit?: number;
  cursor?: string;
}

export interface ListSerialsOutput {
  items: SerialView[];
  cursor?: string;
  total: number;
}

export interface CoverageInput {
  maxScan?: number;
}

export interface CoverageOutput {
  total?: number;
  byLanguage?: Record<string, number>;
  byCountry?: Record<string, number>;
  byMedium?: Record<string, number>;
  bySource?: Record<string, number>;
  openAccessCount?: number;
  truncated?: boolean;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Strip everything but digits and X; uppercase the check digit. */
export function normalizeIssn(issn: string): string {
  return issn.replace(/[^0-9Xx]/g, "").toUpperCase();
}

/**
 * ISSN checksum (ISO 3297): 8 chars, mod-11 with weights 8..2 over the first
 * 7 digits; the 8th is the check digit (0-9 or X = 10), chosen so the weighted
 * sum is ≡ 0 (mod 11).
 */
export function isValidIssn(issn: string): boolean {
  if (!/^\d{7}[\dX]$/.test(issn)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += Number(issn[i]) * (8 - i);
  }
  const last = issn[7];
  const checkValue = last === "X" ? 10 : Number(last);
  return (sum + checkValue) % 11 === 0;
}

/** Format an 8-char ISSN as the canonical NNNN-NNNN display form. */
export function formatIssn(issn: string): string {
  const n = normalizeIssn(issn);
  return n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
}

export function serialDid(issn: string): string {
  return `${ISSN_DID_PREFIX}serial:${issn}`;
}

export function serialRkey(issn: string): string {
  return `serial-${issn}`;
}

export function linkingDid(issnL: string): string {
  return `${ISSN_DID_PREFIX}linking:${normalizeIssn(issnL)}`;
}
