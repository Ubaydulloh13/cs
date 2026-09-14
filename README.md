# STRIKEZONE — Evolution

O‘zbekcha brauzer FPS: React, Three.js, PeerJS va serverda saqlanadigan accountlar.

## Ishga tushirish

Node.js 22.13 yoki yangirog‘i kerak.

```sh
npm run dev -- --host 0.0.0.0
```

Terminal ko‘rsatgan manzilni oching. Oddiy o‘yinchilar **Account ochish** orqali ro‘yxatdan o‘tadi. Egasi uchun login **operator**; tasodifiy parol `.private/admin-login.txt` faylida. Uni Shop → Account orqali o‘zgartirish mumkin. `admin:setup` mavjud parolni almashtirmaydi. `.private` va `.data` Git va hosting arxiviga kirmaydi.

## O‘yin

`npm run dev` yetishmayotgan paketlarni lockfile orqali o‘rnatadi va birinchi ishga tushirishda operator parolini yaratadi. Paketlarni yuklash uchun internet kerak; mavjud accountlar va parol qayta yozilmaydi.

`G` — portlovchi granata, `H` — flash. Har hayotda ikkitadan beriladi. Devorlar portlash va flashni to‘sadi; flash kuchi masofa va qarash yo‘nalishiga bog‘liq.

AK oilasi batafsil OBJ modeldan foydalanadi. Qolgan qurollar yumaloq detalli geometriyadan yaratilgan. Personaj 1.6 m balandlikka moslangan, kamera va o‘q boshlanish nuqtasi umumiy balandlikdan hisoblanadi. Quyoshli arenalarda moviy osmon, palmalar, deraza bezaklari, tosh va metall teksturalar mavjud.

- 1v1–6v6. Bo‘sh joylarni uch qiyinlikdagi botlar to‘ldiradi.
- 6 arena: Dust Yard, Iron Depot, Old Quarter, Port Meridian, Red Canyon, Blacksite. Har birida alohida to‘siqlar va bot yo‘llari mavjud.
- 24 asosiy qurol, jumladan SCAR-L, SCAR-H, AK-47, M4A1, AWP, HK416, AUG va Vector. Asosiy qurol jangdan oldin Arsenalda tanlanadi.
- `1` — tanlangan asosiy qurol; `2` — P226; `3` — pichoq. Magazinlar almashtirishda saqlanadi.
- WASD yurish, Shift yugurish, Space sakrash, C/Ctrl o‘tirish, R o‘qlash, Tab natijalar, Esc pauza. Mobil ekran boshqaruvlari ham mavjud.
- Chap tugmani ushlab uzluksiz otish. O‘ng tugma ADS. O‘q kamera markazidagi ray bo‘ylab ketadi; qurol animatsiyasi kamerani siljitmaydi. Devorlar, masofa, ittifoqchi va spawn himoyasi hisobga olinadi.
- Red Dot, holografik, ACOG va 6× optika; Sozlamalarda nuqta/xoch/aylana/T pritsel va 4 rang.
- Mixamo animatsiyali inson modeli, 7 rangli kiyim to‘plami, haqiqiy material teksturalari, PBR yoritish va soyalar. Qurollar yumaloq detallar, silindrlar, egri magazin va optika bilan yaratilgan. Bu CS2 darajasidagi fotorealistik grafika emas; kiyim to‘plamlari bitta rigged modelga asoslangan.
- Har bir asosiy qurol uchun alohida saqlanadigan 30 skin: 10 rangli, 10 animatsiyali va 10 animatsiyali killfeedli. Pichoq skinlari ham alohida xarid qilinadi.
- Combat, Karambit, Butterfly, M9 Bayonet, Kukri va Talon pichoqlari. Pichoq zarbasi 2.5 metr bilan chegaralangan.

## Account va do‘kon

