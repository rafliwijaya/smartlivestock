// js/detail.js
import { db, ref } from "./firebase.js";
import { onValue, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ─── URL param ────────────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const goatId = params.get("id");
if (!goatId) { alert("ID Kambing tidak ditemukan!"); window.location.href = "goat.html"; }

// ─── DOM ─────────────────────────────────────────────────────────────────────
const detailGoatName    = document.getElementById("detailGoatName");
const detailRfid        = document.getElementById("detailRfid");
const detailBreed       = document.getElementById("detailBreed");
const detailGender      = document.getElementById("detailGender");
const detailAge         = document.getElementById("detailAge");
const detailCage        = document.getElementById("detailCage");
const detailStatusBadge = document.getElementById("detailStatusBadge");
const goatAvatar        = document.getElementById("goatAvatar");
const pageTitle         = document.getElementById("pageTitle");
const metricWeight      = document.getElementById("metricWeight");
const metricWeightSub   = document.getElementById("metricWeightSub");
const metricAdg         = document.getElementById("metricAdg");
const metricAdgSub      = document.getElementById("metricAdgSub");
const metricDays        = document.getElementById("metricDays");
const metricDaysSub     = document.getElementById("metricDaysSub");
const activityTimeline  = document.getElementById("activityTimeline");
const btnDeleteGoat     = document.getElementById("btnDeleteGoat");

// ─── State ───────────────────────────────────────────────────────────────────
let myChart         = null;
let settingsMinADG  = 0.60;
let settingsWarning = 30;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function hitungUmur(ts) {
  if (!ts) return "–";
  const totalDays = Math.floor((Date.now() - ts) / 86400000);
  if (totalDays < 30) return `${totalDays} Hari`;
  const m = Math.floor(totalDays / 30), d = totalDays % 30;
  return d > 0 ? `${m} Bln ${d} Hr` : `${m} Bulan`;
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric" });
}
function fmtFull(ts) {
  return new Date(ts).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── 1. Load settings ────────────────────────────────────────────────────────
get(ref(db, "settings")).then(snap => {
  if (snap.exists()) {
    settingsMinADG  = parseFloat(snap.val().minADG)    || 0.60;
    settingsWarning = parseInt(snap.val().warningDays) || 30;
  }
});

// ─── 2. Load profil kambing ───────────────────────────────────────────────────
onValue(ref(db, `goat/${goatId}`), snap => {
  const g = snap.val();
  if (!g) { alert("Data kambing tidak ditemukan!"); window.location.href = "goat.html"; return; }
  pageTitle.innerText      = `Detail — ${g.name || "CT-" + goatId}`;
  detailGoatName.innerText = g.name || "–";
  detailRfid.innerText     = `RFID: ${g.rfid || "–"}`;
  detailBreed.innerText    = g.breed  || "–";
  detailGender.innerText   = g.gender || "–";
  detailAge.innerText      = hitungUmur(g.birthDate);
  detailCage.innerText     = g.cage   || "–";
  goatAvatar.style.borderColor = g.gender === "Betina" ? "rgba(244,114,182,0.6)" : "rgba(96,165,250,0.6)";
});

// ─── 3. Load riwayat timbangan ───────────────────────────────────────────────
onValue(ref(db, `weighings/${goatId}`), snap => {
  const raw = snap.val();
  activityTimeline.innerHTML = "";

  if (!raw) {
    setMetricsEmpty();
    setStatusBadge("monitoring");
    renderChart([], []);
    activityTimeline.innerHTML = `
      <div style="text-align:center; padding:40px 0; color:var(--text-muted); font-size:13px;">
        <div style="font-size:32px; margin-bottom:8px;">📭</div>
        Belum ada riwayat penimbangan untuk kambing ini.
      </div>`;
    return;
  }

  // Urutkan dari lama ke terbaru
  const list = Object.values(raw).sort((a, b) => a.timestamp - b.timestamp);
  const last = list[list.length - 1];
  const now  = Date.now();

  // ─── Metrics ────────────────────────────────────────────────────────────────
  // Berat
  metricWeight.innerText = `${last.weight.toFixed(1)}`;
  metricWeight.className = "hero-metric-value";
  if (list.length >= 2) {
    const prev = list[list.length - 2];
    const diff = last.weight - prev.weight;
    metricWeightSub.innerText     = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg`;
    metricWeightSub.style.color   = diff >= 0 ? "#6ee7b7" : "#fca5a5";
  } else {
    metricWeightSub.innerText   = "kg · berat awal";
    metricWeightSub.style.color = "rgba(255,255,255,0.4)";
  }

  // ADG
  if (list.length >= 2) {
    const adgVal = last.adg || 0;
    metricAdg.innerText = `${adgVal >= 0 ? "+" : ""}${adgVal.toFixed(2)}`;
    if (adgVal >= settingsMinADG) {
      metricAdg.className    = "hero-metric-value";
      metricAdgSub.innerText = "kg/hari ✔";
    } else if (adgVal >= 0.1) {
      metricAdg.className    = "hero-metric-value warn";
      metricAdgSub.innerText = "kg/hari ⚠";
    } else {
      metricAdg.className    = "hero-metric-value danger";
      metricAdgSub.innerText = "kg/hari ✘";
    }
  } else {
    metricAdg.innerText    = "N/A";
    metricAdg.className    = "hero-metric-value muted";
    metricAdgSub.innerText = "butuh 2 data";
  }

  // Hari sejak timbang terakhir
  const daysSince = Math.floor((now - last.timestamp) / 86400000);
  if (daysSince === 0) {
    metricDays.innerText    = "Hari Ini";
    metricDays.className    = "hero-metric-value";
    metricDaysSub.innerText = fmtDate(last.timestamp);
  } else {
    metricDays.innerText    = `${daysSince}`;
    metricDays.className    = daysSince > settingsWarning ? "hero-metric-value danger" : "hero-metric-value";
    metricDaysSub.innerText = `${fmtDate(last.timestamp)}`;
  }

  // Status badge
  const adgLast   = list.length >= 2 ? (last.adg || 0) : null;
  const overdue   = daysSince > settingsWarning;
  const isHealthy = !overdue && adgLast !== null && adgLast >= settingsMinADG;
  setStatusBadge(isHealthy ? "healthy" : "monitoring");

  // ─── Area Chart ──────────────────────────────────────────────────────────────
  const labels  = list.map(r => fmtDate(r.timestamp));
  const weights = list.map(r => r.weight);
  waitForChartJs(() => renderChart(labels, weights));

  // ─── Timeline — terbaru di atas ──────────────────────────────────────────────
  const sorted = [...list].reverse();
  const container = document.createElement("div");
  container.className = "tl-list";

  sorted.forEach((r, idx) => {
    // Cari rekaman sebelumnya (dalam urutan asli)
    const originalIdx = list.findIndex(x => x.timestamp === r.timestamp);
    const prevRec     = originalIdx > 0 ? list[originalIdx - 1] : null;

    // Badge ADG
    let badgeClass = "tl-adg-neutral";
    let badgeText  = idx === sorted.length - 1 ? "Rekaman Pertama" : "–";
    let changeText = "";
    let changeColor = "#94a3b8";
    let dotColor    = "#94a3b8";

    if (prevRec !== null) {
      const diff = r.weight - prevRec.weight;
      const adgVal = r.adg || 0;

      if (adgVal >= settingsMinADG) {
        badgeClass  = "tl-adg-good";
        badgeText   = `ADG +${adgVal.toFixed(2)} kg/hr`;
        dotColor    = "#10b981";
      } else if (adgVal >= 0.1) {
        badgeClass  = "tl-adg-slow";
        badgeText   = `ADG +${adgVal.toFixed(2)} kg/hr`;
        dotColor    = "#f59e0b";
      } else {
        badgeClass  = "tl-adg-bad";
        badgeText   = `ADG ${adgVal.toFixed(2)} kg/hr`;
        dotColor    = "#ef4444";
      }

      changeText  = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}kg dari sebelumnya`;
      changeColor = diff >= 0 ? "#059669" : "#dc2626";
    }

    const isLatest = idx === 0;
    const isFirst  = idx === sorted.length - 1;

    const item = document.createElement("div");
    item.className = "tl-item";

    // Show More logic: sembunyikan semua item di bawah yang terbaru
    if (!isLatest) {
      item.style.display = "none";
      item.classList.add("tl-extra-item");
    }

    item.innerHTML = `
      <div class="tl-left">
        <div class="tl-dot-outer" style="--dot-color:${dotColor};">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" fill="${dotColor}" opacity="0.18"/>
            <circle cx="8" cy="8" r="3.5" fill="${dotColor}"/>
          </svg>
        </div>
        <div class="tl-line"></div>
      </div>
      <div class="tl-body">
        <div class="tl-header-row">
          <span class="tl-date-label">${fmtFull(r.timestamp)}</span>
          ${isLatest ? `<span class="tl-latest-tag">Terbaru</span>` : ""}
          ${isFirst  ? `<span class="tl-first-tag">Pertama</span>` : ""}
        </div>
        <div class="tl-weight-row">
          <span class="tl-weight-big">${r.weight.toFixed(1)} <span class="tl-kg">kg</span></span>
          <span class="tl-adg-badge ${badgeClass}">${badgeText}</span>
        </div>
        ${changeText ? `<div class="tl-change" style="color:${changeColor};">${changeText}</div>` : ""}
        <div class="tl-meta">Metode: <b>${r.method || "RFID"}</b> &nbsp;·&nbsp; Rekaman #${list.length - idx} dari ${list.length}</div>
      </div>
    `;
    container.appendChild(item);
  });

  activityTimeline.appendChild(container);

  // Pasang toggle button jika riwayat > 1
  if (sorted.length > 1) {
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "btn btn-secondary";
    toggleBtn.style.width = "100%";
    toggleBtn.style.marginTop = "14px";
    toggleBtn.style.fontSize = "12px";
    toggleBtn.style.padding = "10px";
    toggleBtn.style.fontWeight = "600";
    toggleBtn.innerText = `👁 Lihat Selengkapnya (${sorted.length - 1} riwayat lainnya)`;

    let isExpanded = false;
    toggleBtn.addEventListener("click", () => {
      isExpanded = !isExpanded;
      const extras = container.querySelectorAll(".tl-extra-item");
      extras.forEach(el => {
        el.style.display = isExpanded ? "flex" : "none";
      });
      toggleBtn.innerText = isExpanded ? "⬆ Sembunyikan" : `👁 Lihat Selengkapnya (${sorted.length - 1} riwayat lainnya)`;
    });

    activityTimeline.appendChild(toggleBtn);
  }
});

