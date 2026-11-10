import { Component, Input, OnChanges } from '@angular/core';

import {
  ChartScale,
  HourlySales,
  chartScale,
} from '../../models/daily-report.model';

interface Bar extends HourlySales {
  /** Bar height as a share of the plot, 0–100. */
  percent: number;
}

/**
 * "Penjualan per Jam" bar chart (PRD 9.4, mockup 3a). One series, so no legend:
 * the card title names it. The hovered bar, or else the hour in progress, is
 * highlighted with its total above it. Screen readers get the figures as a list.
 */
@Component({
  selector: 'app-hourly-sales-chart',
  templateUrl: './hourly-sales-chart.component.html',
  styleUrl: './hourly-sales-chart.component.css',
  standalone: false,
})
export class HourlySalesChartComponent implements OnChanges {
  /** Every hour of the range, empty hours included (see fillHours). */
  @Input({ required: true }) hours: readonly HourlySales[] = [];
  /** Hour in progress, or null for a past day. */
  @Input() currentHour: number | null = null;

  bars: Bar[] = [];
  scale: ChartScale = chartScale(0);
  hoveredHour: number | null = null;

  ngOnChanges(): void {
    this.scale = chartScale(Math.max(0, ...this.hours.map((h) => h.total)));
    this.bars = this.hours.map((h) => ({
      ...h,
      percent: this.scale.max === 0 ? 0 : (h.total / this.scale.max) * 100,
    }));
  }

  /** Hovered bar first; otherwise the hour in progress, if it has sales. */
  get activeHour(): number | null {
    if (this.hoveredHour !== null) {
      return this.hoveredHour;
    }
    const current = this.bars.find((b) => b.hour === this.currentHour);
    return current && current.total > 0 ? current.hour : null;
  }
}
