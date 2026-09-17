document.getElementById("year").textContent = new Date().getFullYear();

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

if (isIOS) {
  document.querySelectorAll(".map").forEach((link) => {
    link.href = "https://maps.apple.com/?address=7224+Eckhert+Rd%2C+San+Antonio%2C+TX+78238";
  });
}

// Sticky header background once scrolled
const hd = document.getElementById("hd");
addEventListener("scroll", () => hd.classList.toggle("scrolled", scrollY > 10), { passive: true });

// Mobile nav
const hamb = document.getElementById("hamb");
const mob = document.getElementById("mobnav");
hamb.addEventListener("click", () => {
  const open = mob.classList.toggle("open");
  hamb.setAttribute("aria-expanded", String(open));
});
mob.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    mob.classList.remove("open");
    hamb.setAttribute("aria-expanded", "false");
  })
);

// Phone FAB — call/text popover
const phoneFabBtn = document.getElementById("phoneFabBtn");
const phoneFabMenu = document.getElementById("phoneFabMenu");
phoneFabBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const open = phoneFabMenu.classList.toggle("open");
  phoneFabBtn.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (!phoneFabMenu.classList.contains("open")) return;
  if (e.target === phoneFabBtn || phoneFabMenu.contains(e.target)) return;
  phoneFabMenu.classList.remove("open");
  phoneFabBtn.setAttribute("aria-expanded", "false");
});

// Reveal-on-scroll
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Lineup lightbox + scroll dots
const carImgs = [...document.querySelectorAll(".car img")];
const cars = carImgs.map((i) => i.src);
const alts = carImgs.map((i) => i.alt);
const lb = document.getElementById("lb");
const lbimg = document.getElementById("lbimg");
let cur = 0;

const openLb = (i) => {
  cur = i;
  lbimg.src = cars[i];
  lbimg.alt = alts[i];
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
};
const closeLb = () => {
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
};
const goLb = (d) => {
  cur = (cur + d + cars.length) % cars.length;
  lbimg.src = cars[cur];
  lbimg.alt = alts[cur];
};

document.querySelectorAll(".car").forEach((c) => {
  c.addEventListener("click", () => openLb(+c.dataset.i));
  c.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openLb(+c.dataset.i);
    }
  });
});
document.getElementById("lbx").onclick = closeLb;
document.getElementById("lbp").onclick = (e) => { e.stopPropagation(); goLb(-1); };
document.getElementById("lbn").onclick = (e) => { e.stopPropagation(); goLb(1); };
lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
addEventListener("keydown", (e) => {
  if (!lb.classList.contains("open")) return;
  if (e.key === "Escape") closeLb();
  if (e.key === "ArrowRight") goLb(1);
  if (e.key === "ArrowLeft") goLb(-1);
});

const rail = document.getElementById("rail");
const dots = document.getElementById("dots");
const carEls = [...document.querySelectorAll(".car")];
carEls.forEach((_, i) => {
  const b = document.createElement("button");
  if (!i) b.className = "on";
  b.setAttribute("aria-label", `Go to car ${i + 1}`);
  b.onclick = () => carEls[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  dots.appendChild(b);
});
const dotEls = [...dots.children];
rail.addEventListener(
  "scroll",
  () => {
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    carEls.forEach((el, i) => {
      const elCenter = el.offsetLeft + el.offsetWidth / 2;
      const dist = Math.abs(elCenter - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    dotEls.forEach((d, i) => d.classList.toggle("on", i === best));
  },
  { passive: true }
);

// Appointment form — posts to the real Cloudflare Pages Function
const form = document.getElementById("appointment-form");
const submitBtn = document.getElementById("submit-btn");
const successEl = document.getElementById("form-success");
const errorEl = document.getElementById("form-error");
const errorMessageEl = document.getElementById("form-error-message");
const DEFAULT_ERROR_MESSAGE = errorMessageEl.textContent;

const vroomVibrate = () => {
  if (!("vibrate" in navigator)) return;
  if (!window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
  navigator.vibrate([40, 30, 40, 30, 120]); // vroom, vroom, buzz
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  vroomVibrate();
  errorEl.hidden = true;

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Sending...";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());
  payload.botcheck = form.elements.botcheck.checked;

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (result.success) {
      form.hidden = true;
      successEl.hidden = false;
    } else {
      throw new Error(result.error || "Submission failed");
    }
  } catch (err) {
    errorMessageEl.textContent = err.message && err.message !== "Submission failed"
      ? err.message
      : DEFAULT_ERROR_MESSAGE;
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});
