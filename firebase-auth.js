// Firebase config is loaded from secure config file
firebase.initializeApp(window.firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let generatedOTP = "";
let allowedNumbers = [];

// ✅ Fetch allowed numbers from Firestore
async function fetchAllowedNumbers() {
  try {
    const docRef = db.collection("allowedNumbers").doc("numbers");
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      allowedNumbers = (data.phoneNumbers || []).map(num => String(num));
    } else {
      console.warn("⚠️ allowedNumbers/numbers doc not found.");
    }
  } catch (err) {
    console.error("🔥 Error fetching allowed numbers from Firestore:", err);
  }
}

fetchAllowedNumbers(); // 🔁 Call on load

// ✅ Authentication state listener
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in on login page, show OTP section if not already shown
    const otpSection = document.getElementById('otpSection');
    // if (otpSection && !otpSection.classList.contains('show')) {
    //   showOtpSection();
    // }
  } else {
    // User is signed out, hide OTP section
    hideOtpSection();
    // Clear any authentication flags
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('otpVerified');
  }
});

// ✅ Login logic
document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showMessage('Login successful! Setting up 2FA...', 'success');
      showOtpSection();
    })
    .catch(() => {
      alert("❌ Invalid email or password");
    });
});

// ✅ OTP generator
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ✅ Send OTP button click (fixed `this`)
document.getElementById("sendOtpBtn").addEventListener("click", async function () {
  const phone = document.getElementById("phone").value.trim();

  if (!allowedNumbers.includes(phone)) {
    alert("❌ This number is not authorized to receive OTP.");
    return;
  }

  generatedOTP = generateOTP();
  setButtonLoading(this, true);

  try {
    const response = await fetch("http://localhost:4000/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, otp: generatedOTP })
    });

    const data = await response.json();
    if (data.success) {
      showMessage('✅ OTP sent successfully.', 'success');
    } else {
      alert("❌ Failed to send OTP: " + data.error);
    }
  } catch (err) {
    alert("❌ Failed to send OTP: " + err.message);
  } finally {
    setButtonLoading(this, false);
  }
});

// ✅ Verify OTP button click
document.getElementById("verifyOtpBtn").addEventListener("click", function () {
  const enteredOTP = document.getElementById("otpInput").value;
  if (enteredOTP === generatedOTP) {
    // Set authentication flags
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('otpVerified', 'true');
    sessionStorage.setItem('authTimestamp', Date.now().toString());
    
    showMessage("✅ OTP verified! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "viewFile.html";
    }, 1500);
  } else {
    alert("❌ Invalid OTP.");
  }
});

// ✅ Logout (only called from viewFile page)
function logoutUser() {
  auth.signOut().then(() => {
    // Clear authentication flags
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('otpVerified');
    sessionStorage.removeItem('authTimestamp');
    
    // Redirect to login page
    window.location.href = 'index.html';
  });
}

// ✅ UI helpers
const loginForm = document.getElementById('loginForm');
const otpSection = document.getElementById('otpSection');
const logoutBtn = document.getElementById('logoutBtn');
const messageDiv = document.getElementById('message');

function showMessage(text, type = 'info') {
  messageDiv.textContent = text;
  messageDiv.className = `message show ${type}`;
  setTimeout(() => {
    messageDiv.classList.remove('show');
  }, 5000);
}

function showOtpSection() {
  otpSection.style.display = 'block';
  setTimeout(() => {
    otpSection.classList.add('show');
  }, 10);
}

function hideOtpSection() {
  otpSection.classList.remove('show');
  setTimeout(() => {
    otpSection.style.display = 'none';
  }, 500);
}

function setButtonLoading(button, loading) {
  if (!button) return;
  if (loading) {
    button.innerHTML += '<span class="loading"></span>';
    button.disabled = true;
    button.style.opacity = '0.7';
  } else {
    button.innerHTML = button.innerHTML.replace('<span class="loading"></span>', '');
    button.disabled = false;
    button.style.opacity = '1';
  }
}

// ✅ Input animations
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('focus', function () {
    this.style.transform = 'translateY(-2px)';
  });

  input.addEventListener('blur', function () {
    this.style.transform = 'translateY(0)';
  });
});

// ✅ Input sanitization
document.getElementById('phone').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});
document.getElementById('otpInput').addEventListener('input', function () {
  this.value = this.value.replace(/\D/g, '');
});