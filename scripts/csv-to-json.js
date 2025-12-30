#!/usr/bin/env node
/**
 * Convert race results CSV to JSON array matching the field names used in 2025.json.
 *
 * Usage:
 *   node csv-to-json.js input.csv [output.json] [--pretty] [--verbose]
 *
 * Notes:
 * - Output is a top-level JSON array.
 * - Missing/blank values are omitted (field not present).
 * - Name is converted from "Lastname, Firstname" -> "Firstname Lastname".
 * - Includes a HEADER_ALIASES map so you can tweak headings easily if this year's CSV differs.
 */

const fs = require("fs");
const path = require("path");

// ---- 1) EDITABLE: map output field -> possible CSV header names ----
// If this year's CSV uses different column names, add them here.
const HEADER_ALIASES = {
  "Position": ["Position", "Place", "Pos", "Overall Place", "Overall"],

  "Bib no.": ["Bib no.", "Bib No.", "Bib No", "Bib", "Bib#", "Bib #", "BIB"],

  "Name": ["Name", "Runner", "Runner Name", "Athlete", "Participant"],

  "Category": ["Category", "Cat", "AG", "Age Group", "AgeGroup", "Class"],

  "Club": ["Club", "Team", "Affiliation"],

  // Optional column (only some years / exports)
  "Lap of Lough": ["Lap of Lough", "Lap Time", "LapTime", "LAP Time", "LAPTime", "Lap"],

  "Chip Time": ["Chip Time", "ChipTime", "Net Time", "NetTime", "Time", "Result", "Chip"],

  "Gun Time": ["Gun Time", "GunTime", "Gross Time", "GrossTime", "Gun"],
};

// Output field order (for nicer JSON diffs / readability)
const OUTPUT_FIELDS = [
  "Position",
  "Bib no.",
  "Name",
  "Category",
  "Club",
  "Lap of Lough",
  "Chip Time",
  "Gun Time",
];

// ---- 2) Small CSV parser (handles quotes & commas in quoted fields) ----
function parseCsv(text) {
  // Remove BOM if present
  text = text.replace(/^\uFEFF/, "");

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // Escaped quote: ""
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }

  // Final field/row (even if file doesn't end with newline)
  row.push(field);
  rows.push(row);

  // Normalize (trim, strip CR), and drop trailing all-empty rows
  const cleanRow = (r) =>
    r.map((v) => String(v ?? "").replace(/\r/g, "").trim());

  const cleaned = rows.map(cleanRow);
  while (cleaned.length && cleaned[cleaned.length - 1].every((v) => v === "")) {
    cleaned.pop();
  }

  const headers = cleaned.shift() || [];
  const dataRows = cleaned;

  return { headers, dataRows };
}

