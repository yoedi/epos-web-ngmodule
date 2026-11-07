# ePOS Web (NgModule) — Panduan Proyek

Frontend Angular untuk aplikasi kasir (POS) toko kelontong, dibangun dengan **gaya NgModule** (Angular klasik). Backend Spring Boot berada di repo terpisah (`epos-api`) dan diakses lewat REST API.

> **Catatan:** repo ini sengaja memakai NgModule untuk mempelajari dan menyiapkan diri menghadapi basis kode Angular lama. Versi standalone dari aplikasi yang sama dibangun di repo terpisah.

Dokumen acuan: `docs/PRD-ePOS-Toko-Kelontong.md` (layar di poin 9, pola responsif di poin 7), `docs/api-spec.md` (kontrak API), dan `docs/design-system.md` (token & gaya komponen hasil desain).

---

## 1. Tech Stack

| Bagian     | Pilihan                                                          |
| ---------- | ---------------------------------------------------------------- |
| Framework  | Angular 18, **NgModule-based** (`--no-standalone`)               |
| Bahasa     | TypeScript, `strict: true`                                       |
| State      | RxJS (`BehaviorSubject` + `async` pipe) — gaya klasik, disengaja |
| UI library | PrimeNG + PrimeIcons                                             |
| Styling    | CSS variables dari token desain                                  |
| HTTP       | `HttpClient` + class-based interceptor                           |
| Form       | Reactive Forms                                                   |
| Testing    | Karma + Jasmine (bawaan CLI)                                     |

**Aturan repo ini:** seluruh component, directive, dan pipe dideklarasikan di NgModule (`standalone: false`). Jangan membuat standalone component di repo ini, meskipun Angular mendukungnya — konsistensi gaya adalah tujuan repo ini.

**Dilarang:** NgRx atau library state management lain. Proyek ini sengaja dijaga sederhana.

---

## 2. Struktur Folder

```
src/app/
├── app.module.ts                  # modul root
├── app-routing.module.ts
├── app.component.ts
│
├── core/
│   ├── core.module.ts             # HANYA boleh diimpor AppModule
│   ├── auth/
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts          # class implements CanActivate
│   │   ├── role.guard.ts
│   │   └── token.storage.ts
│   ├── http/
│   │   ├── auth.interceptor.ts    # class implements HttpInterceptor
│   │   ├── error.interceptor.ts
│   │   └── api-error.model.ts
│   └── layout/
│       ├── shell/
│       ├── sidebar/
│       └── bottom-nav/
│
├── shared/
│   ├── shared.module.ts           # deklarasi + ekspor UI bersama & modul PrimeNG
│   ├── ui/
│   │   ├── stat-card/
│   │   ├── stock-badge/
│   │   ├── empty-state/
│   │   ├── money-input/
│   │   └── confirm-dialog/
│   ├── pipes/rupiah.pipe.ts
│   └── utils/money.ts
│
└── features/
    ├── auth/          auth.module.ts + auth-routing.module.ts + login/
    ├── cashier/       LAPISAN PENUH (lihat bagian 3)
    ├── product/       module + routing + models/ + services/ + components/
    ├── category/
    ├── stock/
    ├── sale-history/
    └── dashboard/
```

### Aturan modul

- **`CoreModule`** hanya diimpor oleh `AppModule`. Tambahkan guard constructor agar kesalahan ini ketahuan:
  ```ts
  constructor(@Optional() @SkipSelf() parent: CoreModule) {
    if (parent) throw new Error('CoreModule hanya boleh diimpor AppModule');
  }
  ```
- **`SharedModule`** mendeklarasikan dan mengekspor komponen UI bersama, pipe, `CommonModule`, `FormsModule`, `ReactiveFormsModule`, dan modul PrimeNG yang dipakai banyak fitur. **Tidak boleh** berisi `providers` service (hindari instance ganda saat lazy load).
- **Setiap feature module** mengimpor `SharedModule` dan routing module-nya sendiri, serta dimuat lazy lewat `loadChildren`.
- Service milik satu fitur didaftarkan di `providers` feature module-nya; service lintas fitur memakai `providedIn: 'root'`.

