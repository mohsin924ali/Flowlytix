# 🏗️ Flowlytix Distribution System

A modern, secure, and scalable goods distribution agency management system built with Electron, React, and TypeScript following enterprise-grade architecture principles.

## 🎯 **Project Overview**

This application implements **Hexagonal Architecture** (Ports & Adapters), **Domain-Driven Design** (DDD), and **CQRS** patterns to create a maintainable and testable codebase for managing distribution operations including inventory, orders, customers, and reporting.

### **Key Features**

- 🔐 **Security-First**: Context isolation, CSP, and secure IPC communication
- 🏗️ **Clean Architecture**: DDD, Hexagonal Architecture, CQRS implementation
- 🎨 **Modern UI**: Material-UI with Atomic Design methodology
- 📊 **Real-time Analytics**: Business intelligence and reporting
- 🌐 **Offline-First**: Works without internet connectivity
- ♿ **Accessibility**: WCAG 2.1 AA compliant
- 🧪 **High Test Coverage**: 90%+ test coverage requirement
- 📱 **Responsive Design**: Works on all screen sizes

## 🛠️ **Technology Stack**

### **Frontend**
- **React 18** - UI library with functional components and hooks
- **TypeScript** - Strict typing with 100% coverage
- **Material-UI** - Component library with custom design system
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **React Query** - Server state management
- **Framer Motion** - Animations

### **Backend/Desktop**
- **Electron** - Cross-platform desktop application
- **Node.js** - JavaScript runtime
- **SQLite** - Local database
- **IPC** - Secure inter-process communication

### **Development Tools**
- **Vite** - Build tool and development server
- **ESLint** - Code linting with Airbnb TypeScript config
- **Prettier** - Code formatting
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **Storybook** - Component development
- **Husky** - Git hooks

## 🏗️ **Architecture Overview**

```
src/
├── main/                    # Electron main process
│   ├── main.ts             # Application entry point
│   ├── utils/              # Utility functions
│   ├── security/           # Security policies
│   ├── ipc/                # IPC handlers
│   └── windows/            # Window management
├── preload/                # Secure preload scripts
├── renderer/               # React application
├── domain/                 # Business logic (DDD)
│   ├── entities/           # Domain entities
│   ├── value-objects/      # Value objects
│   ├── repositories/       # Repository interfaces
│   ├── services/           # Domain services
│   └── events/             # Domain events
├── application/            # Application layer (CQRS)
│   ├── commands/           # Command handlers
│   ├── queries/            # Query handlers
│   ├── handlers/           # Business logic handlers
│   └── services/           # Application services
├── infrastructure/         # Infrastructure layer
│   ├── repositories/       # Repository implementations
│   ├── services/           # External services
│   └── adapters/           # External adapters
├── presentation/           # UI layer
│   ├── layouts/            # Page layouts
│   ├── pages/              # Application pages
│   └── components/         # Shared components
└── components/             # Atomic Design components
    ├── atoms/              # Basic building blocks
    ├── molecules/          # Simple combinations
    ├── organisms/          # Complex components
    ├── templates/          # Page templates
    └── pages/              # Page components
```

## 🚀 **Getting Started**

### **Prerequisites**

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Git** for version control

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd flowlytix-distribution-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### **Development**

Start the development environment:

```bash
# Start both renderer and main processes
npm run dev

# Or start them separately
npm run dev:renderer    # React development server
npm run dev:main        # Electron main process
```

### **Building**

```bash
# Build for development
npm run build

# Build for production
npm run build:prod

# Create distribution packages
npm run dist            # All platforms
npm run dist:win        # Windows
npm run dist:mac        # macOS
npm run dist:linux      # Linux
```

## 🧪 **Testing**

### **Unit Tests**
```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Generate coverage report
```

### **E2E Tests**
```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:headed   # Run with browser GUI
```

### **Component Testing**
```bash
npm run storybook         # Start Storybook
npm run build-storybook   # Build static Storybook
```

## 🔧 **Code Quality**

### **Linting and Formatting**
```bash
npm run lint              # Check for linting errors
npm run lint:fix          # Fix linting errors
npm run format            # Format code with Prettier
npm run type-check        # TypeScript type checking
```

### **Code Quality Metrics**
- **Test Coverage**: 90%+ required
- **Cyclomatic Complexity**: Maximum 10
- **Code Duplication**: Maximum 3%
- **Technical Debt**: Grade A required

## 📊 **Business Domains**

### **Inventory Management**
- Product catalog management
- Stock level tracking
- Category management
- Supplier relationships

### **Order Management**
- Order processing workflow
- Order status tracking
- Payment processing
- Shipping integration

### **Customer Management**
- Customer profiles
- Contact management
- Order history
- Customer analytics

### **Reporting & Analytics**
- Sales reports
- Inventory reports
- Customer analytics
- Financial reporting

## 🔐 **Security Features**

- **Context Isolation**: Secure renderer process isolation
- **CSP Implementation**: Content Security Policy protection
- **Input Validation**: All inputs validated with Zod schemas
- **SQL Injection Prevention**: Parameterized queries only
- **File System Security**: Sandboxed file operations
- **Auto-updates**: Secure application updates

## ♿ **Accessibility**

- **WCAG 2.1 AA Compliance**: Full accessibility support
- **Keyboard Navigation**: Complete keyboard accessibility
- **Screen Reader Support**: ARIA labels and semantic HTML
- **High Contrast Mode**: Support for vision impairments
- **Focus Management**: Proper focus handling

## 🌍 **Internationalization**

- **Multi-language Support**: React-i18next integration
- **RTL Support**: Right-to-left language support
- **Locale-specific Formatting**: Dates, numbers, currency
- **Translation Management**: Organized translation keys

## 📱 **Platform Support**

- **Windows**: Windows 10+ (x64, ARM64)
- **macOS**: macOS 10.15+ (Intel, Apple Silicon)
- **Linux**: Ubuntu 18.04+, Fedora 32+, openSUSE 15.2+

## 🤝 **Contributing**

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow the coding standards** (see `.eslintrc.json` and `.prettierrc.json`)
4. **Write tests** for new functionality
5. **Ensure all tests pass** (`npm run test`)
6. **Commit with conventional commits** (`npm run commit`)
7. **Push to the branch** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### **Commit Message Format**
```
type(scope): description

[optional body]

[optional footer]
```

**Types**: feat, fix, docs, style, refactor, perf, test, chore

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

- **Documentation**: [Wiki](wiki-url)
- **Issues**: [GitHub Issues](issues-url)
- **Discussions**: [GitHub Discussions](discussions-url)
- **Email**: support@flowlytix.com

## 🎯 **Roadmap**

### **Phase 1: Core Architecture** ✅
- [x] Project setup and configuration
- [x] Electron security implementation
- [x] Domain-driven design structure
- [x] Basic UI components

### **Phase 2: Business Logic** 🚧
- [ ] Inventory management module
- [ ] Order management module
- [ ] Customer management module
- [ ] Database integration

### **Phase 3: Advanced Features** 📋
- [ ] Reporting and analytics
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Export/import functionality

### **Phase 4: Polish & Optimization** 📋
- [ ] Performance optimization
- [ ] Advanced testing
- [ ] Documentation completion
- [ ] Deployment automation

---

**Built with ❤️ by the Flowlytix Team** 