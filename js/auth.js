// js/auth.js
import { auth, signInWithEmailAndPassword } from "./firebase.js";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  console.log("Mencoba login dengan:", email);

  // Coba Firebase Auth terlebih dahulu
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      console.log("Firebase Auth Sukses:", userCredential.user);
      localStorage.setItem("userLoggedIn", "true");
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userName", "Livestock Manager");
      alert("Login Berhasil!");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.warn("Firebase Auth Gagal, mencoba fallback lokal:", error.message);
      
      // Fallback lokal agar user tidak terblokir saat testing UI
      if (email === "manager@farm.com" && password === "123456") {
        localStorage.setItem("userLoggedIn", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", "Livestock Manager");
        alert("Login Berhasil (Mode Demo - Firebase Auth dilewati)!");
        window.location.href = "index.html";
      } else {
        alert("Login Gagal: Periksa kembali email dan password Anda.\n\nAkun default demo:\nEmail: manager@farm.com\nPassword: 123456");
      }
    });
});