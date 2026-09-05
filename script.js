const STORAGE_KEY = "index-editor-v2-sprint2";

const defaultExperiment = () => ({
  id: uid(),
  number: "01",
  title: "Create a simple HTML document",
  objective: "To create a basic HTML document using heading, paragraph and other HTML elements.",
  result: "The HTML document was created and displayed successfully.",
  code: {
    html: `<h1>Hello, World!</h1>
<p>This is my first HTML experiment.</p>`,
    css: `body {
  font-family: Arial, sans-serif;
  padding: 30px;
}
h1 { color: #2563eb; }`,
    js: `console.log("Experiment 01 loaded successfully");`
  }
});

let state = {
  experiments: [defaultExperiment()],
  activeId: null,
  language: "html",
  theme: "dark",
  previewMode: "desktop"
};

let outputCaptures = new Map();

const $ = id => document.getElementById(id);
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function activeExperiment() {
  return state.experiments.find(e => e.id === state.activeId) || state.experiments[0];
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $("saveStatus").textContent = "● Saved";
  $("saveStatus").style.color = "var(--success)";
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.experiments?.length) state = {...state, ...saved};
  } catch {}
  state.activeId = state.activeId || state.experiments[0].id;
  document.body.classList.toggle("light", state.theme === "light");
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

const autoSave = debounce(() => {
  saveState();
}, 500);

function renderExperimentList() {
  const query = $("experimentSearch").value.toLowerCase().trim();
  const list = $("experimentList");
  list.innerHTML = "";

  state.experiments
    .filter(e => `${e.number} ${e.title}`.toLowerCase().includes(query))
    .forEach(e => {
      const item = document.createElement("div");
      item.className = "experiment-item" + (e.id === state.activeId ? " active" : "");
      item.innerHTML = `<div class="num">EXP ${escapeHtml(e.number || "--")}</div>
                        <div class="name">${escapeHtml(e.title || "Untitled experiment")}</div>`;
      item.onclick = () => {
        state.activeId = e.id;
        renderAll();
        closeMobileSidebar();
      };
      list.appendChild(item);
    });

  $("experimentCount").textContent = `${state.experiments.length} experiment${state.experiments.length !== 1 ? "s" : ""}`;
}

function renderFields() {
  const e = activeExperiment();
  $("expNumber").value = e.number || "";
  $("expTitle").value = e.title || "";
  $("expObjective").value = e.objective || "";
  $("expResult").value = e.result || "";
  $("codeEditor").value = e.code[state.language] || "";
  $("languageLabel").textContent = state.language === "js" ? "JAVASCRIPT" : state.language.toUpperCase();
  updateLineNumbers();
}

function renderAll() {
  renderExperimentList();
  renderFields();
  renderPreview();
}

function updateExperimentField(key, value) {
  activeExperiment()[key] = value;
  $("saveStatus").textContent = "● Unsaved";
  $("saveStatus").style.color = "#f59e0b";
  autoSave();
  renderExperimentList();
}

function addExperiment() {
  const next = state.experiments.length + 1;
  const e = {
    id: uid(),
    number: String(next).padStart(2, "0"),
    title: `Experiment ${String(next).padStart(2, "0")}`,
    objective: "",
    result: "",
    code: { html: "<h1>New Experiment</h1>", css: "", js: "" }
  };
  state.experiments.push(e);
  state.activeId = e.id;
  saveState();
  renderAll();
}

function duplicateExperiment() {
  const src = activeExperiment();
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = uid();
  copy.number = String(state.experiments.length + 1).padStart(2, "0");
  copy.title = (src.title || "Experiment") + " (Copy)";
  state.experiments.push(copy);
  state.activeId = copy.id;
  saveState();
  renderAll();
}

function deleteExperiment() {
  if (state.experiments.length === 1) {
    alert("At least one experiment must remain.");
    return;
  }
  const e = activeExperiment();
  if (!confirm(`Delete Experiment ${e.number}?`)) return;
  state.experiments = state.experiments.filter(x => x.id !== e.id);
  state.activeId = state.experiments[0].id;
  saveState();
  renderAll();
}

