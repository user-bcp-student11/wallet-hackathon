import { formatPenCents } from './pen-cents.pipe';

describe('formatPenCents', () => {
  it('convierte céntimos a soles', () => {
    expect(formatPenCents(100000)).toMatch(/S\/\s?1,000\.00/);
    expect(formatPenCents(38000)).toMatch(/S\/\s?380\.00/);
    expect(formatPenCents(0)).toMatch(/S\/\s?0\.00/);
  });
});
