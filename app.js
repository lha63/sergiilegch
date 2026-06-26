/* =====================================================================
   Сэргийлэгч — апп логик (router + screens + Leaflet). Зөвхөн демо.
   ===================================================================== */

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const screenEl = $("#screen");
const tabbar = $("#tabbar");

const icon = (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#${name}"/></svg>`;

const RISK_COLOR = { high: "#EF4444", medium: "#F59E0B", low: "#22C55E" };
const RISK_LABEL = { high: "Өндөр эрсдэл", medium: "Дунд эрсдэл", low: "Бага эрсдэл" };
const LEVEL_PILL = { danger: "pill--danger", caution: "pill--caution", safe: "pill--safe", info: "pill--info" };
const STATUS_CARD = { safe: "status-card--safe", caution: "status-card--caution", danger: "status-card--danger" };
const STATUS_ICON = { safe: "i-shield-check", caution: "i-shield-alert", danger: "i-alert" };

const scoreColor = (s) => (s >= 70 ? "var(--safe)" : s >= 55 ? "var(--caution)" : "var(--danger)");

/* ---------- Map lifecycle ---------- */
let mapInstance = null;
function destroyMap() {
  if (mapInstance) { mapInstance.remove(); mapInstance = null; }
}
function baseMap(id, center = UB) {
  const map = L.map(id, { zoomControl: false, attributionControl: false, keyboard: false }).setView([center.lat, center.lng], center.zoom);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd" }).addTo(map);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  // Leaflet нь эхлэхдээ screen-ийг гүйлгэдэг тул эхний ~1 сек гүйлгэлтийг түгжинэ
  const lock = () => { screenEl.scrollTop = 0; };
  screenEl.addEventListener("scroll", lock, { passive: true });
  setTimeout(() => map.invalidateSize(), 200);
  setTimeout(() => { map.invalidateSize(); screenEl.removeEventListener("scroll", lock); }, 1100);
  return map;
}
function userDot(map, lat = UB.lat, lng = UB.lng) {
  L.circleMarker([lat, lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#2563EB", fillOpacity: 1 })
    .addTo(map).bindTooltip("Таны байршил");
}

/* ---------- Toast ---------- */
function toast(msg, ic = "i-check") {
  $(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.innerHTML = `${icon(ic)}<span>${msg}</span>`;
  $(".phone").appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- Router ---------- */
const TAB_FOR = { home: "home", map: "map", risk: "map", sos: "sos", score: "score", profile: "profile" };

function navigate(route, param) {
  destroyMap();
  // stop any running timers from a previous screen
  clearInterval(watchTimer); watchTimer = null;
  clearTimeout(voiceTimer); voiceListening = false;
  clearInterval(window._sosT);
  clearInterval(window._recT);
  clearInterval(window._fallT);
  document.querySelector(".fakecall")?.remove();
  document.querySelector(".siren-ov")?.remove();
  document.querySelector(".sheet")?.remove();
  const fn = SCREENS[route];
  if (!fn) return;
  screenEl.innerHTML = `<div class="screen__inner">${fn(param)}</div>`;
  screenEl.scrollTop = 0;
  // active tab
  const tab = TAB_FOR[route];
  [...tabbar.querySelectorAll(".tab")].forEach((b) => b.classList.toggle("is-active", b.dataset.route === tab));
  // post-render hooks
  POST[route]?.(param);
  // Нууц SOS хөвөгч товчийг 'discreet' дэлгэцээс бусад үед харуулна
  const fab = document.getElementById("fabDiscreet");
  if (fab) fab.hidden = route === "discreet";
  state.route = route;
}
const state = { route: "home" };

/* Хөвөгч нууц SOS — аль ч горим дээр шууд дуудах */
document.getElementById("fabDiscreet").addEventListener("click", () => {
  const o = showSheet("Нууц тусламж — шууд", `
    <button class="btn btn--danger" data-d="silent">${icon("i-eye-off")} Чимээгүй SOS + бичлэг</button>
    <button class="btn btn--ghost" data-d="fake" style="margin-top:var(--s3)">${icon("i-phone")} Хуурамч дуудлага</button>
    <button class="btn btn--ghost" data-d="siren" style="margin-top:var(--s3)">${icon("i-siren")} Сирена</button>`);
  o.querySelector('[data-d="silent"]').addEventListener("click", () => { o.remove(); discreetActivated("Хурдан нууц SOS"); });
  o.querySelector('[data-d="fake"]').addEventListener("click", () => { o.remove(); showFakeCall(); });
  o.querySelector('[data-d="siren"]').addEventListener("click", () => { o.remove(); sirenStart(); });
});

/* ===================================================================
   SCREENS
   =================================================================== */
const SCREENS = {};
const POST = {};

/* ---------- Home ---------- */
SCREENS.home = () => {
  const s = CURRENT_STATUS;
  return `
    <p class="h-greet">Сайн уу,</p>
    <h1 class="h-name">${USER.name} 👋</h1>

    <section class="status-card ${STATUS_CARD[s.level]}" aria-label="Одоогийн аюулгүй байдлын төлөв">
      <div class="status-card__row">
        <div class="status-card__badge">${icon(STATUS_ICON[s.level])}</div>
        <div>
          <div class="status-card__label">${s.area} • Одоогийн төлөв</div>
          <div class="status-card__value">${s.title}</div>
        </div>
      </div>
      <p class="status-card__desc">${s.desc}</p>
      <div class="status-card__meta">
        <div>Хорооны оноо <b>${s.score}/100</b></div>
        <div>Идэвхтэй Guardian <b>${s.guardians}</b></div>
        <div>Гэр бүлийн тойрог <b>${FAMILY.length}</b></div>
      </div>
    </section>

    <div class="quick-row">
      ${QUICK_ACTIONS.map((q) => `
        <button class="quick" ${q.nav ? `data-nav="${q.nav}"` : `data-action="${q.action}"`} aria-label="${q.label}">
          <span class="quick__icon ${q.tint}">${icon(q.icon)}</span>
          <span class="quick__label">${q.label}</span>
        </button>`).join("")}
    </div>

    ${MODE_GROUPS.map((g) => `
      <div class="section-title">${g.title}</div>
      <div class="mode-grid">
        ${g.modes.map((m) => `
          <button class="mode-card" data-nav="${m.id}" aria-label="${m.title}">
            <span class="mode-card__icon ${m.tint}">${icon(m.icon)}</span>
            <span class="mode-card__title">${m.title}</span>
            <span class="mode-card__sub">${m.sub}</span>
          </button>`).join("")}
      </div>`).join("")}

    <div class="section-title">Сүүлийн үйл явдал</div>
    <div class="list">
      ${FEED.map((f) => `
        <div class="row" role="listitem">
          <span class="row__icon ${f.tint}">${icon(f.icon, "icon--sm")}</span>
          <span class="row__main">
            <span class="row__title">${f.title}</span>
            <span class="row__sub">${f.sub}</span>
          </span>
          <span class="row__end"><span class="row__sub">${f.time}</span></span>
        </div>`).join("")}
    </div>
  `;
};

/* ---------- Map / AI Risk (Горим 1) ---------- */
let riskTime = "night"; // day | night
SCREENS.map = () => `
  <div class="subhead">
    <div>
      <div class="subhead__title">AI эрсдэлийн зураг</div>
      <div class="subhead__sub">Бодит цагийн эрсдэлийн түвшин • Улаанбаатар</div>
    </div>
  </div>

  <div class="seg" role="group" aria-label="Цагийн төрөл" style="margin-bottom:var(--s3)">
    <button class="seg__btn ${riskTime === "day" ? "is-active" : ""}" data-action="riskTime" data-v="day">${icon("i-bulb", "icon--sm")} Өдөр</button>
    <button class="seg__btn ${riskTime === "night" ? "is-active" : ""}" data-action="riskTime" data-v="night">${icon("i-eye", "icon--sm")} Шөнө</button>
  </div>

  <div class="note-box" style="margin-bottom:var(--s4)">
    ${icon("i-alert")}
    <span>${riskTime === "night"
      ? `<b>Шөнийн анхааруулга:</b> "Их тойруу зүүн" замаар явахад эрсдэл өндөр байна.`
      : `<b>Өдрийн төлөв:</b> ихэнх бүсэд эрсдэл бага. Хүн хөдөлгөөн идэвхтэй.`}</span>
  </div>

  <div id="map" class="map map--tall" role="img" aria-label="Эрсдэлийн дулааны зураг"></div>
  <div class="map-legend">
    <span class="legend-item"><span class="legend-dot" style="background:#EF4444"></span> Өндөр эрсдэл</span>
    <span class="legend-item"><span class="legend-dot" style="background:#F59E0B"></span> Дунд эрсдэл</span>
    <span class="legend-item"><span class="legend-dot" style="background:#22C55E"></span> Бага эрсдэл</span>
    <span class="legend-item"><span class="legend-dot" style="background:#2563EB"></span> Таны байршил</span>
  </div>

  <div class="section-title">Эрсдэлтэй бүсүүд</div>
  <div class="list">
    ${RISK_ZONES.filter((z) => z.level !== "low").map((z) => `
      <div class="row">
        <span class="row__icon ${z.level === "high" ? "tint-red" : "tint-amber"}">${icon("i-pin", "icon--sm")}</span>
        <span class="row__main">
          <span class="row__title">${z.area}</span>
          <span class="row__sub">${z.reason}</span>
        </span>
        <span class="row__end"><span class="pill ${z.level === "high" ? "pill--danger" : "pill--caution"}">${RISK_LABEL[z.level]}</span></span>
      </div>`).join("")}
  </div>
`;
POST.map = () => {
  const map = baseMap("map");
  const night = riskTime === "night";
  const factor = night ? 1 : 0.55;
  const op = night ? 0.3 : 0.16;
  RISK_ZONES.forEach((z) => {
    L.circle([z.lat, z.lng], {
      radius: z.radius * factor, color: RISK_COLOR[z.level], weight: 1,
      fillColor: RISK_COLOR[z.level], fillOpacity: op,
    }).addTo(map).bindTooltip(`${z.area} — ${RISK_LABEL[z.level]}`);
  });
  userDot(map);
  mapInstance = map;
};

/* ---------- Safe route (Горим 2) ---------- */
let selectedRoute = "safe";
SCREENS.route = () => `
  ${subhead("Аюулгүй маршрут", "Хамгийн богино биш — хамгийн аюулгүй зам")}
  <div class="card stack" style="margin-bottom:var(--s4)">
    <div class="row" style="border:0;padding:0;background:none;min-height:auto">
      <span class="row__icon tint-green">${icon("i-locate","icon--sm")}</span>
      <span class="row__main"><span class="row__sub">Эхлэх</span><span class="row__title">Сансар, ХУД</span></span>
    </div>
    <div class="row" style="border:0;padding:0;background:none;min-height:auto">
      <span class="row__icon tint-red">${icon("i-pin","icon--sm")}</span>
      <span class="row__main"><span class="row__sub">Очих</span><span class="row__title">Сүхбаатарын талбай</span></span>
    </div>
  </div>

  <div id="map" class="map" role="img" aria-label="Маршрутын зураг"></div>

  <div class="section-title">Маршрутын сонголт</div>
  <div class="list" id="routeOpts">
    ${ROUTES.map((r) => routeRow(r)).join("")}
  </div>

  <div class="section-title">Алхам алхмын заавар</div>
  <div class="steps">
    ${ROUTE_STEPS.map((s, i) => `
      <div class="step">
        <div class="step__line"><span class="step__dot ${s.safe ? "step__dot--safe" : ""}">${i + 1}</span></div>
        <div class="step__body">
          <div class="row__title">${s.dir} · ${s.street}</div>
          <div class="row__sub">${s.dist} • ${icon("i-shield-check", "icon--sm")} ${s.note}</div>
        </div>
      </div>`).join("")}
  </div>

  <button class="btn btn--primary" data-action="startNav" style="margin-top:var(--s4)">
    ${icon("i-nav2")} Чиглүүлэлт эхлүүлэх
  </button>
  <button class="btn btn--ghost" data-action="routeShare" style="margin-top:var(--s3)">
    ${icon("i-share")} Маршрутаа хуваалцах
  </button>
`;
const routeRow = (r) => `
  <button class="row" data-route-pick="${r.id}" aria-pressed="${r.id === selectedRoute}"
    style="${r.id === selectedRoute ? "border-color:var(--accent);background:var(--surface-2)" : ""}">
    <span class="row__icon" style="background:${r.color}22;color:${r.color}">${icon("i-route","icon--sm")}</span>
    <span class="row__main">
      <span class="row__title">${r.name}</span>
      <span class="row__sub">${r.durationMin} мин • ${r.distanceKm} км • ${r.cameras} камер • Гэрэл: ${r.lit}</span>
    </span>
    <span class="row__end"><span class="pill ${r.score >= 80 ? "pill--safe" : r.score >= 60 ? "pill--caution" : "pill--danger"}">${r.score}</span></span>
  </button>`;
function drawRoute(map) {
  if (map._routeLayer) map.removeLayer(map._routeLayer);
  const r = ROUTES.find((x) => x.id === selectedRoute);
  const group = L.layerGroup();
  ROUTES.forEach((x) => {
    if (x.id !== selectedRoute)
      L.polyline(x.coords, { color: x.color, weight: 3, opacity: 0.25, dashArray: "4 6" }).addTo(group);
  });
  L.polyline(r.coords, { color: r.color, weight: 6, opacity: 0.95 }).addTo(group);
  const a = r.coords[0], b = r.coords[r.coords.length - 1];
  L.circleMarker(a, { radius: 6, color: "#fff", weight: 2, fillColor: "#22C55E", fillOpacity: 1 }).addTo(group);
  L.circleMarker(b, { radius: 6, color: "#fff", weight: 2, fillColor: "#EF4444", fillOpacity: 1 }).addTo(group);
  group.addTo(map);
  map._routeLayer = group;
  map.fitBounds(L.polyline(r.coords).getBounds(), { padding: [40, 40] });
}
POST.route = () => {
  const map = baseMap("map", { lat: 47.913, lng: 106.918, zoom: 14 });
  drawRoute(map);
  mapInstance = map;
};

/* ---------- Community Guardian (Горим 3) ---------- */
SCREENS.guardian = () => `
  ${subhead("Community Guardian", "Сайн дурын иргэд • Хэсгийн ахлагч • Цагдаа")}
  <div class="card" style="margin-bottom:var(--s4);text-align:center">
    <div class="score-big" style="color:var(--accent-hover)">${GUARDIANS.length}</div>
    <div class="row__sub">Таны 1.5 км дотор идэвхтэй туслах</div>
  </div>

  <div class="note-box" style="margin-bottom:var(--s4)">
    ${icon("i-info")}
    <span>SOS дарвал хамгийн ойрхон туслах нарт нэгэн зэрэг мэдэгдэнэ. Хариу өгөхгүй бол автоматаар цагдаа руу эскалаци хийнэ.</span>
  </div>

  <div class="section-title">Ойролцоох туслахууд</div>
  <div class="list">
    ${GUARDIANS.map((g) => `
      <div class="row">
        <span class="avatar" style="background:${g.color}">${g.initials}</span>
        <span class="row__main">
          <span class="row__title">${g.name}</span>
          <span class="row__sub">${g.role} • ${g.dist} м зайд</span>
        </span>
        <span class="row__end"><span class="pill ${g.status === "online" ? "pill--safe" : "pill--caution"}">${g.eta} мин</span></span>
      </div>`).join("")}
  </div>

  <button class="btn btn--danger" data-nav="sos" style="margin-top:var(--s5)">${icon("i-shield-alert")} SOS дуудлага илгээх</button>
`;

/* ---------- District safety score (Горим 4) ---------- */
SCREENS.score = () => `
  <div class="subhead">
    <div>
      <div class="subhead__title">Хорооны аюулгүй байдал</div>
      <div class="subhead__sub">Дүүрэг бүрийн харьцуулсан оноо</div>
    </div>
  </div>

  <div class="card" style="margin-bottom:var(--s4)">
    <div style="display:flex;align-items:flex-end;gap:var(--s3)">
      <span class="score-big" style="color:${scoreColor(DISTRICTS[1].score)}">${DISTRICTS[1].score}</span>
      <div style="padding-bottom:6px">
        <div class="row__title">${USER.khoroo}</div>
        <div class="row__sub">Таны байршлын оноо • 100-аас</div>
      </div>
      <span class="pill ${DISTRICTS[1].trend >= 0 ? "pill--safe" : "pill--danger"}" style="margin-left:auto;margin-bottom:8px">${DISTRICTS[1].trend >= 0 ? "▲" : "▼"} ${Math.abs(DISTRICTS[1].trend)}</span>
    </div>
    <div style="margin-top:var(--s4)">
      ${Object.entries(DISTRICTS[1].metrics).map(([k, v]) => `
        <div class="metric">
          <div class="metric__top"><span>${METRIC_LABELS[k].label}</span><b>${v}</b></div>
          <div class="meter"><div class="meter__fill" style="width:${v}%;background:${scoreColor(v)}"></div></div>
        </div>`).join("")}
    </div>
  </div>

  <div class="section-title">Дүүргүүдийн эрэмбэ</div>
  <div class="list">
    ${[...DISTRICTS].sort((a, b) => b.score - a.score).map((d, i) => `
      <button class="row" data-district="${d.short}">
        <span class="row__icon tint-slate" style="font-weight:800;color:var(--text-muted)">${i + 1}</span>
        <span class="row__main">
          <span class="row__title">${d.name}</span>
          <div class="meter" style="margin-top:6px"><div class="meter__fill" style="width:${d.score}%;background:${scoreColor(d.score)}"></div></div>
        </span>
        <span class="row__end">
          <b style="color:${scoreColor(d.score)};font-size:var(--fs-lg)">${d.score}</b>
          ${icon("i-chevron-right","icon--sm")}
        </span>
      </button>`).join("")}
  </div>
`;

/* ---------- Watch me home (Горим 5) ---------- */
SCREENS.watch = () => `
  ${subhead("Намайг гэртээ хүртэл хяна", "Аяллын явцыг итгэлт хүнтэй хуваалцана")}
  <div class="card stack">
    <div class="row" style="border:0;padding:0;background:none;min-height:auto">
      <span class="row__icon tint-cyan">${icon("i-pin","icon--sm")}</span>
      <span class="row__main"><span class="row__sub">Очих цэг</span><span class="row__title">Гэр — ХУД 11-р хороо</span></span>
    </div>
    <div class="row" style="border:0;padding:0;background:none;min-height:auto">
      <span class="row__icon tint-blue">${icon("i-user","icon--sm")}</span>
      <span class="row__main"><span class="row__sub">Хянах хүн</span><span class="row__title">Ээж • Г. Ганаа (Guardian)</span></span>
    </div>
  </div>

  <div id="map" class="map" style="height:180px;margin-bottom:var(--s2)" role="img" aria-label="Аяллын зам"></div>

  <div class="track-ring" style="position:relative">
    <svg class="track-svg" width="220" height="220" viewBox="0 0 220 220">
      <circle cx="110" cy="110" r="96" fill="none" stroke="var(--surface-3)" stroke-width="14"/>
      <circle id="trackArc" cx="110" cy="110" r="96" fill="none" stroke="var(--accent)" stroke-width="14"
        stroke-linecap="round" stroke-dasharray="603" stroke-dashoffset="603"/>
    </svg>
    <div class="track-center">
      <div class="t" id="trackTime">--:--</div>
      <div class="s" id="trackState">Аялал эхлээгүй</div>
    </div>
  </div>

  <div class="note-box" style="margin:var(--s2) 0 var(--s4)">
    ${icon("i-info")}
    <span>Тодорхой хугацаанд хөдөлгөөнгүй болвол эхлээд танаас асууж, хариу өгөхгүй бол автоматаар SOS илгээнэ.</span>
  </div>

  <button class="btn btn--primary" id="watchBtn" data-action="toggleWatch">${icon("i-share")} Аялал эхлүүлэх</button>
`;
let watchTimer = null, watchLeft = 0;
POST.watch = () => {
  watchLeft = 0;
  const start = [47.9060, 106.9180], home = [47.9165, 106.9080];
  const map = baseMap("map", { lat: 47.911, lng: 106.913, zoom: 14 });
  const line = [start, [47.9100, 106.9150], [47.9140, 106.9120], home];
  L.polyline(line, { color: "#06b6d4", weight: 5, opacity: 0.95 }).addTo(map);
  L.circleMarker(start, { radius: 6, color: "#fff", weight: 2, fillColor: "#2563EB", fillOpacity: 1 }).addTo(map).bindTooltip("Одоо энд");
  L.circleMarker(home, { radius: 6, color: "#fff", weight: 2, fillColor: "#22C55E", fillOpacity: 1 }).addTo(map).bindTooltip("Гэр");
  setTimeout(() => { map.invalidateSize(); map.fitBounds(L.polyline(line).getBounds(), { padding: [30, 30] }); screenEl.scrollTop = 0; }, 260);
  mapInstance = map;
};

/* ---------- Voice SOS (Горим 6) ---------- */
SCREENS.voice = () => `
  ${subhead("Дуу хоолойгоор SOS", "Утас гаргахгүйгээр түлхүүр үгээр дохио өгөх")}
  <div class="voice-wrap">
    <button class="voice-orb" id="voiceOrb" data-action="toggleVoice" aria-label="Сонсголыг асаах/унтраах">${icon("i-mic")}</button>
    <p class="lead" id="voiceState" style="margin-top:var(--s5);text-align:center">Идэвхжүүлэхийн тулд микрофон дээр дарна уу</p>
    <div class="keyword-chips" id="kwChips">
      <span class="chip">"Туслаарай"</span>
      <span class="chip">"SOS"</span>
      <span class="chip">"Аюултай байна"</span>
    </div>
  </div>
  <div class="note-box">
    ${icon("i-lock")}
    <span>Жинхэнэ хувилбарт дуу хоолойн таних нь <b>төхөөрөмж дээр (on-device)</b> ажиллана. Дохио идэвхжсэн үед л серверт илгээнэ — нууцлал хадгалагдана.</span>
  </div>
`;
let voiceListening = false, voiceTimer = null;

/* ---------- AI Camera analysis (Горим 7) ---------- */
SCREENS.camera = () => `
  ${subhead("AI камерын анализ", "Бичлэгээс эрсдэлтэй үйл явдлыг автоматаар илрүүлэх")}
  <div class="cam-grid" style="margin-bottom:var(--s4)">
    ${CAMERA_EVENTS.map((c) => `
      <div class="cam">
        <span class="cam__tag">${c.tag}</span>
        ${c.level !== "safe" ? `<span class="cam__live"><span class="dot"></span> LIVE</span>` : ""}
        <span class="cam__detect ${LEVEL_PILL[c.level]}">
          ${icon(c.level === "safe" ? "i-check" : "i-alert")} ${c.type}
        </span>
      </div>`).join("")}
  </div>

  <div class="section-title">Илрүүлэлтийн жагсаалт</div>
  <div class="list">
    ${CAMERA_EVENTS.map((c, i) => `
      <button class="row" data-cam="${i}">
        <span class="row__icon ${c.level === "danger" ? "tint-red" : c.level === "caution" ? "tint-amber" : "tint-green"}">${icon("i-video","icon--sm")}</span>
        <span class="row__main">
          <span class="row__title">${c.type}</span>
          <span class="row__sub">${c.loc} • ${c.time} • Итгэл: ${Math.round(c.conf * 100)}%</span>
        </span>
        <span class="row__end"><span class="pill ${LEVEL_PILL[c.level]}">${c.level === "danger" ? "Яаралтай" : c.level === "caution" ? "Шалгах" : "Хэвийн"}</span>${icon("i-chevron-right","icon--sm")}</span>
      </button>`).join("")}
  </div>

  <div class="note-box" style="margin-top:var(--s4)">
    ${icon("i-info")}
    <span>Илрүүлэлт бүрийг хүн баталгаажуулна (human-in-the-loop). Нүүр таних энэ хувилбарт <b>ороогүй</b>.</span>
  </div>
`;

/* ---------- Family Circle (Горим 8) ---------- */
const battColor = (b) => (b > 50 ? "var(--safe)" : b >= 20 ? "var(--caution)" : "var(--danger)");
SCREENS.family = () => `
  ${subhead("Гэр бүлийн тойрог", "Итгэлт хүмүүстэйгээ байршил хуваалцах")}
  <div id="map" class="map" role="img" aria-label="Гэр бүлийн байршлын зураг"></div>
  <div class="map-legend">
    ${FAMILY.map((m) => `<span class="legend-item"><span class="legend-dot" style="background:${m.color}"></span> ${m.name}</span>`).join("")}
  </div>

  <div class="section-title">Тойргийн гишүүд
    <button class="link" data-action="checkin">${icon("i-check", "icon--sm")} Би зүгээр</button>
  </div>
  <div class="list">
    ${FAMILY.map((m, i) => `
      <button class="row" data-member="${i}">
        <span class="avatar" style="background:${m.color}">${m.initials}</span>
        <span class="row__main">
          <span class="row__title">${m.name} <span style="color:var(--text-faint);font-weight:500">· ${m.rel}</span></span>
          <span class="row__sub">${m.place} • ${m.seen}</span>
        </span>
        <span class="row__end" style="flex-direction:column;align-items:flex-end;gap:3px">
          <span class="pill ${m.zone === "safe" ? "pill--safe" : "pill--caution"}">${m.zone === "safe" ? "Аюулгүй" : "Болгоомж"}</span>
          <span class="row__sub" style="color:${battColor(m.batt)}">${icon("i-battery", "icon--sm")} ${m.batt}%</span>
        </span>
      </button>`).join("")}
  </div>

  <div class="section-title">Тойргийн үйл явдал</div>
  <div class="list">
    ${CIRCLE_EVENTS.map((e) => `
      <div class="row">
        <span class="row__icon ${e.tint}">${icon(e.icon, "icon--sm")}</span>
        <span class="row__main"><span class="row__title">${e.title}</span><span class="row__sub">${e.sub}</span></span>
        <span class="row__end"><span class="row__sub">${e.time}</span></span>
      </div>`).join("")}
  </div>

  <button class="btn btn--primary" data-action="shareLoc" style="margin-top:var(--s4)">${icon("i-share")} Байршлаа хуваалцах</button>
`;
POST.family = () => {
  const map = baseMap("map", { lat: 47.917, lng: 106.92, zoom: 13 });
  const pts = [];
  FAMILY.forEach((m) => {
    L.circleMarker([m.lat, m.lng], { radius: 8, color: "#fff", weight: 2, fillColor: m.color, fillOpacity: 1 })
      .addTo(map).bindTooltip(`${m.name} — ${m.place}`);
    pts.push([m.lat, m.lng]);
  });
  userDot(map);
  pts.push([UB.lat, UB.lng]);
  setTimeout(() => { map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }); screenEl.scrollTop = 0; }, 260);
  mapInstance = map;
};

/* ---------- Discreet SOS + recording (Горим 9) ---------- */
SCREENS.discreet = () => `
  ${subhead("Нууц SOS + бичлэг", "Халдагч мэдэхгүйгээр тусламж дуудах")}
  <div class="note-box" style="margin-bottom:var(--s4)">
    ${icon("i-eye-off")}
    <span>Утсаа гаргахгүй, дэлгэц асаахгүйгээр нууцаар дохио өгнө. Идэвхжмэгц аудио/видео <b>автоматаар үүлэн рүү</b> бичигдэж, халдагч устгаж чадахгүй.</span>
  </div>

  <div class="section-title">Идэвхжүүлэх аргууд</div>
  <div class="list">
    ${DISCREET_TRIGGERS.map((t) => `
      <div class="row">
        <span class="row__icon ${t.tint}">${icon(t.icon, "icon--sm")}</span>
        <span class="row__main"><span class="row__title">${t.title}</span><span class="row__sub">${t.sub}</span></span>
      </div>`).join("")}
  </div>

  <button class="btn btn--danger" data-action="fakeCall" style="margin-top:var(--s4)">${icon("i-phone")} Хуурамч дуудлагаар туршиж үзэх</button>
  <button class="btn btn--ghost" data-action="discreetFire" style="margin-top:var(--s3)">${icon("i-radio")} Чимээгүй дохио (сэгсрэх)</button>
`;

/* ---------- Иргэдийн анхааруулга (Community feed) ---------- */
SCREENS.community = () => `
  ${subhead("Иргэдийн анхааруулга", "Бодит цагийн, баталгаажуулсан мэдээлэл")}
  <button class="btn btn--primary" data-action="report" style="margin-bottom:var(--s4)">${icon("i-megaphone")} Мэдээлэл өгөх</button>
  <div class="section-title">Ойролцоох мэдээлэл</div>
  <div class="stack">
    ${COMMUNITY.map((c) => `
      <div class="card">
        <div style="display:flex;align-items:center;gap:var(--s2)">
          <span class="pill ${LEVEL_PILL[c.level]}">${c.type}</span>
          <span class="row__sub" style="margin-left:auto">${c.time}</span>
        </div>
        <p style="margin:var(--s3) 0 var(--s3);font-size:var(--fs-sm)">${c.txt}</p>
        <div style="display:flex;align-items:center;gap:var(--s2)">
          <span class="row__sub">${icon("i-pin", "icon--sm")} ${c.area} · ${c.by}</span>
          <button class="pill pill--info" data-action="upvote" style="margin-left:auto;border:0;cursor:pointer">${icon("i-trending")} ${c.up}</button>
        </div>
      </div>`).join("")}
  </div>
`;

/* ---------- Аюулгүй цэгүүд (Safe havens) ---------- */
SCREENS.havens = () => `
  ${subhead("Аюулгүй цэгүүд", "Ойролцоох 24/7 найдвартай газрууд")}
  <div id="map" class="map" role="img" aria-label="Аюулгүй цэгийн зураг"></div>
  <div class="section-title">Ойролцоо эрэмбэлсэн</div>
  <div class="list">
    ${[...HAVENS].sort((a, b) => a.dist - b.dist).map((h) => `
      <button class="row" data-action="navHaven">
        <span class="row__icon" style="background:${h.color}22;color:${h.color}">${icon(h.icon, "icon--sm")}</span>
        <span class="row__main"><span class="row__title">${h.name}</span><span class="row__sub">${h.type} • ${h.open}</span></span>
        <span class="row__end"><span class="pill pill--safe">${h.dist} м</span>${icon("i-route", "icon--sm")}</span>
      </button>`).join("")}
  </div>
`;
POST.havens = () => {
  const map = baseMap("map", { lat: 47.916, lng: 106.917, zoom: 14 });
  const pts = [];
  HAVENS.forEach((h) => {
    L.circleMarker([h.lat, h.lng], { radius: 8, color: "#fff", weight: 2, fillColor: h.color, fillOpacity: 1 })
      .addTo(map).bindTooltip(`${h.name} (${h.open})`);
    pts.push([h.lat, h.lng]);
  });
  userDot(map);
  pts.push([UB.lat, UB.lng]);
  setTimeout(() => { map.invalidateSize(); map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] }); screenEl.scrollTop = 0; }, 260);
  mapInstance = map;
};

