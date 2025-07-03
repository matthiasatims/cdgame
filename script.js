const categories = [
  { key: "cpus",    file: "library/cpus.json" },
  { key: "ai",      file: "library/ai.json" },
  { key: "comms",   file: "library/comms.json" },
  { key: "memory",  file: "library/memory.json" },
  { key: "security",file: "library/security.json" }
];
const langFiles = { de: "lang_de.json", en: "lang_en.json" };

let langData = {};
let currentLang = "de";
let currentTaskKey = "task1";
let currentTask = {};
let categoryData = {};
let gridSize = 10;
let grid = [];
let placedComponents = [];
let uniqueId = 1;

// ----- UI RENDERING -----
async function renderApp() {
  document.body.lang = currentLang;
  document.title = langData.title;

  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="langSwitcher" class="lang-switcher">
      <button data-lang="de" ${currentLang === "de" ? "class='active'" : ""}>Deutsch</button>
      <button data-lang="en" ${currentLang === "en" ? "class='active'" : ""}>English</button>
    </div>
    <main>
      <div class="task-selector">
        <label for="taskSelect"><strong>${langData.buttons.taskselect || "Aufgabe wählen"}:</strong></label>
        <select id="taskSelect"></select>
      </div>
      <div class="task-desc" id="taskDesc"></div>
      <div class="game-layout">
        <div class="comp-lib" id="componentLibrary"></div>
        <div>
          <div class="grid-section">
            <h3>🔳 ${langData.buttons.chiparea || "Chipfläche"}</h3>
            <div>
              <label for="gridSizeSelect">${langData.buttons.gridsize || "Chipgröße"}:</label>
              <select id="gridSizeSelect">
                <option value="8">8×8</option>
                <option value="10" selected>10×10</option>
                <option value="12">12×12</option>
              </select>
            </div>
            <div id="chipGrid" class="grid-container"></div>
          </div>
          <div class="stats">
            <p><strong id="pointsLabel"></strong> <span id="points">0</span> / <span id="pointsMax"></span></p>
            <p><strong id="energyLabel"></strong> <span id="energy">0</span> / <span id="energyMax"></span></p>
            <p><strong id="areaLabel"></strong> <span id="area">0</span> / <span id="areaMax"></span></p>
            <p><strong id="perfLabel"></strong> <span id="perf">0</span></p>
            <p id="result"></p>
          </div>
        </div>
      </div>
    </main>
  `;
  // Sprachumschalter
  document.querySelectorAll('#langSwitcher button').forEach(btn =>
    btn.onclick = () => loadLang(btn.dataset.lang)
  );

  // Aufgaben-Auswahl rendern
  renderTaskSelect();
  // Komponenten-Bibliothek rendern
  await renderComponentLibrary();
  // Grid rendern
  buildGrid();
  // Stats & Texte rendern
  updateBudgetLabels();
  updateTaskDesc();
  updateStats();

  // GridSize Select
  document.getElementById('gridSizeSelect').addEventListener('change', e => {
    gridSize = +e.target.value;
    rerenderGrid();
  });
}

// ----- SPRACHE -----
async function loadLang(lang) {
  const resp = await fetch(langFiles[lang]);
  langData = await resp.json();
  currentLang = lang;
  // Tasks aktualisieren
  currentTaskKey = Object.keys(langData.tasks)[0];
  currentTask = langData.tasks[currentTaskKey];
  // Komponenten-Bibliothek ggf. neu laden
  await loadCategoryData();
  renderApp();
}

function renderTaskSelect() {
  const sel = document.getElementById("taskSelect");
  sel.innerHTML = "";
  Object.keys(langData.tasks).forEach(key => {
    const o = document.createElement("option");
    o.value = key;
    o.textContent = langData.tasks[key].name;
    sel.appendChild(o);
  });
  sel.value = currentTaskKey;
  sel.onchange = e => {
    currentTaskKey = sel.value;
    currentTask = langData.tasks[currentTaskKey];
    updateBudgetLabels();
    updateTaskDesc();
    updateStats();
  };
}

function updateTaskDesc() {
  document.getElementById("taskDesc").textContent = langData.tasks[currentTaskKey].desc;
}

// ----- KOMPONENTEN-BIBLIOTHEK -----
async function loadCategoryData() {
  categoryData = {};
  for (const cat of categories) {
    const resp = await fetch(cat.file);
    categoryData[cat.key] = await resp.json();
  }
}

async function renderComponentLibrary() {
  const lib = document.getElementById("componentLibrary");
  lib.innerHTML = "";
  categories.forEach((cat, i) => {
    const section = document.createElement('section');
    section.className = 'comp-group';

    // Header
    const header = document.createElement('div');
    header.className = 'comp-group-header';
    const catName = langData.categories[cat.key] || cat.key;
    header.textContent = (i === 0 ? "▼ " : "► ") + catName;
    header.style.cursor = 'pointer';

    // Content
    const content = document.createElement('div');
    content.className = 'comp-group-content';
    content.style.display = i === 0 ? 'block' : 'none';

    (categoryData[cat.key] || []).forEach((comp, j) => {
      const div = document.createElement('div');
      div.className = 'component';
      div.setAttribute('draggable', true);
      div.innerHTML = `<strong>${comp.name}</strong>
        ${comp.brand ? `<br><small>${comp.brand}</small>` : ""}
        <br>${langData.stats.points}: ${comp.points}, ${langData.stats.energy}: ${comp.energy}, ${langData.stats.area}: ${comp.area}, ${langData.stats.perf}: ${comp.perf}`;
      div.addEventListener("dragstart", e => {
        e.dataTransfer.setData("type", "component");
        e.dataTransfer.setData("componentObj", JSON.stringify(comp));
      });
      // Touch für Mobile
      div.addEventListener("touchstart", e => {
        window.touchSelectedComp = comp;
        div.classList.add("selected");
        setTimeout(() => div.classList.remove("selected"), 200);
        e.preventDefault();
      });
      content.appendChild(div);
    });

    header.onclick = () => {
      content.style.display = (content.style.display === 'none') ? 'block' : 'none';
      header.textContent = `${content.style.display === 'block' ? '▼' : '►'} ${catName}`;
    };

    section.appendChild(header);
    section.appendChild(content);
    lib.appendChild(section);
  });
}

// ----- GRID -----
function buildGrid() {
  grid = [];
  placedComponents = [];
  const gridEl = document.getElementById('chipGrid');
  gridEl.innerHTML = '';
  gridEl.style.display = "grid";
  gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
  gridEl.style.gridTemplateRows = `repeat(${gridSize}, 40px)`;
  gridEl.style.background = "#aaa";
  gridEl.style.border = "2px solid #333";

  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", handleDrop);
      // Touch für Mobile
      cell.addEventListener("touchstart", e => {
        if (window.touchSelectedComp) {
          handlePlace(window.touchSelectedComp, x, y);
          window.touchSelectedComp = null;
          e.preventDefault();
        }
      });
      grid[y][x] = { occupied: false, el: cell, compId: null, instanceId: null };
      gridEl.appendChild(cell);
    }
  }
}

function rerenderGrid() {
  buildGrid();
  updateStats();
}

// ----- Drag & Drop -----
function handleDrop(e) {
  const type = e.dataTransfer.getData("type");
  const x = Number(e.target.dataset.x);
  const y = Number(e.target.dataset.y);
  if (type === "component") {
    const comp = JSON.parse(e.dataTransfer.getData("componentObj"));
    handlePlace(comp, x, y);
  } else if (type === "instance") {
    const instanceId = Number(e.dataTransfer.getData("instanceId"));
    const inst = placedComponents.find(c => c.id === instanceId);
    if (!inst) return;
    removeComponent(instanceId, false);
    if (canPlace(x, y, inst)) {
      placeComponent(x, y, inst, instanceId);
      updateStats();
    } else {
      placeComponent(inst.x, inst.y, inst, instanceId);
      updateStats();
      alert("❌ " + (langData.stats.place_error || "Nicht genug Platz oder überlappt!"));
    }
  }
}

function handlePlace(comp, x, y) {
  if (canPlace(x, y, comp)) {
    placeComponent(x, y, comp);
    updateStats();
  } else {
    alert("❌ " + (langData.stats.place_error || "Nicht genug Platz oder überlappt!"));
  }
}

function canPlace(x, y, comp) {
  if (x + comp.width > gridSize || y + comp.height > gridSize) return false;
  for (let dy = 0; dy < comp.height; dy++) {
    for (let dx = 0; dx < comp.width; dx++) {
      if (grid[y + dy][x + dx].occupied) return false;
    }
  }
  return true;
}

function getColor(tag) {
  return {
    cpu: "#5e81ac", com: "#a3be8c", ai: "#b48ead", sec: "#ebcb8b", mem: "#d08770"
  }[tag] || "#d8dee9";
}

function placeComponent(x, y, comp, forceId = null) {
  const instanceId = forceId || (uniqueId++);
  placedComponents.push({ ...comp, x, y, id: instanceId });
  for (let dy = 0; dy < comp.height; dy++) {
    for (let dx = 0; dx < comp.width; dx++) {
      const cell = grid[y + dy][x + dx];
      cell.occupied = true;
      cell.compId = comp.name;
      cell.instanceId = instanceId;
      cell.el.className = 'cell placed';
      cell.el.style.background = getColor(comp.tag);
      if (dx === 0 && dy === 0) {
        cell.el.innerHTML = `<span class="placed">${comp.shortName || comp.name}</span>`;
        cell.el.setAttribute('draggable', true);
        cell.el.ondragstart = function(ev) {
          ev.dataTransfer.setData("type", "instance");
          ev.dataTransfer.setData("instanceId", instanceId);
        };
        cell.el.oncontextmenu = function(e) {
          e.preventDefault();
          removeComponent(instanceId);
        };
        // Touch: Entfernen mit Doppeltap
        cell.el.ontouchstart = (function() {
          let last = 0;
          return function(e) {
            const now = Date.now();
            if (now - last < 400) {
              removeComponent(instanceId);
              e.preventDefault();
            }
            last = now;
          };
        })();
      } else {
        cell.el.innerHTML = '';
        cell.el.removeAttribute('draggable');
        cell.el.ondragstart = null;
        cell.el.oncontextmenu = null;
        cell.el.ontouchstart = null;
      }
    }
  }
}

function removeComponent(instanceId, update = true) {
  placedComponents = placedComponents.filter(c => c.id !== instanceId);
  for (let row of grid) {
    for (let cell of row) {
      if (cell.instanceId === instanceId) {
        cell.occupied = false;
        cell.compId = null;
        cell.instanceId = null;
        cell.el.className = 'cell';
        cell.el.innerHTML = '';
        cell.el.style.background = '';
        cell.el.ondragstart = null;
        cell.el.oncontextmenu = null;
        cell.el.ontouchstart = null;
      }
    }
  }
  if (update) updateStats();
}

// ----- STATISTIKEN & BUDGET -----
function updateBudgetLabels() {
  document.getElementById("pointsLabel").textContent = langData.stats.points + ":";
  document.getElementById("energyLabel").textContent = langData.stats.energy + ":";
  document.getElementById("areaLabel").textContent = langData.stats.area + ":";
  document.getElementById("perfLabel").textContent = langData.stats.perf + ":";
  let pointsMax = currentTask.points, energyMax = currentTask.energy, areaMax = currentTask.area;
  document.getElementById("pointsMax").textContent = pointsMax === Infinity ? "∞" : pointsMax;
  document.getElementById("energyMax").textContent = energyMax === Infinity ? "∞" : energyMax;
  document.getElementById("areaMax").textContent = areaMax === Infinity ? "∞" : areaMax;
}

function updateStats() {
  let points = 0, energy = 0, area = 0, perf = 0;
  placedComponents.forEach(c => {
    points += c.points;
    energy += c.energy;
    area += c.width * c.height;
    perf += c.perf;
  });
  document.getElementById("points").textContent = points;
  document.getElementById("energy").textContent = energy;
  document.getElementById("area").textContent = area;
  document.getElementById("perf").textContent = perf;

  let messages = [];
  if (currentTask.points !== Infinity && points > currentTask.points) messages.push("❌ " + (langData.stats.points_error || "Punkte zu hoch"));
  if (currentTask.energy !== Infinity && energy > currentTask.energy) messages.push("❌ " + (langData.stats.energy_error || "Energie zu hoch"));
  if (currentTask.area !== Infinity && area > currentTask.area) messages.push("❌ " + (langData.stats.area_error || "Fläche zu groß"));

  document.getElementById("result").innerHTML =
    messages.length === 0
      ? `<span class="ok">${langData.stats.result_success}</span>`
      : `<span class="warning">${messages.join("<br>")}</span>`;
}

// ---- INIT -----
(async function(){
  await loadLang(currentLang);
})();
