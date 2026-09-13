# STRIKEZONE — First Strike

O‘zbekcha brauzer 3D FPS o‘yini. React, Three.js va PeerJS bilan yaratilgan o‘ynaladigan boshlang‘ich versiya.

## Ishga tushirish

Node.js 22.13+ kerak.

```sh
npm install
npm run dev -- --host 0.0.0.0
```

Terminaldagi manzilni oching (odatda http://localhost:5173). **Jangni boshlash → Arena’ga kirish → Jangga kirish** ni bosing. Brauzer sichqonchani ushlab turishga ruxsat so‘rashi mumkin.

## Imkoniyatlar

- 1v1, 2v2, 3v3, 4v4, 5v5, 6v6; Alpha va Bravo jamoalari.
- Dust Yard va Iron Depot arenalari, to‘siqlar, konteynerlar, yorug‘lik va soyalar.
- WASD yurish; sichqoncha bilan qarash; chap tugma otish; o‘ng tugma ADS; Shift yugurish; Space sakrash; C/Ctrl o‘tirish; R o‘qlash; 1–4 qurol; Tab hisob; Esc menyu.
- Telefonda ekrandagi harakat va otish tugmalari, o‘ng hududni surish orqali qarash.
- AK-47, M4A1, MP5 va AWP: alohida zarar, aniqlik, o‘qdon, otish va o‘qlash tezligi.
- Devorga tegadigan o‘qlar, boshga zarba, ittifoqchilarga zarar yetkazmaslik, 3 soniyalik respawn, 2 soniyalik himoya.
- Uch qiyinlikdagi botlar: to‘siqlar orasidan yo‘l topish, raqibga qarash, otish, strafe, o‘qlash.
- Factory, Desert Camo, Arctic Ice, Toxic Pulse, Crimson Web va Gold Rush skinlari. Arsenalda 3D qurolni aylantirish va skinni tanlash mumkin.
- Har bir yengilgan raqib +25 tanga, yakunlangan jang +30, g‘alaba +150. Tangalar, skinlar, sozlamalar va so‘nggi 20 jang shu brauzerning localStorage xotirasida saqlanadi. Haqiqiy pul va umumiy akkaunt tizimi yo‘q.

## Do‘stlar bilan onlayn

1. Hamma bir xil o‘yin saytini ochadi. Tashqi do‘stlar uchun saytga kirish ruxsati yoki ochiq HTTPS hosting kerak.
2. Xona egasi **Do‘stlar → Xona ochish** ni bosadi.
3. 6 belgili kod yoki taklif havolasini ulashadi.
4. Qolganlar **Xonaga kirish** orqali qo‘shiladi. Jamoalar navbat bilan to‘ldiriladi.
5. Xona egasi **Jangni boshlash** ni bosadi. Bo‘sh o‘rinlar botlar bilan to‘ldiriladi.

Xona egasining brauzeri 60 Hz jang simulyatsiyasini boshqaradi. Klientlar 20 Hz input yuboradi, host 20 Hz holat yuboradi. Host zarar, ammo, harakat va hisobni tekshiradi. Xona egasi oyna yoki aloqani yopsa, jang yakunlanadi. Boshqa qatnashchi chiqsa, o‘rnini bot egallaydi. Jang boshlangach yangi qatnashchilar kiritilmaydi.

[PeerJS](https://peerjs.com/client/getting-started) ommaviy signaling xizmati orqali brauzerlarni topadi; o‘yin ma’lumotlari WebRTC orqali uzatiladi. Ayrim NAT/firewall tarmoqlarida TURN relay serveri talab qilinadi. Ushbu versiyada maxsus TURN va doimiy ajratilgan server sozlanmagan. Shuning uchun har qanday ikki internet tarmog‘i orasidagi ulanish kafolatlanmaydi. Internetda musobaqa uchun serverdagi akkaunt, anti-cheat, doimiy ma’lumotlar bazasi, TURN va host almashish alohida ishlab chiqilishi kerak.

Bot rejimi signaling serveriga murojaat qilmaydi. Sayt bir marta yuklanganidan keyin shu sessiyadagi bot jangi internetni talab qilmaydi; bu PWA/offline qayta ochish kafolati emas.

## Tekshirish va yig‘ish

```sh
npm test
npm run lint
npm run build
```

Testlar jamoa o‘lchamlari, spawn, devorlar, sakrash, zarar, o‘qlash, himoya, hisob va vaqt tugashi, botlarning ikkala arenada jang qilishi hamda xona protokolini tekshiradi. Xona testlarida xotiradagi soxta transport ishlatiladi; bu haqiqiy ikkita qurilmadagi WebRTC sinovi emas. Joriy ishlab chiqish sessiyasida boshqariladigan brauzer mavjud bo‘lmagani sababli grafik ko‘rinish va haqiqiy ikki qurilma aloqasi avtomatik tekshirilmagan.

Vite `dist/` papkasini yaratadi. Uni HTTPS statik hostingda berish mumkin. `scripts/package-worker.mjs` shu yig‘ilgan fayllarni Sites uchun mustaqil Cloudflare Worker `dist/server/index.js` ichiga joylaydi. `.openai/hosting.json` Sites loyihasini belgilaydi. Private Sites manzili faqat egasiga ochiq; do‘stlarga kirish berish uchun hostingdagi ulashish sozlamasini o‘zgartirish kerak.

3D uchun [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) ishlatiladi va WebGL 2 talab qilinadi. Kuchsiz qurilmalar uchun Sozlamalarda grafikani **Yengil** qiling.

Asosiy manbalar: `src/game/simulation.js` — o‘yin qoidalari, `renderer.js` — 3D, `network.js` — xonalar, `Game.jsx` — boshqaruv va HUD, `config.js` — xarita/qurol/skinlar, `App.jsx` — menyu va profil.

Original menyu tasviri va ijtimoiy havola rasmi: [ASSETS.md](ASSETS.md).