/* ---------- Эмнэлгийн SOS карт (Medical card) ---------- */
SCREENS.medical = () => {
  const m = MEDICAL;
  const block = (title, ic, items) => `
    <div class="card" style="margin-bottom:var(--s3)">
      <div class="med-row"><span class="row__icon tint-red">${icon(ic, "icon--sm")}</span><b>${title}</b></div>
      <div style="margin-top:var(--s2);display:flex;flex-wrap:wrap;gap:var(--s2)">
        ${items.map((x) => `<span class="chip">${x}</span>`).join("")}
      </div>
    </div>`;
  return `
    ${subhead("Эмнэлгийн SOS карт", "Яаралтай үед анхны тусламжид харагдана")}
    <div class="card status-card--danger" style="color:#fff;margin-bottom:var(--s4)">
      <div style="display:flex;align-items:center;gap:var(--s3)">
        <span class="avatar" style="width:54px;height:54px;background:rgba(255,255,255,0.18)">${icon("i-cross")}</span>
        <div><div style="font-size:var(--fs-lg);font-weight:800">${m.name}</div><div style="opacity:.9;font-size:var(--fs-sm)">${m.age} нас</div></div>
        <div style="margin-left:auto;text-align:right"><div style="font-size:var(--fs-xs);opacity:.85">Цусны бүлэг</div><div style="font-size:var(--fs-xl);font-weight:800">${m.blood}</div></div>
      </div>
    </div>
    ${block("Харшил", "i-alert", m.allergies)}
    ${block("Архаг өвчин", "i-activity", m.conditions)}
    ${block("Хэрэглэдэг эм", "i-pill", m.meds)}
    <div class="section-title">Яаралтай холбоо</div>
    <div class="list">
      ${m.contacts.map((c) => `
        <div class="row"><span class="row__icon tint-blue">${icon("i-user", "icon--sm")}</span>
        <span class="row__main"><span class="row__title">${c.name}</span><span class="row__sub">${c.phone}</span></span>
        <span class="row__end">${icon("i-phone", "icon--sm")}</span></div>`).join("")}
    </div>
    <div class="note-box" style="margin-top:var(--s4)">${icon("i-lock")}<span>Энэ картыг <b>түгжээтэй дэлгэцээс</b> анхны тусламжийн ажилтан харах боломжтой болгож тохируулна.</span></div>
  `;
};