---

## 3. Arsitektur

Proyek ini memakai **pendekatan jalan tengah**, bukan clean architecture di semua fitur.

### 3.1 Fitur `cashier` — lapisan penuh

Satu-satunya fitur dengan aturan bisnis nyata:

```
cashier/
├── cashier.module.ts
├── cashier-routing.module.ts
├── domain/
│   ├── models/        cart.ts, cart-item.ts, payment.ts   (kelas TS murni)
│   ├── errors/        cart.errors.ts
│   └── repositories/  sale.repository.ts  (abstract class)
├── application/       add-to-cart.use-case.ts, scan-barcode.use-case.ts, checkout.use-case.ts
├── data/              dto/, mappers/, repositories/sale-http.repository.ts
└── presentation/
    ├── components/    cashier-page/, product-search/, cart-table/,
    │                  payment-modal/, success-panel/, receipt-print/
    └── state/         cashier.store.ts   (BehaviorSubject)
```

Pengikatan abstract class ke implementasinya dilakukan di `cashier.module.ts`:

```ts
@NgModule({
  declarations: [CashierPageComponent, ProductSearchComponent, CartTableComponent, ...],
  imports: [SharedModule, CashierRoutingModule],
  providers: [
    { provide: SaleRepository, useClass: SaleHttpRepository },
    CheckoutUseCase,
    AddToCartUseCase,
  ],
})
export class CashierModule { }
```

Aturan:

- `domain/` **tidak boleh** mengimpor apa pun dari `@angular/*`, `rxjs`, atau `data/`.
- Aturan keranjang (validasi stok, hitung total, hitung kembalian) hidup di kelas `Cart` dan `Payment`, bukan di component atau service.
- Use case memanggil abstract repository, bukan `HttpClient`.
- `Cart` bersifat immutable: setiap operasi mengembalikan instance baru.

### 3.2 Fitur lain — ringkas

`product`, `category`, `stock`, `sale-history`, `dashboard` cukup: `models/`, `services/`, `components/`, plus module dan routing module. Alasannya hanya CRUD. **Jangan** menambahkan use case atau repository abstrak di fitur-fitur ini tanpa diminta.

### 3.3 Aturan umum

1. Component tidak memanggil `HttpClient` langsung — selalu lewat service atau use case.
2. DTO dari API tidak pernah dipakai langsung di template; petakan dulu ke model aplikasi.
3. `core/` tidak boleh mengimpor dari `features/`.
4. `shared/` tidak boleh mengimpor dari `features/` maupun `core/`.

---

## 4. State dengan RxJS

Repo ini memakai gaya klasik secara sengaja:

```ts
@Injectable()
export class CashierStore {
  private cartSubject = new BehaviorSubject<Cart>(Cart.empty());
  readonly cart$ = this.cartSubject.asObservable();
  readonly total$ = this.cart$.pipe(map((c) => c.total));

  add(product: Product, qty: number): void {
    this.cartSubject.next(this.cartSubject.value.add(product, qty));
  }
}
```

Di template memakai `async` pipe:

```html
<span class="total">{{ total$ | async | rupiah }}</span>
```

Aturan:

- Setiap `subscribe()` manual di component wajib di-unsubscribe (`takeUntilDestroyed` atau pola `destroy$`). Utamakan `async` pipe agar tidak perlu unsubscribe.
- Jangan memanggil `.value` pada `BehaviorSubject` di dalam template.
- Operator pencarian memakai `debounceTime(300)` + `distinctUntilChanged()` + `switchMap`.

---

## 5. Konvensi

