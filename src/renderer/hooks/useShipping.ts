/**
 * Shipping Hook - Simplified Approach
 *
 * Simple React hook for shipping management with mock data.
 * Replaces heavy service layer with lightweight data + hooks pattern.
 * Ready for Python FastAPI + PostgreSQL backend integration.
 */

import { useState, useEffect, useMemo } from 'react';

// Shipping Types
export enum ShippingStatus {
  PENDING = 'PENDING',
  LABEL_CREATED = 'LABEL_CREATED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export enum ShippingCarrier {
  FEDEX = 'FEDEX',
  UPS = 'UPS',
  USPS = 'USPS',
  DHL = 'DHL',
}

export interface Shipment {
  id: string;
  agencyId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  trackingNumber: string;
  carrier: ShippingCarrier;
  status: ShippingStatus;
  shippingCost: number;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  fromAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  toAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingFilters {
  search?: string;
  status?: ShippingStatus[];
  carrier?: ShippingCarrier[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ShippingStats {
  totalShipments: number;
  pendingShipments: number;
  inTransitShipments: number;
  deliveredShipments: number;
  failedShipments: number;
  totalShippingCost: number;
  averageDeliveryDays: number;
  onTimeDeliveryRate: number;
}

// Mock Data
const MOCK_SHIPMENTS: Shipment[] = [
  {
    id: '1',
    agencyId: 'agency-1',
    orderId: 'order-001',
    orderNumber: 'ORD-2024-001',
    customerName: 'Metro Supermarket',
    trackingNumber: '1Z999AA1234567890',
    carrier: ShippingCarrier.UPS,
    status: ShippingStatus.DELIVERED,
    shippingCost: 15.99,
    weight: 25.5,
    dimensions: { length: 12, width: 8, height: 6 },
    fromAddress: {
      street: '123 Warehouse St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    toAddress: {
      street: '456 Market Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90211',
      country: 'USA',
    },
    estimatedDeliveryDate: new Date('2024-01-15'),
    actualDeliveryDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    agencyId: 'agency-1',
    orderId: 'order-002',
    orderNumber: 'ORD-2024-002',
    customerName: 'TechCorp Industries',
    trackingNumber: '9400109999999999999999',
    carrier: ShippingCarrier.USPS,
    status: ShippingStatus.IN_TRANSIT,
    shippingCost: 8.5,
    weight: 12.3,
    dimensions: { length: 10, width: 6, height: 4 },
    fromAddress: {
      street: '123 Warehouse St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    toAddress: {
      street: '789 Business Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
    },
    estimatedDeliveryDate: new Date('2024-01-18'),
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: '3',
    agencyId: 'agency-1',
    orderId: 'order-003',
    orderNumber: 'ORD-2024-003',
    customerName: 'Fresh Foods Market',
    trackingNumber: '1234567890123456',
    carrier: ShippingCarrier.FEDEX,
    status: ShippingStatus.PENDING,
    shippingCost: 22.75,
    weight: 35.0,
    dimensions: { length: 16, width: 12, height: 8 },
    fromAddress: {
      street: '123 Warehouse St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
    },
    toAddress: {
      street: '321 Food Court',
      city: 'Las Vegas',
      state: 'NV',
      zipCode: '89101',
      country: 'USA',
    },
    estimatedDeliveryDate: new Date('2024-01-20'),
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
];

// Custom Hook
export const useShipping = (agencyId: string, filters: ShippingFilters = {}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter shipments
  const filteredShipments = useMemo(() => {
    let filtered = MOCK_SHIPMENTS.filter((s) => s.agencyId === agencyId);

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.trackingNumber.toLowerCase().includes(search) ||
          s.orderNumber.toLowerCase().includes(search) ||
          s.customerName.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter((s) => filters.status!.includes(s.status));
    }

    if (filters.carrier && filters.carrier.length > 0) {
      filtered = filtered.filter((s) => filters.carrier!.includes(s.carrier));
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((s) => s.createdAt >= filters.dateFrom!);
    }

    if (filters.dateTo) {
      filtered = filtered.filter((s) => s.createdAt <= filters.dateTo!);
    }

    return filtered;
  }, [agencyId, filters]);

  // Calculate stats
  const stats = useMemo((): ShippingStats => {
    const agencyShipments = MOCK_SHIPMENTS.filter((s) => s.agencyId === agencyId);
    const delivered = agencyShipments.filter((s) => s.status === ShippingStatus.DELIVERED);

    const totalDeliveryDays = delivered.reduce((sum, s) => {
      if (s.actualDeliveryDate) {
        return sum + Math.ceil((s.actualDeliveryDate.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
      return sum;
    }, 0);

    const onTimeDeliveries = delivered.filter(
      (s) => s.actualDeliveryDate && s.actualDeliveryDate <= s.estimatedDeliveryDate
    ).length;

    return {
      totalShipments: agencyShipments.length,
      pendingShipments: agencyShipments.filter((s) => s.status === ShippingStatus.PENDING).length,
      inTransitShipments: agencyShipments.filter((s) => s.status === ShippingStatus.IN_TRANSIT).length,
      deliveredShipments: delivered.length,
      failedShipments: agencyShipments.filter((s) => s.status === ShippingStatus.FAILED).length,
      totalShippingCost: agencyShipments.reduce((sum, s) => sum + s.shippingCost, 0),
      averageDeliveryDays: delivered.length > 0 ? Math.round(totalDeliveryDays / delivered.length) : 0,
      onTimeDeliveryRate: delivered.length > 0 ? Math.round((onTimeDeliveries / delivered.length) * 100) : 0,
    };
  }, [agencyId]);

  // Load shipments
  useEffect(() => {
    setShipments(filteredShipments);
  }, [filteredShipments]);

  // Actions
  const createShipment = async (shipmentData: Omit<Shipment, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt'>) => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newShipment: Shipment = {
        ...shipmentData,
        id: `shipment-${Date.now()}`,
        trackingNumber: `TRK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MOCK_SHIPMENTS.push(newShipment);
      setShipments((prev) => [...prev, newShipment]);

      return newShipment;
    } catch (err) {
      setError('Failed to create shipment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateShipmentStatus = async (shipmentId: string, status: ShippingStatus) => {
    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const shipmentIndex = MOCK_SHIPMENTS.findIndex((s) => s.id === shipmentId);
      if (shipmentIndex === -1) {
        throw new Error('Shipment not found');
      }

      // Update shipment status - using non-null assertion since we validated existence
      MOCK_SHIPMENTS[shipmentIndex]!.status = status;
      MOCK_SHIPMENTS[shipmentIndex]!.updatedAt = new Date();
      if (status === ShippingStatus.DELIVERED) {
        MOCK_SHIPMENTS[shipmentIndex]!.actualDeliveryDate = new Date();
      }

      const updatedShipment = MOCK_SHIPMENTS[shipmentIndex]!;

      setShipments((prev) => prev.map((s) => (s.id === shipmentId ? updatedShipment : s)));

      return updatedShipment;
    } catch (err) {
      setError('Failed to update shipment status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    shipments: filteredShipments,
    stats,
    loading,
    error,
    createShipment,
    updateShipmentStatus,
  };
};
