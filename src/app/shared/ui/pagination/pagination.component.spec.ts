import { visiblePages } from './pagination.component';

describe('visiblePages', () => {
  it('lists every page when there are few', () => {
    expect(visiblePages(0, 1)).toEqual([0]);
    expect(visiblePages(1, 3)).toEqual([0, 1, 2]);
  });

  it('marks gaps around the current page', () => {
    expect(visiblePages(5, 10)).toEqual([0, null, 4, 5, 6, null, 9]);
  });

  it('has a single gap at either end', () => {
    expect(visiblePages(0, 10)).toEqual([0, 1, null, 9]);
    expect(visiblePages(9, 10)).toEqual([0, null, 8, 9]);
  });
});
