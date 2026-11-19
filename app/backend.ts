// WonderBoy backend.
// Reads the OBJECTS / INFO list from "00 WonderBoy.xlsx" and replaces every Object
// with its Info in every .docx file in the same folder.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { DOMParser, XMLSerializer, Document, Element, Node } from "@xmldom/xmldom";

export const EXCEL_FILE_NAME = "00 WonderBoy.xlsx";
const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

// Parts of a .docx that can hold text: body (incl. tables and text boxes), headers, footers, notes.
const WORD_PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// ---------------------------------------------------------------- Types

export interface Settings {
  matchCase: boolean; // true: "(APPLICANT)" does not match "(Applicant)"
  includeParentheses: boolean; // false: match "APPLICANT" instead of "(APPLICANT)"
}

export interface Entry {
  object: string; // e.g. "(APPLICANT)"
  info: string; // e.g. "John Smith, Jr."
}

export interface Report {
  changedFiles: { file: string; replacements: number }[];
  unchangedFiles: string[];
  notFound: string[]; // Objects not found in any document
  emptyInfo: string[]; // Objects skipped because their Info is empty
  errors: { file: string; reason: string }[];
}

// ---------------------------------------------------------------- Settings

const DEFAULT_SETTINGS: Settings = { matchCase: false, includeParentheses: true };

function settingsPath(): string {
  const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "WonderBoy", "settings.json");
}