/* ---------- Уналт/осол илрүүлэх (Fall detection) ---------- */
SCREENS.fall = () => {
  const f = FALL_SETTINGS;
  return `
    ${subhead("Уналт/осол илрүүлэх", "Хүчтэй цохилт мэдэрвэл автомат SOS")}
    <div class="card" style="margin-bottom:var(--s3)">
      <div class="med-row" style="justify-content:space-between">
        <span style="display:flex;align-items:center;gap:var(--s3)"><span class="row__icon tint-red">${icon("i-activity", "icon--sm")}</span><b>Илрүүлэлт идэвхтэй</b></span>
        <span class="switch is-on" data-action="toggleFall" role="switch" aria-checked="true"><span class="switch__dot"></span></span>
      </div>
    </div>
    <div class="card stack" style="margin-bottom:var(--s3)">
      <div class="metric__top"><span>Мэдрэг чанар</span><b>${f.sensitivity}</b></div>
      <div class="seg" role="group">
        ${["Бага", "Дунд", "Өндөр"].map((s) => `<button class="seg__btn ${s === f.sensitivity ? "is-active" : ""}" data-action="fallSens" data-v="${s}">${s}</button>`).join("")}
      </div>
      <div class="metric__top" style="margin-top:var(--s2)"><span>Автомат SOS хүртэлх хугацаа</span><b>${f.countdown} сек</b></div>
    </div>
    <div class="note-box" style="margin-bottom:var(--s4)">${icon("i-info")}<span>Утасны мэдрэгч (accelerometer)-ээр унах, мөргөлдөх зэрэг хүчтэй цохилтыг таньж, та хариу өгөхгүй бол автоматаар тусламж дуудна.</span></div>
    <button class="btn btn--danger" data-action="fallTest">${icon("i-activity")} Туршиж үзэх (уналт дуурайх)</button>
  `;
};

