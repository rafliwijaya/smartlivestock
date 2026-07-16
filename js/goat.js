// js/goat.js
import { db, ref } from "./firebase.js";
import { onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM References
const tableBody        = document.getElementById("goatTableBody");
const searchInput      = document.getElementById("searchInput");
const filterPen        = document.getElementById("filterPen");
const filterStatus     = document.getElementById("filterStatus");
const filterBreed      = document.getElementById("filterBreed");
const filterWeighing   = document.getElementById("filterWeighing");
const paginationInfo   = document.getElementById("paginationInfo");
const paginationButtons= document.getElementById("paginationButtons");

// Config State — settings dimuat SEBELUM listener dipasang agar status benar sejak pertama buka
let minADG      = 0.60;
let warningDays = 30;
let settingsReady = false;

let goatsData    = {};
let weighingsData= {};
let filteredGoats= [];
let currentPage  = 1;
const itemsPerPage = 8;

// ─── 1. Load settings dulu, BARU pasang listener ─────────────────────────────
get(ref(db, "settings")).then((snap) => {
  if (snap.exists()) {
    const s = snap.val();
    minADG      = parseFloat(s.minADG)      || 0.60;
    warningDays = parseInt(s.warningDays)   || 30;
  }
  settingsReady = true;
  attachListeners();          // baru sekarang pasang listener Firebase
});

function attachListeners() {
  onValue(ref(db, "goat"), (snap) => {
    goatsData = snap.val() || {};
    processAndRenderTable();
  });
  onValue(ref(db, "weighings"), (snap) => {
    weighingsData = snap.val() || {};
    processAndRenderTable();
  });
}

// ─── 2. Hitung status — hanya 2 nilai: "Healthy" atau "Monitoring" ───────────
function calculateHealthStatus(goatId, goat, weighs) {
  const now = Date.now();

  // Belum pernah ditimbang sama sekali → Monitoring
  if (!goat.lastWeighDate || goat.lastWeighDate === 0) {
    return "Monitoring";
  }

  // Sudah melebihi batas periode timbang → Monitoring
  const daysSinceLastWeigh = (now - goat.lastWeighDate) / (1000 * 60 * 60 * 24);
  if (daysSinceLastWeigh > warningDays) {
    return "Monitoring";
  }

  // Periksa ADG dari 2 rekaman terakhir
  const goatWeighs = weighs[goatId];
  if (goatWeighs) {
    const list = Object.values(goatWeighs).sort((a, b) => a.timestamp - b.timestamp);
    if (list.length >= 2) {
      const last = list[list.length - 1];
      const prev = list[list.length - 2];
      const weightDiff = last.weight - prev.weight;

      // Berat turun → Monitoring
      if (weightDiff < 0) return "Monitoring";

      // ADG di bawah minimum → Monitoring
      const days = (last.timestamp - prev.timestamp) / (1000 * 60 * 60 * 24) || 1;
      const adg  = weightDiff / days;
      if (adg < minADG) return "Monitoring";
    }
  }

  return "Healthy";
}

// ─── 3. Filter + render tabel ────────────────────────────────────────────────
function processAndRenderTable() {
  const searchVal = searchInput.value.toLowerCase().trim();
  const penVal    = filterPen.value;
  const statusVal = filterStatus.value;
  const breedVal  = filterBreed.value;
  const weighingVal = filterWeighing.value;

  filteredGoats = [];

  Object.keys(goatsData).forEach((id) => {
    const goat   = goatsData[id];
    const status = calculateHealthStatus(id, goat, weighingsData);

    const matchesSearch = id.toLowerCase().includes(searchVal)
      || (goat.name  && goat.name.toLowerCase().includes(searchVal))
      || (goat.rfid  && goat.rfid.toLowerCase().includes(searchVal));

    const matchesPen    = penVal    === "ALL" || goat.cage  === penVal;
    const matchesStatus = statusVal === "ALL" || status     === statusVal;
    const matchesBreed  = breedVal  === "ALL" || goat.breed === breedVal;

    let matchesWeighing = true;
    const hasWeighed = goat.lastWeighDate && goat.lastWeighDate !== 0;
    if (weighingVal === "NEVER") {
      matchesWeighing = !hasWeighed;
    } else if (weighingVal === "OVERDUE_30") {
      const daysSince = hasWeighed ? (Date.now() - goat.lastWeighDate) / (1000 * 60 * 60 * 24) : null;
      matchesWeighing = !hasWeighed || (daysSince > 30);
    }

    if (matchesSearch && matchesPen && matchesStatus && matchesBreed && matchesWeighing) {
      filteredGoats.push({ id, ...goat, computedStatus: status });
    }
  });

  filteredGoats.sort((a, b) => a.id.localeCompare(b.id));
  currentPage = 1;
  renderTableData();
}

// ─── 4. Render tabel + pagination ────────────────────────────────────────────
function renderTableData() {
  tableBody.innerHTML = "";

  const total      = filteredGoats.length;
  const startIdx   = (currentPage - 1) * itemsPerPage;
  const endIdx     = Math.min(startIdx + itemsPerPage, total);
  const totalPages = Math.ceil(total / itemsPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const displayed = filteredGoats.slice(startIdx, endIdx);

  if (displayed.length > 0) {
    displayed.forEach((goat) => {
      const tr = document.createElement("tr");

      // Gender teks saja (tanpa ikon)
      const genderText = goat.gender === "Jantan" ? "Jantan" : "Betina";

      // Status badge — hanya 2 jenis
      const isHealthy  = goat.computedStatus === "Healthy";
      const badgeClass = isHealthy ? "badge-success" : "badge-danger";
      const badgeLabel = isHealthy ? "Healthy" : "Monitoring";

      // Kandang: ambil suffix A/B/C saja
      const cageShort = goat.cage ? goat.cage.replace(/Kandang\s*/i, "") : "-";

      tr.innerHTML = `
        <td><b>CT-${goat.id}</b></td>
        <td><code>${goat.rfid || "-"}</code></td>
        <td style="font-weight:600; color:var(--primary-dark);">${goat.name || "-"}</td>
        <td>${goat.breed || "-"}</td>
        <td>${genderText}</td>
        <td style="font-weight:600; text-align:center;">${cageShort}</td>
        <td style="font-weight:700;">${goat.lastWeight ? goat.lastWeight + " kg" : "-"}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td style="text-align:center;">
          <a href="goat-detail.html?id=${goat.id}" class="btn btn-secondary btn-sm" style="padding:6px 12px;">
            👁 Detail
          </a>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    paginationInfo.innerText = `Showing ${startIdx + 1}–${endIdx} of ${total} entries`;
  } else {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; color:var(--text-muted); padding:40px 0;">
          Tidak ada data kambing yang cocok.
        </td>
      </tr>`;
    paginationInfo.innerText = "Showing 0–0 of 0 entries";
  }

  renderPaginationButtons(totalPages);
}

// ─── 5. Pagination buttons ────────────────────────────────────────────────────
function renderPaginationButtons(totalPages) {
  paginationButtons.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = "&lt;";
  prevBtn.disabled  = currentPage === 1;
  prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTableData(); } });
  paginationButtons.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.className = `page-btn ${i === currentPage ? "active" : ""}`;
    btn.innerText = i;
    btn.addEventListener("click", () => { currentPage = i; renderTableData(); });
    paginationButtons.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = "&gt;";
  nextBtn.disabled  = currentPage === totalPages;
  nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderTableData(); } });
  paginationButtons.appendChild(nextBtn);
}

// ─── 6. UI filter events ──────────────────────────────────────────────────────
searchInput.addEventListener("input",  () => { currentPage = 1; processAndRenderTable(); });
filterPen.addEventListener("change",   () => { currentPage = 1; processAndRenderTable(); });
filterStatus.addEventListener("change",() => { currentPage = 1; processAndRenderTable(); });
filterBreed.addEventListener("change", () => { currentPage = 1; processAndRenderTable(); });
filterWeighing.addEventListener("change", () => { currentPage = 1; processAndRenderTable(); });