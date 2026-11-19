// WonderBoy frontend: what the window does.
// Screens: "ready" (Are you ready?) -> "working" -> "done" (report or error).

interface Settings {
  matchCase: boolean;
  includeParentheses: boolean;
}
interface StartInfo {
  folder: string;
  folderName: string;
  settings: Settings;
}
type RunResult = { ok: true; report: string } | { ok: false; message: string };

// Provided by preload.ts.
declare const wonderboy: {
  startInfo(): Promise<StartInfo>;
  run(settings: Settings): Promise<RunResult>;
  quit(): void;
};

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function show(screen: "ready" | "working" | "done"): void {
  for (const id of ["ready", "working", "done"]) byId(id).hidden = id !== screen;
}

const matchCase = byId<HTMLInputElement>("match-case");
const includeParentheses = byId<HTMLInputElement>("include-parentheses");

async function start(): Promise<void> {
  const info = await wonderboy.startInfo();
  byId("folder-name").textContent = info.folderName;
  byId("folder-path").textContent = info.folder;
  matchCase.checked = info.settings.matchCase;
  includeParentheses.checked = info.settings.includeParentheses;

  byId("no").addEventListener("click", () => wonderboy.quit());
  byId("yes").addEventListener("click", run);
  byId("close").addEventListener("click", () => wonderboy.quit());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") wonderboy.quit();
  });

  show("ready");
}

async function run(): Promise<void> {
  show("working");
  const result = await wonderboy.run({
    matchCase: matchCase.checked,
    includeParentheses: includeParentheses.checked,
  });
  byId("done-title").textContent = result.ok ? "Done" : "Could not start";
  byId("report").textContent = result.ok ? result.report : result.message;
  byId("done").classList.toggle("failed", !result.ok);
  show("done");
}

start();
