/**
 * Customer Mock Data
 * Sample customers for testing and development
 */

import { Customer, CustomerType, CustomerStatus, PaymentTerms } from '../../services/CustomerService';

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    customerCode: 'CUST001',
    companyName: 'Tech Solutions Inc.',
    firstName: 'Robert',
    lastName: 'Johnson',
    fullName: 'Robert Johnson',
    customerType: CustomerType.CORPORATE,
    status: CustomerStatus.ACTIVE,
    email: 'robert.johnson@techsolutions.com',
    phone: '+1-555-1001',
    mobile: '+1-555-1002',
    addresses: [
      {
        street: '123 Corporate Blvd',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'Robert Johnson',
        title: 'CEO',
        email: 'robert.johnson@techsolutions.com',
        phone: '+1-555-1001',
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
    website: 'https://techsolutions.com',
    notes: 'Key corporate client with excellent payment history',
    lastOrderDate: new Date('2024-01-15'),
    totalOrdersCount: 45,
    totalOrdersValue: 125000,
    averageOrderValue: 2777.78,
    agencyId: 'agency-1',
    createdBy: 'user-1',
    createdAt: new Date('2023-01-15'),
    updatedBy: 'user-1',
    updatedAt: new Date('2024-01-10'),
    purchaseHistory: [
      {
        orderId: 'order-1',
        orderDate: new Date('2024-01-15'),
        totalAmount: 5500,
        currency: 'USD',
        paymentStatus: 'PAID',
        paymentDate: new Date('2024-01-20'),
      },
    ],
  },
  {
    id: 'cust-2',
    customerCode: 'CUST002',
    firstName: 'Maria',
    lastName: 'Garcia',
    fullName: 'Maria Garcia',
    customerType: CustomerType.RETAIL,
    status: CustomerStatus.ACTIVE,
    email: 'maria.garcia@email.com',
    phone: '+1-555-2001',
    addresses: [
      {
        street: '456 Residential St',
        city: 'Home Town',
        state: 'HT',
        zipCode: '23456',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'Maria Garcia',
        email: 'maria.garcia@email.com',
        phone: '+1-555-2001',
        isPrimary: true,
      },
    ],
    creditLimit: 5000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 750,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 4250,
    paymentTerms: PaymentTerms.CASH_ON_DELIVERY,
    notes: 'Regular retail customer',
    lastOrderDate: new Date('2024-01-20'),
    totalOrdersCount: 15,
    totalOrdersValue: 8500,
    averageOrderValue: 566.67,
    agencyId: 'agency-2',
    createdBy: 'user-2',
    createdAt: new Date('2023-06-15'),
    purchaseHistory: [
      {
        orderId: 'order-2',
        orderDate: new Date('2024-01-20'),
        totalAmount: 750,
        currency: 'USD',
        paymentStatus: 'PENDING',
      },
    ],
  },
  {
    id: 'cust-3',
    customerCode: 'CUST003',
    companyName: 'Global Distributors LLC',
    firstName: 'David',
    lastName: 'Chen',
    fullName: 'David Chen',
    customerType: CustomerType.DISTRIBUTOR,
    status: CustomerStatus.ACTIVE,
    email: 'david.chen@globaldist.com',
    phone: '+1-555-3001',
    mobile: '+1-555-3002',
    addresses: [
      {
        street: '789 Distribution Center',
        city: 'Logistics City',
        state: 'LC',
        zipCode: '34567',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'David Chen',
        title: 'Operations Manager',
        email: 'david.chen@globaldist.com',
        phone: '+1-555-3001',
        isPrimary: true,
      },
    ],
    creditLimit: 100000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 25000,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 75000,
    paymentTerms: PaymentTerms.NET_45,
    taxNumber: 'TAX987654321',
    website: 'https://globaldist.com',
    notes: 'Major distributor partner with volume discounts',
    lastOrderDate: new Date('2024-01-25'),
    totalOrdersCount: 85,
    totalOrdersValue: 340000,
    averageOrderValue: 4000,
    agencyId: 'agency-3',
    createdBy: 'user-3',
    createdAt: new Date('2022-09-01'),
    updatedBy: 'user-3',
    updatedAt: new Date('2024-01-22'),
    purchaseHistory: [
      {
        orderId: 'order-3',
        orderDate: new Date('2024-01-25'),
        totalAmount: 15000,
        currency: 'USD',
        paymentStatus: 'PAID',
        paymentDate: new Date('2024-01-30'),
      },
    ],
  },
  {
    id: 'cust-4',
    customerCode: 'CUST004',
    firstName: 'Lisa',
    lastName: 'Wilson',
    fullName: 'Lisa Wilson',
    customerType: CustomerType.WHOLESALE,
    status: CustomerStatus.PENDING_APPROVAL,
    email: 'lisa.wilson@wholesale.com',
    phone: '+1-555-4001',
    addresses: [
      {
        street: '321 Wholesale Ave',
        city: 'Trade City',
        state: 'TC',
        zipCode: '45678',
        country: 'USA',
        isDefault: true,
        addressType: 'BOTH',
      },
    ],
    contacts: [
      {
        name: 'Lisa Wilson',
        title: 'Buyer',
        email: 'lisa.wilson@wholesale.com',
        phone: '+1-555-4001',
        isPrimary: true,
      },
    ],
    creditLimit: 25000,
    creditLimitCurrency: 'USD',
    outstandingBalance: 0,
    outstandingBalanceCurrency: 'USD',
    availableCredit: 25000,
    paymentTerms: PaymentTerms.NET_15,
    notes: 'New wholesale customer pending approval',
    totalOrdersCount: 0,
    totalOrdersValue: 0,
    averageOrderValue: 0,
    agencyId: 'agency-2',
    createdBy: 'user-2',
    createdAt: new Date('2024-01-28'),
    purchaseHistory: [],
  },
];

