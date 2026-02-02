// script.js — Deeper Than Skin Relaunch (GitHub Pages friendly)
//
// Features:
// - Countdown (LOCKED: March 10, 2026 @ 10:00 AM ET)
// - Launch date label + status badge
// - Footer year
// - Contrast toggle (data-contrast="high") with localStorage persistence
// - Reveal-on-scroll (.reveal -> .in)
// - Early access form handling (SmashPro public waitlist endpoint + mailto fallback)
// - Honeypot support (#company)

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  // NOTE: March 10, 2026 10:00 AM Eastern Time.
  // DST is in effect by then, so -04:00 is correct.
  const LAUNCH_DATE_ISO = "2026-03-03T22:00:00-04:00";

  // SmashPro public waitlist endpoint (NO API KEY REQUIRED)
  const WAITLIST_ENDPOINT =
    "https://smashpro.app/api/v1/index.php?path=public/waitlist";

  // Used by the waitlist allowlist server-side
  const APP_SLUG = "deeper-than-skin";

  // Tracking/source string stored in DB (spd_waitlist.source)
  const SOURCE_TAG = "dts-relaunch";

  const CONTACT_EMAIL = "info@deeperthanskin.store";
  const MAILTO_SUBJECT = "Deeper Than Skin – Early Access";

  // Incentive copy (used in toast + mailto body)
  const INCENTIVE_LINE =
    "Bonus: Join the list for a chance to RSVP for our launch pop-up + early access perks.";

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

  const pad2 = (n) => String(n).padStart(2, "0");
  const safeText = (el, txt) => {
    if (el) el.textContent = String(txt);
  };

  // Run after DOM is ready (safer for GitHub Pages + any partial loads)
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
      : "rgba(255,120,120,.25)";
    els.toast.style.background = ok
      ? "rgba(125,224,192,.06)"
      : "rgba(255,120,120,.06)";
    els.toast.style.color = ok
      ? "rgba(255,255,255,.85)"
      : "rgba(255,200,200,.92)";
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

  // =========================
  // INIT
  // =========================
  onReady(() => {
    // Footer year
    safeText(els.year, new Date().getFullYear());

    // =========================
    // CONTRAST TOGGLE
    // =========================
    const STORAGE_KEY = "dts_contrast";

    function setButtonState(isHigh) {
      if (!els.themeToggle) return;
      els.themeToggle.setAttribute("aria-pressed", String(isHigh));
      els.themeToggle.title = isHigh
        ? "Contrast: High (click to disable)"
        : "Contrast: Normal (click to enable)";
      const span = els.themeToggle.querySelector("span");
      if (span) span.textContent = isHigh ? "◑" : "◐";
    }

    function applyContrast(isHigh) {
      document.documentElement.toggleAttribute("data-contrast", isHigh);
      if (isHigh) {
        document.documentElement.setAttribute("data-contrast", "high");
      } else {
        document.documentElement.removeAttribute("data-contrast");
      }
      setButtonState(isHigh);
    }

    let savedMode = "normal";
    try {
      savedMode = localStorage.getItem(STORAGE_KEY) || "normal";
    } catch {}
    applyContrast(savedMode === "high");

    if (els.themeToggle) {
      els.themeToggle.type = "button";
      els.themeToggle.addEventListener("click", () => {
        const isHigh =
          document.documentElement.getAttribute("data-contrast") === "high";
        const nextHigh = !isHigh;
        applyContrast(nextHigh);
        try {
          localStorage.setItem(STORAGE_KEY, nextHigh ? "high" : "normal");
        } catch {}
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
        safeText(els.label, "Launch date TBD");
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
      safeText(els.label, "New experience begins March 10");
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
    // FORM SUBMIT (SmashPro Waitlist)
    // =========================
    async function submitToWaitlist(email) {
      const payload = {
        app_slug: APP_SLUG,
        email,
        source: SOURCE_TAG,
        consent: 1,
        landing_origin: window.location.href, // extra field is fine
        createdAt: new Date().toISOString(),  // extra field is fine
      };

      const res = await fetch(WAITLIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      // Try to parse JSON either way (your API returns JSON on errors)
      let data = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok || !data || data.ok !== true) {
        const msg =
          (data && (data.error || data.message)) ||
          `Request failed (${res.status})`;
        throw new Error(msg);
      }

      return data; // { ok:true, created:bool, app_slug:... }
    }

    function mailtoFallback(email) {
      const body =
        `Hi Deeper Than Skin team,%0D%0A%0D%0A` +
        `Please add me to the Early Access list for the wellness relaunch.%0D%0A%0D%0A` +
        `${encodeURIComponent(INCENTIVE_LINE)}%0D%0A%0D%0A` +
        `Email: ${encodeURIComponent(email)}%0D%0A%0D%0A` +
        `Source: ${encodeURIComponent(SOURCE_TAG)}%0D%0A%0D%0A` +
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

        const btn = els.form.querySelector('button[type="submit"]');
        const prevText = btn ? btn.textContent : "";
        if (btn) {
          btn.disabled = true;
          btn.textContent = "Adding...";
        }

        try {
          const result = await submitToWaitlist(email);

          // created=false means “already exists but updated”, still a win
          const line = result.created
            ? "You’re in."
            : "You’re already on the list (we refreshed your entry).";

          showToast(`${line} ${INCENTIVE_LINE}`, true);
          try { els.form.reset(); } catch {}
        } catch (err) {
          // If API fails for any reason, we offer the mailto parachute
          showToast(
            "Signup didn’t go through. We’ll open your email app as a fallback.",
            false
          );
          window.setTimeout(() => mailtoFallback(email), 400);
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.textContent = prevText || "Notify me";
          }
        }
      });
    }
  });
})();
