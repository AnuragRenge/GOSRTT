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

// Disable submit initially
resetBtn.disabled = true;

/* 👁 Toggle confirm password visibility */
toggleBtn.addEventListener('click', () => {
  confirmPassword.type =
    confirmPassword.type === 'password' ? 'text' : 'password';
});

/* 🔐 Live password match check */
function validatePasswords() {
  const p1 = newPassword.value;
  const p2 = confirmPassword.value;

  resetBtn.disabled = true;

  if (!p1 || !p2) {
    statusMsg.textContent = '';
    statusMsg.className = 'status';
    return;
  }

  if (p2.length < p1.length && p1.startsWith(p2)) {
    statusMsg.textContent = 'So far so good…';
    statusMsg.className = 'status progress';
    return;
  }

  if (p1 === p2) {
    statusMsg.textContent = 'Passwords matched';
    statusMsg.className = 'status success';
    resetBtn.disabled = false;
  } else {
    statusMsg.textContent = 'Passwords do not match';
    statusMsg.className = 'status error';
  }
}

newPassword.addEventListener('input', validatePasswords);
confirmPassword.addEventListener('input', validatePasswords);

/* 🔁 Submit handler (UNCHANGED logic) */
form.addEventListener('submit', async (e) => {
  e.preventDefault();

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

  } catch (err) {
    statusMsg.textContent = err.message;
    statusMsg.className = 'status error';
  }
});
