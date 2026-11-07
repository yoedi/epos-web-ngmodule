# ePOS — Design System

Hasil desain yang sudah dikunci di Claude Design. Layar Kasir adalah sumber kebenarannya; seluruh layar lain memakai token dan gaya komponen yang sama.

**Implementasi:** `src/styles/tokens.css` (variabel CSS, sumber kebenaran) dan `src/styles/theme.css` (pemetaan ke PrimeNG). Jangan menulis nilai warna atau ukuran langsung di komponen — selalu lewat variabel.

---

## 1. Tipografi

Dua font, dimuat dari Google Fonts di `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
```

| Peran                 | Font           | Ukuran | Weight | Catatan                         |
| --------------------- | -------------- | ------ | ------ | ------------------------------- |
| Judul halaman & kartu | IBM Plex Sans  | 14.5px | 600    | `letter-spacing: -.01em`        |
| Body                  | IBM Plex Sans  | 13.5px | 400    |                                 |
| Nama barang di tabel  | IBM Plex Sans  | 15px   | 600    | satu baris, ellipsis            |
| Teks sekunder / SKU   | JetBrains Mono | 11px   | 400    |                                 |
| Label overline        | IBM Plex Sans  | 10.5px | 600    | uppercase, `.08em`, warna muted |
| kbd chip              | JetBrains Mono | 10.5px | 400    |                                 |
| TOTAL layar kasir     | JetBrains Mono | 52px   | 700    | `line-height: 1`, `-.035em`     |

**Aturan penting:** semua angka — nominal uang, SKU, nomor invoice, tanggal/jam, isi kbd chip — memakai JetBrains Mono dengan `font-variant-numeric: tabular-nums`, supaya kolom harga di tabel rata.

Format: uang `Rp 144.500`, tanggal `18 Sep 2026, 14:32`.

---

## 2. Warna

Seluruh warna ditulis dalam `oklch`. Mode terang:

### Primary

| Token                         | Nilai                                     |
| ----------------------------- | ----------------------------------------- |
| `--c-primary`                 | `oklch(.50 .16 254)`                      |
| `--c-primary-hover`           | `oklch(.45 .16 254)`                      |
| `--c-primary-deep`            | `oklch(.42 .15 254)` — bevel tombol utama |
| `--c-primary-tint-bg`         | `oklch(.962 .018 254)`                    |
| `--c-primary-tint-border`     | `oklch(.90 .04 254)`                      |
| `--c-primary-tint-ink`        | `oklch(.45 .10 254)`                      |
| `--c-primary-tint-ink-strong` | `oklch(.28 .06 254)`                      |
| `--c-avatar-bg`               | `oklch(.94 .03 254)`                      |

### Semantik

| Peran              | Token                 | Nilai                |
| ------------------ | --------------------- | -------------------- |
| Sukses / kembalian | `--c-success`         | `oklch(.55 .13 152)` |
| Stok menipis       | `--c-warning`         | `oklch(.72 .15 70)`  |
| — chip bg          | `--c-warning-bg`      | `oklch(.95 .05 80)`  |
| — chip border      | `--c-warning-border`  | `oklch(.87 .08 78)`  |
| — chip ink         | `--c-warning-ink`     | `oklch(.45 .10 70)`  |
| Error / hapus      | `--c-danger`          | `oklch(.55 .19 25)`  |
| — hover bg         | `--c-danger-hover-bg` | `oklch(.96 .02 25)`  |

### Permukaan & border

| Token                  | Nilai                  | Dipakai untuk                  |
| ---------------------- | ---------------------- | ------------------------------ |
| `--c-surface`          | `oklch(.991 .003 255)` | kartu — **bukan** `#fff` murni |
| `--c-canvas`           | `oklch(.953 .005 255)` | latar aplikasi                 |
| `--c-fill-table-head`  | `oklch(.966 .005 255)` | head tabel                     |
| `--c-fill-card-footer` | `oklch(.968 .004 255)` | footer kartu                   |
| `--c-fill-row-hover`   | `oklch(.96 .006 255)`  | hover baris                    |
| `--c-border`           | `oklch(.90 .008 255)`  | tepi kartu, border tegas       |
| `--c-border-inner`     | `oklch(.94 .006 255)`  | pembatas dalam                 |
| `--c-border-row`       | `oklch(.96 .006 255)`  | pembatas baris tabel           |

### Teks

| Token               | Nilai                                    |
| ------------------- | ---------------------------------------- |
| `--c-ink`           | `oklch(.25 .015 255)`                    |
| `--c-ink-secondary` | `oklch(.48 .015 255)`                    |
| `--c-ink-muted`     | `oklch(.62 .012 255)` — label & overline |

### Mode gelap

**Belum ada di desain.** Varian mode gelap belum dibuat di Claude Design. `tokens.css` sudah memuat satu set turunan sementara agar aplikasi tidak rusak di perangkat bermode gelap, tapi nilainya **bukan** hasil desain dan harus diganti setelah mockup gelapnya tersedia.

