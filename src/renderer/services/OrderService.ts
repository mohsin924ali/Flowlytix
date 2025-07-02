/**
 * Order Service
 * Service layer for order management operations
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Service Layer Pattern
 * @version 1.0.0
 */

import { z } from 'zod';

/**
 * Order status enumeration
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

/**
 * Order fulfillment status enumeration
 */
export enum OrderFulfillmentStatus {
  PENDING = 'PENDING',
  PICKING = 'PICKING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  PARTIAL = 'PARTIAL',
}

/**
 * Order payment status enumeration
 */
export enum OrderPaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

/**
 * Payment method enumeration
 */
export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  CHEQUE = 'CHEQUE',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

/**
 * Order item interface
 */
export interface OrderItem {
  readonly id: string;
  readonly productId: string;
  readonly productCode: string;
  readonly productName: string;
  readonly unitPrice: number;
  readonly boxSize: number;
  readonly quantityBoxes: number;
  readonly quantityLoose: number;
  readonly totalUnits: number;
  readonly unitTotal: number;
  readonly discountPercentage: number;
  readonly discountAmount: number;
  readonly taxRate: number;
  readonly taxAmount: number;
  readonly itemTotal: number;
  readonly fulfilledBoxes: number;
  readonly fulfilledLoose: number;
  readonly fulfilledUnits: number;
  readonly status: OrderItemStatus;
  readonly notes?: string;
}

/**
 * Order item status enumeration
 */
export enum OrderItemStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PICKING = 'PICKING',
  PICKED = 'PICKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

/**
 * Order interface
 */
export interface Order {
  readonly id: string;
  readonly orderNumber: string;
  readonly orderDate: Date;
  readonly deliveryDate?: Date;
  readonly dueDate?: Date;
  readonly customerId: string;
  readonly customerCode: string;
  readonly customerName: string;
  readonly customerCreditLimit: number;
  readonly customerBalance: number;
  readonly areaId?: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly workerId?: string;
  readonly workerName: string;
  readonly items: OrderItem[];
  readonly subtotalAmount: number;
  readonly discountPercentage: number;
  readonly discountAmount: number;
  readonly taxAmount: number;
  readonly totalAmount: number;
  readonly paymentMethod: PaymentMethod;
  readonly creditDays: number;
  readonly status: OrderStatus;
  readonly fulfillmentStatus: OrderFulfillmentStatus;
  readonly paymentStatus: OrderPaymentStatus;
  readonly customerNotes?: string;
  readonly internalNotes?: string;
  readonly agencyId: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  readonly updatedBy?: string;
  readonly updatedAt?: Date;
}

/**
 * Order creation schema
 */