/* ---------- Дохиолол / Сирена (Siren) ---------- */
SCREENS.siren = () => `
  ${subhead("Дохиолол / Сирена", "Халдагчийг сатааруулж, анхаарал татна")}
  <div class="voice-wrap">
    <button class="voice-orb" style="background:radial-gradient(circle at 50% 40%, #fbbf24, #f59e0b)" data-action="sirenGo" aria-label="Сирена асаах">${icon("i-siren")}</button>
    <p class="lead" style="margin-top:var(--s5);text-align:center">Дарж чанга дуу + анивчдаг гэрэл асаана</p>
  </div>
  <div class="note-box">${icon("i-info")}<span>110 дБ хүртэл чанга дуугаар халдагчийг сатааруулж, эргэн тойрны хүмүүсийн анхаарлыг татна. Зэрэгцэн нууц дохио ч илгээж болно.</span></div>
`;

/* ---------- Дэлгэрэнгүй: Дүүргийн оноо ---------- */
SCREENS.district = (short) => {
  const d = DISTRICTS.find((x) => x.short === short) || DISTRICTS[0];
  const kh = (KHOROOS[d.short] || []).slice().sort((a, b) => b.s - a.s);
  return `
    ${subhead(d.name, "Дэлгэрэнгүй үнэлгээ")}
    <div class="card" style="margin-bottom:var(--s4)">
      <div style="display:flex;align-items:flex-end;gap:var(--s3)">
        <span class="score-big" style="color:${scoreColor(d.score)}">${d.score}</span>
        <div style="padding-bottom:6px"><div class="row__sub">Нэгдсэн оноо • 100-аас</div></div>
        <span class="pill ${d.trend >= 0 ? "pill--safe" : "pill--danger"}" style="margin-left:auto;margin-bottom:8px">${d.trend >= 0 ? "▲" : "▼"} ${Math.abs(d.trend)} сүүлийн сард</span>
      </div>
      <div style="margin-top:var(--s4)">
        ${Object.entries(d.metrics).map(([k, v]) => `
          <div class="metric"><div class="metric__top"><span>${METRIC_LABELS[k].label}</span><b>${v}</b></div>
          <div class="meter"><div class="meter__fill" style="width:${v}%;background:${scoreColor(v)}"></div></div></div>`).join("")}
      </div>
    </div>
    <div class="section-title">Хороод (онооор)</div>
    <div class="list">
      ${kh.map((k) => `
        <div class="row"><span class="row__icon tint-slate">${icon("i-pin", "icon--sm")}</span>
        <span class="row__main"><span class="row__title">${k.n}</span>
        <div class="meter" style="margin-top:6px"><div class="meter__fill" style="width:${k.s}%;background:${scoreColor(k.s)}"></div></div></span>
        <span class="row__end"><b style="color:${scoreColor(k.s)};font-size:var(--fs-lg)">${k.s}</b></span></div>`).join("")}
    </div>
  `;
};

