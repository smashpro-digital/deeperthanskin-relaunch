// ---------------------------
// CONFIG (edit these)
// ---------------------------

// Set your launch date/time (America/New_York offset included):
// Example: March 15, 2026 10:00 AM ET => "2026-03-15T10:00:00-05:00"
const LAUNCH_DATE = "2026-03-15T10:00:00-05:00";

// Optional: Form endpoint. If blank, it will fall back to mailto.
// Formspree example: "https://formspree.io/f/xxxxxxx"
const FORM_ENDPOINT = "";

// ---------------------------
// Helpers
// ---------------------------
const $ = (id) => document.getElementById(id);

function pad2(n){ return String(n).padStart(2, "0"); }

function prettyDate(iso){
  try{
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit"
    });
    return fmt.format(d);
  } catch {
    return "TBD";
  }
}

function setToast(msg, ok=true){
  const t = $("toast");
  if (!t) return;
  t.style.display = "block";
  t.textContent = msg;
  t.style.borderColor = ok ? "rgba(125,224,192,.25)" : "rgba(255,120,120,.25)";
  t.style.background = ok ? "rgba(125,224,192,.06)" : "rgba(255,120,120,.06)";
}

// ---------------------------
// Countdown
// ---------------------------
const target = new Date(LAUNCH_DATE).getTime();
$("launchDatePretty").textContent = prettyDate(LAUNCH_DATE);

function tick(){
  const now = Date.now();
  let diff = target - now;

  const badge = $("statusBadge");
  const label = $("launchLabel");

  if (!Number.isFinite(diff)) {
    $("dd").textContent = "--";
    $("hh").textContent = "--";
    $("mm").textContent = "--";
    $("ss").textContent = "--";
    if (badge) badge.textContent = "Coming Soon";
    if (label) label.textContent = "Launch date TBD";
    return;
  }

  if (diff <= 0){
    $("dd").textContent = "00";
    $("hh").textContent = "00";
    $("mm").textContent = "00";
    $("ss").textContent = "00";
    if (badge) badge.textContent = "Now Live";
    if (label) label.textContent = "We’re live. Welcome back.";
    return;
  }

  const sec = Math.floor(diff / 1000);
  const days = Math.floor(sec / (3600 * 24));
  const hours = Math.floor((sec % (3600 * 24)) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;

  $("dd").textContent = pad2(days);
  $("hh").textContent = pad2(hours);
  $("mm").textContent = pad2(mins);
  $("ss").textContent = pad2(secs);

  if (badge) badge.textContent = "Coming Soon";
  if (label) label.textContent = "New experience begins soon";
}

tick();
setInterval(tick, 1000);

// ---------------------------
// Reveal on scroll
// ---------------------------
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if (e.isIntersecting) e.target.classList.add("in");
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => io.observe(el));

// ---------------------------
// Contrast toggle
// ---------------------------
const themeToggle = $("themeToggle");
const saved = localStorage.getItem("contrast") || "";
if (saved) document.documentElement.setAttribute("data-contrast", saved);

themeToggle?.addEventListener("click", ()=>{
  const current = document.documentElement.getAttribute("data-contrast");
  const next = current === "high" ? "" : "high";
  if (next) document.documentElement.setAttribute("data-contrast", next);
  else document.documentElement.removeAttribute("data-contrast");
  localStorage.setItem("contrast", next);
});

// ---------------------------
// Signup form
// ---------------------------
$("year").textContent = String(new Date().getFullYear());

const form = $("signupForm");
form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = $("email").value.trim();

  if (!email){
    setToast("Please enter an email address.", false);
    return;
  }

  // If endpoint is set, POST to it
  if (FORM_ENDPOINT){
    try{
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, source: "deeperthanskin-relaunch" })
      });

      if (!res.ok) throw new Error("Request failed");
      setToast("You’re in. Early access updates will land here ✅");
      form.reset();
      return;
    } catch {
      setToast("Couldn’t submit right now. Try again or use contact email below.", false);
      return;
    }
  }

  // Fallback to mailto
  const subj = encodeURIComponent("Early Access: Deeper Than Skin Relaunch");
  const body = encodeURIComponent(`Please add me to the early access list.\n\nEmail: ${email}\n`);
  window.location.href = `mailto:info@deeperthanskin.store?subject=${subj}&body=${body}`;
});
