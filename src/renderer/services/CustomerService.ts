/**
 * Customer Service
 * Service layer for customer management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Customer Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Customer status enumeration
 */
export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  BLACKLISTED = 'BLACKLISTED',
}

/**
 * Customer type enumeration
 */
export enum CustomerType {
  RETAIL = 'RETAIL',
  WHOLESALE = 'WHOLESALE',
  DISTRIBUTOR = 'DISTRIBUTOR',
  CORPORATE = 'CORPORATE',
  GOVERNMENT = 'GOVERNMENT',
  ONLINE = 'ONLINE',
}

/**
 * Payment terms enumeration
 */
export enum PaymentTerms {
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  NET_7 = 'NET_7',
  NET_15 = 'NET_15',
  NET_30 = 'NET_30',
  NET_45 = 'NET_45',
  NET_60 = 'NET_60',
  ADVANCE_PAYMENT = 'ADVANCE_PAYMENT',
  LETTER_OF_CREDIT = 'LETTER_OF_CREDIT',
}

/**
 * Customer address interface
 */
export interface CustomerAddress {
  readonly street: string;
  readonly city: string;
  readonly state: string;
  readonly zipCode: string;
  readonly country: string;
  readonly isDefault?: boolean;
  readonly addressType?: 'BILLING' | 'SHIPPING' | 'BOTH';
}

/**
 * Customer contact interface
 */
export interface CustomerContact {
  readonly name: string;
  readonly title?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly isPrimary?: boolean;
}

/**
 * Purchase history entry
 */
export interface PurchaseHistoryEntry {
  readonly orderId: string;
  readonly orderDate: Date;
  readonly totalAmount: number;
  readonly currency: string;
  readonly paymentStatus: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  readonly paymentDate?: Date;
}

/**
 * Customer interface
 */
export interface Customer {
  readonly id: string;
  readonly customerCode: string;
  readonly companyName?: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
  readonly customerType: CustomerType;
  readonly status: CustomerStatus;
  readonly email: string;
  readonly phone?: string;
  readonly mobile?: string;
  readonly addresses: CustomerAddress[];
  readonly contacts: CustomerContact[];
  readonly creditLimit: number;
  readonly creditLimitCurrency: string;
  readonly outstandingBalance: number;
  readonly outstandingBalanceCurrency: string;
  readonly availableCredit: number;
  readonly paymentTerms: PaymentTerms;
  readonly taxNumber?: string;
  readonly website?: string;
  readonly notes?: string;
  readonly lastOrderDate?: Date;
  readonly totalOrdersCount: number;
  readonly totalOrdersValue: number;
  readonly averageOrderValue: number;
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
  readonly purchaseHistory: PurchaseHistoryEntry[];
}

/**
 * Customer creation schema
 */
export const CreateCustomerSchema = z.object({
  customerCode: z.string().min(2, 'Customer code must be at least 2 characters'),
  companyName: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  customerType: z.nativeEnum(CustomerType),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  addresses: z
    .array(
      z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zipCode: z.string().min(1, 'Zip code is required'),
        country: z.string().min(1, 'Country is required'),
        isDefault: z.boolean().optional(),
        addressType: z.enum(['BILLING', 'SHIPPING', 'BOTH']).optional(),
      })
    )
    .min(1, 'At least one address is required'),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, 'Contact name is required'),
        title: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
  creditLimit: z.number().min(0, 'Credit limit cannot be negative'),
  paymentTerms: z.nativeEnum(PaymentTerms),
  taxNumber: z.string().optional(),
  website: z.string().url().optional(),
  notes: z.string().optional(),
});

export type CreateCustomerData = z.infer<typeof CreateCustomerSchema>;

/**
 * Customer update schema
 */
export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerData = z.infer<typeof UpdateCustomerSchema>;

/**
 * Customer filter interface
 */
