// js/dummy-seeder.js
import { db, ref, set } from "./firebase.js";

export function jalankanSeederLengkap() {
  console.log("Memulai pengisian data dummy lengkap ke Firebase...");

  const now    = Date.now();
  const oneDay = 86400000;

  // ─── 1. Settings ──────────────────────────────────────────────────────────
  set(ref(db, "settings"), {
    minADG: 0.60,
    warningDays: 30,
    targetWeight: 45.0,
    weighingStableTime: 5
  });

  // ─── 2. Users ─────────────────────────────────────────────────────────────
  set(ref(db, "users"), {
    "admin123": { name: "Livestock Manager", email: "manager@farm.com", role: "admin" }
  });

  // ─── 3. Helper: buat riwayat timbangan manual ─────────────────────────────
  //  weights[] = list berat dari lama ke terbaru
  //  daysAgo[] = hari-yang-lalu untuk tiap rekaman (index 0 = yang paling lama)
  function buildWeighings(weights, daysAgoArr) {
    const result = {};
    weights.forEach((w, i) => {
      const ts  = now - daysAgoArr[i] * oneDay;
      const prev = i > 0 ? weights[i - 1] : null;
      const prevTs = i > 0 ? now - daysAgoArr[i - 1] * oneDay : null;
      let adg = 0;
      if (prev !== null) {
        const d = (ts - prevTs) / oneDay || 1;
        adg = parseFloat(((w - prev) / d).toFixed(2));
      }
      result[`rec_${String(i + 1).padStart(2, "0")}`] = {
        weight: parseFloat(w.toFixed(1)),
        timestamp: ts,
        method: i % 2 === 0 ? "RFID" : "Timbangan Digital",
        adg
      };
    });
    return result;
  }

  // ─── 4. Kambing — data lengkap ─────────────────────────────────────────────
  //
  // HERSETO (001) & LUNA (002) punya 8 rekaman manual yang kaya
  // Kambing lain pakai generator otomatis
  //
  const seederGoats = [

    // ── HERSETO — 8 rekaman, pertumbuhan bagus ─────────────────────────────
    {
      id: "001",
      profile: {
        rfid: "04A8B921CD", name: "Herseto", breed: "Moreno",
        gender: "Jantan", cage: "Kandang A",
        birthDate: now - 730 * oneDay,   // ~2 tahun
        status: "ACTIVE", createdAt: now - 700 * oneDay
      },
      weights:  [38.0, 39.4, 41.2, 43.1, 44.5, 46.0, 47.8, 49.2],
      daysAgo:  [210,  180,  150,  120,   90,   60,   30,    5]
    },

    // ── LUNA — 8 rekaman, ada sedikit penurunan lalu naik kembali ──────────
    {
      id: "002",
      profile: {
        rfid: "982000123456789", name: "Luna", breed: "Kambing Sayur",
        gender: "Betina", cage: "Kandang B",
        birthDate: now - 420 * oneDay,   // ~14 bulan
        status: "ACTIVE", createdAt: now - 400 * oneDay
      },
      weights:  [30.0, 31.5, 33.2, 34.0, 33.1, 34.8, 36.5, 37.9],
      daysAgo:  [200,  170,  140,  110,   80,   50,   20,    3]
    },

    // ── Kambing lain: 4 rekaman otomatis ──────────────────────────────────
    {
      id: "003", profile: { rfid: "8923749201", name: "Apollo", breed: "Dolfer Sulfok",
        gender: "Jantan", cage: "Kandang A", birthDate: now - 365 * oneDay, status: "ACTIVE", createdAt: now - 350 * oneDay },
      weights: [33.0, 35.0, 37.2, 39.0], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "004", profile: { rfid: "8923749202", name: "Bella", breed: "Ersip",
        gender: "Betina", cage: "Kandang C", birthDate: now - 300 * oneDay, status: "ACTIVE", createdAt: now - 285 * oneDay },
      weights: [28.5, 30.0, 31.8, 29.5], daysAgo: [90, 60, 30, 5]   // weight_loss di rekaman terakhir
    },
    {
      id: "005", profile: { rfid: "8923749205", name: "Zeus", breed: "Dolfer Sulfok",
        gender: "Jantan", cage: "Kandang A", birthDate: now - 330 * oneDay, status: "ACTIVE", createdAt: now - 315 * oneDay },
      weights: [31.0, 33.5, 36.0, 38.2], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "006", profile: { rfid: "8923749206", name: "Diana", breed: "Moreno",
        gender: "Betina", cage: "Kandang B", birthDate: now - 450 * oneDay, status: "ACTIVE", createdAt: now - 435 * oneDay },
      weights: [34.0, 36.2, 38.0, 40.1], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "007", profile: { rfid: "8923749207", name: "Bruno", breed: "Bulu Bakar",
        gender: "Jantan", cage: "Kandang C", birthDate: now - 270 * oneDay, status: "ACTIVE", createdAt: now - 255 * oneDay },
      weights: [27.0, 27.8, 28.3, 29.0], daysAgo: [90, 60, 30, 5]   // low_adg
    },
    {
      id: "008", profile: { rfid: "8923749208", name: "Cleo", breed: "Kambing Sayur",
        gender: "Betina", cage: "Kandang A", birthDate: now - 240 * oneDay, status: "ACTIVE", createdAt: now - 225 * oneDay },
      weights: [26.0, 28.0, 30.5, 32.8], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "009", profile: { rfid: "8923749209", name: "Rocky", breed: "Dolfer Sulfok",
        gender: "Jantan", cage: "Kandang B", birthDate: now - 210 * oneDay, status: "ACTIVE", createdAt: now - 195 * oneDay },
      weights: [25.0, 27.5, 30.0, 32.0], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "010", profile: { rfid: "8923749210", name: "Sari", breed: "Ersip",
        gender: "Betina", cage: "Kandang C", birthDate: now - 480 * oneDay, status: "ACTIVE", createdAt: now - 465 * oneDay },
      weights: [35.0, 37.5, 39.2, 40.8], daysAgo: [120, 90, 60, 45]  // overdue
    },
    {
      id: "011", profile: { rfid: "8923749211", name: "Rambo", breed: "Moreno",
        gender: "Jantan", cage: "Kandang A", birthDate: now - 390 * oneDay, status: "ACTIVE", createdAt: now - 375 * oneDay },
      weights: [30.0, 32.0, 34.5, 36.8], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "012", profile: { rfid: "8923749212", name: "Beni", breed: "Bulu Bakar",
        gender: "Jantan", cage: "Kandang B", birthDate: now - 360 * oneDay, status: "ACTIVE", createdAt: now - 345 * oneDay },
      weights: [29.0, 31.5, 33.0, 35.5], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "013", profile: { rfid: "8923749213", name: "Susi", breed: "Kambing Sayur",
        gender: "Betina", cage: "Kandang C", birthDate: now - 330 * oneDay, status: "ACTIVE", createdAt: now - 315 * oneDay },
      weights: [26.5, 28.8, 30.5, 32.3], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "014", profile: { rfid: "8923749214", name: "Goliath", breed: "Dolfer Sulfok",
        gender: "Jantan", cage: "Kandang A", birthDate: now - 600 * oneDay, status: "ACTIVE", createdAt: now - 585 * oneDay },
      weights: [40.0, 42.5, 44.8, 46.5], daysAgo: [90, 60, 30, 5]
    },
    {
      id: "015", profile: { rfid: "8923749215", name: "Mimin", breed: "Bulu Bakar",
        gender: "Betina", cage: "Kandang B", birthDate: now - 180 * oneDay, status: "ACTIVE", createdAt: now - 165 * oneDay,
        lastWeight: 0, lastWeighDate: 0, totalWeighings: 0
      },
      weights: null, daysAgo: null   // never weighed
    }
  ];

  seederGoats.forEach(g => {
    const profile = { ...g.profile };

    if (!g.weights) {
      // never_weighed
      if (!profile.lastWeight)    profile.lastWeight = 0;
      if (!profile.lastWeighDate) profile.lastWeighDate = 0;
      if (!profile.totalWeighings) profile.totalWeighings = 0;
      set(ref(db, `goat/${g.id}`), profile);
      return;
    }

    const weighings = buildWeighings(g.weights, g.daysAgo);
    const vals      = Object.values(weighings).sort((a, b) => a.timestamp - b.timestamp);
    const last      = vals[vals.length - 1];

    profile.lastWeight     = last.weight;
    profile.lastWeighDate  = last.timestamp;
    profile.totalWeighings = vals.length;
    profile.updatedAt      = now;

    set(ref(db, `goat/${g.id}`),       profile);
    set(ref(db, `weighings/${g.id}`),  weighings);
  });

  // ─── 5. Statistik ─────────────────────────────────────────────────────────
  set(ref(db, "statistics"), {
    totalGoat: 15, weighedToday: 3, normal: 10, warning: 3, critical: 2, lastUpdated: now
  });

  // ─── 6. Notifikasi ────────────────────────────────────────────────────────
  set(ref(db, "notifications"), {
    "notif_001": { goatId: "015", type: "UNWEIGHED",   status: "unread", createdAt: now - oneDay,
                   message: "Kambing 015 (Mimin) belum pernah ditimbang." },
    "notif_002": { goatId: "004", type: "LOW_ADG",     status: "unread", createdAt: now,
                   message: "Kambing 004 (Bella) mengalami penurunan berat 2.3 kg!" },
    "notif_003": { goatId: "010", type: "OVERDUE",     status: "unread", createdAt: now - 2 * oneDay,
                   message: "Kambing 010 (Sari) terlambat ditimbang (>30 hari)." }
  }).then(() => {
    console.log("Seeding selesai!");
    alert("Database berhasil di-seed! 15 kambing + riwayat penimbangan lengkap tersimpan.");
  }).catch(e => console.error("Seeding gagal:", e));
}