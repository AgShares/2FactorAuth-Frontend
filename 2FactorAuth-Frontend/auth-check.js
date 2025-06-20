// Authentication check for viewFile.html
// This script should be included at the top of viewFile.html

function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated');
  const otpVerified = sessionStorage.getItem('otpVerified');
  const authTimestamp = sessionStorage.getItem('authTimestamp');
  
  // Check if user is authenticated and OTP is verified
  if (!isAuthenticated || !otpVerified || isAuthenticated !== 'true' || otpVerified !== 'true') {
    // Redirect to login page
    alert('⚠️ Access Denied: Please login first');
    window.location.href = 'index.html';
    return false;
  }
  
  // Optional: Check if authentication is still valid (24 hours)
  if (authTimestamp) {
    const currentTime = Date.now();
    const authTime = parseInt(authTimestamp);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (currentTime - authTime > sessionDuration) {
      // Session expired
      sessionStorage.removeItem('isAuthenticated');
      sessionStorage.removeItem('otpVerified');
      sessionStorage.removeItem('authTimestamp');
      alert('⚠️ Session Expired: Please login again');
      window.location.href = 'index.html';
      return false;
    }
  }
  
  return true;
}

// Check authentication immediately when script loads
if (!checkAuthentication()) {
  // Stop execution if not authenticated
  throw new Error('Authentication required');
}

// Optional: Periodically check authentication status
setInterval(() => {
  checkAuthentication();
}, 60000); // Check every minute

console.log('✅ Authentication verified - Access granted to viewFile.html');