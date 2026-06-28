/* =====================================================================
   Сэргийлэгч — realtime давхарга (хүүхэд ↔ ахлагч)
   • Firebase Firestore: хос (pair) код дээр суурилсан өрөө
   • GPS хяналт: Capacitor (native) эсвэл navigator.geolocation (веб)
   • Дохио: чанга дуу (WebAudio) + чичиргээ + локал мэдэгдэл
   Firebase тохиргоо хийгээгүй бол апп демо горимоор асах ба RT.enabled=false.
   ===================================================================== */
(function () {
  "use strict";

  const cfg = window.FIREBASE_CONFIG || {};
  const CONFIGURED = !!(cfg.apiKey && cfg.projectId);

  const RT = {
    enabled: CONFIGURED, // тохиргоо хийгдсэн эсэх
    ready: false,        // auth амжилттай болсон эсэх
    uid: null,
    _db: null,
    _err: null,
  };

  /* ---------- Capacitor туслахууд ---------- */
  const cap = () => window.Capacitor;
  const isNative = () => !!(cap() && cap().isNativePlatform && cap().isNativePlatform());
  const plugin = (n) => (cap() && cap().Plugins ? cap().Plugins[n] : null);

  /* ---------- Firebase эхлүүлэх ---------- */
  RT.init = async function init() {
    if (!CONFIGURED) { RT.enabled = false; return false; }
    if (RT.ready) return true;
    if (typeof firebase === "undefined") {
      RT._err = "Firebase SDK ачаалагдсангүй (интернэт?)";
      RT.enabled = false;
      return false;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      RT._db = firebase.firestore();
      const cred = await firebase.auth().signInAnonymously();
      RT.uid = cred.user ? cred.user.uid : null;
      RT.ready = true;
      RT.enabled = true;
      return true;
    } catch (e) {
      console.error("[RT] init error", e);
      RT._err = (e && e.message) || String(e);
      RT.enabled = false;
      return false;
    }
  };

  const docRef = (code) => RT._db.collection("pairs").doc(String(code));
  const now = () => Date.now();

  /* ---------- Бичих үйлдлүүд ---------- */
  // Өрөөнд орох / presence тэмдэглэх
  RT.join = async function (code, role, name) {
    if (!RT.ready && !(await RT.init())) return false;
    const patch = { updatedAt: now() };
    patch[role] = { name: name || "", online: true, ts: now(), uid: RT.uid };
    await docRef(code).set(patch, { merge: true });
    return true;
  };

  RT.setPresence = async function (code, role, online) {
    if (!RT.ready) return;
    const patch = {};
    patch[role + ".online"] = !!online;
    patch[role + ".ts"] = now();
    try { await docRef(code).update(patch); } catch (e) {}
  };

  // Амьд байршил (Намайг гэртээ хүртэл хяна)
  RT.setTrip = async function (code, data) {
    if (!RT.ready) return;
    await docRef(code).set({
      trip: Object.assign({ ts: now() }, data),
      updatedAt: now(),
    }, { merge: true });
  };

  RT.stopTrip = async function (code) {
    if (!RT.ready) return;
    await docRef(code).set({ trip: { active: false, ts: now() }, updatedAt: now() }, { merge: true });
  };

  // SOS яаралтай дохио
  RT.fireSOS = async function (code, loc) {
    if (!RT.ready) return;
    await docRef(code).set({
      sos: { active: true, lat: loc && loc.lat, lng: loc && loc.lng, ts: now() },
      updatedAt: now(),
    }, { merge: true });
  };

  RT.clearSOS = async function (code) {
    if (!RT.ready) return;
    await docRef(code).set({ sos: { active: false, ts: now() }, updatedAt: now() }, { merge: true });
  };

  // Аюулгүй хүрсэн баталгаа
  RT.arrived = async function (code, label) {
    if (!RT.ready) return;
    await docRef(code).set({
      arrival: { ts: now(), label: label || "Гэр" },
      trip: { active: false, ts: now() },
      updatedAt: now(),
    }, { merge: true });
  };

  /* ---------- Сонсох (subscribe) ---------- */
  RT.subscribe = function (code, cb) {
    if (!RT.ready) return function () {};
    return docRef(code).onSnapshot(
      (snap) => cb(snap.data() || {}),
      (err) => { console.error("[RT] snapshot error", err); }
    );
  };

  /* ---------- GPS хяналт (cross-platform) ---------- */
  RT.geo = {
    _watchId: null,
    async start(onPos, onErr) {
      // Native (Capacitor Geolocation plugin)
      const Geo = plugin("Geolocation");
      if (isNative() && Geo) {
        try { await Geo.requestPermissions(); } catch (e) {}
        try {
          const id = await Geo.watchPosition(
            { enableHighAccuracy: true, timeout: 20000 },
            (pos, err) => {
              if (err) { onErr && onErr(err); return; }
              if (pos && pos.coords) onPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
            }
          );
          this._watchId = { native: true, id };
          return;
        } catch (e) { onErr && onErr(e); }
        return;
      }
      // Веб / PWA
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (p) => onPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
          (e) => onErr && onErr(e),
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 }
        );
        this._watchId = { native: false, id };
        return;
      }
      onErr && onErr(new Error("Байршил тогтоох боломжгүй"));
    },
    async stop() {
      const w = this._watchId;
      if (!w) return;
      try {
        if (w.native) { const Geo = plugin("Geolocation"); Geo && Geo.clearWatch({ id: w.id }); }
        else navigator.geolocation.clearWatch(w.id);
      } catch (e) {}
      this._watchId = null;
    },
    // Нэг удаагийн байршил
    async once() {
      const Geo = plugin("Geolocation");
      if (isNative() && Geo) {
        try { await Geo.requestPermissions(); } catch (e) {}
        const pos = await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
        return { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
      }
      return new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error("no geo"));
        navigator.geolocation.getCurrentPosition(
          (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
          (e) => rej(e),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });
    },
  };

  /* ---------- Дохио: дуу + чичиргээ + мэдэгдэл ---------- */
  RT.notify = {
    _ctx: null,
    _alarmTimer: null,
    _ensureCtx() {
      if (!this._ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this._ctx = new AC();
      }
      if (this._ctx && this._ctx.state === "suspended") this._ctx.resume();
      return this._ctx;
    },
    _beep(freq, dur) {
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur + 0.02);
    },
    startAlarm() {
      this.stopAlarm();
      const cycle = () => { this._beep(880, 0.25); setTimeout(() => this._beep(1320, 0.25), 280); };
      cycle();
      this._alarmTimer = setInterval(cycle, 900);
      this.vibrate([400, 200, 400, 200, 600]);
    },
    stopAlarm() {
      if (this._alarmTimer) { clearInterval(this._alarmTimer); this._alarmTimer = null; }
    },
    vibrate(pattern) {
      try {
        const H = plugin("Haptics");
        if (isNative() && H) { H.vibrate({ duration: 600 }); return; }
        if (navigator.vibrate) navigator.vibrate(pattern || 400);
      } catch (e) {}
    },
    async push(title, body) {
      // Native локал мэдэгдэл
      const LN = plugin("LocalNotifications");
      if (isNative() && LN) {
        try {
          await LN.requestPermissions();
          await LN.schedule({
            notifications: [{
              id: Math.floor(Math.random() * 1e6),
              title, body,
              smallIcon: "ic_stat_icon", sound: null,
            }],
          });
          return;
        } catch (e) {}
      }
      // Веб мэдэгдэл
      try {
        if ("Notification" in window) {
          if (Notification.permission === "granted") new Notification(title, { body });
          else if (Notification.permission !== "denied") {
            const p = await Notification.requestPermission();
            if (p === "granted") new Notification(title, { body });
          }
        }
      } catch (e) {}
    },
    async requestPerms() {
      // Хэрэглэгчийн эхний gesture дээр зөвшөөрөл асууж бэлдэнэ
      const LN = plugin("LocalNotifications");
      if (isNative() && LN) { try { await LN.requestPermissions(); } catch (e) {} }
      else if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch (e) {}
      }
      this._ensureCtx(); // audio context-ийг gesture дотор сэрээнэ
    },
  };

  window.RT = RT;
})();
