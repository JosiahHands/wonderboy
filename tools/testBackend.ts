// Tests the WonderBoy backend on a fake case folder (see sampleCase.ts).
// Run with: npm test
// Prints the case folder at the end so the result can be opened in Word.

import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import JSZip from "jszip";
import { runWonderBoy, formatReport } from "../app/backend";
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

  // 1. Fill in a case folder.
  const caseFolder = path.join(root, "Smith, John (Estate)");
  await makeCase(caseFolder);
  const report = await runWonderBoy(caseFolder);
  console.log(formatReport(report), "\n");

  const doc = await readPart(path.join(caseFolder, "01 ap.docx"), "word/document.xml");
  const text = plainText(doc);
  assert.match(doc, /<w:b\/><\/w:rPr><w:t xml:space="preserve">Applicant: John Smith, Jr\.<\/w:t>/, "split text, keeps bold");
  assert.ok(text.includes("Decedent: (decedent)"), "case-sensitive: lowercase not replaced");
  assert.ok(text.includes("Address: 123 N Avondale|Amarillo, TX 79106"), "table + line break");
  assert.ok(text.includes("In box: John Smith"), "text box");
  assert.ok(text.includes("Empty: (EMPTY)"), "empty column B left alone");
  assert.ok(text.includes("Fee: $1,500.00"), "money format kept");
  assert.ok(text.includes("Bare word: APPLICANT"), "only the exact column A text is replaced");

  const header = await readPart(path.join(caseFolder, "01 ap.docx"), "word/header1.xml");
  assert.ok(plainText(header).includes("Header: John Smith, Jr."), "header");

  const nested = await readPart(path.join(caseFolder, "subfolder", "nested.docx"), "word/document.xml");
  assert.ok(plainText(nested).includes("(APPLICANT) must stay"), "subfolders are not touched");

  assert.strictEqual(report.excelFile, "values.xlsx");
  assert.deepStrictEqual(report.changedFiles, [{ file: "01 ap.docx", replacements: 5 }]);
  assert.deepStrictEqual(report.unchangedFiles, ["02 nothing.docx"]);
  assert.deepStrictEqual(report.notFound, ["(MISSING)"]);
  assert.deepStrictEqual(report.emptyReplace, ["(EMPTY)"]);
  assert.deepStrictEqual(report.errors.map((e) => e.file), ["99 broken.docx"]);

  // 2. Running again is harmless.
  const again = await runWonderBoy(caseFolder);
  assert.deepStrictEqual(again.changedFiles, []);

  // 3. Stops with a clear message when the folder isn't right.
  const folder = path.join(root, "checks");
  fs.mkdirSync(folder);
  await assert.rejects(runWonderBoy(folder), /no Excel \(\.xlsx\) file/);
  makeExcel(folder, "one.xlsx");
  await assert.rejects(runWonderBoy(folder), /no Word \(\.docx\) files/);
  makeExcel(folder, "two.xlsx");
  await assert.rejects(runWonderBoy(folder), /more than one Excel file in this folder: one\.xlsx, two\.xlsx/);

  console.log("All tests passed.");
  console.log("Filled-in case folder:", caseFolder);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
