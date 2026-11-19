// Builds a fake case folder: "00 WonderBoy.xlsx" plus a few Word files with Objects in them.
// Used by testBackend.ts, and on its own for trying the app by hand:
//   npx tsx tools/sampleCase.ts "C:\some\folder\Smith, John (Estate)"

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import JSZip from "jszip";

const EXCEL_FILE_NAME = "00 WonderBoy.xlsx";
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const V = 'xmlns:v="urn:schemas-microsoft-com:vml"';

export function makeExcel(folder: string): void {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Program.exe"],
    [],
    ["OBJECTS", "INFO"],
    [],
    ["(APPLICANT)", "John Smith, Jr."],
    ["(Ap address)", "123 N Avondale\nAmarillo, TX 79106"],
    ["(DECEDENT)", "John Smith"],
    ["(EMPTY)", ""],
    ["(MISSING)", "not in any document"],
    ["(FEE)", 1500],
  ]);
  sheet["B10"].z = '"$"#,##0.00'; // money format, should come through as "$1,500.00"
  sheet["!cols"] = [{ wch: 16 }, { wch: 40 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  XLSX.writeFile(book, path.join(folder, EXCEL_FILE_NAME));
}

async function makeDocx(filePath: string, body: string, header: string): Promise<void> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/></Relationships>`
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W} ${R} ${V}><w:body>${body}<w:sectPr><w:headerReference w:type="default" r:id="rId1"/></w:sectPr></w:body></w:document>`
  );
  zip.file(
    "word/header1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${W}><w:p><w:r><w:t>${header}</w:t></w:r></w:p></w:hdr>`
  );
  fs.writeFileSync(filePath, await zip.generateAsync({ type: "nodebuffer" }));
}

const p = (text: string) => `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

const TEMPLATE_BODY = [
  // Object split over two runs, first run bold
  `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Applicant: (APPLI</w:t></w:r><w:r><w:t>CANT)</w:t></w:r></w:p>`,
  p("Decedent: (decedent)"), // different case
  `<w:tbl><w:tblGrid><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:tc>${p("Address: (Ap address)")}</w:tc></w:tr></w:tbl>`,
  // text box (nested paragraph)
  `<w:p><w:r><w:t xml:space="preserve">Box: </w:t></w:r><w:r><w:pict><v:shape style="width:200pt;height:40pt"><v:textbox><w:txbxContent>${p(
    "In box: (DECEDENT)"
  )}</w:txbxContent></v:textbox></v:shape></w:pict></w:r></w:p>`,
  p("Empty: (EMPTY)"),
  p("Fee: (FEE)"),
  p("Bare word: APPLICANT"),
].join("");

export async function makeCase(folder: string): Promise<void> {
  fs.mkdirSync(folder, { recursive: true });
  makeExcel(folder);
  await makeDocx(path.join(folder, "01 ap.docx"), TEMPLATE_BODY, "Header: (APPLICANT)");
  await makeDocx(path.join(folder, "02 nothing.docx"), p("No objects here."), "Plain header");
  fs.writeFileSync(path.join(folder, "99 broken.docx"), "this is not a zip file");
  fs.writeFileSync(path.join(folder, "~$01 ap.docx"), "Word lock file, must be skipped");
}

// Run on its own: build a case folder at the given path.
if (require.main === module) {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: npx tsx tools/sampleCase.ts "<folder>"');
    process.exit(1);
  }
  makeCase(path.resolve(folder)).then(() => console.log("Sample case folder created:", path.resolve(folder)));
}
