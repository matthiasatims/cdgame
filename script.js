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
  }
};
let currentTask = tasks.task1;

// Komponenten
const components = [
  { name: "CPU-Kern", shortName: "CPU", points: 15, energy: 2, area: 2, perf: 1, tag: "cpu", width: 2, height: 1 },
  { name: "Bluetooth LE", shortName: "BT", points: 20, energy: 2, area: 2, perf: 1, tag: "com", width: 2, height: 1 },
  { name: "GPS-Modul", shortName: "GPS", points: 30, energy: 4, area: 3, perf: 2, tag: "com", width: 3, height: 1 },
  { name: "AI-Beschleuniger", shortName: "AI", points: 30, energy: 3, area: 4, perf: 4, tag: "ai", width: 2, height: 2 },
  { name: "Flash-Speicher", shortName: "FS", points: 15, energy: 1, area: 2, perf: 1, tag: "mem", width: 2, height: 1 },
  { name: "Sicherheitsblock", shortName: "Sec", points: 10, energy: 1, area: 1, perf: 1, tag: "sec", width: 1, height: 1 }
];

let gridSize = 10;
let grid = [];
let placedComponents = [];
let uniqueId = 1;
let dragInstanceId = null; // Für Drag von platzierten Komponenten

// DOM
const gridEl = document.getElementById('chipGrid');
const componentList = document.getElementById('componentList');
const sizeSelect = document.getElementById('gridSizeSelect');
const taskSelect = document.getElementById('taskSelect');
const taskDescEl = document.getElementById('taskDesc');

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

function renderComponentList() {
  componentList.innerHTML = '';
  components.forEach((comp, i) => {
    const div = document.createElement('div');
    div.className = 'component';
    div.dataset.index = i;
    div.style.background = getColor(comp.tag);
    div.setAttribute('draggable', true);
    div.innerHTML = `<strong>${comp.name}</strong>
      Punkte: ${comp.points}<br>
      Energie: ${comp.energy}, Fläche: ${comp.area}, Leistung: ${comp.perf}`;
    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("compIndex", i);
      e.dataTransfer.setData("fromGrid", "0");
    });
    componentList.appendChild(div);
  });
}

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

function getColor(tag) {
  return {
    cpu: "#5e81ac", com: "#a3be8c", ai: "#b48ead", sec: "#ebcb8b", mem: "#d08770"
  }[tag] || "#d8dee9";
}

// --- Drag & Drop ---
function handleDrop(e) {
  // Komponente aus Liste oder Grid?
  const fromGrid = e.dataTransfer.getData("fromGrid");
  if (fromGrid === "1") {
    // Drag einer platzierten Instanz
    const instanceId = Number(e.dataTransfer.getData("instanceId"));
    const compData = placedComponents.find(c => c.id === instanceId);
    if (!compData) return;
    // Neue Position
    const x = Number(e.target.dataset.x);
    const y = Number(e.target.dataset.y);
    // Vorübergehend entfernen
    removeComponent(instanceId, false);
    if (canPlace(x, y, compData)) {
      placeComponent(x, y, compData, instanceId); // alte ID wiederverwenden!
      updateStats();
    } else {
      // zurücksetzen auf alte Position
      placeComponent(compData.x, compData.y, compData, instanceId);
      updateStats();
      alert("❌ Nicht genug Platz oder überlappt!");
    }
  } else {
    // Drag aus Komponentenliste
    const index = Number(e.dataTransfer.getData("compIndex"));
    const comp = components[index];
    const x = Number(e.target.dataset.x);
    const y = Number(e.target.dataset.y);

    if (canPlace(x, y, comp)) {
      placeComponent(x, y, comp);
      updateStats();
    } else {
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
  // forceId wird für Drag aus Grid genutzt (gleiche Instanz wiederverwenden)
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
        cell.el.setAttribute('draggable', true);
        cell.el.ondragstart = function(ev) {
          ev.dataTransfer.setData("fromGrid", "1");
          ev.dataTransfer.setData("instanceId", instanceId);
        };
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
  if (points > currentTask.points) messages.push("❌ Punkte zu hoch");
  if (energy > currentTask.energy) messages.push("❌ Energie zu hoch");
  if (area > currentTask.area) messages.push("❌ Fläche zu groß");

  document.getElementById("result").innerHTML =
    messages.length === 0
      ? '<span class="ok">✅ Chip erfüllt alle Anforderungen</span>'
      : `<span class="warning">${messages.join("<br>")}</span>`;
}

// Chipgröße ändern (Dropdown)
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

// Initialisierung
renderComponentList();
buildGrid();
updateBudgetLabels();
updateTaskDesc();
updateStats();
