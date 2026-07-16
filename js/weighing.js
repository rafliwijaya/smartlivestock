// js/weighing.js
// ─────────────────────────────────────────────────────────────────────────────
// Penimbangan: setiap save → push ke weighings/{id}/{pushKey}  (history aman)
//              lalu update summary di goat/{id}: lastWeight, lastWeighDate, totalWeighings
// ─────────────────────────────────────────────────────────────────────────────
import { db, ref } from "./firebase.js";
import {
  onValue, get, push, update, set
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ─── DOM ─────────────────────────────────────────────────────────────────────
const goatSelect      = document.getElementById("goatSelect");
const weightInput     = document.getElementById("weightInput");
const methodSelect    = document.getElementById("methodSelect");
const btnSave         = document.getElementById("btnSaveWeighing");
const msgBox          = document.getElementById("msgBox");
const previewName     = document.getElementById("previewName");
const previewLastWt   = document.getElementById("previewLastWt");
const previewDaysSince= document.getElementById("previewDaysSince");
const previewAdg      = document.getElementById("previewAdg");
const weightDisplay   = document.getElementById("weightDisplay");

// Live weight display saat user ketik
if (weightInput && weightDisplay) {
  weightInput.addEventListener("input", () => {
    const v = parseFloat(weightInput.value);
    weightDisplay.innerText = isNaN(v) ? "0.0" : v.toFixed(1);
  });
}

// ─── Load daftar kambing ke select ───────────────────────────────────────────
if (goatSelect) {
  onValue(ref(db, "goat"), snap => {
    const goats = snap.val() || {};
    goatSelect.innerHTML = '<option value="">Pilih Kambing...</option>';
    Object.keys(goats).forEach(id => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.innerText = `CT-${id} — ${goats[id].name || "(no name)"}`;
      goatSelect.appendChild(opt);
    });
  });

  // Update preview saat ganti kambing
  goatSelect.addEventListener("change", async () => {
    const id = goatSelect.value;
    if (!id) {
      clearPreview();
      return;
    }
    const [goatSnap, weighSnap] = await Promise.all([
      get(ref(db, `goat/${id}`)),
      get(ref(db, `weighings/${id}`))
    ]);
    const g = goatSnap.val();
    const w = weighSnap.val();

    if (!g) return;
    previewName.innerText = `${g.name} (CT-${id})`;
    previewLastWt.innerText = g.lastWeight ? `${g.lastWeight} kg` : "–";

    if (g.lastWeighDate) {
      const days = Math.floor((Date.now() - g.lastWeighDate) / 86400000);
      previewDaysSince.innerText = days === 0 ? "Hari ini" : `${days} hari lalu`;
    } else {
      previewDaysSince.innerText = "Belum pernah";
    }

    // Hitung ADG terakhir dari riwayat
    if (w) {
      const list = Object.values(w).sort((a, b) => a.timestamp - b.timestamp);
      if (list.length >= 2) {
        const last = list[list.length - 1];
        const prev = list[list.length - 2];
        const d = (last.timestamp - prev.timestamp) / 86400000 || 1;
        const adg = (last.weight - prev.weight) / d;
        previewAdg.innerText = `${adg >= 0 ? "+" : ""}${adg.toFixed(2)} kg/hari`;
        previewAdg.style.color = adg >= 0.6 ? "var(--color-success)" : adg >= 0 ? "#f59e0b" : "var(--color-danger)";
      } else {
        previewAdg.innerText = "Rekaman pertama";
        previewAdg.style.color = "var(--text-muted)";
      }
    } else {
      previewAdg.innerText = "Belum ada data";
      previewAdg.style.color = "var(--text-muted)";
    }
  });
}

function clearPreview() {
  if (previewName)      previewName.innerText = "–";
  if (previewLastWt)    previewLastWt.innerText = "–";
  if (previewDaysSince) previewDaysSince.innerText = "–";
  if (previewAdg)       previewAdg.innerText = "–";
}

// ─── Save timbangan ───────────────────────────────────────────────────────────
if (btnSave) {
  btnSave.addEventListener("click", async () => {
    const id     = goatSelect?.value;
    const weight = parseFloat(weightInput?.value);
    const method = methodSelect?.value || "Manual";

    if (!id)          { showMsg("Pilih kambing terlebih dahulu!", "danger"); return; }
    if (isNaN(weight) || weight <= 0)
                      { showMsg("Masukkan berat yang valid (> 0 kg).", "danger"); return; }
    if (weight > 200) { showMsg("Berat terlalu besar. Cek kembali angka yang dimasukkan.", "danger"); return; }

    btnSave.disabled    = true;
    btnSave.innerText   = "Menyimpan…";

    try {
      const now = Date.now();

      // ─ Baca history timbangan untuk hitung ADG ─
      const weighSnap = await get(ref(db, `weighings/${id}`));
      const existing  = weighSnap.val();
      let adg         = 0;
      let totalWeighings = 1;

      if (existing) {
        const list = Object.values(existing).sort((a, b) => a.timestamp - b.timestamp);
        totalWeighings = list.length + 1;
        const prevRecord = list[list.length - 1];
        const daysDiff   = (now - prevRecord.timestamp) / 86400000 || 1;
        adg              = (weight - prevRecord.weight) / daysDiff;
      }

      // ─ Push record baru ke history (data lama TIDAK terhapus) ─
      const newRecord = {
        weight,
        timestamp: now,
        method,
        adg: parseFloat(adg.toFixed(4))
      };
      await push(ref(db, `weighings/${id}`), newRecord);

      // ─ Update summary di node goat ─
      await update(ref(db, `goat/${id}`), {
        lastWeight:      weight,
        lastWeighDate:   now,
        totalWeighings
      });

      showMsg(`✔ Berhasil menyimpan timbangan ${weight} kg untuk CT-${id}.`, "success");
      weightInput.value = "";
      if (weightDisplay) weightDisplay.innerText = "0.0";
      goatSelect.value  = "";
      clearPreview();

    } catch (err) {
      console.error("Gagal menyimpan:", err);
      showMsg("Gagal menyimpan data. Periksa koneksi internet.", "danger");
    } finally {
      btnSave.disabled  = false;
      btnSave.innerText = "Simpan Timbangan";
    }
  });
}

// ─── Helper pesan ─────────────────────────────────────────────────────────────
function showMsg(text, type) {
  if (!msgBox) return;
  msgBox.innerHTML = text;
  msgBox.className = `msg-box msg-${type}`;
  msgBox.style.display = "block";
  setTimeout(() => { msgBox.style.display = "none"; }, 5000);
}
