/* =====================================================================
   Сэргийлэгч — жишээ (mock) өгөгдөл. Бодит backend-гүй, зөвхөн танилцуулга.
   Газарзүйн төв: Улаанбаатар хот.
   ===================================================================== */
const UB = { lat: 47.9185, lng: 106.9176, zoom: 12 };

/* Хэрэглэгч (демо) */
const USER = { name: "Болор", initials: "Б", khoroo: "ХУД 11-р хороо" };

/* Эрсдэлийн бүсүүд — heatmap (level: high/medium/low) */
const RISK_ZONES = [
  { lat: 47.9210, lng: 106.8830, radius: 700, level: "high",   reason: "Сүүлийн 30 хоногт 14 дуудлага бүртгэгдсэн", area: "Баруун 4 зам орчим" },
  { lat: 47.9145, lng: 106.9420, radius: 650, level: "high",   reason: "Шөнийн цагт гэрэлтүүлэг сул, 9 дуудлага", area: "Их тойруу зүүн" },
  { lat: 47.9060, lng: 106.9180, radius: 600, level: "medium", reason: "Камер цөөн, хүн хөдөлгөөн багатай", area: "Сансар орчим" },
  { lat: 47.9300, lng: 106.9000, radius: 550, level: "medium", reason: "Орой 22:00-оос хойш эрсдэл нэмэгддэг", area: "Дамбадаржаа доод" },
  { lat: 47.9170, lng: 106.9100, radius: 500, level: "low",    reason: "Камер сайтай, хүн хөдөлгөөнтэй", area: "Сүхбаатарын талбай" },
  { lat: 47.9120, lng: 106.8700, radius: 520, level: "low",    reason: "Гэрэлтүүлэг сайн, эргүүл идэвхтэй", area: "Зайсан орчим" },
];

/* Хорооны / дүүргийн аюулгүй байдлын оноо (0-100) */
const DISTRICTS = [
  { name: "Сүхбаатар дүүрэг", short: "СБД", score: 78, trend: +4,
    metrics: { crime: 72, cameras: 88, lighting: 80, response: 74, footfall: 85 } },
  { name: "Хан-Уул дүүрэг", short: "ХУД", score: 71, trend: +2,
    metrics: { crime: 68, cameras: 75, lighting: 72, response: 70, footfall: 78 } },
  { name: "Баянгол дүүрэг", short: "БГД", score: 64, trend: -1,
    metrics: { crime: 60, cameras: 66, lighting: 62, response: 65, footfall: 80 } },
  { name: "Чингэлтэй дүүрэг", short: "ЧД", score: 58, trend: -3,
    metrics: { crime: 52, cameras: 55, lighting: 50, response: 60, footfall: 70 } },
  { name: "Баянзүрх дүүрэг", short: "БЗД", score: 55, trend: +1,
    metrics: { crime: 48, cameras: 52, lighting: 54, response: 58, footfall: 72 } },
  { name: "Сонгинохайрхан дүүрэг", short: "СХД", score: 49, trend: -2,
    metrics: { crime: 44, cameras: 46, lighting: 45, response: 52, footfall: 66 } },
];

const METRIC_LABELS = {
  crime:    { label: "Гэмт хэргийн түвшин", icon: "i-shield-alert" },
  cameras:  { label: "Камерын хамрах хүрээ", icon: "i-video" },
  lighting: { label: "Гэрэлтүүлэг", icon: "i-bulb" },
  response: { label: "Хариу үйлдлийн хугацаа", icon: "i-clock" },
  footfall: { label: "Хүн хөдөлгөөн", icon: "i-users" },
};

/* Маршрутын сонголтууд */
const ROUTES = [
  { id: "safe", name: "Хамгийн аюулгүй", score: 92, durationMin: 21, distanceKm: 2.4,
    color: "#22C55E", lit: "Өндөр", cameras: 12, crowd: "Их",
    coords: [[47.9060,106.9180],[47.9100,106.9150],[47.9150,106.9120],[47.9175,106.9095],[47.9185,106.9176]] },
  { id: "balanced", name: "Тэнцвэртэй", score: 74, durationMin: 17, distanceKm: 2.0,
    color: "#F59E0B", lit: "Дунд", cameras: 7, crowd: "Дунд",
    coords: [[47.9060,106.9180],[47.9095,106.9200],[47.9140,106.9190],[47.9185,106.9176]] },
  { id: "fast", name: "Хамгийн хурдан", score: 48, durationMin: 14, distanceKm: 1.7,
    color: "#EF4444", lit: "Сул", cameras: 3, crowd: "Бага",
    coords: [[47.9060,106.9180],[47.9110,106.9260],[47.9160,106.9230],[47.9185,106.9176]] },
];

