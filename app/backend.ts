// WonderBoy backend.
// Reads find/replace pairs from the folder's one .xlsx (column A = find, column B = replace)
// and replaces them in every .docx file in the same folder (top level only).

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { DOMParser, XMLSerializer, Document, Element, Node } from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const XML_NS = "http://www.w3.org/XML/1998/namespace";

// Parts of a .docx that can hold text: body (incl. tables and text boxes), headers, footers, notes.
const WORD_PARTS = /^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/;

// ---------------------------------------------------------------- Types

export interface Pair {
  find: string; // column A, e.g. "(APPLICANT)"
  replace: string; // column B, e.g. "John Smith, Jr."
}

export interface Report {
  excelFile: string;
  changedFiles: { file: string; replacements: number }[];
  unchangedFiles: string[];
  notFound: string[]; // column A texts not found in any document
  emptyReplace: string[]; // column A texts skipped because column B is empty
  errors: { file: string; reason: string }[];
}

export interface FolderCheck {
  excelFile: string;
  pairs: Pair[];
  wordFiles: string[];
}

// ---------------------------------------------------------------- Main entry points

// Looks at the folder without changing anything. Throws an Error with a plain message if
// WonderBoy can't run there (no .xlsx, more than one .xlsx, no Word files).
export function checkFolder(folder: string): FolderCheck {
  const excelFile = findExcelFile(folder);
  const pairs = readPairs(path.join(folder, excelFile));
  const wordFiles = topLevelFiles(folder, ".docx");
  if (wordFiles.length === 0) throw new Error("There are no Word (.docx) files in this folder.");
  return { excelFile, pairs, wordFiles };
}

// Fills in every .docx in `folder`. Throws like checkFolder if it can't start at all.
// Problems with single files go in the report.
export async function runWonderBoy(folder: string): Promise<Report> {
  const { excelFile, pairs, wordFiles } = checkFolder(folder);

  const toReplace = pairs.filter((p) => p.replace !== "");
  const report: Report = {
    excelFile,
    changedFiles: [],
    unchangedFiles: [],
    notFound: [],
    emptyReplace: unique(pairs.filter((p) => p.replace === "").map((p) => p.find)),
    errors: [],
  };

  const matcher = makeMatcher(toReplace);
  const found = new Set<string>();

  for (const file of wordFiles) {
    try {
      const counts = await fillDocument(path.join(folder, file), matcher);
      const total = countTotal(counts);
      counts.forEach((_, find) => found.add(find));
      if (total > 0) report.changedFiles.push({ file, replacements: total });
      else report.unchangedFiles.push(file);
    } catch (error) {
      report.errors.push({ file, reason: explainError(error) });
    }
  }

  report.notFound = unique(toReplace.map((p) => p.find).filter((find) => !found.has(find)));
  return report;
}

// Plain-text version of the report, for showing in the window.
export function formatReport(report: Report): string {
  const lines: string[] = [`Values from: ${report.excelFile}`, ""];

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
    lines.push("", "Not found in any document:", ...report.notFound.map((t) => `  ${t}`));
  }
  if (report.emptyReplace.length > 0) {
    lines.push("", "Skipped because column B is empty:", ...report.emptyReplace.map((t) => `  ${t}`));
  }
  if (report.errors.length > 0) {
    lines.push("", "Problems:", ...report.errors.map((e) => `  ${e.file}: ${e.reason}`));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------- Excel

// The folder's one .xlsx file (Excel's "~$" lock files don't count).
export function findExcelFile(folder: string): string {
  const files = topLevelFiles(folder, ".xlsx");
  if (files.length === 0) throw new Error("There is no Excel (.xlsx) file in this folder.");
  if (files.length > 1) {
    throw new Error(`There is more than one Excel file in this folder: ${files.join(", ")}. Leave only one.`);
  }
  return files[0];
}

// Reads the pairs from the first sheet, starting at row 1: column A = find, column B = replace.
export function readPairs(file: string): Pair[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(fs.readFileSync(file), { type: "buffer" });
  } catch {
    throw new Error(`Could not open "${path.basename(file)}". Close it in Excel and run again.`);
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");

  const pairs: Pair[] = [];
  for (let row = range.s.r; row <= range.e.r; row++) {
    const find = cellText(sheet, row, 0);
    if (find !== "") pairs.push({ find, replace: cellText(sheet, row, 1) });
  }
  return pairs;
}

// The cell's text as Excel displays it (so dates and money keep their formatting).
function cellText(sheet: XLSX.WorkSheet, row: number, col: number): string {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined;
  if (!cell) return "";
  return String(cell.w ?? cell.v ?? "").trim();
}

// ---------------------------------------------------------------- Matching

interface Matcher {
  regex: RegExp; // finds any column A text
  find: (matchedText: string) => Pair;
}

// One regex that finds every column A text exactly (case-sensitive), longest first,
// so "(Ap address)" wins over "(Ap)".
function makeMatcher(pairs: Pair[]): Matcher {
  const list = [...pairs].sort((a, b) => b.find.length - a.find.length);
  const pattern = list.length > 0 ? list.map((p) => escapeRegex(p.find)).join("|") : "(?!)"; // (?!) never matches
  return {
    regex: new RegExp(pattern, "g"),
    find: (matchedText) => list.find((p) => p.find === matchedText)!,
  };
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------- Word

// Replaces the pairs in one .docx file and saves it if anything changed.
// Returns how many times each column A text was replaced.
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

// Replaces the pairs in one paragraph.
// Word often splits text into several pieces (<w:t> elements), e.g. "(APPLI" + "CANT)".
// So we join the pieces, find the matches in the joined text, then edit the pieces:
// the replacement goes into the piece where the match starts (keeping that piece's formatting),
// and the rest of the match is removed from the following pieces.
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
    const pair = matcher.find(match[0]);
    counts.set(pair.find, (counts.get(pair.find) ?? 0) + 1);

    for (let k = 0; k < pieces.length; k++) {
      const pieceStart = starts[k];
      const pieceEnd = pieceStart + original[k].length;
      if (pieceEnd <= start || pieceStart >= end) continue; // piece is not part of this match

      const from = Math.max(start, pieceStart) - pieceStart;
      const to = Math.min(end, pieceEnd) - pieceStart;
      const insert = start >= pieceStart ? pair.replace : ""; // replacement goes where the match starts
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

// Files directly in `folder` (no subfolders) with this extension, skipping Office "~$" lock files.
function topLevelFiles(folder: string, extension: string): string[] {
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(extension) && !e.name.startsWith("~$"))
    .map((e) => e.name)
    .sort();
}

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