/* ---------- Дэлгэрэнгүй: Камерын илрүүлэлт ---------- */
SCREENS.camDetail = (i) => {
  const c = CAMERA_EVENTS[+i] || CAMERA_EVENTS[0];
  return `
    ${subhead(c.type, `${c.tag} • ${c.loc}`)}
    <div class="cam" style="aspect-ratio:16/10;margin-bottom:var(--s4)">
      ${c.level !== "safe" ? `<span class="cam__live"><span class="dot"></span> LIVE</span>` : ""}
      <span class="cam__tag">${c.tag}</span>
      <span class="cam__detect ${LEVEL_PILL[c.level]}">${icon(c.level === "safe" ? "i-check" : "i-alert")} ${c.type}</span>
    </div>
    <div class="card stack" style="margin-bottom:var(--s4)">
      <div class="metric__top"><span>Илрүүлэлтийн итгэл</span><b>${Math.round(c.conf * 100)}%</b></div>
      <div class="meter"><div class="meter__fill" style="width:${Math.round(c.conf * 100)}%;background:${scoreColor(c.conf * 100)}"></div></div>
      <div class="row__sub" style="margin-top:var(--s2)">${icon("i-clock", "icon--sm")} ${c.time} • ${icon("i-pin", "icon--sm")} ${c.loc}</div>
    </div>
    <button class="btn btn--danger" data-action="camTransfer">${icon("i-phone")} Цагдаад дамжуулах</button>
    <div style="display:flex;gap:var(--s2);margin-top:var(--s3)">
      <button class="btn btn--ghost" data-action="camConfirm">${icon("i-check")} Зөв</button>
      <button class="btn btn--ghost" data-action="camFalse">${icon("i-x")} Худал дохио</button>
    </div>
    <div class="note-box" style="margin-top:var(--s4)">${icon("i-info")}<span>Илрүүлэлт бүрийг хүн баталгаажуулна (human-in-the-loop). Энэ нь эрсдэлийн загварт буцаж тэжээгдэнэ.</span></div>
  `;
};

