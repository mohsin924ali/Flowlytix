# Flowlytix - Business Management System

**Flowlytix** is a comprehensive business management system built with Electron, React, TypeScript, and Zustand. It provides powerful tools for managing agencies, customers, orders, inventory, and analytics.

## 🚀 Features

### Core Business Management

- **Agency Management**: Multi-tenant support for managing multiple business units
- **Customer Relationship Management**: Complete customer lifecycle management
- **Order Processing**: Streamlined order creation, tracking, and fulfillment
- **Inventory Management**: Real-time stock tracking and management
- **Purchase Orders**: Supplier management and procurement workflows
- **Analytics Dashboard**: Business intelligence and reporting

### Payment & Credit Management

- **Credit Assessment**: Built-in credit evaluation system
- **Payment Collection**: Multiple payment method support
- **Payment History**: Complete transaction tracking
- **Credit Monitoring**: Real-time credit status updates

### User & Security

- **Role-based Access Control**: Granular permission management
- **User Management**: Team member administration
- **Secure Authentication**: Enterprise-grade security

### Subscription Management

- **Online Licensing**: Connected to production subscription server
- **Feature Gating**: Tier-based feature access control
- **Offline Support**: Graceful offline operation with sync
- **Device Management**: Multi-device subscription support

## 🏗️ Architecture

### Frontend

- **Electron + React**: Desktop application with modern web technologies
- **TypeScript**: Type-safe development
- **Zustand**: Lightweight state management
- **Vite**: Fast development and building
- **Tailwind CSS**: Utility-first styling

### Backend Integration

- **Subscription API**: Connected to `https://flowlytix-subscription-backend-production.up.railway.app`
- **Local Storage**: Secure token storage with Electron's safeStorage
- **Background Sync**: Automatic subscription validation

## 🔧 Development Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
cd flowlytix
npm install

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file based on `env.example`:

```bash
# Subscription API Configuration (Production)
SUBSCRIPTION_API_URL="https://flowlytix-subscription-backend-production.up.railway.app"

# Other configurations...
```

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run dist
```

## 📦 Subscription System

The application uses an online subscription system for licensing and feature access control.

### Production Server

- **URL**: `https://flowlytix-subscription-backend-production.up.railway.app`
- **Health Check**: `/health`
- **API Base**: `/api/v1/`

### Subscription Features

- **Device Activation**: License key-based activation
- **Offline Operation**: Local token validation with periodic sync
- **Feature Gating**: Tier-based access control (Basic, Professional, Enterprise)
- **Grace Period**: 7-day grace period for expired subscriptions
- **Multi-device Support**: Device management and limits

### Subscription Tiers

#### Basic Tier

- Core features
- Basic analytics
- Email support
- Max 100 customers
- Max 500 products

#### Professional Tier

- All Basic features
- Advanced analytics
- API access
- Max 1000 customers
- Max 5000 products

#### Enterprise Tier

- All Professional features
- Multi-location support
- Priority support
- Unlimited customers and products
- Custom features

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run dist` - Package for distribution
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## 📱 Application Structure

```
src/
├── main/           # Electron main process
│   ├── services/   # Background services
│   ├── ipc/        # IPC handlers
│   └── main.ts     # Main entry point
├── preload/        # Preload scripts
├── renderer/       # React frontend
│   ├── components/ # UI components
│   ├── pages/      # Application pages
│   ├── stores/     # Zustand stores
│   ├── services/   # API services
│   └── domains/    # Business domain logic
└── shared/         # Shared types and utilities
```

## 🔐 Security Features

- **Secure Token Storage**: Uses Electron's safeStorage API
- **Context Isolation**: Renderer process isolation
- **CSP Headers**: Content Security Policy enforcement
- **Certificate Validation**: HTTPS certificate verification
- **Local Encryption**: Sensitive data encryption

## 🌐 API Integration

### Subscription API Endpoints

- `POST /api/v1/subscription/activate` - Device activation
- `POST /api/v1/subscription/validate` - Token validation
- `GET /health` - Health check

### Error Handling

- Network connectivity detection
- Graceful offline fallback
- Automatic retry mechanisms
- User-friendly error messages

## 📊 Monitoring & Analytics

- Application health monitoring
- Subscription status tracking
- Feature usage analytics
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

[Add your license information here]

## 🆘 Support

For technical support or questions:

- Email: support@flowlytix.com
- Documentation: [Add documentation link]
- Issues: [Add GitHub issues link]

---

**Flowlytix** - Empowering businesses with intelligent management solutions.
