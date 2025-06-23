// Firebase config is loaded from secure config file
console.log('🔧 Initializing Firebase...');
console.log('🌐 Current environment:', window.location.hostname);

if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found!');
    alert('❌ Firebase configuration missing. Please check firebase-config.js');
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

// Modal elements
const addCredentialBtn = document.getElementById("addCredentialBtn");
const credentialModal = document.getElementById("credentialModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const credentialForm = document.getElementById("credentialForm");
const folderSelect = document.getElementById("folderSelect");
const docSelect = document.getElementById("docSelect");
const newDocIdInput = document.getElementById("newDocId");

// Enhanced authentication state tracking
let authStateResolved = false;
let currentUser = null;

// Firebase Auth state listener
auth.onAuthStateChanged((user) => {
    authStateResolved = true;
    currentUser = user;
    
    if (user) {
        console.log('✅ User is signed in:', user.uid);
        enableAppFunctionality();
    } else {
        console.log('❌ User is not signed in');
        handleUnauthenticatedUser();
    }
});

// Timeout fallback for auth state
setTimeout(() => {
    if (!authStateResolved) {
        console.error('⏰ Auth state resolution timeout');
        handleUnauthenticatedUser();
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
            const userPassFields = document.getElementById('userPassFields');
            const newDocIdInput = document.getElementById('newDocId');
            const docSelect = document.getElementById('docSelect');

            if (selectedFolder === 'Mails') {
                credentialTypeSection.classList.add('hidden');
                ipField.classList.add('hidden');
                userPassFields.classList.remove('hidden');
                newDocIdInput.disabled = false;
            } else {
                credentialTypeSection.classList.remove('hidden');
                if (docSelect.value && docSelect.value !== '') {
                    ipField.classList.add('hidden');
                    userPassFields.classList.remove('hidden');
                    document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                } else {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                }
            }

            if (selectedFolder) {
                await loadExistingDocuments(selectedFolder);
                // Update visibility based on docSelect
                if (docSelect.value && docSelect.value !== '') {
                    newDocIdInput.classList.add('hidden');
                    newDocIdInput.disabled = true;
                    newDocIdInput.value = '';
                    if (selectedFolder !== 'Mails') {
                        ipField.classList.add('hidden');
                        userPassFields.classList.remove('hidden');
                        document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                    }
                } else {
                    newDocIdInput.classList.remove('hidden');
                    newDocIdInput.disabled = false;
                    if (selectedFolder !== 'Mails') {
                        ipField.classList.remove('hidden');
                        userPassFields.classList.add('hidden');
                        document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                    }
                }
            } else {
                clearDocumentSelect();
                newDocIdInput.classList.remove('hidden');
                newDocIdInput.disabled = false;
                if (selectedFolder !== 'Mails') {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                }
            }
        });
    }

    if (docSelect) {
        docSelect.addEventListener('change', () => {
            const newDocIdInput = document.getElementById('newDocId');
            const ipField = document.getElementById('ipField');
            const userPassFields = document.getElementById('userPassFields');
            const credentialTypeSection = document.getElementById('credentialTypeSection');
            const selectedFolder = folderSelect.value;

            if (docSelect.value && docSelect.value !== '') {
                newDocIdInput.classList.add('hidden');
                newDocIdInput.disabled = true;
                newDocIdInput.value = '';
                if (selectedFolder !== 'Mails') {
                    ipField.classList.add('hidden');
                    userPassFields.classList.remove('hidden');
                    document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
                }
            } else {
                newDocIdInput.classList.remove('hidden');
                newDocIdInput.disabled = false;
                if (selectedFolder !== 'Mails') {
                    ipField.classList.remove('hidden');
                    userPassFields.classList.add('hidden');
                    document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
                }
            }
        });
    }

    const credentialTypeRadios = document.querySelectorAll('input[name="credentialType"]');
    const ipField = document.getElementById('ipField');
    const userPassFields = document.getElementById('userPassFields');
    const newDocIdInput = document.getElementById('newDocId');

    credentialTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'newIp') {
                ipField.classList.remove('hidden');
                userPassFields.classList.add('hidden');
                docSelect.value = '';
                newDocIdInput.disabled = false;
                newDocIdInput.classList.remove('hidden');
            } else {
                ipField.classList.add('hidden');
                userPassFields.classList.remove('hidden');
                newDocIdInput.value = '';
                newDocIdInput.disabled = true;
                newDocIdInput.classList.add('hidden');
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
        alert('❌ Please wait for authentication to complete');
        return;
    }
    
    console.log('📝 Opening add credential modal');
    
    if (credentialForm) {
        credentialForm.reset();
        const credentialTypeSection = document.getElementById('credentialTypeSection');
        const ipField = document.getElementById('ipField');
        const userPassFields = document.getElementById('userPassFields');
        const newDocIdInput = document.getElementById('newDocId');
        const docSelect = document.getElementById('docSelect');

        // Handle Mails folder-specific UI
        if (folderSelect.value === 'Mails') {
            credentialTypeSection.classList.add('hidden');
            ipField.classList.add('hidden');
            userPassFields.classList.remove('hidden');
        } else {
            credentialTypeSection.classList.remove('hidden');
            // Hide IP field if an existing document is selected
            if (docSelect.value && docSelect.value !== '') {
                ipField.classList.add('hidden');
                userPassFields.classList.remove('hidden');
                document.querySelector('input[name="credentialType"][value="addUser"]').checked = true;
            } else {
                ipField.classList.remove('hidden');
                userPassFields.classList.add('hidden');
                document.querySelector('input[name="credentialType"][value="newIp"]').checked = true;
            }
        }

        // Hide New Document ID field if an existing document is selected
        if (docSelect.value && docSelect.value !== '') {
            newDocIdInput.classList.add('hidden');
            newDocIdInput.disabled = true;
            newDocIdInput.value = ''; // Clear any existing value
        } else {
            newDocIdInput.classList.remove('hidden');
            newDocIdInput.disabled = false;
        }
    }
    
    clearDocumentSelect();
    
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
        alert('❌ Authentication required');
        return;
    }

    const folder = folderSelect.value;
    const selectedDoc = docSelect.value;
    const newDocId = newDocIdInput.value.trim();
    const credentialType = folder === 'Mails' ? 'addUser' : document.querySelector('input[name="credentialType"]:checked')?.value;
    const ip = document.getElementById('ipInput').value.trim();
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

    if (!username || !password) {
        alert('❌ Please enter both username and password');
        return;
    }

    const documentId = selectedDoc || newDocId;
    
    console.log('📝 Adding credential:', { folder, documentId, credentialType });

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
                await docRef.set({
                    [`username${nextIndex}`]: username,
                    [`password${nextIndex}`]: password
                });
                console.log('✅ Created new document with username/password');
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
        clearSessionAndRedirect();
    }
}