function normalizeHeader(h) {
  return String(h ?? "")
    .toLowerCase()
    .trim()
    // remove common punctuation/separators so "Bib no." and "Bib No" match
    .replace(/[.\s\/#_-]+/g, "");
}

function buildIndexByOutputField(headers) {
  const normToIndex = new Map();
  headers.forEach((h, i) => {
    const key = normalizeHeader(h);
    // Only keep the first occurrence
    if (!normToIndex.has(key)) normToIndex.set(key, i);
  });

  const indexByOut = {};
  for (const outField of OUTPUT_FIELDS) {
    const aliases = HEADER_ALIASES[outField] || [outField];
    for (const a of aliases) {
      const idx = normToIndex.get(normalizeHeader(a));
      if (idx !== undefined) {
        indexByOut[outField] = idx;
        break;
      }
    }
  }
  return indexByOut;
}

// ---- 3) Value normalization helpers ----
function cleanValue(v) {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;

  const lowered = s.toLowerCase();
  if (lowered === "n/a" || lowered === "na" || lowered === "null") return undefined;
  if (s === "#REF!") return undefined;

  return s;
}

function normalizeInt(v) {
  const s = cleanValue(v);
  if (!s) return undefined;

  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return undefined;

  const n = Number(digits);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normalizes times to H:MM:SS where possible.
 * Examples:
 *   "25:15"  -> "0:25:15"
 *   "05:59"  -> "0:05:59"
 *   "0:25:15" -> "0:25:15"
 *   "01:05:10" -> "1:05:10"
 *
 * If it doesn't look like a time, returns the original string.
 */
function normalizeTime(v) {
  const s = cleanValue(v);
  if (!s) return undefined;

  const parts = s.split(":");

  const pad2 = (x) => String(x).padStart(2, "0");

  // mm:ss
  if (parts.length === 2) {
    let [m, sec] = parts;
    if (!/^\d+$/.test(m) || !/^\d{1,2}(\.\d+)?$/.test(sec)) return s;

    m = pad2(m);
    if (sec.includes(".")) {
      const [secInt, frac] = sec.split(".");
      sec = pad2(secInt) + "." + frac;
    } else {
      sec = pad2(sec);
    }
    return `0:${m}:${sec}`;
  }

  // h:mm:ss
  if (parts.length === 3) {
    let [h, m, sec] = parts;
    if (!/^\d+$/.test(h) || !/^\d+$/.test(m) || !/^\d{1,2}(\.\d+)?$/.test(sec)) return s;

    h = String(Number(h)); // strip leading zeros
    m = pad2(m);
    if (sec.includes(".")) {
      const [secInt, frac] = sec.split(".");
      sec = pad2(secInt) + "." + frac;
    } else {
      sec = pad2(sec);
    }
    return `${h}:${m}:${sec}`;
  }

  return s;
}

function normalizeName(v) {
  const s = cleanValue(v);
  if (!s) return undefined;

  // "Lastname, Firstname [Middlename]" -> "Firstname [Middlename] Lastname"
  if (s.includes(",")) {
    const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const last = parts[0];
      const first = parts.slice(1).join(" ");
      return `${first} ${last}`.replace(/\s+/g, " ").trim();
    }
  }

  return s.replace(/\s+/g, " ").trim();
}

// ---- 4) Conversion ----
function convertCsvToJsonArray(csvText, { verbose = false } = {}) {
  const { headers, dataRows } = parseCsv(csvText);
  if (!headers.length) throw new Error("CSV appears to have no header row.");

  const indexByOut = buildIndexByOutputField(headers);

  if (verbose) {
    console.error("Detected headers:", headers);
    console.error("Matched columns:");
    for (const f of OUTPUT_FIELDS) {
      const idx = indexByOut[f];
      if (idx === undefined) console.error(`  - ${f}: (not found)`);
      else console.error(`  - ${f}: "${headers[idx]}" (col ${idx})`);
    }
  }

  const getCell = (row, outField) => {
    const idx = indexByOut[outField];
    if (idx === undefined) return undefined;
    return row[idx];
  };

  const results = [];

  for (const row of dataRows) {
    const obj = {};

    // Build in the output field order (and omit missing values)
    for (const field of OUTPUT_FIELDS) {
      const raw = getCell(row, field);

      let value;
      if (field === "Position" || field === "Bib no.") value = normalizeInt(raw);
      else if (field === "Name") value = normalizeName(raw);
      else if (field === "Chip Time" || field === "Gun Time" || field === "Lap of Lough")
        value = normalizeTime(raw);
      else value = cleanValue(raw);

      if (value !== undefined) obj[field] = value;
    }

    // Skip completely empty rows
    if (Object.keys(obj).length === 0) continue;

    // Optional: skip obvious footer rows that lack key identifying fields
    if (!("Position" in obj) && !("Name" in obj) && !("Bib no." in obj)) continue;

    results.push(obj);
  }

  return results;
}

// ---- 5) CLI ----
function main() {
  const args = process.argv.slice(2);
  const pretty = args.includes("--pretty") || args.includes("-p");
  const verbose = args.includes("--verbose") || args.includes("-v");

  const files = args.filter((a) => !a.startsWith("-"));
  const inPath = files[0];
  let outPath = files[1];

  if (!inPath) {
    console.error("Usage: node csv-to-json.js input.csv [output.json] [--pretty] [--verbose]");
    process.exit(1);
  }

  if (!outPath) {
    const ext = path.extname(inPath);
    outPath = inPath.slice(0, ext.length ? -ext.length : undefined) + ".json";
  }

  const csvText = fs.readFileSync(inPath, "utf8");
  const arr = convertCsvToJsonArray(csvText, { verbose });

  const jsonText = JSON.stringify(arr, null, pretty ? 2 : 0) + "\n";
  fs.writeFileSync(outPath, jsonText, "utf8");

  console.error(`Wrote ${arr.length} records to ${outPath}`);
}

if (require.main === module) main();

module.exports = { convertCsvToJsonArray, HEADER_ALIASES };
