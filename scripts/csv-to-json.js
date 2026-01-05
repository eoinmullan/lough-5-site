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

// ---- Standard categories (canonical format) ----
const STANDARD_CATEGORIES = [
  "MU19", "MO", "M35", "M40", "M45", "M50", "M55", "M60", "M65", "M70", "M75", "M80", "M85", "M90",
  "FU19", "FO", "F35", "F40", "F45", "F50", "F55", "F60", "F65", "F70", "F75", "F80", "F85", "F90",
];

// ---- Category aliases: map non-standard formats to standard categories ----
// Add entries here when you encounter new category naming formats in CSV files
const CATEGORY_ALIASES = {
  // Male Under 19 variants
  "MaleU19": "MU19",
  "Male U19": "MU19",
  "MaleUnder19": "MU19",
  "Male Under 19": "MU19",
  "MJunior": "MU19",
  "Male Junior": "MU19",
  "MJun": "MU19",

  // Female Under 19 variants
  "FemaleU19": "FU19",
  "Female U19": "FU19",
  "FemaleUnder19": "FU19",
  "Female Under 19": "FU19",
  "FJunior": "FU19",
  "Female Junior": "FU19",
  "FJun": "FU19",

  // Male Open variants
  "MaleOpen": "MO",
  "Male Open": "MO",
  "MOpen": "MO",
  "Men Open": "MO",
  "MSenior": "MO",
  "Male Senior": "MO",
  "MSen": "MO",

  // Female Open variants
  "FemaleOpen": "FO",
  "Female Open": "FO",
  "FOpen": "FO",
  "Women Open": "FO",
  "FSenior": "FO",
  "Female Senior": "FO",
  "FSen": "FO",

  // Male age groups with spaces
  "Male 35": "M35",
  "Male 40": "M40",
  "Male 45": "M45",
  "Male 50": "M50",
  "Male 55": "M55",
  "Male 60": "M60",
  "Male 65": "M65",
  "Male 70": "M70",
  "Male 75": "M75",
  "Male 80": "M80",
  "Male 85": "M85",
  "Male 90": "M90",

  // Male age groups without spaces
  "Male35": "M35",
  "Male40": "M40",
  "Male45": "M45",
  "Male50": "M50",
  "Male55": "M55",
  "Male60": "M60",
  "Male65": "M65",
  "Male70": "M70",
  "Male75": "M75",
  "Male80": "M80",
  "Male85": "M85",
  "Male90": "M90",

  // "Men" variants
  "Men 35": "M35",
  "Men 40": "M40",
  "Men 45": "M45",
  "Men 50": "M50",
  "Men 55": "M55",
  "Men 60": "M60",
  "Men 65": "M65",
  "Men 70": "M70",
  "Men 75": "M75",
  "Men 80": "M80",
  "Men 85": "M85",
  "Men 90": "M90",

  // Female age groups with spaces
  "Female 35": "F35",
  "Female 40": "F40",
  "Female 45": "F45",
  "Female 50": "F50",
  "Female 55": "F55",
  "Female 60": "F60",
  "Female 65": "F65",
  "Female 70": "F70",
  "Female 75": "F75",
  "Female 80": "F80",
  "Female 85": "F85",
  "Female 90": "F90",

  // Female age groups without spaces
  "Female35": "F35",
  "Female40": "F40",
  "Female45": "F45",
  "Female50": "F50",
  "Female55": "F55",
  "Female60": "F60",
  "Female65": "F65",
  "Female70": "F70",
  "Female75": "F75",
  "Female80": "F80",
  "Female85": "F85",
  "Female90": "F90",

  // "Women" variants
  "Women 35": "F35",
  "Women 40": "F40",
  "Women 45": "F45",
  "Women 50": "F50",
  "Women 55": "F55",
  "Women 60": "F60",
  "Women 65": "F65",
  "Women 70": "F70",
  "Women 75": "F75",
  "Women 80": "F80",
  "Women 85": "F85",
  "Women 90": "F90",
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
  let s = String(v).trim();
  if (!s) return undefined;

  const lowered = s.toLowerCase();
  if (lowered === "n/a" || lowered === "na" || lowered === "null") return undefined;
  if (s === "#REF!") return undefined;

  // Normalize Unicode quotation marks to ASCII
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'");  // Single quotes
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"');  // Double quotes

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

function normalizeCategory(v) {
  const s = cleanValue(v);
  if (!s) return undefined;

  // Check if already a standard category
  if (STANDARD_CATEGORIES.includes(s)) {
    return s;
  }

  // Check if there's a mapping
  if (CATEGORY_ALIASES[s]) {
    return CATEGORY_ALIASES[s];
  }

  // Unrecognized category - this is an error
  throw new Error(
    `Unrecognized category: "${s}"\n\n` +
    `This category must be added to CATEGORY_ALIASES in csv-to-json.js.\n` +
    `Standard categories are: ${STANDARD_CATEGORIES.join(", ")}`
  );
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
      else if (field === "Category") value = normalizeCategory(raw);
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
