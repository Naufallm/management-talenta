# Aset ilustrasi UKO — 9 November 2026

## Versi doodle yang dipakai saat ini

- Aset login final: [public/assets/uko-login-doodles-hd.svg](../public/assets/uko-login-doodles-hd.svg), ilustrasi vektor dengan viewBox 1000 × 1800. Dibuat sebagai aset SVG asli dengan garis lengkung, spiral, zigzag, sparkle, dan titik; tetap tajam saat diperbesar tanpa memperbesar bitmap. Dipakai oleh Auth.tsx pada panel melengkung yang sama.
- Konsep visual: [public/assets/uko-login-doodles-v2.png](../public/assets/uko-login-doodles-v2.png), PNG 941 × 1672 dari tool imagegen bawaan. Disimpan sebagai referensi komposisi; file SVG adalah aset yang ditampilkan pada login. Resolusi PNG hasil tool dicatat sesuai file, tidak diklaim sebagai 4K.
- Arah baru lebih lega dan teratur, dengan indigo #2c3cdd, navy #151927, coral #ff987a, dan pink #fa6097. Beranda memakai palet yang sama.
- Referensi pola sejenis: [Flat abstract doodle pattern — Freepik](https://www.freepik.com/free-vector/flat-abstract-doodle-pattern-design_22768950.htm) dan [Blue Abstract Doodles Seamless Pattern — Motion Array](https://motionarray.com/graphics/blue-abstract-doodles-seamless-pattern-1607860/). Referensi tersebut tidak diunduh sebagai aset aplikasi.

Prompt konsep final (tool imagegen bawaan, tanpa gambar input):

```text
Create a premium high-definition decorative artwork asset for the right panel of an Indonesian talent management login page. This is an ORIGINAL abstract doodle pattern, not a page, mockup or screenshot. Output portrait artwork at 2160 x 3840 pixels if possible, with extremely crisp clean flat vector-like edges, smooth solid uniform strokes, pure white background #FFFFFF, NO paper grain, NO brush texture, NO shadows, NO 3D, NO blur. Art direction: sophisticated playful editorial Memphis-inspired line art. About 20-28 large distinct free-form shapes across the whole composition: flowing rounded loops, elegant open spirals, ribbons, bold rounded zigzags, organic geometric arcs, small four-point sparkles and a few dots. More considered breathing room and calmer spacing than a dense graffiti wall, with a cohesive rhythm and varied scale. Color proportions: 55% indigo #2C3CDD, 18% deep navy #151927, 17% soft coral #FF987A, 10% rose pink #FA6097. Keep plenty of clean white negative space between individual shapes (around half of the canvas) while distributing shapes all the way to the outer edges, so the artwork still looks intentional under an elliptical crop. Use bold confident smooth line work with softly rounded ends. Large shapes must look refined and unambiguous, not like letters or numbers. No people, faces, eyes, hearts, hands, logos, numbers, lettering, words, text, UI elements, borders, watermarks or gradients. Create only the beautiful standalone pattern artwork, suitable for a modern white and indigo UKO-inspired institutional web interface.
```

## Aset versi sebelumnya

Dibuat memakai tool bawaan `image_gen` melalui skill imagegen, bukan CLI. Gambar pengguna menjadi referensi gaya/subjek; hasilnya aset ilustrasi tersendiri, bukan screenshot UI yang dipasang sebagai halaman. Logo BPS tetap memakai aset logo yang sudah ada.

| Aset final                                                                    | Pemakaian                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [public/assets/uko-login-doodles.png](../public/assets/uko-login-doodles.png) | PNG 1024 × 1536, pola doodle pada panel kanan login; dipotong secara responsif dengan CSS ellipse. |
| [public/assets/uko-error-monitor.png](../public/assets/uko-error-monitor.png) | PNG transparan 1448 × 1086, ilustrasi monitor pada halaman 404 dan fallback error aplikasi.        |

Referensi lokal: `Sign In V-1.png` dan `Error Page.png` yang dilampirkan pengguna. Sumber asli tidak diubah. Teks, input, tombol, dan tautan aplikasi tetap berupa HTML/React.

## Prompt final: doodle login

```text
Create a production website illustration asset using the attached image as STYLE REFERENCE ONLY. Output ONLY the dense hand-drawn doodle artwork from the right side, reconstructed as a full portrait composition with all-over white background. Bold playful organic ink squiggles, outlined abstract arrow-like loops, rounded zigzags, tiny dots and primitive shapes in royal indigo #2b3cdd, very dark navy #131726, coral #ff987a, pink #fa6097 and muted gray #8b8e92. Large varied expressive marks, high contrast crisp flat vector-like strokes, balanced density like the reference. Portrait 2:3 composition, filled edge-to-edge, no large blank zones, pure white between marks. No letters, no words, no logo, no form, no buttons, no UI, no borders, no screen mockup. This will be clipped into a curved right-hand login art panel.
```

`transparent_background: false`; reference: `Sign In V-1.png`.

## Prompt final: monitor error

```text
Create a production website error illustration using the attached image as STYLE AND SUBJECT REFERENCE. Isolate and reconstruct ONLY the sad computer monitor illustration, no text or UI. A simple flat vector-like desktop monitor tilted slightly clockwise with bright light-blue frame #63a5ff, dark navy screen #293454, two large pale X-shaped eyes and a downturned curved mouth. Pale periwinkle circular backdrop behind the monitor, simple pale gray stand and subtle rounded horizontal base shadow. Centered complete illustration, close resemblance in composition and clean geometric style to the reference monitor, friendly not scary, no gradients or texture, crisp edges. Transparent background around the full illustration. Landscape 4:3 canvas, tight useful framing with small padding. No 404 number, no words, no logo, no page, no buttons.
```

`transparent_background: true`; reference: `Error Page.png`.