| Jenis          | Pola                                    | Contoh                                     |
| -------------- | --------------------------------------- | ------------------------------------------ |
| File           | `kebab-case` + sufiks peran             | `product-list.component.ts`                |
| Component      | `*.component.ts`, kelas `*Component`    | `CartTableComponent`                       |
| Module         | `*.module.ts`                           | `CashierModule`                            |
| Routing module | `*-routing.module.ts`                   | `ProductRoutingModule`                     |
| Selector       | prefix `app-`                           | `app-stock-badge`                          |
| Route path     | Bahasa Indonesia                        | `/kasir`, `/produk`, `/transaksi`, `/stok` |
| DTO            | `*Dto`, field `snake_case` (sesuai API) | `ProductDto.sell_price`                    |
| Model aplikasi | `camelCase`                             | `Product.sellPrice`                        |
| Observable     | sufiks `$`                              | `cart$`, `total$`                          |

Teks antarmuka seluruhnya **Bahasa Indonesia**. Nama variabel, komentar, dan commit dalam Bahasa Inggris.

---

## 6. Aturan Teknis Penting

- **Uang** selalu `number` berisi bilangan bulat rupiah. Format tampilan hanya lewat `| rupiah`. Dilarang melakukan pembulatan atau perhitungan desimal di frontend.
- **Total transaksi tidak pernah dikirim ke server.** `POST /sales` hanya mengirim `product_id` dan `qty`; total dari response server-lah yang ditampilkan.
- **Validasi stok di frontend bersifat UX saja.** Server tetap sumber kebenaran; tangani error `INSUFFICIENT_STOCK` dari API.
- **Layar Kasir wajib bisa dioperasikan penuh dengan keyboard** (PRD poin 9.2): F2 fokus pencarian, F9 bayar, Enter konfirmasi, +/− ubah qty, Delete hapus item, Esc tutup modal. Fokus kembali ke input pencarian setiap kali item ditambahkan. Gunakan `@HostListener('window:keydown', ...)`.
- **Keranjang tidak boleh hilang saat transaksi gagal disimpan.** Tampilkan error dan sediakan tombol coba lagi.
- **Cegah klik ganda** pada tombol "Selesaikan Transaksi" dengan flag `submitting`.
- Setiap layar wajib punya state: normal, kosong, loading (skeleton), dan error.

---

## 7. Penanganan Error

`ErrorInterceptor` mengubah `ProblemDetail` dari Spring Boot menjadi `AppError`:

```ts
export interface AppError {
  code: string; // INSUFFICIENT_STOCK, INSUFFICIENT_PAYMENT, dst.
  message: string; // pesan Bahasa Indonesia dari server, siap ditampilkan
  status: number;
  fieldErrors?: { field: string; message: string }[];
}
```

Didaftarkan di `AppModule`:

```ts
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
];
```

Aturan tampilan:

- `VALIDATION_ERROR` → tampilkan per field di form, bukan toast.
- `INSUFFICIENT_STOCK`, `INSUFFICIENT_PAYMENT` → inline di konteksnya (keranjang atau modal pembayaran), bukan toast.
- `UNAUTHORIZED` → hapus token, arahkan ke `/login`.
- `FORBIDDEN` → pesan "tidak berwenang".
- Sisanya → toast error.

Daftar lengkap kode error ada di `docs/api-spec.md`.

---

## 8. Styling & Tema

- Acuan lengkap: **`docs/design-system.md`** — token, gaya komponen, dan breakpoint dari desain yang sudah dikunci (Layar Kasir adalah sumber kebenarannya).
- `styles/tokens.css` berisi variabel CSS (warna `oklch`, tipografi, spasi, radius, ukuran komponen). **Ini sumber kebenaran di kode**; jangan menulis nilai warna atau ukuran langsung di component.
- `styles/theme.css` memetakan token tersebut ke variabel `--p-*` PrimeNG. Urutan di `angular.json`: `tokens.css` → `theme.css` → `print.css`.
- `styles/print.css` untuk struk 58 mm (`@media print`).
- **Font:** IBM Plex Sans untuk UI; **JetBrains Mono untuk semua angka** (uang, SKU, nomor invoice, tanggal-jam, kbd chip) dengan `font-variant-numeric: tabular-nums` agar kolom harga rata. Dimuat dari Google Fonts di `index.html`.
- **Tabel memakai CSS grid, bukan elemen `<table>`** — head row 34px, body row 66px, nama barang satu baris dengan ellipsis.
- **Mode gelap belum ada di desain.** Nilai gelap di `tokens.css` hanya turunan sementara agar tampilan tidak rusak, bukan hasil desain. Jangan membangun atau menyetel ulang layar untuk mode gelap sampai mockup-nya tersedia.
- Mockup desain memakai inline style dengan nilai literal berulang (normal untuk alat desain). **Jangan disalin mentah**: pindahkan ke CSS component dengan variabel dari `tokens.css`, dan pertahankan elemen semantik asli (`<button>`, `<a href>`, `<input>` + `<label>`), bukan `div` dengan `role`.

