// WonderBoy frontend: what the window does.
// Screens: "ready" (what will happen + Are you sure?) -> "working" -> "done" (report or error).

interface StartInfo {
  folder: string;
  folderName: string;
  version: string;
}
type CheckResult =
  | { ok: true; excelFile: string; pairCount: number; emptyCount: number; wordFiles: string[] }
  | { ok: false; message: string };
interface Report {
  excelFile: string;
  changedFiles: { file: string; replacements: number }[];
  unchangedFiles: string[];
  notFound: string[];
  emptyReplace: string[];
  errors: { file: string; reason: string }[];
}
type RunResult = { ok: true; report: Report } | { ok: false; message: string };

// Provided by preload.ts.
declare const wonderboy: {
  startInfo(): Promise<StartInfo>;
  check(): Promise<CheckResult>;
  run(): Promise<RunResult>;
  openFolder(): void;
  quit(): void;
};

// ---------------------------------------------------------------- Helpers

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function show(screen: "ready" | "working" | "done"): void {
  for (const id of ["ready", "working", "done"]) byId(id).hidden = id !== screen;
}

// Creates an element with text (always as plain text, never as HTML).
function el(tag: string, className = "", text = ""): HTMLElement {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------- Ready screen

async function check(): Promise<void> {
  const result = await wonderboy.check();
  byId("preview").hidden = !result.ok;
  byId("problem").hidden = result.ok;
  byId("hint").hidden = !result.ok;
  byId<HTMLButtonElement>("yes").disabled = !result.ok;

  if (!result.ok) {
    byId("problem-message").textContent = result.message;
    return;
  }

  byId("excel-name").textContent = result.excelFile;
  const empty = result.emptyCount > 0 ? ` · ${result.emptyCount} with an empty column B` : "";
  byId("pair-count").textContent = plural(result.pairCount, "pair") + empty;
  byId("word-count").textContent = `${plural(result.wordFiles.length, "Word file")} will be filled in`;

  const list = byId("word-files");
  list.replaceChildren(...result.wordFiles.map((file) => el("li", "", file)));
  byId("yes").focus();
}

// ---------------------------------------------------------------- Done screen

function setStatus(kind: "good" | "warn" | "bad", title: string, detail: string): void {
  const icon = byId("status-icon");
  icon.className = `status-icon ${kind}`;
  icon.textContent = kind === "good" ? "✓" : kind === "warn" ? "!" : "✕";
  byId("status-title").textContent = title;
  byId("status-detail").textContent = detail;
}

// One titled list in the report. Skipped when there is nothing to show.
function addGroup(kind: "good" | "warn" | "bad" | "", title: string, items: (string | [string, string])[]): void {
  if (items.length === 0) return;
  const group = el("div", `group ${kind}`);
  group.append(el("h3", "", title));
  const list = el("ul");
  for (const item of items) {
    const li = el("li");
    if (Array.isArray(item)) li.append(item[0], el("span", "count", ` — ${item[1]}`));
    else li.textContent = item;
    list.append(li);
  }
  group.append(list);
  byId("report").append(group);
}

function showReport(report: Report): void {
  const filled = report.changedFiles.length;
  const total = filled + report.unchangedFiles.length + report.errors.length;
  const replacements = report.changedFiles.reduce((sum, f) => sum + f.replacements, 0);
  const hasWarnings = report.errors.length > 0 || report.notFound.length > 0 || report.emptyReplace.length > 0;

  const title = filled === 0 ? "Nothing was changed" : report.errors.length > 0 ? "Done, with problems" : "Done";
  setStatus(
    report.errors.length > 0 ? "bad" : hasWarnings ? "warn" : "good",
    title,
    `${filled} of ${plural(total, "Word file")} filled in · ${plural(replacements, "replacement")} · values from ${report.excelFile}`
  );

  byId("report").replaceChildren();
  addGroup("bad", "Problems", report.errors.map((e) => [e.file, e.reason] as [string, string]));
  addGroup("good", "Filled in", report.changedFiles.map((f) => [f.file, plural(f.replacements, "replacement")] as [string, string]));
  addGroup("warn", "Not found in any Word file", report.notFound);
  addGroup("warn", "Skipped because column B is empty", report.emptyReplace);
  addGroup("", "Nothing to replace", report.unchangedFiles);
}

function showError(message: string): void {
  setStatus("bad", "Could not start", "Nothing was changed.");
  const box = el("div", "group bad");
  box.append(el("h3", "", "Problem"), el("p", "", message));
  byId("report").replaceChildren(box);
}

// ---------------------------------------------------------------- Start

async function start(): Promise<void> {
  const info = await wonderboy.startInfo();
  document.title = `WonderBoy v${info.version}`; // window title bar, next to the icon
  byId("version").textContent = `v${info.version}`;
  byId("folder-name").textContent = info.folderName;
  byId("folder-path").textContent = info.folder;

  byId("no").addEventListener("click", () => wonderboy.quit());
  byId("yes").addEventListener("click", run);
  byId("check-again").addEventListener("click", check);
  byId("open-folder").addEventListener("click", () => wonderboy.openFolder());
  byId("close").addEventListener("click", () => wonderboy.quit());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") wonderboy.quit();
  });

  await check();
  show("ready");
}

async function run(): Promise<void> {
  show("working");
  const result = await wonderboy.run();
  if (result.ok) showReport(result.report);
  else showError(result.message);
  show("done");
  byId("close").focus();
}

start();
