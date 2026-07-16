// js/notification.js
import { db, ref } from "./firebase.js";
import { get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const notificationsContainer = document.getElementById("notificationsContainer");
const countKritis            = document.getElementById("countKritis");
const countWarning           = document.getElementById("countWarning");
const countPanen             = document.getElementById("countPanen");

async function analisisKesehatanSistem() {
  try {
    // 1. Ambil Parameter Pengaturan
    const settingsSnapshot = await get(ref(db, "settings"));
    let warningDays  = 30;   // default toleransi hari belum ditimbang
    let minADG       = 0.60;  // default ADG minimal harian
    let targetWeight = 45.0;  // default target bobot panen (siap jual)
    
    if (settingsSnapshot.exists()) {
      const setts  = settingsSnapshot.val();
      warningDays  = parseInt(setts.warningDays)   || 30;
      minADG       = parseFloat(setts.minADG)      || 0.60;
      targetWeight = parseFloat(setts.targetWeight) || 45.0;
    }

    // 2. Ambil Data Kambing & Riwayat Penimbangannya
    const goatsSnapshot     = await get(ref(db, "goat"));
    const weighingsSnapshot = await get(ref(db, "weighings"));
    
    const allGoats     = goatsSnapshot.val() || {};
    const allWeighings = weighingsSnapshot.val() || {};

    let listNotifikasi = [];
    const now = Date.now();

    Object.keys(allGoats).forEach((goatId) => {
      const goat         = allGoats[goatId];
      const weighHistory = allWeighings[goatId] || null;

      // ─── KATEGORI 3: SARAN PANEN (HIJAU) ───
      // Jika bobot terakhir >= target siap jual
      if (goat.lastWeight && goat.lastWeight >= targetWeight) {
        listNotifikasi.push({
          tipe: "panen",
          prioritas: "Panen",
          badgeClass: "badge-success",
          btnClass: "btn-primary", // disesuaikan di render dengan warna hijau
          judul: `CT-${goatId} (${goat.name}) Siap Jual`,
          deskripsi: `Bobot saat ini sudah mencapai ${goat.lastWeight.toFixed(1)} kg, memenuhi atau melampaui Target Siap Jual (${targetWeight} kg).`,
          aksiLink: `goat-detail.html?id=${goatId}`
        });
        // Kambing siap panen tidak perlu ditunjukkan notif pakan/lambat agar fokus penjualan
        return; 
      }

      // ─── KATEGORI 1: TINDAKAN KRITIS (MERAH) ───
      // A. Belum Pernah Ditimbang
      if (!goat.lastWeighDate || goat.lastWeighDate === 0) {
        listNotifikasi.push({
          tipe: "kritis",
          prioritas: "Warning",
          badgeClass: "badge-danger",
          btnClass: "btn-danger",
          judul: `CT-${goatId} (${goat.name}) Belum Pernah Ditimbang`,
          deskripsi: `Kambing terdaftar di ${goat.cage} namun belum memiliki data timbangan. Segera lakukan penimbangan awal!`,
          aksiLink: `goat-detail.html?id=${goatId}`
        });
        return; 
      }

      // B. Penyusutan Berat Badan (Kritis)
      if (weighHistory) {
        const listWeighs = Object.values(weighHistory).sort((a, b) => a.timestamp - b.timestamp);
        if (listWeighs.length >= 2) {
          const terakhir        = listWeighs[listWeighs.length - 1];
          const sebelumTerakhir = listWeighs[listWeighs.length - 2];
          const selisihBerat    = terakhir.weight - sebelumTerakhir.weight;

          if (selisihBerat < 0) {
            const selisihHari = (terakhir.timestamp - sebelumTerakhir.timestamp) / 86400000 || 1;
            listNotifikasi.push({
              tipe: "kritis",
              prioritas: "Warning",
              badgeClass: "badge-danger",
              btnClass: "btn-danger",
              judul: `CT-${goatId} (${goat.name}) Mengalami Penyusutan Berat`,
              deskripsi: `Kambing kehilangan berat sebesar ${Math.abs(selisihBerat).toFixed(1)} kg dalam kurun waktu ${selisihHari.toFixed(1)} hari terakhir di ${goat.cage}. Berpotensi sakit!`,
              aksiLink: `goat-detail.html?id=${goatId}`
            });
            return; // Selesai
          }
        }
      }

      // ─── KATEGORI 2: SARAN TINDAKAN (KUNING) ───
      // A. Terlambat Ditimbang (Overdue)
      const selisihMilidetik = now - goat.lastWeighDate;
      const selisihHari      = Math.floor(selisihMilidetik / 86400000);

      if (selisihHari > warningDays) {
        listNotifikasi.push({
          tipe: "warning",
          prioritas: "Tindakan",
          badgeClass: "badge-warning",
          btnClass: "btn-secondary",
          judul: `CT-${goatId} (${goat.name}) Terlambat Ditimbang`,
          deskripsi: `Kambing di ${goat.cage} sudah lewat ${selisihHari} hari tidak ditimbang (Batas toleransi: ${warningDays} hari).`,
          aksiLink: `goat-detail.html?id=${goatId}`
        });
        return;
      }

      // B. Pertumbuhan ADG Lambat
      if (weighHistory) {
        const listWeighs = Object.values(weighHistory).sort((a, b) => a.timestamp - b.timestamp);
        if (listWeighs.length >= 2) {
          const terakhir        = listWeighs[listWeighs.length - 1];
          const sebelumTerakhir = listWeighs[listWeighs.length - 2];
          const selisihBerat    = terakhir.weight - sebelumTerakhir.weight;
          const selisihHari     = (terakhir.timestamp - sebelumTerakhir.timestamp) / 86400000 || 1;
          const computedADG     = selisihBerat / selisihHari;

          if (computedADG < minADG) {
            listNotifikasi.push({
              tipe: "warning",
              prioritas: "Tindakan",
              badgeClass: "badge-warning",
              btnClass: "btn-secondary",
              judul: `CT-${goatId} (${goat.name}) ADG Rendah`,
              deskripsi: `Rata-rata ADG terakhir sebesar ${computedADG.toFixed(2)} kg/hari (Batas minimum: ${minADG.toFixed(2)} kg/hari). Disarankan evaluasi nutrisi pakan.`,
              aksiLink: `goat-detail.html?id=${goatId}`
            });
          }
        }
      }
    });

    // 3. Render Notifikasi
    renderNotifikasi(listNotifikasi);

  } catch (error) {
    console.error("Gagal menganalisis data:", error);
    notificationsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-danger); font-size:13px;">
        Gagal memproses data dari Firebase. Pastikan koneksi internet stabil.
      </div>
    `;
  }
}

function renderNotifikasi(list) {
  notificationsContainer.innerHTML = "";
  
  if (list.length === 0) {
    notificationsContainer.innerHTML = `
      <div style="text-align: center; padding: 50px; background: white; border-radius: var(--border-radius-lg);">
        <h2 style="color: var(--primary-dark); margin-top: 0; font-size: 22px;">🎉 Semua Kambing Aman!</h2>
        <p style="color: var(--text-muted); margin-top: 8px;">Tidak ditemukan adanya kondisi kritis, keterlambatan timbang, atau kambing siap panen saat ini.</p>
      </div>
    `;
    countKritis.innerText  = "0";
    countWarning.innerText = "0";
    countPanen.innerText   = "0";
    return;
  }

  // Urutan render: Kritis -> Warning -> Panen
  const order = { "kritis": 1, "warning": 2, "panen": 3 };
  list.sort((a, b) => order[a.tipe] - order[b.tipe]);

  let kritisCounter  = 0;
  let warningCounter = 0;
  let panenCounter   = 0;

  list.forEach((notif) => {
    if (notif.tipe === "kritis")  kritisCounter++;
    if (notif.tipe === "warning") warningCounter++;
    if (notif.tipe === "panen")   panenCounter++;

    const div = document.createElement("div");
    div.className = `notif-card notif-${notif.tipe}`;

    // Warna tombol telusuri local disesuaikan:
    // Kritis: btn-danger (merah), Warning: btn-warning (kuning/orange), Panen: btn-primary (hijau)
    let btnStyle = "background-color:#94a3b8; border-color:#cbd5e1; color:#fff;";
    if (notif.tipe === "kritis") {
      btnStyle = "background-color:var(--color-danger); border-color:var(--color-danger); color:#fff;";
    } else if (notif.tipe === "warning") {
      btnStyle = "background-color:#d97706; border-color:#d97706; color:#fff;";
    } else if (notif.tipe === "panen") {
      btnStyle = "background-color:var(--color-success); border-color:var(--color-success); color:#fff;";
    }

    div.innerHTML = `
      <div style="padding-right: 20px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap;">
          <span class="badge ${notif.badgeClass}" style="padding: 3px 8px; font-size: 10px; font-weight: 700;">${notif.prioritas}</span>
          <h4 style="margin: 0; font-size: 14px; color: var(--text-main); font-weight: 700;">${notif.judul}</h4>
        </div>
        <p style="margin: 0; color: var(--text-muted); font-size: 12px; line-height: 1.5;">${notif.deskripsi}</p>
      </div>
      <div>
        <a href="${notif.aksiLink}" class="btn btn-sm" 
           style="white-space: nowrap; font-size: 12px; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px; font-weight:600; ${btnStyle}">
          <img src="assets/icons/serch.png" alt="Search"
               style="width: 13px; height: 13px; filter: brightness(0) invert(1);"
               onerror="this.style.display='none'">
          Telusuri
        </a>
      </div>
    `;
    notificationsContainer.appendChild(div);
  });

  countKritis.innerText  = kritisCounter;
  countWarning.innerText = warningCounter;
  countPanen.innerText   = panenCounter;
}

// Jalankan analisis
analisisKesehatanSistem();