export const CreateOrderSchema = z.object({
  customerCode: z.string().min(1, 'Customer code is required'),
  deliveryDate: z.date().optional(),
  areaCode: z.string().optional(),
  workerId: z.string().optional(),
  items: z
    .array(
      z.object({
        productCode: z.string().min(1, 'Product code is required'),
        quantityBoxes: z.number().min(0, 'Quantity boxes cannot be negative'),
        quantityLoose: z.number().min(0, 'Quantity loose cannot be negative'),
        unitPrice: z.number().min(0, 'Unit price cannot be negative'),
        discountPercentage: z.number().min(0).max(100, 'Discount percentage must be between 0 and 100'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'At least one item is required'),
  discountPercentage: z.number().min(0).max(100, 'Discount percentage must be between 0 and 100'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  creditDays: z.number().min(0, 'Credit days cannot be negative'),
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
});

export type CreateOrderData = z.infer<typeof CreateOrderSchema>;

/**
 * Order filter interface
 */
export interface OrderFilters {
  readonly search?: string;
  readonly status?: OrderStatus[];
  readonly fulfillmentStatus?: OrderFulfillmentStatus[];
  readonly paymentStatus?: OrderPaymentStatus[];
  readonly paymentMethod?: PaymentMethod[];
  readonly customerId?: string;
  readonly areaId?: string;
  readonly workerId?: string;
  readonly orderDateFrom?: Date;
  readonly orderDateTo?: Date;
  readonly deliveryDateFrom?: Date;
  readonly deliveryDateTo?: Date;
  readonly totalAmountMin?: number;
  readonly totalAmountMax?: number;
}

/**
 * Order list response
 */
export interface OrderListResponse {
  readonly orders: Order[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * Mock order data
 */
const MOCK_ORDERS: Order[] = [
  {
    id: 'ord-001',
    orderNumber: 'ORD-2024-001',
    orderDate: new Date('2024-01-15'),
    deliveryDate: new Date('2024-01-17'),
    dueDate: new Date('2024-02-14'),
    customerId: 'cust-001',
    customerCode: 'CUST001',
    customerName: 'Metro Supermarket Chain',
    customerCreditLimit: 50000,
    customerBalance: 12500,
    areaId: 'area-001',
    areaCode: 'NYC-001',
    areaName: 'Manhattan North',
    workerId: 'emp-001',
    workerName: 'John Sales',
    items: [
      {
        id: 'item-001',
        productId: 'prod-001',
        productCode: 'SKU001',
        productName: 'Premium Coffee Beans 1kg',
        unitPrice: 18.99,
        boxSize: 12,
        quantityBoxes: 5,
        quantityLoose: 3,
        totalUnits: 63,
        unitTotal: 1196.37,
        discountPercentage: 5,
        discountAmount: 59.82,
        taxRate: 8.5,
        taxAmount: 96.61,
        itemTotal: 1233.16,
        fulfilledBoxes: 5,
        fulfilledLoose: 3,
        fulfilledUnits: 63,
        status: OrderItemStatus.DELIVERED,
      },
      {
        id: 'item-002',
        productId: 'prod-002',
        productCode: 'SKU002',
        productName: 'Wireless Bluetooth Headphones',
        unitPrice: 129.99,
        boxSize: 1,
        quantityBoxes: 0,
        quantityLoose: 8,
        totalUnits: 8,
        unitTotal: 1039.92,
        discountPercentage: 5,
        discountAmount: 52.0,
        taxRate: 8.5,
        taxAmount: 83.97,
        itemTotal: 1071.89,
        fulfilledBoxes: 0,
        fulfilledLoose: 8,
        fulfilledUnits: 8,
        status: OrderItemStatus.DELIVERED,
      },
    ],
    subtotalAmount: 2236.29,
    discountPercentage: 5,
    discountAmount: 111.82,
    taxAmount: 180.58,
    totalAmount: 2305.05,
    paymentMethod: PaymentMethod.CREDIT,
    creditDays: 30,
    status: OrderStatus.DELIVERED,
    fulfillmentStatus: OrderFulfillmentStatus.DELIVERED,
    paymentStatus: OrderPaymentStatus.PAID,
    customerNotes: 'Please deliver to loading dock B',
    internalNotes: 'Large customer - priority delivery',
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2024-01-15'),
    updatedBy: 'user-001',
    updatedAt: new Date('2024-01-18'),
  },
  {
    id: 'ord-002',
    orderNumber: 'ORD-2024-002',
    orderDate: new Date('2024-01-16'),
    deliveryDate: new Date('2024-01-18'),
    customerId: 'cust-002',
    customerCode: 'CUST002',
    customerName: 'Sarah Johnson',
    customerCreditLimit: 5000,
    customerBalance: 0,
    areaId: 'area-002',
    areaCode: 'LA-001',
    areaName: 'West LA',
    workerId: 'emp-002',
    workerName: 'Jane Mobile',
    items: [
      {
        id: 'item-003',
        productId: 'prod-003',
        productCode: 'SKU003',
        productName: 'Organic Shampoo 500ml',
        unitPrice: 12.99,
        boxSize: 6,
        quantityBoxes: 2,
        quantityLoose: 0,
        totalUnits: 12,
        unitTotal: 155.88,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 8.5,
        taxAmount: 13.25,
        itemTotal: 169.13,
        fulfilledBoxes: 2,
        fulfilledLoose: 0,
        fulfilledUnits: 12,
        status: OrderItemStatus.SHIPPED,
      },
    ],
    subtotalAmount: 155.88,
    discountPercentage: 0,
    discountAmount: 0,
    taxAmount: 13.25,
    totalAmount: 169.13,
    paymentMethod: PaymentMethod.CASH,
    creditDays: 0,
    status: OrderStatus.SHIPPED,
    fulfillmentStatus: OrderFulfillmentStatus.SHIPPED,
    paymentStatus: OrderPaymentStatus.PAID,
    customerNotes: 'Cash on delivery',
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2024-01-16'),
    updatedBy: 'user-002',
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: 'ord-003',
    orderNumber: 'ORD-2024-003',
    orderDate: new Date('2024-01-17'),
    deliveryDate: new Date('2024-01-19'),
    dueDate: new Date('2024-03-02'),
    customerId: 'cust-003',
    customerCode: 'CUST003',
    customerName: 'TechCorp Industries',
    customerCreditLimit: 100000,
    customerBalance: 45000,
    areaId: 'area-003',
    areaCode: 'CHI-001',
    areaName: 'Chicago Downtown',
    workerId: 'emp-003',
    workerName: 'Mike Territory',
    items: [
      {
        id: 'item-004',
        productId: 'prod-002',
        productCode: 'SKU002',
        productName: 'Wireless Bluetooth Headphones',
        unitPrice: 129.99,
        boxSize: 1,
        quantityBoxes: 0,
        quantityLoose: 25,
        totalUnits: 25,
        unitTotal: 3249.75,
        discountPercentage: 10,
        discountAmount: 324.98,
        taxRate: 8.5,
        taxAmount: 248.61,
        itemTotal: 3173.38,
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
      },
    ],
    subtotalAmount: 3249.75,
    discountPercentage: 10,
    discountAmount: 324.98,
    taxAmount: 248.61,
    totalAmount: 3173.38,
    paymentMethod: PaymentMethod.CREDIT,
    creditDays: 45,
    status: OrderStatus.CONFIRMED,
    fulfillmentStatus: OrderFulfillmentStatus.PENDING,
    paymentStatus: OrderPaymentStatus.PENDING,
    customerNotes: 'Corporate bulk order',
    internalNotes: 'Credit check required - high value order',
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2024-01-17'),
    updatedBy: 'user-001',
    updatedAt: new Date('2024-01-17'),
  },
  {
    id: 'ord-004',
    orderNumber: 'ORD-2024-004',
    orderDate: new Date('2024-01-18'),
    customerId: 'cust-001',
    customerCode: 'CUST001',
    customerName: 'Metro Supermarket Chain',
    customerCreditLimit: 50000,
    customerBalance: 12500,
    areaId: 'area-001',
    areaCode: 'NYC-001',
    areaName: 'Manhattan North',
    workerId: 'emp-001',
    workerName: 'John Sales',
    items: [
      {
        id: 'item-005',
        productId: 'prod-001',
        productCode: 'SKU001',
        productName: 'Premium Coffee Beans 1kg',
        unitPrice: 18.99,
        boxSize: 12,
        quantityBoxes: 10,
        quantityLoose: 0,
        totalUnits: 120,
        unitTotal: 2278.8,
        discountPercentage: 5,
        discountAmount: 113.94,
        taxRate: 8.5,
        taxAmount: 184.01,
        itemTotal: 2348.87,
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
      },
    ],
    subtotalAmount: 2278.8,
    discountPercentage: 5,
    discountAmount: 113.94,
    taxAmount: 184.01,
    totalAmount: 2348.87,
    paymentMethod: PaymentMethod.CREDIT,
    creditDays: 30,
    status: OrderStatus.PENDING,
    fulfillmentStatus: OrderFulfillmentStatus.PENDING,
    paymentStatus: OrderPaymentStatus.PENDING,
    customerNotes: 'Regular weekly order',
    agencyId: 'agency-001',
    createdBy: 'user-001',
    createdAt: new Date('2024-01-18'),
  },
];

/**
 * Order Service Class
 */
export class OrderService {
  private static readonly BASE_DELAY = 500;

  private static delay(ms: number = OrderService.BASE_DELAY): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async getOrders(
    agencyId: string,
    page: number = 1,
    limit: number = 20,
    filters: OrderFilters = {}
  ): Promise<OrderListResponse> {
    await OrderService.delay();

    let filteredOrders = MOCK_ORDERS.filter((order) => order.agencyId === agencyId);

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(search) ||
          order.customerName.toLowerCase().includes(search) ||
          order.customerCode.toLowerCase().includes(search)
      );
    }

    if (filters.status && filters.status.length > 0) {
      filteredOrders = filteredOrders.filter((order) => filters.status!.includes(order.status));
    }

    if (filters.fulfillmentStatus && filters.fulfillmentStatus.length > 0) {
      filteredOrders = filteredOrders.filter((order) => filters.fulfillmentStatus!.includes(order.fulfillmentStatus));
    }

    if (filters.paymentStatus && filters.paymentStatus.length > 0) {
      filteredOrders = filteredOrders.filter((order) => filters.paymentStatus!.includes(order.paymentStatus));
    }

    if (filters.paymentMethod && filters.paymentMethod.length > 0) {
      filteredOrders = filteredOrders.filter((order) => filters.paymentMethod!.includes(order.paymentMethod));
    }

    if (filters.customerId) {
      filteredOrders = filteredOrders.filter((order) => order.customerId === filters.customerId);
    }

    if (filters.areaId) {
      filteredOrders = filteredOrders.filter((order) => order.areaId === filters.areaId);
    }

    if (filters.workerId) {
      filteredOrders = filteredOrders.filter((order) => order.workerId === filters.workerId);
    }

    if (filters.orderDateFrom) {
      filteredOrders = filteredOrders.filter((order) => order.orderDate >= filters.orderDateFrom!);
    }

    if (filters.orderDateTo) {
      filteredOrders = filteredOrders.filter((order) => order.orderDate <= filters.orderDateTo!);
    }

    if (filters.totalAmountMin !== undefined) {
      filteredOrders = filteredOrders.filter((order) => order.totalAmount >= filters.totalAmountMin!);
    }

    if (filters.totalAmountMax !== undefined) {
      filteredOrders = filteredOrders.filter((order) => order.totalAmount <= filters.totalAmountMax!);
    }

    // Sort by order date (newest first)
    filteredOrders.sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime());

    const total = filteredOrders.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const orders = filteredOrders.slice(startIndex, endIndex);

    return {
      orders,
      total,
      page,
      limit,
      totalPages,
    };
  }

  static async getOrderById(orderId: string): Promise<Order | null> {
    await OrderService.delay();
    return MOCK_ORDERS.find((order) => order.id === orderId) || null;
  }

  static async getOrderByNumber(agencyId: string, orderNumber: string): Promise<Order | null> {
    await OrderService.delay();
    return MOCK_ORDERS.find((order) => order.orderNumber === orderNumber && order.agencyId === agencyId) || null;
  }

  static async createOrder(agencyId: string, orderData: CreateOrderData, createdBy: string): Promise<Order> {
    await OrderService.delay(800);

    const validatedData = CreateOrderSchema.parse(orderData);

    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(MOCK_ORDERS.length + 1).padStart(3, '0')}`;

    // Calculate totals
    let subtotalAmount = 0;
    const items: OrderItem[] = validatedData.items.map((item, index) => {
      const totalUnits = item.quantityBoxes * 12 + item.quantityLoose; // Assuming box size 12
      const unitTotal = totalUnits * item.unitPrice;
      const discountAmount = unitTotal * (item.discountPercentage / 100);
      const taxableAmount = unitTotal - discountAmount;
      const taxAmount = taxableAmount * 0.085; // 8.5% tax rate
      const itemTotal = taxableAmount + taxAmount;

      subtotalAmount += unitTotal;

      return {
        id: `item-${Date.now()}-${index}`,
        productId: `prod-${index + 1}`, // Mock product ID
        productCode: item.productCode,
        productName: `Product ${item.productCode}`, // Mock product name
        unitPrice: item.unitPrice,
        boxSize: 12, // Mock box size
        quantityBoxes: item.quantityBoxes,
        quantityLoose: item.quantityLoose,
        totalUnits,
        unitTotal,
        discountPercentage: item.discountPercentage,
        discountAmount,
        taxRate: 8.5,
        taxAmount,
        itemTotal,
        fulfilledBoxes: 0,
        fulfilledLoose: 0,
        fulfilledUnits: 0,
        status: OrderItemStatus.PENDING,
        notes: item.notes,
      };
    });

    const discountAmount = subtotalAmount * (validatedData.discountPercentage / 100);
    const taxableAmount = subtotalAmount - discountAmount;
    const taxAmount = taxableAmount * 0.085;
    const totalAmount = taxableAmount + taxAmount;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      orderDate: new Date(),
      deliveryDate: validatedData.deliveryDate,
      dueDate:
        validatedData.paymentMethod === PaymentMethod.CREDIT
          ? new Date(Date.now() + validatedData.creditDays * 24 * 60 * 60 * 1000)
          : undefined,
      customerId: 'mock-customer-id',
      customerCode: validatedData.customerCode,
      customerName: `Customer ${validatedData.customerCode}`,
      customerCreditLimit: 50000, // Mock credit limit
      customerBalance: 0, // Mock balance
      areaId: validatedData.areaCode ? 'mock-area-id' : undefined,
      areaCode: validatedData.areaCode || 'DEFAULT',
      areaName: validatedData.areaCode ? `Area ${validatedData.areaCode}` : 'Default Area',
      workerId: validatedData.workerId,
      workerName: validatedData.workerId ? `Worker ${validatedData.workerId}` : 'Default Worker',
      items,
      subtotalAmount,
      discountPercentage: validatedData.discountPercentage,
      discountAmount,
      taxAmount,
      totalAmount,
      paymentMethod: validatedData.paymentMethod,
      creditDays: validatedData.creditDays,
      status: OrderStatus.PENDING,
      fulfillmentStatus: OrderFulfillmentStatus.PENDING,
      paymentStatus: OrderPaymentStatus.PENDING,
      customerNotes: validatedData.customerNotes,
      internalNotes: validatedData.internalNotes,
      agencyId,
      createdBy,
      createdAt: new Date(),
    };

    MOCK_ORDERS.push(newOrder);
    return newOrder;
  }

  static async updateOrderStatus(orderId: string, status: OrderStatus, updatedBy: string): Promise<Order> {
    await OrderService.delay();

    const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const updatedOrder = {
      ...MOCK_ORDERS[orderIndex],
      status,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_ORDERS[orderIndex] = updatedOrder;
    return updatedOrder;
  }

  static async updateFulfillmentStatus(
    orderId: string,
    fulfillmentStatus: OrderFulfillmentStatus,
    updatedBy: string
  ): Promise<Order> {
    await OrderService.delay();

    const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const updatedOrder = {
      ...MOCK_ORDERS[orderIndex],
      fulfillmentStatus,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_ORDERS[orderIndex] = updatedOrder;
    return updatedOrder;
  }

  static async updatePaymentStatus(
    orderId: string,
    paymentStatus: OrderPaymentStatus,
    updatedBy: string
  ): Promise<Order> {
    await OrderService.delay();

    const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const updatedOrder = {
      ...MOCK_ORDERS[orderIndex],
      paymentStatus,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_ORDERS[orderIndex] = updatedOrder;
    return updatedOrder;
  }

  static async cancelOrder(orderId: string, reason: string, updatedBy: string): Promise<Order> {
    await OrderService.delay();

    const orderIndex = MOCK_ORDERS.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const existingOrder = MOCK_ORDERS[orderIndex];

    if (existingOrder.status === OrderStatus.DELIVERED) {
      throw new Error('Cannot cancel a delivered order');
    }

    if (existingOrder.fulfillmentStatus === OrderFulfillmentStatus.SHIPPED) {
      throw new Error('Cannot cancel a shipped order');
    }

    const updatedOrder = {
      ...existingOrder,
      status: OrderStatus.CANCELLED,
      fulfillmentStatus: OrderFulfillmentStatus.PENDING,
      paymentStatus: OrderPaymentStatus.CANCELLED,
      internalNotes: existingOrder.internalNotes
        ? `${existingOrder.internalNotes}\n\nCancellation reason: ${reason}`
        : `Cancellation reason: ${reason}`,
      updatedBy,
      updatedAt: new Date(),
    };

    MOCK_ORDERS[orderIndex] = updatedOrder;
    return updatedOrder;
  }

  static async getOrderAnalytics(agencyId: string): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalSalesValue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByPaymentMethod: Record<PaymentMethod, number>;
    ordersByFulfillmentStatus: Record<OrderFulfillmentStatus, number>;
  }> {
    await OrderService.delay();

    const agencyOrders = MOCK_ORDERS.filter((o) => o.agencyId === agencyId);

    const totalOrders = agencyOrders.length;
    const pendingOrders = agencyOrders.filter((o) => o.status === OrderStatus.PENDING).length;
    const completedOrders = agencyOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;
    const totalSalesValue = agencyOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const averageOrderValue = totalSalesValue / totalOrders;

    const ordersByStatus = agencyOrders.reduce(
      (acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      },
      {} as Record<OrderStatus, number>
    );

    const ordersByPaymentMethod = agencyOrders.reduce(
      (acc, order) => {
        acc[order.paymentMethod] = (acc[order.paymentMethod] || 0) + 1;
        return acc;
      },
      {} as Record<PaymentMethod, number>
    );

    const ordersByFulfillmentStatus = agencyOrders.reduce(
      (acc, order) => {
        acc[order.fulfillmentStatus] = (acc[order.fulfillmentStatus] || 0) + 1;
        return acc;
      },
      {} as Record<OrderFulfillmentStatus, number>
    );

    return {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalSalesValue,
      averageOrderValue,
      ordersByStatus,
      ordersByPaymentMethod,
      ordersByFulfillmentStatus,
    };
  }
}

export default OrderService;
