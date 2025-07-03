/**
 * Print Service - Order Document Generation & Printing
 * Handles Invoice, Packing Slip (Delivery Sheet), and Shipping Label generation
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Service Layer (Clean Architecture)
 * @version 1.0.0
 */

import { Order } from './OrderService';
import { PurchaseOrder } from './InventoryService';

/**
 * Document types available for printing
 */
export enum PrintDocumentType {
  INVOICE = 'INVOICE',
  PACKING_SLIP = 'PACKING_SLIP',
  SHIPPING_LABEL = 'SHIPPING_LABEL',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
}

/**
 * Print options interface
 */
export interface PrintOptions {
  documentTypes: PrintDocumentType[];
  copies: number;
  includeLogo: boolean;
  includeBarcode: boolean;
}

/**
 * Purchase Order Print Options interface
 */
export interface PurchaseOrderPrintOptions {
  documentTypes: PrintDocumentType[];
  copies: number;
  includeLogo: boolean;
  includeBarcode: boolean;
}

/**
 * Print Service Class
 * Implements proper resource management and memory leak prevention
 */
class PrintService {
  private static instance: PrintService;
  private printWindows: Set<Window> = new Set();

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  /**
   * Print multiple documents for an order
   */
  public async printOrder(order: Order, options: PrintOptions): Promise<void> {
    try {
      const documents = await this.generateDocuments(order, options);

      if (documents.length === 0) {
        throw new Error('No documents selected for printing');
      }

      // If only one document, print directly
      if (documents.length === 1) {
        await this.printDocument(documents[0].html, documents[0].title);
        return;
      }

      // For multiple documents, print with user confirmation
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const isLast = i === documents.length - 1;

        // Show user which document is about to print
        const proceed = confirm(
          `Ready to print document ${i + 1} of ${documents.length}: ${doc.title}\n\nClick OK to print this document.`
        );

        if (!proceed) {
          // If user cancels any document, ask if they want to continue with remaining
          const continueWithOthers = confirm(
            `Document "${doc.title}" was skipped.\n\nDo you want to continue printing the remaining documents?`
          );
          if (!continueWithOthers) {
            break;
          }
          continue;
        }

        await this.printDocument(doc.html, doc.title);

        // Add delay between prints (except for the last one)
        if (!isLast) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Print operation failed:', error);
      throw new Error('Failed to print order documents');
    }
  }

  /**
   * Print purchase order documents
   */
  public async printPurchaseOrder(purchaseOrder: PurchaseOrder, options: PurchaseOrderPrintOptions): Promise<void> {
    try {
      const documents = await this.generatePurchaseOrderDocuments(purchaseOrder, options);

      if (documents.length === 0) {
        throw new Error('No documents selected for printing');
      }

      // If only one document, print directly
      if (documents.length === 1) {
        await this.printDocument(documents[0].html, documents[0].title);
        return;
      }

      // For multiple documents, print with user confirmation
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const isLast = i === documents.length - 1;

        // Show user which document is about to print
        const proceed = confirm(
          `Ready to print document ${i + 1} of ${documents.length}: ${doc.title}\n\nClick OK to print this document.`
        );

        if (!proceed) {
          // If user cancels any document, ask if they want to continue with remaining
          const continueWithOthers = confirm(
            `Document "${doc.title}" was skipped.\n\nDo you want to continue printing the remaining documents?`
          );
          if (!continueWithOthers) {
            break;
          }
          continue;
        }

        await this.printDocument(doc.html, doc.title);

        // Add delay between prints (except for the last one)
        if (!isLast) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Purchase order print operation failed:', error);
      throw new Error('Failed to print purchase order documents');
    }
  }