/* ---------- Дэлгэрэнгүй: Гэр бүлийн гишүүн ---------- */
SCREENS.member = (i) => {
  const m = FAMILY[+i] || FAMILY[0];
  const places = ["Гэр — 21:40", "Сургууль — 08:42", "Их дэлгүүр — 17:10"];
  return `
    ${subhead(m.name, m.rel)}
    <div class="card" style="margin-bottom:var(--s4)">
      <div style="display:flex;align-items:center;gap:var(--s3)">
        <span class="avatar" style="width:54px;height:54px;background:${m.color}">${m.initials}</span>
        <div><div class="row__title" style="font-size:var(--fs-lg)">${m.place}</div><div class="row__sub">Сүүлд: ${m.seen}</div></div>
        <span class="pill ${m.zone === "safe" ? "pill--safe" : "pill--caution"}" style="margin-left:auto">${m.zone === "safe" ? "Аюулгүй" : "Болгоомж"}</span>
      </div>
      <div class="metric" style="margin-top:var(--s4)"><div class="metric__top"><span>Батерей</span><b style="color:${battColor(m.batt)}">${m.batt}%</b></div>
      <div class="meter"><div class="meter__fill" style="width:${m.batt}%;background:${battColor(m.batt)}"></div></div></div>
    </div>
    <div class="section-title">Сүүлийн байршлууд</div>
    <div class="list">
      ${places.map((p) => `<div class="row"><span class="row__icon tint-cyan">${icon("i-pin", "icon--sm")}</span><span class="row__main"><span class="row__title">${p}</span></span></div>`).join("")}
    </div>
    <div style="display:flex;gap:var(--s2);margin-top:var(--s4)">
      <button class="btn btn--primary" data-action="reqLoc">${icon("i-locate")} Байршил хүсэх</button>
      <button class="btn btn--ghost" data-action="sendMsg">${icon("i-message")} Зурвас</button>
    </div>
  `;
};

/* ---------- Profile ---------- */
SCREENS.profile = () => `
  <div class="subhead"><div class="subhead__title" style="margin-top:6px">Профайл</div></div>
  <div class="profile-head">
    <span class="avatar" style="background:linear-gradient(135deg,#2563EB,#7C3AED)">${USER.initials}</span>
    <div>
      <div class="row__title" style="font-size:var(--fs-lg)">${USER.name}</div>
      <div class="row__sub">${USER.khoroo} • Баталгаажсан хэрэглэгч</div>
    </div>
    <span class="pill pill--safe" style="margin-left:auto">${icon("i-shield-check")} Идэвхтэй</span>
  </div>

  <div class="section-title">Яаралтай холбоо барих</div>
  <div class="list">
    <div class="row"><span class="row__icon tint-blue">${icon("i-user","icon--sm")}</span>
      <span class="row__main"><span class="row__title">Ээж</span><span class="row__sub">+976 8800 0000 • Үндсэн</span></span>
      <span class="row__end">${icon("i-phone","icon--sm")}</span></div>
    <div class="row"><span class="row__icon tint-violet">${icon("i-user","icon--sm")}</span>
      <span class="row__main"><span class="row__title">Г. Ганаа</span><span class="row__sub">Хэсгийн ахлагч • Guardian</span></span>
      <span class="row__end">${icon("i-phone","icon--sm")}</span></div>
    <button class="row" data-action="addContact"><span class="row__icon tint-slate">${icon("i-plus","icon--sm")}</span>
      <span class="row__main"><span class="row__title">Холбоо нэмэх</span></span>
      <span class="row__end">${icon("i-chevron-right","icon--sm")}</span></button>
  </div>

  <div class="section-title">Тохиргоо</div>
  <div class="list">
    ${profileRow("i-bell","tint-amber","Мэдэгдэл","Эрсдэлийн анхааруулга асаалттай")}
    ${profileRow("i-lock","tint-green","Нууцлал","Байршил зөвхөн зөвшөөрсөн үед")}
    ${profileRow("i-users","tint-blue","Guardian болох","Сайн дурын туслахаар бүртгүүлэх")}
    ${profileRow("i-settings","tint-slate","Хэл / Тохиргоо","Монгол хэл")}
  </div>

  <div class="note-box" style="margin-top:var(--s5)">
    ${icon("i-info")}
    <span>Сэргийлэгч v0.1 — танилцуулга зориулалттай прототип. Бүх өгөгдөл жишээ (mock).</span>
  </div>
`;
const profileRow = (ic, tint, title, sub) => `
  <button class="row" data-action="settingsDemo">
    <span class="row__icon ${tint}">${icon(ic, "icon--sm")}</span>
    <span class="row__main"><span class="row__title">${title}</span><span class="row__sub">${sub}</span></span>
    <span class="row__end">${icon("i-chevron-right", "icon--sm")}</span>
  </button>`;

/* ---------- SOS ---------- */
SCREENS.sos = () => `
  <div class="sos-screen" id="sosRoot">
    <h1 class="subhead__title" style="margin-top:var(--s4)">Яаралтай тусламж</h1>
    <p class="lead">Доорх товчийг дарж тусламж дуудна. Ойролцоох Guardian болон цагдаад мэдэгдэнэ.</p>
    <button class="sos-pulse" data-action="fireSOS" aria-label="SOS дуудлага илгээх">
      <span><span class="big">SOS</span><br><span class="small">Дарж дуудах</span></span>
    </button>
    <p class="lead">эсвэл <b>дуу хоолойгоор</b> идэвхжүүлж болно</p>
    <button class="btn btn--ghost" data-nav="voice">${icon("i-mic")} Дуу хоолойгоор SOS</button>
  </div>
`;

/* ===================================================================
   Shared partials
   =================================================================== */
function subhead(title, sub) {
  return `
    <div class="subhead">
      <button class="subhead__back" data-action="back" aria-label="Буцах">${icon("i-chevron-left")}</button>
      <div>
        <div class="subhead__title">${title}</div>
        <div class="subhead__sub">${sub}</div>
      </div>
    </div>`;
}

/* ===================================================================
   Interactions (event delegation)
   =================================================================== */
tabbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) navigate(btn.dataset.route);
});

screenEl.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (nav) return navigate(nav.dataset.nav);

  const pick = e.target.closest("[data-route-pick]");
  if (pick) {
    selectedRoute = pick.dataset.routePick;
    $("#routeOpts").innerHTML = ROUTES.map((r) => routeRow(r)).join("");
    if (mapInstance) drawRoute(mapInstance);
    return;
  }

  const dist = e.target.closest("[data-district]");
  if (dist) return navigate("district", dist.dataset.district);

  const cam = e.target.closest("[data-cam]");
  if (cam) return navigate("camDetail", cam.dataset.cam);

  const mem = e.target.closest("[data-member]");
  if (mem) return navigate("member", mem.dataset.member);

  const actionEl = e.target.closest("[data-action]");
  if (actionEl) ACTIONS[actionEl.dataset.action]?.(e, actionEl);
});

