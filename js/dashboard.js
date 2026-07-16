// js/dashboard.js
import { db, ref } from "./firebase.js";
import { onValue, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ─── DOM Refs ───────────────────────────────────────────────────────────────
const statTotal      = document.getElementById("statTotal");
const statWeighed    = document.getElementById("statWeighed");
const statUnweighed  = document.getElementById("statUnweighed");
const statNormal     = document.getElementById("statNormal");
const statCritical   = document.getElementById("statCritical");
const subWeighed     = document.getElementById("subWeighed");
const subUnweighed   = document.getElementById("subUnweighed");
const lastUpdatedEl  = document.getElementById("lastUpdated");
const avgAdgText     = document.getElementById("avgAdgText");
const adgDesc        = document.getElementById("adgDesc");
const recentList     = document.getElementById("recentWeighingList");
const btnRefresh     = document.getElementById("btnRefresh");

// ─── Helpers ────────────────────────────────────────────────────────────────
function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);
  if (diff  < 0)   return "Baru saja";
  if (mins  < 1)   return "Baru saja";
  if (mins  < 60)  return `${mins} mnt lalu`;
  if (hours < 24)  return `${hours} jam lalu`;
  return `${days} hari lalu`;
}

// ─── State cache ────────────────────────────────────────────────────────────
let goatsCache    = {};
let weighingsCache = {};
let warningDays   = 30;   // default, akan di-overwrite dari settings
let minADG        = 0.60; // default

// ─── 1. Load settings sekali ────────────────────────────────────────────────
get(ref(db, "settings")).then(snap => {
  if (snap.exists()) {
    const s = snap.val();
    warningDays = s.warningDays ?? 30;
    minADG      = s.minADG      ?? 0.60;
  }
  // Setelah settings siap, pasang listener data
  attachListeners();
});

// ─── 2. Attach Realtime Listeners ───────────────────────────────────────────
function attachListeners() {
  onValue(ref(db, "goat"), snap => {
    goatsCache = snap.val() || {};
    renderDashboard();
  });

  onValue(ref(db, "weighings"), snap => {
    weighingsCache = snap.val() || {};
    renderDashboard();
  });
}

