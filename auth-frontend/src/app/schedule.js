// Small helpers shared by the appointments, Today and client app screens.

// "YYYY-MM-DD" for a date in the browser's own time zone.
export const isoDay = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

// Date from "YYYY-MM-DD" at local midnight (new Date("2026-10-09") would be UTC).
export const fromIso = (s) => {
  const [y, m, d] = String(s).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

// Weeks start on Saturday (as in the clinic's week).
export const weekStart = (d) => addDays(d, -((new Date(d).getDay() + 1) % 7));

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "0:0").split(":").map(Number);
  return h * 60 + (m || 0);
};

export const fromMinutes = (n) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export const dayLabel = (d, lang, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  new Date(d).toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", opts);

// International digits for WhatsApp. Local Jordanian 07... numbers get 962 in front.
export function phoneDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("07") && d.length === 10) d = `962${d.slice(1)}`;
  return d;
}

// Opens WhatsApp with the message ready; the dietitian just presses send.
export function openWhatsApp(phone, text) {
  const digits = phoneDigits(phone);
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
}

export const money = (n, currency = "") => `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}${currency ? ` ${currency}` : ""}`;

export const clientAppUrl = (token) => `${window.location.origin}/m/${token}`;
export const bookingUrl = (slug) => `${window.location.origin}/book/${slug}`;
