/**
 * Invoice Store using Zustand
 * Following Instructions standards for state management and invoice domain patterns
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { TransactionService } from '../services/TransactionService';
import type {
  Invoice,
  InvoiceListItem,
  InvoiceFilters,
  InvoiceListResponse,
  InvoiceTemplate,
  InvoiceGenerationRequest,
  InvoiceAnalytics,
  InvoicePayment,
} from '../domains/payment/types/PaymentTypes';
import { PaymentStatus } from '../domains/payment/valueObjects/PaymentStatus';

/**
 * Invoice store state interface
 */
interface InvoiceState {
  // Core invoice data
  invoices: InvoiceListItem[];
  selectedInvoice: Invoice | null;
  invoiceTemplates: InvoiceTemplate[];
  invoiceAnalytics: InvoiceAnalytics | null;

  // Draft and temporary invoices
  draftInvoices: Record<string, Partial<Invoice>>; // Keyed by customerId or temp ID

  // UI state
  loading: boolean;
  error: string | null;

  // Filters and pagination
  filters: InvoiceFilters;
  currentPage: number;
  totalPages: number;
  totalInvoices: number;

  // Generation and processing
  generationQueue: InvoiceGenerationRequest[];
  processingInvoices: string[]; // Invoice IDs being processed

  // Settings and preferences
  invoiceSettings: {
    defaultTemplate: string;
    autoGenerateNumbers: boolean;
    numberPrefix: string;
    numberStartFrom: number;
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
    defaultDueDays: number;
    enableLateFeesAlerts: boolean;
    lateFeePercentage: number;
    recurringInvoiceEnabled: boolean;
  };

  // Cache and performance
  lastLoadTime: Date | null;
  isRefreshing: boolean;
  templateCache: Record<string, InvoiceTemplate>;
}

/**
 * Invoice store actions interface
 */
interface InvoiceActions {
  // Invoice CRUD operations
  loadInvoices: (page?: number, limit?: number, customFilters?: InvoiceFilters) => Promise<void>;
  generateInvoice: (request: InvoiceGenerationRequest) => Promise<Invoice>;
  updateInvoice: (invoiceId: string, updates: Partial<Invoice>) => Promise<Invoice>;
  deleteInvoice: (invoiceId: string) => Promise<void>;

  // Invoice selection and details
  selectInvoice: (invoiceId: string) => Promise<void>;
  clearSelectedInvoice: () => void;

  // Draft management
  saveDraftInvoice: (customerId: string, draftData: Partial<Invoice>) => void;
  loadDraftInvoice: (customerId: string) => Partial<Invoice> | null;
  clearDraftInvoice: (customerId: string) => void;
  clearAllDrafts: () => void;

  // Template management
  loadInvoiceTemplates: () => Promise<void>;
  createInvoiceTemplate: (template: Omit<InvoiceTemplate, 'id'>) => Promise<InvoiceTemplate>;
  updateInvoiceTemplate: (templateId: string, updates: Partial<InvoiceTemplate>) => Promise<InvoiceTemplate>;
  deleteInvoiceTemplate: (templateId: string) => Promise<void>;

  // Payment and status updates
  recordInvoicePayment: (invoiceId: string, payment: InvoicePayment) => Promise<Invoice>;
  markInvoiceAsPaid: (invoiceId: string) => Promise<Invoice>;
  markInvoiceAsOverdue: (invoiceId: string) => Promise<Invoice>;

  // Bulk operations
  bulkUpdateInvoices: (invoiceIds: string[], updates: Partial<Invoice>) => Promise<void>;
  bulkDeleteInvoices: (invoiceIds: string[]) => Promise<void>;

  // Analytics and reporting
  loadInvoiceAnalytics: (agencyId: string, dateFrom: Date, dateTo: Date) => Promise<void>;

  // Filters and search
  setFilters: (newFilters: Partial<InvoiceFilters>) => void;
  clearFilters: () => void;

  // Settings management
  updateInvoiceSettings: (newSettings: Partial<InvoiceState['invoiceSettings']>) => void;
  resetInvoiceSettings: () => void;

  // Utility actions
  refresh: () => Promise<void>;
  clearError: () => void;
  clearCache: () => void;
}

/**
 * Combined invoice store interface
 */
