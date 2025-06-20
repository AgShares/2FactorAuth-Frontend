// Firebase config is loaded from secure config file
console.log('🔧 Initializing Firebase...');
console.log('🌐 Current environment:', window.location.hostname);
console.log('🔗 Current URL:', window.location.href);

if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found!');
    alert('❌ Firebase configuration missing. Please check firebase-config.js');
} else {
    console.log('✅ Firebase config loaded:', window.firebaseConfig);

    // Debug: Check if config has all required fields
    const requiredFields = ['apiKey', 'authDomain', 'projectId'];
    requiredFields.forEach(field => {
        if (!window.firebaseConfig[field]) {
            console.error(`❌ Missing required Firebase config field: ${field}`);
        } else {
            console.log(`✅ Firebase config ${field}:`, window.firebaseConfig[field]);
        }
    });
}

let app, db, auth;

try {
    app = firebase.initializeApp(window.firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    alert('❌ Firebase initialization failed: ' + error.message);
}

try {
    db = firebase.firestore();
    auth = firebase.auth();
    console.log('✅ Firestore and Auth initialized successfully');

    // Enable network persistence for offline capability
    db.enableNetwork().then(() => {
        console.log('✅ Firestore network enabled');
    }).catch(error => {
        console.error('❌ Firestore network error:', error);
    });

} catch (error) {
    console.error('❌ Firestore/Auth initialization failed:', error);
    alert('❌ Firestore/Auth initialization failed: ' + error.message);
}

const credentialsList = document.getElementById("credentialsList");
const folderButtons = document.querySelectorAll(".folder-item");

// Enhanced authentication state tracking
let authStateResolved = false;
let currentUser = null;

// Firebase Auth state listener with enhanced debugging
auth.onAuthStateChanged((user) => {
    authStateResolved = true;
    currentUser = user;

    if (user) {
        console.log('✅ User is signed in:', user.uid);
        console.log('🔐 User auth details:', {
            uid: user.uid,
            isAnonymous: user.isAnonymous,
            providerData: user.providerData
        });

        // Get ID token for debugging
        user.getIdToken().then(token => {
            console.log('🎫 Auth token obtained (length):', token.length);
        }).catch(error => {
            console.error('❌ Failed to get auth token:', error);
        });

        enableAppFunctionality();
    } else {
        console.log('❌ User is not signed in');
        handleUnauthenticatedUser();
    }
});

// Timeout fallback for auth state
setTimeout(() => {
    if (!authStateResolved) {
        console.error('⏰ Auth state resolution timeout - forcing authentication check');
        handleUnauthenticatedUser();
    }
}, 10000); // 10 second timeout

function enableAppFunctionality() {
    console.log('✅ App functionality enabled');

    // Add event listeners to folder buttons
    document.querySelectorAll(".folder-item").forEach((btn, index) => {
        btn.style.animationDelay = `${index * 0.1}s`;
        btn.classList.add('fade-in');
        btn.addEventListener("click", () => {
            const folder = btn.getAttribute("data-folder");
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = '', 150);
            fetchCredentials(folder);
        });
    });

    // Test database connection
    setTimeout(testDatabaseConnection, 2000);
}

function handleUnauthenticatedUser() {
    console.log('🔍 Checking session storage authentication...');

    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    const otpVerified = sessionStorage.getItem('otpVerified');
    const authTimestamp = sessionStorage.getItem('authTimestamp');

    console.log('📋 Session storage state:', {
        isAuthenticated,
        otpVerified,
        authTimestamp,
        hasValidSession: isAuthenticated === 'true' && otpVerified === 'true'
    });

    if (isAuthenticated === 'true' && otpVerified === 'true') {
        // Check session expiry
        if (authTimestamp) {
            const currentTime = Date.now();
            const authTime = parseInt(authTimestamp);
            const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours

            if (currentTime - authTime > sessionDuration) {
                console.log('⏰ Session expired');
                clearSessionAndRedirect();
                return;
            }
        }

        console.log('🔑 Valid session found, signing into Firebase...');
        signInToFirebase();
    } else {
        console.log('❌ No valid session found');
        clearSessionAndRedirect();
    }
}

function clearSessionAndRedirect() {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('otpVerified');
    sessionStorage.removeItem('authTimestamp');
    alert('⚠️ Access Denied: Please login first');
    window.location.href = 'index.html';
}

