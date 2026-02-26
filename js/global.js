
// ================= AUTH MODALS (GLOBAL) =================

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

function openOtpModal() {
  const modal = document.getElementById("otpModal");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeOtpModal() {
  const modal = document.getElementById("otpModal");
  if (!modal) return;

  modal.classList.add("hidden");
  modal.classList.remove("flex");

  const otpInput = document.getElementById("otpCode");
  if (otpInput) otpInput.value = "";

  window.pendingEmail = null;
}

// ====================== AUTH GLOBAL ======================

const API_BASE_USER = "http://localhost:5000/api/users";

// 🔹 Get token
function getToken() {
  return localStorage.getItem("token");
}

// 🔹 Get user
function getUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  const user = JSON.parse(raw);

  // fallback name
  if (!user.name && user.email) {
    user.name = user.email.split("@")[0];
  }

  // fallback avatar (letter avatar)
  // fallback avatar (ONLY if avatar key truly missing)
  if (user.avatar === undefined || user.avatar === null) {
    const initials = user.name
      .split(" ")
      .map(w => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    user.avatar = `https://ui-avatars.com/api/?name=${initials}&background=8B5A2B&color=fff`;
  }

  return user;
}

// 🔹 Apply user to navbar
function applyUserToNavbar(user) {
  const guestBtn = document.getElementById("guest-profile-btn");
  const userImg  = document.getElementById("user-profile-img");

  if (!guestBtn || !userImg) return;

  if (user) {
    guestBtn.classList.add("hidden");
    userImg.classList.remove("hidden");
    userImg.src = user.avatar;
  } else {
    guestBtn.classList.remove("hidden");
    userImg.classList.add("hidden");
  }
}

// 🔹 Sync all UI placeholders
function syncUserUI() {
  const user = getUser();
  if (!user) return;

  document.querySelectorAll("[data-user-avatar]").forEach(el => {
    el.src = user.avatar;
  });

  document.querySelectorAll("[data-user-name]").forEach(el => {
    el.textContent = user.name;
  });

  document.querySelectorAll("[data-user-email]").forEach(el => {
    el.textContent = user.email;
  });
}

// 🔹 Restore login on page load (🔥 THIS FIXES GOOGLE LOGIN UI)
async function restoreSession() {
  const token = getToken();
  if (!token) {
    applyUserToNavbar(null);
    return;
  }

  try {
    const res = await fetch(`${API_BASE_USER}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      localStorage.clear();
      applyUserToNavbar(null);
      return;
    }

    const data = await res.json();
    localStorage.setItem("user", JSON.stringify(data.user));

    applyUserToNavbar(data.user);
    syncUserUI();

  } catch (err) {
    console.error("Session restore failed", err);
  }
}

// 🔹 Google login redirect
function loginWithGoogle() {
  window.location.href = "http://localhost:5000/api/auth/google";
}

// 🔹 Handle Google redirect token
// 🔹 Handle OAuth redirect (Google + Facebook)
(function handleOAuthRedirect() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (token) {
    localStorage.setItem("token", token);

    // ✅ IMPORTANT: immediately load user + update UI
    restoreSession();

    // clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
})();

syncUserUI();


// ---------- FACEBOOK LOGIN ----------
function loginWithFacebook() {
  // Redirect browser to backend Facebook auth route
  window.location.href = "http://localhost:5000/api/auth/facebook";
}

// 🔹 Run on every page
document.addEventListener("DOMContentLoaded", restoreSession);

/* ================= GLOBAL CONTACT & SOCIAL CONFIG ================= */
window.CONTACT_CONFIG = {
  brand: "Hirah Attar",

  address: "Akurana, Kandy, Sri Lanka",

  phone: "0701485736",           // for tel:
  displayPhone: "+94 70 148 5736",

  whatsapp: "94701485736",

  email: {
    support: "hamdhu047@gmail.com",
    sales: "hamdhu047@gmail.com"
  },

  hours: {
    weekdays: "Mon – Fri: 9:00 AM – 6:00 PM",
    saturday: "Sat: 9:00 AM – 4:00 PM"
  },

  social: {
    whatsapp: "https://wa.me/94701485736",
    facebook: "https://facebook.com/hirahattar",
    instagram: "https://instagram.com/hirahattar",
    tiktok: "https://www.tiktok.com/@hirahattar"
  }
};

// ================= WHATSAPP FLOAT BUTTON (TEMP) =================
// ================= WHATSAPP FLOAT BUTTON (DRAGGABLE) =================

// 🔹 TEMP WhatsApp number (change later from Admin Settings)
// ================= WHATSAPP FLOAT BUTTON (DRAGGABLE) =================

const WHATSAPP_NUMBER = "94763484825";

// 🔹 Pages where WhatsApp should NOT appear
function isAdminPage() {
  return window.location.pathname.includes("admin");
}

function createWhatsAppButton() {
  if (isAdminPage()) return;
  if (document.getElementById("whatsapp-float")) return;

  const btn = document.createElement("a");
  btn.id = "whatsapp-float";
  btn.href = `https://wa.me/${WHATSAPP_NUMBER}`;
  btn.target = "_blank";
  btn.rel = "noopener";

  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
          <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
        </svg>
  `;

  // Base styles
  btn.style.position = "fixed";
  btn.style.width = "56px";
  btn.style.height = "56px";
  btn.style.borderRadius = "50%";
  btn.style.background = "#25D366";
  btn.style.color = "#fff";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
  btn.style.zIndex = "999";
  btn.style.cursor = "pointer";
  btn.style.touchAction = "none";

  // Restore saved position
  const savedPos = JSON.parse(localStorage.getItem("whatsappPosition"));
  if (savedPos) {
    btn.style.left = savedPos.x + "px";
    btn.style.top = savedPos.y + "px";
  } else {
    btn.style.right = "24px";
    btn.style.bottom = "24px";
  }

  document.body.appendChild(btn);

  // ================= DRAG LOGIC =================
  let isDragging = false;
  let hasMoved = false;
  let startX, startY;

  const DRAG_THRESHOLD = 6;

  const startDrag = (e) => {
    isDragging = true;
    hasMoved = false;
    btn.style.opacity = "0.85";

    const rect = btn.getBoundingClientRect();
    startX = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    startY = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    e.preventDefault();
  };

  const onDrag = (e) => {
    if (!isDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - startX;
    const y = clientY - startY;

    if (Math.abs(x - btn.offsetLeft) > DRAG_THRESHOLD || Math.abs(y - btn.offsetTop) > DRAG_THRESHOLD) {
      hasMoved = true;
    }

    const maxX = window.innerWidth - btn.offsetWidth;
    const maxY = window.innerHeight - btn.offsetHeight;

    btn.style.left = Math.min(Math.max(0, x), maxX) + "px";
    btn.style.top = Math.min(Math.max(0, y), maxY) + "px";
    btn.style.right = "auto";
    btn.style.bottom = "auto";
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    btn.style.opacity = "1";

    localStorage.setItem("whatsappPosition", JSON.stringify({
      x: btn.offsetLeft,
      y: btn.offsetTop
    }));
  };

  // Prevent click if dragged
  btn.addEventListener("click", (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopImmediatePropagation();
      hasMoved = false;
    }
  });

  btn.addEventListener("mousedown", startDrag);
  btn.addEventListener("touchstart", startDrag, { passive: false });

  window.addEventListener("mousemove", onDrag);
  window.addEventListener("touchmove", onDrag, { passive: false });

  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);
}

document.addEventListener("DOMContentLoaded", createWhatsAppButton);