function switchLanguage(lang) {
  state.language = lang;
  qsa(".tab").forEach(t => t.classList.toggle("active", t.dataset.lang === lang));
  renderFields();
}

function updateLineNumbers() {
  const lines = $("codeEditor").value.split("\n").length;
  $("lineNumbers").textContent = Array.from({length: lines}, (_, i) => i + 1).join("\n");
  $("lineNumbers").scrollTop = $("codeEditor").scrollTop;
}

function buildDocument(e) {
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${e.code.css || ""}</style>
</head>
<body>
${e.code.html || ""}
<script>
window.addEventListener("error", function(ev) {
  parent.postMessage({type:"console", level:"error", message: ev.message + " (line " + ev.lineno + ")"}, "*");
});
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;
function send(level,args){
  parent.postMessage({type:"console",level,message:args.map(x=>{
    try{return typeof x==="object"?JSON.stringify(x):String(x)}catch{return String(x)}
  }).join(" ")}, "*");
}
console.log = (...a)=>{send("log",a); originalLog(...a)};
console.warn = (...a)=>{send("warn",a); originalWarn(...a)};
console.error = (...a)=>{send("error",a); originalError(...a)};
try {
${e.code.js || ""}
} catch(err) {
  send("error",[err.stack || err.message]);
}
<\/script>
</body>
</html>`;
}

function clearConsole() {
  $("consoleOutput").innerHTML = `<div class="console-line muted">Console cleared.</div>`;
  $("consoleStatus").textContent = "Ready";
}

function addConsole(level, message) {
  const line = document.createElement("div");
  line.className = `console-line ${level}`;
  line.textContent = `[${level}] ${message}`;
  $("consoleOutput").appendChild(line);
  $("consoleOutput").scrollTop = $("consoleOutput").scrollHeight;
  $("consoleStatus").textContent = level === "error" ? "Runtime error" : "Output received";
}

function runCode() {
  const e = activeExperiment();
  clearConsole();
  addConsole("muted", `Running Experiment ${e.number}...`);
  $("previewFrame").srcdoc = buildDocument(e);
  setTimeout(() => addConsole("log", "Preview rendered."), 250);
}

function renderPreview() {
  const e = activeExperiment();
  $("previewFrame").srcdoc = buildDocument(e);
  $("previewStage").classList.toggle("mobile-preview", state.previewMode === "mobile");
  $("previewDesktopBtn").classList.toggle("active", state.previewMode === "desktop");
  $("previewMobileBtn").classList.toggle("active", state.previewMode === "mobile");
}

function updateCode(value) {
  activeExperiment().code[state.language] = value;
  $("saveStatus").textContent = "● Unsaved";
  $("saveStatus").style.color = "#f59e0b";
  updateLineNumbers();
  autoSave();
  renderExperimentList();
  if (state.language === "html" || state.language === "css" || state.language === "js") {
    debouncePreview();
  }
}

const debouncePreview = debounce(renderPreview, 450);

function downloadCurrentHTML() {
  const e = activeExperiment();
  const blob = new Blob([buildDocument(e)], {type:"text/html"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `experiment-${e.number || "01"}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copyCurrentCode() {
  try {
    await navigator.clipboard.writeText($("codeEditor").value);
    $("copyCodeBtn").textContent = "Copied";
    setTimeout(() => $("copyCodeBtn").textContent = "Copy", 1000);
  } catch {
    alert("Clipboard access is unavailable. Select and copy the code manually.");
  }
}

function formatCode() {
  const area = $("codeEditor");
  let value = area.value;
  if (state.language === "html") {
    value = value.replace(/>\s*</g, ">\n<").replace(/\n{3,}/g, "\n\n");
  } else if (state.language === "css") {
    value = value.replace(/\s*{\s*/g, " {\n  ").replace(/;\s*/g, ";\n  ").replace(/\s*}\s*/g, "\n}\n").replace(/\n\s*\n/g, "\n");
  } else {
    value = value.replace(/;\s*/g, ";\n").replace(/{\s*/g, "{\n  ").replace(/}\s*/g, "\n}\n");
  }
  area.value = value.trim();
  updateCode(area.value);
}

async function captureExperimentOutput(e) {
  return new Promise(resolve => {
    if (typeof html2canvas === "undefined") {
      resolve(null);
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-modals allow-popups allow-same-origin");
    iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:850px;height:520px;border:0;background:white;";
    document.body.appendChild(iframe);

    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      iframe.remove();
      resolve(value);
    };

    iframe.onload = async () => {
      setTimeout(async () => {
        try {
          const doc = iframe.contentDocument;
          if (!doc?.body) return finish(null);
          const canvas = await html2canvas(doc.body, {
            backgroundColor: "#ffffff",
            scale: 1,
            useCORS: true,
            logging: false,
            windowWidth: 850,
            windowHeight: 520
          });
          finish(canvas.toDataURL("image/png"));
        } catch {
          finish(null);
        }
      }, 350);
    };

    iframe.srcdoc = buildDocument(e);
    setTimeout(() => finish(null), 5000);
  });
}

function codeWindow(label, code) {
  return `<div class="code-window">
    <div class="code-window-head"><i class="code-dot"></i><i class="code-dot"></i><i class="code-dot"></i><span class="code-label">${label}</span></div>
    <pre class="code-block">${escapeHtml(code || "(empty)")}</pre>
  </div>`;
}

function reportPage(e, capture, index, total) {
  const output = capture
    ? `<img class="output-image" src="${capture}" alt="Experiment output">`
    : `<div class="output-fallback">Output screenshot could not be captured in this browser.<br>Run the experiment in the live preview above and use Print / Save PDF again if needed.</div>`;

  return `<article class="a4-page">
    <header class="report-header">
      <div class="report-kicker">College Laboratory Record</div>
      <div class="report-title">Experiment ${escapeHtml(e.number || "--")}: ${escapeHtml(e.title || "Untitled Experiment")}</div>
      <div class="report-expno">Experiment No. ${escapeHtml(e.number || "--")}</div>
    </header>

    <section class="report-section">
      <h3>1. Objective</h3>
      <div class="objective-text">${escapeHtml(e.objective || "Objective not provided.")}</div>
    </section>

    <section class="report-section">
      <h3>2. Source Code</h3>
      ${codeWindow("HTML", e.code.html)}
      ${codeWindow("CSS", e.code.css)}
      ${codeWindow("JAVASCRIPT", e.code.js)}
    </section>

    <section class="report-section">
      <h3>3. Output</h3>
      <div class="output-box">
        <div class="output-head">Rendered browser output</div>
        ${output}
      </div>
    </section>

    <section class="report-section">
      <h3>4. Result</h3>
      <div class="result-box"><div class="result-text">${escapeHtml(e.result || "Result not provided.")}</div></div>
    </section>

    <footer class="report-footer">
      <span>Index Editor V2</span><span>Experiment ${index + 1} of ${total}</span>
    </footer>
  </article>`;
}

async function buildReport() {
  $("reportPages").innerHTML = `<div class="a4-page" style="display:grid;place-items:center;font-size:13px">Preparing report…<br><small>Capturing experiment outputs</small></div>`;
  outputCaptures.clear();

  const pages = [];
  for (let i = 0; i < state.experiments.length; i++) {
    const e = state.experiments[i];
    const capture = await captureExperimentOutput(e);
    outputCaptures.set(e.id, capture);
    pages.push(reportPage(e, capture, i, state.experiments.length));
  }

  $("reportPages").innerHTML = pages.join("");
}

function openReport() {
  saveState();
  $("reportModal").classList.remove("hidden");
  buildReport();
}

function closeReport() {
  $("reportModal").classList.add("hidden");
}

function createPrintReport() {
  const pages = state.experiments.map((e, i) => {
    const capture = outputCaptures.get(e.id);
    const output = capture
      ? `<img class="output-image" src="${capture}" alt="Experiment output">`
      : `<div class="output-fallback">Output screenshot unavailable.</div>`;
    return `<article class="print-report-page">
      <header class="report-header">
        <div class="report-kicker">College Laboratory Record</div>
        <div class="report-title">Experiment ${escapeHtml(e.number || "--")}: ${escapeHtml(e.title || "Untitled Experiment")}</div>
        <div class="report-expno">Experiment No. ${escapeHtml(e.number || "--")}</div>
      </header>
      <section class="report-section"><h3>1. Objective</h3><div class="objective-text">${escapeHtml(e.objective || "Objective not provided.")}</div></section>
      <section class="report-section"><h3>2. Source Code</h3>
        ${codeWindow("HTML", e.code.html)}
        ${codeWindow("CSS", e.code.css)}
        ${codeWindow("JAVASCRIPT", e.code.js)}
      </section>
      <section class="report-section"><h3>3. Output</h3><div class="output-box"><div class="output-head">Rendered browser output</div>${output}</div></section>
      <section class="report-section"><h3>4. Result</h3><div class="result-box"><div class="result-text">${escapeHtml(e.result || "Result not provided.")}</div></div></section>
      <footer class="report-footer"><span>Index Editor V2</span><span>Experiment ${i+1} of ${state.experiments.length}</span></footer>
    </article>`;
  }).join("");
  $("reportPrintArea").innerHTML = pages;
}

function printReport() {
  createPrintReport();
  window.print();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  document.body.classList.toggle("light", state.theme === "light");
  $("themeBtn").textContent = state.theme === "dark" ? "☾" : "☀";
  saveState();
}

function fullscreenPreview() {
  const frame = $("previewFrame");
  if (frame.requestFullscreen) frame.requestFullscreen();
}

function mobileNav(action) {
  qsa(".mobile-nav button").forEach(b => b.classList.toggle("active", b.dataset.mobile === action));
  if (action === "files") {
    $("sidebar").classList.add("open");
  } else {
    $("sidebar").classList.remove("open");
  }
  const workbench = qs(".workbench");
  const editor = qs(".editor-panel");
  const preview = qs(".preview-panel");
  const consolePanel = qs(".console-panel");
  if (window.innerWidth <= 900) {
    editor.style.display = action === "code" ? "" : "none";
    preview.style.display = action === "preview" ? "" : "none";
    consolePanel.style.display = action === "console" ? "" : "none";
    if (action === "files") {
      editor.style.display = "";
      preview.style.display = "none";
      consolePanel.style.display = "none";
    }
  }
}

function closeMobileSidebar() {
  $("sidebar").classList.remove("open");
}


function exportProject() {
  saveState();
  const payload = {
    app: "Index Editor V2",
    version: "Sprint 3",
    exportedAt: new Date().toISOString(),
    experiments: state.experiments
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "index-editor-project.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const experiments = Array.isArray(data) ? data : data.experiments;
      if (!Array.isArray(experiments) || !experiments.length) throw new Error("No experiments found");

      const cleaned = experiments.map((e, i) => ({
        id: e.id || uid(),
        number: String(e.number ?? String(i + 1).padStart(2, "0")),
        title: String(e.title ?? `Experiment ${i + 1}`),
        objective: String(e.objective ?? ""),
        result: String(e.result ?? ""),
        code: {
          html: String(e.code?.html ?? ""),
          css: String(e.code?.css ?? ""),
          js: String(e.code?.js ?? "")
        }
      }));

      state.experiments = cleaned;
      state.activeId = cleaned[0].id;
      saveState();
      renderAll();
      alert(`Imported ${cleaned.length} experiment${cleaned.length === 1 ? "" : "s"} successfully.`);
    } catch (err) {
      alert("Invalid project JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

function updateCursorInfo() {
  const area = $("codeEditor");
  const pos = area.selectionStart;
  const before = area.value.slice(0, pos);
  const line = before.split("\n").length;
  const lastBreak = before.lastIndexOf("\n");
  const col = pos - lastBreak;
  $("cursorInfo").textContent = `Ln ${line}, Col ${col}`;
}

function openFindBar() {
  $("findBar").classList.remove("hidden");
  $("findInput").focus();
}

function closeFindBar() {
  $("findBar").classList.add("hidden");
}

function findText(direction = 1) {
  const area = $("codeEditor");
  const query = $("findInput").value;
  if (!query) return;

  const text = area.value.toLowerCase();
  const q = query.toLowerCase();
  let start = direction > 0 ? area.selectionEnd : area.selectionStart - 1;
  let index = direction > 0 ? text.indexOf(q, start) : text.lastIndexOf(q, start);

  if (index === -1) {
    index = direction > 0 ? text.indexOf(q) : text.lastIndexOf(q);
  }
  if (index >= 0) {
    area.focus();
    area.setSelectionRange(index, index + query.length);
    updateCursorInfo();
  }
}

function handleEditorShortcuts(e) {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === "f") {
    e.preventDefault();
    openFindBar();
  }
  if (mod && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveState();
  }
}

function bindEvents() {
  $("addExperimentBtn").onclick = addExperiment;
  $("duplicateBtn").onclick = duplicateExperiment;
  $("deleteBtn").onclick = deleteExperiment;
  $("saveBtn").onclick = saveState;
  $("exportBtn").onclick = exportProject;
  $("importBtn").onclick = () => $("projectImport").click();
  $("projectImport").onchange = e => {
    importProjectFile(e.target.files[0]);
    e.target.value = "";
  };
  $("downloadBtn").onclick = downloadCurrentHTML;
  $("pdfBtn").onclick = openReport;
  $("closeReportBtn").onclick = closeReport;
  $("refreshReportBtn").onclick = buildReport;
  $("printPdfBtn").onclick = printReport;
  $("themeBtn").onclick = toggleTheme;
  $("runBtn").onclick = runCode;
  $("refreshPreviewBtn").onclick = renderPreview;
  $("fullscreenBtn").onclick = fullscreenPreview;
  $("copyCodeBtn").onclick = copyCurrentCode;
  $("formatBtn").onclick = formatCode;
  $("findBtn").onclick = openFindBar;
  $("wrapBtn").onclick = () => $("codeEditor").classList.toggle("wrap-on");
  $("closeFindBtn").onclick = closeFindBar;
  $("findNextBtn").onclick = () => findText(1);
  $("findPrevBtn").onclick = () => findText(-1);
  $("findInput").onkeydown = e => {
    if (e.key === "Enter") findText(e.shiftKey ? -1 : 1);
    if (e.key === "Escape") closeFindBar();
  };
  $("clearConsoleBtn").onclick = clearConsole;
  $("previewDesktopBtn").onclick = () => {state.previewMode="desktop";renderPreview()};
  $("previewMobileBtn").onclick = () => {state.previewMode="mobile";renderPreview()};
  $("experimentSearch").oninput = renderExperimentList;

  $("codeEditor").oninput = e => updateCode(e.target.value);
  $("codeEditor").onscroll = updateLineNumbers;
  $("codeEditor").onkeyup = updateCursorInfo;
  $("codeEditor").onclick = updateCursorInfo;
  $("codeEditor").onselect = updateCursorInfo;
  $("codeEditor").addEventListener("keydown", handleEditorShortcuts);
  $("codeEditor").onkeydown = e => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart, end = e.target.selectionEnd;
      e.target.setRangeText("  ", start, end, "end");
      updateCode(e.target.value);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault(); runCode();
    }
  };

  $("expNumber").oninput = e => updateExperimentField("number", e.target.value);
  $("expTitle").oninput = e => updateExperimentField("title", e.target.value);
  $("expObjective").oninput = e => updateExperimentField("objective", e.target.value);
  $("expResult").oninput = e => updateExperimentField("result", e.target.value);

  qsa(".tab").forEach(tab => tab.onclick = () => switchLanguage(tab.dataset.lang));
  qsa(".mobile-nav button").forEach(b => b.onclick = () => mobileNav(b.dataset.mobile));

  window.addEventListener("message", event => {
    if (event.data?.type === "console") addConsole(event.data.level || "log", event.data.message || "");
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      qsa(".editor-panel,.preview-panel,.console-panel").forEach(el => el.style.display = "");
    }
  });
}

loadState();
bindEvents();
renderAll();
$("themeBtn").textContent = state.theme === "dark" ? "☾" : "☀";
