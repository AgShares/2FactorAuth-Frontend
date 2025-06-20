// Firebase config is loaded from secure config file
console.log('🔧 Initializing Firebase...');

if (typeof window.firebaseConfig === 'undefined') {
    console.error('❌ Firebase config not found!');
    alert('❌ Firebase configuration missing. Please check firebase-config.js');
} else {
    console.log('✅ Firebase config loaded:', window.firebaseConfig);
}

try {
    firebase.initializeApp(window.firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    alert('❌ Firebase initialization failed: ' + error.message);
}

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
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('otpVerified');
            sessionStorage.removeItem('authTimestamp');

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

document.addEventListener('DOMContentLoaded', () => {
    addLogoutButton();

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

    setTimeout(testDatabaseConnection, 1000);
});

async function fetchCredentials(folder) {
    if (!db) {
        credentialsList.innerHTML = '<div class="error">❌ Database connection failed</div>';
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

    } catch (error) {
        credentialsList.innerHTML = `<div class="error">⚠️ Error loading credentials: ${error.message}</div>`;
    }
}

function changeCredential(folder, docId, key, currentValue) {
    const newValue = prompt(`✏️ Edit value for "${key}":`, currentValue);
    if (newValue !== null && newValue.trim() !== '') {
        db.collection("credentials").doc(folder).collection("data").doc(docId).update({
            [key]: newValue.trim()
        }).then(() => {
            alert('✅ Value updated successfully');
            fetchCredentials(folder);
        }).catch(err => {
            alert('❌ Update failed: ' + err.message);
        });
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
    try {
        await db.collection('credentials').limit(1).get();
        console.log('✅ Database connection test successful');
    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    }
}

// Run connection test when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testDatabaseConnection, 1000);
});