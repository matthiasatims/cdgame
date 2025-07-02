// Aufgaben mit Beschreibung und Budgets
const tasks = {
  task1: {
    name: "Standard",
    desc: "Entwerfe einen Standard-Chip mit ausgewogenem Verhältnis von Leistung, Energie und Fläche.",
    points: 100, energy: 10, area: 12
  },
  task2: {
    name: "High Performance",
    desc: "Maximiere die Leistung für High-Performance-Anwendungen. Großes Budget, aber auch anspruchsvoll.",
    points: 200, energy: 30, area: 20
  },
  task3: {
    name: "Low Power",
    desc: "Baue einen Chip für besonders niedrigen Energieverbrauch und kleine Fläche.",
    points: 80, energy: 5, area: 10
  },
  custom: {
    name: "Custom Design",
    desc: "Erstelle ein beliebiges Chipdesign – ohne jegliche Einschränkungen.",
    points: Infinity,
    energy: Infinity,
    area: Infinity
  }
};
let currentTask = tasks.task1;

// DOM
const taskSelect = document.getElementById('taskSelect');
const taskDescEl = document.getElementById('taskDesc');
const componentLibraryEl = document.getElementById('componentLibrary');
const gridEl = document.getElementById('chipGrid');
const sizeSelect = document.getElementById('gridSizeSelect');

// Grid
let gridSize = 10;
let grid = [];
let placedComponents = [];
let uniqueId = 1;

// Komponenten-Library-Daten (wird per loadLibrary geladen)
let libraryData = {};

// Aufgaben-Auswahl Dropdown initialisieren
if (taskSelect) {
  taskSelect.innerHTML = "";
  for (const [key, t] of Object.entries(tasks)) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = t.name;
    taskSelect.appendChild(opt);
  }
  taskSelect.value = "task1";
  taskSelect.addEventListener("change", () => {
    currentTask = tasks[taskSelect.value];
    updateStats();
    updateBudgetLabels();
    updateTaskDesc();
  });
}

function updateTaskDesc() {
  if (taskDescEl && currentTask) {
    taskDescEl.textContent = currentTask.desc;
  }
}
function updateBudgetLabels() {
  document.getElementById("pointsMax").textContent = currentTask.points;
  document.getElementById("energyMax").textContent = currentTask.energy;
  document.getElementById("areaMax").textContent = currentTask.area;
}

// ---- Komponenten-Library laden & rendern ----

async function loadLibrary() {
  // Passe hier Gruppen und JSON-Dateien an
  const groups = [
    { name: "Prozessoren",   file: "library/cpus.json" },
    { name: "Kommunikation", file: "library/comms.json" },
    { name: "KI-Beschleuniger", file: "library/ai.json" },
    { name: "Speicher", file: "library/memory.json" },
    { name: "Sicherheit", file: "library/security.json" }
  ];

  const data = {};
  for (const group of groups) {
    try {
      const resp = await fetch(group.file);
      if (!resp.ok) continue;
      data[group.name] = await resp.json();
    } catch(e) {
      // Datei nicht gefunden o.ä.
    }
  }
  libraryData = data;
  renderAccordion(libraryData);
}

function renderAccordion(data) {
  componentLibraryEl.innerHTML = '';
  Object.entries(data).forEach(([groupName, comps], groupIdx) => {
    const section = document.createElement('section');
    section.className = 'comp-group';

    // Header
    const header = document.createElement('div');
    header.className = 'comp-group-header';
    header.textContent = `▼ ${groupName}`;
    header.dataset.group = groupName;
    header.style.cursor = 'pointer';

    // Content
    const content = document.createElement('div');
    content.className = 'comp-group-content';
    content.style.display = groupIdx === 0 ? 'block' : 'none';

    comps.forEach((comp, i) => {
      const div = document.createElement('div');
      div.className = 'component';
      div.setAttribute('draggable', true);
      div.innerHTML = `<strong>${comp.name}</strong>
        ${comp.brand ? `<br><small>${comp.brand}</small>` : ""}
        <br>Punkte: ${comp.points}, Energie: ${comp.energy}, Fläche: ${comp.area}, Leistung: ${comp.perf}`;
      div.addEventListener("dragstart", e => {
        e.dataTransfer.setData("type", "component");
        e.dataTransfer.setData("componentObj", JSON.stringify(comp));
      });
      content.appendChild(div);
    });

    header.addEventListener('click', () => {
      content.style.display = (content.style.display === 'none') ? 'block' : 'none';
      header.textContent = `${content.style.display === 'block' ? '▼' : '►'} ${groupName}`;
    });

    section.appendChild(header);
    section.appendChild(content);
    componentLibraryEl.appendChild(section);
  });
}