// Returns the settings used last time, or the defaults on first run.
export function loadSettings(): Settings {
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return {
      matchCase: typeof saved.matchCase === "boolean" ? saved.matchCase : DEFAULT_SETTINGS.matchCase,
      includeParentheses:
        typeof saved.includeParentheses === "boolean" ? saved.includeParentheses : DEFAULT_SETTINGS.includeParentheses,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
}

// ---------------------------------------------------------------- Main entry point

// Fills in every .docx in `folder`. Throws an Error with a plain message if it can't start at all
// (missing Excel file, missing header, no Word files). Problems with single files go in the report.
export async function runWonderBoy(folder: string, settings: Settings): Promise<Report> {
  const entries = readWonderBoy(folder);

  const wordFiles = fs
    .readdirSync(folder)
    .filter((name) => name.toLowerCase().endsWith(".docx") && !name.startsWith("~$"))
    .sort();
  if (wordFiles.length === 0) throw new Error("There are no Word (.docx) files in this folder.");

  const toReplace = entries.filter((e) => e.info !== "");
  const report: Report = {
    changedFiles: [],
    unchangedFiles: [],
    notFound: [],
    emptyInfo: unique(entries.filter((e) => e.info === "").map((e) => e.object)),
    errors: [],
  };

  const matcher = makeMatcher(toReplace, settings);
  const foundObjects = new Set<string>();

  for (const file of wordFiles) {
    try {
      const counts = await fillDocument(path.join(folder, file), matcher);
      const total = countTotal(counts);
      counts.forEach((_, object) => foundObjects.add(object));
      if (total > 0) report.changedFiles.push({ file, replacements: total });
      else report.unchangedFiles.push(file);
    } catch (error) {
      report.errors.push({ file, reason: explainError(error) });
    }
  }

  report.notFound = unique(toReplace.map((e) => e.object).filter((object) => !foundObjects.has(object)));
  return report;
}

// Plain-text version of the report, for showing in a message box.
export function formatReport(report: Report): string {
  const lines: string[] = [];

  if (report.changedFiles.length > 0) {
    lines.push("Documents filled in:");
    for (const f of report.changedFiles) {
      lines.push(`  ${f.file}  (${f.replacements} replacement${f.replacements === 1 ? "" : "s"})`);
    }
  } else {
    lines.push("No documents were changed.");
  }
  if (report.unchangedFiles.length > 0) {
    lines.push("", "Documents with nothing to replace:", ...report.unchangedFiles.map((f) => `  ${f}`));
  }
  if (report.notFound.length > 0) {
    lines.push("", "Objects not found in any document:", ...report.notFound.map((o) => `  ${o}`));
  }
  if (report.emptyInfo.length > 0) {
    lines.push("", "Skipped because INFO is empty:", ...report.emptyInfo.map((o) => `  ${o}`));
  }
  if (report.errors.length > 0) {
    lines.push("", "Problems:", ...report.errors.map((e) => `  ${e.file}: ${e.reason}`));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- Excel

// Reads the OBJECTS / INFO rows from the first sheet of "00 WonderBoy.xlsx".
export function readWonderBoy(folder: string): Entry[] {
  const file = path.join(folder, EXCEL_FILE_NAME);
  if (!fs.existsSync(file)) throw new Error(`Could not find "${EXCEL_FILE_NAME}" in this folder.`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fs.readFileSync(file), { type: "buffer" });
  } catch {
    throw new Error(`Could not open "${EXCEL_FILE_NAME}". Close it in Excel and run again.`);
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");

  // Find the header row: OBJECTS in column A, INFO in column B.
  let headerRow = -1;
  for (let row = range.s.r; row <= range.e.r; row++) {
    if (cellText(sheet, row, 0).toUpperCase() === "OBJECTS" && cellText(sheet, row, 1).toUpperCase() === "INFO") {
      headerRow = row;
      break;
    }
  }
  if (headerRow === -1) {
    throw new Error(`Could not find the OBJECTS / INFO header in "${EXCEL_FILE_NAME}" (column A and B).`);
  }

  const entries: Entry[] = [];
  for (let row = headerRow + 1; row <= range.e.r; row++) {
    const object = cellText(sheet, row, 0);
    if (object !== "") entries.push({ object, info: cellText(sheet, row, 1) });
  }
  return entries;
}

// The cell's text as Excel displays it (so dates and money keep their formatting).
function cellText(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined;
  if (!cell) return "";
  return String(cell.w ?? cell.v ?? "").trim();
}

// ---------------------------------------------------------------- Matching

interface Matcher {
  regex: RegExp; // finds any Object
  find: (matchedText: string) => Entry & { search: string };
}

// Builds one regex that finds every Object, longest first, so "(Ap address)" wins over "(Ap)".
function makeMatcher(entries: Entry[], settings: Settings): Matcher {
  const list = entries
    .map((e) => ({ ...e, search: settings.includeParentheses ? e.object : stripParentheses(e.object) }))
    .filter((e) => e.search !== "")
    .sort((a, b) => b.search.length - a.search.length);

  const same = (a: string, b: string) => (settings.matchCase ? a === b : a.toLowerCase() === b.toLowerCase());
  const pattern = list.length > 0 ? list.map((e) => escapeRegex(e.search)).join("|") : "(?!)"; // (?!) never matches

  return {
    regex: new RegExp(pattern, settings.matchCase ? "g" : "gi"),
    find: (matchedText) => list.find((e) => same(e.search, matchedText))!,
  };
}

function stripParentheses(text: string): string {
  return text.replace(/^\((.*)\)$/s, "$1").trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------- Word

// Replaces Objects in one .docx file and saves it if anything changed.
// Returns how many times each Object was replaced.
async function fillDocument(filePath: string, matcher: Matcher): Promise<Map<string, number>> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  const counts = new Map<string, number>();
  let changed = false;

  for (const name of Object.keys(zip.files)) {
    if (!WORD_PARTS.test(name)) continue;

    const xml = await zip.file(name)!.async("string");
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    const before = countTotal(counts);

    const paragraphs = doc.getElementsByTagNameNS(WORD_NS, "p");
    for (let i = 0; i < paragraphs.length; i++) fillParagraph(paragraphs[i], matcher, counts);

    if (countTotal(counts) > before) {
      zip.file(name, new XMLSerializer().serializeToString(doc));
      changed = true;
    }
  }

  if (changed) {
    const output = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(filePath, output);
  }
  return counts;
}

// Replaces Objects in one paragraph.
// Word often splits text into several pieces (<w:t> elements), e.g. "(APPLI" + "CANT)".
// So we join the pieces, find the Objects in the joined text, then edit the pieces:
// the Info goes into the piece where the Object starts (keeping that piece's formatting),
// and the rest of the Object is removed from the following pieces.
function fillParagraph(paragraph: Element, matcher: Matcher, counts: Map<string, number>): void {
  // This paragraph's own text pieces (not ones inside a nested paragraph, like a text box).
  const pieces: Element[] = [];
  const all = paragraph.getElementsByTagNameNS(WORD_NS, "t");
  for (let i = 0; i < all.length; i++) {
    if (closestParagraph(all[i]) === paragraph) pieces.push(all[i]);
  }

  const texts = pieces.map((p) => p.textContent ?? "");
  const original = [...texts];
  const starts: number[] = [];
  let joined = "";
  for (const text of texts) {
    starts.push(joined.length);
    joined += text;
  }

  const matches = [...joined.matchAll(matcher.regex)];
  if (matches.length === 0) return;

  // Go from the last match to the first, so the positions of earlier matches stay valid.
  for (const match of matches.reverse()) {
    const start = match.index!;
    const end = start + match[0].length;
    const entry = matcher.find(match[0]);
    counts.set(entry.object, (counts.get(entry.object) ?? 0) + 1);

    for (let k = 0; k < pieces.length; k++) {
      const pieceStart = starts[k];
      const pieceEnd = pieceStart + original[k].length;
      if (pieceEnd <= start || pieceStart >= end) continue; // piece is not part of this match

      const from = Math.max(start, pieceStart) - pieceStart;
      const to = Math.min(end, pieceEnd) - pieceStart;
      const insert = start >= pieceStart ? entry.info : ""; // Info goes where the Object starts
      texts[k] = texts[k].slice(0, from) + insert + texts[k].slice(to);
    }
  }

  pieces.forEach((piece, k) => {
    if (texts[k] !== original[k]) setPieceText(piece, texts[k]);
  });
}

// Sets the text of a <w:t>. Line breaks from Excel (Alt+Enter) become Word line breaks (<w:br/>).
function setPieceText(piece: Element, text: string): void {
  const doc = piece.ownerDocument as Document;
  const prefix = piece.prefix ? piece.prefix + ":" : "";
  const lines = text.split(/\r?\n/);

  setText(piece, lines[0]);
  let last: Element = piece;
  for (const line of lines.slice(1)) {
    const lineBreak = doc.createElementNS(WORD_NS, prefix + "br");
    const nextPiece = doc.createElementNS(WORD_NS, prefix + "t");
    setText(nextPiece, line);
    last.parentNode!.insertBefore(lineBreak, last.nextSibling);
    last.parentNode!.insertBefore(nextPiece, lineBreak.nextSibling);
    last = nextPiece;
  }
}

function setText(piece: Element, text: string): void {
  while (piece.firstChild) piece.removeChild(piece.firstChild);
  piece.appendChild((piece.ownerDocument as Document).createTextNode(text));
  piece.setAttributeNS(XML_NS, "xml:space", "preserve"); // keep leading/trailing spaces
}

function closestParagraph(node: Node): Node | null {
  let current = node.parentNode;
  while (current) {
    const el = current as Element;
    if (current.nodeType === Node.ELEMENT_NODE && el.namespaceURI === WORD_NS && el.localName === "p") return current;
    current = current.parentNode;
  }
  return null;
}

// ---------------------------------------------------------------- Helpers

function countTotal(counts: Map<string, number>): number {
  let total = 0;
  counts.forEach((n) => (total += n));
  return total;
}

function unique(items: string[]): string[] {
  return [...new Set(items)];
}

function explainError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "EBUSY" || code === "EPERM" || code === "EACCES") {
    return "It is open in Word. Close it and run again.";
  }
  return "It could not be read. It may be damaged or not a real Word file.";
}
