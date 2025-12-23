// ga-init.js
(function () {
  // 1) Create dataLayer + gtag queue (works even before gtag.js finishes loading)
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // 2) (Optional but recommended) Consent Mode default = denied until user gives consent
  // Keep it simple: only analytics_storage controlled by your checkbox
  gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    wait_for_update: 500
  }); // consent mode supports default and update commands [web:612]

  // 3) GA4 init
  gtag('js', new Date());
  gtag('config', 'G-2WPWKYJQVC');

  // 4) Small helper for event tracking (no PII)
  window.trackEvent = function (name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) {}
  }; // gtag('event', ...) is the standard GA4 event API [web:365]
})();
