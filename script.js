const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const defaultHTML = `<h1>Hello, World!</h1>
<p>Welcome to Index Editor V2.</p>
<button onclick="sayHello()">Click Me</button>`;

const defaultCSS = `body {
  font-family: Arial, sans-serif;
  padding: 30px;
}
h1 { color: #2563eb; }
button {
  padding: 10px 16px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}`;

const defaultJS = `function sayHello() {
  console.log("Button clicked!");
  alert("Hello from JavaScript!");
}`;

let state = {
  experiments: [{
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    number: 1,
    title: "Create a basic HTML document",
    objective: "To create a basic HTML document using HTML elements.",
    result: "The HTML document was created and displayed successfully.",
    html: defaultHTML, css: defaultCSS, js: defaultJS
  }],
  currentId: null,
  language: "html",
  theme: localStorage.getItem("index-editor-theme") || "dark"
};

function current() {
  return state.experiments.find(e => e.id === state.currentId) || state.experiments[0];
}

function saveLocal(showMessage = true) {
  localStorage.setItem("index-editor-v2", JSON.stringify(state));
  $("#saveStatus").classList.remove("unsaved");
  if (showMessage) toast("Saved locally");
}

function loadLocal() {
  try {
    const saved = JSON.parse(localStorage.getItem("index-editor-v2"));
    if (saved?.experiments?.length) state = {...state, ...saved};
  } catch {}
  state.currentId ||= state.experiments[0].id;
}

function toast(message) {
  let t = $("#toast");
  if (!t) {
    t = document.createElement("div"); t.id = "toast";
    Object.assign(t.style,{position:"fixed",right:"18px",bottom:"18px",zIndex:99,padding:"10px 14px",background:"var(--surface3)",color:"var(--text)",border:"1px solid var(--border)",borderRadius:"8px",boxShadow:"var(--shadow)",fontSize:"12px"});
    document.body.appendChild(t);
  }
  t.textContent = message; t.style.opacity = "1";
  clearTimeout(t._timer); t._timer = setTimeout(()=>t.style.opacity="0",1800);
}

function renderExperiments(filter="") {
  const list = $("#experimentList");
  const q = filter.toLowerCase();
  list.innerHTML = "";
  state.experiments.filter(e => `${e.number} ${e.title}`.toLowerCase().includes(q)).forEach(e => {
    const item = document.createElement("div");
    item.className = "experiment-item" + (e.id === state.currentId ? " active" : "");
    item.innerHTML = `<span class="experiment-number">${String(e.number).padStart(2,"0")}</span><span class="experiment-title">${escapeHTML(e.title || "Untitled Experiment")}</span>`;
    item.onclick = () => { state.currentId=e.id; renderAll(); closeSidebar(); };
    list.appendChild(item);
  });
  $("#experimentCount").textContent = state.experiments.length;
}

function renderDetails() {
  const e = current();
  $("#expNumber").value = e.number;
  $("#expTitle").value = e.title;
  $("#expObjective").value = e.objective;
  $("#expResult").value = e.result;
  $("#currentProjectName").textContent = `Experiment ${String(e.number).padStart(2,"0")}`;
}

function loadEditor() {
  const e = current();
  $("#codeEditor").value = e[state.language] || "";
  $("#languageStatus").textContent = state.language === "js" ? "JavaScript" : state.language.toUpperCase();
  updateLineNumbers();
  updateCharCount();
}

function updateLineNumbers() {
  const n = Math.max(1, $("#codeEditor").value.split("\n").length);
  $("#lineNumbers").innerHTML = Array.from({length:n},(_,i)=>i+1).join("<br>");
}

function updateCharCount() {
  $("#charStatus").textContent = `${$("#codeEditor").value.length} chars`;
}

function syncEditor() {
  current()[state.language] = $("#codeEditor").value;
  $("#saveStatus").classList.add("unsaved");
  updateLineNumbers(); updateCharCount();
  clearTimeout(syncEditor.timer);
  syncEditor.timer = setTimeout(()=>{ saveLocal(false); runCode(); },350);
}

