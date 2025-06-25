# Offline Payment System Guide

## Overview

This guide explains how to use the Flowlytix payment system for **offline credit and cash-based distribution operations**. The system is specifically designed to handle the unique requirements of distribution businesses that operate primarily on credit terms and cash transactions.

## Key Features for Offline Operations

### ✅ **Built-in Offline Support**

- **Cash Transactions**: Immediate processing with change calculation
- **Credit Management**: Credit limit validation and approval workflows
- **Offline Sync**: Queue transactions when offline, sync when connected
- **Payment Aging**: Track overdue payments and collection activities
- **Cash Drawer Management**: Reconciliation and variance tracking

### ✅ **Credit Business Features**

- **Credit Limits**: Per-customer credit limits with validation
- **Payment Terms**: NET 15/30/45/60/90 day terms
- **Aging Reports**: Track outstanding payments by age buckets
- **Collection Workflow**: Systematic collection activity tracking
- **Approval Workflow**: Manager approval for credit limit overrides

## Payment Methods Supported

| Payment Method    | Description            | Processing          | Use Cases                      |
| ----------------- | ---------------------- | ------------------- | ------------------------------ |
| **CASH**          | Immediate cash payment | Real-time           | Direct sales, COD deliveries   |
| **CREDIT**        | Credit terms payment   | Approval required   | Regular customers, bulk orders |
| **CHEQUE**        | Check payment          | Clearance tracking  | Formal payments, large amounts |
| **BANK_TRANSFER** | Bank transfer          | Manual verification | Corporate customers            |

## Typical Offline Payment Workflows

### 1. **Cash Payment Workflow**

```typescript
// Example: Processing a cash sale
import { OfflinePaymentWorkflow } from '../domain/entities/offline-payment-workflow';
import { Money } from '../domain/value-objects/money';

// Customer pays $150 cash for $145 order
const result = OfflinePaymentWorkflow.processCashPayment(
  'order_123',
  Money.fromDecimal(145.0, 'USD'), // Order total
  Money.fromDecimal(150.0, 'USD'), // Amount received
  'cashier_001',
  'drawer_main'
);

console.log(result);
// Output:
// {
//   status: 'CASH_RECEIVED',
//   changeRequired: Money($5.00),
//   transactionComplete: true
// }
```

### 2. **Credit Transaction Workflow**

```typescript
// Example: Processing a credit sale
const creditResult = OfflinePaymentWorkflow.processCreditTransaction(
  'customer_456',
  Money.fromDecimal(500.0, 'USD'), // Order total
  Money.fromDecimal(2000.0, 'USD'), // Customer credit limit
  Money.fromDecimal(300.0, 'USD'), // Current balance
  30, // Credit days (NET 30)
  'manager_001' // Approved by
);

console.log(creditResult);
// Output:
// {
//   status: 'CREDIT_APPROVED',
//   requiresApproval: false,
//   availableCredit: Money($1700.00),
//   dueDate: Date (30 days from now)
// }
```

### 3. **Credit Limit Override Workflow**

```typescript
// Example: Customer exceeds credit limit
const overLimitResult = OfflinePaymentWorkflow.processCreditTransaction(
  'customer_456',
  Money.fromDecimal(2000.0, 'USD'), // Order total
  Money.fromDecimal(2000.0, 'USD'), // Customer credit limit
  Money.fromDecimal(500.0, 'USD'), // Current balance
  30, // Credit days
  undefined // No approval yet
);

console.log(overLimitResult);
// Output:
// {
//   status: 'CREDIT_PENDING',
//   requiresApproval: true,
//   availableCredit: Money($1500.00),
//   errors: ['Credit limit exceeded. Available: $1,500.00, Required: $2,000.00, Shortfall: $500.00']
// }
```

## Business Scenarios and Solutions

### **Scenario 1: Route Sales (Mobile/Offline)**

**Business Need**: Sales representatives visit customers with mobile devices, often without internet connectivity.

**Solution**:

```typescript
// Create offline payment when no internet
const payment = OfflinePaymentWorkflow.createOfflinePayment(
  orderId,
  orderNumber,
  customerId,
  customerName,
  orderTotal,
  PaymentMethod.CASH,
  agencyId,
  salesRepId,
  mobileDeviceId
);

// Queue for later sync
const { queueId } = OfflinePaymentWorkflow.queueOfflineTransaction(payment, mobileDeviceId, salesRepId, {
  location: 'customer_site',
  route: 'route_001',
});
```

### **Scenario 2: Credit Customer Regular Orders**

**Business Need**: Regular customers place orders on credit terms, need automatic credit validation.

**Solution**:

```typescript
// Validate credit before order processing
const validation = OfflinePaymentWorkflow.validateOfflinePayment(
  PaymentMethod.CREDIT,
  orderAmount,
  customerCreditLimit,
  customerCurrentBalance
);

if (!validation.valid) {
  // Handle credit approval workflow
  // Show warnings to user
  // Require manager approval
}
```

### **Scenario 3: Cash Drawer Management**

**Business Need**: Multiple cashiers, need to track cash transactions and reconcile drawers.

**Solution**:

```typescript
// Using the OfflinePaymentService interface
const cashSummary = await offlinePaymentService.generateDailyCashSummary(agencyId, new Date());

console.log(cashSummary);
// Output:
// {
//   totalCashSales: Money($2,450.00),
//   totalCashReceived: Money($2,465.00),
//   totalChangeGiven: Money($15.00),
//   netCashFlow: Money($2,450.00),
//   transactionCount: 23,
//   averageTransaction: Money($106.52),
//   cashDrawerVariances: Money($0.00)
// }
```

### **Scenario 4: Payment Collection Management**

**Business Need**: Track overdue payments and collection activities.