export interface InvoiceStore extends InvoiceState, InvoiceActions {}

/**
 * Default invoice settings
 */
const defaultInvoiceSettings: InvoiceState['invoiceSettings'] = {
  defaultTemplate: 'standard',
  autoGenerateNumbers: true,
  numberPrefix: 'INV-',
  numberStartFrom: 1000,
  enableEmailNotifications: true,
  enableSmsNotifications: false,
  defaultDueDays: 30,
  enableLateFeesAlerts: true,
  lateFeePercentage: 1.5,
  recurringInvoiceEnabled: false,
};

/**
 * Initial invoice state
 */
const initialState: InvoiceState = {
  invoices: [],
  selectedInvoice: null,
  invoiceTemplates: [],
  invoiceAnalytics: null,
  draftInvoices: {},
  loading: false,
  error: null,
  filters: {},
  currentPage: 1,
  totalPages: 0,
  totalInvoices: 0,
  generationQueue: [],
  processingInvoices: [],
  invoiceSettings: defaultInvoiceSettings,
  lastLoadTime: null,
  isRefreshing: false,
  templateCache: {},
};

/**
 * Invoice store implementation
 * Using Zustand with TypeScript, DevTools, Persistence, and Immer
 */
export const useInvoiceStore = create<InvoiceStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        /**
         * Load invoices with filtering and pagination
         */
        loadInvoices: async (page: number = 1, limit: number = 25, customFilters?: InvoiceFilters): Promise<void> => {
          console.log('📄 Invoice Store: Loading invoices with filters:', { page, limit, customFilters });

          set((state) => {
            state.loading = true;
            state.error = null;
            if (page === 1) {
              state.invoices = []; // Clear invoices for fresh load
            }
          });

          try {
            const currentFilters = customFilters || get().filters;

            // Get current agency from agency store (TODO: implement proper dependency)
            const agencyId = 'current-agency-id'; // TODO: Get from agency store

            const response: InvoiceListResponse = await TransactionService.getInvoices(
              agencyId,
              page,
              limit,
              currentFilters
            );

            set((state) => {
              if (page === 1) {
                state.invoices = response.invoices;
              } else {
                // Append for pagination
                state.invoices.push(...response.invoices);
              }

              state.currentPage = response.page;
              state.totalPages = response.totalPages;
              state.totalInvoices = response.total;
              state.loading = false;
              state.lastLoadTime = new Date();

              // Update filters if custom filters were provided
              if (customFilters) {
                state.filters = { ...state.filters, ...customFilters };
              }
            });

            console.log('✅ Invoice Store: Invoices loaded successfully', {
              count: response.invoices.length,
              total: response.total,
              page: response.page,
            });
          } catch (error) {
            console.error('❌ Invoice Store: Failed to load invoices:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load invoices';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Generate a new invoice
         */
        generateInvoice: async (request: InvoiceGenerationRequest): Promise<Invoice> => {
          console.log('📄 Invoice Store: Generating invoice:', request);

          set((state) => {
            state.loading = true;
            state.error = null;
            state.generationQueue.push(request);
          });

          try {
            const invoice = await TransactionService.generateInvoice(request);

            // Convert to list item for UI
            const invoiceListItem: InvoiceListItem = {
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerId: invoice.customerId,
              customerName: invoice.customerName,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              formattedAmount: `$${invoice.totalAmount.toLocaleString()}`,
              status: invoice.status,
              statusText: invoice.status, // TODO: Use InvoiceStatusUtils
              statusColor: invoice.status === PaymentStatus.PAID ? '#4caf50' : '#ff9800',
              issuedDate: invoice.issuedDate,
              dueDate: invoice.dueDate,
              isPastDue: new Date() > new Date(invoice.dueDate) && invoice.status !== PaymentStatus.PAID,
              agencyId: invoice.agencyId,
              canEdit: true,
              canDelete: true,
              canEmail: true,
              canPrint: true,
            };

            set((state) => {
              // Add new invoice to the beginning of the list
              state.invoices.unshift(invoiceListItem);
              state.totalInvoices += 1;
              state.loading = false;

              // Remove from generation queue
              state.generationQueue = state.generationQueue.filter((req) => req !== request);
            });

            console.log('✅ Invoice Store: Invoice generated successfully:', invoice.id);
            return invoice;
          } catch (error) {
            console.error('❌ Invoice Store: Failed to generate invoice:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoice';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
              // Remove from generation queue
              state.generationQueue = state.generationQueue.filter((req) => req !== request);
            });

            throw error;
          }
        },

        /**
         * Update an existing invoice
         */
        updateInvoice: async (invoiceId: string, updates: Partial<Invoice>): Promise<Invoice> => {
          console.log('📄 Invoice Store: Updating invoice:', { invoiceId, updates });

          set((state) => {
            state.loading = true;
            state.error = null;
            state.processingInvoices.push(invoiceId);
          });

          try {
            const updatedInvoice = await TransactionService.updateInvoice(invoiceId, updates);

            set((state) => {
              // Update invoice in the list
              const index = state.invoices.findIndex((inv) => inv.id === invoiceId);
              if (index !== -1) {
                state.invoices[index] = {
                  ...state.invoices[index],
                  amount: updatedInvoice.totalAmount,
                  status: updatedInvoice.status,
                  dueDate: updatedInvoice.dueDate,
                  // TODO: Update other fields as needed
                };
              }

              // Update selected invoice if it's the one being updated
              if (state.selectedInvoice?.id === invoiceId) {
                state.selectedInvoice = updatedInvoice;
              }

              state.loading = false;
              state.processingInvoices = state.processingInvoices.filter((id) => id !== invoiceId);
            });

            console.log('✅ Invoice Store: Invoice updated successfully:', invoiceId);
            return updatedInvoice;
          } catch (error) {
            console.error('❌ Invoice Store: Failed to update invoice:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
              state.processingInvoices = state.processingInvoices.filter((id) => id !== invoiceId);
            });

            throw error;
          }
        },

        /**
         * Delete an invoice
         */
        deleteInvoice: async (invoiceId: string): Promise<void> => {
          console.log('📄 Invoice Store: Deleting invoice:', invoiceId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            await TransactionService.deleteInvoice(invoiceId);

            set((state) => {
              // Remove invoice from the list
              state.invoices = state.invoices.filter((inv) => inv.id !== invoiceId);
              state.totalInvoices -= 1;

              // Clear selected invoice if it's the one being deleted
              if (state.selectedInvoice?.id === invoiceId) {
                state.selectedInvoice = null;
              }

              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice deleted successfully:', invoiceId);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to delete invoice:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Select an invoice for detailed view
         */
        selectInvoice: async (invoiceId: string): Promise<void> => {
          console.log('📄 Invoice Store: Selecting invoice:', invoiceId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            const invoice = await TransactionService.getInvoiceById(invoiceId);

            set((state) => {
              state.selectedInvoice = invoice;
              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice selected successfully:', invoiceId);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to select invoice:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice details';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Clear selected invoice
         */
        clearSelectedInvoice: (): void => {
          set((state) => {
            state.selectedInvoice = null;
          });
        },

        /**
         * Save draft invoice
         */
        saveDraftInvoice: (customerId: string, draftData: Partial<Invoice>): void => {
          console.log('💾 Invoice Store: Saving draft invoice for customer:', customerId);

          set((state) => {
            state.draftInvoices[customerId] = {
              ...state.draftInvoices[customerId],
              ...draftData,
              lastModified: new Date(),
            };
          });
        },

        /**
         * Load draft invoice
         */
        loadDraftInvoice: (customerId: string): Partial<Invoice> | null => {
          const draft = get().draftInvoices[customerId];
          console.log(
            '📄 Invoice Store: Loading draft invoice for customer:',
            customerId,
            draft ? 'found' : 'not found'
          );
          return draft || null;
        },

        /**
         * Clear draft invoice
         */
        clearDraftInvoice: (customerId: string): void => {
          console.log('🗑️ Invoice Store: Clearing draft invoice for customer:', customerId);

          set((state) => {
            delete state.draftInvoices[customerId];
          });
        },

        /**
         * Clear all drafts
         */
        clearAllDrafts: (): void => {
          console.log('🗑️ Invoice Store: Clearing all draft invoices');

          set((state) => {
            state.draftInvoices = {};
          });
        },

        /**
         * Load invoice templates
         */
        loadInvoiceTemplates: async (): Promise<void> => {
          console.log('📄 Invoice Store: Loading invoice templates');

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement getInvoiceTemplates in service
            const templates: InvoiceTemplate[] = [
              {
                id: 'standard',
                name: 'Standard Template',
                description: 'Standard invoice template with company branding',
                isDefault: true,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ];

            set((state) => {
              state.invoiceTemplates = templates;
              state.loading = false;

              // Update template cache
              templates.forEach((template) => {
                state.templateCache[template.id] = template;
              });
            });

            console.log('✅ Invoice Store: Invoice templates loaded:', templates.length);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to load invoice templates:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice templates';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Create invoice template
         */
        createInvoiceTemplate: async (template: Omit<InvoiceTemplate, 'id'>): Promise<InvoiceTemplate> => {
          console.log('📄 Invoice Store: Creating invoice template:', template.name);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement createInvoiceTemplate in service
            const newTemplate: InvoiceTemplate = {
              ...template,
              id: `template-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            set((state) => {
              state.invoiceTemplates.push(newTemplate);
              state.templateCache[newTemplate.id] = newTemplate;
              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice template created:', newTemplate.id);
            return newTemplate;
          } catch (error) {
            console.error('❌ Invoice Store: Failed to create invoice template:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to create invoice template';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Update invoice template
         */
        updateInvoiceTemplate: async (
          templateId: string,
          updates: Partial<InvoiceTemplate>
        ): Promise<InvoiceTemplate> => {
          console.log('📄 Invoice Store: Updating invoice template:', templateId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement updateInvoiceTemplate in service
            const updatedTemplate: InvoiceTemplate = {
              ...state.templateCache[templateId],
              ...updates,
              updatedAt: new Date().toISOString(),
            };

            set((state) => {
              // Update in templates array
              const index = state.invoiceTemplates.findIndex((t) => t.id === templateId);
              if (index !== -1) {
                state.invoiceTemplates[index] = updatedTemplate;
              }

              // Update in cache
              state.templateCache[templateId] = updatedTemplate;
              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice template updated:', templateId);
            return updatedTemplate;
          } catch (error) {
            console.error('❌ Invoice Store: Failed to update invoice template:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to update invoice template';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Delete invoice template
         */
        deleteInvoiceTemplate: async (templateId: string): Promise<void> => {
          console.log('📄 Invoice Store: Deleting invoice template:', templateId);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement deleteInvoiceTemplate in service

            set((state) => {
              // Remove from templates array
              state.invoiceTemplates = state.invoiceTemplates.filter((t) => t.id !== templateId);

              // Remove from cache
              delete state.templateCache[templateId];

              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice template deleted:', templateId);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to delete invoice template:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoice template';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Record invoice payment
         */
        recordInvoicePayment: async (invoiceId: string, payment: InvoicePayment): Promise<Invoice> => {
          console.log('💰 Invoice Store: Recording invoice payment:', { invoiceId, payment });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement recordInvoicePayment in service
            const updatedInvoice = await TransactionService.recordInvoicePayment(invoiceId, payment);

            set((state) => {
              // Update invoice in the list
              const index = state.invoices.findIndex((inv) => inv.id === invoiceId);
              if (index !== -1) {
                state.invoices[index] = {
                  ...state.invoices[index],
                  status: updatedInvoice.status,
                  statusText: updatedInvoice.status,
                  statusColor: updatedInvoice.status === PaymentStatus.PAID ? '#4caf50' : '#ff9800',
                };
              }

              // Update selected invoice if it's the one being updated
              if (state.selectedInvoice?.id === invoiceId) {
                state.selectedInvoice = updatedInvoice;
              }

              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice payment recorded:', invoiceId);
            return updatedInvoice;
          } catch (error) {
            console.error('❌ Invoice Store: Failed to record invoice payment:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to record invoice payment';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Mark invoice as paid
         */
        markInvoiceAsPaid: async (invoiceId: string): Promise<Invoice> => {
          console.log('✅ Invoice Store: Marking invoice as paid:', invoiceId);

          return get().updateInvoice(invoiceId, { status: PaymentStatus.PAID });
        },

        /**
         * Mark invoice as overdue
         */
        markInvoiceAsOverdue: async (invoiceId: string): Promise<Invoice> => {
          console.log('⏰ Invoice Store: Marking invoice as overdue:', invoiceId);

          return get().updateInvoice(invoiceId, { status: PaymentStatus.OVERDUE });
        },

        /**
         * Bulk update invoices
         */
        bulkUpdateInvoices: async (invoiceIds: string[], updates: Partial<Invoice>): Promise<void> => {
          console.log('📄 Invoice Store: Bulk updating invoices:', { count: invoiceIds.length, updates });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement bulkUpdateInvoices in service
            await Promise.all(invoiceIds.map((id) => TransactionService.updateInvoice(id, updates)));

            set((state) => {
              // Update invoices in the list
              invoiceIds.forEach((invoiceId) => {
                const index = state.invoices.findIndex((inv) => inv.id === invoiceId);
                if (index !== -1) {
                  state.invoices[index] = {
                    ...state.invoices[index],
                    ...updates,
                  };
                }
              });

              state.loading = false;
            });

            console.log('✅ Invoice Store: Bulk update completed:', invoiceIds.length);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to bulk update invoices:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to update invoices';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Bulk delete invoices
         */
        bulkDeleteInvoices: async (invoiceIds: string[]): Promise<void> => {
          console.log('📄 Invoice Store: Bulk deleting invoices:', invoiceIds.length);

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement bulkDeleteInvoices in service
            await Promise.all(invoiceIds.map((id) => TransactionService.deleteInvoice(id)));

            set((state) => {
              // Remove invoices from the list
              state.invoices = state.invoices.filter((inv) => !invoiceIds.includes(inv.id));
              state.totalInvoices -= invoiceIds.length;

              // Clear selected invoice if it's one of the deleted ones
              if (state.selectedInvoice && invoiceIds.includes(state.selectedInvoice.id)) {
                state.selectedInvoice = null;
              }

              state.loading = false;
            });

            console.log('✅ Invoice Store: Bulk delete completed:', invoiceIds.length);
          } catch (error) {
            console.error('❌ Invoice Store: Failed to bulk delete invoices:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to delete invoices';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Load invoice analytics
         */
        loadInvoiceAnalytics: async (agencyId: string, dateFrom: Date, dateTo: Date): Promise<void> => {
          console.log('📊 Invoice Store: Loading invoice analytics:', { agencyId, dateFrom, dateTo });

          set((state) => {
            state.loading = true;
            state.error = null;
          });

          try {
            // TODO: Implement getInvoiceAnalytics in service
            const analytics: InvoiceAnalytics = {
              totalInvoices: 0,
              totalAmount: 0,
              paidAmount: 0,
              unpaidAmount: 0,
              overdueAmount: 0,
              averageInvoiceAmount: 0,
              paymentRate: 0,
              // ... other analytics fields
            };

            set((state) => {
              state.invoiceAnalytics = analytics;
              state.loading = false;
            });

            console.log('✅ Invoice Store: Invoice analytics loaded');
          } catch (error) {
            console.error('❌ Invoice Store: Failed to load invoice analytics:', error);

            const errorMessage = error instanceof Error ? error.message : 'Failed to load invoice analytics';

            set((state) => {
              state.loading = false;
              state.error = errorMessage;
            });

            throw error;
          }
        },

        /**
         * Set invoice filters
         */
        setFilters: (newFilters: Partial<InvoiceFilters>): void => {
          console.log('🔍 Invoice Store: Setting filters:', newFilters);

          set((state) => {
            state.filters = { ...state.filters, ...newFilters };
          });

          // Auto-reload with new filters
          get().loadInvoices(1, 25);
        },

        /**
         * Clear all filters
         */
        clearFilters: (): void => {
          console.log('🔍 Invoice Store: Clearing filters');

          set((state) => {
            state.filters = {};
          });

          // Reload without filters
          get().loadInvoices(1, 25);
        },

        /**
         * Update invoice settings
         */
        updateInvoiceSettings: (newSettings: Partial<InvoiceState['invoiceSettings']>): void => {
          console.log('⚙️ Invoice Store: Updating invoice settings:', newSettings);

          set((state) => {
            state.invoiceSettings = { ...state.invoiceSettings, ...newSettings };
          });
        },

        /**
         * Reset invoice settings to defaults
         */
        resetInvoiceSettings: (): void => {
          console.log('🔄 Invoice Store: Resetting invoice settings to defaults');

          set((state) => {
            state.invoiceSettings = { ...defaultInvoiceSettings };
          });
        },

        /**
         * Refresh all invoice data
         */
        refresh: async (): Promise<void> => {
          console.log('🔄 Invoice Store: Refreshing all invoice data');

          set((state) => {
            state.isRefreshing = true;
          });

          try {
            await Promise.all([get().loadInvoices(1, 25), get().loadInvoiceTemplates()]);

            console.log('✅ Invoice Store: Refresh completed');
          } catch (error) {
            console.error('❌ Invoice Store: Refresh failed:', error);
          } finally {
            set((state) => {
              state.isRefreshing = false;
            });
          }
        },

        /**
         * Clear error state
         */
        clearError: (): void => {
          set((state) => {
            state.error = null;
          });
        },

        /**
         * Clear cache and reset state
         */
        clearCache: (): void => {
          console.log('🗑️ Invoice Store: Clearing cache');

          set((state) => {
            state.invoices = [];
            state.selectedInvoice = null;
            state.invoiceAnalytics = null;
            state.invoiceTemplates = [];
            state.lastLoadTime = null;
            state.currentPage = 1;
            state.totalPages = 0;
            state.totalInvoices = 0;
            state.templateCache = {};
            state.generationQueue = [];
            state.processingInvoices = [];
          });
        },
      })),
      {
        name: 'flowlytix-invoice-store',
        // Persist important settings and drafts
        partialize: (state) => ({
          invoiceSettings: state.invoiceSettings,
          draftInvoices: state.draftInvoices,
        }),
      }
    ),
    {
      name: 'InvoiceStore',
    }
  )
);

/**
 * Invoice store action hooks for better component integration
 */
export const useInvoiceActions = () => {
  const store = useInvoiceStore();

  return {
    loadInvoices: store.loadInvoices,
    generateInvoice: store.generateInvoice,
    updateInvoice: store.updateInvoice,
    deleteInvoice: store.deleteInvoice,
    selectInvoice: store.selectInvoice,
    clearSelectedInvoice: store.clearSelectedInvoice,
    saveDraftInvoice: store.saveDraftInvoice,
    loadDraftInvoice: store.loadDraftInvoice,
    clearDraftInvoice: store.clearDraftInvoice,
    clearAllDrafts: store.clearAllDrafts,
    loadInvoiceTemplates: store.loadInvoiceTemplates,
    createInvoiceTemplate: store.createInvoiceTemplate,
    updateInvoiceTemplate: store.updateInvoiceTemplate,
    deleteInvoiceTemplate: store.deleteInvoiceTemplate,
    recordInvoicePayment: store.recordInvoicePayment,
    markInvoiceAsPaid: store.markInvoiceAsPaid,
    markInvoiceAsOverdue: store.markInvoiceAsOverdue,
    bulkUpdateInvoices: store.bulkUpdateInvoices,
    bulkDeleteInvoices: store.bulkDeleteInvoices,
    loadInvoiceAnalytics: store.loadInvoiceAnalytics,
    setFilters: store.setFilters,
    clearFilters: store.clearFilters,
    updateInvoiceSettings: store.updateInvoiceSettings,
    resetInvoiceSettings: store.resetInvoiceSettings,
    refresh: store.refresh,
    clearError: store.clearError,
    clearCache: store.clearCache,
  };
};

/**
 * Invoice store state hooks for reactive components
 */
export const useInvoiceState = () => {
  const store = useInvoiceStore();

  return {
    invoices: store.invoices,
    selectedInvoice: store.selectedInvoice,
    invoiceTemplates: store.invoiceTemplates,
    invoiceAnalytics: store.invoiceAnalytics,
    draftInvoices: store.draftInvoices,
    loading: store.loading,
    error: store.error,
    filters: store.filters,
    currentPage: store.currentPage,
    totalPages: store.totalPages,
    totalInvoices: store.totalInvoices,
    generationQueue: store.generationQueue,
    processingInvoices: store.processingInvoices,
    invoiceSettings: store.invoiceSettings,
    lastLoadTime: store.lastLoadTime,
    isRefreshing: store.isRefreshing,
  };
};
