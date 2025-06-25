/**
 * Get Customers Query
 */

import { z } from 'zod';
import { CustomerType, CustomerStatus, PaymentTerms } from '../../../domain/entities/customer';

export const GetCustomersQuerySchema = z.object({
  limit: z.number().min(1).max(1000).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(['customerCode', 'fullName', 'companyName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  agencyId: z.string().uuid().optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  search: z.string().optional(),
  requestedBy: z.string().uuid(),
});

export type GetCustomersQuery = z.infer<typeof GetCustomersQuerySchema>;

export interface CustomerSummary {
  readonly id: string;
  readonly customerCode: string;
  readonly fullName: string;
  readonly companyName: string | null;
  readonly customerType: CustomerType;
  readonly status: CustomerStatus;
  readonly email: string;
  readonly creditLimit: string;
  readonly createdAt: Date;
}

export interface GetCustomersQueryResult {
  readonly success: boolean;
  readonly customers: readonly CustomerSummary[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
  readonly error?: string;
}

export function validateGetCustomersQuery(query: unknown): GetCustomersQuery {
  return GetCustomersQuerySchema.parse(query);
}
