/**
 * Shipping Mock Data
 */

export interface MockShipment {
  id: string;
  trackingNumber: string;
  orderId: string;
  status: 'PENDING' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'EXCEPTION';
  carrier: string;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const mockShipments: MockShipment[] = [
  {
    id: 'ship-1',
    trackingNumber: 'TRK123456789',
    orderId: 'order-1',
    status: 'DELIVERED',
    carrier: 'Express Shipping',
    estimatedDelivery: new Date('2024-01-18'),
    actualDelivery: new Date('2024-01-18'),
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'ship-2',
    trackingNumber: 'TRK987654321',
    orderId: 'order-2',
    status: 'IN_TRANSIT',
    carrier: 'Standard Delivery',
    estimatedDelivery: new Date('2024-01-25'),
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-01-23'),
  },
];

export const allMockShipments = mockShipments;
