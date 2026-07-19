/**
 * issn kotoba — registry (slice 1, 4/4 canonical complete).
 *
 *   registerSerial — register a Serial record (rkey=serial-{issn}, idempotent).
 *                    Validates the ISO 3297 mod-11 check digit; rejects invalid.
 *   lookup         — by ISSN (hyphen stripped before rkey lookup).
 *   listSerials    — cursor + language/country/medium/source/openAccess filter.
 *   coverage       — aggregate counts by language/country/medium/source + OA.
 *
 * Maps to the four vendor lexicons: serial.json (record) / lookup.json /
 * list.json / coverage.json. Replaces vendor createKyselyDb()/vertex_issn_* with
 * AT PDS records (no RW).
 */

import type { Etzhayyim } from "@etzhayyim/sdk";
import {
  isValidIssn,
  normalizeIssn,
  serialDid,
  serialRkey,
  type CoverageInput,
  type CoverageOutput,
  type IssnSource,
  type ListSerialsInput,
  type ListSerialsOutput,
  type LookupInput,
  type LookupOutput,
  type RegisterSerialInput,
  type RegisterSerialOutput,
  type SerialMedium,
  type SerialRecord,
  type SerialView,
} from "./types.js";

const SERIAL_COLLECTION = "com.etzhayyim.issn.serial";

const PAGE_LIMIT = 100;
const DEFAULT_MAX_SCAN = 10_000;

export async function registerSerial(
  e: Etzhayyim,
  input: RegisterSerialInput
): Promise<RegisterSerialOutput> {
  if (!input.title || !input.source) {
    return { status: "rejected", error: "missingRequiredFields" };
  }
  const issn = normalizeIssn(input.issn ?? "");
  if (!issn) return { status: "rejected", error: "missingIssn" };
  if (!isValidIssn(issn)) {
    return { status: "invalidChecksum", error: "invalidIssn" };
  }
  const issnL = input.issnL ? normalizeIssn(input.issnL) : undefined;
  if (issnL && !isValidIssn(issnL)) {
    return { status: "invalidChecksum", error: "invalidIssnL" };
  }

  const rkey = serialRkey(issn);
  const existing = await e
    .read<SerialRecord>({ collection: SERIAL_COLLECTION, rkey })
    .catch(() => ({ records: [] }));
  if (existing.records[0]?.value) {
    return {
      status: "alreadyExists",
      serialUri: existing.records[0].uri,
      did: existing.records[0].value.did,
      issn,
    };
  }

  const did = serialDid(issn);
  const now = new Date().toISOString();
  const record: SerialRecord = {
    did,
    issn,
    title: input.title,
    issnL,
    publisher: input.publisher,
    country: input.country,
    language: input.language,
    medium: input.medium,
    startYear: input.startYear,
    endYear: input.endYear,
    subjects: input.subjects,
    openAccess: input.openAccess,
    source: input.source,
    sourceUrl: input.sourceUrl,
    collectedAt: now,
    createdAt: now,
  };
  const receipt = await e.write({
    collection: SERIAL_COLLECTION,
    record: record as unknown as Record<string, unknown>,
    rkey,
  });
  return { status: "registered", serialUri: receipt.uri, did, issn };
}

export async function lookup(
  e: Etzhayyim,
  input: LookupInput
): Promise<LookupOutput> {
  if (!input.issn) return { error: "missingIssn" };
  const issn = normalizeIssn(input.issn);
  if (!isValidIssn(issn)) return { error: "invalidIssn" };
  const resp = await e
    .read<SerialRecord>({
      collection: SERIAL_COLLECTION,
      rkey: serialRkey(issn),
    })
    .catch(() => ({ records: [] }));
  const r = resp.records[0];
  if (!r) return { error: "notFound" };
  return { serial: { ...r.value, serialUri: r.uri } };
}

export async function listSerials(
  e: Etzhayyim,
  input: ListSerialsInput = {}
): Promise<ListSerialsOutput> {
  const limit = Math.min(input.limit ?? 50, 200);
  const resp = await e.read<SerialRecord>({
    collection: SERIAL_COLLECTION,
    cursor: input.cursor,
    limit,
  });
  const items: SerialView[] = resp.records
    .filter((r) => {
      const v = r.value;
      if (input.language && v.language !== input.language) return false;
      if (input.country && v.country !== input.country) return false;
      if (input.medium && v.medium !== input.medium) return false;
      if (input.source && v.source !== input.source) return false;
      if (input.openAccessOnly && !v.openAccess) return false;
      return true;
    })
    .map((r) => ({ ...r.value, serialUri: r.uri }));
  return { items, cursor: resp.cursor, total: items.length };
}

export async function coverage(
  e: Etzhayyim,
  input: CoverageInput = {}
): Promise<CoverageOutput> {
  const maxScan = Math.min(input.maxScan ?? DEFAULT_MAX_SCAN, DEFAULT_MAX_SCAN);
  let cursor: string | undefined;
  let scanned = 0;
  const byLanguage: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byMedium: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  let openAccessCount = 0;
  while (scanned < maxScan) {
    const page = await e.read<SerialRecord>({
      collection: SERIAL_COLLECTION,
      cursor,
      limit: PAGE_LIMIT,
    });
    for (const r of page.records) {
      if (scanned >= maxScan) break;
      const v = r.value;
      if (v.language) byLanguage[v.language] = (byLanguage[v.language] ?? 0) + 1;
      if (v.country) byCountry[v.country] = (byCountry[v.country] ?? 0) + 1;
      if (v.medium) {
        byMedium[v.medium as SerialMedium] =
          (byMedium[v.medium as SerialMedium] ?? 0) + 1;
      }
      bySource[v.source as IssnSource] =
        (bySource[v.source as IssnSource] ?? 0) + 1;
      if (v.openAccess) openAccessCount += 1;
      scanned += 1;
    }
    if (scanned >= maxScan || !page.cursor || page.records.length < PAGE_LIMIT) {
      break;
    }
    cursor = page.cursor;
  }
  return {
    total: scanned,
    byLanguage,
    byCountry,
    byMedium,
    bySource,
    openAccessCount,
    truncated: scanned >= maxScan,
  };
}
