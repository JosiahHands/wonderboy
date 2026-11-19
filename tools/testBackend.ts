// Tests the WonderBoy backend on a fake case folder (see sampleCase.ts).
// Run with: npm test
// Prints the case folder at the end so the result can be opened in Word.

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import JSZip from "jszip";
import { runWonderBoy, formatReport, loadSettings, saveSettings } from "../app/backend";
import { makeCase, makeExcel } from "./sampleCase";

async function readPart(filePath: string, part: string): Promise<string> {
  const zip = await JSZip.loadAsync(fs.readFileSync(filePath));
  return zip.file(part)!.async("string");
}

// Rough plain text of a Word XML part: paragraphs and line breaks become "|".
function plainText(xml: string): string {
  return xml
    .replace(/<w:br\/>|<\/w:p>/g, "|")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&");
}

async function main(): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wonderboy-test-"));
  process.env.APPDATA = path.join(root, "appdata"); // keep test settings away from the real ones

  // 1. Default settings: match case off, include parentheses on.
  const settings = loadSettings();
  assert.deepStrictEqual(settings, { matchCase: false, includeParentheses: true });

  const caseFolder = path.join(root, "Smith, John (Estate)");
  await makeCase(caseFolder);
  const report = await runWonderBoy(caseFolder, settings);
  console.log(formatReport(report), "\n");

  const doc = await readPart(path.join(caseFolder, "01 ap.docx"), "word/document.xml");
  const text = plainText(doc);
  assert.match(doc, /<w:b\/><\/w:rPr><w:t xml:space="preserve">Applicant: John Smith, Jr\.<\/w:t>/, "split object, keeps bold");
  assert.ok(text.includes("Decedent: John Smith|"), "case-insensitive match");
  assert.ok(text.includes("Address: 123 N Avondale|Amarillo, TX 79106"), "table + line break");
  assert.ok(text.includes("In box: John Smith"), "text box");
  assert.ok(text.includes("Empty: (EMPTY)"), "empty info left alone");
  assert.ok(text.includes("Fee: $1,500.00"), "money format kept");
  assert.ok(text.includes("Bare word: APPLICANT"), "bare word untouched when parentheses are on");

  const header = await readPart(path.join(caseFolder, "01 ap.docx"), "word/header1.xml");
  assert.ok(plainText(header).includes("Header: John Smith, Jr."), "header");

  assert.deepStrictEqual(report.changedFiles, [{ file: "01 ap.docx", replacements: 6 }]);
  assert.deepStrictEqual(report.unchangedFiles, ["02 nothing.docx"]);
  assert.deepStrictEqual(report.notFound, ["(MISSING)"]);
  assert.deepStrictEqual(report.emptyInfo, ["(EMPTY)"]);
  assert.deepStrictEqual(report.errors.map((e) => e.file), ["99 broken.docx"]);

  // 2. Running again is harmless.
  const again = await runWonderBoy(caseFolder, settings);
  assert.deepStrictEqual(again.changedFiles, []);

  // 3. Settings are remembered, and change the matching.
  saveSettings({ matchCase: true, includeParentheses: false });
  const saved = loadSettings();
  assert.deepStrictEqual(saved, { matchCase: true, includeParentheses: false });

  const caseFolder2 = path.join(root, "Case 2");
  await makeCase(caseFolder2);
  await runWonderBoy(caseFolder2, saved);
  const text2 = plainText(await readPart(path.join(caseFolder2, "01 ap.docx"), "word/document.xml"));
  assert.ok(text2.includes("Decedent: (decedent)"), "match case on: lowercase not replaced");
  assert.ok(text2.includes("Applicant: (John Smith, Jr.)"), "parentheses off: only inner text replaced");
  assert.ok(text2.includes("Bare word: John Smith, Jr."), "parentheses off: bare word replaced");

  // 4. Stops with a clear message when something is missing.
  const emptyFolder = path.join(root, "empty");
  fs.mkdirSync(emptyFolder);
  await assert.rejects(runWonderBoy(emptyFolder, settings), /Could not find "00 WonderBoy.xlsx"/);
  makeExcel(emptyFolder);
  await assert.rejects(runWonderBoy(emptyFolder, settings), /no Word \(.docx\) files/);

  console.log("All tests passed.");
  console.log("Filled-in case folder:", caseFolder);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