/* Community Guardian — ойролцоох туслахууд */
const GUARDIANS = [
  { name: "Г. Ганаа",   role: "Хэсгийн ахлагч",     dist: 240,  eta: 2,  color: "#2563EB", initials: "ГА", status: "online" },
  { name: "Цагдаа 102", role: "Эргүүлийн машин",     dist: 600,  eta: 4,  color: "#DC2626", initials: "102", status: "online" },
  { name: "Б. Дорж",    role: "Сайн дурын хамгаалагч", dist: 410,  eta: 3,  color: "#16A34A", initials: "БД", status: "online" },
  { name: "С. Оюун",    role: "Сайн дурын хамгаалагч", dist: 880,  eta: 6,  color: "#7C3AED", initials: "СО", status: "away" },
];

/* AI камерын илрүүлэлт */
const CAMERA_EVENTS = [
  { type: "Зодоон илрэв",          level: "danger",  loc: "СБД 1-р хороо, А зогсоол", time: "21:32", conf: 0.94, tag: "CAM-014" },
  { type: "Сэжигтэй бөөгнөрөл",    level: "caution", loc: "БГД 20-р хороо, гарц",    time: "21:18", conf: 0.81, tag: "CAM-077" },
  { type: "Урт хугацаанд зогссон машин", level: "caution", loc: "ХУД 11-р хороо",    time: "20:50", conf: 0.76, tag: "CAM-031" },
  { type: "Хэвийн",                level: "safe",    loc: "Сүхбаатарын талбай",       time: "21:35", conf: 0.99, tag: "CAM-002" },
];

/* Нүүр хуудасны үйл явдлын урсгал */
const FEED = [
  { icon: "i-alert", tint: "tint-red",   title: "Эрсдэлийн анхааруулга", sub: "Их тойруу зүүнд орой явахад эрсдэл өндөр", time: "Одоо" },
  { icon: "i-users", tint: "tint-blue",  title: "Шинэ хамгаалагч нэгдлээ", sub: "Таны хороонд 2 сайн дурынхан нэмэгдсэн", time: "12 мин" },
  { icon: "i-video", tint: "tint-amber", title: "Камер: сэжигтэй бөөгнөрөл", sub: "БГД 20-р хороо орчим", time: "1 цаг" },
  { icon: "i-shield-check", tint: "tint-green", title: "Аюулгүй хүрлээ", sub: "Өчигдрийн 'Хяна' аялал амжилттай дууссан", time: "Өчигдөр" },
];

/* Хэрэглэгчийн одоогийн ерөнхий байдал */
const CURRENT_STATUS = {
  level: "caution",          // safe | caution | danger
  title: "Болгоомжтой бай",
  desc: "Таны байршилд орой 21:00-оос хойш эрсдэл бага зэрэг нэмэгддэг. Гэрэлтүүлэгтэй замаар яваарай.",
  area: "ХУД 11-р хороо",
  score: 71,
  guardians: 8,
};

/* Гэр бүлийн тойрог — итгэлт хүмүүсийн амьд байршил */
const FAMILY = [
  { name: "Ээж",       rel: "Гэр бүл",  initials: "Э",  color: "#DC2626", lat: 47.9165, lng: 106.9080, batt: 76, seen: "Одоо",   place: "Гэртээ",        zone: "safe" },
  { name: "Аав",       rel: "Гэр бүл",  initials: "А",  color: "#2563EB", lat: 47.9240, lng: 106.9300, batt: 54, seen: "2 мин",  place: "Ажил дээрээ",   zone: "safe" },
  { name: "Сараа",     rel: "Эгч",      initials: "С",  color: "#7C3AED", lat: 47.9080, lng: 106.9420, batt: 19, seen: "1 мин",  place: "Их тойруу зүүн", zone: "caution" },
  { name: "Тэмүүлэн",  rel: "Дүү",      initials: "Т",  color: "#16A34A", lat: 47.9200, lng: 106.9170, batt: 88, seen: "Одоо",   place: "Сургуульдаа",   zone: "safe" },
];

/* Geofence / тойргийн үйл явдлууд */
const CIRCLE_EVENTS = [
  { icon: "i-shield-check", tint: "tint-green", title: "Тэмүүлэн сургуульдаа хүрлээ", sub: "13-р сургууль • аюулгүй бүс", time: "08:42" },
  { icon: "i-alert",        tint: "tint-amber", title: "Сараа эрсдэлтэй бүсэд оров",  sub: "Их тойруу зүүн • батерей 19%",  time: "Одоо" },
  { icon: "i-battery",      tint: "tint-red",   title: "Аавын утас бага цэнэгтэй",     sub: "54% • цэнэглэхийг сануулъя",    time: "5 мин" },
  { icon: "i-check",        tint: "tint-blue",  title: "Ээж 'Би зүгээр' илгээлээ",     sub: "Check-in баталгаажлаа",         time: "20 мин" },
];