const ACTIONS = {
  back: () => navigate("home"),

  addContact: () => toast("Холбоо нэмэх (демо)", "i-plus"),
  settingsDemo: () => toast("Тохиргоо (демо)", "i-settings"),

  checkin: () => toast("'Би зүгээр' тойрогт илгээгдлээ", "i-check"),
  shareLoc: () => toast("Байршлаа гэр бүлийн тойрогт хувааллаа", "i-share"),

  quickShare: () => toast("Байршлаа итгэлт хүмүүст хувааллаа", "i-share"),
  quickSiren: () => sirenStart(),
  quickFake: () => showFakeCall(),

  report: () => {
    const o = showSheet("Юу болсон бэ?", `<div class="report-grid">${REPORT_TYPES.map((r, i) => `<button class="report-opt" data-ri="${i}"><span class="row__icon ${r.tint}">${icon(r.icon, "icon--sm")}</span><span>${r.label}</span></button>`).join("")}</div>`);
    o.querySelectorAll("[data-ri]").forEach((b) => b.addEventListener("click", () => { o.remove(); toast("Мэдээлэл илгээгдлээ — баталгаажуулж байна", "i-check"); }));
  },
  upvote: (e, el) => { el.style.opacity = "0.6"; toast("Баталгаажуулалт нэмэгдлээ", "i-trending"); },

  navHaven: () => toast("Аюулгүй цэг рүү чиглүүлж байна", "i-route"),

  sirenGo: () => sirenStart(),

  toggleFall: (e, el) => { el.classList.toggle("is-on"); const on = el.classList.contains("is-on"); el.setAttribute("aria-checked", on); toast(on ? "Уналт илрүүлэх асаалаа" : "Уналт илрүүлэх унтраалаа", on ? "i-check" : "i-x"); },
  fallSens: (e, el) => { el.parentElement.querySelectorAll(".seg__btn").forEach((b) => b.classList.remove("is-active")); el.classList.add("is-active"); toast(`Мэдрэг чанар: ${el.dataset.v}`, "i-activity"); },
  fallTest: () => fallDetected(),
  fallCancel: () => { clearInterval(window._fallT); navigate("fall"); toast("Цуцаллаа — аюулгүй гэж тэмдэглэлээ", "i-check"); },

  camTransfer: () => toast("Цагдаагийн хяналтын төвд дамжууллаа", "i-phone"),
  camConfirm: () => toast("Зөв илрүүлэлт гэж баталгаажууллаа", "i-check"),
  camFalse: () => { navigate("camera"); toast("Худал дохио гэж тэмдэглэлээ", "i-x"); },

  reqLoc: () => toast("Байршил хүсэлт илгээгдлээ", "i-locate"),
  sendMsg: () => toast("Зурвас илгээгдлээ", "i-message"),

  fakeCall: () => showFakeCall(),
  declineCall: () => $(".fakecall")?.remove(),
  answerCall: () => { $(".fakecall")?.remove(); discreetActivated("Хуурамч дуудлага"); },
  discreetFire: () => discreetActivated("Сэгсрэх дохио"),
  stopRec: () => { clearInterval(window._recT); navigate("discreet"); toast("Бичлэг зогсож, аюулгүй гэж тэмдэглэлээ", "i-check"); },

  riskTime: (e, el) => { riskTime = el.dataset.v; navigate("map"); },

  startNav: () => {
    const r = ROUTES.find((x) => x.id === selectedRoute);
    toast(`"${r.name}" замаар чиглүүлж байна • ${r.durationMin} мин`, "i-nav2");
  },
  routeShare: () => toast("Маршрутаа гэр бүлийн тойрогт хувааллаа", "i-share"),

  fireSOS: () => {
    const root = $("#sosRoot");
    let n = 3;
    root.innerHTML = `<h1 class="subhead__title" style="margin-top:var(--s8)">Дохио илгээж байна…</h1>
      <p class="lead">Цуцлахыг хүсвэл доор дарна уу</p>
      <div class="countdown" style="color:var(--primary-hover)">${n}</div>
      <button class="btn btn--ghost" data-action="cancelSOS" style="margin-top:var(--s6)">Цуцлах</button>`;
    clearInterval(window._sosT);
    window._sosT = setInterval(() => {
      n--;
      const c = $(".countdown");
      if (!c) return clearInterval(window._sosT);
      if (n > 0) { c.textContent = n; }
      else { clearInterval(window._sosT); sosSent(); }
    }, 900);
  },
  cancelSOS: () => { clearInterval(window._sosT); navigate("sos"); toast("SOS цуцлагдлаа", "i-x"); },

  toggleWatch: () => {
    const btn = $("#watchBtn");
    if (watchTimer) {
      clearInterval(watchTimer); watchTimer = null;
      $("#trackState").textContent = "Аялал зогссон";
      btn.innerHTML = `${icon("i-share")} Аялал эхлүүлэх`;
      btn.classList.replace("btn--danger", "btn--primary");
      return;
    }
    watchLeft = 21 * 60; // 21 мин (демо: хурдан тоолно)
    const total = watchLeft;
    btn.innerHTML = `${icon("i-x")} Аяллыг зогсоох`;
    btn.classList.replace("btn--primary", "btn--danger");
    $("#trackState").textContent = "Ээж тань хянаж байна";
    toast("Байршлыг Г. Ганаа-тай хуваалцаж эхэллээ", "i-share");
    const arc = $("#trackArc");
    watchTimer = setInterval(() => {
      watchLeft -= 30; // демо хурд
      if (watchLeft <= 0) {
        clearInterval(watchTimer); watchTimer = null;
        $("#trackTime").textContent = "00:00";
        $("#trackState").textContent = "Аюулгүй хүрлээ ✓";
        arc.style.strokeDashoffset = 0;
        toast("Гэртээ аюулгүй хүрсэн мэдэгдэл илгээгдлээ", "i-shield-check");
        return;
      }
      const m = String(Math.floor(watchLeft / 60)).padStart(2, "0");
      const s = String(watchLeft % 60).padStart(2, "0");
      $("#trackTime").textContent = `${m}:${s}`;
      arc.style.strokeDashoffset = 603 * (watchLeft / total);
    }, 500);
  },

  toggleVoice: () => {
    const orb = $("#voiceOrb"), st = $("#voiceState");
    voiceListening = !voiceListening;
    clearTimeout(voiceTimer);
    if (voiceListening) {
      orb.classList.add("is-listening");
      st.textContent = "Сонсож байна… түлхүүр үгийг хэлээрэй";
      // демо: 2.6 сек дараа "SOS" сонссон гэж дуурайна
      voiceTimer = setTimeout(() => {
        const chips = $("#kwChips").children;
        chips[1].classList.add("is-hit");
        st.innerHTML = `<b style="color:var(--primary-hover)">"SOS" таниглаа</b> — дохио идэвхжиж байна…`;
        orb.classList.remove("is-listening");
        voiceListening = false;
        setTimeout(() => navigate("sos"), 1100);
      }, 2600);
    } else {
      orb.classList.remove("is-listening");
      st.textContent = "Идэвхжүүлэхийн тулд микрофон дээр дарна уу";
    }
  },
};

function sosSent() {
  const root = $("#sosRoot");
  root.innerHTML = `
    <div style="padding-top:var(--s6)">
      <div class="status-card status-card--danger" style="text-align:left">
        <div class="status-card__row">
          <div class="status-card__badge">${icon("i-shield-alert")}</div>
          <div><div class="status-card__label">Дохио амжилттай илгээгдлээ</div>
          <div class="status-card__value">Тусламж замдаа</div></div>
        </div>
        <p class="status-card__desc">Таны байршлыг ойролцоох туслах нарт болон 102-т дамжууллаа.</p>
      </div>
    </div>
    <div class="section-title">Хариу өгсөн</div>
    <div class="list">
      ${GUARDIANS.slice(0, 3).map((g, i) => `
        <div class="row">
          <span class="avatar" style="background:${g.color}">${g.initials}</span>
          <span class="row__main"><span class="row__title">${g.name}</span>
          <span class="row__sub">${g.role}</span></span>
          <span class="row__end"><span class="pill ${i === 0 ? "pill--safe" : "pill--info"}">${i === 0 ? "Замдаа явж байна" : `${g.eta} мин`}</span></span>
        </div>`).join("")}
    </div>
    <button class="btn btn--ghost" data-action="cancelSOS" style="margin-top:var(--s5)">${icon("i-check")} Аюулгүй боллоо</button>`;
  toast("3 туслах + цагдаад мэдэгдлээ", "i-shield-check");
}