  /**
   * Generate all requested documents
   */
  private async generateDocuments(
    order: Order,
    options: PrintOptions
  ): Promise<Array<{ html: string; title: string }>> {
    const documents: Array<{ html: string; title: string }> = [];

    for (const docType of options.documentTypes) {
      switch (docType) {
        case PrintDocumentType.INVOICE:
          documents.push({
            html: this.generateInvoice(order, options),
            title: `Invoice-${order.orderNumber}`,
          });
          break;
        case PrintDocumentType.PACKING_SLIP:
          documents.push({
            html: this.generatePackingSlip(order, options),
            title: `PackingSlip-${order.orderNumber}`,
          });
          break;
        case PrintDocumentType.SHIPPING_LABEL:
          documents.push({
            html: this.generateShippingLabel(order, options),
            title: `ShippingLabel-${order.orderNumber}`,
          });
          break;
      }
    }

    return documents;
  }

  /**
   * Generate all requested purchase order documents
   */
  private async generatePurchaseOrderDocuments(
    purchaseOrder: PurchaseOrder,
    options: PurchaseOrderPrintOptions
  ): Promise<Array<{ html: string; title: string }>> {
    const documents: Array<{ html: string; title: string }> = [];

    for (const docType of options.documentTypes) {
      switch (docType) {
        case PrintDocumentType.PURCHASE_ORDER:
          documents.push({
            html: this.generatePurchaseOrderDocument(purchaseOrder, options),
            title: `PurchaseOrder-${purchaseOrder.orderNumber}`,
          });
          break;
        case PrintDocumentType.PURCHASE_RECEIPT:
          documents.push({
            html: this.generatePurchaseReceiptDocument(purchaseOrder, options),
            title: `PurchaseReceipt-${purchaseOrder.orderNumber}`,
          });
          break;
      }
    }

    return documents;
  }

  /**
   * Print document using iframe approach (avoids popup blockers)
   */
  private async printDocument(html: string, title: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          throw new Error('Unable to access iframe document');
        }

