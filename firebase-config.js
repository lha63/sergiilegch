/* =====================================================================
   Firebase тохиргоо — Сэргийлэгч pilot (хүүхэд ↔ ахлагч realtime)

   ⚠️  ЭНД ӨӨРИЙН ХУВИЙН Google account-оор үүсгэсэн утгуудаа тавина.
       (ажлын имэйл БИШ — энэ хувийн төсөл.)

   Хийх алхам (нэг удаа, ~5 минут, үнэгүй, картгүй):
   1. https://console.firebase.google.com  →  «Add project» (нэр: sergiilegch)
   2. Build → «Firestore Database» → Create database → Start in test mode → бүс: eur3
   3. Build → «Authentication» → Get started → Sign-in method → «Anonymous» → Enable
   4. Project settings (⚙) → «Your apps» → Web (</>) тэмдэг дарж апп бүртгэх
        → гарч ирэх firebaseConfig доторх утгуудыг доош хуулна.
   5. Энэ файлыг хадгалаад дахин build хийнэ (GitHub-д push → APK автоматаар шинэчлэгдэнэ).

   Энэ утгууд НУУЦ БИШ — клиент талын апп-д ил байх нь хэвийн.
   Хамгаалалт нь Firestore-ийн дүрэм (rules) дээр хийгдэнэ. README.md үзнэ үү.
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
