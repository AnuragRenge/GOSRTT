const form = document.getElementById("enquiryForm");
const submitBtn = document.getElementById("submitBtn");
const statusMsg = document.getElementById("statusMsg");
const toastEl = document.getElementById("toast");
const fullNameEl = document.getElementById("fullName");
const phoneEl = document.getElementById("mobilePhone");
const emailEl = document.getElementById("email");
const consentChk = document.getElementById("consentChk");

let toastTimer = null;


function setStatus(text, type) {
  statusMsg.textContent = text;
  statusMsg.classList.remove("error", "success");
  if (type) statusMsg.classList.add(type);
}

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3800);
}


function cleanPhone(raw) {
  return String(raw || "").replace(/\D/g, "");
}

function updateSubmitState() {
  submitBtn.disabled = !consentChk.checked;
}

consentChk.addEventListener("change", updateSubmitState);
updateSubmitState();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  if (!consentChk.checked) {
    setStatus("Please accept the consent to submit the enquiry.", "error");
    return;
  }

  // Basic client validation
  const name = fullNameEl.value.trim();
  const phone = cleanPhone(phoneEl.value);
  const email = emailEl.value.trim();

  if (name.length < 2) {
    setStatus("Please enter your full name.", "error");
    fullNameEl.focus();
    return;
  }
  if (phone.length != 10) {
    setStatus("Please enter a valid 10 digit mobile number.", "error");
    phoneEl.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    setStatus("Please enter a valid email address.", "error");
    emailEl.focus();
    return;
  } 
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    const res = await fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ name, phone, email }),
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      setStatus("Failed to submit enquiry. Please try again.", "error");
      console.error("API error:", res.status, payload);
      return;
    }
    form.reset();
    updateSubmitState();
    setStatus("");
    showToast("Enquiry Submitted Successfully. We will connect with you shortly.");
    fullNameEl.focus();
  } catch (err) {
    setStatus("Error while submitting enquiry.", "error");
    console.error(err);
  } finally {
    submitBtn.textContent = "Submit";
    updateSubmitState();
  }
});

