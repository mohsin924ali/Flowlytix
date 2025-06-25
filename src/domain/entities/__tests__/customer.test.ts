/**
 * Customer Entity Tests
 *
 * Comprehensive test suite for Customer entity covering all business logic,
 * validation rules, state transitions, credit management, and edge cases.
 *
 * Test Structure:
 * - Creation and validation
 * - Business logic methods
 * - Credit management
 * - Status transitions
 * - Information updates
 * - Error handling
 * - Edge cases
 *
 * @domain Customer Management Testing
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  Customer,
  CustomerStatus,
  CustomerType,
  PaymentTerms,
  CustomerProps,
  CustomerAddress,
  CustomerContact,
  CustomerDomainError,
  CustomerValidationError,
  InvalidCustomerCodeError,
  InsufficientCreditError,
  CustomerStatusError,
  InvalidAddressError,
} from '../customer';
import { Email } from '../../value-objects/email';
import { Money } from '../../value-objects/money';

describe('Customer Entity', () => {
  let validCustomerProps: CustomerProps;
  let validAddress: CustomerAddress;
  let validContact: CustomerContact;

  beforeEach(() => {
    validAddress = {
      street: '123 Main Street',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
      isDefault: true,
      addressType: 'BOTH',
    };

    validContact = {
      name: 'John Doe',
      title: 'Manager',
      email: new Email('john.doe@example.com'),
      phone: '+1-555-0123',
      mobile: '+1-555-0124',
      isPrimary: true,
    };

    validCustomerProps = {
      customerCode: 'CUST001',
      companyName: 'Acme Corporation',
      firstName: 'John',
      lastName: 'Smith',
      customerType: CustomerType.CORPORATE,
      email: new Email('john.smith@acme.com'),
      phone: '+1-555-0100',
      mobile: '+1-555-0101',
      addresses: [validAddress],
      contacts: [validContact],
      creditLimit: Money.fromDecimal(50000, 'USD'),
      paymentTerms: PaymentTerms.NET_30,
      taxNumber: 'TAX123456',
      website: 'https://www.acme.com',
      notes: 'Premium customer',
      agencyId: 'agency_123',
      createdBy: 'user_123',
    };
  });

  describe('Customer Creation', () => {
    it('should create customer with valid properties', () => {
      const customer = Customer.create(validCustomerProps);

      expect(customer.id).toBeDefined();
      expect(customer.customerCode).toBe('CUST001');
      expect(customer.companyName).toBe('Acme Corporation');
      expect(customer.firstName).toBe('John');
      expect(customer.lastName).toBe('Smith');
      expect(customer.fullName).toBe('Acme Corporation - John Smith');
      expect(customer.customerType).toBe(CustomerType.CORPORATE);
      expect(customer.status).toBe(CustomerStatus.PENDING_APPROVAL);
      expect(customer.email.value).toBe('john.smith@acme.com');
      expect(customer.creditLimit.decimalAmount).toBe(50000);
      expect(customer.outstandingBalance.decimalAmount).toBe(0);
      expect(customer.availableCredit.decimalAmount).toBe(50000);
      expect(customer.paymentTerms).toBe(PaymentTerms.NET_30);
      expect(customer.agencyId).toBe('agency_123');
    });

    it('should create customer without company name', () => {
      const props = { ...validCustomerProps };
      delete (props as any).companyName;
      const customer = Customer.create(props);

      expect(customer.companyName).toBeNull();
      expect(customer.fullName).toBe('John Smith');
    });

    it('should create customer with minimal required fields', () => {
      const minimalProps: CustomerProps = {
        customerCode: 'MIN001',
        firstName: 'Jane',
        lastName: 'Doe',
        customerType: CustomerType.RETAIL,
        email: new Email('jane@example.com'),
        addresses: [validAddress],
        creditLimit: Money.fromDecimal(1000, 'USD'),
        paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
        agencyId: 'agency_123',
        createdBy: 'user_123',
      };

      const customer = Customer.create(minimalProps);
      expect(customer.firstName).toBe('Jane');
      expect(customer.lastName).toBe('Doe');
      expect(customer.companyName).toBeNull();
      expect(customer.phone).toBeNull();
      expect(customer.contacts).toHaveLength(0);
    });

    it('should generate unique IDs for different customers', () => {
      const customer1 = Customer.create(validCustomerProps);
      const customer2 = Customer.create(validCustomerProps);

      expect(customer1.id).not.toBe(customer2.id);
    });

    it('should be immutable after creation', () => {
      const customer = Customer.create(validCustomerProps);
      expect(Object.isFrozen(customer)).toBe(true);
    });
  });

  describe('Customer Code Validation', () => {
    it('should reject empty customer code', () => {
      const props = { ...validCustomerProps, customerCode: '' };
      expect(() => Customer.create(props)).toThrow(InvalidCustomerCodeError);
    });

    it('should reject customer code exceeding 30 characters', () => {
      const props = { ...validCustomerProps, customerCode: 'A'.repeat(31) };
      expect(() => Customer.create(props)).toThrow(InvalidCustomerCodeError);
    });

    it('should reject customer code with invalid characters', () => {
      const props = { ...validCustomerProps, customerCode: 'CUST@001' };
      expect(() => Customer.create(props)).toThrow(InvalidCustomerCodeError);
    });

    it('should accept valid customer codes', () => {
      const validCodes = ['CUST001', 'ABC-123', 'CUSTOMER_001', 'C1-2-3'];

      validCodes.forEach((code) => {
        const props = { ...validCustomerProps, customerCode: code };
        expect(() => Customer.create(props)).not.toThrow();
      });
    });
  });

  describe('Name Validation', () => {
    it('should reject empty first name', () => {
      const props = { ...validCustomerProps, firstName: '' };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });

    it('should reject empty last name', () => {
      const props = { ...validCustomerProps, lastName: '' };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });

    it('should reject names exceeding 50 characters', () => {
      const longName = 'A'.repeat(51);

      expect(() => Customer.create({ ...validCustomerProps, firstName: longName })).toThrow(CustomerValidationError);
      expect(() => Customer.create({ ...validCustomerProps, lastName: longName })).toThrow(CustomerValidationError);
    });

    it('should reject company name exceeding 100 characters', () => {
      const longCompanyName = 'A'.repeat(101);
      const props = { ...validCustomerProps, companyName: longCompanyName };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });
  });

  describe('Credit Limit Validation', () => {
    it('should reject negative credit limit', () => {
      const props = {
        ...validCustomerProps,
        creditLimit: Money.fromDecimal(-1000, 'USD'),
      };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });

    it('should accept zero credit limit', () => {
      const props = {
        ...validCustomerProps,
        creditLimit: Money.fromDecimal(0, 'USD'),
      };
      expect(() => Customer.create(props)).not.toThrow();
    });
  });

  describe('Address Validation', () => {
    it('should require at least one address', () => {
      const props = { ...validCustomerProps, addresses: [] };
      expect(() => Customer.create(props)).toThrow(InvalidAddressError);
    });

    it('should reject more than 10 addresses', () => {
      const addresses = Array(11).fill(validAddress);
      const props = { ...validCustomerProps, addresses };
      expect(() => Customer.create(props)).toThrow(InvalidAddressError);
    });

    it('should reject multiple default addresses', () => {
      const addresses = [
        { ...validAddress, isDefault: true },
        { ...validAddress, isDefault: true, street: '456 Oak St' },
      ];
      const props = { ...validCustomerProps, addresses };
      expect(() => Customer.create(props)).toThrow(InvalidAddressError);
    });

    it('should reject addresses with missing required fields', () => {
      const invalidAddress = { ...validAddress, street: '' };
      const props = { ...validCustomerProps, addresses: [invalidAddress] };
      expect(() => Customer.create(props)).toThrow(InvalidAddressError);
    });
  });

  describe('Contact Validation', () => {
    it('should reject more than 10 contacts', () => {
      const contacts = Array(11).fill(validContact);
      const props = { ...validCustomerProps, contacts };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });

    it('should reject multiple primary contacts', () => {
      const contacts = [
        { ...validContact, isPrimary: true },
        { ...validContact, isPrimary: true, name: 'Jane Smith' },
      ];
      const props = { ...validCustomerProps, contacts };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });

    it('should reject contacts with empty names', () => {
      const contacts = [{ ...validContact, name: '' }];
      const props = { ...validCustomerProps, contacts };
      expect(() => Customer.create(props)).toThrow(CustomerValidationError);
    });
  });

  describe('Business Logic Methods', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = Customer.create(validCustomerProps);
    });

    describe('canPlaceOrders', () => {
      it('should return false for pending approval status', () => {
        expect(customer.canPlaceOrders()).toBe(false);
      });

      it('should return true for active status', () => {
        const activeCustomer = customer.activate('user_123');
        expect(activeCustomer.canPlaceOrders()).toBe(true);
      });

      it('should return false for inactive status', () => {
        const inactiveCustomer = customer.deactivate('user_123');
        expect(inactiveCustomer.canPlaceOrders()).toBe(false);
      });
    });

    describe('hasSufficientCredit', () => {
      it('should return true when amount is within credit limit', () => {
        const activeCustomer = customer.activate('user_123');
        const amount = Money.fromDecimal(25000, 'USD');
        expect(activeCustomer.hasSufficientCredit(amount)).toBe(true);
      });

      it('should return false when amount exceeds available credit', () => {
        const activeCustomer = customer.activate('user_123');
        const amount = Money.fromDecimal(60000, 'USD');
        expect(activeCustomer.hasSufficientCredit(amount)).toBe(false);
      });

      it('should account for outstanding balance', () => {
        const activeCustomer = customer.activate('user_123').reserveCredit(Money.fromDecimal(30000, 'USD'), 'user_123');

        const amount = Money.fromDecimal(25000, 'USD');
        expect(activeCustomer.hasSufficientCredit(amount)).toBe(false);
      });

      it('should throw error for currency mismatch', () => {
        const activeCustomer = customer.activate('user_123');
        const amount = Money.fromDecimal(1000, 'EUR');
        expect(() => activeCustomer.hasSufficientCredit(amount)).toThrow(CustomerValidationError);
      });
    });

    describe('getCreditUtilization', () => {
      it('should return 0 for zero credit limit', () => {
        const zeroLimitProps = {
          ...validCustomerProps,
          creditLimit: Money.fromDecimal(0, 'USD'),
        };
        const zeroLimitCustomer = Customer.create(zeroLimitProps);
        expect(zeroLimitCustomer.getCreditUtilization()).toBe(0);
      });

      it('should calculate utilization percentage correctly', () => {
        const activeCustomer = customer.activate('user_123').reserveCredit(Money.fromDecimal(25000, 'USD'), 'user_123');

        expect(activeCustomer.getCreditUtilization()).toBe(50);
      });
    });

    describe('isHighValueCustomer', () => {
      it('should return false for new customer with no orders', () => {
        const threshold = Money.fromDecimal(10000, 'USD');
        expect(customer.isHighValueCustomer(threshold)).toBe(false);
      });

      it('should return true when total orders exceed threshold', () => {
        let customerWithPurchases = customer
          .activate('user_123')
          .recordPurchase('order_001', new Date(), Money.fromDecimal(15000, 'USD'), 'user_123');

        const threshold = Money.fromDecimal(10000, 'USD');
        expect(customerWithPurchases.isHighValueCustomer(threshold)).toBe(true);
      });
    });

    describe('getDaysSinceLastOrder', () => {
      it('should return null for customer with no orders', () => {
        expect(customer.getDaysSinceLastOrder()).toBeNull();
      });

      it('should calculate days since last order', () => {
        const orderDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
        const customerWithOrder = customer
          .activate('user_123')
          .recordPurchase('order_001', orderDate, Money.fromDecimal(1000, 'USD'), 'user_123');

        const daysSince = customerWithOrder.getDaysSinceLastOrder();
        expect(daysSince).toBeGreaterThanOrEqual(4);
        expect(daysSince).toBeLessThanOrEqual(6);
      });
    });

    describe('getDefaultAddress', () => {
      it('should return default address when marked', () => {
        const defaultAddress = customer.getDefaultAddress();
        expect(defaultAddress).toEqual(validAddress);
      });

      it('should return first address when none marked as default', () => {
        const addresses = [
          { ...validAddress, isDefault: false },
          { ...validAddress, street: '456 Oak St', isDefault: false },
        ];
        const props = { ...validCustomerProps, addresses };
        const customerNoDefault = Customer.create(props);

        const defaultAddress = customerNoDefault.getDefaultAddress();
        expect(defaultAddress!.street).toBe('123 Main Street');
      });
    });

    describe('getPrimaryContact', () => {
      it('should return primary contact when marked', () => {
        const primaryContact = customer.getPrimaryContact();
        expect(primaryContact!.name).toBe('John Doe');
      });

      it('should return first contact when none marked as primary', () => {
        const contacts = [
          { ...validContact, isPrimary: false },
          { ...validContact, name: 'Jane Smith', isPrimary: false },
        ];
        const props = { ...validCustomerProps, contacts };
        const customerNoPrimary = Customer.create(props);

        const primaryContact = customerNoPrimary.getPrimaryContact();
        expect(primaryContact!.name).toBe('John Doe');
      });
    });
  });

  describe('Status Management', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = Customer.create(validCustomerProps);
    });

    describe('activate', () => {
      it('should activate pending customer', () => {
        const activeCustomer = customer.activate('user_123');
        expect(activeCustomer.status).toBe(CustomerStatus.ACTIVE);
        expect(activeCustomer.updatedBy).toBe('user_123');
        expect(activeCustomer.updatedAt).toBeDefined();
      });

      it('should not activate blacklisted customer', () => {
        const blacklistedCustomer = customer.blacklist('user_123', 'Fraud');
        expect(() => blacklistedCustomer.activate('user_123')).toThrow(CustomerStatusError);
      });
    });

    describe('deactivate', () => {
      it('should deactivate any customer', () => {
        const activeCustomer = customer.activate('user_123');
        const inactiveCustomer = activeCustomer.deactivate('user_123');

        expect(inactiveCustomer.status).toBe(CustomerStatus.INACTIVE);
      });
    });

    describe('suspend', () => {
      it('should suspend customer with reason', () => {
        const suspendedCustomer = customer.suspend('user_123', 'Payment issues');

        expect(suspendedCustomer.status).toBe(CustomerStatus.SUSPENDED);
        expect(suspendedCustomer.notes).toContain('Suspension reason: Payment issues');
      });

      it('should suspend customer without reason', () => {
        const suspendedCustomer = customer.suspend('user_123');
        expect(suspendedCustomer.status).toBe(CustomerStatus.SUSPENDED);
      });
    });

    describe('blacklist', () => {
      it('should blacklist customer with reason', () => {
        const blacklistedCustomer = customer.blacklist('user_123', 'Fraudulent activity');

        expect(blacklistedCustomer.status).toBe(CustomerStatus.BLACKLISTED);
        expect(blacklistedCustomer.notes).toContain('Blacklisted: Fraudulent activity');
      });
    });

    describe('approve', () => {
      it('should approve pending customer', () => {
        const approvedCustomer = customer.approve('user_123');
        expect(approvedCustomer.status).toBe(CustomerStatus.ACTIVE);
      });

      it('should not approve non-pending customer', () => {
        const activeCustomer = customer.activate('user_123');
        expect(() => activeCustomer.approve('user_123')).toThrow(CustomerStatusError);
      });
    });
  });

  describe('Credit Management', () => {
    let activeCustomer: Customer;

    beforeEach(() => {
      activeCustomer = Customer.create(validCustomerProps).activate('user_123');
    });

    describe('updateCreditLimit', () => {
      it('should update credit limit with history', () => {
        const newLimit = Money.fromDecimal(75000, 'USD');
        const updatedCustomer = activeCustomer.updateCreditLimit(
          newLimit,
          'Business expansion',
          'user_123',
          'Approved by credit committee'
        );

        expect(updatedCustomer.creditLimit.decimalAmount).toBe(75000);
        expect(updatedCustomer.creditLimitHistory).toHaveLength(1);

        const historyEntry = updatedCustomer.creditLimitHistory[0]!;
        expect(historyEntry.previousLimit.decimalAmount).toBe(50000);
        expect(historyEntry.newLimit.decimalAmount).toBe(75000);
        expect(historyEntry.reason).toBe('Business expansion');
        expect(historyEntry.notes).toBe('Approved by credit committee');
      });

      it('should reject negative credit limit', () => {
        const negativeLimit = Money.fromDecimal(-1000, 'USD');
        expect(() => activeCustomer.updateCreditLimit(negativeLimit, 'Test', 'user_123')).toThrow(
          CustomerValidationError
        );
      });

      it('should reject currency mismatch', () => {
        const differentCurrencyLimit = Money.fromDecimal(1000, 'EUR');
        expect(() => activeCustomer.updateCreditLimit(differentCurrencyLimit, 'Test', 'user_123')).toThrow(
          CustomerValidationError
        );
      });
    });

    describe('reserveCredit', () => {
      it('should reserve available credit', () => {
        const reserveAmount = Money.fromDecimal(25000, 'USD');
        const updatedCustomer = activeCustomer.reserveCredit(reserveAmount, 'user_123');

        expect(updatedCustomer.outstandingBalance.decimalAmount).toBe(25000);
        expect(updatedCustomer.availableCredit.decimalAmount).toBe(25000);
      });

      it('should reject reservation exceeding available credit', () => {
        const excessiveAmount = Money.fromDecimal(60000, 'USD');
        expect(() => activeCustomer.reserveCredit(excessiveAmount, 'user_123')).toThrow(InsufficientCreditError);
      });
    });

    describe('releaseCredit', () => {
      it('should release reserved credit', () => {
        const reservedCustomer = activeCustomer.reserveCredit(Money.fromDecimal(25000, 'USD'), 'user_123');

        const releaseAmount = Money.fromDecimal(10000, 'USD');
        const updatedCustomer = reservedCustomer.releaseCredit(releaseAmount, 'user_123');

        expect(updatedCustomer.outstandingBalance.decimalAmount).toBe(15000);
        expect(updatedCustomer.availableCredit.decimalAmount).toBe(35000);
      });

      it('should reject release exceeding outstanding balance', () => {
        const excessiveAmount = Money.fromDecimal(60000, 'USD');
        expect(() => activeCustomer.releaseCredit(excessiveAmount, 'user_123')).toThrow(CustomerValidationError);
      });
    });

    describe('recordPayment', () => {
      it('should record payment against outstanding balance', () => {
        const customerWithBalance = activeCustomer.reserveCredit(Money.fromDecimal(25000, 'USD'), 'user_123');

        const paymentAmount = Money.fromDecimal(10000, 'USD');
        const updatedCustomer = customerWithBalance.recordPayment(paymentAmount, 'user_123');

        expect(updatedCustomer.outstandingBalance.decimalAmount).toBe(15000);
      });

      it('should reject payment exceeding outstanding balance', () => {
        const paymentAmount = Money.fromDecimal(60000, 'USD');
        expect(() => activeCustomer.recordPayment(paymentAmount, 'user_123')).toThrow(CustomerValidationError);
      });
    });
  });

  describe('Purchase History', () => {
    let activeCustomer: Customer;

    beforeEach(() => {
      activeCustomer = Customer.create(validCustomerProps).activate('user_123');
    });

    describe('recordPurchase', () => {
      it('should record new purchase and update statistics', () => {
        const orderDate = new Date();
        const orderAmount = Money.fromDecimal(15000, 'USD');

        const updatedCustomer = activeCustomer.recordPurchase('order_001', orderDate, orderAmount, 'user_123');

        expect(updatedCustomer.purchaseHistory).toHaveLength(1);
        expect(updatedCustomer.lastOrderDate).toEqual(orderDate);
        expect(updatedCustomer.totalOrdersCount).toBe(1);
        expect(updatedCustomer.totalOrdersValue.decimalAmount).toBe(15000);
        expect(updatedCustomer.averageOrderValue.decimalAmount).toBe(15000);

        const purchaseEntry = updatedCustomer.purchaseHistory[0]!;
        expect(purchaseEntry.orderId).toBe('order_001');
        expect(purchaseEntry.totalAmount.decimalAmount).toBe(15000);
        expect(purchaseEntry.paymentStatus).toBe('PENDING');
      });

      it('should update statistics correctly for multiple purchases', () => {
        let customerWithPurchases = activeCustomer
          .recordPurchase('order_001', new Date(), Money.fromDecimal(10000, 'USD'), 'user_123')
          .recordPurchase('order_002', new Date(), Money.fromDecimal(20000, 'USD'), 'user_123');

        expect(customerWithPurchases.totalOrdersCount).toBe(2);
        expect(customerWithPurchases.totalOrdersValue.decimalAmount).toBe(30000);
        expect(customerWithPurchases.averageOrderValue.decimalAmount).toBe(15000);
      });
    });
  });

  describe('Information Updates', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = Customer.create(validCustomerProps);
    });

    describe('updateBasicInfo', () => {
      it('should update basic customer information', () => {
        const updates = {
          companyName: 'New Company Name',
          firstName: 'Jane',
          lastName: 'Johnson',
          phone: '+1-555-9999',
          mobile: '+1-555-8888',
          taxNumber: 'NEW123456',
          website: 'https://www.newcompany.com',
          notes: 'Updated notes',
        };

        const updatedCustomer = customer.updateBasicInfo(updates, 'user_123');

        expect(updatedCustomer.companyName).toBe('New Company Name');
        expect(updatedCustomer.firstName).toBe('Jane');
        expect(updatedCustomer.lastName).toBe('Johnson');
        expect(updatedCustomer.phone).toBe('+1-555-9999');
        expect(updatedCustomer.mobile).toBe('+1-555-8888');
        expect(updatedCustomer.taxNumber).toBe('NEW123456');
        expect(updatedCustomer.website).toBe('https://www.newcompany.com');
        expect(updatedCustomer.notes).toBe('Updated notes');
        expect(updatedCustomer.updatedBy).toBe('user_123');
      });

      it('should validate updated fields', () => {
        const updates = { firstName: '' };
        expect(() => customer.updateBasicInfo(updates, 'user_123')).toThrow(CustomerValidationError);
      });
    });

    describe('updateEmail', () => {
      it('should update email address', () => {
        const newEmail = new Email('newemail@example.com');
        const updatedCustomer = customer.updateEmail(newEmail, 'user_123');

        expect(updatedCustomer.email.value).toBe('newemail@example.com');
        expect(updatedCustomer.updatedBy).toBe('user_123');
      });
    });

    describe('updatePaymentTerms', () => {
      it('should update payment terms', () => {
        const updatedCustomer = customer.updatePaymentTerms(PaymentTerms.NET_15, 'user_123');

        expect(updatedCustomer.paymentTerms).toBe(PaymentTerms.NET_15);
        expect(updatedCustomer.updatedBy).toBe('user_123');
      });
    });

    describe('updateAddresses', () => {
      it('should update addresses', () => {
        const newAddresses = [
          { ...validAddress, street: '456 Oak Street' },
          { ...validAddress, street: '789 Pine Street', isDefault: false },
        ];

        const updatedCustomer = customer.updateAddresses(newAddresses, 'user_123');

        expect(updatedCustomer.addresses).toHaveLength(2);
        expect(updatedCustomer.addresses[0].street).toBe('456 Oak Street');
        expect(updatedCustomer.updatedBy).toBe('user_123');
      });
    });

    describe('addAddress', () => {
      it('should add new address', () => {
        const newAddress = { ...validAddress, street: '456 Oak Street', isDefault: false };
        const updatedCustomer = customer.addAddress(newAddress, 'user_123');

        expect(updatedCustomer.addresses).toHaveLength(2);
        expect(updatedCustomer.addresses[1].street).toBe('456 Oak Street');
      });
    });

    describe('updateContacts', () => {
      it('should update contacts', () => {
        const newContacts = [{ ...validContact, name: 'New Contact' }];

        const updatedCustomer = customer.updateContacts(newContacts, 'user_123');

        expect(updatedCustomer.contacts).toHaveLength(1);
        expect(updatedCustomer.contacts[0].name).toBe('New Contact');
        expect(updatedCustomer.updatedBy).toBe('user_123');
      });
    });
  });

  describe('Persistence Methods', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = Customer.create(validCustomerProps).activate('user_123');
    });

    describe('toPersistence', () => {
      it('should convert to persistence format', () => {
        const persistence = customer.toPersistence();

        expect(persistence.id).toBe(customer.id);
        expect(persistence.customerCode).toBe('CUST001');
        expect(persistence.fullName).toBe('Acme Corporation - John Smith');
        expect(persistence.status).toBe(CustomerStatus.ACTIVE);
        expect(persistence.email).toBe('john.smith@acme.com');
        expect(persistence.creditLimit).toBe(5000000);
        expect(persistence.creditLimitCurrency).toBe('USD');
        expect(persistence.availableCredit).toBe(5000000);
        expect(persistence.addresses).toEqual([validAddress]);
        expect(persistence.contacts).toEqual([validContact]);
      });
    });

    describe('fromPersistence', () => {
      it('should reconstruct from persistence data', () => {
        const persistence = customer.toPersistence();
        const reconstructed = Customer.fromPersistence(persistence);

        expect(reconstructed.id).toBe(customer.id);
        expect(reconstructed.customerCode).toBe(customer.customerCode);
        expect(reconstructed.status).toBe(customer.status);
        expect(reconstructed.creditLimit.decimalAmount).toBe(customer.creditLimit.decimalAmount);
        expect(reconstructed.addresses).toEqual(customer.addresses);
        expect(reconstructed.contacts).toEqual(customer.contacts);
      });

      it('should maintain immutability after reconstruction', () => {
        const persistence = customer.toPersistence();
        const reconstructed = Customer.fromPersistence(persistence);

        expect(Object.isFrozen(reconstructed)).toBe(true);
      });
    });

    describe('getDisplayInfo', () => {
      it('should return safe display information', () => {
        const displayInfo = customer.getDisplayInfo();

        expect(displayInfo.id).toBe(customer.id);
        expect(displayInfo.fullName).toBe('Acme Corporation - John Smith');
        expect(displayInfo.canPlaceOrders).toBe(true);
        expect(displayInfo.creditUtilization).toBe(0);
        expect(displayInfo.hasOverduePayments).toBe(false);
        expect(displayInfo.daysSinceLastOrder).toBeNull();
        expect(displayInfo.defaultAddress).toEqual(validAddress);
        expect(displayInfo.primaryContact).toEqual(validContact);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('hasOverduePayments', () => {
      it('should detect overdue payments', () => {
        // Create customer and record a purchase, then simulate overdue status
        const customer = Customer.create(validCustomerProps).activate('user_123');
        const customerWithPurchase = customer.recordPurchase(
          'order_001',
          new Date(),
          Money.fromDecimal(1000, 'USD'),
          'user_123'
        );

        // Create a mock persistence with overdue payment
        const persistence = customerWithPurchase.toPersistence();
        const overdueHistory = [...persistence.purchaseHistory];
        overdueHistory[0] = { ...overdueHistory[0]!, paymentStatus: 'OVERDUE' };

        const customerWithOverdue = Customer.fromPersistence({
          ...persistence,
          purchaseHistory: overdueHistory,
        });
        expect(customerWithOverdue.hasOverduePayments()).toBe(true);
      });
    });

    describe('Currency Consistency', () => {
      it('should maintain currency consistency across all money operations', () => {
        const customer = Customer.create(validCustomerProps);

        expect(customer.creditLimit.currency).toBe('USD');
        expect(customer.outstandingBalance.currency).toBe('USD');
        expect(customer.availableCredit.currency).toBe('USD');
        expect(customer.totalOrdersValue.currency).toBe('USD');
        expect(customer.averageOrderValue.currency).toBe('USD');
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple credit operations correctly', () => {
        let customer = Customer.create(validCustomerProps).activate('user_123');

        // Sequential operations should work correctly
        customer = customer.reserveCredit(Money.fromDecimal(20000, 'USD'), 'user_123');
        customer = customer.reserveCredit(Money.fromDecimal(15000, 'USD'), 'user_123');
        customer = customer.releaseCredit(Money.fromDecimal(10000, 'USD'), 'user_123');

        expect(customer.outstandingBalance.decimalAmount).toBe(25000);
        expect(customer.availableCredit.decimalAmount).toBe(25000);
      });
    });

    describe('Data Integrity', () => {
      it('should maintain referential integrity for nested objects', () => {
        const customer = Customer.create(validCustomerProps);
        const addresses = customer.addresses;

        // Modifying returned array should not affect original
        addresses.push({ ...validAddress, street: 'Modified Street' });

        expect(customer.addresses).toHaveLength(1);
        expect(customer.addresses[0].street).toBe('123 Main Street');
      });

      it('should handle empty collections gracefully', () => {
        const propsWithoutContacts = { ...validCustomerProps, contacts: [] };
        const customer = Customer.create(propsWithoutContacts);

        expect(customer.contacts).toHaveLength(0);
        expect(customer.getPrimaryContact()).toBeNull();
      });
    });

    describe('Validation Edge Cases', () => {
      it('should handle whitespace-only fields correctly', () => {
        const props = { ...validCustomerProps, firstName: '   ' };
        expect(() => Customer.create(props)).toThrow(CustomerValidationError);
      });

      it('should validate website URL format', () => {
        const invalidWebsites = ['not-a-url', 'ftp://example.com', 'javascript:alert(1)'];

        invalidWebsites.forEach((website) => {
          const props = { ...validCustomerProps, website };
          expect(() => Customer.create(props)).toThrow(CustomerValidationError);
        });
      });

      it('should accept valid website URLs', () => {
        const validWebsites = ['http://example.com', 'https://www.example.com', 'https://subdomain.example.com/path'];

        validWebsites.forEach((website) => {
          const props = { ...validCustomerProps, website };
          expect(() => Customer.create(props)).not.toThrow();
        });
      });
    });
  });
});