export interface CustomerFilters {
  readonly search?: string;
  readonly status?: CustomerStatus[];
  readonly customerType?: CustomerType[];
  readonly paymentTerms?: PaymentTerms[];
  readonly creditLimitMin?: number;
  readonly creditLimitMax?: number;
  readonly lastOrderDateFrom?: Date;
  readonly lastOrderDateTo?: Date;
  readonly hasOutstandingBalance?: boolean;
}

/**
 * Customer list response
 */
export interface CustomerListResponse {
  readonly customers: Customer[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * Mock customer data for development
 */
const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    customerCode: 'CUST001',
    companyName: 'Metro Supermarket Chain',
    firstName: 'John',
    lastName: 'Smith',
    fullName: 'John Smith',
    customerType: CustomerType.WHOLESALE,
    status: CustomerStatus.ACTIVE,
    email: 'john.smith@metromarket.com',
    phone: '+1-555-0123',
    mobile: '+1-555-0124',
    addresses: [
      {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'John Smith',
        title: 'Purchasing Manager',
        email: 'john.smith@metromarket.com',
        phone: '+1-555-0123',
        isPrimary: true,
      },
    ],
    creditLimit: 50000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 12500,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 37500,
    paymentTerms: PaymentTerms.NET_30,
    taxNumber: 'TAX123456789',
    website: 'https://metromarket.com',
    notes: 'Long-term customer with excellent payment history',
    lastOrderDate: new Date('2024-01-15'),
    totalOrdersCount: 156,
    totalOrdersValue: 890000,
    averageOrderValue: 5705,
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-01-15'),
    updatedBy: 'user-001',
    updatedAt: new Date('2024-01-15'),
    purchaseHistory: [
      {
        orderId: 'ord-001',
        orderDate: new Date('2024-01-15'),
        totalAmount: 15600,
        currency: 'USD',
        paymentStatus: 'PAID',
        paymentDate: new Date('2024-01-20'),
      },
      {
        orderId: 'ord-002',
        orderDate: new Date('2024-01-10'),
        totalAmount: 8900,
        currency: 'USD',
        paymentStatus: 'PENDING',
      },
    ],
  },
  {
    id: 'cust-002',
    customerCode: 'CUST002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    fullName: 'Sarah Johnson',
    customerType: CustomerType.RETAIL,
    status: CustomerStatus.ACTIVE,
    email: 'sarah.johnson@email.com',
    phone: '+1-555-0234',
    addresses: [
      {
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90210',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [],
    creditLimit: 5000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 0,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 5000,
    paymentTerms: PaymentTerms.NET_15,
    notes: 'Individual customer, frequent orders',
    lastOrderDate: new Date('2024-01-12'),
    totalOrdersCount: 23,
    totalOrdersValue: 12450,
    averageOrderValue: 541,
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-06-10'),
    purchaseHistory: [
      {
        orderId: 'ord-003',
        orderDate: new Date('2024-01-12'),
        totalAmount: 234,
        currency: 'USD',
        paymentStatus: 'PAID',
        paymentDate: new Date('2024-01-12'),
      },
    ],
  },
  {
    id: 'cust-003',
    customerCode: 'CUST003',
    companyName: 'TechCorp Industries',
    firstName: 'Michael',
    lastName: 'Brown',
    fullName: 'Michael Brown',
    customerType: CustomerType.CORPORATE,
    status: CustomerStatus.SUSPENDED,
    email: 'michael.brown@techcorp.com',
    phone: '+1-555-0345',
    mobile: '+1-555-0346',
    addresses: [
      {
        street: '789 Business Blvd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        country: 'USA',
        isDefault: true,
        addressType: 'BILLING',
      },
      {
        street: '321 Warehouse Lane',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60602',
        country: 'USA',
        isDefault: false,
        addressType: 'SHIPPING',
      },
    ],
    contacts: [
      {
        name: 'Michael Brown',
        title: 'CFO',
        email: 'michael.brown@techcorp.com',
        phone: '+1-555-0345',
        isPrimary: true,
      },
      {
        name: 'Lisa Davis',
        title: 'Procurement Officer',
        email: 'lisa.davis@techcorp.com',
        phone: '+1-555-0347',
        isPrimary: false,
      },
    ],
    creditLimit: 100000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 45000,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 55000,
    paymentTerms: PaymentTerms.NET_45,
    taxNumber: 'TAX987654321',
    website: 'https://techcorp.com',
    notes: 'Suspended due to overdue payments - Review required',
    lastOrderDate: new Date('2023-12-20'),
    totalOrdersCount: 89,
    totalOrdersValue: 567000,
    averageOrderValue: 6371,
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2022-08-15'),
    updatedBy: 'user-002',
    updatedAt: new Date('2024-01-08'),
    purchaseHistory: [
      {
        orderId: 'ord-004',
        orderDate: new Date('2023-12-20'),
        totalAmount: 25000,
        currency: 'USD',
        paymentStatus: 'OVERDUE',
      },
      {
        orderId: 'ord-005',
        orderDate: new Date('2023-12-15'),
        totalAmount: 20000,
        currency: 'USD',
        paymentStatus: 'OVERDUE',
      },
    ],
  },
  {
    id: 'cust-004',
    customerCode: 'CUST004',
    companyName: 'City Government',
    firstName: 'Robert',
    lastName: 'Wilson',
    fullName: 'Robert Wilson',
    customerType: CustomerType.GOVERNMENT,
    status: CustomerStatus.ACTIVE,
    email: 'robert.wilson@cityoffice.gov',
    phone: '+1-555-0456',
    addresses: [
      {
        street: '100 City Hall Plaza',
        city: 'Boston',
        state: 'MA',
        zipCode: '02201',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'Robert Wilson',
        title: 'Procurement Director',
        email: 'robert.wilson@cityoffice.gov',
        phone: '+1-555-0456',
        isPrimary: true,
      },
    ],
    creditLimit: 200000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 0,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 200000,
    paymentTerms: PaymentTerms.NET_60,
    taxNumber: 'GOV123456789',
    notes: 'Government contract customer - Special terms apply',
    lastOrderDate: new Date('2024-01-05'),
    totalOrdersCount: 45,
    totalOrdersValue: 1200000,
    averageOrderValue: 26667,
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2023-03-20'),
    purchaseHistory: [
      {
        orderId: 'ord-006',
        orderDate: new Date('2024-01-05'),
        totalAmount: 75000,
        currency: 'USD',
        paymentStatus: 'PENDING',
      },
    ],
  },
];

/**
 * Customer Service Class
 * Implements all customer management operations with mock data
 */
export class CustomerService {
  private static readonly BASE_DELAY = 500;

  /**
   * Simulate API delay
   */
  private static delay(ms: number = CustomerService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all customers with filtering and pagination
   */
  static async getCustomers(
    agencyId: string,
    page: number = 1,
    limit: number = 20,
    filters: CustomerFilters = {}
  ): Promise<CustomerListResponse> {
    await CustomerService.delay();

    let filteredCustomers = MOCK_CUSTOMERS.filter((customer) => customer.agencyId === agencyId);

    // Apply filters
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(
        (customer) =>
          customer.fullName.toLowerCase().includes(search) ||
          customer.customerCode.toLowerCase().includes(search) ||
          customer.email.toLowerCase().includes(search) ||
          customer.companyName?.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filteredCustomers = filteredCustomers.filter((customer) => filters.status!.includes(customer.status));
    }

    if (filters.customerType && filters.customerType.length > 0) {
      filteredCustomers = filteredCustomers.filter((customer) => filters.customerType!.includes(customer.customerType));
    }

    if (filters.paymentTerms && filters.paymentTerms.length > 0) {
      filteredCustomers = filteredCustomers.filter((customer) => filters.paymentTerms!.includes(customer.paymentTerms));
    }

    if (filters.creditLimitMin !== undefined) {
      filteredCustomers = filteredCustomers.filter((customer) => customer.creditLimit >= filters.creditLimitMin!);
    }

    if (filters.creditLimitMax !== undefined) {
      filteredCustomers = filteredCustomers.filter((customer) => customer.creditLimit <= filters.creditLimitMax!);
    }

    if (filters.hasOutstandingBalance !== undefined) {
      filteredCustomers = filteredCustomers.filter((customer) =>
        filters.hasOutstandingBalance ? customer.outstandingBalance > 0 : customer.outstandingBalance === 0
      );
    }

    if (filters.lastOrderDateFrom) {
      filteredCustomers = filteredCustomers.filter(
        (customer) => customer.lastOrderDate && customer.lastOrderDate >= filters.lastOrderDateFrom!
      );
    }

    if (filters.lastOrderDateTo) {
      filteredCustomers = filteredCustomers.filter(
        (customer) => customer.lastOrderDate && customer.lastOrderDate <= filters.lastOrderDateTo!
      );
    }

    // Pagination
    const total = filteredCustomers.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const customers = filteredCustomers.slice(startIndex, endIndex);

    return {
      customers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    await CustomerService.delay();
    return MOCK_CUSTOMERS.find((customer) => customer.id === customerId) || null;
  }

  /**
   * Create new customer
   */
  static async createCustomer(
    agencyId: string,
    customerData: CreateCustomerData,
    createdBy: string
  ): Promise<Customer> {
    await CustomerService.delay(800);

    // Validate data
    const validatedData = CreateCustomerSchema.parse(customerData);

    // Check for duplicate customer code
    const existingCustomer = MOCK_CUSTOMERS.find(
      (c) => c.customerCode === validatedData.customerCode && c.agencyId === agencyId
    );
    if (existingCustomer) {
      throw new Error(`Customer with code ${validatedData.customerCode} already exists`);
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      customerCode: validatedData.customerCode,
      companyName: validatedData.companyName,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      fullName: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
      customerType: validatedData.customerType,
      status: CustomerStatus.ACTIVE,
      email: validatedData.email,
      phone: validatedData.phone,
      mobile: validatedData.mobile,
      addresses: validatedData.addresses,
      contacts: validatedData.contacts || [],
      creditLimit: validatedData.creditLimit,
      creditLimitCurrency: 'USD',
      outstandingBalance: 0,
      outstandingBalanceCurrency: 'USD',
      availableCredit: validatedData.creditLimit,
      paymentTerms: validatedData.paymentTerms,
      taxNumber: validatedData.taxNumber,
      website: validatedData.website,
      notes: validatedData.notes,
      totalOrdersCount: 0,
      totalOrdersValue: 0,
      averageOrderValue: 0,
      agencyId,
      createdBy,
      createdAt: new Date(),
      purchaseHistory: [],
    };

    // Add to mock data
    MOCK_CUSTOMERS.push(newCustomer);

    return newCustomer;
  }

  /**
   * Update customer
   */
  static async updateCustomer(
    customerId: string,
    customerData: UpdateCustomerData,
    updatedBy: string
  ): Promise<Customer> {
    await CustomerService.delay(600);

    const validatedData = UpdateCustomerSchema.parse(customerData);
    const customerIndex = MOCK_CUSTOMERS.findIndex((c) => c.id === customerId);

    if (customerIndex === -1) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const existingCustomer = MOCK_CUSTOMERS[customerIndex];

    // Check for duplicate customer code if updating
    if (validatedData.customerCode && validatedData.customerCode !== existingCustomer.customerCode) {
      const duplicateCustomer = MOCK_CUSTOMERS.find(
        (c) =>
          c.customerCode === validatedData.customerCode &&
          c.agencyId === existingCustomer.agencyId &&
          c.id !== customerId
      );
      if (duplicateCustomer) {
        throw new Error(`Customer with code ${validatedData.customerCode} already exists`);
      }
    }

    const updatedCustomer: Customer = {
      ...existingCustomer,
      ...validatedData,
      fullName:
        validatedData.firstName && validatedData.lastName
          ? `${validatedData.firstName} ${validatedData.lastName}`.trim()
          : existingCustomer.fullName,
      availableCredit:
        validatedData.creditLimit !== undefined
          ? validatedData.creditLimit - existingCustomer.outstandingBalance
          : existingCustomer.availableCredit,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_CUSTOMERS[customerIndex] = updatedCustomer;
    return updatedCustomer;
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(customerId: string): Promise<void> {
    await CustomerService.delay();

    const customerIndex = MOCK_CUSTOMERS.findIndex((c) => c.id === customerId);
    if (customerIndex === -1) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Check if customer has outstanding orders or balance
    const customer = MOCK_CUSTOMERS[customerIndex];
    if (customer.outstandingBalance > 0) {
      throw new Error('Cannot delete customer with outstanding balance');
    }

    if (customer.totalOrdersCount > 0) {
      throw new Error('Cannot delete customer with order history. Consider deactivating instead.');
    }

    MOCK_CUSTOMERS.splice(customerIndex, 1);
  }

  /**
   * Update customer status
   */
  static async updateCustomerStatus(customerId: string, status: CustomerStatus, updatedBy: string): Promise<Customer> {
    await CustomerService.delay();

    const customerIndex = MOCK_CUSTOMERS.findIndex((c) => c.id === customerId);
    if (customerIndex === -1) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const updatedCustomer = {
      ...MOCK_CUSTOMERS[customerIndex],
      status,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_CUSTOMERS[customerIndex] = updatedCustomer;
    return updatedCustomer;
  }

  /**
   * Update customer credit limit
   */
  static async updateCustomerCreditLimit(
    customerId: string,
    newCreditLimit: number,
    reason: string,
    updatedBy: string
  ): Promise<Customer> {
    await CustomerService.delay();

    if (newCreditLimit < 0) {
      throw new Error('Credit limit cannot be negative');
    }

    const customerIndex = MOCK_CUSTOMERS.findIndex((c) => c.id === customerId);
    if (customerIndex === -1) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    const existingCustomer = MOCK_CUSTOMERS[customerIndex];
    const updatedCustomer = {
      ...existingCustomer,
      creditLimit: newCreditLimit,
      availableCredit: newCreditLimit - existingCustomer.outstandingBalance,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_CUSTOMERS[customerIndex] = updatedCustomer;
    return updatedCustomer;
  }

  /**
   * Get customer analytics summary
   */
  static async getCustomerAnalytics(agencyId: string): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    totalCreditLimit: number;
    totalOutstandingBalance: number;
    averageOrderValue: number;
    topCustomersByValue: Customer[];
    customersByType: Record<CustomerType, number>;
    customersByStatus: Record<CustomerStatus, number>;
  }> {
    await CustomerService.delay();

    const agencyCustomers = MOCK_CUSTOMERS.filter((c) => c.agencyId === agencyId);

    const totalCustomers = agencyCustomers.length;
    const activeCustomers = agencyCustomers.filter((c) => c.status === CustomerStatus.ACTIVE).length;
    const totalCreditLimit = agencyCustomers.reduce((sum, c) => sum + c.creditLimit, 0);
    const totalOutstandingBalance = agencyCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
    const averageOrderValue = agencyCustomers.reduce((sum, c) => sum + c.averageOrderValue, 0) / totalCustomers;

    const topCustomersByValue = agencyCustomers.sort((a, b) => b.totalOrdersValue - a.totalOrdersValue).slice(0, 5);

    const customersByType = agencyCustomers.reduce(
      (acc, customer) => {
        acc[customer.customerType] = (acc[customer.customerType] || 0) + 1;
        return acc;
      },
      {} as Record<CustomerType, number>
    );

    const customersByStatus = agencyCustomers.reduce(
      (acc, customer) => {
        acc[customer.status] = (acc[customer.status] || 0) + 1;
        return acc;
      },
      {} as Record<CustomerStatus, number>
    );

    return {
      totalCustomers,
      activeCustomers,
      totalCreditLimit,
      totalOutstandingBalance,
      averageOrderValue,
      topCustomersByValue,
      customersByType,
      customersByStatus,
    };
  }
}

export default CustomerService;
