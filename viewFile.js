// Firebase initialization
console.log('🔧 Initializing Firebase...');
console.log('🌐 Current environment:', window.location.hostname);

if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found!');
    alert('❌ Firebase configuration missing. Please check index.js');
} else {
    console.log('✅ Firebase config loaded:', window.firebaseConfig);
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
} catch (error) {
    console.error('❌ Firestore/Auth initialization failed:', error);
    alert('❌ Firestore/Auth initialization failed: ' + error.message);
}

const credentialsList = document.getElementById("credentialsList");
const folderButtons = document.querySelectorAll(".folder-item");
const loginHistoryList = document.getElementById("loginHistoryList");

// Modal elements
const addCredentialBtn = document.getElementById("addCredentialBtn");
const credentialModal = document.getElementById("credentialModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const credentialForm = document.getElementById("credentialForm");
const folderSelect = document.getElementById("folderSelect");
const docSelect = document.getElementById("docSelect");
const newDocIdInput = document.getElementById("newDocId");

// User status elements
const userStatus = document.getElementById("userStatus");
const currentUserDisplay = document.getElementById("currentUser");
const loginTimeDisplay = document.getElementById("loginTime");
const sessionDurationDisplay = document.getElementById("sessionDuration");
const statusIndicator = document.querySelector(".status-indicator");

// Authentication state tracking
let authStateResolved = false;
let currentUser = null;
let sessionTimer = null;

// Save login event to Firestore
async function saveLoginEvent(identifier, userId) {
    if (!db || !auth.currentUser) {
        console.error('❌ Cannot save login event: Database or authentication not ready');
        return;
    }

    try {
        await db.collection("logins").add({
            identifier: identifier || "Anonymous",
            userId: userId || "Unknown",
            loginTime: firebase.firestore.Timestamp.now()
        });
        console.log('✅ Login event saved successfully');
        fetchLoginHistory();
    } catch (error) {
        console.error('❌ Error saving login event:', error);
    }
}

// Fetch and display login history
async function fetchLoginHistory() {
    if (!db || !auth.currentUser || !loginHistoryList) {
        console.error('❌ Cannot fetch login history: Database, authentication, or UI not ready');
        return;
    }

    try {
        const snapshot = await db.collection("logins")
            .orderBy("loginTime", "desc")
            .limit(50)
            .get();

        loginHistoryList.innerHTML = '';
        if (snapshot.empty) {
            loginHistoryList.innerHTML = '<li class="no-data">No login history available</li>';
            return;
        }

        snapshot.forEach(doc => {
            const data = doc.data();
            const loginTime = data.loginTime.toDate().toLocaleString('en-US', {
                dateStyle: 'short',
                timeStyle: 'short'
            });
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="login-email">${data.identifier}</span>
                <span class="login-time">${loginTime}</span>
            `;
            loginHistoryList.appendChild(li);
        });

        console.log('✅ Login history fetched and displayed');
    } catch (error) {
        console.error('❌ Error fetching login history:', error);
        loginHistoryList.innerHTML = '<li class="error">Error loading login history</li>';
    }
}

// Update user status display
function updateUserStatus(status = "loading") {
    if (!userStatus || !currentUserDisplay || !loginTimeDisplay || !sessionDurationDisplay || !statusIndicator) return;

    // Update status indicator
    statusIndicator.classList.remove("loading", "connected", "error");
    statusIndicator.classList.add(status);

    // Update status text
    userStatus.classList.remove("loading", "connected", "error");
    userStatus.classList.add(status);
    document.querySelector(".user-status-value").textContent = status === "connected" ? "Connected" : status === "error" ? "Error" : "Connecting...";

    // Update user identifier
    const identifier = sessionStorage.getItem('identifier') || currentUser?.email || "Anonymous";
    currentUserDisplay.textContent = identifier;

    // Update login time
    const authTimestamp = sessionStorage.getItem('authTimestamp');
    let loginTime = "--:--";
    if (authTimestamp) {
        const loginDate = new Date(parseInt(authTimestamp));
        loginTime = loginDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        loginTimeDisplay.textContent = loginTime;
    } else {
        loginTimeDisplay.textContent = "--:--";
    }

    // Update session duration
    if (sessionTimer) clearInterval(sessionTimer);
    if (authTimestamp) {
        sessionTimer = setInterval(() => {
            const currentTime = Date.now();
            const authTime = parseInt(authTimestamp);
            const elapsed = currentTime - authTime;
            const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
            const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
            sessionDurationDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }, 1000);
    } else {
        sessionDurationDisplay.textContent = "00:00:00";
    }

    console.log(`✅ Updated user status: ${status}, Identifier: ${identifier}, Login: ${loginTime}`);
}

// Firebase Auth state listener
auth.onAuthStateChanged((user) => {
    authStateResolved = true;
    currentUser = user;

    if (user) {
        console.log('✅ User is signed in:', user.uid);
        const identifier = sessionStorage.getItem('identifier') || user.email || "Anonymous";
        updateUserStatus("connected");
        saveLoginEvent(identifier, user.uid);
        enableAppFunctionality();
    } else {
        console.log('❌ User is not signed in');
        updateUserStatus("error");
        // auth-check.js handles redirection
    }
});

// Timeout fallback for auth state
setTimeout(() => {
    if (!authStateResolved) {
        console.error('⏰ Auth state resolution timeout');
        updateUserStatus("error");
        // auth-check.js handles redirection
    }
}, 10000);

function enableAppFunctionality() {
    console.log('✅ App functionality enabled');

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

    setupModalFunctionality();
    fetchLoginHistory();

    setTimeout(testDatabaseConnection, 2000);
}

function setupModalFunctionality() {
    console.log('⚙️ Setting up modal functionality...');

    if (addCredentialBtn) {
        addCredentialBtn.addEventListener('click', () => {
            console.log('➕ Add credential button clicked');
            openModal();
        });
    } else {
        console.error('❌ Add credential button not found');
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            console.log('❌ Close modal button clicked');
            closeModal();
        });
    }

    if (credentialModal) {
        credentialModal.addEventListener('click', (e) => {
            if (e.target === credentialModal) {
                closeModal();
            }
        });
    }

    if (folderSelect) {
        folderSelect.addEventListener('change', async () => {
            const selectedFolder = folderSelect.value;
            console.log('📂 Folder selected:', selectedFolder);

            const credentialTypeSection = document.getElementById('credentialTypeSection');
            const ipField = document.getElementById('ipField');
            const urlField = document.getElementById('urlField');
            const userPassFields = document.getElementById('userPassFields');
            const newDocIdInput = document.getElementById('newDocId');
            const newDocIdLabel = document.querySelector('label[for="newDocId"]');

            if (selectedFolder === 'Mails') {
                credentialTypeSection.classList.add('hidden');
                ipField.classList.add('hidden');
                urlField.classList.remove('hidden');
                userPassFields.classList.remove('hidden');
                newDocIdInput.classList.remove('hidden');
                newDocIdLabel.style.display = 'block';
                newDocIdInput.disabled = false;
                urlField.querySelector('input').disabled = false;
            } else {
                credentialTypeSection.classList.remove('hidden');
                urlField.classList.add('hidden');
                if (docSelect.value && docSelect.value !== '') {
                    ipField.classList.add('hidden');
                    userPassFields.classList.remove('hidden');
                    document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                    newDocIdInput.classList.add('hidden');
                    newDocIdLabel.style.display = 'none';
                    newDocIdInput.disabled = true;
                    newDocIdInput.value = '';
                } else {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                    newDocIdInput.classList.remove('hidden');
                    newDocIdLabel.style.display = 'block';
                    newDocIdInput.disabled = false;
                }
            }

            if (selectedFolder) {
                await loadExistingDocuments(selectedFolder);
            } else {
                clearDocumentSelect();
                newDocIdInput.classList.remove('hidden');
                newDocIdLabel.style.display = 'block';
                newDocIdInput.disabled = false;
                urlField.classList.add('hidden');
                if (selectedFolder !== 'Mails') {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                }
            }
        });
    }

    if (docSelect) {
        docSelect.addEventListener('change', async () => {
            const newDocIdInput = document.getElementById('newDocId');
            const newDocIdLabel = document.querySelector('label[for="newDocId"]');
            const ipField = document.getElementById('ipField');
            const urlField = document.getElementById('urlField');
            const userPassFields = document.getElementById('userPassFields');
            const selectedFolder = folderSelect.value;

            if (docSelect.value && docSelect.value !== '') {
                newDocIdInput.classList.add('hidden');
                newDocIdLabel.style.display = 'none';
                newDocIdInput.disabled = true;
                newDocIdInput.value = '';
                if (selectedFolder !== 'Mails') {
                    ipField.classList.add('hidden');
                    userPassFields.classList.remove('hidden');
                    document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                } else {
                    // For Mails, disable URL field if document exists
                    urlField.classList.remove('hidden');
                    userPassFields.classList.remove('hidden');
                    const docRef = db.collection("credentials").doc(selectedFolder).collection("data").doc(docSelect.value);
                    const docSnapshot = await docRef.get();
                    const urlInput = urlField.querySelector('input');
                    if (docSnapshot.exists && docSnapshot.data().url) {
                        urlInput.value = docSnapshot.data().url;
                        urlInput.disabled = true;
                    } else {
                        urlInput.value = '';
                        urlInput.disabled = false;
                    }
                }
            } else {
                newDocIdInput.classList.remove('hidden');
                newDocIdLabel.style.display = 'block';
                newDocIdInput.disabled = false;
                if (selectedFolder !== 'Mails') {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                    urlField.classList.add('hidden');
                } else {
                    urlField.classList.remove('hidden');
                    userPassFields.classList.remove('hidden');
                    urlField.querySelector('input').disabled = false;
                }
            }
        });
    }

    const credentialTypeRadios = document.querySelectorAll('input[name="credentialType"]');
    const ipField = document.getElementById('ipField');
    const urlField = document.getElementById('urlField');
    const userPassFields = document.getElementById('userPassFields');
    const newDocIdInput = document.getElementById('newDocId');
    const newDocIdLabel = document.querySelector('label[for="newDocId"]');

    credentialTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'newIp') {
                ipField.classList.remove('hidden');
                userPassFields.classList.add('hidden');
                urlField.classList.add('hidden');
                docSelect.value = '';
                newDocIdInput.disabled = false;
                newDocIdInput.classList.remove('hidden');
                newDocIdLabel.style.display = 'block';
            } else {
                ipField.classList.add('hidden');
                userPassFields.classList.remove('hidden');
                urlField.classList.add('hidden');
                newDocIdInput.value = '';
                newDocIdInput.disabled = true;
                newDocIdInput.classList.add('hidden');
                newDocIdLabel.style.display = 'none';
            }
        });
    });

    if (credentialForm) {
        credentialForm.addEventListener('submit', handleFormSubmission);
    }

    console.log('✅ Modal functionality setup complete');
}

function openModal() {
    if (!auth.currentUser) {
        console.log('❌ Authentication required to open modal');
        return; // auth-check.js will handle redirection
    }

    console.log('📝 Opening add credential modal');

    if (credentialForm) {
        const currentDocValue = docSelect.value;
        credentialForm.reset();
        const credentialTypeSection = document.getElementById('credentialTypeSection');
        const ipField = document.getElementById('ipField');
        const urlField = document.getElementById('urlField');
        const userPassFields = document.getElementById('userPassFields');
        const newDocIdInput = document.getElementById('newDocId');
        const newDocIdLabel = document.querySelector('label[for="newDocId"]');

        if (folderSelect.value === 'Mails') {
            credentialTypeSection.classList.add('hidden');
            ipField.classList.add('hidden');
            urlField.classList.remove('hidden');
            userPassFields.classList.remove('hidden');
            newDocIdInput.classList.remove('hidden');
            newDocIdLabel.style.display = 'block';
            newDocIdInput.disabled = false;
            urlField.querySelector('input').disabled = false;
        } else {
            credentialTypeSection.classList.remove('hidden');
            urlField.classList.add('hidden');
            if (currentDocValue && currentDocValue !== '') {
                ipField.classList.add('hidden');
                userPassFields.classList.remove('hidden');
                document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                newDocIdInput.classList.add('hidden');
                newDocIdLabel.style.display = 'none';
                newDocIdInput.disabled = true;
                newDocIdInput.value = '';
            } else {
                ipField.classList.remove('hidden');
                userPassFields.classList.add('hidden');
                document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                newDocIdInput.classList.remove('hidden');
                newDocIdLabel.style.display = 'block';
                newDocIdInput.disabled = false;
            }
        }
    }

    if (credentialModal) {
        credentialModal.classList.remove('hidden');
        credentialModal.style.display = 'flex';
    }
}

function closeModal() {
    console.log('❌ Closing modal');

    if (credentialModal) {
        credentialModal.classList.add('hidden');
        credentialModal.style.display = 'none';
    }
}

function clearDocumentSelect() {
    if (docSelect) {
        docSelect.innerHTML = '<option value="">-- Create New Document --</option>';
    }
}

async function loadExistingDocuments(folder) {
    console.log(`📄 Loading existing documents for folder: ${folder}`);

    if (!db || !auth.currentUser) {
        console.error('❌ Database or authentication not ready');
        return;
    }

    try {
        const snapshot = await db.collection("credentials").doc(folder).collection("data").get();

        clearDocumentSelect();

        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.id;
                docSelect.appendChild(option);
            });

            console.log(`✅ Loaded ${snapshot.size} existing documents`);

            // Trigger docSelect change event to update UI
            docSelect.dispatchEvent(new Event('change'));
        } else {
            console.log('📭 No existing documents found');
        }
    } catch (error) {
        console.error('❌ Error loading existing documents:', error);
    }
}

async function handleFormSubmission(event) {
    event.preventDefault();
    console.log('📤 Form submission started');

    if (!auth.currentUser) {
        console.log('❌ Authentication required for form submission');
        return; // auth-check.js will handle redirection
    }

    const folder = folderSelect.value;
    const selectedDoc = docSelect.value;
    const newDocId = newDocIdInput.value.trim();
    const credentialType = folder === 'Mails' ? 'addUser' : document.querySelector('input[name="credentialType"]:checked')?.value;
    const ip = document.getElementById('ipInput').value.trim();
    const url = document.getElementById('urlInput').value.trim();
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    // Validation
    if (!folder) {
        alert('❌ Please select a category');
        return;
    }

    if (!selectedDoc && !newDocId) {
        alert('❌ Please select an existing document or enter a new document ID');
        return;
    }

    if (folder !== 'Mails' && credentialType === 'newIp' && !ip) {
        alert('❌ Please enter an IP address');
        return;
    }

    // URL is now optional for Mails - removed validation

    if (!username || !password) {
        alert('❌ Please enter both username and password');
        return;
    }

    const documentId = selectedDoc || newDocId;

    console.log('📝 Adding credential:', { folder, documentId, credentialType, url });

    try {
        const docRef = db.collection("credentials").doc(folder).collection("data").doc(documentId);
        const docSnapshot = await docRef.get();

        if (folder === 'Mails') {
            let nextIndex = 1;
            if (docSnapshot.exists) {
                const data = docSnapshot.data();
                while (data[`username${nextIndex}`]) {
                    nextIndex++;
                }
                await docRef.update({
                    [`username${nextIndex}`]: username,
                    [`password${nextIndex}`]: password
                });
                console.log(`✅ Added username${nextIndex} and password${nextIndex} to document`);
            } else {
                const docData = {
                    [`username${nextIndex}`]: username,
                    [`password${nextIndex}`]: password
                };
                // Only add URL if it's provided
                if (url) {
                    docData.url = url;
                }
                await docRef.set(docData);
                console.log('✅ Created new Mails document with username/password' + (url ? ' and URL' : ''));
            }
        } else {
            if (credentialType === 'newIp') {
                if (docSnapshot.exists) {
                    alert('❌ Document ID already exists. Please choose a different ID or select an existing document.');
                    return;
                }
                await docRef.set({
                    ip: ip,
                    username1: username,
                    password1: password
                });
                console.log('✅ Created new document with IP and username/password');
            } else {
                if (!docSnapshot.exists) {
                    alert('❌ Document does not exist. Please select an existing document or create a new IP first.');
                    return;
                }
                const data = docSnapshot.data();
                let nextIndex = 1;
                while (data[`username${nextIndex}`]) {
                    nextIndex++;
                }
                await docRef.update({
                    [`username${nextIndex}`]: username,
                    [`password${nextIndex}`]: password
                });
                console.log(`✅ Added username${nextIndex} and password${nextIndex} to document`);
            }
        }

        alert('✅ Credential added successfully!');
        closeModal();

        const currentFolderHeader = document.querySelector('.table-header');
        if (currentFolderHeader && currentFolderHeader.textContent.includes(folder)) {
            fetchCredentials(folder);
        }
    } catch (error) {
        console.error('❌ Error adding credential:', error);
        alert('❌ Error adding credential: ' + error.message);
        updateUserStatus("error");
    }
}

function handleUnauthenticatedUser() {
    console.log('🔍 Checking session storage authentication...');

    const isAuthenticated = sessionStorage.getItem('isAuthenticated');
    const otpVerified = sessionStorage.getItem('otpVerified');
    const authTimestamp = sessionStorage.getItem('authTimestamp');

    if (isAuthenticated === 'true' && otpVerified === 'true') {
        if (authTimestamp) {
            const currentTime = Date.now();
            const authTime = parseInt(authTimestamp);
            const sessionDuration = 24 * 60 * 60 * 1000;

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
        updateUserStatus("error");
        // auth-check.js handles redirection
    }
}

function clearSessionAndRedirect() {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('otpVerified');
    sessionStorage.removeItem('authTimestamp');
    sessionStorage.removeItem('identifier');
    if (sessionTimer) clearInterval(sessionTimer);
    console.log('🧹 Session cleared');
    // auth-check.js handles redirection
}

async function signInToFirebase() {
    console.log('🔐 Attempting Firebase sign-in...');

    try {
        if (currentUser) {
            console.log('✅ User already signed in');
            updateUserStatus("connected");
            return;
        }

        const userCredential = await auth.signInAnonymously();
        console.log('✅ Successfully signed in to Firebase:', userCredential.user.uid);
        const email = userCredential.user.email || sessionStorage.getItem('identifier');
        if (email) sessionStorage.setItem('identifier', email);
        updateUserStatus("connected");
        saveLoginEvent(email || "Anonymous", userCredential.user.uid);
    } catch (error) {
        console.error('❌ Firebase sign-in failed:', error);
        updateUserStatus("error");
        // auth-check.js handles redirection
    }
}

function addLogoutButton() {
    const header = document.querySelector('.header');
    if (header && !document.getElementById('viewFileLogoutBtn')) {
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'viewFileLogoutBtn';
        logoutBtn.className = 'btn cancel';
        logoutBtn.innerHTML = '🚪 Logout';
        logoutBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            font-size: 14px;
            width: 100px;
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

            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('otpVerified');
            sessionStorage.removeItem('authTimestamp');
            sessionStorage.removeItem('identifier');
            if (sessionTimer) clearInterval(sessionTimer);
            updateUserStatus("error");
            alert('✅ Logged out successfully');
            window.location.href = 'index.html';
        });

        header.appendChild(logoutBtn);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    addLogoutButton();
    updateUserStatus("loading");
});

let currentlyOpenDetail = null;

function toggleCredentialDetails(docId) {
    const detailRow = document.getElementById(`details-${docId}`);

    if (!detailRow) return;

    if (currentlyOpenDetail === docId) {
        detailRow.classList.remove('active');
        currentlyOpenDetail = null;
        console.log(`❌ Closed details for credential: ${docId}`);
        return;
    }

    if (currentlyOpenDetail) {
        const previousDetailRow = document.getElementById(`details-${currentlyOpenDetail}`);
        if (previousDetailRow) {
            previousDetailRow.classList.remove('active');
            console.log(`❌ Closed previous details for credential: ${currentlyOpenDetail}`);
        }
    }

    detailRow.classList.add('active');
    currentlyOpenDetail = docId;
    console.log(`✅ Opened details for credential: ${docId}`);
}

async function fetchCredentials(folder) {
    console.log(`📂 Fetching credentials for folder: ${folder}`);

    if (!db || !auth.currentUser) {
        credentialsList.innerHTML = '<div class="error">❌ Authentication required</div>';
        updateUserStatus("error");
        return;
    }

    credentialsList.innerHTML = '<div class="loading">Loading credentials...</div>';
    credentialsList.classList.add('show');

    try {
        const snapshot = await db.collection("credentials").doc(folder).collection("data").get();

        if (snapshot.empty) {
            credentialsList.innerHTML = `
                <div class="credentials-table">
                    <div class="table-header">${folder} Credentials</div>
                    <div class="no-data">No credentials found for this category</div>
                </div>`;
            return;
        }

        let tableHTML = `<div class="credentials-table">
            <div class="table-header">${folder} Credentials</div>
            <table><thead><tr><th>Credential ID</th></tr></thead><tbody>`;

        snapshot.forEach(doc => {
            const data = doc.data();
            const ip = folder !== 'Mails' && (data.ip || data.IP || '');
            const url = folder === 'Mails' && (data.url || '');
            const credentials = [];
            Object.entries(data).forEach(([key, value]) => {
                if (key.toLowerCase().startsWith('username')) {
                    const index = key.match(/\d+/) ? key.match(/\d+/)[0] : '';
                    const passwordKey = index ? `password${index}` : 'password';
                    const password = data[passwordKey] || '';
                    if (password) {
                        credentials.push({ usernameKey: key, username: value, password });
                    }
                }
            });

            let details = '';
            if (folder !== 'Mails' && ip) {
                details += `
                    <div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">IP:</span>
                            <span class="credential-value">${ip}</span>
                        </div>
                        <div class="credential-actions">
                            <button class="copy-btn" onclick="copyToClipboard('${ip.replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', 'ip', '${ip.replace(/'/g, "\\'")}')">✏️ EDIT</button>
                        </div>
                    </div>`;
            } else if (folder === 'Mails' && url) {
                details += `
                    <div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">URL:</span>
                            <span class="credential-value">${url}</span>
                        </div>
                        <div class="credential-actions">
                            <button class="copy-btn" onclick="copyToClipboard('${url.replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', 'url', '${url.replace(/'/g, "\\'")}')">✏️ EDIT</button>
                        </div>
                    </div>`;
            }

            credentials.forEach(({ usernameKey, username, password }) => {
                details += `
                    <div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">Username:</span>
                            <span class="credential-value">${username}</span>
                        </div>
                        <div class="credential-actions">
                            <button class="copy-btn" onclick="copyToClipboard('${username.replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', '${usernameKey}', '${username.replace(/'/g, "\\'")}')">✏️ EDIT</button>
                        </div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">Password:</span>
                            <span class="credential-value">${password}</span>
                        </div>
                        <div class="credential-actions">
                            <button class="copy-btn" onclick="copyToClipboard('${password.replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', '${usernameKey.replace('username', 'password')}', '${password.replace(/'/g, "\\'")}')">✏️ EDIT</button>
                        </div>
                    </div>`;
            });

            tableHTML += `
                <tr class="credential-row" onclick="toggleCredentialDetails('${doc.id}')">
                    <td><strong>${doc.id}</strong></td>
                </tr>
                <tr class="credential-details" id="details-${doc.id}">
                    <td colspan="1">${details}</td>
                </tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        credentialsList.innerHTML = tableHTML;
        console.log('✅ Credentials displayed successfully');
    } catch (error) {
        console.error('❌ Error loading credentials:', error);
        updateUserStatus("error");

        let errorMessage = '⚠️ Error loading credentials: ';

        if (error.code === 'permission-denied') {
            errorMessage += 'Permission denied. Check Firebase rules and authentication.';
        } else if (error.code === 'unauthenticated') {
            errorMessage += 'Authentication required. Please login again.';
            // auth-check.js handles redirection
        } else {
            errorMessage += error.message;
        }

        credentialsList.innerHTML = `<div class="error">${errorMessage}</div>`;
    }
}

async function changeCredential(folder, docId, key, currentValue) {
    if (!auth.currentUser) {
        console.log('❌ Authentication required for editing credential');
        updateUserStatus("error");
        return;
    }

    const newValue = prompt(`✏️ Edit value for "${key}":`, currentValue);
    if (newValue !== null && newValue.trim() !== '') {
        try {
            await db.collection("credentials").doc(folder).collection("data").doc(docId).update({
                [key]: newValue.trim()
            });

            alert('✅ Value updated successfully');
            fetchCredentials(folder);
        } catch (error) {
            console.error('❌ Update failed:', error);
            alert('❌ Update failed: ' + error.message);
            updateUserStatus("error");
        }
    }
}

async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = button.innerHTML;
        button.innerHTML = '✅';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
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
            button.classList.add('copied');
            setTimeout(() => {
                button.innerHTML = '📋 COPY';
                button.classList.remove('copied');
            }, 2000);
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
        updateUserStatus("error");
        return;
    }

    try {
        const testQuery = await db.collection('credentials').limit(1).get();
        console.log('✅ Database connection test successful');
        updateUserStatus("connected");
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        updateUserStatus("error");
    }
}