function runCode() {
  const e = current();
  clearConsole();
  const html = e.html || "";
  const css = e.css || "";
  const js = e.js || "";
  const bridge = `<script>
    (() => {
      const send=(type,args)=>parent.postMessage({source:"index-editor",type,message:args.map(x=>typeof x==="object"?JSON.stringify(x):String(x)).join(" ")}, "*");
      ["log","info","warn","error"].forEach(k=>{const o=console[k]; console[k]=(...a)=>{send(k,a);o.apply(console,a)}});
      window.onerror=(m,u,l)=>send("error",[m+" (line "+l+")"]);
      window.addEventListener("unhandledrejection",e=>send("error",[e.reason]));
    })();
  <\/script>`;
  const doc = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>${html}<script>${bridge}${js.replace(/<\/script/gi,"<\\/script")}<\/script></body></html>`;
  $("#previewFrame").srcdoc = doc;
}

window.addEventListener("message", e => {
  if (e.data?.source !== "index-editor") return;
  addConsole(e.data.type, e.data.message);
});

function addConsole(type, message) {
  const box = $("#consoleOutput");
  $(".console-empty")?.remove();
  const line = document.createElement("div");
  line.className = `console-line ${type === "error" ? "error" : type === "warn" ? "warn" : ""}`;
  line.textContent = `> ${message}`;
  box.appendChild(line); box.scrollTop=box.scrollHeight;
}
function clearConsole(){ $("#consoleOutput").innerHTML='<div class="console-empty">Run your code to see console messages here.</div>'; }

function addExperiment() {
  const next = state.experiments.reduce((m,e)=>Math.max(m,Number(e.number)||0),0)+1;
  const e = {id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),number:next,title:"New Experiment",objective:"",result:"",html:"<h1>New Experiment</h1>",css:"body { font-family: Arial; padding: 20px; }",js:"console.log('Experiment loaded');"};
  state.experiments.push(e); state.currentId=e.id; saveLocal(false); renderAll(); toast("Experiment added");
}
function duplicateExperiment() {
  const e=current(), copy={...e,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),number:state.experiments.length+1,title:e.title+" (Copy)"};
  state.experiments.push(copy);state.currentId=copy.id;saveLocal(false);renderAll();
}
function deleteExperiment() {
  if(state.experiments.length===1) return toast("Keep at least one experiment");
  if(!confirm("Delete this experiment?")) return;
  const i=state.experiments.findIndex(e=>e.id===state.currentId);
  state.experiments.splice(i,1);state.currentId=state.experiments[Math.max(0,i-1)].id;saveLocal(false);renderAll();toast("Experiment deleted");
}

function downloadHTML() {
  const e=current();
  const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHTML(e.title)}</title><style>${e.css}</style></head><body>${e.html}<script>${e.js.replace(/<\/script/gi,"<\\/script")}<\/script></body></html>`;
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([doc],{type:"text/html"}));a.download=`experiment-${e.number}.html`;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function copyCode(){ navigator.clipboard?.writeText($("#codeEditor").value).then(()=>toast("Code copied")); }

function toggleTheme(){
  state.theme=state.theme==="dark"?"light":"dark";
  document.documentElement.dataset.theme=state.theme;
  localStorage.setItem("index-editor-theme",state.theme);
  $("#themeBtn i").className=state.theme==="dark"?"fa-solid fa-sun":"fa-solid fa-moon";
}

function escapeHTML(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function renderAll(){renderExperiments($("#experimentSearch").value);renderDetails();loadEditor();runCode();}

function closeSidebar(){ $("#sidebar").classList.remove("open"); }

function setup(){
  loadLocal(); state.currentId ||= state.experiments[0].id;
  document.documentElement.dataset.theme=state.theme;
  $("#themeBtn i").className=state.theme==="dark"?"fa-solid fa-sun":"fa-solid fa-moon";
  renderAll();

  $$(".tab").forEach(tab=>tab.onclick=()=>{ $$(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");state.language=tab.dataset.lang;loadEditor();});
  $("#codeEditor").addEventListener("input",syncEditor);
  $("#codeEditor").addEventListener("scroll",()=>$("#lineNumbers").scrollTop=$("#codeEditor").scrollTop);
  $("#runBtn").onclick=runCode; $("#refreshBtn").onclick=runCode; $("#copyBtn").onclick=copyCode;
  $("#clearCodeBtn").onclick=()=>{$("#codeEditor").value="";syncEditor()};
  $("#clearConsoleBtn").onclick=clearConsole;
  $("#saveBtn").onclick=()=>saveLocal(true); $("#downloadBtn").onclick=downloadHTML; $("#themeBtn").onclick=toggleTheme;
  $("#addExperimentBtn").onclick=addExperiment; $("#duplicateBtn").onclick=duplicateExperiment; $("#deleteBtn").onclick=deleteExperiment;
  $("#experimentSearch").oninput=e=>renderExperiments(e.target.value);
  ["expNumber","expTitle","expObjective","expResult"].forEach(id=>$("#"+id).addEventListener("input",()=>{
    const e=current(); e.number=Number($("#expNumber").value)||1;e.title=$("#expTitle").value;e.objective=$("#expObjective").value;e.result=$("#expResult").value;
    renderExperiments($("#experimentSearch").value);$("#saveStatus").classList.add("unsaved");saveLocal(false);
  }));
  $("#fullscreenBtn").onclick=()=>$("#browserWindow").requestFullscreen?.();
  $$("[data-preview]").forEach(b=>b.onclick=()=>{ $$(".preview-tools [data-preview]").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#browserWindow").classList.toggle("mobile",b.dataset.preview==="mobile");});
  $("#menuBtn").onclick=()=>$("#sidebar").classList.toggle("open");
  $$("[data-mobile-view]").forEach(b=>b.onclick=()=>{
    $$("[data-mobile-view]").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    const v=b.dataset.mobileView, wb=$(".workbench");
    $("#sidebar").classList.toggle("open",v==="files");
    wb.classList.toggle("show-preview",v==="preview");
    if(v==="console") $("#consoleOutput").scrollIntoView({block:"nearest"});
  });
  window.addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveLocal(true)}
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();runCode()}
  });
}
document.addEventListener("DOMContentLoaded",setup);