/* ---------- Discreet SOS: fake call overlay ---------- */
function showFakeCall() {
  $(".fakecall")?.remove();
  const o = document.createElement("div");
  o.className = "fakecall";
  o.setAttribute("role", "dialog");
  o.innerHTML = `
    <div class="fakecall__top">
      <div class="fakecall__sub">гар утас</div>
      <div class="fakecall__name">Ээж</div>
      <div class="fakecall__sub">Монгол · ирж буй дуудлага…</div>
    </div>
    <div class="fakecall__avatar">Э</div>
    <div class="fakecall__hint">${icon("i-eye-off", "icon--sm")} Хариулбал нууц SOS идэвхжинэ (демо)</div>
    <div class="fakecall__actions">
      <button class="fakecall__btn fakecall__btn--decline" data-action="declineCall" aria-label="Татгалзах">${icon("i-x")}</button>
      <button class="fakecall__btn fakecall__btn--accept" data-action="answerCall" aria-label="Хариулах">${icon("i-phone")}</button>
    </div>`;
  $(".phone").appendChild(o);
  // overlay нь screenEl-ийн гадна тул шууд listener холбоно
  o.querySelector('[data-action="declineCall"]').addEventListener("click", ACTIONS.declineCall);
  o.querySelector('[data-action="answerCall"]').addEventListener("click", ACTIONS.answerCall);
}

/* ---------- Discreet SOS: evidence recording state ---------- */
function discreetActivated(method) {
  destroyMap();
  clearInterval(window._recT);
  [...tabbar.querySelectorAll(".tab")].forEach((b) => b.classList.remove("is-active"));
  { const fab = document.getElementById("fabDiscreet"); if (fab) fab.hidden = true; }
  screenEl.scrollTop = 0;
  screenEl.innerHTML = `<div class="screen__inner"><div class="sos-screen" id="recRoot">
    <span class="rec-badge"><span class="rec-dot"></span> REC · <span id="recTime">00:00</span></span>
    <div class="cam" style="aspect-ratio:16/10;margin:var(--s4) 0">
      <span class="cam__live"><span class="dot"></span> Бичиж байна</span>
      <span class="cam__detect pill--danger">${icon("i-rec")} Нотлох баримт</span>
    </div>
    <div class="status-card status-card--danger" style="text-align:left">
      <div class="status-card__row">
        <div class="status-card__badge">${icon("i-eye-off")}</div>
        <div><div class="status-card__label">${method}</div>
        <div class="status-card__value">Чимээгүй дохио илгээгдлээ</div></div>
      </div>
      <p class="status-card__desc">Ойролцоох туслах, гэр бүлийн тойрог болон 102-т байршил нууцаар дамжуулж байна.</p>
    </div>
    <div class="metric" style="margin-top:var(--s4)">
      <div class="metric__top"><span>Нотлох баримт үүлэн рүү хуулж байна…</span><b id="upPct">0%</b></div>
      <div class="meter"><div class="meter__fill" id="upBar" style="width:0%;background:var(--accent)"></div></div>
    </div>
    <button class="btn btn--ghost" data-action="stopRec" style="margin-top:var(--s5)">${icon("i-check")} Бичлэг зогсоох · Аюулгүй боллоо</button>
  </div></div>`;
  let sec = 0, pct = 0;
  window._recT = setInterval(() => {
    const t = $("#recTime"); if (!t) return clearInterval(window._recT);
    sec++;
    t.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    if (pct < 100) { pct = Math.min(100, pct + 14); $("#upPct").textContent = pct + "%"; $("#upBar").style.width = pct + "%"; }
  }, 700);
  toast("Нотлох бичлэг эхэллээ — устгах боломжгүй", "i-rec");
}

/* ---------- Bottom sheet ---------- */
function showSheet(title, inner) {
  $(".sheet")?.remove();
  const o = document.createElement("div");
  o.className = "sheet";
  o.setAttribute("role", "dialog");
  o.innerHTML = `<div class="sheet__backdrop" data-sheet-close></div>
    <div class="sheet__panel">
      <div class="sheet__handle"></div>
      <div class="sheet__title">${title}</div>
      ${inner}
    </div>`;
  $(".phone").appendChild(o);
  o.querySelector("[data-sheet-close]").addEventListener("click", () => o.remove());
  return o;
}

/* ---------- Siren overlay ---------- */
function sirenStart() {
  $(".siren-ov")?.remove();
  const o = document.createElement("div");
  o.className = "siren-ov";
  o.innerHTML = `<div class="siren-ov__inner">
    ${icon("i-siren")}
    <div class="siren-ov__t">СИРЕНА ИДЭВХТЭЙ</div>
    <div class="siren-ov__s">Чанга дуу + анивчдаг гэрэл (демо)</div>
    <button class="btn btn--ghost" data-action="sirenStop" style="max-width:200px;margin:var(--s5) auto 0">${icon("i-x")} Зогсоох</button>
  </div>`;
  $(".phone").appendChild(o);
  o.querySelector('[data-action="sirenStop"]').addEventListener("click", () => o.remove());
}

/* ---------- Fall detected state ---------- */
function fallDetected() {
  destroyMap();
  clearInterval(window._fallT);
  [...tabbar.querySelectorAll(".tab")].forEach((b) => b.classList.remove("is-active"));
  { const fab = document.getElementById("fabDiscreet"); if (fab) fab.hidden = true; }
  screenEl.scrollTop = 0;
  let n = 10;
  screenEl.innerHTML = `<div class="screen__inner"><div class="sos-screen">
    <div class="status-card status-card--danger" style="text-align:left;margin-top:var(--s4)">
      <div class="status-card__row"><div class="status-card__badge">${icon("i-activity")}</div>
      <div><div class="status-card__label">Хүчтэй цохилт мэдрэгдлээ</div><div class="status-card__value">Та зүгээр үү?</div></div></div>
      <p class="status-card__desc">Хариу өгөхгүй бол доорх хугацааны дараа автоматаар SOS илгээж, байршил дамжуулна.</p>
    </div>
    <div class="countdown" style="color:var(--primary-hover);text-align:center">${n}</div>
    <button class="btn btn--ghost" data-action="fallCancel">${icon("i-check")} Би зүгээр — цуцлах</button>
  </div></div>`;
  window._fallT = setInterval(() => {
    const c = $(".countdown"); if (!c) return clearInterval(window._fallT);
    n--;
    if (n > 0) c.textContent = n;
    else { clearInterval(window._fallT); discreetActivated("Уналт илрүүлэлт"); }
  }, 800);
  toast("Уналт илэрлээ — хариу өгнө үү", "i-activity");
}

/* ===================================================================
   Boot
   =================================================================== */
function tickClock() {
  const d = new Date();
  $("#clock").textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
tickClock();
setInterval(tickClock, 30000);

/* Deep-linking via URL hash (#map, #route, #sos, …) */
function routeFromHash() {
  const h = location.hash.slice(1);
  return SCREENS[h] ? h : "home";
}
const _origNavigate = navigate;
navigate = function (route, param) {
  _origNavigate(route, param);
  if (location.hash.slice(1) !== route) history.replaceState(null, "", route === "home" ? "#" : "#" + route);
};
window.addEventListener("hashchange", () => navigate(routeFromHash()));
navigate(routeFromHash());
