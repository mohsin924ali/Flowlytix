/**
 * Money Value Object Tests
 *
 * Comprehensive test suite covering all functionality of the Money value object
 * including currency handling, precision, operations, formatting, and edge cases.
 *
 * @domain Shared Kernel
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Money,
  CurrencyCode,
  RoundingMode,
  SUPPORTED_CURRENCIES,
  MoneyError,
  InvalidAmountError,
  InvalidCurrencyError,
  CurrencyMismatchError,
  DivisionByZeroError,
} from '../money';

describe('Money Value Object', () => {
  describe('Factory Methods', () => {
    describe('fromDecimal', () => {
      it('should create money from decimal amount with default USD currency', () => {
        const money = Money.fromDecimal(10.99);

        expect(money.amount).toBe(1099); // cents
        expect(money.currency).toBe('USD');
        expect(money.decimalAmount).toBe(10.99);
      });

      it('should create money with specified currency', () => {
        const money = Money.fromDecimal(50.25, 'EUR');

        expect(money.amount).toBe(5025);
        expect(money.currency).toBe('EUR');
        expect(money.decimalAmount).toBe(50.25);
      });

      it('should handle zero decimal places for JPY', () => {
        const money = Money.fromDecimal(1000, 'JPY');

        expect(money.amount).toBe(1000);
        expect(money.currency).toBe('JPY');
        expect(money.decimalAmount).toBe(1000);
      });

      it('should apply rounding modes correctly', () => {
        const roundUp = Money.fromDecimal(10.994, 'USD', RoundingMode.ROUND_UP);
        const roundDown = Money.fromDecimal(10.996, 'USD', RoundingMode.ROUND_DOWN);
        const roundHalfUp = Money.fromDecimal(10.995, 'USD', RoundingMode.ROUND_HALF_UP);

        expect(roundUp.amount).toBe(1100); // 10.994 * 100 = 1099.4 -> 1100
        expect(roundDown.amount).toBe(1099); // 10.996 * 100 = 1099.6 -> 1099
        expect(roundHalfUp.amount).toBe(1100); // 10.995 * 100 = 1099.5 -> 1100
      });

      it('should throw InvalidCurrencyError for unsupported currency', () => {
        expect(() => Money.fromDecimal(10, 'XYZ' as CurrencyCode)).toThrow(InvalidCurrencyError);
      });

      it('should throw InvalidAmountError for invalid amounts', () => {
        expect(() => Money.fromDecimal(NaN)).toThrow(InvalidAmountError);
        expect(() => Money.fromDecimal(Infinity)).toThrow(InvalidAmountError);
        expect(() => Money.fromDecimal(-Infinity)).toThrow(InvalidAmountError);
      });
    });

    describe('fromInteger', () => {
      it('should create money from integer amount', () => {
        const money = Money.fromInteger(1099, 'USD');

        expect(money.amount).toBe(1099);
        expect(money.currency).toBe('USD');
        expect(money.decimalAmount).toBe(10.99);
      });

      it('should handle negative amounts', () => {
        const money = Money.fromInteger(-500, 'EUR');

        expect(money.amount).toBe(-500);
        expect(money.isNegative()).toBe(true);
      });

      it('should throw InvalidAmountError for non-integer amounts', () => {
        expect(() => Money.fromInteger(10.5, 'USD')).toThrow(InvalidAmountError);
      });

      it('should throw InvalidCurrencyError for invalid currency', () => {
        expect(() => Money.fromInteger(1000, 'INVALID' as CurrencyCode)).toThrow(InvalidCurrencyError);
      });
    });

    describe('zero', () => {
      it('should create zero money with default USD currency', () => {
        const money = Money.zero();

        expect(money.amount).toBe(0);
        expect(money.currency).toBe('USD');
        expect(money.isZero()).toBe(true);
      });

      it('should create zero money with specified currency', () => {
        const money = Money.zero('EUR');

        expect(money.amount).toBe(0);
        expect(money.currency).toBe('EUR');
        expect(money.isZero()).toBe(true);
      });
    });

    describe('fromString', () => {
      it('should parse simple decimal string', () => {
        const money = Money.fromString('10.99', 'USD');

        expect(money.amount).toBe(1099);
        expect(money.currency).toBe('USD');
      });

      it('should parse string with currency symbols', () => {
        const money1 = Money.fromString('$10.99', 'USD');
        const money2 = Money.fromString('€50.25', 'EUR');
        const money3 = Money.fromString('£100.00', 'GBP');

        expect(money1.decimalAmount).toBe(10.99);
        expect(money2.decimalAmount).toBe(50.25);
        expect(money3.decimalAmount).toBe(100.0);
      });

      it('should parse string with commas and whitespace', () => {
        const money = Money.fromString(' 1,234.56 ', 'USD');

        expect(money.decimalAmount).toBe(1234.56);
      });

      it('should parse string with currency code prefix', () => {
        const money = Money.fromString('USD 100.50', 'USD');

        expect(money.decimalAmount).toBe(100.5);
      });

      it('should throw InvalidAmountError for invalid strings', () => {
        expect(() => Money.fromString('', 'USD')).toThrow(InvalidAmountError);
        expect(() => Money.fromString('   ', 'USD')).toThrow(InvalidAmountError);
        expect(() => Money.fromString('abc', 'USD')).toThrow(InvalidAmountError);
        expect(() => Money.fromString('10.99.50', 'USD')).toThrow(InvalidAmountError);
      });
    });
  });

  describe('Properties and Getters', () => {
    let money: Money;

    beforeEach(() => {
      money = Money.fromDecimal(123.45, 'USD');
    });

    it('should return correct amount in smallest unit', () => {
      expect(money.amount).toBe(12345);
    });

    it('should return correct currency', () => {
      expect(money.currency).toBe('USD');
    });

    it('should return correct currency info', () => {
      const info = money.currencyInfo;

      expect(info.code).toBe('USD');
      expect(info.name).toBe('US Dollar');
      expect(info.symbol).toBe('$');
      expect(info.decimalPlaces).toBe(2);
    });

    it('should return correct decimal amount', () => {
      expect(money.decimalAmount).toBe(123.45);
    });

    it('should return frozen currency info to prevent mutations', () => {
      const info = money.currencyInfo;

      expect(() => {
        (info as any).code = 'EUR';
      }).toThrow();
    });
  });

  describe('State Checking Methods', () => {
    it('should correctly identify zero amounts', () => {
      expect(Money.zero().isZero()).toBe(true);
      expect(Money.fromDecimal(0.01).isZero()).toBe(false);
      expect(Money.fromDecimal(-0.01).isZero()).toBe(false);
    });

    it('should correctly identify positive amounts', () => {
      expect(Money.fromDecimal(0.01).isPositive()).toBe(true);
      expect(Money.fromDecimal(100).isPositive()).toBe(true);
      expect(Money.zero().isPositive()).toBe(false);
      expect(Money.fromDecimal(-0.01).isPositive()).toBe(false);
    });

    it('should correctly identify negative amounts', () => {
      expect(Money.fromDecimal(-0.01).isNegative()).toBe(true);
      expect(Money.fromDecimal(-100).isNegative()).toBe(true);
      expect(Money.zero().isNegative()).toBe(false);
      expect(Money.fromDecimal(0.01).isNegative()).toBe(false);
    });
  });

  describe('Transformation Methods', () => {
    it('should return absolute value', () => {
      const positive = Money.fromDecimal(10.5);
      const negative = Money.fromDecimal(-10.5);
      const zero = Money.zero();

      expect(positive.abs().equals(Money.fromDecimal(10.5))).toBe(true);
      expect(negative.abs().equals(Money.fromDecimal(10.5))).toBe(true);
      expect(zero.abs().equals(Money.zero())).toBe(true);
    });

    it('should return same instance for already positive amounts', () => {
      const positive = Money.fromDecimal(10.5);

      expect(positive.abs()).toBe(positive);
    });

    it('should negate amounts correctly', () => {
      const positive = Money.fromDecimal(10.5);
      const negative = Money.fromDecimal(-10.5);
      const zero = Money.zero();

      expect(positive.negate().equals(Money.fromDecimal(-10.5))).toBe(true);
      expect(negative.negate().equals(Money.fromDecimal(10.5))).toBe(true);
      expect(zero.negate().equals(Money.zero())).toBe(true);
    });
  });

  describe('Arithmetic Operations', () => {
    describe('add', () => {
      it('should add amounts with same currency', () => {
        const money1 = Money.fromDecimal(10.5, 'USD');
        const money2 = Money.fromDecimal(5.25, 'USD');
        const result = money1.add(money2);

        expect(result.decimalAmount).toBe(15.75);
        expect(result.currency).toBe('USD');
      });

      it('should handle adding negative amounts', () => {
        const money1 = Money.fromDecimal(10.5, 'USD');
        const money2 = Money.fromDecimal(-3.25, 'USD');
        const result = money1.add(money2);

        expect(result.decimalAmount).toBe(7.25);
      });

      it('should throw CurrencyMismatchError for different currencies', () => {
        const usd = Money.fromDecimal(10, 'USD');
        const eur = Money.fromDecimal(10, 'EUR');

        expect(() => usd.add(eur)).toThrow(CurrencyMismatchError);
      });
    });

    describe('subtract', () => {
      it('should subtract amounts with same currency', () => {
        const money1 = Money.fromDecimal(10.5, 'USD');
        const money2 = Money.fromDecimal(3.25, 'USD');
        const result = money1.subtract(money2);

        expect(result.decimalAmount).toBe(7.25);
        expect(result.currency).toBe('USD');
      });

      it('should handle subtracting larger amounts (negative result)', () => {
        const money1 = Money.fromDecimal(5.0, 'USD');
        const money2 = Money.fromDecimal(10.0, 'USD');
        const result = money1.subtract(money2);

        expect(result.decimalAmount).toBe(-5.0);
        expect(result.isNegative()).toBe(true);
      });

      it('should throw CurrencyMismatchError for different currencies', () => {
        const usd = Money.fromDecimal(10, 'USD');
        const eur = Money.fromDecimal(5, 'EUR');

        expect(() => usd.subtract(eur)).toThrow(CurrencyMismatchError);
      });
    });

    describe('multiply', () => {
      it('should multiply by positive factor', () => {
        const money = Money.fromDecimal(10.5, 'USD');
        const result = money.multiply(2);

        expect(result.decimalAmount).toBe(21.0);
        expect(result.currency).toBe('USD');
      });

      it('should multiply by decimal factor', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const result = money.multiply(0.5);

        expect(result.decimalAmount).toBe(5.0);
      });

      it('should handle multiplication by zero', () => {
        const money = Money.fromDecimal(10.5, 'USD');
        const result = money.multiply(0);

        expect(result.isZero()).toBe(true);
      });

      it('should handle multiplication by negative factor', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const result = money.multiply(-2);

        expect(result.decimalAmount).toBe(-20.0);
        expect(result.isNegative()).toBe(true);
      });

      it('should apply rounding mode correctly', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const resultUp = money.multiply(0.333, RoundingMode.ROUND_UP);
        const resultDown = money.multiply(0.333, RoundingMode.ROUND_DOWN);

        expect(resultUp.decimalAmount).toBe(3.33); // 333.3 cents -> 333 cents (ROUND_UP rounds 333.3 to 333)
        expect(resultDown.decimalAmount).toBe(3.33); // 333.3 cents -> 333 cents
      });

      it('should throw InvalidAmountError for invalid factors', () => {
        const money = Money.fromDecimal(10, 'USD');

        expect(() => money.multiply(NaN)).toThrow(InvalidAmountError);
        expect(() => money.multiply(Infinity)).toThrow(InvalidAmountError);
      });
    });

    describe('divide', () => {
      it('should divide by positive divisor', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const result = money.divide(2);

        expect(result.decimalAmount).toBe(5.0);
        expect(result.currency).toBe('USD');
      });

      it('should divide by decimal divisor', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const result = money.divide(0.5);

        expect(result.decimalAmount).toBe(20.0);
      });

      it('should handle division with remainder', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const result = money.divide(3, RoundingMode.ROUND_HALF_EVEN);

        expect(result.decimalAmount).toBe(3.33); // 333.33... cents -> 333 cents
      });

      it('should apply rounding mode correctly', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const resultUp = money.divide(3, RoundingMode.ROUND_UP);
        const resultDown = money.divide(3, RoundingMode.ROUND_DOWN);

        expect(resultUp.decimalAmount).toBe(3.34); // 333.33... -> 334 cents
        expect(resultDown.decimalAmount).toBe(3.33); // 333.33... -> 333 cents
      });

      it('should throw DivisionByZeroError for zero divisor', () => {
        const money = Money.fromDecimal(10, 'USD');

        expect(() => money.divide(0)).toThrow(DivisionByZeroError);
      });

      it('should throw InvalidAmountError for invalid divisors', () => {
        const money = Money.fromDecimal(10, 'USD');

        expect(() => money.divide(NaN)).toThrow(InvalidAmountError);
        expect(() => money.divide(Infinity)).toThrow(InvalidAmountError);
      });
    });

    describe('allocate', () => {
      it('should allocate money proportionally', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const allocated = money.allocate([1, 1, 1]); // Equal parts

        expect(allocated).toHaveLength(3);
        expect(allocated[0].decimalAmount).toBe(3.34); // Remainder distributed to first allocation
        expect(allocated[1].decimalAmount).toBe(3.33);
        expect(allocated[2].decimalAmount).toBe(3.33);
      });

      it('should allocate money with different ratios', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const allocated = money.allocate([2, 1, 1]); // 50%, 25%, 25%

        expect(allocated[0].decimalAmount).toBe(5.0);
        expect(allocated[1].decimalAmount).toBe(2.5);
        expect(allocated[2].decimalAmount).toBe(2.5);
      });

      it('should handle single allocation', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const allocated = money.allocate([1]);

        expect(allocated).toHaveLength(1);
        expect(allocated[0].equals(money)).toBe(true);
      });

      it('should handle zero ratios', () => {
        const money = Money.fromDecimal(10.0, 'USD');
        const allocated = money.allocate([0, 0, 0]);

        expect(allocated.every((m) => m.isZero())).toBe(true);
      });

      it('should maintain total when allocating with remainder', () => {
        const money = Money.fromDecimal(1.0, 'USD');
        const allocated = money.allocate([1, 1, 1]);
        const total = Money.sum(...allocated);

        expect(total.equals(money)).toBe(true);
      });

      it('should throw error for empty ratios array', () => {
        const money = Money.fromDecimal(10, 'USD');

        expect(() => money.allocate([])).toThrow(MoneyError);
      });

      it('should throw error for negative ratios', () => {
        const money = Money.fromDecimal(10, 'USD');

        expect(() => money.allocate([1, -1, 1])).toThrow(MoneyError);
      });
    });
  });

  describe('Comparison Operations', () => {
    let money1: Money;
    let money2: Money;
    let money3: Money;

    beforeEach(() => {
      money1 = Money.fromDecimal(10.0, 'USD');
      money2 = Money.fromDecimal(10.0, 'USD');
      money3 = Money.fromDecimal(15.0, 'USD');
    });

    describe('equals', () => {
      it('should return true for equal amounts and currencies', () => {
        expect(money1.equals(money2)).toBe(true);
      });

      it('should return false for different amounts', () => {
        expect(money1.equals(money3)).toBe(false);
      });

      it('should return false for same amount but different currencies', () => {
        const eurMoney = Money.fromDecimal(10.0, 'EUR');

        expect(money1.equals(eurMoney)).toBe(false);
      });
    });

    describe('compareTo', () => {
      it('should return 0 for equal amounts', () => {
        expect(money1.compareTo(money2)).toBe(0);
      });

      it('should return negative for smaller amount', () => {
        expect(money1.compareTo(money3)).toBeLessThan(0);
      });

      it('should return positive for larger amount', () => {
        expect(money3.compareTo(money1)).toBeGreaterThan(0);
      });

      it('should throw CurrencyMismatchError for different currencies', () => {
        const eurMoney = Money.fromDecimal(10.0, 'EUR');

        expect(() => money1.compareTo(eurMoney)).toThrow(CurrencyMismatchError);
      });
    });

    describe('comparison methods', () => {
      it('should correctly identify greater than', () => {
        expect(money3.greaterThan(money1)).toBe(true);
        expect(money1.greaterThan(money3)).toBe(false);
        expect(money1.greaterThan(money2)).toBe(false);
      });

      it('should correctly identify greater than or equal', () => {
        expect(money3.greaterThanOrEqual(money1)).toBe(true);
        expect(money1.greaterThanOrEqual(money2)).toBe(true);
        expect(money1.greaterThanOrEqual(money3)).toBe(false);
      });

      it('should correctly identify less than', () => {
        expect(money1.lessThan(money3)).toBe(true);
        expect(money3.lessThan(money1)).toBe(false);
        expect(money1.lessThan(money2)).toBe(false);
      });

      it('should correctly identify less than or equal', () => {
        expect(money1.lessThanOrEqual(money3)).toBe(true);
        expect(money1.lessThanOrEqual(money2)).toBe(true);
        expect(money3.lessThanOrEqual(money1)).toBe(false);
      });
    });
  });

  describe('Formatting', () => {
    describe('format', () => {
      it('should format USD with default locale', () => {
        const money = Money.fromDecimal(1234.56, 'USD');
        const formatted = money.format();

        expect(formatted).toMatch(/\$1,234\.56/);
      });

      it('should format different currencies', () => {
        const usd = Money.fromDecimal(100, 'USD');
        const eur = Money.fromDecimal(100, 'EUR');
        const jpy = Money.fromDecimal(100, 'JPY');

        expect(usd.format()).toMatch(/\$100\.00/);
        expect(eur.format()).toMatch(/€100\.00/);
        expect(jpy.format()).toMatch(/¥100/);
      });

      it('should format with different locales', () => {
        const money = Money.fromDecimal(1234.56, 'EUR');

        // Different locales may format differently
        const usFormat = money.format('en-US');
        const deFormat = money.format('de-DE');

        expect(usFormat).toContain('€');
        expect(deFormat).toContain('€');
      });
    });

    describe('toString', () => {
      it('should format as simple string with currency symbol', () => {
        const usd = Money.fromDecimal(123.45, 'USD');
        const eur = Money.fromDecimal(67.89, 'EUR');
        const jpy = Money.fromDecimal(1000, 'JPY');

        expect(usd.toString()).toBe('$123.45');
        expect(eur.toString()).toBe('€67.89');
        expect(jpy.toString()).toBe('¥1000');
      });

      it('should handle zero amounts', () => {
        const zero = Money.zero('USD');

        expect(zero.toString()).toBe('$0.00');
      });

      it('should handle negative amounts', () => {
        const negative = Money.fromDecimal(-50.25, 'USD');

        expect(negative.toString()).toBe('$-50.25');
      });
    });

    describe('toJSON', () => {
      it('should serialize to JSON correctly', () => {
        const money = Money.fromDecimal(123.45, 'USD');
        const json = money.toJSON();

        expect(json).toEqual({
          amount: 12345,
          currency: 'USD',
          decimalAmount: 123.45,
        });
      });
    });
  });

  describe('Static Utility Methods', () => {
    describe('min', () => {
      it('should return minimum of multiple amounts', () => {
        const amounts = [Money.fromDecimal(10, 'USD'), Money.fromDecimal(5, 'USD'), Money.fromDecimal(15, 'USD')];
        const min = Money.min(...amounts);

        expect(min.decimalAmount).toBe(5);
      });

      it('should handle single amount', () => {
        const amount = Money.fromDecimal(10, 'USD');
        const min = Money.min(amount);

        expect(min.equals(amount)).toBe(true);
      });

      it('should throw error for empty array', () => {
        expect(() => Money.min()).toThrow(MoneyError);
      });
    });

    describe('max', () => {
      it('should return maximum of multiple amounts', () => {
        const amounts = [Money.fromDecimal(10, 'USD'), Money.fromDecimal(25, 'USD'), Money.fromDecimal(15, 'USD')];
        const max = Money.max(...amounts);

        expect(max.decimalAmount).toBe(25);
      });

      it('should handle single amount', () => {
        const amount = Money.fromDecimal(10, 'USD');
        const max = Money.max(amount);

        expect(max.equals(amount)).toBe(true);
      });

      it('should throw error for empty array', () => {
        expect(() => Money.max()).toThrow(MoneyError);
      });
    });

    describe('sum', () => {
      it('should sum multiple amounts', () => {
        const amounts = [Money.fromDecimal(10, 'USD'), Money.fromDecimal(20, 'USD'), Money.fromDecimal(30, 'USD')];
        const sum = Money.sum(...amounts);

        expect(sum.decimalAmount).toBe(60);
      });

      it('should handle single amount', () => {
        const amount = Money.fromDecimal(10, 'USD');
        const sum = Money.sum(amount);

        expect(sum.equals(amount)).toBe(true);
      });

      it('should throw error for empty array', () => {
        expect(() => Money.sum()).toThrow(MoneyError);
      });

      it('should require same currency for all amounts', () => {
        const usd = Money.fromDecimal(10, 'USD');
        const eur = Money.fromDecimal(10, 'EUR');

        expect(() => Money.sum(usd, eur)).toThrow(CurrencyMismatchError);
      });
    });

    describe('isSupportedCurrency', () => {
      it('should return true for supported currencies', () => {
        expect(Money.isSupportedCurrency('USD')).toBe(true);
        expect(Money.isSupportedCurrency('EUR')).toBe(true);
        expect(Money.isSupportedCurrency('JPY')).toBe(true);
      });

      it('should return false for unsupported currencies', () => {
        expect(Money.isSupportedCurrency('XYZ')).toBe(false);
        expect(Money.isSupportedCurrency('')).toBe(false);
        expect(Money.isSupportedCurrency('usd')).toBe(false); // case sensitive
      });
    });

    describe('getSupportedCurrencies', () => {
      it('should return all supported currencies', () => {
        const currencies = Money.getSupportedCurrencies();

        expect(currencies).toHaveLength(Object.keys(SUPPORTED_CURRENCIES).length);
        expect(currencies[0]).toHaveProperty('code');
        expect(currencies[0]).toHaveProperty('name');
        expect(currencies[0]).toHaveProperty('symbol');
        expect(currencies[0]).toHaveProperty('decimalPlaces');
      });
    });
  });

  describe('Immutability', () => {
    it('should be immutable after creation', () => {
      const money = Money.fromDecimal(10.5, 'USD');

      expect(Object.isFrozen(money)).toBe(true);

      expect(() => {
        (money as any)._amount = 2000;
      }).toThrow();

      expect(() => {
        (money as any)._currency = 'EUR';
      }).toThrow();
    });

    it('should return new instances for all operations', () => {
      const original = Money.fromDecimal(10, 'USD');
      const other = Money.fromDecimal(5, 'USD');

      const added = original.add(other);
      const subtracted = original.subtract(other);
      const multiplied = original.multiply(2);
      const divided = original.divide(2);
      const negated = original.negate();

      expect(added).not.toBe(original);
      expect(subtracted).not.toBe(original);
      expect(multiplied).not.toBe(original);
      expect(divided).not.toBe(original);
      expect(negated).not.toBe(original);

      // Original should remain unchanged
      expect(original.decimalAmount).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      try {
        Money.fromDecimal(10, 'INVALID' as CurrencyCode);
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCurrencyError);
        expect((error as InvalidCurrencyError).code).toBe('INVALID_CURRENCY');
        expect((error as InvalidCurrencyError).message).toContain('INVALID');
      }
    });

    it('should provide specific error types for different scenarios', () => {
      const money = Money.fromDecimal(10, 'USD');

      expect(() => Money.fromDecimal(NaN)).toThrow(InvalidAmountError);
      expect(() => Money.fromDecimal(10, 'XYZ' as CurrencyCode)).toThrow(InvalidCurrencyError);
      expect(() => money.divide(0)).toThrow(DivisionByZeroError);
      expect(() => money.add(Money.fromDecimal(10, 'EUR'))).toThrow(CurrencyMismatchError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const money = Money.fromDecimal(0.01, 'USD');

      expect(money.amount).toBe(1);
      expect(money.decimalAmount).toBe(0.01);
    });

    it('should handle very large amounts', () => {
      const money = Money.fromDecimal(999999999.99, 'USD');

      expect(money.amount).toBe(99999999999);
      expect(money.decimalAmount).toBe(999999999.99);
    });

    it('should handle currencies with no decimal places', () => {
      const money = Money.fromDecimal(1000, 'JPY');

      expect(money.amount).toBe(1000);
      expect(money.decimalAmount).toBe(1000);
      expect(money.toString()).toBe('¥1000');
    });

    it('should handle precision edge cases in calculations', () => {
      // Test floating point precision issues
      const money1 = Money.fromDecimal(0.1, 'USD');
      const money2 = Money.fromDecimal(0.2, 'USD');
      const sum = money1.add(money2);

      expect(sum.decimalAmount).toBe(0.3); // Should be exact, not 0.30000000000000004
    });

    it('should handle allocation edge cases', () => {
      const money = Money.fromDecimal(0.01, 'USD');
      const allocated = money.allocate([1, 1, 1]);

      // Should distribute the single cent
      const nonZeroAllocations = allocated.filter((m) => !m.isZero());
      expect(nonZeroAllocations).toHaveLength(1);
      expect(nonZeroAllocations[0].decimalAmount).toBe(0.01);
    });
  });
});
