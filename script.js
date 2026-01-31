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

  // Storage key for contrast
  const CONTRAST_STORAGE_KEY = "dts_contrast";

  // =========================
  // HELPERS
  // =========================
  const $ = (id) => document.getElementById(id);

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function safeSetText(el, txt) {
    if (el) el.textContent = String(txt);
  }

  function canUseStorage() {
    try {
      const k = "__t";
      localStorage.setItem(k, "1");
      localStorage.removeItem(k);
      return true;
    } catch {
      return false;
    }
  }

  const HAS_STORAGE = canUseStorage();

  function showToast(els, message, ok = true) {
    const t = els.toast;
    if (!t) return;
    t.style.display = "block";
    t.textContent = message;

    t.style.borderColor = ok
      ? "rgba(125,224,192,.25)"
      : "rgba(255,120,120,.25)";
    t.style.background = ok
      ? "rgba(125,224,192,.06)"
      : "rgba(255,120,120,.06)";
    t.style.color = ok ? "rgba(255,255,255,.80)" : "rgba(255,200,200,.88)";
  }

  function hideToast(els) {
    const t = els.toast;
    if (!t) return;
    t.style.display = "none";
    t.textContent = "";
  }

  function prettyLocalDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    try {
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
  // CONTRAST
  // =========================
  function isHighContrast() {
    return document.documentElement.getAttribute("data-contrast") === "high";
  }

  function applyContrast(mode) {
    // mode: "high" | "normal"
    if (mode === "high") {
      document.documentElement.setAttribute("data-contrast", "high");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
  }

  function loadContrast() {
    if (!HAS_STORAGE) return "normal";
    const saved = localStorage.getItem(CONTRAST_STORAGE_KEY);
    return saved === "high" ? "high" : "normal";
  }

  function saveContrast(mode) {
    if (!HAS_STORAGE) return;
    localStorage.setItem(CONTRAST_STORAGE_KEY, mode === "high" ? "high" : "normal");
  }

  function syncToggleButton(btn) {
    if (!btn) return;
    const high = isHighContrast();
    btn.setAttribute("aria-pressed", high ? "true" : "false");
    btn.title = high ? "Contrast: High (click to disable)" : "Contrast: Normal (click to enable)";
  }

  function wireContrastToggle(btn) {
    if (!btn) return;

    // ensure button doesn’t accidentally submit forms (in case DOM changes later)
    if (!btn.getAttribute("type")) btn.setAttribute("type", "button");

    // Apply stored mode first
    const mode = loadContrast();
    applyContrast(mode);
    syncToggleButton(btn);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const next = isHighContrast() ? "normal" : "high";
      applyContrast(next);
      saveContrast(next);
      syncToggleButton(btn);
    });
  }

  // =========================
  // FORM
  // =========================
  async function submitToEndpoint(email) {
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

    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {}
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

  // =========================
  // MAIN (DOM READY)
  // =========================
  function init() {
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

    // Footer year
    safeSetText(els.year, String(new Date().getFullYear()));

    // Contrast toggle (fixed)
    wireContrastToggle(els.themeToggle);

    // Countdown
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
        safeSetText(els.badge, "Coming Soon");
        safeSetText(els.label, "Launch date TBD");
        setCountdown("--", "--", "--", "--");
        return;
      }

      const diff = targetMs - Date.now();

      if (diff <= 0) {
        safeSetText(els.badge, "Now Live");
        safeSetText(els.label, "We’re live. Welcome back.");
        setCountdown(0, 0, 0, 0);
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

    // Reveal on scroll
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
        revealEls.forEach((el) => el.classList.add("in"));
      }
    }

    // Form submit
    if (els.form) {
      els.form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        hideToast(els);

        const email = (els.email?.value || "").trim();
        const honey = (els.company?.value || "").trim();

        // Honeypot: if filled, silently "succeed"
        if (honey) {
          showToast(els, "Thanks! You’re on the list.", true);
          try { els.form.reset(); } catch {}
          return;
        }

        if (!email || !email.includes("@")) {
          showToast(els, "Please enter a valid email address.", false);
          els.email?.focus?.();
          return;
        }

        const btn = els.form.querySelector('button[type="submit"]');
        const prevText = btn ? btn.textContent : "";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Adding...";
        }

        try {
          if (FORM_ENDPOINT) {
            await submitToEndpoint(email);
            showToast(els, "You’re in. We’ll email you early access updates.", true);
            try { els.form.reset(); } catch {}
          } else {
            showToast(els, "Opening your email app to confirm signup…", true);
            mailtoFallback(email);
          }
        } catch {
          showToast(els, "Signup didn’t go through. Try again or email us directly.", false);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = prevText || "Notify me";
          }
        }
      });
    }
  }

  // DOM-ready guard (fixes toggle reliability)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
