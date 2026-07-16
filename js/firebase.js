// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDBpbsktMOpSLsWkjGjXxAGTgoZtsJyuUo",
  authDomain: "smartlivestock-1d490.firebaseapp.com",
  databaseURL: "https://smartlivestock-1d490-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smartlivestock-1d490",
  storageBucket: "smartlivestock-1d490.firebasestorage.app",
  messagingSenderId: "171317879360",
  appId: "1:171317879360:web:ddab6d31ab07bb98f275a5",
  measurementId: "G-RDRFBPR0GB"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Ekspor modul agar bisa dipakai di file JS lainnya
export { auth, db, ref, set, signInWithEmailAndPassword };