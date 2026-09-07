import { describe, it, expect } from 'vitest';

describe('Attribute 3 Data Normalization & Validation Logic', () => {
  it('should correctly parse currency formatted strings into canonical numeric values', () => {
    const parseCurrency = (input: string | number): number | null => {
      if (typeof input === 'number') return isNaN(input) ? null : input;
      if (!input || input.trim() === '' || input === '-----') return null;
      // Strip Rs., commas, slashes, spaces, parentheses
      const clean = input.replace(/Rs\.?|INR|\/|-|\s|,|\(|\)/gi, '').trim();
      const num = parseFloat(clean);
      return isNaN(num) ? null : num;
    };

    expect(parseCurrency('Rs. 1,82,000/-')).toBe(182000);
    expect(parseCurrency('(Rs. 3,91000/- )')).toBe(391000);
    expect(parseCurrency('Rs. 4,40,04796')).toBe(44004796);
    expect(parseCurrency(427000)).toBe(427000);
    expect(parseCurrency('-----')).toBeNull();
  });

  it('should correctly calculate and format expenditure percentages without 100x scale error', () => {
    const calculateExpPercentage = (exp: number, totalExp: number): number => {
      if (totalExp <= 0) return 0;
      const rawDecimal = exp / totalExp;
      // Stored as percentage value (e.g. 0.41% stored as 0.41 or decimal fraction 0.0041)
      const percentVal = Number((rawDecimal * 100).toFixed(2));
      return percentVal;
    };

    // 2023-24: 1,82,000 / 4,40,04,796 = 0.0041359 => 0.41%
    expect(calculateExpPercentage(182000, 44004796)).toBe(0.41);

    // 2024-25: 3,91,000 / 3,52,51,137 = 0.01109 => 1.11%
    expect(calculateExpPercentage(391000, 35251137)).toBe(1.11);

    // 2025-26: 4,27,000 / 3,57,41,783 = 0.01194 => 1.19%
    expect(calculateExpPercentage(427000, 35741783)).toBe(1.19);
  });

  it('should parse and format Student-to-Computer ratios accurately', () => {
    const parseRatio = (students: number, computers: number) => {
      if (!computers || computers <= 0) return 'N/A';
      const ratio = Math.round(students / computers);
      return `1:${ratio} (${students})`;
    };

    // 2023-24: 4127 students / 258 computers = ~16
    expect(parseRatio(4127, 258)).toBe('1:16 (4127)');
    // 2024-25: 4526 students / 258 computers = ~18 (or 1:17 in sheet)
    expect(parseRatio(4526, 258)).toBe('1:18 (4526)');
    // 2025-26: 4731 students / 318 computers = ~15
    expect(parseRatio(4731, 318)).toBe('1:15 (4731)');
  });

  it('should flag multi-fold cross-year variance as review warnings', () => {
    const checkVariance = (valPrev: number, valCurr: number): string | null => {
      if (!valPrev || !valCurr) return null;
      const ratio = valCurr / valPrev;
      if (ratio > 3 || ratio < 0.3) {
        return `Value changed by ${Math.round(ratio * 100)}% compared to previous year. Please verify.`;
      }
      return null;
    };

    // 59 to 61 is normal
    expect(checkVariance(59, 61)).toBeNull();

    // 5000 to 2 is an extreme jump
    expect(checkVariance(5000, 2)).not.toBeNull();
  });
});
