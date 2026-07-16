// js/register.js
import { db, ref } from "./firebase.js";
import { get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM References
const registerForm = document.getElementById("registerGoatForm");
const messageBox = document.getElementById("messageBox");
const rfidInput = document.getElementById("rfid");
const scanStatus = document.getElementById("scanStatus");
const btnSimulateScan = document.getElementById("btnSimulateScan");

// Gender Selection Cards
const maleCard = document.getElementById("genderMale");
const femaleCard = document.getElementById("genderFemale");
const genderInput = document.getElementById("gender");

maleCard.addEventListener("click", () => {
  maleCard.classList.add("active");
  femaleCard.classList.remove("active");
  genderInput.value = "Jantan";
});

femaleCard.addEventListener("click", () => {
  femaleCard.classList.add("active");
  maleCard.classList.remove("active");
  genderInput.value = "Betina";
});

// Simulation of Scan Tag RFID
btnSimulateScan.addEventListener("click", () => {
  scanStatus.innerText = "Scanning...";
  rfidInput.placeholder = "Reading sensor...";
  
  setTimeout(() => {
    // Generate a random 10-char RFID hex string
    const hexChars = "0123456789ABCDEF";
    let mockRfid = "";
    for (let i = 0; i < 10; i++) {
      mockRfid += hexChars[Math.floor(Math.random() * 16)];
    }
    rfidInput.value = mockRfid;
    scanStatus.innerText = "Tag Detected!";
    tampilkanStatus("RFID Tag detected successfully!", "success");
  }, 800);
});

// Helper Status Banner
function tampilkanStatus(pesan, tipe) {
  messageBox.innerText = pesan;
  messageBox.className = `msg-box msg-${tipe}`;
  messageBox.style.display = "block";
  
  setTimeout(() => {
    messageBox.style.display = "none";
  }, 4000);
}

// Form submit event
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rfid = rfidInput.value.trim();
  const name = document.getElementById("name").value.trim();
  const breed = document.getElementById("breed").value;
  const birthDate = document.getElementById("birthDate").value;
  const gender = genderInput.value;
  const cage = document.getElementById("cage").value;
  const healthBaseline = document.getElementById("healthBaseline").value;

  if (!rfid) {
    tampilkanStatus("Peringatan: Tag RFID harus dipindai terlebih dahulu!", "error");
    return;
  }

  if (!gender) {
    tampilkanStatus("Peringatan: Silakan pilih jenis kelamin!", "error");
    return;
  }

  try {
    // 1. Check if RFID already exists in database
    const goatsSnapshot = await get(ref(db, "goat"));
    const allGoats = goatsSnapshot.val() || {};

    let rfidExists = false;
    Object.keys(allGoats).forEach((key) => {
      if (allGoats[key].rfid === rfid) {
        rfidExists = true;
      }
    });

    if (rfidExists) {
      tampilkanStatus("Gagal: Kode RFID ini sudah terdaftar pada kambing lain!", "error");
      return;
    }

    // 2. Generate next sequential ID (e.g. 016)
    let nextIdNum = 1;
    const existingIds = Object.keys(allGoats).map(k => parseInt(k, 10));
    if (existingIds.length > 0) {
      nextIdNum = Math.max(...existingIds) + 1;
    }
    const nextId = nextIdNum.toString().padStart(3, "0");

    // 3. Create Goat Record
    const newGoat = {
      rfid: rfid,
      name: name,
      breed: breed,
      gender: gender,
      birthDate: new Date(birthDate).getTime(),
      cage: cage,
      status: "ACTIVE",
      lastWeight: 0,
      lastWeighDate: 0,
      totalWeighings: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Save to Database
    await set(ref(db, `goat/${nextId}`), newGoat);

    // 4. Update stats counts
    const statsSnapshot = await get(ref(db, "statistics"));
    const currentStats = statsSnapshot.val() || { totalGoat: 0, normal: 0, warning: 0, critical: 0, weighedToday: 0 };
    
    currentStats.totalGoat = (currentStats.totalGoat || 0) + 1;
    
    // Assign count based on initial health assignment baseline
    if (healthBaseline === "Healthy") {
      currentStats.normal = (currentStats.normal || 0) + 1;
    } else if (healthBaseline === "Monitoring") {
      currentStats.warning = (currentStats.warning || 0) + 1;
    } else {
      currentStats.critical = (currentStats.critical || 0) + 1;
    }
    currentStats.lastUpdated = Date.now();

    await set(ref(db, "statistics"), currentStats);

    // Reset Form & show modern overlay modal
    registerForm.reset();
    rfidInput.value = "";
    scanStatus.innerText = "Scanning...";
    maleCard.classList.remove("active");
    femaleCard.classList.remove("active");
    genderInput.value = "";

    showCustomAlert({
      title: "Pendaftaran Sukses!",
      message: `Kambing "${name}" berhasil terdaftar dengan ID: <b>CT-${nextId}</b>`,
      type: "success",
      confirmText: "Lihat Daftar",
      onConfirm: () => {
        window.location.href = "goat.html";
      }
    });

  } catch (error) {
    console.error("Gagal mendaftarkan kambing:", error);
    showCustomAlert({
      title: "Pendaftaran Gagal",
      message: "Gagal menghubungkan ke database Firebase. Periksa koneksi.",
      type: "danger",
      confirmText: "Tutup"
    });
  }
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