function clearSessionAndRedirect() {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeModal('otpVerified');
    sessionStorage.removeItem('authTimestamp');
    alert('⚠️ Access Denied: Please login first');
    window.location.href = 'index.html';
}

async function signInToFirebase() {
    console.log('🔐 Attempting Firebase sign-in...');
    
    try {
        if (currentUser) {
            console.log('✅ User already signed in');
            return;
        }
        
        const userCredential = await auth.signInAnonymously();
        console.log('✅ Successfully signed in to Firebase:', userCredential.user.uid);
        
    } catch (error) {
        console.error('❌ Firebase sign-in failed:', error);
        
        if (error.code === 'auth/operation-not-allowed') {
            alert('❌ Anonymous authentication is not enabled in Firebase Console.');
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('❌ Domain not authorized in Firebase. Please add your domain to Firebase authorized domains.');
        } else {
            alert('❌ Authentication failed: ' + error.message);
        }
        
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
    console.log('📄 DOM Content Loaded');
    addLogoutButton();
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
                            <button class="copy-btn" onclick="copyToClipboard('${ip.toString().replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', 'ip', '${ip.toString().replace(/'/g, "\\'")}')">✏️ EDIT</button>
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
                            <button class="copy-btn" onclick="copyToClipboard('${username.toString().replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', '${usernameKey}', '${username.toString().replace(/'/g, "\\'")}')">✏️ EDIT</button>
                        </div>
                    </div>
                    <div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">Password:</span>
                            <span class="credential-value">${password}</span>
                        </div>
                        <div class="credential-actions">
                            <button class="copy-btn" onclick="copyToClipboard('${password.toString().replace(/'/g, "\\'")}', this)">📋 COPY</button>
                            <button class="edit-btn" onclick="changeCredential('${folder}', '${doc.id}', '${usernameKey.replace('username', 'password')}', '${password.toString().replace(/'/g, "\\'")}')">✏️ EDIT</button>
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
            await db.collection("credentials").doc(folder).collection("data").doc(docId).update({
                [key]: newValue.trim()
            });
            
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
                button.innerHTML = '📋';
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
        return;
    }

    try {
        const testQuery = await db.collection('credentials').limit(1).get();
        console.log('✅ Database connection test successful');
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    }
}