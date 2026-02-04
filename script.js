// script.js — Deeper Than Skin Relaunch (FULL DROP-IN, production-ready, GitHub Pages friendly)
//
// Features:
// - Countdown (March 03, 2026 @ 10:00 PM ET)
// - Launch date label + status badge
// - Footer year
// - Contrast toggle (data-contrast="high") with localStorage persistence
// - Reveal-on-scroll (.reveal -> .in)
// - Early access form -> SmashPro public waitlist endpoint
// - Email Service fallback (server-sent email) + optional mailto fallback
// - Honeypot support (#company)
// - Waitlist counter
// - Owner CSV download (PIN via QUERY PARAM to avoid CORS preflight)
//
// Notes:
// - Requests use Content-Type: text/plain to reduce CORS preflight issues.
// - No API keys live in this repo. Email is sent server-side.
// - IMPORTANT FIX: CSV download now uses ?pin=#### (no custom headers) to avoid OPTIONS 500 on shared hosting.

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const LAUNCH_DATE_ISO = "2026-03-03T22:00:00-05:00";

  const WAITLIST_ENDPOINT =
    "https://smashpro.app/api/v1/index.php?path=public/waitlist";

  const WAITLIST_COUNT_ENDPOINT =
    "https://smashpro.app/api/v1/index.php?path=public/waitlist/count";

  const WAITLIST_CSV_ENDPOINT =
    "https://smashpro.app/api/v1/index.php?path=public/waitlist/csv";

  // server-side email fallback endpoint (NO secrets in JS)
  const EMAIL_SERVICE_ENDPOINT =
    "https://smashpro.app/api/v1/index.php?path=public/contact";

  const APP_SLUG = "deeper-than-skin";
  const SOURCE_TAG = "dts-relaunch";

  const CONTACT_EMAIL = "info@deeperthanskin.store";
  const MAILTO_SUBJECT = "Deeper Than Skin – Early Access";

  // Optional: display label passed to API (server may ignore)
  const FROM_NAME = "Deeper Than Skin";

  // Fallback behavior:
  // - "service": try server email service only (recommended)
  // - "mailto": open mail app on failure
  // - "both": try service, then mailto if service fails
  const FALLBACK_MODE = "service";

  // If true, mailto will open automatically (only applies if FALLBACK_MODE includes mailto)
  const AUTO_OPEN_MAIL_FALLBACK = false;

  // =========================
  // COPY
  // =========================
  const COPY = {
    incentive:
      "Bonus: Join the list for a chance to RSVP for our launch pop-up and early access perks.",
    success:
      "You’re on the list ✅ Keep an eye on your inbox for updates.",
    successWithConfirm:
      "You’re on the list ✅ Check your inbox for a quick confirmation.",
    alreadyOnList:
      "You’re already on the list ✅ We’ll keep you posted.",
    invalidEmail:
      "Please enter a valid email address.",
    genericError:
      "We couldn’t add you right now. Please try again.",
    fallbackQueued:
      "We received your request ✅ Check your inbox for a confirmation.",
    fallbackFailed:
      "We couldn’t submit your request automatically. You can still join by email.",
    ownerPrompt:
      "Owner tools: enter access code to download the CSV:",
    ownerShort:
      "That code doesn’t look quite right.",
    csvEmpty:
      "No data returned. Please try again.",
    csvOk:
      "Download started 🔒",
    csvDenied:
      "Access denied. Check your access code and try again.",
  };

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
    waitlistCount: $("waitlistCount"),
    csvBtn: $("csvBtn"),
  };

  const pad2 = (n) => String(n).padStart(2, "0");
  const safeText = (el, txt) => { if (el) el.textContent = String(txt); };

  const onReady = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  function showToast(message, ok = true) {
    if (!els.toast) return;
    els.toast.style.display = "block";
    els.toast.textContent = message;

    els.toast.style.borderColor = ok
      ? "rgba(125,224,192,.25)"
      : "rgba(255,160,160,.22)";
    els.toast.style.background = ok
      ? "rgba(125,224,192,.06)"
      : "rgba(255,120,120,.06)";
    els.toast.style.color = ok
      ? "rgba(255,255,255,.88)"
      : "rgba(255,225,225,.94)";
  }

  function hideToast() {
    if (!els.toast) return;
    els.toast.style.display = "none";
    els.toast.textContent = "";
  }

  function prettyLocalDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "TBD";
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    } catch {
      return d.toLocaleString();
    }
  }

  async function safeReadJson(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) {
      const text = await res.text().catch(() => "");
      return { _text: text };
    }
    return await res.json().catch(() => ({}));
  }

  function compactText(s, max = 140) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    return t.length > max ? t.slice(0, max) + "…" : t;
  }

  function isValidEmail(email) {
    const e = String(email || "").trim();
    if (e.length < 6) return false;
    if (!e.includes("@")) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  // =========================
  // WAITLIST COUNT
  // =========================
  async function loadWaitlistCount() {
    if (!els.waitlistCount) return;
    safeText(els.waitlistCount, "—");

    try {
      const url = new URL(WAITLIST_COUNT_ENDPOINT);
      url.searchParams.set("app_slug", APP_SLUG);

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      const data = await safeReadJson(res);
      if (!res.ok || data.ok !== true) return;

      const n = Number(data.count);
      if (!Number.isFinite(n)) return;

      safeText(els.waitlistCount, n.toLocaleString());
    } catch {
      // silent
    }
  }

  // =========================
  // OWNER CSV DOWNLOAD (NO PREFLIGHT)
  // =========================
  // Shared-host fix:
  // - DO NOT send X-Owner-Password header from browser (triggers OPTIONS preflight)
  // - Use query param ?pin=#### instead and trigger download via navigation
  async function downloadCsvOwner() {
    const code = window.prompt(COPY.ownerPrompt, "");
    if (!code) return;

    const codeClean = String(code).trim();
    if (codeClean.length < 4) {
      showToast(COPY.ownerShort, false);
      return;
    }

    try {
      const url = new URL(WAITLIST_CSV_ENDPOINT);
      url.searchParams.set("app_slug", APP_SLUG);
      url.searchParams.set("pin", codeClean); // ✅ query param avoids CORS preflight

      // Optional quick "auth check" without headers (still no preflight).
      // If server returns 401/403 JSON, show a toast and DO NOT navigate.
      // If it returns CSV, we proceed to download by navigation.
      //
      // NOTE: Some hosts may still block fetch for CSV; navigation is the most reliable.
      let canDownload = true;
      try {
        const probe = await fetch(url.toString(), { method: "GET" });
        if (!probe.ok) {
          const data = await safeReadJson(probe);
          const msg =
            (data && (data.error || data.message)) ||
            `Access denied (${probe.status})`;
          showToast(compactText(msg) || COPY.csvDenied, false);
          canDownload = false;
        } else {
          // If it's CSV, we don't need to read it here; we'll navigate for a real download
          canDownload = true;
        }
      } catch {
        // If probe fails (some browsers/hosts), still attempt navigation
        canDownload = true;
      }

      if (!canDownload) return;

      showToast(COPY.csvOk, true);
      window.location.href = url.toString(); // ✅ starts download reliably
    } catch (e) {
      console.error("[csv] download error:", e);
      showToast("Download didn’t start. Please try again.", false);
    }
  }

  // =========================
  // WAITLIST SUBMIT
  // =========================
  async function submitToWaitlist(email, honey) {
    const payload = {
      app_slug: APP_SLUG,
      email,
      source: SOURCE_TAG,
      consent: 1,
      company: honey || "",
      from_name: FROM_NAME, // optional
    };

    const res = await fetch(WAITLIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await safeReadJson(res);

    if (!res.ok || !data || data.ok !== true) {
      const detail =
        (data && (data.error || data.message)) ||
        (data && data._text ? compactText(data._text) : "") ||
        `Request failed (${res.status})`;
      throw new Error(detail);
    }

    return data; // { ok:true, created:bool, email_sent?:bool }
  }

  // =========================
  // EMAIL SERVICE FALLBACK (server-side)
  // =========================
  async function submitToEmailService(email) {
    const payload = {
      app_slug: APP_SLUG,
      source: SOURCE_TAG,
      email,
      from_name: FROM_NAME,
      intent: "early_access",
      subject: MAILTO_SUBJECT,
      message: `Please add me to the Deeper Than Skin early access list. Source: ${SOURCE_TAG}.`,
    };

    const res = await fetch(EMAIL_SERVICE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await safeReadJson(res);

    if (!res.ok || !data || data.ok !== true) {
      const detail =
        (data && (data.error || data.message)) ||
        (data && data._text ? compactText(data._text) : "") ||
        `Email service failed (${res.status})`;
      throw new Error(detail);
    }

    return data;
  }

  // =========================
  // MAILTO FALLBACK (optional)
  // =========================
  function buildMailto(email) {
    const bodyRaw =
      `Hi Deeper Than Skin team,\n\n` +
      `Please add me to the Early Access list for the relaunch.\n\n` +
      `${COPY.incentive}\n\n` +
      `Email: ${email}\n` +
      `Source: ${SOURCE_TAG}\n\n` +
      `Thank you.`;

    return (
      `mailto:${encodeURIComponent(CONTACT_EMAIL)}` +
      `?subject=${encodeURIComponent(MAILTO_SUBJECT)}` +
      `&body=${encodeURIComponent(bodyRaw)}`
    );
  }

  function openMailFallback(email) {
    window.location.href = buildMailto(email);
  }

  async function runFallback(email) {
    const mode = String(FALLBACK_MODE || "").toLowerCase();

    const tryService = mode === "service" || mode === "both";
    const tryMailto = mode === "mailto" || mode === "both";

    if (tryService) {
      try {
        await submitToEmailService(email);
        return { ok: true, via: "service" };
      } catch (e) {
        console.error("[fallback] email service error:", e);
      }
    }

    if (tryMailto) {
      if (AUTO_OPEN_MAIL_FALLBACK) {
        window.setTimeout(() => openMailFallback(email), 350);
      }
      return { ok: false, via: "mailto" };
    }

    return { ok: false, via: "none" };
  }

  // =========================
  // INIT
  // =========================
  onReady(() => {
    // Footer year
    safeText(els.year, new Date().getFullYear());

    // Load waitlist count
    loadWaitlistCount();

    // CSV button
    if (els.csvBtn) {
      els.csvBtn.type = "button";
      els.csvBtn.addEventListener("click", downloadCsvOwner);
    }

    // =========================
    // CONTRAST TOGGLE
    // =========================
    const STORAGE_KEY = "dts_contrast";

    function setButtonState(isHigh) {
      if (!els.themeToggle) return;
      els.themeToggle.setAttribute("aria-pressed", String(isHigh));
      els.themeToggle.title = isHigh ? "High contrast" : "Contrast";
      const span = els.themeToggle.querySelector("span");
      if (span) span.textContent = isHigh ? "◑" : "◐";
    }

    function applyContrast(isHigh) {
      if (isHigh) {
        document.documentElement.setAttribute("data-contrast", "high");
      } else {
        document.documentElement.removeAttribute("data-contrast");
      }
      setButtonState(isHigh);
    }

    let savedMode = "normal";
    try { savedMode = localStorage.getItem(STORAGE_KEY) || "normal"; } catch {}
    applyContrast(savedMode === "high");

    if (els.themeToggle) {
      els.themeToggle.type = "button";
      els.themeToggle.addEventListener("click", () => {
        const isHigh = document.documentElement.getAttribute("data-contrast") === "high";
        const nextHigh = !isHigh;
        applyContrast(nextHigh);
        try { localStorage.setItem(STORAGE_KEY, nextHigh ? "high" : "normal"); } catch {}
      });
    }

    // =========================
    // COUNTDOWN
    // =========================
    const targetMs = new Date(LAUNCH_DATE_ISO).getTime();
    safeText(els.pretty, prettyLocalDate(LAUNCH_DATE_ISO));

    function setCountdown(d, h, m, s) {
      safeText(els.dd, pad2(d));
      safeText(els.hh, pad2(h));
      safeText(els.mm, pad2(m));
      safeText(els.ss, pad2(s));
    }

    function tickCountdown() {
      if (!Number.isFinite(targetMs)) {
        setCountdown("--", "--", "--", "--");
        safeText(els.badge, "Coming Soon");
        safeText(els.label, "New experience coming soon");
        return;
      }

      const now = Date.now();
      const diff = targetMs - now;

      if (diff <= 0) {
        setCountdown(0, 0, 0, 0);
        safeText(els.badge, "Now Live");
        safeText(els.label, "We’re live. Welcome back.");
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;

      setCountdown(days, hours, mins, secs);
      safeText(els.badge, "Coming Soon");
      safeText(els.label, "New experience launches March 3");
    }

    tickCountdown();
    window.setInterval(tickCountdown, 1000);

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
        revealEls.forEach((el) => el.classList.add("in"));
      }
    }

    // =========================
    // FORM SUBMIT
    // =========================
    if (els.form) {
      els.form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        hideToast();

        const email = (els.email?.value || "").trim();
        const honey = (els.company?.value || "").trim();

        // Honeypot: if filled, quietly succeed
        if (honey) {
          showToast(COPY.success, true);
          try { els.form.reset(); } catch {}
          return;
        }

        if (!isValidEmail(email)) {
          showToast(COPY.invalidEmail, false);
          els.email?.focus?.();
          return;
        }

        const btn = els.form.querySelector('button[type="submit"]');
        const prevText = btn ? btn.textContent : "";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Adding…";
        }
        els.form.setAttribute("aria-busy", "true");

        try {
          const result = await submitToWaitlist(email, honey);

          const created = !!result.created;
          const emailSent =
            typeof result.email_sent === "boolean" ? result.email_sent : null;

          const lead = created ? COPY.success : COPY.alreadyOnList;
          const confirmLine = emailSent === true ? COPY.successWithConfirm : lead;

          showToast(`${confirmLine} ${COPY.incentive}`, true);
          try { els.form.reset(); } catch {}
          loadWaitlistCount();
        } catch (err) {
          console.error("[waitlist] submit error:", err);

          // Try server-side email service fallback
          const fb = await runFallback(email);

          if (fb.ok && fb.via === "service") {
            showToast(`${COPY.fallbackQueued} ${COPY.incentive}`, true);
            try { els.form.reset(); } catch {}
            return;
          }

          // Optional mailto guidance
          if (
            !AUTO_OPEN_MAIL_FALLBACK &&
            (String(FALLBACK_MODE).toLowerCase() === "mailto" ||
              String(FALLBACK_MODE).toLowerCase() === "both")
          ) {
            showToast(COPY.fallbackFailed, false);
            console.info("[fallback] mailto link:", buildMailto(email));
          } else {
            showToast(COPY.fallbackFailed, false);
          }
        } finally {
          els.form.removeAttribute("aria-busy");
          if (btn) {
            btn.disabled = false;
            btn.textContent = prevText || "Notify me";
          }
        }
      });
    }
  });
})();
