/**
 * MSW Request Handlers
 * Mock API endpoints for testing the Flowlytix Subscription Dashboard
 * Following Instructions file standards with comprehensive API mocking
 */

import { rest } from 'msw';
import { mockSubscriptions, mockCustomers, mockAnalytics } from './mockData';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const handlers = [
  // Authentication endpoints
  rest.post(`${BASE_URL}/auth/login`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: 1,
          email: 'admin@flowlytix.com',
          name: 'Admin User',
          role: 'admin',
        },
      })
    );
  }),

  rest.post(`${BASE_URL}/auth/refresh`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-new-access-token',
        token_type: 'bearer',
        expires_in: 3600,
      })
    );
  }),

  rest.post(`${BASE_URL}/auth/logout`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Logged out successfully' }));
  }),

  // Subscription endpoints
  rest.get(`${BASE_URL}/subscriptions`, (req, res, ctx) => {
    const page = req.url.searchParams.get('page') || '1';
    const limit = req.url.searchParams.get('limit') || '10';
    const search = req.url.searchParams.get('search') || '';

    let filteredSubscriptions = mockSubscriptions;

    if (search) {
      filteredSubscriptions = mockSubscriptions.filter(
        (sub) =>
          sub.customer_name.toLowerCase().includes(search.toLowerCase()) ||
          sub.license_key.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedSubscriptions = filteredSubscriptions.slice(startIndex, endIndex);

    return res(
      ctx.status(200),
      ctx.json({
        subscriptions: paginatedSubscriptions,
        total: filteredSubscriptions.length,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(filteredSubscriptions.length / parseInt(limit)),
      })
    );
  }),

  rest.get(`${BASE_URL}/subscriptions/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const subscription = mockSubscriptions.find((sub) => sub.id === parseInt(id as string));

    if (!subscription) {
      return res(ctx.status(404), ctx.json({ error: 'Subscription not found' }));
    }

    return res(ctx.status(200), ctx.json(subscription));
  }),

  rest.post(`${BASE_URL}/subscriptions`, (req, res, ctx) => {
    const newSubscription = {
      id: mockSubscriptions.length + 1,
      license_key: `FL-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...req.body,
    };

    return res(ctx.status(201), ctx.json(newSubscription));
  }),

  rest.put(`${BASE_URL}/subscriptions/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const subscription = mockSubscriptions.find((sub) => sub.id === parseInt(id as string));

    if (!subscription) {
      return res(ctx.status(404), ctx.json({ error: 'Subscription not found' }));
    }

    const updatedSubscription = {
      ...subscription,
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    return res(ctx.status(200), ctx.json(updatedSubscription));
  }),

  rest.delete(`${BASE_URL}/subscriptions/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const subscription = mockSubscriptions.find((sub) => sub.id === parseInt(id as string));

    if (!subscription) {
      return res(ctx.status(404), ctx.json({ error: 'Subscription not found' }));
    }

    return res(ctx.status(200), ctx.json({ message: 'Subscription deleted successfully' }));
  }),

  // Subscription actions
  rest.post(`${BASE_URL}/subscriptions/:id/suspend`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Subscription suspended successfully' }));
  }),

  rest.post(`${BASE_URL}/subscriptions/:id/resume`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Subscription resumed successfully' }));
  }),

  rest.post(`${BASE_URL}/subscriptions/:id/cancel`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Subscription cancelled successfully' }));
  }),

  rest.post(`${BASE_URL}/subscriptions/:id/renew`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Subscription renewed successfully' }));
  }),

  // Customer endpoints
  rest.get(`${BASE_URL}/customers`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockCustomers));
  }),

  rest.get(`${BASE_URL}/customers/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const customer = mockCustomers.find((cust) => cust.id === parseInt(id as string));

    if (!customer) {
      return res(ctx.status(404), ctx.json({ error: 'Customer not found' }));
    }

    return res(ctx.status(200), ctx.json(customer));
  }),

  // Analytics endpoints
  rest.get(`${BASE_URL}/analytics/dashboard`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockAnalytics.dashboard));
  }),

  rest.get(`${BASE_URL}/analytics/subscriptions`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockAnalytics.subscriptions));
  }),

  rest.get(`${BASE_URL}/analytics/revenue`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockAnalytics.revenue));
  }),

  rest.get(`${BASE_URL}/analytics/churn`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockAnalytics.churn));
  }),

  rest.get(`${BASE_URL}/analytics/devices`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockAnalytics.devices));
  }),

  // License validation
  rest.post(`${BASE_URL}/licenses/validate`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        valid: true,
        subscription_id: 1,
        expires_at: '2024-12-31T23:59:59Z',
        features: ['premium', 'analytics', 'support'],
      })
    );
  }),

  rest.get(`${BASE_URL}/licenses/:key`, (req, res, ctx) => {
    const { key } = req.params;

    return res(
      ctx.status(200),
      ctx.json({
        license_key: key,
        valid: true,
        subscription_id: 1,
        expires_at: '2024-12-31T23:59:59Z',
        features: ['premium', 'analytics', 'support'],
      })
    );
  }),

  // Error handling for unhandled requests
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  }),

  rest.post('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  }),

  rest.put('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  }),

  rest.delete('*', (req, res, ctx) => {
    console.warn(`Unhandled ${req.method} request to ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Endpoint not found' }));
  }),
];
