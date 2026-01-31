// script.js — Deeper Than Skin Relaunch (GitHub Pages friendly)
// Supports:
// - Countdown (March 10, 2026 @ 10:00 AM ET)
// - Launch date label + status badge
// - Footer year
// - Contrast toggle (data-contrast="high") with localStorage persistence
// - Reveal-on-scroll animations (.reveal -> .in)
// - Early access form handling (Formspree/Airtable/Supabase endpoint OR mailto fallback)
// - Basic bot honeypot support (#company)

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  // Locked launch: March 10, 2026 @ 10:00 AM ET (DST => -04:00)
  const LAUNCH_DATE_ISO = "2026-03-10T10:00:00-04:00";

  // Optional: set to a real endpoint (Formspree / Airtable / Supabase edge function)
  // Example Formspree: "https://formspree.io/f/xxxxxxx"
  const FORM_ENDPOINT = "";

  // Used for mailto fallback if FORM_ENDPOINT is blank
  const CONTACT_EMAIL = "info@deeperthanskin.store";
  const MAILTO_SUBJECT = "Deeper Than Skin – Early Access";

  // =========================
  // DOM HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);

  const els = {
    dd: $("dd"),
    hh: $("hh"),
    mm: $("mm"),
    ss: $("ss"),
    badge: $("statusBadge"),
    label: $("launchLabel"),
    pretty: $("launchDatePretty"),
    year: $("year"),
    themeToggle: $("themeToggle"),
    form: $("signupForm"),
    email: $("email"),
    company: $("company"),
    toast: $("toast"),
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function safeSetText(el, txt) {
    if (el) el.textContent = txt;
  }

  function showToast(message, ok = true) {
    const t = els.toast;
    if (!t) return;
    t.style.display = "block";
    t.textContent = message;

    // nice subtle success/error styling using inline styles (works with your existing CSS)
    t.style.borderColor = ok
      ? "rgba(125,224,192,.25)"
      : "rgba(255,120,120,.25)";
    t.style.background = ok
      ? "rgba(125,224,192,.06)"
      : "rgba(255,120,120,.06)";
    t.style.color = ok ? "rgba(255,255,255,.80)" : "rgba(255,200,200,.88)";
  }

  function hideToast() {
    const t = els.toast;
    if (!t) return;
    t.style.display = "none";
    t.textContent = "";
  }

  function prettyLocalDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    try {
      // Example: Tue, Mar 10, 2026, 10:00 AM
      const fmt = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return fmt.format(d);
    } catch {
      return d.toLocaleString();
    }
  }

  // =========================
  // FOOTER YEAR
  // =========================
  safeSetText(els.year, String(new Date().getFullYear()));

  // =========================
  // CONTRAST TOGGLE
  // =========================
  const STORAGE_KEY = "dts_contrast";
  function applyContrast(mode) {
    // mode: "high" | "normal"
    if (mode === "high") {
      document.documentElement.setAttribute("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
  }

  // Init contrast from storage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "high") applyContrast("high");
  } catch {
    // ignore
  }

  // Toggle contrast
  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", () => {
      const isHigh = document.documentElement.getAttribute("data-contrast") === "high";
      const next = isHigh ? "normal" : "high";
      applyContrast(next);
      try {
        localStorage.setItem(STORAGE_KEY, next === "high" ? "high" : "normal");
      } catch {
        // ignore
      }
    });
  }

  // =========================
  // COUNTDOWN
  // =========================
  const targetMs = new Date(LAUNCH_DATE_ISO).getTime();

  safeSetText(els.pretty, prettyLocalDate(LAUNCH_DATE_ISO));

  function setCountdown(d, h, m, s) {
    safeSetText(els.dd, pad2(d));
    safeSetText(els.hh, pad2(h));
    safeSetText(els.mm, pad2(m));
    safeSetText(els.ss, pad2(s));
  }

  function tickCountdown() {
    if (!Number.isFinite(targetMs)) {
      setCountdown("--", "--", "--", "--");
      safeSetText(els.badge, "Coming Soon");
      safeSetText(els.label, "Launch date TBD");
      return;
    }

    const now = Date.now();
    const diff = targetMs - now;

    if (diff <= 0) {
      setCountdown(0, 0, 0, 0);
      safeSetText(els.badge, "Now Live");
      safeSetText(els.label, "We’re live. Welcome back.");
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    setCountdown(days, hours, mins, secs);
    safeSetText(els.badge, "Coming Soon");
    safeSetText(els.label, "New experience begins soon");
  }

  tickCountdown();
  setInterval(tickCountdown, 1000);

  // =========================
  // REVEAL ON SCROLL
  // =========================
  const revealEls = Array.from(document.querySelectorAll(".reveal"));

  if (revealEls.length) {
    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("in"));
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("in");
              obs.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12 }
      );

      revealEls.forEach((el) => io.observe(el));
    } else {
      // fallback
      revealEls.forEach((el) => el.classList.add("in"));
    }
  }

  // =========================
  // FORM SUBMIT
  // =========================
  async function submitToEndpoint(email) {
    // If you’re using Formspree, this works as-is.
    // If your endpoint expects a different schema, update payload below.
    const payload = {
      email,
      source: "deeperthanskin-relaunch",
      intent: "early-access",
      launchDate: LAUNCH_DATE_ISO,
      createdAt: new Date().toISOString(),
    };

    const res = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Many providers return 200/201 even on success without JSON
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }
  }

  function mailtoFallback(email) {
    const body =
      `Hi Deeper Than Skin team,%0D%0A%0D%0A` +
      `Please add me to the Early Access list for the wellness relaunch.%0D%0A%0D%0A` +
      `Email: ${encodeURIComponent(email)}%0D%0A%0D%0A` +
      `Thanks!`;

    const url =
      `mailto:${encodeURIComponent(CONTACT_EMAIL)}` +
      `?subject=${encodeURIComponent(MAILTO_SUBJECT)}` +
      `&body=${body}`;

    window.location.href = url;
  }

  if (els.form) {
    els.form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      hideToast();

      const email = (els.email?.value || "").trim();
      const honey = (els.company?.value || "").trim();

      // Honeypot: if filled, silently "succeed"
      if (honey) {
        showToast("Thanks! You’re on the list.", true);
        try { els.form.reset(); } catch {}
        return;
      }

      if (!email || !email.includes("@")) {
        showToast("Please enter a valid email address.", false);
        els.email?.focus?.();
        return;
      }

      // Disable button while processing
      const btn = els.form.querySelector('button[type="submit"]');
      const prevText = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Adding...";
      }

      try {
        if (FORM_ENDPOINT) {
          await submitToEndpoint(email);
          showToast("You’re in. We’ll email you early access updates.", true);
          try { els.form.reset(); } catch {}
        } else {
          // No endpoint set: use mailto fallback so it still “works”
          showToast("Opening your email app to confirm signup…", true);
          mailtoFallback(email);
        }
      } catch (err) {
        showToast(
          "Signup didn’t go through. Try again or email us directly.",
          false
        );
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = prevText || "Notify me";
        }
      }
    });
  }

})();
