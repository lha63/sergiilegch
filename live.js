/* =====================================================================
   live.js — Сэргийлэгч "Live горим" (бодит цагийн backend давхарга)
   Firebase (compat) ашиглана. Энэ нь classic <script> тул app.js / data.js-ийн
   глобалуудыг (SCREENS, POST, ACTIONS, navigate, baseMap, toast, icon, UB…) шууд хуваалцана.

   >>> ТОХИРГОО: доорх FIREBASE_CONFIG-д ӨӨРИЙН Firebase project-ийн утгыг тавина.
       (LIVE-SETUP.md-ийг үзнэ үү). Хоосон бол UI ажиллана, гэхдээ realtime холбогдохгүй.
   ===================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDjpsn0pB1GFxiNIneC5Wovp-rPRbspii8",
  authDomain: "instagram-clone-c9abe.firebaseapp.com",
  projectId: "instagram-clone-c9abe",
  storageBucket: "instagram-clone-c9abe.firebasestorage.app",
  messagingSenderId: "460896415394",
  appId: "1:460896415394:web:ab322c3f18e95a0e16f1fb",
};

const LIVE = {
  configured: false, active: false,
  role: null, circleId: null, uid: null,
  name: null, initials: null, color: null,
  batt: null, watchId: null, _lastWrite: 0,
  unsubLoc: null, unsubSos: null, unsubTrip: null,
  markers: {}, locs: {}, trips: {}, dest: null, childDot: null,
  audioCtx: null, shownSos: {}, _authCbs: [],
};

let _db = null, _auth = null;

/* ---------- Firebase init + anonymous auth ---------- */
function liveInit() {
  if (!FIREBASE_CONFIG.projectId || typeof firebase === "undefined") { LIVE.configured = false; return; }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    _auth = firebase.auth();
    _db = firebase.firestore();
    LIVE.configured = true;
    _auth.onAuthStateChanged((u) => {
      if (!u) return;
      LIVE.uid = u.uid;
      liveRestore();
      const cbs = LIVE._authCbs; LIVE._authCbs = [];
      cbs.forEach((fn) => { try { fn(); } catch (e) {} });
    });
    _auth.signInAnonymously().catch((e) => console.warn("anon auth", e));
    if (navigator.getBattery) navigator.getBattery().then((b) => { LIVE.batt = Math.round(b.level * 100); }).catch(() => {});
  } catch (e) { console.warn("Firebase init", e); LIVE.configured = false; }
}

/* ---------- localStorage resume ---------- */
function liveSave() {
  localStorage.setItem("sgl_live", JSON.stringify({
    role: LIVE.role, circleId: LIVE.circleId, name: LIVE.name, initials: LIVE.initials, color: LIVE.color,
  }));
}
function liveLoad() { try { return JSON.parse(localStorage.getItem("sgl_live") || "null"); } catch { return null; } }
function liveRestore() {
  const s = liveLoad();
  if (!s || !s.circleId || LIVE.active) return;
  Object.assign(LIVE, { role: s.role, circleId: s.circleId, name: s.name, initials: s.initials, color: s.color, active: true });
  if (LIVE.role === "guardian") liveWatchSos();
}
function whenAuthReady(cb) { if (LIVE.uid) cb(); else LIVE._authCbs.push(cb); }

/* ---------- Audio (SOS дохио) ---------- */
function liveUnlockAudio() {
  try {
    if (!LIVE.audioCtx) LIVE.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (LIVE.audioCtx.state === "suspended") LIVE.audioCtx.resume();
  } catch (e) {}
}
function liveBeep() {
  try {
    liveUnlockAudio();
    const c = LIVE.audioCtx; if (!c) return;
    let t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "square"; o.frequency.value = i % 2 ? 988 : 660;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.start(t); o.stop(t + 0.34); t += 0.38;
    }
  } catch (e) {}
}

