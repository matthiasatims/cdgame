const timingTasks = [
  { name: "CPU-Berechnung", resources: "CPU, Speicher", time: 5, energy: 10, startTime: 0, endTime: 5 },
  { name: "Datenübertragung", resources: "Bluetooth", time: 3, energy: 6, startTime: 5, endTime: 8 },
  { name: "KI-Inferenz", resources: "AI-Beschleuniger", time: 4, energy: 8, startTime: 8, endTime: 12 }
];

const energyBudget = 30;  // Gesamtenergie-Budget
const deadline = 14;      // Alle Tasks müssen bis zu diesem Zeitpunkt fertig sein

function loadTimingTasks() {
  const tableBody = document.getElementById("taskTable").querySelector("tbody");
  tableBody.innerHTML = "";
  timingTasks.forEach((task, idx) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${task.name}</td>
      <td>${task.resources}</td>
      <td>${task.time} Zyklen</td>
      <td>${task.energy} J</td>
      <td><input type="number" min="0" value="${task.startTime}" data-idx="${idx}" data-type="start"></td>
      <td><input type="number" min="0" value="${task.endTime}" data-idx="${idx}" data-type="end"></td>
    `;
    tableBody.appendChild(row);
  });

  // Inputs überwachen
  tableBody.querySelectorAll("input[type='number']").forEach(inp => {
    inp.addEventListener("change", e => {
      const idx = +inp.dataset.idx;
      if (inp.dataset.type === "start") timingTasks[idx].startTime = +inp.value;
      else timingTasks[idx].endTime = +inp.value;
      // Automatisch Task-Dauer anpassen, falls Endzeit < Startzeit
      if (timingTasks[idx].endTime < timingTasks[idx].startTime) {
        timingTasks[idx].endTime = timingTasks[idx].startTime + timingTasks[idx].time;
        // Inputfeld updaten
        tableBody.querySelectorAll("input[data-idx='" + idx + "'][data-type='end']")[0].value = timingTasks[idx].endTime;
      }
      updateProgressBar();
    });
  });
}

function updateProgressBar() {
  let maxEnd = Math.max(...timingTasks.map(t => t.endTime));
  let totalEnergy = timingTasks.reduce((a, t) => a + t.energy, 0);
  let latestFinish = Math.max(...timingTasks.map(t => t.endTime));
  let ok = true;
  let msg = [];

  if (totalEnergy > energyBudget) {
    ok = false;
    msg.push("❌ Energie-Budget überschritten! (" + totalEnergy + " > " + energyBudget + ")");
  }
  if (latestFinish > deadline) {
    ok = false;
    msg.push("❌ Deadline überschritten! (" + latestFinish + " > " + deadline + ")");
  }
  // Prüfe auf Überschneidungen (z.B. gleicher Resource-String & Überschneidung)
  for (let i = 0; i < timingTasks.length; ++i) {
    for (let j = i + 1; j < timingTasks.length; ++j) {
      if (timingTasks[i].resources === timingTasks[j].resources &&
        !(timingTasks[i].endTime <= timingTasks[j].startTime || timingTasks[i].startTime >= timingTasks[j].endTime)) {
        ok = false;
        msg.push(`❌ Ressourcen-Konflikt bei "${timingTasks[i].resources}" (${timingTasks[i].name} & ${timingTasks[j].name})`);
      }
    }
  }

  let progress = Math.round(100 * Math.min(deadline, maxEnd) / deadline);
  document.getElementById("taskProgress").value = progress;

  let timingResult = document.getElementById("timingResult");
  if (ok) {
    timingResult.innerHTML = `<span class="ok">✅ Alle Aufgaben im Zeit- und Energie-Budget!</span>`;
  } else {
    timingResult.innerHTML = msg.join("<br>");
  }
}

loadTimingTasks();
updateProgressBar();
