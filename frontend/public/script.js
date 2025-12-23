// UPDATED: GA4 helpers (no PII)
function trackEvent(name, params) {
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params || {}); // GA4 event API [web:365]
  }
}
// UPDATED: Optional page_view helper
function trackPageView() {
  trackEvent("page_view", {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
  });
}

const form = document.getElementById("enquiryForm");
const submitBtn = document.getElementById("submitBtn");
const statusMsg = document.getElementById("statusMsg");
const toastEl = document.getElementById("toast");
const fullNameEl = document.getElementById("fullName");
const phoneEl = document.getElementById("mobilePhone");
const emailEl = document.getElementById("email");
const consentChk = document.getElementById("consentChk");

let toastTimer = null;

// UPDATED: Track page load + detect reload (best-effort)
window.addEventListener("load", () => {
  trackPageView();
  const nav = performance.getEntriesByType?.("navigation")?.[0];
  if (nav?.type === "reload") {
    trackEvent("page_reload", { page: window.location.pathname });
  }
});

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

// UPDATED: Consent change tracking + Consent Mode update
consentChk.addEventListener("change", () => {
  updateSubmitState();

  // Update consent for analytics cookies (basic Consent Mode)
  if (typeof window.gtag === "function") {
    window.gtag("consent", "update", {
      analytics_storage: consentChk.checked ? "granted" : "denied",
    }); // Consent Mode update [web:612]
  }

  trackEvent("consent_change", {
    analytics: consentChk.checked ? "granted" : "denied",
  });
});
updateSubmitState();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");
  // UPDATED: Track submit attempt
  trackEvent("lead_submit_attempt", { page: window.location.pathname });
  if (!consentChk.checked) {
    setStatus("Please accept the consent to submit the enquiry.", "error");
    // UPDATED: Track blocked submit
    trackEvent("lead_submit_blocked", { reason: "consent_unchecked" });
    return;
  }

  // Basic client validation
  const name = fullNameEl.value.trim();
  const phone = cleanPhone(phoneEl.value);
  const email = emailEl.value.trim();

  if (name.length < 2) {
    setStatus("Please enter your full name.", "error");
    // UPDATED: Track validation fail
    trackEvent("lead_submit_validation_fail", { field: "fullName" });
    fullNameEl.focus();
    return;
  }
  if (phone.length != 10) {
    setStatus("Please enter a valid 10 digit mobile number.", "error");
    // UPDATED: Track validation fail
    trackEvent("lead_submit_validation_fail", { field: "mobilePhone" });
    phoneEl.focus();
    return;
  }
  if (!email || !email.includes("@")) {
    setStatus("Please enter a valid email address.", "error");
    // UPDATED: Track validation fail
    trackEvent("lead_submit_validation_fail", { field: "email" });
    emailEl.focus();
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    // UPDATED: Track API request start (no PII)
    trackEvent("lead_submit_request", { endpoint: "/api/enquiry" });
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
    // UPDATED: Track success
    trackEvent("lead_submit_success", { page: window.location.pathname });
  } catch (err) {
    setStatus("Error while submitting enquiry.", "error");
    console.error(err);
    trackEvent("lead_submit_error", { message: String(err?.message || err) });
  } finally {
    submitBtn.textContent = "Submit";
    updateSubmitState();
  }
});
// UPDATED: Generic button click tracking (optional, safe)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  trackEvent("button_click", {
    id: btn.id || "(no-id)",
    text: (btn.innerText || "").trim().slice(0, 40),
    page: window.location.pathname,
  });
});

