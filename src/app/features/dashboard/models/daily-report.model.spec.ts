import {
  DailyReportDto,
  chartScale,
  fillHours,
  toDailyReport,
} from './daily-report.model';

describe('daily report model', () => {
  describe('fillHours', () => {
    it('fills 08:00–20:00 with zero for hours without sales', () => {
      const hours = fillHours([
        { hour: 9, total: 340000, transactionCount: 5 },
      ]);

      expect(hours.map((h) => h.hour)).toEqual([
        8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ]);
      expect(hours[0]).toEqual({ hour: 8, total: 0, transactionCount: 0 });
      expect(hours[1]).toEqual({ hour: 9, total: 340000, transactionCount: 5 });
    });

    it('widens the range for sales outside opening hours', () => {
      const hours = fillHours([
        { hour: 7, total: 20000, transactionCount: 1 },
        { hour: 21, total: 15000, transactionCount: 1 },
      ]);

      expect(hours[0].hour).toBe(7);
      expect(hours[hours.length - 1].hour).toBe(21);
    });
  });

  describe('chartScale', () => {
    it('rounds the peak up on its second digit (mockup 3a)', () => {
      expect(chartScale(1090000)).toEqual({
        max: 1100000,
        ticks: [1100000, 550000, 0],
      });
    });

    it('keeps the middle tick a whole number', () => {
      const { ticks } = chartScale(3700);

      expect(Number.isInteger(ticks[1])).toBeTrue();
      expect(ticks[0]).toBeGreaterThanOrEqual(3700);
    });

    it('is flat without sales', () => {
      expect(chartScale(0)).toEqual({ max: 0, ticks: [0, 0, 0] });
    });
  });

  it('maps the DTO to the app model', () => {
    const dto: DailyReportDto = {
      date: '2026-09-16',
      total_revenue: 1875000,
      transaction_count: 23,
      average_transaction: 81521,
      low_stock_count: 1,
      hourly_sales: [{ hour: 8, total: 125000, transaction_count: 2 }],
      top_products: [
        {
          product_id: 5,
          sku: 'MIE-001',
          product_name: 'Mi Instan Goreng',
          qty_sold: 45,
          total: 157500,
        },
      ],
      low_stock_products: [
        {
          product_id: 2,
          sku: 'MYK-002',
          product_name: 'Minyak Goreng 2 L',
          stock: 3,
          min_stock: 12,
          stock_status: 'LOW_STOCK',
        },
      ],
    };

    const report = toDailyReport(dto);

    expect(report.totalRevenue).toBe(1875000);
    expect(report.averageTransaction).toBe(81521);
    expect(report.hourlySales.length).toBe(13);
    expect(report.topProducts[0]).toEqual({
      productId: 5,
      sku: 'MIE-001',
      name: 'Mi Instan Goreng',
      qtySold: 45,
      total: 157500,
    });
    expect(report.lowStockProducts[0]).toEqual({
      productId: 2,
      sku: 'MYK-002',
      name: 'Minyak Goreng 2 L',
      stock: 3,
      minStock: 12,
      status: 'LOW_STOCK',
    });
  });
});