**Solution**:

```typescript
// Get aging report for collections
const agingReport = await offlinePaymentService.getAgingReport(agencyId);

// Find customers requiring collection action
const collectionsNeeded = await offlinePaymentService.getCustomersRequiringCollection(
  agencyId,
  30 // 30+ days overdue
);

// Record collection activity
await offlinePaymentService.recordCollectionActivity({
  customerId: 'customer_456',
  activityType: 'CALL',
  description: 'Called customer regarding overdue payment',
  outcome: 'PROMISED_PAYMENT',
  promisedPaymentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  promisedAmount: Money.fromDecimal(500.0, 'USD'),
  performedBy: 'collections_agent_001',
  performedAt: new Date(),
});
```

## Configuration for Your Business

### **1. Payment Terms Setup**

```typescript
// Configure standard payment terms
export const BUSINESS_PAYMENT_TERMS = {
  CASH_CUSTOMERS: CreditTerms.COD,
  NEW_CUSTOMERS: CreditTerms.NET_15,
  REGULAR_CUSTOMERS: CreditTerms.NET_30,
  PREFERRED_CUSTOMERS: CreditTerms.NET_45,
  CORPORATE_CUSTOMERS: CreditTerms.NET_60,
};
```

### **2. Credit Approval Thresholds**

```typescript
// Configure approval requirements
export const APPROVAL_THRESHOLDS = {
  CASHIER_LIMIT: Money.fromDecimal(100.0, 'USD'), // Up to $100 - no approval
  SUPERVISOR_LIMIT: Money.fromDecimal(500.0, 'USD'), // Up to $500 - supervisor approval
  MANAGER_LIMIT: Money.fromDecimal(2000.0, 'USD'), // Up to $2000 - manager approval
  OWNER_REQUIRED: Money.fromDecimal(5000.0, 'USD'), // Above $5000 - owner approval
};
```

### **3. Cash Drawer Configuration**

```typescript
// Configure cash drawer settings
export const CASH_DRAWER_CONFIG = {
  OPENING_BALANCE: Money.fromDecimal(200.0, 'USD'),
  MAXIMUM_VARIANCE: Money.fromDecimal(5.0, 'USD'),
  LARGE_TRANSACTION_THRESHOLD: Money.fromDecimal(500.0, 'USD'),
  RECONCILIATION_FREQUENCY: 'DAILY', // or 'SHIFT'
};
```

## Integration with Order Management

### **Order Creation with Payment**

```typescript
// When creating an order, also create payment record
const order = Order.create(orderProps);

// Create corresponding payment
const payment = OfflinePaymentWorkflow.createOfflinePayment(
  order.id,
  order.orderNumber,
  order.customerId,
  order.customerName,
  order.totalAmount,
  order.paymentMethod,
  order.agencyId,
  order.createdBy,
  mobileDeviceId
);

// Process payment based on method
if (order.paymentMethod === PaymentMethod.CASH) {
  const completedPayment = OfflinePaymentWorkflow.completeCashPayment(
    payment,
    amountReceived,
    receivedBy,
    cashDrawerId
  );
} else if (order.paymentMethod === PaymentMethod.CREDIT) {
  const completedPayment = OfflinePaymentWorkflow.completeCreditTransaction(
    payment,
    approvedBy,
    order.creditDays,
    dueDate
  );
}
```

## Reporting and Analytics

### **Daily Operations Reports**

1. **Cash Summary Report**: Daily cash transactions, drawer reconciliation
2. **Credit Summary Report**: Credit sales, outstanding balances, utilization
3. **Payment Aging Report**: Outstanding payments by age buckets
4. **Collection Activity Report**: Collection efforts and outcomes

### **Management Reports**

1. **Credit Risk Analysis**: Customer risk levels and exposure
2. **Payment Performance**: Average collection periods, bad debt rates
3. **Cash Flow Analysis**: Cash vs credit sales trends
4. **Operational Efficiency**: Transaction processing times, approval rates

## Best Practices for Offline Operations

### **1. Credit Management**

- ✅ Set appropriate credit limits based on customer history
- ✅ Review and update credit limits regularly
- ✅ Implement approval workflows for limit overrides
- ✅ Monitor payment aging and take timely collection action

### **2. Cash Management**

- ✅ Reconcile cash drawers daily
- ✅ Investigate and document variances
- ✅ Implement dual controls for large transactions
- ✅ Secure cash handling procedures

### **3. Offline Synchronization**

- ✅ Sync transactions as soon as connectivity is available
- ✅ Handle sync conflicts gracefully
- ✅ Maintain offline transaction logs
- ✅ Implement retry mechanisms for failed syncs

### **4. Data Integrity**

- ✅ Validate all payment data before processing
- ✅ Maintain audit trails for all transactions
- ✅ Implement backup and recovery procedures
- ✅ Regular data validation and reconciliation

## Troubleshooting Common Issues

### **Issue**: Customer exceeds credit limit

**Solution**: Use credit approval workflow, get manager authorization

### **Issue**: Cash drawer variance

**Solution**: Review transaction log, count denominations, investigate discrepancies

### **Issue**: Offline sync failures

**Solution**: Check network connectivity, retry sync, manual reconciliation if needed

### **Issue**: Payment aging disputes

**Solution**: Review payment allocation, check for unapplied payments, customer communication

## Next Steps

1. **Configure** payment terms and approval thresholds for your business
2. **Train** staff on offline payment workflows and procedures
3. **Test** offline scenarios and sync processes
4. **Monitor** payment performance and adjust policies as needed
5. **Review** reports regularly and take corrective actions

This payment system is designed to handle the complexities of offline credit and cash operations while maintaining data integrity and providing the reporting you need to manage your distribution business effectively.