/* Нууц SOS-ийн идэвхжүүлэх аргууд */
const DISCREET_TRIGGERS = [
  { icon: "i-radio",   tint: "tint-violet", title: "Утсаа сэгсрэх", sub: "Халаасандаа байхад ч ажиллана" },
  { icon: "i-lock",    tint: "tint-blue",   title: "Power товч 3 удаа", sub: "Дэлгэц асаахгүйгээр дохио өгнө" },
  { icon: "i-phone",   tint: "tint-green",  title: "Хуурамч дуудлага", sub: "Дуудлага ирсэн дүр эсгэн зугтах" },
];

/* Маршрутын алхам алхмын заавар (Горим 2 гүнзгий) */
const ROUTE_STEPS = [
  { dir: "Хойд зүг рүү", street: "Сансарын гудамж", dist: "300 м", note: "Гэрэлтүүлэг сайн", safe: true },
  { dir: "Зүүн тийш эргэх", street: "Энхтайваны өргөн чөлөө", dist: "650 м", note: "4 камер, хүн их", safe: true },
  { dir: "Шулуун", street: "Бага тойруу", dist: "900 м", note: "Эргүүл идэвхтэй", safe: true },
  { dir: "Баруун тийш", street: "Сүхбаатарын талбай", dist: "550 м", note: "Зорьсон газар", safe: true },
];

/* Хорооны жагсаалт (Горим 4 дэлгэрэнгүй) */
const KHOROOS = {
  "СБД": [{ n: "1-р хороо", s: 84 }, { n: "5-р хороо", s: 80 }, { n: "8-р хороо", s: 74 }, { n: "11-р хороо", s: 71 }],
  "ХУД": [{ n: "11-р хороо", s: 71 }, { n: "3-р хороо", s: 69 }, { n: "15-р хороо", s: 66 }, { n: "2-р хороо", s: 62 }],
  "БГД": [{ n: "20-р хороо", s: 58 }, { n: "4-р хороо", s: 66 }, { n: "10-р хороо", s: 64 }, { n: "1-р хороо", s: 68 }],
  "ЧД":  [{ n: "6-р хороо", s: 52 }, { n: "13-р хороо", s: 60 }, { n: "19-р хороо", s: 56 }, { n: "3-р хороо", s: 64 }],
  "БЗД": [{ n: "26-р хороо", s: 48 }, { n: "13-р хороо", s: 55 }, { n: "8-р хороо", s: 58 }, { n: "1-р хороо", s: 62 }],
  "СХД": [{ n: "32-р хороо", s: 44 }, { n: "21-р хороо", s: 50 }, { n: "7-р хороо", s: 52 }, { n: "1-р хороо", s: 55 }],
};

/* Иргэдийн бодит цагийн анхааруулга (crowdsource feed) */
const COMMUNITY = [
  { type: "Сэжигтэй этгээд", level: "caution", area: "БЗД 13-р хороо", time: "3 мин", up: 12, by: "Иргэн", txt: "Орц дээр танихгүй хүн удаан зогсож байна." },
  { type: "Гэрэлтүүлэг унтарсан", level: "info", area: "ХУД 3-р хороо", time: "20 мин", up: 8, by: "Иргэн", txt: "Гудамжны гэрэл 2 хоног асахгүй байна." },
  { type: "Зам тээврийн осол", level: "danger", area: "СБД 8-р хороо", time: "35 мин", up: 24, by: "Цагдаа ✓", txt: "Уулзвар дээр осол гарсан, тойрч гарна уу." },
  { type: "Нохойн сүрэг", level: "caution", area: "СХД 21-р хороо", time: "1 цаг", up: 15, by: "Иргэн", txt: "Тэнэмэл нохойн сүрэг, болгоомжтой." },
];
const REPORT_TYPES = [
  { icon: "i-alert", tint: "tint-red", label: "Гэмт хэрэг" },
  { icon: "i-eye", tint: "tint-amber", label: "Сэжигтэй" },
  { icon: "i-bulb", tint: "tint-slate", label: "Гэрэлтүүлэг" },
  { icon: "i-activity", tint: "tint-blue", label: "Осол" },
];