---

## 9. Responsif

Sesuai PRD poin 7:

- **Laptop** (≥1280px): layout utama, sidebar penuh.
- **Tablet** (768–1279px): sidebar menciut jadi ikon. Layar Kasir tetap dua kolom.
- **HP** (<768px): sidebar diganti bottom navigation, tabel jadi daftar kartu, form satu kolom, drawer jadi bottom sheet, target sentuh minimal 44px.
- **Layar Kasir di HP belum didukung di v1.** Tampilkan pesan ramah bahwa layar kasir tersedia di laptop atau tablet.

---

## 10. Autentikasi

- Token JWT disimpan di `localStorage`, dibaca lewat `TokenStorage`.
- `AuthInterceptor` menyisipkan header `Authorization: Bearer <token>`, kecuali untuk `/auth/login`.
- `AuthGuard` melindungi seluruh rute di dalam shell; `RoleGuard` (data `{ role: 'OWNER' }` di route) melindungi Dashboard dan Stok.
- Menu yang tidak diizinkan **disembunyikan**, bukan sekadar dinonaktifkan (PRD poin 6).
- Setelah login: CASHIER diarahkan ke `/kasir`, OWNER ke `/dashboard`.

---

## 11. Menjalankan Proyek

```bash
npm install
npm start           # ng serve, port 4200, proxy /api → localhost:8080
npm test
npm run build
```

`proxy.conf.json` meneruskan `/api/*` ke `http://localhost:8080` agar tidak berurusan dengan CORS saat pengembangan.

**Mode mock:** selama backend belum siap, `SaleRepository` dan service fitur lain diganti implementasi mock lewat `providers` di module terkait, dengan data contoh dari PRD poin 12.

### Perintah generate

```bash
ng generate module features/product --routing
ng generate component features/product/components/product-list --standalone=false
ng generate service features/product/services/product
ng generate guard core/auth/auth
```

---

## 12. Testing

Prioritas, bukan mengejar coverage:

1. **Unit test `Cart` dan `Payment`** di `cashier/domain/` — tanpa Angular, harus cepat. Wajib mencakup: tambah item, qty melebihi stok, produk habis, hitung total, hitung kembalian, uang kurang.
2. **Unit test** `RupiahPipe` dan util `money.ts`.
3. **Component test** Layar Kasir dengan `TestBed`: alur scan → tambah → bayar → sukses, serta tampilan state error.

---

## 13. Catatan untuk Asisten AI

- **Baca `docs/api-spec.md`** sebelum membuat service atau model baru. Bentuk request/response sudah ditetapkan; jangan mengarang field.
- **Repo ini NgModule-based.** Setiap component baru wajib `standalone: false` dan dideklarasikan di module yang sesuai. Jangan mengubahnya ke standalone, jangan menyarankan migrasi, dan jangan mencampur kedua gaya.
- **Kerjakan satu fitur sekaligus**, jangan menyebar perubahan ke banyak fitur dalam satu langkah.
- **Jangan menambah dependency baru** tanpa diminta.
- **Jangan menambah lapisan domain/use-case di fitur CRUD** (product, category, stock, sale-history, dashboard).
- **Jangan menulis nilai warna atau ukuran langsung**; pakai token di `styles/tokens.css`.
- **Jangan menanam data dummy di dalam component.** Mock selalu berupa implementasi service/repository yang didaftarkan lewat provider.
- Jika spesifikasi ambigu, **tanyakan dulu**, jangan berasumsi.
