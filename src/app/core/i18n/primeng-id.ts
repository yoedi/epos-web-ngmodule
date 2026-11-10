import { Translation } from 'primeng/api';

/**
 * Indonesian texts for PrimeNG built-ins (date picker month and day names,
 * buttons). The UI is Indonesian throughout (CLAUDE.md section 5).
 */
export const PRIMENG_ID: Translation = {
  dayNames: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  dayNamesShort: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
  dayNamesMin: ['Mg', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb'],
  monthNames: [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ],
  // Same abbreviations as Angular's `id` locale, so the picker matches DatePipe output.
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  firstDayOfWeek: 1,
  today: 'Hari ini',
  clear: 'Hapus',
  chooseDate: 'Pilih tanggal',
  prevMonth: 'Bulan sebelumnya',
  nextMonth: 'Bulan berikutnya',
  prevYear: 'Tahun sebelumnya',
  nextYear: 'Tahun berikutnya',
  emptyMessage: 'Tidak ada pilihan',
  emptyFilterMessage: 'Tidak ada hasil',
};
