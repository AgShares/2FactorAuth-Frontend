// main.js

// Import Firebase functions you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Import Firebase config from external file
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Optional: Initialize Firebase Auth
const auth = getAuth(app);

// Optional: Log current user (if logged in)
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User is logged in:", user.email);
  } else {
    console.log("No user is logged in");
  }
});

// Example usage (if you have a login button)
document.getElementById("loginBtn")?.addEventListener("click", () => {
  // Add your login code here
  alert("Login clicked");
});
