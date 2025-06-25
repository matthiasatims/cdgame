// Initialisierung der placedComponents-Variable (speichert alle platzierten Komponenten)
let placedComponents = [];
let gridSize = 10;
let grid = [];
let components = [
  {
    name: "CPU-Kern",
    shortName: "CPU",
    points: 15,
    energy: 2,
    area: 2,
    perf: 1,
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
  {
    name: "Bluetooth LE",
    shortName: "BT",
    points: 20,
    energy: 2,
    area: 2,
    perf: 1,
    tag: "com",
    width: 2,
    height: 1,
    getDims: function() { return { width: 2, height: 1 }; }
  },
  {
    name: "GPS-Modul",
    shortName: "GPS",
    points: 30,
    energy: 4,
    area: 3,
    perf: 2,
    tag: "com",
    width: 3,
    height: 1,
    getDims: function() { return { width: 3, height: 1 }; }
  },
  {
    name: "AI-Beschleuniger",
    shortName: "AI",
    points: 30,
    energy: 3,
    area: 4,
    perf: 4,
    tag: "ai",
    tops: 10,
    minWidth: 2,
    maxWidth: 4,
    maxHeight: 2,
    getDims: function() {
      let total = Math.ceil(this.tops / 10) * this.minWidth;
      if (total <= this.maxWidth) {
        return { width: total, height: 1 };
      } else {
        let w = this.maxWidth;
        let h = Math.ceil(total / w);
        return { width: w, height: h };
      }
    }
  },
  {
    name: "Flash-Speicher",
    shortName: "FS",
    points: 15,
    energy: 1,
    area: 2,
    perf: 1,
    tag: "mem",
    width: 2,
    height: 1,
    getDims: function() { return { width: 2, height: 1 }; }
  },
  {
    name: "Sicherheitsblock",
    shortName: "Sec",
    points: 10,
    energy: 1,
    area: 1,
    perf: 1,
    tag: "sec",
    width: 1,
    height: 1,
    getDims: function() { return { width: 1, height: 1 }; }
  }
];

// DOM-Elemente
const gridEl = document.getElementById('chipGrid');
const componentList = document.getElementById('componentList');
const sizeSelect = document.getElementById('gridSizeSelect');
const taskSelect = document.getElementById('taskSelect');

// Grid erstellen
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

// Komponenten rendern
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
    if (comp.tag === "ai") {
      componentHTML += `
        <label for="tops${i}">TOPS:</label>
        <input type="number" id="tops${i}" min="1" max="100" value="${comp.tops}" data-index="${i}">
        <br><label>Breite: ${comp.getDims().width}</label><br><label>Höhe: ${comp.getDims().height}</label>
      `;
    }

    div.innerHTML = componentHTML;

    // Event-Listener für Eingabefelder
    if (comp.tag === "cpu") {
      div.querySelector(`#coreCount${i}`).addEventListener("input", (e) => {
        comp.coreCount = parseInt(e.target.value) || 1;
        rerender();
      });
    }
    if (comp.tag === "ai") {
      div.querySelector(`#tops${i}`).addEventListener("input", (e) => {
        comp.tops = parseInt(e.target.value) || 10;
        rerender();
      });
    }

    div.addEventListener("dragstart", e => {
      e.dataTransfer.setData("compIndex", i);
    });

    componentList.appendChild(div);
  });
}

// Farbe basierend auf dem Tag der Komponente
function getColor(tag) {
  return {
    cpu: "#5e81ac",
    com: "#a3be8c",
    ai: "#b48ead",
    sec: "#ebcb8b",
    mem: "#d08770"
  }[tag] || "#d8dee9";
}

// Handhabung des Drag-and-Drop
function handleDrop(e) {
  const index = parseInt(e.dataTransfer.getData("compIndex"));
  const comp = components[index];
  const x = parseInt(e.target.dataset.x);
  const y = parseInt(e.target.dataset.y);

  if (canPlace(x, y, comp)) {
    removeIfPresent(comp);
    placeComponent(x, y, comp);
    updateStats();
  } else {
    alert("❌ Nicht genug Platz oder überlappt!");
  }
}

// Prüfen, ob eine Komponente an der gegebenen Position platziert werden kann
function canPlace(x, y, comp) {
  const dims = comp.getDims();
  if (x + dims.width > gridSize || y + dims.height > gridSize) return false;
  for (let dy = 0; dy < dims.height; dy++) {
    for (let dx = 0; dx < dims.width; dx++) {
      const targetCell = grid[y + dy][x + dx];
      if (targetCell.occupied && targetCell.compId !== comp.name) return false;
    }
  }
  return true;
}

// Platzieren der Komponente
function placeComponent(x, y, comp) {
  const dims = comp.getDims();
  placedComponents.push({ ...comp, x, y });
  for (let dy = 0; dy < dims.height; dy++) {
    for (let dx = 0; dx < dims.width; dx++) {
      const cell = grid[y + dy][x + dx];
      cell.occupied = true;
      cell.compId = comp.name;
      cell.el.className = 'cell placed';
      cell.el.style.background = getColor(comp.tag);

      if (dx === 0 && dy === 0) {
        cell.el.innerHTML = `<span class="placed">${comp.shortName}</span>`;
        cell.el.setAttribute('draggable', true);
        cell.el.addEventListener("dragstart", e => {
          e.dataTransfer.setData("compIndex", components.indexOf(comp));
        });
      } else {
        cell.el.innerHTML = '';
      }
    }
  }
}

// Entfernen von Komponenten
function removeIfPresent(comp) {
  placedComponents = placedComponents.filter(c => c.name !== comp.name);
  for (let row of grid) {
    for (let cell of row) {
      if (cell.compId === comp.name) {
        cell.occupied = false;
        cell.compId = null;
        cell.el.className = 'cell';
        cell.el.innerHTML = '';
        cell.el.style.background = '';
        cell.el.removeAttribute('draggable');
        cell.el.oncontextmenu = null;
      }
    }
  }
}

// Aktualisieren der Statistiken
function updateStats() {
  let points = 0, energy = 0, area = 0, perf = 0;
  placedComponents.forEach(c => {
    const dims = c.getDims();
    points += c.points;
    energy += c.energy;
    area += dims.width * dims.height;
    perf += c.perf;
  });

  // Budget und Leistungsanforderungen
  document.getElementById("points").textContent = points;
  document.getElementById("energy").textContent = energy;
  document.getElementById("area").textContent = area;
  document.getElementById("perf").textContent = perf;

  const messages = [];
  if (points > 100) messages.push("❌ Punkte zu hoch");
  if (energy > 10) messages.push("❌ Energie zu hoch");
  if (area > 12) messages.push("❌ Fläche zu groß");

  document.getElementById("result").innerHTML =
    messages.length === 0
      ? '<span class="ok">✅ Chip erfüllt alle Anforderungen</span>'
      : `<span class="warning">${messages.join("<br>")}</span>`;
}

// Beim Ändern der Chipgröße neu rendern
sizeSelect.addEventListener("change", () => {
  gridSize = parseInt(sizeSelect.value);
  rerender();
});

function rerender() {
  buildGrid();
  placedComponents.forEach(pc => {
    const comp = components.find(c => c.name === pc.name);
    if (canPlace(pc.x, pc.y, comp)) {
      placeComponent(pc.x, pc.y, comp);
    }
  });
  updateStats();
}

// Initialisierung der Seite
renderComponentList();
buildGrid();