/* Аюулгүй цэгүүд (24/7 safe haven) */
const HAVENS = [
  { name: "Эмийн сан №24", type: "Эмийн сан", open: "24/7", lat: 47.9170, lng: 106.9150, dist: 180, icon: "i-cross", color: "#22C55E" },
  { name: "1-р цагдаагийн хэлтэс", type: "Цагдаа", open: "24/7", lat: 47.9210, lng: 106.9100, dist: 540, icon: "i-shield", color: "#2563EB" },
  { name: "Улсын нэгдсэн эмнэлэг", type: "Эмнэлэг", open: "24/7", lat: 47.9135, lng: 106.9230, dist: 760, icon: "i-cross", color: "#DC2626" },
  { name: "Шатахуун түгээх станц", type: "24 цагийн", open: "24/7", lat: 47.9100, lng: 106.9120, dist: 420, icon: "i-pin", color: "#F59E0B" },
  { name: "Аюулгүй цэг дэлгүүр", type: "Түнш цэг", open: "07:00–02:00", lat: 47.9195, lng: 106.9200, dist: 310, icon: "i-heart", color: "#7C3AED" },
];

/* Эмнэлгийн SOS карт */
const MEDICAL = {
  name: "Болор Б.", age: 24, blood: "B+ (Rh+)",
  allergies: ["Пенициллин", "Сам хорхойн хатгалт"],
  conditions: ["Багавтар астма"],
  meds: ["Сальбутамол ингалятор"],
  contacts: [{ name: "Ээж", phone: "+976 8800 0000" }, { name: "Аав", phone: "+976 9911 0000" }],
};

/* Уналт/осол илрүүлэх тохиргоо */
const FALL_SETTINGS = { enabled: true, sensitivity: "Дунд", countdown: 30, autoCall: true };

/* Горимуудыг ангиллаар (Эхлэл хуудсанд) */
const MODE_GROUPS = [
  { title: "Яаралтай үед", modes: [
    { id: "discreet", title: "Нууц SOS + бичлэг", sub: "Чимээгүй дохио, нотлох бичлэг", icon: "i-eye-off", tint: "tint-violet" },
    { id: "fall",     title: "Уналт/осол илрүүлэх", sub: "Хүчтэй цохилтод автомат SOS", icon: "i-activity", tint: "tint-red" },
    { id: "medical",  title: "Эмнэлгийн карт", sub: "Цусны бүлэг, харшил, холбоо", icon: "i-cross", tint: "tint-red" },
    { id: "siren",    title: "Дохиолол / Сирена", sub: "Чанга дуу, анивчдаг гэрэл", icon: "i-siren", tint: "tint-amber" },
  ]},
  { title: "Урьдчилан сэргийлэх", modes: [
    { id: "risk",      title: "AI эрсдэлийн үнэлгээ", sub: "Өндөр эрсдэлтэй бүс", icon: "i-shield-alert", tint: "tint-red" },
    { id: "route",     title: "Аюулгүй маршрут", sub: "Аюулгүй замаар чиглүүлэх", icon: "i-route", tint: "tint-blue" },
    { id: "score",     title: "Хорооны оноо", sub: "Орчны аюулгүй байдал", icon: "i-trending", tint: "tint-green" },
    { id: "havens",    title: "Аюулгүй цэгүүд", sub: "24/7 эмийн сан, цагдаа", icon: "i-shield-check", tint: "tint-green" },
    { id: "community", title: "Иргэдийн анхааруулга", sub: "Бодит цагийн мэдээлэл", icon: "i-megaphone", tint: "tint-amber" },
  ]},
  { title: "Хяналт ба хамтын ажиллагаа", modes: [
    { id: "live",     title: "Шууд горим (бодит цаг)", sub: "Бодит цаг: хүүхэд ↔ ахлагч", icon: "i-share", tint: "tint-green" },
    { id: "watch",    title: "Намайг гэртээ хүртэл хяна", sub: "Аяллын явцыг хянах", icon: "i-locate", tint: "tint-cyan" },
    { id: "family",   title: "Гэр бүлийн тойрог", sub: "Итгэлт хүмүүсийн байршил", icon: "i-heart", tint: "tint-red" },
    { id: "guardian", title: "Иргэдийн хамгаалагч", sub: "Ойролцоох туслахууд", icon: "i-users", tint: "tint-violet" },
    { id: "voice",    title: "Дуу хоолойгоор SOS", sub: "Түлхүүр үгээр дохио", icon: "i-mic", tint: "tint-amber" },
    { id: "camera",   title: "AI камерын анализ", sub: "Бичлэгээс эрсдэл илрүүлэх", icon: "i-video", tint: "tint-slate" },
  ]},
];

/* Эхлэл хуудасны түргэн үйлдлүүд */
const QUICK_ACTIONS = [
  { action: "quickShare", icon: "i-share", tint: "tint-blue", label: "Байршил" },
  { action: "quickSiren", icon: "i-siren", tint: "tint-amber", label: "Сирена" },
  { action: "quickFake",  icon: "i-phone", tint: "tint-green", label: "Хуурамч" },
  { nav: "medical",       icon: "i-cross", tint: "tint-red", label: "Эмнэлэг" },
];