/* ---------- helpers ---------- */
const liveCode = () => String(Math.floor(1000 + Math.random() * 9000));
function liveColorFor(role) { return role === "child" ? "#DC2626" : "#2563EB"; }
function liveInitials(name) { return (name || "").trim().charAt(0).toUpperCase() || (LIVE.role === "child" ? "Х" : "А"); }
function liveDist(a, b, c, d) { // metres (haversine)
  const R = 6371000, r = Math.PI / 180;
  const dLat = (c - a) * r, dLng = (d - b) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const liveCfgWarn = () => LIVE.configured ? "" :
  `<div class="note-box" style="margin-bottom:var(--s4)">${icon("i-info")}<span><b>Firebase тохиргоо хийгээгүй.</b> <code>live.js</code> доторх FIREBASE_CONFIG-ийг бөглөнө үү (LIVE-SETUP.md). Одоогоор зөвхөн UI харагдана.</span></div>`;

/* ===================================================================
   SCREENS — Live горим
   =================================================================== */

/* Үндсэн нэвтрэх (роль сонгох) */
SCREENS.live = () => {
  const s = liveLoad();
  return `
    ${subhead("Шууд горим", "Бодит цагт: хүүхэд ↔ хэсгийн ахлагч")}
    ${liveCfgWarn()}
    ${s && s.circleId ? `
      <button class="btn btn--primary" data-action="liveResume" style="margin-bottom:var(--s4)">
        ${icon("i-shield-check")} Үргэлжлүүлэх (${s.role === "guardian" ? "Ахлагч" : "Хүүхэд"} • код ${s.circleId})
      </button>` : ""}
    <label class="live-label">Таны нэр</label>
    <input id="liveName" class="live-input" placeholder="Жишээ: Болор" autocomplete="off" />
    <div class="lead" style="margin:var(--s4) 0 var(--s2)">Та хэн бэ?</div>
    <button class="live-role" data-action="liveRole" data-r="guardian">
      <span class="live-role__icon tint-blue">${icon("i-users")}</span>
      <span><span class="live-role__t">Хэсгийн ахлагч / Эцэг эх</span><span class="live-role__s">Хүүхдийг амьд хянаж, SOS хүлээж авна</span></span>
      ${icon("i-chevron-right")}
    </button>
    <button class="live-role" data-action="liveRole" data-r="child">
      <span class="live-role__icon tint-red">${icon("i-heart")}</span>
      <span><span class="live-role__t">Хүүхэд</span><span class="live-role__s">Байршлаа хуваалцаж, SOS илгээнэ</span></span>
      ${icon("i-chevron-right")}
    </button>
  `;
};

/* Хүүхэд: кодоор холбогдох */
SCREENS.livePair = () => `
  ${subhead("Кодоор холбогдох", "Ахлагчаас авсан 4 оронтой кодоо оруул")}
  ${liveCfgWarn()}
  <input id="liveJoinCode" class="live-input live-input--code" inputmode="numeric" maxlength="4" placeholder="0000" />
  <button class="btn btn--primary" data-action="liveJoin" style="margin-top:var(--s4)">${icon("i-shield-check")} Холбогдох</button>
`;

/* Хүүхэд: байршил хуваалцах + SOS */
SCREENS.liveChild = () => `
  ${subhead("Хүүхдийн горим", "Ахлагч тань таныг хянаж байна")}
  <div class="card" style="margin-bottom:var(--s3);display:flex;align-items:center;gap:var(--s3)">
    <span class="avatar" style="background:${LIVE.color || "#DC2626"}">${LIVE.initials || "Х"}</span>
    <div><div class="row__title">${LIVE.name || "Хүүхэд"}</div><div class="row__sub">Тойрог: ${LIVE.circleId || "—"}</div></div>
    <span class="pill pill--safe" style="margin-left:auto" id="liveShareState">Идэвхгүй</span>
  </div>
  <div id="map" class="map" role="img" aria-label="Таны байршил"></div>
  <button class="btn btn--primary" id="liveShareBtn" data-action="liveShare" style="margin-top:var(--s4)">${icon("i-share")} Байршил хуваалцаж эхлэх</button>
  <button class="btn btn--ghost" id="liveTripBtn" data-action="liveTrip" style="margin-top:var(--s3)">${icon("i-locate")} Гэртээ хүртэл хяна</button>
  <button class="btn btn--danger" data-nav="sos" style="margin-top:var(--s3)">${icon("i-shield-alert")} SOS дуудлага</button>
  <div class="note-box" style="margin-top:var(--s4)">${icon("i-info")}<span>SOS дарвал ахлагчид таны байршилтай хамт <b>шууд</b> мэдэгдэнэ. Нууц SOS-ийг баруун доод товчоор ч дуудаж болно.</span></div>
`;
POST.liveChild = () => {
  const c = LIVE.lastPos || { lat: UB.lat, lng: UB.lng };
  const map = baseMap("map", { lat: c.lat, lng: c.lng, zoom: 15 });
  LIVE.childDot = L.circleMarker([c.lat, c.lng], { radius: 8, color: "#fff", weight: 2, fillColor: LIVE.color || "#DC2626", fillOpacity: 1 }).addTo(map).bindTooltip("Та");
  mapInstance = map;
  liveSyncShareUI();
};

/* Ахлагч: амьд хяналтын дэлгэц */
SCREENS.liveGuardian = () => `
  ${subhead("Хяналтын горим", "Тойрогт холбогдсон хүүхдүүд амьд харагдана")}
  <div class="card" style="margin-bottom:var(--s3);display:flex;align-items:center;gap:var(--s3)">
    <span class="row__icon tint-blue">${icon("i-shield-check","icon--sm")}</span>
    <div><div class="row__sub">Тойргийн код</div><div class="live-code-sm">${LIVE.circleId || "—"}</div></div>
    <button class="btn btn--ghost" data-action="liveShareCode" style="width:auto;margin-left:auto;min-height:38px;padding:8px 14px">${icon("i-share","icon--sm")} Код өгөх</button>
  </div>
  <div id="map" class="map map--tall" role="img" aria-label="Хүүхдүүдийн амьд байршил"></div>
  <div class="section-title">Гишүүд</div>
  <div class="list" id="liveRoster"><div class="row"><span class="row__sub">Хүүхэд холбогдохыг хүлээж байна…</span></div></div>
`;
POST.liveGuardian = () => {
  liveUnlockAudio();
  liveCleanupMap();
  const map = baseMap("map", { lat: UB.lat, lng: UB.lng, zoom: 13 });
  mapInstance = map; LIVE.markers = {};
  if (!LIVE.configured || !LIVE.circleId) return;
  whenAuthReady(() => {
  LIVE.unsubLoc = _db.collection(`circles/${LIVE.circleId}/locations`).onSnapshot((snap) => {
    snap.docChanges().forEach((ch) => {
      const m = ch.doc.data(); if (!m || m.lat == null) return;
      LIVE.locs[m.uid] = m;
      if (ch.type === "removed") { if (LIVE.markers[m.uid]) { map.removeLayer(LIVE.markers[m.uid]); delete LIVE.markers[m.uid]; } delete LIVE.locs[m.uid]; }
      else if (LIVE.markers[m.uid]) LIVE.markers[m.uid].setLatLng([m.lat, m.lng]);
      else if (m.role !== "guardian") LIVE.markers[m.uid] = L.circleMarker([m.lat, m.lng], { radius: 9, color: "#fff", weight: 2, fillColor: m.color || "#DC2626", fillOpacity: 1 }).addTo(map).bindTooltip(m.name || "");
    });
    const pts = Object.values(LIVE.markers).map((mk) => mk.getLatLng());
    if (pts.length) try { map.fitBounds(L.latLngBounds(pts).pad(0.5)); } catch (e) {}
    liveRenderRoster();
  });
  LIVE.unsubTrip = _db.collection(`circles/${LIVE.circleId}/trip`).onSnapshot((snap) => {
    snap.forEach((d) => { LIVE.trips[d.id] = d.data(); });
    liveRenderRoster();
  });
  });
};

function liveRenderRoster() {
  const el = document.getElementById("liveRoster"); if (!el) return;
  const kids = Object.values(LIVE.locs).filter((m) => m.role === "child");
  if (!kids.length) { el.innerHTML = `<div class="row"><span class="row__sub">Хүүхэд холбогдохыг хүлээж байна… Код: <b>${LIVE.circleId}</b></span></div>`; return; }
  el.innerHTML = kids.map((m) => {
    const tr = LIVE.trips[m.uid];
    const trip = tr && tr.active ? `<span class="pill pill--info">${icon("i-locate")} Замдаа</span>` : (tr && tr.arrived ? `<span class="pill pill--safe">${icon("i-shield-check")} Гэртээ хүрсэн</span>` : "");
    const batt = m.batt != null ? `${icon("i-battery", "icon--sm")} ${m.batt}%` : "";
    return `<div class="row">
      <span class="avatar" style="background:${m.color || "#DC2626"}">${m.initials || "Х"}</span>
      <span class="row__main"><span class="row__title">${m.name || "Хүүхэд"}</span>
      <span class="row__sub">Амьд • ${batt}</span></span>
      <span class="row__end" style="flex-direction:column;align-items:flex-end;gap:4px">
        <span class="pill pill--safe">Холбогдсон</span>${trip}</span>
    </div>`;
  }).join("");
}

/* ===================================================================
   ACTIONS — Live
   =================================================================== */
ACTIONS.liveRole = (e, el) => {
  liveUnlockAudio();
  const role = el.dataset.r;
  const nm = (document.getElementById("liveName")?.value || "").trim();
  LIVE.role = role; LIVE.name = nm || (role === "child" ? "Хүүхэд" : "Ахлагч");
  LIVE.initials = liveInitials(LIVE.name); LIVE.color = liveColorFor(role);
  if (role === "guardian") liveCreateCircle();
  else navigate("livePair");
};

function liveCreateCircle() {
  const code = liveCode();
  LIVE.circleId = code; LIVE.active = true; liveSave();
  if (LIVE.configured) {
    _db.doc(`circles/${code}`).set({
      code, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      members: { [LIVE.uid]: { role: "guardian", name: LIVE.name, initials: LIVE.initials, color: LIVE.color } },
    }, { merge: true }).catch((e) => toast("Алдаа: " + e.message, "i-alert"));
    liveWatchSos();
  }
  navigate("liveGuardian");
  toast(`Тойрог үүслээ — код: ${code}`, "i-shield-check");
}

ACTIONS.liveJoin = () => {
  const code = (document.getElementById("liveJoinCode")?.value || "").trim();
  if (code.length !== 4) return toast("4 оронтой код оруулна уу", "i-alert");
  LIVE.circleId = code; LIVE.active = true; liveSave();
  if (LIVE.configured) {
    _db.doc(`circles/${code}`).get().then((snap) => {
      if (!snap.exists) { toast("Ийм код олдсонгүй", "i-x"); LIVE.active = false; return; }
      _db.doc(`circles/${code}`).set({ members: { [LIVE.uid]: { role: "child", name: LIVE.name, initials: LIVE.initials, color: LIVE.color } } }, { merge: true });
      navigate("liveChild");
      toast("Холбогдлоо ✓", "i-shield-check");
    }).catch((e) => toast("Алдаа: " + e.message, "i-alert"));
  } else { navigate("liveChild"); }
};

ACTIONS.liveResume = () => {
  const s = liveLoad(); if (!s) return;
  Object.assign(LIVE, { role: s.role, circleId: s.circleId, name: s.name, initials: s.initials, color: s.color, active: true });
  if (LIVE.role === "guardian" && LIVE.configured) liveWatchSos();
  navigate(LIVE.role === "guardian" ? "liveGuardian" : "liveChild");
};

ACTIONS.liveShareCode = () => {
  const code = LIVE.circleId || "";
  if (navigator.share) navigator.share({ title: "Сэргийлэгч", text: `Намайг хянах код: ${code}` }).catch(() => {});
  else toast(`Код: ${code} — хүүхдэд өг`, "i-share");
};

/* Хүүхэд: байршил хуваалцах асаах/унтраах */
ACTIONS.liveShare = () => {
  if (LIVE.watchId != null) { liveStopSharing(); return; }
  liveStartSharing();
};
function liveStartSharing() {
  if (!("geolocation" in navigator)) return toast("Энэ төхөөрөмж байршил дэмжихгүй", "i-alert");
  LIVE.watchId = navigator.geolocation.watchPosition((pos) => {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    LIVE.lastPos = { lat, lng };
    if (LIVE.childDot) LIVE.childDot.setLatLng([lat, lng]);
    if (mapInstance && LIVE.childDot) try { mapInstance.panTo([lat, lng]); } catch (e) {}
    liveCheckArrival(lat, lng);
    const now = Date.now();
    if (now - LIVE._lastWrite < 3000) return; // throttle 3s
    LIVE._lastWrite = now;
    if (LIVE.configured && LIVE.circleId) {
      _db.doc(`circles/${LIVE.circleId}/locations/${LIVE.uid}`).set({
        uid: LIVE.uid, role: "child", name: LIVE.name, initials: LIVE.initials, color: LIVE.color,
        lat, lng, accuracy, batt: LIVE.batt, zone: "safe", updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    }
  }, (err) => toast("Байршил авах боломжгүй: " + err.message, "i-alert"),
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 });
  liveSyncShareUI();
  toast("Байршил хуваалцаж эхэллээ", "i-share");
}
function liveStopSharing() {
  if (LIVE.watchId != null) { navigator.geolocation.clearWatch(LIVE.watchId); LIVE.watchId = null; }
  liveSyncShareUI();
  toast("Байршил хуваалцахаа зогсоолоо", "i-x");
}
function liveSyncShareUI() {
  const on = LIVE.watchId != null;
  const st = document.getElementById("liveShareState"); if (st) { st.textContent = on ? "Хуваалцаж байна" : "Идэвхгүй"; st.className = "pill " + (on ? "pill--safe" : "pill--caution"); }
  const btn = document.getElementById("liveShareBtn");
  if (btn) { btn.innerHTML = `${icon("i-share")} ${on ? "Хуваалцахаа зогсоох" : "Байршил хуваалцаж эхлэх"}`; btn.classList.toggle("btn--danger", on); btn.classList.toggle("btn--primary", !on); }
}

/* Хүүхэд: гэртээ хүртэл хяна (trip) */
ACTIONS.liveTrip = () => {
  const tr = LIVE.trips[LIVE.uid];
  if (tr && tr.active) { liveTripArrive(); return; }
  if (LIVE.watchId == null) liveStartSharing();
  LIVE.trips[LIVE.uid] = { active: true };
  if (LIVE.configured) _db.doc(`circles/${LIVE.circleId}/trip/${LIVE.uid}`).set({ active: true, arrived: false, startedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  liveSyncTripUI();
  toast("Ахлагч тань аяллыг хянаж байна", "i-locate");
};
function liveTripArrive() {
  LIVE.trips[LIVE.uid] = { active: false, arrived: true };
  if (LIVE.configured) _db.doc(`circles/${LIVE.circleId}/trip/${LIVE.uid}`).set({ active: false, arrived: true, arrivedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  liveSyncTripUI();
  toast("Аюулгүй хүрсэн мэдэгдэл илгээгдлээ", "i-shield-check");
}
function liveCheckArrival() { /* geofence энэ MVP-д ОРОХГҮЙ — гараар "Аюулгүй хүрлээ" дарна */ }
function liveSyncTripUI() {
  const btn = document.getElementById("liveTripBtn"); if (!btn) return;
  const tr = LIVE.trips[LIVE.uid];
  btn.innerHTML = tr && tr.active ? `${icon("i-shield-check")} Аюулгүй хүрлээ` : `${icon("i-locate")} Гэртээ хүртэл хяна`;
}

/* ---------- SOS: бичих (хүүхэд) ---------- */
function liveSendSos(kind = "sos") {
  if (!LIVE.active || LIVE.role !== "child") return;
  const write = (lat, lng, acc) => {
    if (!LIVE.configured) return;
    _db.collection(`circles/${LIVE.circleId}/sos`).add({
      fromUid: LIVE.uid, fromName: LIVE.name, fromInitials: LIVE.initials, color: LIVE.color,
      lat: lat ?? null, lng: lng ?? null, accuracy: acc ?? null,
      kind, status: "active", createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  };
  if ("geolocation" in navigator)
    navigator.geolocation.getCurrentPosition((p) => write(p.coords.latitude, p.coords.longitude, p.coords.accuracy), () => write(), { enableHighAccuracy: true, timeout: 8000 });
  else write();
}

/* ---------- SOS: хүлээн авах (ахлагч) ---------- */
function liveWatchSos() {
  if (!LIVE.configured || !LIVE.circleId) return;
  whenAuthReady(() => {
  if (LIVE.unsubSos) LIVE.unsubSos();
  LIVE.unsubSos = _db.collection(`circles/${LIVE.circleId}/sos`).where("status", "==", "active").onSnapshot((snap) => {
    snap.docChanges().forEach((ch) => {
      if (ch.type === "added" && !LIVE.shownSos[ch.doc.id]) { LIVE.shownSos[ch.doc.id] = 1; showSosAlert(ch.doc.id, ch.doc.data()); }
      if (ch.type === "removed") document.querySelector(`.sos-alert[data-id="${ch.doc.id}"]`)?.remove();
    });
  });
  });
}

const SOS_KIND = { sos: "SOS дуудлага", discreet: "Нууц SOS", fall: "Уналт/осол" };
function showSosAlert(id, d) {
  document.querySelector(".sos-alert")?.remove();
  liveBeep(); navigator.vibrate?.([400, 200, 400, 200, 600]);
  const o = document.createElement("div");
  o.className = "sos-alert"; o.dataset.id = id; o.setAttribute("role", "alertdialog");
  o.innerHTML = `
    <div class="sos-alert__inner">
      <div class="rec-badge" style="margin:0 auto var(--s4)"><span class="rec-dot"></span> ЯАРАЛТАЙ</div>
      <span class="avatar" style="width:72px;height:72px;font-size:28px;margin:0 auto;background:${d.color || "#DC2626"}">${d.fromInitials || "!"}</span>
      <div class="sos-alert__name">${d.fromName || "Хүүхэд"}</div>
      <div class="sos-alert__kind">${SOS_KIND[d.kind] || "SOS"} • тусламж хэрэгтэй</div>
      ${d.lat != null ? `<div class="sos-alert__loc">${icon("i-pin", "icon--sm")} ${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}</div>` : ""}
      <button class="btn btn--ghost" data-sos-map style="margin-top:var(--s5)">${icon("i-map")} Газрын зураг дээр харах</button>
      <button class="btn btn--danger" data-sos-resolve style="margin-top:var(--s3)">${icon("i-check")} Хүлээн авлаа / Аюулгүй боллоо</button>
    </div>`;
  document.querySelector(".phone").appendChild(o);
  o.querySelector("[data-sos-resolve]").addEventListener("click", () => { liveResolveSos(id); o.remove(); });
  o.querySelector("[data-sos-map]").addEventListener("click", () => {
    o.remove(); navigate("liveGuardian");
    if (d.lat != null) setTimeout(() => { try { mapInstance.setView([d.lat, d.lng], 16); L.circleMarker([d.lat, d.lng], { radius: 12, color: "#fff", weight: 3, fillColor: "#DC2626", fillOpacity: 0.9 }).addTo(mapInstance); } catch (e) {} }, 500);
  });
}
function liveResolveSos(id) {
  if (LIVE.configured) _db.doc(`circles/${LIVE.circleId}/sos/${id}`).set({ status: "resolved", resolvedBy: LIVE.uid, resolvedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  toast("SOS шийдвэрлэгдлээ", "i-check");
}

/* ---------- Map listener cleanup (navigate-аас дуудагдана) ---------- */
function liveCleanupMap() {
  if (LIVE.unsubLoc) { LIVE.unsubLoc(); LIVE.unsubLoc = null; }
  if (LIVE.unsubTrip) { LIVE.unsubTrip(); LIVE.unsubTrip = null; }
  // SOS listener-ийг ҮЛДЭЭНЭ — mock дэлгэц үзэж байхад ч анхааруулга ирнэ
}

/* ---------- boot ---------- */
liveInit();

// app.js-ийн boot нь live.js-ээс өмнө ажилладаг тул #live зэрэг Live route-уудыг
// энд дахин шийдэж, шаардвал дахин navigate хийнэ.
(function liveBoot() {
  const h = (typeof BOOT_HASH !== "undefined" && BOOT_HASH) ? BOOT_HASH : (location.hash || "").slice(1);
  // Тодорхой дэлгэц рүү deep-link хийсэн бол түүнийг нээнэ
  if (h && h !== "home" && SCREENS[h]) { setTimeout(() => navigate(h), 0); return; }
  // Үгүй бол апп ШУУД ГОРИМ руу нээгдэнэ (холбогдсон бол хүүхэд/ахлагч дэлгэц)
  const s = liveLoad();
  if (s && s.circleId) {
    Object.assign(LIVE, { role: s.role, circleId: s.circleId, name: s.name, initials: s.initials, color: s.color, active: true });
    if (LIVE.role === "guardian") liveWatchSos();
    setTimeout(() => navigate(LIVE.role === "guardian" ? "liveGuardian" : "liveChild"), 0);
  } else {
    setTimeout(() => navigate("live"), 0);
  }
})();
