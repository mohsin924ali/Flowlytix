/**
 * Order Mock Data
 * Sample orders for testing and development
 */

export interface MockOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MockOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  agencyId: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  orderDate: Date;
  items: MockOrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mockOrders: MockOrder[] = [
  {
    id: 'order-1',
    orderNumber: 'ORD-2024-001',
    customerId: 'cust-1',
    customerName: 'Robert Johnson',
    agencyId: 'agency-1',
    status: 'DELIVERED',
    orderDate: new Date('2024-01-15'),
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Premium Wireless Headphones',
        quantity: 2,
        unitPrice: 299.99,
        totalPrice: 599.98,
      },
    ],
    subtotal: 599.98,
    tax: 59.0,
    shipping: 15.0,
    total: 673.98,
    currency: 'USD',
    shippingAddress: {
      street: '123 Corporate Blvd',
      city: 'Business City',
      state: 'BC',
      zipCode: '12345',
      country: 'USA',
    },
    notes: 'Express delivery requested',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'order-2',
    orderNumber: 'ORD-2024-002',
    customerId: 'cust-2',
    customerName: 'Maria Garcia',
    agencyId: 'agency-2',
    status: 'SHIPPED',
    orderDate: new Date('2024-01-20'),
    items: [
      {
        id: 'item-2',
        productId: 'prod-3',
        productName: 'Business Strategy Handbook',
        quantity: 3,
        unitPrice: 34.99,
        totalPrice: 104.97,
      },
    ],
    subtotal: 104.97,
    tax: 10.5,
    shipping: 8.0,
    total: 123.47,
    currency: 'USD',
    shippingAddress: {
      street: '456 Residential St',
      city: 'Home Town',
      state: 'HT',
      zipCode: '23456',
      country: 'USA',
    },
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-22'),
  },
];

export const generateMockOrders = (count: number = 50): MockOrder[] => {
  const statuses: MockOrder['status'][] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return Array.from({ length: count }, (_, index) => {
    const orderDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    const subtotal = Math.floor(Math.random() * 2000) + 50;
    const tax = Math.floor(subtotal * 0.1);
    const shipping = Math.floor(Math.random() * 50) + 5;

    return {
      id: `order-${index + 3}`,
      orderNumber: `ORD-2024-${(index + 3).toString().padStart(3, '0')}`,
      customerId: `cust-${Math.floor(Math.random() * 4) + 1}`,
      customerName: `Customer ${Math.floor(Math.random() * 4) + 1}`,
      agencyId: `agency-${Math.floor(Math.random() * 3) + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)] || 'PENDING',
      orderDate,
      items: [
        {
          id: `item-${index + 3}`,
          productId: `prod-${Math.floor(Math.random() * 5) + 1}`,
          productName: `Product ${Math.floor(Math.random() * 5) + 1}`,
          quantity: Math.floor(Math.random() * 5) + 1,
          unitPrice: Math.floor(Math.random() * 500) + 10,
          totalPrice: subtotal,
        },
      ],
      subtotal,
      tax,
      shipping,
      total: subtotal + tax + shipping,
      currency: 'USD',
      shippingAddress: {
        street: `${index + 100} Sample St`,
        city: 'Sample City',
        state: 'SC',
        zipCode: `${(index + 10000).toString().padStart(5, '0')}`,
        country: 'USA',
      },
      createdAt: orderDate,
      updatedAt: new Date(orderDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
    };
  });
};

export const allMockOrders = [...mockOrders, ...generateMockOrders()];