export const generateMockCustomers = (count: number = 50): Customer[] => {
  const types = Object.values(CustomerType);
  const statuses = Object.values(CustomerStatus);
  const paymentTerms = Object.values(PaymentTerms);

  return Array.from({ length: count }, (_, index) => {
    const hasCompany = Math.random() > 0.3;
    const hasLastOrderDate = Math.random() > 0.3;
    const creditLimit = Math.floor(Math.random() * 100000) + 5000;
    const outstandingBalance = Math.floor(Math.random() * 5000);
    const totalOrdersCount = Math.floor(Math.random() * 50);
    const totalOrdersValue = Math.floor(Math.random() * 50000);

    const customer: Customer = {
      id: `cust-${index + 5}`,
      customerCode: `CUST${(index + 5).toString().padStart(3, '0')}`,
      firstName: `First${index + 5}`,
      lastName: `Last${index + 5}`,
      fullName: `First${index + 5} Last${index + 5}`,
      customerType: types[Math.floor(Math.random() * types.length)] || CustomerType.RETAIL,
      status: statuses[Math.floor(Math.random() * statuses.length)] || CustomerStatus.ACTIVE,
      email: `customer${index + 5}@example.com`,
      addresses: [
        {
          street: `${index + 100} Main St`,
          city: 'Sample City',
          state: 'SC',
          zipCode: `${(index + 10000).toString().padStart(5, '0')}`,
          country: 'USA',
          isDefault: true,
          addressType: 'BOTH' as const,
        },
      ],
      contacts: [
        {
          name: `First${index + 5} Last${index + 5}`,
          email: `customer${index + 5}@example.com`,
          phone: `+1-555-${(index + 5000).toString().padStart(4, '0')}`,
          isPrimary: true,
        },
      ],
      creditLimit,
      creditLimitCurrency: 'USD',
      outstandingBalance,
      outstandingBalanceCurrency: 'USD',
      availableCredit: creditLimit - outstandingBalance,
      paymentTerms: paymentTerms[Math.floor(Math.random() * paymentTerms.length)] || PaymentTerms.NET_30,
      totalOrdersCount,
      totalOrdersValue,
      averageOrderValue: totalOrdersCount > 0 ? totalOrdersValue / totalOrdersCount : 0,
      agencyId: `agency-${Math.floor(Math.random() * 3) + 1}`,
      createdBy: `user-${Math.floor(Math.random() * 3) + 1}`,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      purchaseHistory: [],
      ...(hasCompany && { companyName: `Company ${index + 5}` }),
      ...(hasLastOrderDate && { lastOrderDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) }),
      phone: `+1-555-${(index + 5000).toString().padStart(4, '0')}`,
      notes: `Generated customer ${index + 5}`,
    };

    return customer;
  });
};

export const allMockCustomers = [...mockCustomers, ...generateMockCustomers()];
