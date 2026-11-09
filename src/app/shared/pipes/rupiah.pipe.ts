import { Pipe, PipeTransform } from '@angular/core';

import { formatRupiah } from '../utils/money';

/** The only way to display money: `{{ total$ | async | rupiah }}`. */
@Pipe({ name: 'rupiah', standalone: false })
export class RupiahPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return value === null || value === undefined ? '' : formatRupiah(value);
  }
}
