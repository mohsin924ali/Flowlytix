# 🌊 Flowlytix Frontend

**A Modern Distribution Management System Frontend**

> Clean, scalable, and ready for backend integration

---

## 🚀 **Project Overview**

Flowlytix Frontend is a comprehensive React-based frontend application for goods distribution and agency management. This is a **frontend-only** project that uses mock data services and is designed for easy integration with any backend API.

### ✨ **Key Features**

- 🎯 **Modern React Architecture** - Built with React 18, TypeScript, and Vite
- 🎨 **Material-UI Design System** - Beautiful, responsive, and accessible UI
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🔐 **Authentication System** - Complete login/logout with role-based access
- 📊 **Dashboard & Analytics** - Interactive charts and business insights
- 👥 **User Management** - User creation, editing, and administration
- 🏢 **Agency Management** - Multi-agency support with switching capabilities
- 📦 **Product Management** - Inventory tracking and product administration
- 📋 **Order Management** - Order processing and tracking
- 🚚 **Shipping Management** - Logistics and delivery tracking
- 👤 **Employee Management** - Staff administration and role management
- 🗺️ **Area Management** - Geographic area management with hierarchical structure

## 🏗️ **Architecture**

```
src/renderer/
├── components/          # Reusable UI components
│   ├── atoms/          # Basic building blocks (Button, Input, etc.)
│   ├── molecules/      # Component combinations (Forms, Modals, etc.)
│   ├── organisms/      # Complex components (Header, Sidebar, etc.)
│   └── templates/      # Page layouts
├── pages/              # Application pages
├── hooks/              # Custom React hooks
├── services/           # API service interfaces
├── mocks/              # Mock data and services
│   ├── data/          # Mock datasets
│   ├── services/      # Mock service implementations
│   └── providers/     # Mock data providers
├── store/              # State management (Zustand)
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── constants/          # Application constants
```

## 🛠️ **Technology Stack**

### **Core Technologies**

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Material-UI** - Component library and design system

### **State Management**

- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling and validation

### **UI & Styling**

- **@mui/material** - UI components
- **@mui/icons-material** - Icon library
- **@emotion/react** - CSS-in-JS styling
- **Framer Motion** - Animations and transitions

### **Development Tools**

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript** - Static type checking

## 📦 **Getting Started**

### **Prerequisites**

- Node.js >= 18.0.0
- npm >= 8.0.0

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd flowlytix-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Available Scripts**

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript checks

# Testing
npm run test         # Run tests (when configured)

# Utilities
npm run clean        # Clean build artifacts
npm run deps:check   # Check for dependency updates
```

## 🎯 **Current Status**

### **✅ Implemented Features**

- Complete frontend application with all modules
- Mock data services for all features
- User authentication and authorization
- Agency management and switching
- User management (CRUD operations)
- Area management with hierarchical structure
- Dashboard with analytics
- Responsive design and navigation
- Form validation and error handling

### **🔌 Ready for Backend Integration**

The application is designed with clean service interfaces that can be easily swapped from mock implementations to real API calls:

```typescript
// Example: Switch from mock to real service
// Before (Mock)
import { MockUserService } from '@/mocks/services/MockUsersService';

// After (Real API)
import { UserService } from '@/services/UserService';
```

## 🔧 **Backend Integration Guide**

To integrate with a real backend:

1. **Replace Mock Services**: Implement real API services in `src/renderer/services/`
2. **Update Service Calls**: Replace mock service imports with real ones
3. **Configure API Base URL**: Add environment variables for API endpoints
4. **Handle Authentication**: Implement real JWT/session handling
5. **Error Handling**: Add proper API error handling and retry logic

### **Service Interface Example**

```typescript
// UserService interface (already defined)
interface IUserService {
  getUsers(): Promise<User[]>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: string, user: UpdateUserRequest): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// Implementation can be mock or real API
class RealUserService implements IUserService {
  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    return response.json();
  }
  // ... other methods
}
```

## 📁 **Mock Data Structure**

The application includes comprehensive mock data:

- **10 Users** with various roles and statuses
- **10 Agencies** with different configurations
- **10 Areas** with hierarchical structure
- **Sample Analytics** data for charts and reports
- **Product Catalog** with categories and inventory
- **Order History** with various statuses
- **Employee Records** with roles and permissions

## 🎨 **UI/UX Features**

- **Responsive Design** - Works on all screen sizes
- **Dark/Light Theme** Support (ready for implementation)
- **Accessibility** - WCAG compliant components
- **Loading States** - Proper loading indicators
- **Error Boundaries** - Graceful error handling
- **Toast Notifications** - User feedback system
- **Modal Dialogs** - For forms and confirmations
- **Data Tables** - Sortable, filterable, paginated tables

## 🚀 **Production Deployment**

```bash
# Build for production
npm run build

# The built files will be in the 'dist' directory
# Serve with any static file server
```

### **Deployment Options**

- **Static Hosting**: Netlify, Vercel, GitHub Pages
- **CDN**: AWS CloudFront, Cloudflare
- **Traditional Hosting**: Apache, Nginx
- **Docker**: Containerized deployment

## 📝 **Development Guidelines**

### **Code Organization**

- Use TypeScript for all new code
- Follow atomic design principles for components
- Keep components small and focused
- Use custom hooks for business logic
- Implement proper error boundaries

### **Naming Conventions**

- **Components**: PascalCase (e.g., `UserEditModal`)
- **Files**: PascalCase for components, camelCase for utilities
- **Directories**: PascalCase for component folders
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### **Git Workflow**

- Use feature branches for development
- Follow conventional commits
- Run linting before commits
- Test thoroughly before merging

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

---

**Ready to connect to your backend? This frontend is designed to make integration smooth and straightforward!** 🚀
