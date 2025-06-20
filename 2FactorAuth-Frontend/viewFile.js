// Firebase config is loaded from secure config file
console.log('🔧 Initializing Firebase...');

// Check if Firebase config exists
if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found!');
    alert('❌ Firebase configuration missing. Please check firebase-config.js');
} else {
    console.log('✅ Firebase config loaded:', window.firebaseConfig);
}

// Initialize Firebase
try {
    firebase.initializeApp(window.firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    alert('❌ Firebase initialization failed: ' + error.message);
}

// Initialize Firestore
let db;
try {
    db = firebase.firestore();
    console.log('✅ Firestore initialized successfully');
} catch (error) {
    console.error('❌ Firestore initialization failed:', error);
    alert('❌ Firestore initialization failed: ' + error.message);
}

const credentialsList = document.getElementById("credentialsList");
const folderButtons = document.querySelectorAll(".folder-item");

// Add logout functionality to viewFile.html
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
        
        logoutBtn.addEventListener('click', () => {
            // Clear authentication
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('otpVerified');
            sessionStorage.removeItem('authTimestamp');
            
            // Call logout function from firebase-auth.js if available
            if (typeof logoutUser === 'function') {
                logoutUser();
            } else {
                alert('✅ Logged out successfully');
                window.location.href = 'index.html';
            }
        });
        
        header.appendChild(logoutBtn);
    }
}

// Call logout button function when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 DOM loaded, setting up page...');
    addLogoutButton();
    
    // Add animation delays to folder buttons
    const folderButtons = document.querySelectorAll(".folder-item");
    folderButtons.forEach((btn, index) => {
        btn.style.animationDelay = `${index * 0.1}s`;
        btn.classList.add('fade-in');
    });
    
    console.log('✅ Page setup complete');
});

// Add click event listeners to folder buttons
document.addEventListener('DOMContentLoaded', () => {
    const folderButtons = document.querySelectorAll(".folder-item");
    
    folderButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const folder = btn.getAttribute("data-folder");
            console.log('🔧 Folder button clicked:', folder);

            // Add active state animation
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);

            fetchCredentials(folder);
        });
    });
});

async function fetchCredentials(folder) {
    console.log('🔧 Fetching credentials for folder:', folder);
    
    // Check if db is initialized
    if (!db) {
        console.error('❌ Firestore not initialized');
        credentialsList.innerHTML = '<div class="error">❌ Database connection failed</div>';
        return;
    }
    
    credentialsList.innerHTML = '<div class="loading">Loading credentials...</div>';
    credentialsList.classList.add('show');

    try {
        console.log('🔧 Querying Firestore path:', `credentials/${folder}/data`);
        
        const snapshot = await db.collection("credentials").doc(folder).collection("data").get();
        
        console.log('✅ Firestore query successful');
        console.log('📊 Documents found:', snapshot.size);

        if (snapshot.empty) {
            console.log('⚠️ No documents found for folder:', folder);
            credentialsList.innerHTML = `
                <div class="credentials-table">
                    <div class="table-header">${folder} Credentials</div>
                    <div class="no-data">
                        No credentials found for this category
                    </div>
                </div>
            `;
            return;
        }

        let tableHTML = `
            <div class="credentials-table">
                <div class="table-header">${folder} Credentials</div>
                <table>
                    <thead>
                        <tr>
                            <th>Credential ID</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        snapshot.forEach(doc => {
            console.log('📄 Processing document:', doc.id, doc.data());
            const data = doc.data();
            let details = Object.entries(data)
                .map(([key, value]) =>
                    `<div class="credential-item">
                        <div class="credential-content">
                            <span class="credential-key">${key}:</span>
                            <span class="credential-value">${value}</span>
                        </div>
                        <button class="copy-btn" onclick="copyToClipboard('${value.toString().replace(/'/g, "\\'")}', this)">
                            📋 Copy
                        </button>
                    </div>`
                )
                .join('');

            tableHTML += `
                <tr>
                    <td><strong>${doc.id}</strong></td>
                    <td>${details}</td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        credentialsList.innerHTML = tableHTML;
        console.log('✅ Credentials displayed successfully');

    } catch (error) {
        console.error('❌ Error fetching credentials:', error);
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            stack: error.stack
        });
        
        credentialsList.innerHTML = `
            <div class="error">
                ⚠️ Error loading credentials: ${error.message}
                <br><small>Check console for details</small>
            </div>
        `;
    }
}

// Copy to clipboard functionality
async function copyToClipboard(text, button) {
    try {
        await navigator.clipboard.writeText(text);

        // Visual feedback
        const originalText = button.innerHTML;
        button.innerHTML = '✅ Copied!';
        button.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);

    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');

            // Visual feedback
            const originalText = button.innerHTML;
            button.innerHTML = '✅ Copied!';
            button.classList.add('copied');

            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);

        } catch (fallbackErr) {
            console.error('Copy failed:', fallbackErr);
            button.innerHTML = '❌ Failed';
            setTimeout(() => {
                button.innerHTML = '📋 Copy';
            }, 2000);
        }

        document.body.removeChild(textArea);
    }
}

// Modal functionality
document.addEventListener('DOMContentLoaded', () => {
    const addBtn = document.getElementById("addCredentialBtn");
    const modal = document.getElementById("credentialModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const form = document.getElementById("credentialForm");
    const folderSelect = document.getElementById("folderSelect");
    const docSelect = document.getElementById("docSelect");
    const newDocId = document.getElementById("newDocId");

    // Show modal on button click
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            modal.classList.remove("hidden");
            form.reset();
            docSelect.innerHTML = `<option value="">-- Create New Document --</option>`;
        });
    }

    // Close modal
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            modal.classList.add("hidden");
            form.reset();
        });
    }

    // Load existing documents when folder changes
    if (folderSelect) {
        folderSelect.addEventListener("change", async () => {
            const folder = folderSelect.value;
            docSelect.innerHTML = `<option value="">-- Create New Document --</option>`;
            if (!folder) return;

            try {
                const snapshot = await db.collection("credentials").doc(folder).collection("data").get();
                snapshot.forEach(doc => {
                    const option = document.createElement("option");
                    option.value = doc.id;
                    option.textContent = doc.id;
                    docSelect.appendChild(option);
                });
            } catch (err) {
                console.error('Error fetching documents:', err);
                alert("❌ Error fetching documents: " + err.message);
            }
        });
    }

    // Handle form submission
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const folder = folderSelect.value;
            const selectedDoc = docSelect.value;
            const customDoc = newDocId.value.trim();
            const key = document.getElementById("credKey").value.trim();
            const value = document.getElementById("credValue").value.trim();

            const docId = customDoc || selectedDoc;

            if (!folder || !docId || !key || !value) {
                alert("❌ Please fill all required fields.");
                return;
            }

            try {
                await db.collection("credentials").doc(folder).collection("data").doc(docId).set({
                    [key]: value
                }, { merge: true });

                modal.classList.add("hidden");
                form.reset();
                fetchCredentials(folder); // Refresh view
                alert(`✅ Field "${key}" added to "${docId}" in ${folder}`);
            } catch (err) {
                console.error('Error adding field:', err);
                alert("❌ Failed to add field: " + err.message);
            }
        });
    }
});

// Test database connection
async function testDatabaseConnection() {
    console.log('🔧 Testing database connection...');
    try {
        // Try to read from a test collection
        const testRef = db.collection('credentials').limit(1);
        const snapshot = await testRef.get();
        console.log('✅ Database connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
    }
}

// Run connection test when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testDatabaseConnection, 1000);
});