# 🚀 Flowlytix Subscription Dashboard

Administrative dashboard for managing Flowlytix subscription system with comprehensive analytics, device management, and customer insights.

## 📋 Overview

This Next.js-based dashboard provides administrators with powerful tools to:

- **Subscription Management**: Create, update, suspend, and cancel subscriptions
- **Analytics & Reporting**: Comprehensive analytics with charts and visualizations
- **Device Monitoring**: Track device activations and usage patterns
- **Customer Management**: View customer details and subscription history
- **Real-time Monitoring**: Live system health and performance metrics

## 🛠️ Technology Stack

### Frontend

- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe development
- **Material-UI (MUI)** - Component library and design system
- **Emotion** - CSS-in-JS styling
- **React Query** - Server state management
- **Zustand** - Client state management
- **Recharts** - Chart and visualization library

### Development Tools

- **ESLint** - Code linting with Next.js config
- **Prettier** - Code formatting
- **Jest** - Unit testing framework
- **TypeScript** - Static type checking

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Access to Flowlytix Subscription API

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd subscription-dashboard
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Copy environment template
   cp .env.example .env.local

   # Edit environment variables
   nano .env.local
   ```

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
subscription-dashboard/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── subscriptions/      # Subscription management
│   │   ├── customers/          # Customer management
│   │   ├── devices/            # Device monitoring
│   │   └── analytics/          # Analytics & reporting
│   ├── components/             # React components
│   │   ├── atoms/              # Basic UI components
│   │   ├── molecules/          # Composite components
│   │   ├── organisms/          # Complex components
│   │   ├── templates/          # Page templates
│   │   └── providers/          # Context providers
│   ├── services/               # API services
│   │   ├── api.ts              # HTTP client
│   │   ├── subscriptions.ts    # Subscription API
│   │   └── analytics.ts        # Analytics API
│   ├── stores/                 # State management
│   ├── hooks/                  # Custom React hooks
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Utility functions
│   └── styles/                 # Global styles & theme
├── public/                     # Static assets
├── tests/                      # Test files
└── docs/                       # Documentation
```

## 🎨 Design System

### Theme Configuration

- **Primary Color**: #513ff2 (Flowlytix Brand)
- **Secondary Color**: #6b52f5
- **Typography**: Inter font family
- **Spacing**: 8px base unit
- **Border Radius**: 8px standard, 12px for cards

### Component Architecture

Following **Atomic Design** methodology:

- **Atoms**: Basic UI elements (buttons, inputs, chips)
- **Molecules**: Simple component combinations (search bars, cards)
- **Organisms**: Complex interface sections (tables, charts, forms)
- **Templates**: Page-level object groups
- **Pages**: Specific instances of templates

## 🔧 Configuration

### Environment Variables

Create `.env.local` file with the following variables:

```bash
# Application
NEXT_PUBLIC_APP_NAME="Flowlytix Dashboard"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:8000"

# Authentication
NEXTAUTH_SECRET="your-secret-here"

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS="true"
NEXT_PUBLIC_ENABLE_REALTIME="true"
```

### API Integration

The dashboard connects to the Flowlytix Subscription API:

```typescript
// Default API configuration
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
};
```

## 📊 Features

### Dashboard Overview

- **Key Metrics**: Total subscriptions, active devices, revenue
- **Real-time Analytics**: Live system status and performance
- **Quick Actions**: Common administrative tasks
- **System Health**: Service status monitoring

### Subscription Management

- **CRUD Operations**: Create, read, update, delete subscriptions
- **Bulk Actions**: Mass operations on multiple subscriptions
- **License Management**: Generate and validate license keys
- **Status Control**: Suspend, resume, cancel subscriptions

### Analytics & Reporting

- **Interactive Charts**: Recharts-powered visualizations
- **Custom Date Ranges**: Flexible time period selection
- **Export Capabilities**: PDF, CSV, Excel formats
- **Real-time Metrics**: Live performance indicators

### Device Monitoring

- **Device Tracking**: Monitor all connected devices
- **Usage Analytics**: Device activity patterns
- **Geographic Distribution**: Location-based insights
- **Device Management**: Revoke access, view details

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Testing Strategy

- **Unit Tests**: Individual component and service testing
- **Integration Tests**: API integration testing
- **E2E Tests**: User workflow testing (planned)

## 🚀 Deployment

### Build for Production

```bash
# Create production build
npm run build

# Start production server
npm run start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Performance Optimization

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Built-in bundle analyzer
- **Caching**: Optimized caching strategies

## 🔒 Security

### Authentication

- **JWT Tokens**: Secure authentication with refresh tokens
- **Role-based Access**: Permission-based feature access
- **Session Management**: Secure session handling

### Security Headers

- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Clickjacking protection
- **CSRF Protection**: Cross-site request forgery prevention

## 📚 API Documentation

### Subscription Service

```typescript
// Get all subscriptions
const response = await subscriptionService.getSubscriptions(filters, page, pageSize);

// Create subscription
const subscription = await subscriptionService.createSubscription(data);

// Update subscription
const updated = await subscriptionService.updateSubscription(id, updates);
```

### Analytics Service

```typescript
// Get dashboard analytics
const analytics = await analyticsService.getDashboardAnalytics();

// Get subscription trends
const trends = await analyticsService.getSubscriptionAnalytics(startDate, endDate);
```

## 🤝 Contributing

### Development Workflow

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/subscription-filters
   ```

2. **Make Changes**
   - Follow TypeScript strict mode
   - Maintain component documentation
   - Add unit tests for new features

3. **Code Quality**

   ```bash
   npm run lint        # Check linting
   npm run type-check  # TypeScript validation
   npm run test        # Run tests
   ```

4. **Submit Pull Request**
   - Clear description of changes
   - Include screenshots for UI changes
   - Ensure all tests pass

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Components**: Functional components with hooks
- **Styling**: Material-UI with custom theme
- **Testing**: Jest with React Testing Library

## 📈 Performance Monitoring

### Core Web Vitals

- **LCP**: Largest Contentful Paint < 2.5s
- **FID**: First Input Delay < 100ms
- **CLS**: Cumulative Layout Shift < 0.1

### Monitoring Tools

- **Next.js Analytics**: Built-in performance monitoring
- **Bundle Analyzer**: Bundle size optimization
- **Lighthouse**: Performance auditing

## 🐛 Troubleshooting

### Common Issues

**Build Errors**

```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Type Errors**

```bash
# Check TypeScript configuration
npm run type-check
```

**API Connection Issues**

- Verify `NEXT_PUBLIC_API_URL` environment variable
- Check subscription service status
- Validate authentication tokens

## 📞 Support

### Documentation

- **API Documentation**: `/docs/api.md`
- **Component Library**: `/docs/components.md`
- **Deployment Guide**: `/docs/deployment.md`

### Contact

- **Team Email**: dev@flowlytix.com
- **Documentation**: Internal confluence
- **Issue Tracking**: JIRA project board

---

## 📄 License

Copyright (c) 2024 Flowlytix Team. All rights reserved.

Built with ❤️ using Next.js, TypeScript, and Material-UI.
