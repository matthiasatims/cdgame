let placedComponents = [];

// Andere Variablen
let gridSize = 10;
let grid = [];

// Die Funktion zum Aktualisieren des Grids
function buildGrid() {
  grid = [];
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 40px)`;  // 10 Zellen pro Zeile
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
      grid[y][x] = { occupied: false, el: cell, compId: null };
      gridEl.appendChild(cell);
    }
  }
}

// Beispiel für das Hinzufügen einer Komponente ins Grid
function placeComponent(x, y, comp) {
  // Stelle sicher, dass placedComponents definiert ist
  placedComponents.push({ ...comp, x, y });

  for (let dy = 0; dy < comp.height; dy++) {
    for (let dx = 0; dx < comp.width; dx++) {
      const cell = grid[y + dy][x + dx];
      cell.occupied = true;
      cell.compId = comp.name;
      cell.el.className = 'cell placed';
      cell.el.style.background = getColor(comp.tag);

      // Hier wird der Text in der Zelle angezeigt
      if (dx === 0 && dy === 0) {
        cell.el.innerHTML = `<span class="placed">${comp.shortName}</span>`;
      } else {
        cell.el.innerHTML = '';
      }
    }
  }
}

// Aufgaben-Budgets
const tasks = {
  task1: { points: 100, energy: 10, area: 12, performance: 10 },
  task2: { points: 200, energy: 30, area: 20, performance: 30 },
  task3: { points: 80, energy: 5, area: 10, performance: 5 }
};

let currentTask = tasks.task1; // Standardaufgabe zu Beginn

// Komponenten
const components = [
  {
    name: "CPU-Kern",
    shortName: "CPU",
    points: 15, energy: 2, area: 2, perf: 1,
    tag: "cpu",
    coreCount: 1,
    minWidth: 2,
    maxWidth: 6,
    maxHeight: 2,
    getDims: function() {
      let total = this.coreCount * this.minWidth;
      if (total <= this.maxWidth) {
        return { width: total, height: 1 };
      } else {
        let w = this.maxWidth;
        let h = Math.ceil(total / w);
        return { width: w, height: h };
      }
    }
  },
  // Weitere Komponenten hier
];

// Budget und Aufgabe aktualisieren
const taskSelect = document.getElementById('taskSelect');
taskSelect.addEventListener("change", () => {
  currentTask = tasks[taskSelect.value]; // Budget entsprechend der Aufgabe anpassen
  updateStats(); // Budget anpassen und Anzeige aktualisieren
  rerender();
});

// Rendering der Komponenten und des Grids
function renderComponentList() {
  componentList.innerHTML = '';
  components.forEach((comp, i) => {
    const div = document.createElement('div');
    div.className = 'component';
    div.dataset.index = i;
    div.style.background = getColor(comp.tag);
    div.setAttribute('draggable', true);

    let componentHTML = `<strong>${comp.name}</strong>
      Punkte: ${comp.points}<br>
      Energie: ${comp.energy}, Fläche: ${comp.area}, Leistung: ${comp.perf}`;

    if (comp.tag === "cpu") {
      componentHTML += `
        <label for="coreCount${i}">Kernanzahl:</label>
        <input type="number" id="coreCount${i}" min="1" max="16" value="${comp.coreCount}" data-index="${i}">
        <br><label>Breite: ${comp.getDims().width}</label><br><label>Höhe: ${comp.getDims().height}</label>
      `;
    }

    div.innerHTML = componentHTML;

    div.querySelector(`#coreCount${i}`).addEventListener("input", (e) => {
      comp.coreCount = parseInt(e.target.value) || 1;
      rerender();
    });

    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("compIndex", i);
    });

    componentList.appendChild(div);
  });
}

// Grid neu rendern und Aufgabe aktualisieren
function rerender() {
  buildGrid();
  let oldPlaced = placedComponents.slice();
  placedComponents = [];
  oldPlaced.forEach(pc => {
    const comp = components.find(c => c.name === pc.name);
    if (canPlace(pc.x, pc.y, comp)) {
      placeComponent(pc.x, pc.y, comp);
    }
  });
  renderComponentList();
  updateStats();
}

// Budget und Leistungsanforderungen für die Aufgabe anzeigen
function updateStats() {
  let points = 0, energy = 0, area = 0, perf = 0;
  placedComponents.forEach(c => {
    const dims = c.getDims();
    points += c.points;
    energy += c.energy;
    area += dims.width * dims.height;
    perf += c.perf;
  });

  points = Math.min(points, currentTask.points);
  energy = Math.min(energy, currentTask.energy);
  area = Math.min(area, currentTask.area);

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