// ─── 3. Render semua bagian dashboard ───────────────────────────────────────
function renderDashboard() {
  const now = Date.now();
  const cutoff = warningDays * 24 * 60 * 60 * 1000; // ms

  let total     = 0;
  let weighed   = 0;   // sudah ditimbang dalam periode
  let unweighed = 0;   // belum pernah ditimbang ATAU sudah lewat batas
  let normal    = 0;   // ADG ≥ minADG
  let critical  = 0;   // berat turun / belum pernah / ADG buruk

  // Kumpulkan semua record timbangan untuk recent activity + ADG avg
  const allLogs = [];
  let totalADGSum = 0;
  let adgCount    = 0;

  Object.keys(goatsCache).forEach(id => {
    const goat   = goatsCache[id];
    const weighs = weighingsCache[id] || null;

    total++;

    // ─ Kalkulasi: Sudah / Belum Ditimbang ─
    const lastWeighTs = goat.lastWeighDate || 0;
    if (lastWeighTs === 0) {
      // belum pernah ditimbang sama sekali
      unweighed++;
    } else {
      const daysSince = (now - lastWeighTs) / (24 * 60 * 60 * 1000);
      if (daysSince > warningDays) {
        unweighed++; // melewati batas periode
      } else {
        weighed++;   // masih dalam periode
      }
    }

    // ─ Kalkulasi ADG & status Normal/Kritis ─
    if (weighs) {
      const list = Object.values(weighs).sort((a, b) => a.timestamp - b.timestamp);

      // Kumpulkan ke recent logs
      list.forEach(r => {
        allLogs.push({ goatId: id, goatName: goat.name, cage: goat.cage, ...r });
        if (r.adg && r.adg !== 0) {
          totalADGSum += r.adg;
          adgCount++;
        }
      });

      if (list.length >= 2) {
        const last = list[list.length - 1];
        const prev = list[list.length - 2];
        const diff = last.weight - prev.weight;

        if (diff < 0) {
          // berat turun → kritis
          critical++;
        } else {
          const days = (last.timestamp - prev.timestamp) / (24 * 60 * 60 * 1000) || 1;
          const adg  = diff / days;
          if (adg >= minADG) normal++;
          else               critical++;
        }
      } else if (list.length === 1) {
        // hanya 1 rekaman → dianggap normal (belum bisa hitung ADG)
        normal++;
      } else {
        critical++;
      }
    } else {
      // belum ada riwayat timbang sama sekali → kritis
      critical++;
    }
  });

  // ─── Update Stat Cards ────────────────────────────────────────────────────
  statTotal.innerText     = total;
  statWeighed.innerText   = weighed;
  statUnweighed.innerText = unweighed;
  statNormal.innerText    = normal;
  statCritical.innerText  = critical;

  subWeighed.innerText   = `Dalam ≤ ${warningDays} hari terakhir`;
  subUnweighed.innerText = `Belum/lewat ${warningDays} hari`;

  // lastUpdated
  lastUpdatedEl.innerText = new Date().toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";

  // ─── Hitung Rata-rata ADG ─────────────────────────────────────────────────
  if (adgCount > 0) {
    const avg = totalADGSum / adgCount;
    avgAdgText.innerText = `${avg >= 0 ? "+" : ""}${avg.toFixed(2)} kg/d`;

    if (avg >= minADG) {
      adgDesc.innerText = `Pertumbuhan kawanan sangat sehat — melampaui target minimum (+${minADG.toFixed(2)} kg/hari).`;
    } else if (avg >= 0.3) {
      adgDesc.innerText = "Pertumbuhan rata-rata sedang. Pantau asupan pakan pada beberapa kandang.";
    } else {
      adgDesc.innerText = "Perhatian! Pertumbuhan rata-rata rendah. Tinjau nutrisi pakan di Settings.";
    }
  } else {
    avgAdgText.innerText = "0.00 kg/d";
    adgDesc.innerText    = "Belum ada data ADG yang tercatat.";
  }

  // ─── Render 5 Aktivitas Terbaru ───────────────────────────────────────────
  allLogs.sort((a, b) => b.timestamp - a.timestamp);
  const recent = allLogs.slice(0, 5);

  recentList.innerHTML = "";
  if (recent.length === 0) {
    recentList.innerHTML = `
      <div style="text-align:center; color:var(--text-muted); padding:30px 0; font-size:13px;">
        Belum ada aktivitas penimbangan.
      </div>`;
    return;
  }

  recent.forEach(log => {
    // Warna dot berdasarkan adg
    let dotColor = "#94a3b8";
    if (log.adg > 0) {
      dotColor = log.adg >= minADG ? "var(--color-success)"
               : log.adg >= 0.1   ? "var(--color-warning)"
               :                    "var(--color-danger)";
    } else if (log.adg < 0) {
      dotColor = "var(--color-danger)";
    }

    const row = document.createElement("div");
    row.className = "activity-row";
    row.innerHTML = `
      <div class="activity-left">
        <div class="activity-dot" style="background:${dotColor};"></div>
        <div class="activity-info">
          <h5>CT-${log.goatId} &nbsp;(${log.goatName})</h5>
          <p>${log.cage} · ${getTimeAgo(log.timestamp)}</p>
        </div>
      </div>
      <div class="activity-weight">${log.weight} kg</div>
    `;
    recentList.appendChild(row);
  });
}

// ─── 4. Refresh button ───────────────────────────────────────────────────────
btnRefresh.addEventListener("click", () => {
  btnRefresh.textContent = "…";
  // Re-read settings lalu render ulang
  get(ref(db, "settings")).then(snap => {
    if (snap.exists()) {
      warningDays = snap.val().warningDays ?? warningDays;
      minADG      = snap.val().minADG      ?? minADG;
    }
    renderDashboard();
    btnRefresh.textContent = "🔄 Refresh";
  });
});