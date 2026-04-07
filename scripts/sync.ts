/**
 * RES CSV Sync Script
 *
 * Downloads the complete Czech business registry (RES) from ČSÚ open data
 * and imports s.r.o., a.s., k.s., v.o.s. companies into SQLite.
 *
 * Source: https://opendata.csu.gov.cz/soubory/od/od_org03/res_data.csv
 * Updated by ČSÚ twice monthly (15th and last day).
 * ~3.6M total records, ~600k after filtering by legal form.
 *
 * Usage:
 *   npx tsx scripts/sync.ts
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const prisma = new PrismaClient();

const CSV_URL =
  "https://opendata.csu.gov.cz/soubory/od/od_org03/res_data.csv";
const CSV_FILE = path.join(__dirname, "..", "res_data.csv");
const LOG_FILE = path.join(__dirname, "..", "sync.log");

// Legal forms to import
const LEGAL_FORMS = new Set(["112", "121", "118", "117"]);
const LEGAL_FORM_NAMES: Record<string, string> = {
  "112": "s.r.o.",
  "121": "a.s.",
  "118": "k.s.",
  "117": "v.o.s.",
};

const BATCH_SIZE = 500;

// --- Logging ---
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

// --- CSV Parsing ---
// Simple CSV parser that handles quoted fields with commas
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// --- Download CSV ---
async function downloadCSV(): Promise<void> {
  if (fs.existsSync(CSV_FILE)) {
    const stat = fs.statSync(CSV_FILE);
    const ageHours =
      (Date.now() - stat.mtimeMs) / 1000 / 60 / 60;
    if (ageHours < 24) {
      log(
        `CSV file exists (${(stat.size / 1024 / 1024).toFixed(1)} MB, ${ageHours.toFixed(1)}h old), skipping download`
      );
      return;
    }
  }

  log("Downloading RES CSV from ČSÚ...");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(CSV_FILE, Buffer.from(buffer));
  log(
    `Downloaded ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB`
  );
}

// --- Build address from CSV fields ---
function buildAddress(fields: {
  ulice: string;
  cdom: string;
  cor: string;
  cobce: string;
  obec: string;
  psc: string;
}): string {
  const parts: string[] = [];

  if (fields.ulice) {
    let street = fields.ulice;
    if (fields.cdom) {
      street += ` ${fields.cdom}`;
      if (fields.cor) street += `/${fields.cor}`;
    }
    parts.push(street);
  }

  if (fields.cobce && fields.cobce !== fields.obec) {
    parts.push(fields.cobce);
  }

  if (fields.psc || fields.obec) {
    parts.push(
      [fields.psc, fields.obec].filter(Boolean).join(" ")
    );
  }

  return parts.join(", ");
}

// --- Main import ---
async function main() {
  const startTime = Date.now();
  log("=== RES CSV Sync ===");
  log(
    `Legal forms: ${[...LEGAL_FORMS].map((f) => LEGAL_FORM_NAMES[f] || f).join(", ")}`
  );

  // Step 1: Download CSV
  await downloadCSV();

  // Step 2: Parse and import
  log("Parsing CSV and importing...");

  const fileStream = fs.createReadStream(CSV_FILE, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headerParsed = false;
  let colMap: Record<string, number> = {};
  let batch: Array<{
    ico: string;
    name: string;
    address: string;
    city: string;
    legalForm: string;
    dateCreated: Date | null;
    dateDeleted: Date | null;
  }> = [];
  let totalProcessed = 0;
  let totalImported = 0;
  let totalSkipped = 0;
  let lineNum = 0;

  const counts: Record<string, number> = {};

  for await (const line of rl) {
    lineNum++;

    // Parse header
    if (!headerParsed) {
      const headers = line.split(",");
      headers.forEach((h, i) => {
        colMap[h.trim()] = i;
      });
      headerParsed = true;
      continue;
    }

    // Parse line
    const fields = parseCSVLine(line);
    const forma = fields[colMap["FORMA"]];

    // Filter by legal form
    if (!LEGAL_FORMS.has(forma)) {
      totalSkipped++;
      continue;
    }

    const ico = fields[colMap["ICO"]];
    const name = fields[colMap["FIRMA"]];

    // Skip invalid records
    if (!ico || !name) {
      totalSkipped++;
      continue;
    }

    // Skip terminated companies
    const datZan = fields[colMap["DDATZAN"]];
    if (datZan) {
      totalSkipped++;
      continue;
    }

    const datVzn = fields[colMap["DDATVZN"]];
    const obec = fields[colMap["OBEC_TEXT"]] || "";
    const cobce = fields[colMap["COBCE_TEXT"]] || "";
    const ulice = fields[colMap["ULICE_TEXT"]] || "";
    const cdom = fields[colMap["CDOM"]] || "";
    const cor = fields[colMap["COR"]] || "";
    const psc = fields[colMap["PSC"]] || "";
    const textadr = fields[colMap["TEXTADR"]] || "";

    const address =
      textadr || buildAddress({ ulice, cdom, cor, cobce, obec, psc });

    batch.push({
      ico,
      name,
      address,
      city: obec,
      legalForm: forma,
      dateCreated: datVzn ? new Date(datVzn) : null,
      dateDeleted: null,
    });

    counts[forma] = (counts[forma] || 0) + 1;

    // Flush batch
    if (batch.length >= BATCH_SIZE) {
      await flushBatch(batch);
      totalImported += batch.length;
      batch = [];

      if (totalImported % 10000 === 0) {
        log(`  Imported ${totalImported} companies...`);
      }
    }

    totalProcessed++;
  }

  // Flush remaining
  if (batch.length > 0) {
    await flushBatch(batch);
    totalImported += batch.length;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  log("");
  log("=== Sync Complete ===");
  log(`Time: ${elapsed}s`);
  log(`CSV lines processed: ${lineNum}`);
  log(`Companies imported: ${totalImported}`);
  log(`Records skipped: ${totalSkipped}`);
  log("By legal form:");
  for (const [forma, count] of Object.entries(counts).sort(
    (a, b) => b[1] - a[1]
  )) {
    log(`  ${LEGAL_FORM_NAMES[forma] || forma} (${forma}): ${count}`);
  }

  // Verify DB
  const dbCount = await prisma.company.count({
    where: { legalForm: { in: [...LEGAL_FORMS] } },
  });
  log(`Companies in DB: ${dbCount}`);

  await prisma.$disconnect();
}

async function flushBatch(
  batch: Array<{
    ico: string;
    name: string;
    address: string;
    city: string;
    legalForm: string;
    dateCreated: Date | null;
    dateDeleted: Date | null;
  }>
) {
  // Use individual upserts in a transaction for SQLite compatibility
  await prisma.$transaction(
    batch.map((c) =>
      prisma.company.upsert({
        where: { ico: c.ico },
        update: {
          name: c.name,
          address: c.address,
          city: c.city,
          legalForm: c.legalForm,
          dateCreated: c.dateCreated,
          dateDeleted: c.dateDeleted,
          cachedAt: new Date(),
        },
        create: {
          ico: c.ico,
          name: c.name,
          address: c.address,
          city: c.city,
          legalForm: c.legalForm,
          dateCreated: c.dateCreated,
          dateDeleted: c.dateDeleted,
          cachedAt: new Date(),
        },
      })
    )
  );
}

main().catch(async (e) => {
  log(`Sync failed: ${e}`);
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
