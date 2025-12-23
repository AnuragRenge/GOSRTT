// UPDATED: GA4 helper (no PII)
function trackEvent(name, params) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params || {}); // GA4 event API [web:365]
  }
}
const form = document.getElementById('resetForm');
const statusMsg = document.getElementById('statusMsg');
const resetBtn = document.getElementById('resetBtn');

const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');
const toggleBtn = document.querySelector('.toggle-password');

// Extract token
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

// if (!token) {
//   statusMsg.textContent = 'Invalid or missing reset token.';
//   statusMsg.className = 'status error';
//   resetBtn.disabled = true;
// }

// Remove token from URL
window.history.replaceState({}, document.title, window.location.pathname);

trackEvent("reset_password_view", { page: window.location.pathname });
// Disable submit initially
resetBtn.disabled = true;

/* 👁 Toggle confirm password visibility */
toggleBtn.addEventListener('click', () => {
  confirmPassword.type = confirmPassword.type === 'password' ? 'text' : 'password';
  trackEvent("reset_password_toggle_visibility", { field: "confirmPassword" });
});

/* 🔐 Live password match check */
let lastMatchState = "empty";
function validatePasswords() {
  const p1 = newPassword.value;
  const p2 = confirmPassword.value;

  resetBtn.disabled = true;

  if (!p1 || !p2) {
    statusMsg.textContent = '';
    statusMsg.className = 'status';
    if (lastMatchState !== "empty") {
      lastMatchState = "empty";
      trackEvent("reset_password_match_state", { state: "empty" });
    }
    return;
  }

  if (p2.length < p1.length && p1.startsWith(p2)) {
    statusMsg.textContent = 'So far so good…';
    statusMsg.className = 'status progress';
    if (lastMatchState !== "progress") {
      lastMatchState = "progress";
      trackEvent("reset_password_match_state", { state: "progress" });
    }
    return;
  }

  if (p1 === p2) {
    statusMsg.textContent = 'Passwords matched';
    statusMsg.className = 'status success';
    resetBtn.disabled = false;
    if (lastMatchState !== "matched") {
      lastMatchState = "matched";
      trackEvent("reset_password_match_state", { state: "matched" });
    } 
  } else {
    statusMsg.textContent = 'Passwords do not match';
    statusMsg.className = 'status error';
    if (lastMatchState !== "mismatch") {
      lastMatchState = "mismatch";
      trackEvent("reset_password_match_state", { state: "mismatch" });
    }
  }
}

newPassword.addEventListener('input', validatePasswords);
confirmPassword.addEventListener('input', validatePasswords);

/* 🔁 Submit handler*/
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  trackEvent("reset_password_submit_attempt", { page: window.location.pathname });
  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: decodeURIComponent(token),
        newPassword: newPassword.value
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Reset failed');

    statusMsg.textContent = 'Password reset successful. You may now log in.';
    statusMsg.className = 'status success';
    form.reset();
    resetBtn.disabled = true;
    trackEvent("reset_password_submit_success", { page: window.location.pathname });
  } catch (err) {
    statusMsg.textContent = err.message;
    statusMsg.className = 'status error';
    trackEvent("reset_password_submit_fail", { message: String(err?.message || err) });
  }
});
