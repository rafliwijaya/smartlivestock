// js/settings.js
import { db, ref } from "./firebase.js";
import { get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const settingsForm = document.getElementById("settingsForm");
const messageBox = document.getElementById("messageBox");

// Referensi DOM Input
const targetWeightInput = document.getElementById("targetWeight");
const minADGInput = document.getElementById("minADG");
const warningDaysInput = document.getElementById("warningDays");
const stableTimeInput = document.getElementById("weighingStableTime");

const settingsRef = ref(db, "settings");

// Fungsi pembantu untuk menampilkan status kustom
function tampilkanStatus(pesan, tipe) {
  messageBox.innerText = pesan;
  messageBox.className = `msg-box msg-${tipe}`;
  messageBox.style.display = "block";
  
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 4000);
}

// 1. Ambil data pengaturan yang ada di Firebase saat halaman dimuat
function muatDataSettings() {
  get(settingsRef)
    .then((snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.val();
        
        // Isi nilai input form dengan data dari Firebase
        targetWeightInput.value = settings.targetWeight || "";
        minADGInput.value = settings.minADG || "";
        warningDaysInput.value = settings.warningDays || "";
        stableTimeInput.value = settings.weighingStableTime || "";
      } else {
        console.log("Pengaturan belum dibuat di database. Silakan isi form dan klik simpan.");
      }
    })
    .catch((error) => {
      console.error("Gagal membaca pengaturan: ", error);
      tampilkanStatus("Gagal memuat pengaturan dari Firebase.", "error");
    });
}

// Jalankan fungsi muat saat halaman dibuka
muatDataSettings();

// 2. Tangani penyimpanan data saat form disubmit
settingsForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // Ambil nilai baru dari form dan konversi ke tipe data Number yang valid
  const updatedSettings = {
    targetWeight: parseFloat(targetWeightInput.value),
    minADG: parseFloat(minADGInput.value),
    warningDays: parseInt(warningDaysInput.value, 10),
    weighingStableTime: parseInt(stableTimeInput.value, 10)
  };

  // Simpan data baru kembali ke node 'settings' di Firebase
  set(settingsRef, updatedSettings)
    .then(() => {
      showCustomAlert({
        title: "Pengaturan Tersimpan!",
        message: "Konfigurasi sistem berhasil diperbarui secara realtime ke database Firebase.",
        type: "success",
        confirmText: "OK"
      });
    })
    .catch((error) => {
      console.error("Gagal memperbarui pengaturan: ", error);
      showCustomAlert({
        title: "Gagal Menyimpan",
        message: "Gagal menyimpan data ke database Firebase. Periksa koneksi internet Anda.",
        type: "danger",
        confirmText: "Tutup"
      });
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
    `;
    btnCancel.addEventListener("click", () => closeModal());
    actions.appendChild(btnCancel);
  }

  const btnConfirm = document.createElement("button");
  btnConfirm.innerText = confirmText;
  btnConfirm.style.cssText = `
    padding:9px 20px; font-size:13px; font-weight:600; color:#fff;
    background:${type === "success" ? "#10b981" : "#ef4444"}; border:none; border-radius:8px; cursor:pointer;
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