// ----------- GRID -----------

function buildGrid() {
  grid = [];
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;
  gridEl.style.gridTemplateRows = `repeat(${gridSize}, 40px)`;

  for (let y = 0; y < gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < gridSize; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.addEventListener("dragover", e => e.preventDefault());
      cell.addEventListener("drop", handleDrop);
      grid[y][x] = { occupied: false, el: cell, compId: null, instanceId: null };
      gridEl.appendChild(cell);
    }
  }
}

// ----------- Farben je Komponententyp -----------

function getColor(tag) {
  return {
    cpu: "#5e81ac", com: "#a3be8c", ai: "#b48ead", sec: "#ebcb8b", mem: "#d08770"
  }[tag] || "#d8dee9";
}

// ----------- Drag & Drop / Platzieren und Verschieben -----------

function handleDrop(e) {
  const type = e.dataTransfer.getData("type");
  const x = Number(e.target.dataset.x);
  const y = Number(e.target.dataset.y);

  if (type === "component") {
    // Aus Komponentenbibliothek
    const comp = JSON.parse(e.dataTransfer.getData("componentObj"));
    if (canPlace(x, y, comp)) {
      placeComponent(x, y, comp);
      updateStats();
    } else {
      alert("❌ Nicht genug Platz oder überlappt!");
    }
  } else if (type === "instance") {
    // Verschieben einer bestehenden Instanz
    const instanceId = Number(e.dataTransfer.getData("instanceId"));
    const inst = placedComponents.find(c => c.id === instanceId);
    if (!inst) return;
    // Vorübergehend entfernen
    removeComponent(instanceId, false);
    if (canPlace(x, y, inst)) {
      placeComponent(x, y, inst, instanceId);
      updateStats();
    } else {
      // zurück auf alte Position
      placeComponent(inst.x, inst.y, inst, instanceId);
      updateStats();
      alert("❌ Nicht genug Platz oder überlappt!");
    }
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
        cell.el.innerHTML = `<span class="placed">${comp.shortName}</span>`;
        // Draggen einer Instanz ermöglichen
        cell.el.setAttribute('draggable', true);
        cell.el.ondragstart = function(ev) {
          ev.dataTransfer.setData("type", "instance");
          ev.dataTransfer.setData("instanceId", instanceId);
        };
        // Rechtsklick zum Entfernen
        cell.el.oncontextmenu = function(e) {
          e.preventDefault();
          removeComponent(instanceId);
        };
      } else {
        cell.el.innerHTML = '';
        cell.el.removeAttribute('draggable');
        cell.el.ondragstart = null;
        cell.el.oncontextmenu = null;
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
      }
    }
  }
  if (update) updateStats();
}

// ----------- Statistiken & Budget -----------

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

  const messages = [];
  if (currentTask.points !== Infinity && points > currentTask.points) messages.push("❌ Punkte zu hoch");
  if (currentTask.energy !== Infinity && energy > currentTask.energy) messages.push("❌ Energie zu hoch");
  if (currentTask.area !== Infinity && area > currentTask.area) messages.push("❌ Fläche zu groß");

  document.getElementById("result").innerHTML =
    messages.length === 0
      ? '<span class="ok">✅ Chip erfüllt alle Anforderungen</span>'
      : `<span class="warning">${messages.join("<br>")}</span>`;
}

// ----------- Chipgröße ändern (Dropdown) -----------

sizeSelect.addEventListener("change", () => {
  gridSize = parseInt(sizeSelect.value);
  rerender();
});

function rerender() {
  buildGrid();
  const toReplace = placedComponents.slice();
  placedComponents = [];
  for (const c of toReplace) {
    if (canPlace(c.x, c.y, c)) {
      placeComponent(c.x, c.y, c, c.id);
    }
  }
  updateStats();
}

// ----------- Initialisierung -----------

buildGrid();
updateBudgetLabels();
updateTaskDesc();
updateStats();
loadLibrary();