async function signInToFirebase() {
    console.log('🔐 Attempting Firebase sign-in...');

    try {
        // Check if already signed in
        if (currentUser) {
            console.log('✅ User already signed in');
            return;
        }

        // Sign in anonymously to Firebase
        const userCredential = await auth.signInAnonymously();
        console.log('✅ Successfully signed in to Firebase:', userCredential.user.uid);

        // Verify the sign-in worked
        const idToken = await userCredential.user.getIdToken();
        console.log('🎫 ID Token obtained successfully (length):', idToken.length);

    } catch (error) {
        console.error('❌ Firebase sign-in failed:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);

        // Specific error handling
        if (error.code === 'auth/operation-not-allowed') {
            alert('❌ Anonymous authentication is not enabled. Please enable it in Firebase Console.');
        } else if (error.code === 'auth/web-storage-unsupported') {
            alert('❌ Web storage is not supported in this browser.');
        } else {
            alert('❌ Authentication failed: ' + error.message);
        }

        // Don't redirect immediately, let user see the error
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
}

function addLogoutButton() {
    const header = document.querySelector('.header');
    if (header && !document.getElementById('viewFileLogoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'viewFileLogoutBtn';
        logoutBtn.className = 'btn btn-danger';
        logoutBtn.innerHTML = '🚪 Logout';
        logoutBtn.style.cssText = `
            position: absolute;
            top: 0px;
            right: 20px;
            padding: 10px 20px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            width:100px
        `;

        logoutBtn.addEventListener('click', async () => {
            console.log('🚪 Logging out...');

            try {
                if (auth.currentUser) {
                    await auth.signOut();
                    console.log('✅ Signed out from Firebase');
                }
            } catch (error) {
                console.error('❌ Firebase sign-out error:', error);
            }

            // Clear session storage
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('otpVerified');
            sessionStorage.removeItem('authTimestamp');

            alert('✅ Logged out successfully');
            window.location.href = 'index.html';
        });

        header.appendChild(logoutBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    addLogoutButton();
});

async function fetchCredentials(folder) {
    console.log(`📂 Fetching credentials for folder: ${folder}`);

    if (!db) {
        console.error('❌ Database not initialized');
        credentialsList.innerHTML = '<div class="error">❌ Database not initialized</div>';
        return;
    }

    if (!auth.currentUser) {
        console.error('❌ No authenticated user');
        credentialsList.innerHTML = '<div class="error">❌ Authentication required</div>';
        return;
    }

    console.log('👤 Current user:', auth.currentUser.uid);
    credentialsList.innerHTML = '<div class="loading">Loading credentials...</div>';
    credentialsList.classList.add('show');

    try {
        console.log(`🔍 Querying collection: credentials/${folder}/data`);

        // Test auth token before querying
        const idToken = await auth.currentUser.getIdToken(true); // Force refresh
        console.log('🎫 Fresh ID token obtained');

        const snapshot = await db.collection("credentials").doc(folder).collection("data").get();

        console.log(`📊 Query result: ${snapshot.size} documents found`);

        if (snapshot.empty) {
            console.log('📭 No documents found');
            credentialsList.innerHTML = `
                <div class="credentials-table">
                    <div class="table-header">${folder} Credentials</div>
                    <div class="no-data">No credentials found for this category</div>
                </div>`;
            return;
        }

        let tableHTML = `<div class="credentials-table">
            <div class="table-header">${folder} Credentials</div>
            <table><thead><tr><th>Credential ID</th><th>Details</th></tr></thead><tbody>`;

        snapshot.forEach(doc => {
            console.log(`📄 Processing document: ${doc.id}`);
            const data = doc.data();
            let details = Object.entries(data).map(([key, value]) => `
                <div class="credential-item">
                    <div class="credential-content">
                        <span class="credential-key">${key}:</span>
                        <span class="credential-value">${value}</span>
                    </div>
                    <div class="credential-actions">
                        <button class="copy-btn" onclick="copyToClipboard('${value.toString().replace(/'/g, "\\'")}', this)">📋</button>
                        <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', '${key}', '${value.toString().replace(/'/g, "\\'")}')">✏️</button>
                    </div>
                </div>`).join('');

            tableHTML += `<tr><td><strong>${doc.id}</strong></td><td>${details}</td></tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        credentialsList.innerHTML = tableHTML;
        console.log('✅ Credentials displayed successfully');

    } catch (error) {
        console.error('❌ Detailed error loading credentials:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });

        let errorMessage = '⚠️ Error loading credentials: ';

        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Check Firebase rules and authentication.';
        } else if (error.code === 'unauthenticated') {
            errorMessage += 'Authentication required. Please login again.';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            errorMessage += error.message;
        }

        credentialsList.innerHTML = `<div class="error">${errorMessage}</div>`;
    }
}

async function changeCredential(folder, docId, key, currentValue) {
    if (!auth.currentUser) {
        alert('❌ Authentication required');
        return;
    }

    const newValue = prompt(`✏️ Edit value for "${key}":`, currentValue);
    if (newValue !== null && newValue.trim() !== '') {
        try {
            console.log(`✏️ Updating ${folder}/${docId}/${key}`);

            await db.collection("credentials").doc(folder).collection("data").doc(docId).update({
                [key]: newValue.trim()
            });

            console.log('✅ Update successful');
            alert('✅ Value updated successfully');
            fetchCredentials(folder);
        } catch (error) {
            console.error('❌ Update failed:', error);
            alert('❌ Update failed: ' + error.message);
        }
    }
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.innerHTML;
        button.innerHTML = '✅';
        setTimeout(() => button.innerHTML = originalText, 2000);
    } catch (err) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            button.innerHTML = '✅';
            setTimeout(() => button.innerHTML = '📋', 2000);
        } catch (err) {
            button.innerHTML = '❌';
        }
        document.body.removeChild(textArea);
    }
}

async function testDatabaseConnection() {
    console.log('🧪 Testing database connection...');

    if (!auth.currentUser) {
        console.error('❌ No authenticated user for database test');
        return;
    }

    try {
        console.log('🔍 Testing with simple query...');
        const testQuery = await db.collection('credentials').limit(1).get();
        console.log('✅ Database connection test successful');
        console.log(`📊 Test query returned ${testQuery.size} documents`);
    } catch (error) {
        console.error('❌ Database connection test failed:', {
            code: error.code,
            message: error.message
        });

        // Show user-friendly error
        if (error.code === 'permission-denied') {
            console.error('🚫 Permission denied - check Firebase rules');
        } else if (error.code === 'unauthenticated') {
            console.error('🔐 Unauthenticated - authentication issue');
        }
    }
}