Mahalliy server SQLite ishlatadi (`.data/accounts.sqlite`); Sites serveri `DB` D1 binding ishlatadi. Parollar tuzli PBKDF2-SHA256 bilan hashlanadi; sessiyalar HttpOnly cookie bilan boshqariladi. Account, balans, xaridlar, jihozlar, sozlamalar va so‘nggi 30 jang serverda saqlanadi. Avvalgi localStorage profili avtomatik ko‘chirilmaydi.

Coin bilan qurol, kiyim, skin va pichoq xarid qilish ishlaydi. Narx, balans, egalik va admin huquqi serverda tekshiriladi. `operator`, `aperator`, `admin` loginlari ro‘yxatdan o‘tish uchun band. Operator Shop → Operator paneli orqali bir amalda 1 dan 1 milliardgacha coin qo‘sha oladi; amallar auditga yoziladi.

Haqiqiy pulga coin, qurol olish va donat **hali ulanmagan**. Shopdagi so‘m narxlari rejalashtirilgan narxlar; tugmalar o‘chiq, `/api/checkout` 503 qaytaradi va pul yechilmaydi. Click/Payme/Stripe savdogar hisobi, tasdiqlangan narxlar va server webhook integratsiyasi kerak.

Jang mukofoti: yakunlangan jang +30, har bir kill +25, g‘alaba +150. Natijaga muddatli, bir marta ishlatiladigan server ticket kerak. Ammo jang simulyatsiyasi host brauzerida ishlaydi, natijalar host/klientdan keladi. Bu mustaqil anti-cheat va pul bilan bog‘langan himoyalangan iqtisodiyot o‘rnini bosmaydi.

## Do‘stlar bilan

Hamma bir xil HTTPS saytga kirib accountini ochadi. Xona egasi **Do‘stlar → Xona ochish** orqali olti belgili kod oladi. Boshqalar kod yoki taklif havolasi bilan qo‘shiladi; egasi jangni boshlaydi.

Host simulyatsiyasi 60 Hz, tarmoq paketlari 20 Hz. Obyektlarni birlashtirish, sonlarni ixchamlashtirish, paket navbatini cheklash, interpolatsiya va dinamik render o‘lchami yukni kamaytiradi. Barcha qurilma/tarmoqlarda qotmaslik kafolati emas.

Host oynani yopsa jang tugaydi. Oddiy ishtirokchi chiqsa bot uning o‘rnini egallaydi. Jang boshlangach yangi odam qo‘shilmaydi. PeerJS ommaviy signaling xizmati ishlatiladi; maxsus TURN relay sozlanmagan. Ayrim NAT/firewall tarmoqlarida ulanish ishlamasligi mumkin. Tashqi o‘yin uchun HTTPS hostingdan foydalaning. Hosting owner-private bo‘lsa, do‘stlarga kirish berish yoki saytni ochiq qilish talab etiladi.

## Tekshirish va hosting

```sh
npm test
npm run lint
npm run build
```

36 test jang, harakat, barcha arenalar, 24 qurolning kamera markaziga mosligi, sniper, pichoq, geometriya, xona protokoli, account, xarid va admin huquqlarini tekshiradi. Transport testlari xotiradagi soxta PeerJS bilan bajariladi. Haqiqiy ikki qurilma, brauzerdagi vizual ko‘rinish va FPS hali o‘lchanmagan.

Build klient va account API bilan `dist/server/index.js` Worker yaratadi. `.openai/hosting.json` loyiha va `DB` bindingni saqlaydi. Ishlab chiqarishda `ADMIN_PASSWORD_HASH` Sites runtime **secret** sifatida sozlanadi; xom parol joylashtirilmaydi. Oddiy statik hosting va `vite preview` account API ishlatmaydi.

Schema `db/schema.ts`, migratsiyalar `drizzle/`. `npm run db:generate` yangi migratsiya chiqaradi; build ularni Workerga va `dist/.openai/drizzle` ichiga qo‘shadi.

Asset manbalari: [ASSETS.md](ASSETS.md). Yangilangan topshiriq: [TALABLAR.md](TALABLAR.md).