// ─── Wait for Chart.js to be ready ───────────────────────────────────────────
function waitForChartJs(cb, attempts = 0) {
  if (typeof Chart !== "undefined") {
    cb();
  } else if (attempts < 30) {
    setTimeout(() => waitForChartJs(cb, attempts + 1), 200);
  } else {
    console.warn("Chart.js tidak berhasil dimuat.");
    const canvas = document.getElementById("weightChart");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.font      = "14px Outfit, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText("Gagal memuat Chart.js. Periksa koneksi.", canvas.width / 2, 100);
    }
  }
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
function renderChart(labels, data) {
  const canvas = document.getElementById("weightChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  if (myChart) { myChart.destroy(); myChart = null; }

  if (data.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font      = "14px Outfit, sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText("Belum ada data untuk ditampilkan.", canvas.width / 2, 110);
    return;
  }

  // Buat gradient untuk area fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 230);
  gradient.addColorStop(0,   "rgba(16, 185, 129, 0.30)");
  gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.08)");
  gradient.addColorStop(1,   "rgba(16, 185, 129, 0.00)");

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Bobot (kg)",
        data,
        borderColor: "#10b981",
        backgroundColor: gradient,
        borderWidth: 2.5,
        tension: 0.45,          // smooth curve
        fill: true,             // ← Area Chart
        pointBackgroundColor: data.map((v, i) => {
          if (i === 0) return "#94a3b8";
          return v >= data[i-1] ? "#059669" : "#ef4444";  // hijau naik, merah turun
        }),
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 2.5
      }]
    },
    options: {
      responsive:           true,
      maintainAspectRatio:  false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          titleColor:      "#94a3b8",
          bodyColor:       "#f1f5f9",
          padding:         12,
          borderColor:     "rgba(255,255,255,0.06)",
          borderWidth:     1,
          callbacks: {
            title: items => items[0].label,
            label: item  => {
              const idx  = item.dataIndex;
              const curr = item.parsed.y;
              let line   = ` Bobot: ${curr.toFixed(1)} kg`;
              if (idx > 0) {
                const diff = curr - data[idx - 1];
                line += `  (${diff >= 0 ? "+" : ""}${diff.toFixed(1)} kg)`;
              }
              return line;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          grid:  { color: "#f1f5f9", lineWidth: 1 },
          ticks: {
            font:     { family: "Outfit", size: 11 },
            color:    "#94a3b8",
            callback: v => v + " kg"
          },
          border: { display: false }
        },
        x: {
          grid:  { display: false },
          ticks: {
            font:  { family: "Outfit", size: 10 },
            color: "#94a3b8",
            maxRotation: 30
          },
          border: { display: false }
        }
      }
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setStatusBadge(type) {
  if (type === "healthy") {
    detailStatusBadge.className = "hero-status-badge healthy";
    detailStatusBadge.innerText = "● Healthy";
  } else {
    detailStatusBadge.className = "hero-status-badge monitoring";
    detailStatusBadge.innerText = "● Monitoring";
  }
}
function setMetricsEmpty() {
  metricWeight.innerText    = "–"; metricWeightSub.innerText = "belum ditimbang";
  metricAdg.innerText       = "–"; metricAdgSub.innerText    = "–";
  metricDays.innerText      = "–"; metricDaysSub.innerText   = "–";
}

// ─── Delete ────────────────────────────────────────────────────────────────────
btnDeleteGoat.addEventListener("click", () => {
  const name = detailGoatName.innerText;
  
  showCustomAlert({
    title: "Hapus Profil?",
    message: `Apakah Anda yakin ingin menghapus profil kambing <b>CT-${goatId} (${name})</b> secara permanen beserta seluruh riwayat timbangannya?`,
    type: "danger",
    confirmText: "Ya, Hapus",
    cancelText: "Batal",
    onConfirm: () => {
      remove(ref(db, `goat/${goatId}`))
        .then(() => remove(ref(db, `weighings/${goatId}`)))
        .then(() => {
          showCustomAlert({
            title: "Berhasil Dihapus",
            message: `Profil kambing CT-${goatId} telah sukses dihapus dari database.`,
            type: "success",
            confirmText: "Kembali ke Daftar",
            onConfirm: () => {
              window.location.href = "goat.html";
            }
          });
        })
        .catch(err => {
          console.error(err);
          showCustomAlert({
            title: "Gagal Menghapus",
            message: "Gagal menghapus data dari Firebase. Cek koneksi.",
            type: "danger",
            confirmText: "Tutup"
          });
        });
    }
  });
});

// ─── Modern Custom Alert Overlay Utility ───
function showCustomAlert({ title, message, type = "success", confirmText = "OK", cancelText = null, onConfirm = null }) {
  const oldModal = document.getElementById("custom-alert-modal");
  if (oldModal) oldModal.remove();

  const overlay = document.createElement("div");
  overlay.id = "custom-alert-modal";
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 99999;
    opacity: 0; transition: opacity 0.2s ease;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background: #ffffff; border-radius: 16px; padding: 26px 30px;
    width: 90%; max-width: 400px; text-align: center;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    border: 1px solid #e2e8f0; transform: scale(0.95); transition: transform 0.2s ease;
  `;

  let iconHtml = "";
  if (type === "success") {
    iconHtml = `<div style="width:52px; height:52px; border-radius:50%; background:#ecfdf5; border:2px solid #34d399; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#10b981; font-size:22px; font-weight:bold;">✔</div>`;
  } else if (type === "danger") {
    iconHtml = `<div style="width:52px; height:52px; border-radius:50%; background:#fef2f2; border:2px solid #f87171; display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:#ef4444; font-size:22px; font-weight:bold;">!</div>`;
  }

  card.innerHTML = `
    ${iconHtml}
    <h3 style="font-size: 18px; font-weight:700; color:#0f172a; margin-bottom:8px; font-family:'Outfit', sans-serif;">${title}</h3>
    <p style="font-size: 13px; color:#64748b; line-height:1.5; margin-bottom:22px; font-family:'Outfit', sans-serif;">${message}</p>
    <div style="display:flex; gap:10px; justify-content:center;" id="modal-actions"></div>
  `;

  const actions = card.querySelector("#modal-actions");

  if (cancelText) {
    const btnCancel = document.createElement("button");
    btnCancel.innerText = cancelText;
    btnCancel.style.cssText = `
      padding:9px 18px; font-size:13px; font-weight:600; color:#64748b;
      background:#f1f5f9; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer;
      font-family:'Outfit', sans-serif;
    `;
    btnCancel.addEventListener("click", () => closeModal());
    actions.appendChild(btnCancel);
  }

  const btnConfirm = document.createElement("button");
  btnConfirm.innerText = confirmText;
  btnConfirm.style.cssText = `
    padding:9px 20px; font-size:13px; font-weight:600; color:#fff;
    background:${type === "success" ? "#10b981" : "#ef4444"}; border:none; border-radius:8px; cursor:pointer;
    font-family:'Outfit', sans-serif;
  `;
  btnConfirm.addEventListener("click", () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
  actions.appendChild(btnConfirm);

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.style.opacity = "1";
    card.style.transform = "scale(1)";
  }, 20);

  function closeModal() {
    overlay.style.opacity = "0";
    card.style.transform = "scale(0.95)";
    setTimeout(() => overlay.remove(), 200);
  }
}