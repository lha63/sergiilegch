# Live горим — Firebase тохиргоо (5-10 минут)

Live горим (бодит цагийн SOS + байршил) ажиллахын тулд **үнэгүй Firebase project** хэрэгтэй.
Тохиргоо хийгээгүй ч апп нээгдэх ба бусад 14 горим mock-оор ажиллана.

## 1. Firebase project үүсгэх

1. https://console.firebase.google.com → **Add project** → нэр өг (ж: `sergiilegch`) → үүсгэ.
2. Зүүн талаас **Build → Authentication → Get started → Sign-in method → Anonymous → Enable → Save**.
3. **Build → Firestore Database → Create database → Start in test mode → бүс сонгоод** (ж: `eur3` / `asia`) → Enable.
4. Project тохиргоо (⚙️ → Project settings) → доош гүйлгээд **Your apps → Web (`</>`)** → апп бүртгэ → гарч ирэх `firebaseConfig` объектыг **хуулж ав**.

## 2. Config-ийг апп-д тавих

`deploy/live.js` файлын дээд талын `FIREBASE_CONFIG`-ийг өөрийн утгаар солино:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "sergiilegch.firebaseapp.com",
  projectId: "sergiilegch",
  storageBucket: "sergiilegch.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123",
};
```

## 3. Firestore дүрэм (rules)

Firestore → **Rules** таб → `deploy/firestore.rules`-ийн агуулгыг хуулж тавиад **Publish**.
(Демогийн дүрэм: нэвтэрсэн хэрэглэгч унших/бичих. Production-д гишүүнчлэлээр хязгаарла.)

## 4. Deploy (HTTPS заавал — геолокаци, PWA-д шаардлагатай)

**Сонголт A — Firebase Hosting (зөвлөмж):**
```bash
npm i -g firebase-tools
cd deploy
firebase login
firebase init hosting   # public directory = . (current), single-page app = No
firebase deploy
```
→ `https://<project>.web.app`

**Сонголт B — GitHub Pages:** `deploy/`-г repo болгон push → Settings → Pages (өмнөх [README.md](README.md) заавар). HTTPS автоматаар.

## 5. 2 утсаар тест

1. Hosting URL-ийг **2 Android утсанд** Chrome-оор нээж → ⋮ → **Add to Home screen** (апп шиг суулгана).
2. **Утас A (ахлагч):** Профайл → "Live горим" → нэр → **Хэсгийн ахлагч** → 4 оронтой код гарна.
3. **Утас B (хүүхэд):** Профайл → "Live горим" → нэр → **Хүүхэд** → кодыг оруулж **Холбогдох**.
4. Хүүхэд **"Байршил хуваалцаж эхлэх"** → байршлын зөвшөөрөл өг. Ахлагчийн зураг дээр хүүхдийн цэг **амьд хөдөлнө**.
5. Хүүхэд **SOS** дарна (эсвэл баруун доод нууц SOS) → ахлагчийн дэлгэцэд **шууд** улаан анхааруулга + дуу + чичиргээ + байршил.
6. **"Гэртээ хүртэл хяна"** → ахлагч "Замдаа" төлөв харна → хүрвэл хүүхэд "Аюулгүй хүрлээ" дарна.

## Анхаарах
- **HTTPS заавал.** `file://` эсвэл энгийн http-ээс геолокаци/PWA ажиллахгүй.
- **Foreground:** туршилтын үед 2 утас аппаа нээлттэй байлга (PWA background байршил дэмжихгүй).
- **Дуу:** ахлагч эхэлж дэлгэц дээр нэг товшино (browser autoplay-г нээхэд).
- **Үнэгүй:** Spark (free) plan 2 хүний туршилтад хангалттай. FCM/Cloud Functions хэрэггүй.
