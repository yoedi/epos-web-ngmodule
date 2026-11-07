---
name: buat-layar
description: Membuat satu layar baru di aplikasi ePOS dari PRD — module, routing, component, mock service, dan seluruh state-nya. Pakai saat diminta mengerjakan sebuah halaman/layar.
---

# Membuat satu layar ePOS

Argumen: nama layar dan nomor poin PRD, misalnya "Daftar Produk 9.5".

## Langkah

1. Baca poin PRD yang disebut di `docs/PRD-ePOS-Toko-Kelontong.md`.
2. Baca endpoint terkait di `docs/api-spec.md` — jangan mengarang field.
3. Kalau ada `docs/design/<layar>.png`, pakai sebagai acuan tata letak.
4. Buat struktur sesuai CLAUDE.md bagian 2 dan 3:
   - Fitur CRUD: `models/`, `services/`, `components/`, module + routing module
   - Fitur `cashier`: lapisan penuh (domain / application / data / presentation)
5. Buat mock service yang memenuhi kontrak yang sama, didaftarkan lewat
   `providers`. Data contoh dari PRD poin 12. Jangan menanam data di component.
6. Lengkapi empat state: normal, kosong, loading (skeleton), error.
7. Daftarkan route di `app-routing.module.ts` dengan `loadChildren`,
   plus `RoleGuard` bila layar itu khusus OWNER (PRD poin 6).

## Aturan yang tidak boleh dilanggar

- Semua teks UI Bahasa Indonesia, verbatim dari PRD.
- Hanya variabel dari `src/styles/tokens.css`; tidak ada nilai warna atau
  ukuran yang ditulis langsung.
- Tabel pakai CSS grid, bukan `<table>`. Head 34px, body row 66px.
- Semua angka pakai JetBrains Mono + `tabular-nums`.
- Semua component `standalone: false`, dideklarasikan di module-nya.
- Elemen semantik asli: `<button>`, `<a href>`, `<input>` + `<label>`.

## Setelah selesai

Laporkan singkat: file apa saja yang dibuat, route-nya apa, dan apa yang
perlu diuji manual.
