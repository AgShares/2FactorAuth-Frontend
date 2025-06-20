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

    // Enable modal functionality
    setupModalFunctionality();
    
    // Test database connection
    setTimeout(testDatabaseConnection, 2000);
}

function setupModalFunctionality() {
    console.log('⚙️ Setting up modal functionality...');
    
    // Add credential button click
    if (addCredentialBtn) {
        addCredentialBtn.addEventListener('click', () => {
            console.log('➕ Add credential button clicked');
            openModal();
        });
    } else {
        console.error('❌ Add credential button not found');
    }

    // Close modal button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            console.log('❌ Close modal button clicked');
            closeModal();
        });
    }

    // Click outside modal to close
    if (credentialModal) {
        credentialModal.addEventListener('click', (e) => {
            if (e.target === credentialModal) {
                closeModal();
            }
        });
    }

    // Folder select change event
    if (folderSelect) {
        folderSelect.addEventListener('change', async () => {
            const selectedFolder = folderSelect.value;
            console.log('📂 Folder selected:', selectedFolder);
            
            if (selectedFolder) {
                await loadExistingDocuments(selectedFolder);
            } else {
                clearDocumentSelect();
            }
        });
    }

    // Form submission
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
    
    // Reset form
    if (credentialForm) {
        credentialForm.reset();
    }
    
    clearDocumentSelect();
    
    // Show modal
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

    // Get form values
    const folder = folderSelect.value;
    const selectedDoc = docSelect.value;
    const newDocId = newDocIdInput.value.trim();
    const key = document.getElementById('credKey').value.trim();
    const value = document.getElementById('credValue').value.trim();

    // Validation
    if (!folder) {
        alert('❌ Please select a category');
        return;
    }

    if (!selectedDoc && !newDocId) {
        alert('❌ Please select an existing document or enter a new document ID');
        return;
    }

    if (!key || !value) {
        alert('❌ Please enter both field key and value');
        return;
    }

    // Determine document ID
    const documentId = selectedDoc || newDocId;
    
    console.log('📝 Adding credential:', { folder, documentId, key, value });

    try {
        // Add to Firestore
        const docRef = db.collection("credentials").doc(folder).collection("data").doc(documentId);
        
        // Check if document exists
        const docSnapshot = await docRef.get();
        
        // Fixed: Use .exists as a property, not a method
        if (docSnapshot.exists) {
            // Update existing document
            await docRef.update({
                [key]: value
            });
            console.log('✅ Updated existing document');
        } else {
            // Create new document
            await docRef.set({
                [key]: value
            });
            console.log('✅ Created new document');
        }

        alert('✅ Credential added successfully!');
        
        // Close modal and refresh if the folder is currently displayed
        closeModal();
        
        // Refresh the current view if it matches the added folder
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
            <table><thead><tr><th>Credential ID</th><th>Details</th></tr></thead><tbody>`;

        snapshot.forEach(doc => {
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
        const testQuery = await db.collection('credentials').limit(1).get();
        console.log('✅ Database connection test successful');
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    }
}