        // Write content to iframe
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Wait for content to load
        iframe.onload = () => {
          try {
            // Focus and print
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();

            // Clean up after print
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve();
            }, 1000);
          } catch (err) {
            document.body.removeChild(iframe);
            reject(err);
          }
        };

        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load print content'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Invoice HTML
   */
  private generateInvoice(order: Order, options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${order.orderNumber}</title>
          <style>
            ${this.getCommonStyles()}
            .invoice-header { color: #1976d2; border-bottom: 3px solid #1976d2; }
            .invoice-number { font-size: 1.8em; color: #1976d2; }
            .amount-due { font-size: 1.5em; color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header invoice-header">
              ${options.includeLogo ? this.getLogoHTML() : ''}
              <h1>INVOICE</h1>
              <div class="invoice-number">Invoice #: ${order.orderNumber}</div>
              <div class="date">Date: ${order.orderDate.toLocaleDateString()}</div>
              ${options.includeBarcode ? this.getBarcodeHTML(order.orderNumber) : ''}
            </div>

            <div class="section-row">
              <div class="section">
                <h3>Bill To:</h3>
                <div class="address">
                  <strong>${order.customerName}</strong><br>
                  Customer Code: ${order.customerCode}<br>
                  Area: ${order.areaName}
                </div>
              </div>
              <div class="section">
                <h3>Invoice Details:</h3>
                <table class="info-table">
                  <tr><td><strong>Order Date:</strong></td><td>${order.orderDate.toLocaleDateString()}</td></tr>
                  <tr><td><strong>Payment Terms:</strong></td><td>${order.creditDays ? `${order.creditDays} days` : 'Cash'}</td></tr>
                  <tr><td><strong>Payment Method:</strong></td><td>${order.paymentMethod.replace('_', ' ')}</td></tr>
                  <tr><td><strong>Status:</strong></td><td>${order.status.replace('_', ' ')}</td></tr>
                </table>
              </div>
            </div>

            ${this.generateItemsTable(order, 'invoice')}

            <div class="totals">
              <table class="totals-table">
                <tr><td>Subtotal:</td><td>${this.formatCurrency(order.subtotalAmount)}</td></tr>
                ${order.discountAmount > 0 ? `<tr><td>Discount (${order.discountPercentage}%):</td><td class="discount">-${this.formatCurrency(order.discountAmount)}</td></tr>` : ''}
                <tr><td>Tax:</td><td>${this.formatCurrency(order.taxAmount)}</td></tr>
                <tr class="total-row"><td><strong>Total Amount:</strong></td><td class="amount-due"><strong>${this.formatCurrency(order.totalAmount)}</strong></td></tr>
              </table>
            </div>

            ${order.customerNotes ? `<div class="notes"><h4>Customer Notes:</h4><p>${order.customerNotes}</p></div>` : ''}
            
            <div class="footer">
              <p><strong>Thank you for your business!</strong></p>
              <p>Payment is due within ${order.creditDays || 0} days from invoice date.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate Packing Slip HTML (Delivery Sheet)
   */
  private generatePackingSlip(order: Order, options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Packing Slip - ${order.orderNumber}</title>
          <style>
            ${this.getCommonStyles()}
            .packing-header { color: #2e7d32; border-bottom: 3px solid #2e7d32; }
            .warehouse-info { background: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; }
            .pick-instructions { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; }
            .item-location { color: #1976d2; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header packing-header">
              ${options.includeLogo ? this.getLogoHTML() : ''}
              <h1>PACKING SLIP</h1>
              <div class="order-number">Order #: ${order.orderNumber}</div>
              <div class="date">Pick Date: ${new Date().toLocaleDateString()}</div>
              ${options.includeBarcode ? this.getBarcodeHTML(order.orderNumber) : ''}
            </div>

            <div class="warehouse-info">
              <h3>📦 Warehouse Instructions</h3>
              <p><strong>Delivery Person:</strong> ${order.workerName || 'TBD'}</p>
              <p><strong>Delivery Date:</strong> ${order.deliveryDate?.toLocaleDateString() || 'TBD'}</p>
              <p><strong>Total Items to Pick:</strong> ${order.items.length} different products</p>
            </div>

            <div class="section-row">
              <div class="section">
                <h3>Deliver To:</h3>
                <div class="address">
                  <strong>${order.customerName}</strong><br>
                  Customer Code: ${order.customerCode}<br>
                  Area: ${order.areaName}
                </div>
              </div>
              <div class="section">
                <h3>Order Details:</h3>
                <table class="info-table">
                  <tr><td><strong>Order Date:</strong></td><td>${order.orderDate.toLocaleDateString()}</td></tr>
                  <tr><td><strong>Priority:</strong></td><td>${order.status === 'CONFIRMED' ? 'HIGH' : 'NORMAL'}</td></tr>
                  <tr><td><strong>Payment Status:</strong></td><td>${order.paymentStatus.replace('_', ' ')}</td></tr>
                </table>
              </div>
            </div>

            ${this.generateItemsTable(order, 'packing')}

            <div class="pick-instructions">
              <h4>🚚 Delivery Instructions:</h4>
              <ul>
                <li>Verify all items are picked and quantities match</li>
                <li>Check product condition before dispatch</li>
                <li>Ensure customer signature on delivery</li>
                <li>Return this slip to warehouse after delivery</li>
              </ul>
              ${order.internalNotes ? `<p><strong>Special Notes:</strong> ${order.internalNotes}</p>` : ''}
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <strong>Picker Signature:</strong><br>
                <div class="signature-line"></div>
                <small>Date: _____________</small>
              </div>
              <div class="signature-box">
                <strong>Delivery Confirmation:</strong><br>
                <div class="signature-line"></div>
                <small>Customer Signature</small>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate Shipping Label HTML
   */
  private generateShippingLabel(order: Order, options: PrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Shipping Label - ${order.orderNumber}</title>
          <style>
            ${this.getCommonStyles()}
            .label { 
              width: 4in; 
              height: 6in; 
              border: 2px solid #000; 
              padding: 10px; 
              font-family: Arial, sans-serif;
              font-size: 12px;
            }
            .label-header { text-align: center; border-bottom: 1px solid #000; margin-bottom: 10px; padding-bottom: 10px; }
            .barcode { text-align: center; font-family: monospace; font-size: 24px; letter-spacing: 2px; }
            .from-address, .to-address { margin: 10px 0; }
            .to-address { border: 1px solid #000; padding: 8px; }
            .order-info { background: #f0f0f0; padding: 5px; margin: 5px 0; }
            .logo-compact { font-size: 0.8em; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="label-header">
              ${
                options.includeLogo
                  ? `
                <div class="logo-compact">
                  <div style="font-weight: bold; color: #1976d2;">FLOWLYTIX</div>
                  <div style="font-size: 0.8em; color: #666;">Distribution System</div>
                </div>
              `
                  : ''
              }
              <strong>SHIPPING LABEL</strong>
            </div>

            <div class="from-address">
              <strong>FROM:</strong><br>
              Flowlytix Distribution Center<br>
              123 Warehouse District<br>
              Industrial Zone, City 12345<br>
              Tel: (555) 123-4567
            </div>

            <div class="to-address">
              <strong>SHIP TO:</strong><br>
              <strong>${order.customerName}</strong><br>
              Customer Code: ${order.customerCode}<br>
              Area: ${order.areaName}<br>
              ${order.deliveryDate ? `Delivery: ${order.deliveryDate.toLocaleDateString()}` : ''}
            </div>

            <div class="order-info">
              <strong>Order #:</strong> ${order.orderNumber}<br>
              <strong>Items:</strong> ${order.items.length} products<br>
              <strong>Weight:</strong> ${this.calculateWeight(order)} kg<br>
              <strong>Delivery Person:</strong> ${order.workerName || 'TBD'}
            </div>

            ${
              options.includeBarcode
                ? `
              <div class="barcode">
                *${order.orderNumber}*<br>
                <small>${order.orderNumber}</small>
              </div>
            `
                : ''
            }

            <div style="margin-top: 10px; text-align: center; font-size: 10px;">
              <strong>Handling Instructions:</strong><br>
              ${order.status === 'CONFIRMED' ? '⚠️ PRIORITY DELIVERY' : '📦 Standard Delivery'}<br>
              Signature Required: ${order.totalAmount > 1000 ? 'YES' : 'NO'}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate items table for different document types
   */
  private generateItemsTable(order: Order, documentType: 'invoice' | 'packing'): string {
    const isInvoice = documentType === 'invoice';

    return `
      <table class="items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Code</th>
            <th>Quantity</th>
            ${isInvoice ? '<th>Unit Price</th>' : ''}
            ${isInvoice ? '<th>Discount</th>' : '<th>Location</th>'}
            ${isInvoice ? '<th>Total</th>' : '<th>Status</th>'}
          </tr>
        </thead>
        <tbody>
          ${order.items
            .map(
              (item) => `
            <tr>
              <td><strong>${item.productName}</strong></td>
              <td>${item.productCode}</td>
              <td>
                ${item.quantityBoxes}B + ${item.quantityLoose}L<br>
                <small>= ${item.totalUnits} units</small>
              </td>
              ${isInvoice ? `<td>${this.formatCurrency(item.unitPrice)}</td>` : ''}
              ${
                isInvoice
                  ? `<td class="discount">${item.discountPercentage > 0 ? `${item.discountPercentage}%` : '-'}</td>`
                  : '<td class="item-location">A-1-B</td>'
              }
              ${isInvoice ? `<td><strong>${this.formatCurrency(item.itemTotal)}</strong></td>` : '<td>☐ Picked</td>'}
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Common CSS styles for all documents
   */
  private getCommonStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        line-height: 1.4; 
        color: #333;
        background: white;
      }
      .document { 
        max-width: 8.5in; 
        margin: 0 auto; 
        padding: 20px; 
        background: white;
      }
      .header { 
        text-align: center; 
        margin-bottom: 30px; 
        padding-bottom: 15px;
      }
      .header h1 { 
        font-size: 2.5em; 
        margin-bottom: 10px; 
      }
      .section-row { 
        display: flex; 
        justify-content: space-between; 
        margin: 20px 0; 
        gap: 20px;
      }
      .section { 
        flex: 1; 
      }
      .section h3 { 
        margin-bottom: 10px; 
        color: #666;
        border-bottom: 1px solid #eee;
        padding-bottom: 5px;
      }
      .address { 
        background: #f9f9f9; 
        padding: 15px; 
        border-radius: 4px;
        border: 1px solid #ddd;
      }
      .info-table { 
        width: 100%; 
        border-collapse: collapse; 
      }
      .info-table td { 
        padding: 4px 8px; 
        border-bottom: 1px solid #eee; 
      }
      .items-table { 
        width: 100%; 
        border-collapse: collapse; 
        margin: 20px 0; 
        border: 1px solid #ddd;
      }
      .items-table th, .items-table td { 
        border: 1px solid #ddd; 
        padding: 12px 8px; 
        text-align: left; 
      }
      .items-table th { 
        background-color: #f5f5f5; 
        font-weight: bold; 
        text-align: center;
      }
      .items-table td:nth-child(3), 
      .items-table td:nth-child(4), 
      .items-table td:nth-child(5), 
      .items-table td:nth-child(6) { 
        text-align: center; 
      }
      .totals { 
        margin-top: 30px; 
        text-align: right; 
      }
      .totals-table { 
        width: 300px; 
        margin-left: auto; 
        border-collapse: collapse;
      }
      .totals-table td { 
        padding: 8px 12px; 
        border-bottom: 1px solid #eee; 
      }
      .total-row { 
        border-top: 2px solid #333; 
        font-size: 1.2em; 
      }
      .discount { 
        color: #d32f2f; 
      }
      .notes { 
        margin: 30px 0; 
        padding: 15px; 
        background: #f0f8ff; 
        border-left: 4px solid #1976d2; 
      }
      .footer { 
        margin-top: 40px; 
        text-align: center; 
        color: #666; 
        border-top: 1px solid #eee; 
        padding-top: 20px;
      }
      .signature-section { 
        display: flex; 
        justify-content: space-between; 
        margin-top: 40px; 
        gap: 20px;
      }
      .signature-box { 
        flex: 1; 
        text-align: center; 
      }
      .signature-line { 
        border-bottom: 1px solid #000; 
        height: 40px; 
        margin: 10px 0; 
      }
      @media print {
        .document { margin: 0; padding: 10px; }
        .no-print { display: none; }
        body { print-color-adjust: exact; }
      }
    `;
  }

  /**
   * Get logo HTML if needed
   */
  private getLogoHTML(): string {
    return `
      <div style="text-align: center; margin-bottom: 20px; padding: 10px; border: 2px solid #1976d2; border-radius: 8px; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
          <div style="width: 40px; height: 40px; background: #1976d2; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-weight: bold; font-size: 20px;">F</span>
          </div>
          <div>
            <div style="font-size: 1.8em; font-weight: bold; color: #1976d2; letter-spacing: 1px;">FLOWLYTIX</div>
            <div style="font-size: 0.9em; color: #666; font-style: italic;">Distribution Management System</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get barcode HTML for any document type
   */
  private getBarcodeHTML(orderNumber: string): string {
    return `
      <div style="text-align: center; margin: 15px 0; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
        <div style="font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 3px; font-weight: bold; margin-bottom: 5px;">
          *${orderNumber}*
        </div>
        <div style="font-size: 11px; color: #666;">
          ${orderNumber}
        </div>
      </div>
    `;
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  /**
   * Calculate estimated weight
   */
  private calculateWeight(order: Order): string {
    // Simple calculation based on item count (can be enhanced with actual product weights)
    const estimatedWeight = order.items.reduce((total, item) => total + item.totalUnits * 0.5, 0);
    return estimatedWeight.toFixed(1);
  }

  /**
   * Cleanup method for memory leak prevention
   */
  public cleanup(): void {
    this.printWindows.forEach((window) => {
      if (!window.closed) {
        window.close();
      }
    });
    this.printWindows.clear();
  }

  /**
   * Generate Purchase Order HTML
   */
  private generatePurchaseOrderDocument(purchaseOrder: PurchaseOrder, options: PurchaseOrderPrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Purchase Order - ${purchaseOrder.orderNumber}</title>
          <style>
            ${this.getCommonStyles()}
            .purchase-order-header { color: #4caf50; border-bottom: 3px solid #4caf50; }
            .order-number { font-size: 1.8em; color: #4caf50; }
            .total-amount { font-size: 1.5em; color: #1976d2; background: #e3f2fd; padding: 10px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header purchase-order-header">
              ${options.includeLogo ? this.getLogoHTML() : ''}
              <h1>PURCHASE ORDER</h1>
              <div class="order-number">Order #: ${purchaseOrder.orderNumber}</div>
              <div class="date">Date: ${purchaseOrder.orderDate.toLocaleDateString()}</div>
              ${options.includeBarcode ? this.getBarcodeHTML(purchaseOrder.orderNumber) : ''}
            </div>

            <div class="section-row">
              <div class="section">
                <h3>Supplier:</h3>
                <div class="address">
                  <strong>${purchaseOrder.supplierName}</strong><br>
                  Supplier ID: ${purchaseOrder.supplierId}
                </div>
              </div>
              <div class="section">
                <h3>Order Details:</h3>
                <table class="info-table">
                  <tr><td><strong>Order Date:</strong></td><td>${purchaseOrder.orderDate.toLocaleDateString()}</td></tr>
                  <tr><td><strong>Expected Delivery:</strong></td><td>${purchaseOrder.expectedDeliveryDate?.toLocaleDateString() || 'TBD'}</td></tr>
                  <tr><td><strong>Warehouse:</strong></td><td>${purchaseOrder.warehouseId}</td></tr>
                  <tr><td><strong>Status:</strong></td><td>${purchaseOrder.status.replace('_', ' ')}</td></tr>
                </table>
              </div>
            </div>

            ${this.generatePurchaseOrderItemsTable(purchaseOrder)}

            <div class="totals">
              <table class="totals-table">
                <tr><td>Subtotal:</td><td>${this.formatCurrency(purchaseOrder.subtotalAmount)}</td></tr>
                <tr><td>Tax:</td><td>${this.formatCurrency(purchaseOrder.taxAmount)}</td></tr>
                <tr class="total-row"><td><strong>Total Amount:</strong></td><td class="total-amount"><strong>${this.formatCurrency(purchaseOrder.totalAmount)}</strong></td></tr>
              </table>
            </div>

            ${purchaseOrder.notes ? `<div class="notes"><h4>Order Notes:</h4><p>${purchaseOrder.notes}</p></div>` : ''}

            <div class="footer">
              <p><strong>Flowlytix Distribution System</strong></p>
              <p>Purchase Order generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate Purchase Receipt HTML
   */
  private generatePurchaseReceiptDocument(purchaseOrder: PurchaseOrder, options: PurchaseOrderPrintOptions): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Purchase Receipt - ${purchaseOrder.orderNumber}</title>
          <style>
            ${this.getCommonStyles()}
            .receipt-header { color: #ff9800; border-bottom: 3px solid #ff9800; }
            .receipt-number { font-size: 1.8em; color: #ff9800; }
            .received-status { background: #e8f5e8; padding: 15px; border-radius: 4px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header receipt-header">
              ${options.includeLogo ? this.getLogoHTML() : ''}
              <h1>PURCHASE RECEIPT</h1>
              <div class="receipt-number">Receipt for Order #: ${purchaseOrder.orderNumber}</div>
              <div class="date">Received Date: ${purchaseOrder.actualDeliveryDate?.toLocaleDateString() || new Date().toLocaleDateString()}</div>
              ${options.includeBarcode ? this.getBarcodeHTML(purchaseOrder.orderNumber) : ''}
            </div>

            <div class="received-status">
              <h3>📦 Receipt Confirmation</h3>
              <p><strong>Supplier:</strong> ${purchaseOrder.supplierName}</p>
              <p><strong>Warehouse:</strong> ${purchaseOrder.warehouseId}</p>
              <p><strong>Received By:</strong> ${purchaseOrder.updatedBy || 'Warehouse Staff'}</p>
            </div>

            <div class="section-row">
              <div class="section">
                <h3>Supplier Information:</h3>
                <div class="address">
                  <strong>${purchaseOrder.supplierName}</strong><br>
                  Supplier ID: ${purchaseOrder.supplierId}
                </div>
              </div>
              <div class="section">
                <h3>Receipt Details:</h3>
                <table class="info-table">
                  <tr><td><strong>Original Order Date:</strong></td><td>${purchaseOrder.orderDate.toLocaleDateString()}</td></tr>
                  <tr><td><strong>Expected Delivery:</strong></td><td>${purchaseOrder.expectedDeliveryDate?.toLocaleDateString() || 'TBD'}</td></tr>
                  <tr><td><strong>Actual Delivery:</strong></td><td>${purchaseOrder.actualDeliveryDate?.toLocaleDateString() || new Date().toLocaleDateString()}</td></tr>
                  <tr><td><strong>Status:</strong></td><td>${purchaseOrder.status.replace('_', ' ')}</td></tr>
                </table>
              </div>
            </div>

            ${this.generatePurchaseOrderItemsTable(purchaseOrder, true)}

            <div class="totals">
              <table class="totals-table">
                <tr><td>Subtotal:</td><td>${this.formatCurrency(purchaseOrder.subtotalAmount)}</td></tr>
                <tr><td>Tax:</td><td>${this.formatCurrency(purchaseOrder.taxAmount)}</td></tr>
                <tr class="total-row"><td><strong>Total Amount:</strong></td><td><strong>${this.formatCurrency(purchaseOrder.totalAmount)}</strong></td></tr>
              </table>
            </div>

            <div class="signature-section">
              <div class="signature-box">
                <strong>Warehouse Manager:</strong><br>
                <div class="signature-line"></div>
                <small>Date: _____________</small>
              </div>
              <div class="signature-box">
                <strong>Quality Control:</strong><br>
                <div class="signature-line"></div>
                <small>Approved By</small>
              </div>
            </div>

            <div class="footer">
              <p><strong>Flowlytix Distribution System</strong></p>
              <p>Purchase Receipt generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate Purchase Order Items Table
   */
  private generatePurchaseOrderItemsTable(purchaseOrder: PurchaseOrder, showReceived: boolean = false): string {
    return `
      <div class="section">
        <h3>Items Ordered:</h3>
        <table class="items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Code</th>
              <th>Quantity</th>
              <th>Unit Cost</th>
              <th>Total Cost</th>
              ${showReceived ? '<th>Received</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${purchaseOrder.items
              .map(
                (item) => `
              <tr>
                <td>
                  <strong>${item.productName}</strong>
                  ${item.notes ? `<br><small>${item.notes}</small>` : ''}
                </td>
                <td>${item.productCode}</td>
                <td>${item.quantity}</td>
                <td>${this.formatCurrency(item.unitCost)}</td>
                <td>${this.formatCurrency(item.totalCost)}</td>
                ${showReceived ? `<td>${item.receivedQuantity} / ${item.quantity}</td>` : ''}
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

export default PrintService.getInstance();