---

## 3. Spasi, Radius, Bentuk

**Skala spasi:** 4 / 8 / 12 / 16 / 18. Padding konten `16px 18px`, jarak antar kartu 12–16px.

**Radius:** kartu 12 · input besar 10 · kontrol & tombol 9 · icon tile 8 · kbd 4 · pill 999.

**Kartu:** `--c-surface` + border 1px `--c-border` + `box-shadow: 0 1px 2px rgba(20,30,50,.04)`.

**Focus:** border 2px primary + `box-shadow: 0 0 0 3px oklch(.93 .025 254)`.

**Target klik:** minimal 38px di layar kasir (stepper 38, tombol utama 68). Halaman admin boleh lebih padat. Di HP minimal 44px.

---

## 4. Gaya Komponen

### Shell

Sidebar 208px saat terbuka, 60px saat menciut. Menu yang tidak diizinkan **disembunyikan**, bukan dinonaktifkan. Header 56px berisi nama toko + alamat, pembatas, tanggal-jam (mono), pill pengguna ("Rina Lestari / Kasir"), dan tombol Keluar. Footer 34px opsional berisi kbd chip petunjuk pintasan.

### Tombol utama

68px di layar kasir, 44px di tempat lain. Background primary, teks putih 700, dengan bevel:

```css
box-shadow: 0 2px 0 var(--c-primary-deep), 0 4px 12px oklch(0.5 0.16 254 / 0.18);
```

Menyertakan kbd chip mono di dalamnya (misalnya "F9") di atas latar putih transparan.

### Tombol sekunder

44px, latar surface + border, teks `oklch(.45 .015 255)`. Hover bernuansa merah bila aksinya destruktif.

### Tabel

Head row 34px (10.5px, 600, `.07em`, uppercase, warna muted). Body row 66px. Border baris 1px. **Pakai CSS grid, bukan elemen `<table>`.** Nama barang satu baris dengan ellipsis.

### Stepper qty

Lebar total 126px, tombol − dan + masing-masing 38px, angka mono 15px 600.

### kbd chip

Mono 10.5px, border 1px dengan border-bottom 2px, radius 4.

### Badge

Pill (radius 999), 10–10.5px, 600. **Selalu disertai ikon atau teks**, tidak mengandalkan warna saja.

---

## 5. Artboard & Breakpoint

Ukuran acuan desain: laptop 1366×768 dan 1920×1080, tablet 1024×768, HP 390×844.

Breakpoint implementasi:

| Rentang    | Perilaku                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| ≥1280px    | layout utama, sidebar penuh                                                                                             |
| 768–1279px | sidebar menciut jadi ikon, layar kasir tetap dua kolom                                                                  |
| <768px     | sidebar jadi bottom navigation, tabel jadi daftar kartu, form satu kolom, drawer jadi bottom sheet, target sentuh ≥44px |

Layar Kasir di HP belum didukung di v1; tampilkan pesan bahwa layar kasir tersedia di laptop atau tablet.

---

## 6. Catatan Migrasi dari Mockup

Mockup di Claude Design memakai **inline style dengan nilai literal berulang**, tanpa CSS class atau variabel. Itu wajar untuk alat desain, tapi **jangan ditiru di kode Angular**. Saat memindahkannya:

1. Ganti setiap nilai literal dengan variabel dari `tokens.css`.
2. Ganti inline style dengan CSS di file `.css` komponen.
3. Untuk komponen PrimeNG, cukup andalkan `theme.css`; jangan menimpa gaya per komponen kecuali memang perlu.
4. Pertahankan struktur semantik: `<button>`, `<a href>`, `<input>` + `<label>` yang asli, bukan `div` dengan `role`.

Mockup tetap jadi acuan tampilan, bukan sumber kode untuk disalin mentah.

---

## 7. Daftar Halaman Desain

Tersimpan di canvas Claude Design:

| Halaman                          | Isi                                                     |
| -------------------------------- | ------------------------------------------------------- |
| Layar Kasir                      | keranjang terisi (sumber kebenaran design system)       |
| Layar Kasir - Pembayaran         | modal bayar, layar sukses, state error                  |
| Layar Kasir - Tablet             | versi tablet landscape                                  |
| Dashboard                        | kartu statistik, grafik per jam, stok menipis, terlaris |
| Daftar Produk                    | tabel + form tambah/edit                                |
| Riwayat Transaksi                | tabel + detail struk                                    |
| Stok dan Kategori                | stok masuk, penyesuaian, kategori                       |
| Login dan Struk                  | halaman login + struk 58mm                              |
| Design Tokens                    | palet, tipografi, spasi, radius, komponen               |
| Versi HP                         | Dashboard, Produk, Riwayat, Login                       |
| Admin/Kasir/Produk/Riwayat Shell | varian shell per konteks                                |
