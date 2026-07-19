import { describe, it, expect, beforeEach } from "vitest";
import { MockEtzhayyim } from "@etzhayyim/sdk-mock";
import {
  registerSerial,
  lookup,
  listSerials,
  coverage,
  isValidIssn,
  normalizeIssn,
  formatIssn,
} from "../src/index.js";

describe("issn kotoba", () => {
  let e: any;
  beforeEach(() => {
    e = new MockEtzhayyim({ did: "did:web:issn.etzhayyim.com" });
  });

  describe("checksum (ISO 3297 mod-11)", () => {
    it("accepts valid ISSNs incl. X check digit", () => {
      expect(isValidIssn("03785955")).toBe(true); // 0378-5955
      expect(isValidIssn("00280836")).toBe(true); // 0028-0836 (Nature)
      expect(isValidIssn("0317848X")).toBe(true); // X check digit
    });
    it("rejects wrong check digit + malformed", () => {
      expect(isValidIssn("03785954")).toBe(false);
      expect(isValidIssn("1234567")).toBe(false); // too short
      expect(isValidIssn("X2345678")).toBe(false); // X not in check position
    });
    it("normalizes + formats", () => {
      expect(normalizeIssn("0378-5955")).toBe("03785955");
      expect(formatIssn("03785955")).toBe("0378-5955");
      expect(formatIssn("0317848x")).toBe("0317-848X");
    });
  });

  describe("registerSerial", () => {
    const base = {
      issn: "0378-5955",
      title: "Test Journal",
      medium: "print" as const,
      language: "en",
      country: "GB",
      source: "issn-portal" as const,
    };
    it("registers a valid serial (hyphen stripped to canonical key)", async () => {
      const r = await registerSerial(e, base);
      expect(r.status).toBe("registered");
      expect(r.issn).toBe("03785955");
      expect(r.did).toContain("serial:03785955");
    });
    it("rejects an invalid checksum", async () => {
      const r = await registerSerial(e, { ...base, issn: "0378-5954" });
      expect(r.status).toBe("invalidChecksum");
      expect(r.error).toBe("invalidIssn");
    });
    it("is idempotent on issn", async () => {
      await registerSerial(e, base);
      const again = await registerSerial(e, base);
      expect(again.status).toBe("alreadyExists");
    });
    it("rejects missing fields", async () => {
      const r = await registerSerial(e, { ...base, title: "" });
      expect(r.status).toBe("rejected");
    });
  });

  describe("lookup", () => {
    it("finds by hyphenated or canonical form", async () => {
      await registerSerial(e, {
        issn: "00280836",
        title: "Nature",
        source: "crossref",
      });
      const a = await lookup(e, { issn: "0028-0836" });
      expect(a.serial?.title).toBe("Nature");
      const b = await lookup(e, { issn: "00280836" });
      expect(b.serial?.title).toBe("Nature");
    });
    it("notFound for unknown valid issn", async () => {
      const r = await lookup(e, { issn: "0317-848X" });
      expect(r.error).toBe("notFound");
    });
  });

  describe("list + coverage", () => {
    beforeEach(async () => {
      await registerSerial(e, {
        issn: "0378-5955",
        title: "J1",
        medium: "print",
        language: "en",
        country: "GB",
        source: "issn-portal",
      });
      await registerSerial(e, {
        issn: "0028-0836",
        title: "J2",
        medium: "online",
        language: "en",
        country: "GB",
        openAccess: true,
        source: "doaj",
      });
    });
    it("filters by medium", async () => {
      const online = await listSerials(e, { medium: "online" });
      expect(online.total).toBe(1);
      expect(online.items[0].title).toBe("J2");
    });
    it("filters openAccessOnly", async () => {
      const oa = await listSerials(e, { openAccessOnly: true });
      expect(oa.total).toBe(1);
    });
    it("coverage aggregates by language/medium/source + OA count", async () => {
      const cov = await coverage(e);
      expect(cov.total).toBe(2);
      expect(cov.byLanguage?.en).toBe(2);
      expect(cov.byMedium?.print).toBe(1);
      expect(cov.byMedium?.online).toBe(1);
      expect(cov.openAccessCount).toBe(1);
    });
  });
});
