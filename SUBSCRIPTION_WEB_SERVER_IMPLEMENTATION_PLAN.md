# 🚀 **SUBSCRIPTION WEB SERVER & DASHBOARD IMPLEMENTATION PLAN**

## 📋 **Executive Summary**

This document outlines the complete implementation plan for the Flowlytix subscription management web server and administrative dashboard. The implementation follows the established **Instructions file standards** with **Clean Architecture**, **FastAPI backend**, **React TypeScript frontend**, and **PostgreSQL database**.

## 🏗️ **Architecture Overview**

### **Technology Stack**

#### **Backend (Subscription API Server)**

- **Python 3.11+** with type hints everywhere
- **FastAPI** latest stable with async/await patterns
- **PostgreSQL** with SQLAlchemy 2.0+ and Alembic migrations
- **Redis** for caching and session management
- **JWT** tokens with RS256 for subscription validation
- **Docker** containerization for deployment

#### **Frontend (Admin Dashboard)**

- **React 18+** with TypeScript strict mode
- **Next.js 14+** for full-stack capabilities
- **Material-UI (MUI)** with custom design system
- **React Query** for server state management
- **Zustand** for client state management
- **Chart.js/Recharts** for analytics visualization

#### **Database & Infrastructure**

- **PostgreSQL 15+** as primary database
- **Redis 7+** for caching and sessions
- **Docker Compose** for local development
- **Nginx** as reverse proxy
- **Let's Encrypt** for SSL certificates

## 🏗️ **Backend Architecture (FastAPI)**

### **Project Structure**

```
subscription-server/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py             # Application configuration
│   │   ├── security.py           # JWT & authentication
│   │   ├── database.py           # Database connection & session
│   │   ├── exceptions.py         # Custom exception handlers
│   │   └── middleware.py         # Custom middleware
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── licensing.py      # License activation/validation
│   │   │   ├── subscriptions.py  # Subscription management
│   │   │   ├── devices.py        # Device management
│   │   │   ├── customers.py      # Customer management
│   │   │   ├── analytics.py      # Analytics & reporting
│   │   │   └── dashboard.py      # Dashboard-specific endpoints
│   │   └── dependencies.py       # Common dependencies
│   ├── domain/
│   │   ├── __init__.py
│   │   ├── entities/             # Domain entities (pure Python)
│   │   │   ├── subscription.py
│   │   │   ├── device.py
│   │   │   ├── customer.py
│   │   │   └── license.py
│   │   ├── repositories/         # Repository interfaces
│   │   │   ├── subscription_repository.py
│   │   │   ├── device_repository.py
│   │   │   └── customer_repository.py
│   │   ├── services/             # Business logic services
│   │   │   ├── subscription_service.py
│   │   │   ├── licensing_service.py
│   │   │   ├── analytics_service.py
│   │   │   └── notification_service.py
│   │   └── value_objects/        # Value objects
│   │       ├── license_key.py
│   │       ├── device_fingerprint.py
│   │       └── subscription_status.py
│   ├── infrastructure/
│   │   ├── __init__.py
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   ├── models/           # SQLAlchemy models
│   │   │   │   ├── subscription.py
│   │   │   │   ├── device.py
│   │   │   │   ├── customer.py
│   │   │   │   └── analytics.py
│   │   │   ├── repositories/     # Repository implementations
│   │   │   │   ├── subscription_repo_impl.py
│   │   │   │   ├── device_repo_impl.py
│   │   │   │   └── customer_repo_impl.py
│   │   │   └── migrations/       # Alembic migrations
│   │   ├── cache/               # Redis implementations
│   │   │   ├── __init__.py
│   │   │   ├── redis_client.py
│   │   │   └── cache_service.py
│   │   ├── external/            # External service integrations
│   │   │   ├── __init__.py
│   │   │   ├── email_service.py
│   │   │   └── payment_service.py
│   │   └── messaging/           # Event/message handling
│   │       ├── __init__.py
│   │       └── event_publisher.py
│   ├── schemas/                 # Pydantic models for API
│   │   ├── __init__.py
│   │   ├── subscription.py
│   │   ├── device.py
│   │   ├── customer.py
│   │   ├── analytics.py
│   │   └── common.py
│   ├── utils/                   # Utility functions
│   │   ├── __init__.py
│   │   ├── crypto.py
│   │   ├── validators.py
│   │   └── formatters.py
│   └── tests/                   # Test files
│       ├── __init__.py
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── alembic/                     # Database migrations
├── docker/                      # Docker configurations
├── scripts/                     # Deployment and utility scripts
├── requirements/                # Dependency files
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── .env.example                 # Environment variables template
├── docker-compose.yml           # Local development setup
├── docker-compose.prod.yml      # Production setup
├── Dockerfile                   # Production container
└── pyproject.toml               # Python project configuration
```

### **Domain Entities**

```python
# domain/entities/subscription.py
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from enum import Enum
from uuid import UUID

class SubscriptionStatus(Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    SUSPENDED = "suspended"

class SubscriptionTier(Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

@dataclass
class Subscription:
    id: UUID
    customer_id: UUID
    license_key: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    features: List[str]
    max_devices: int
    starts_at: datetime
    expires_at: datetime
    grace_period_days: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def is_in_grace_period(self) -> bool:
        if not self.is_expired():
            return False
        grace_end = self.expires_at + timedelta(days=self.grace_period_days)
        return datetime.utcnow() <= grace_end

    def days_remaining(self) -> int:
        delta = self.expires_at - datetime.utcnow()
        return max(0, delta.days)
```

### **Repository Pattern Implementation**

```python
# domain/repositories/subscription_repository.py
from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from domain.entities.subscription import Subscription

class SubscriptionRepository(ABC):
    @abstractmethod
    async def create(self, subscription: Subscription) -> Subscription:
        pass

    @abstractmethod
    async def get_by_id(self, subscription_id: UUID) -> Optional[Subscription]:
        pass

    @abstractmethod
    async def get_by_license_key(self, license_key: str) -> Optional[Subscription]:
        pass

    @abstractmethod
    async def get_by_customer_id(self, customer_id: UUID) -> List[Subscription]:
        pass

    @abstractmethod
    async def update(self, subscription: Subscription) -> Subscription:
        pass

    @abstractmethod
    async def delete(self, subscription_id: UUID) -> bool:
        pass

    @abstractmethod
    async def get_expiring_soon(self, days: int) -> List[Subscription]:
        pass
```

### **Service Layer Implementation**

```python
# domain/services/licensing_service.py
from typing import Optional
from uuid import UUID
from domain.entities.subscription import Subscription
from domain.entities.device import Device
from domain.repositories.subscription_repository import SubscriptionRepository
from domain.repositories.device_repository import DeviceRepository
from domain.value_objects.license_key import LicenseKey
from domain.value_objects.device_fingerprint import DeviceFingerprint

class LicensingService:
    def __init__(
        self,
        subscription_repo: SubscriptionRepository,
        device_repo: DeviceRepository
    ):
        self.subscription_repo = subscription_repo
        self.device_repo = device_repo

    async def activate_license(
        self,
        license_key: str,
        device_fingerprint: str,
        device_info: dict
    ) -> dict:
        """Activate a license for a specific device."""
        # Validate license key
        license_key_obj = LicenseKey(license_key)
        if not license_key_obj.is_valid():
            raise ValueError("Invalid license key format")

        # Find subscription
        subscription = await self.subscription_repo.get_by_license_key(license_key)
        if not subscription:
            raise ValueError("License key not found")

        if subscription.status != SubscriptionStatus.ACTIVE:
            raise ValueError("License is not active")

        # Check device limit
        existing_devices = await self.device_repo.get_by_subscription_id(subscription.id)
        if len(existing_devices) >= subscription.max_devices:
            raise ValueError("Maximum device limit reached")

        # Register device
        device = Device(
            subscription_id=subscription.id,
            device_id=device_info['device_id'],
            device_fingerprint=device_fingerprint,
            platform=device_info['platform'],
            app_version=device_info['app_version'],
            status=DeviceStatus.ACTIVE,
            activated_at=datetime.utcnow()
        )

        await self.device_repo.create(device)

        # Generate JWT token
        token = self._generate_subscription_token(subscription, device)

        return {
            'success': True,
            'subscription_tier': subscription.tier.value,
            'expires_at': subscription.expires_at,
            'signed_token': token,
            'tenant_id': str(subscription.customer_id),
            'features': subscription.features
        }

    async def validate_license(
        self,
        token: str,
        device_id: str
    ) -> dict:
        """Validate a license token and device."""
        try:
            # Verify JWT token
            payload = self._verify_subscription_token(token)

            # Get subscription and device
            subscription = await self.subscription_repo.get_by_id(
                UUID(payload['subscription_id'])
            )
            device = await self.device_repo.get_by_device_id(device_id)

            if not subscription or not device:
                return {'valid': False, 'reason': 'subscription_not_found'}

            # Check subscription status
            if subscription.status != SubscriptionStatus.ACTIVE:
                return {'valid': False, 'reason': 'subscription_inactive'}

            # Check expiry with grace period
            if subscription.is_expired() and not subscription.is_in_grace_period():
                return {'valid': False, 'reason': 'subscription_expired'}

            # Update last heartbeat
            await self.device_repo.update_heartbeat(device.id)

            return {
                'valid': True,
                'subscription_tier': subscription.tier.value,
                'expires_at': subscription.expires_at,
                'features': subscription.features,
                'days_remaining': subscription.days_remaining(),
                'is_in_grace_period': subscription.is_in_grace_period()
            }

        except Exception as e:
            return {'valid': False, 'reason': 'token_invalid'}
```

### **API Endpoints**

```python
# api/v1/licensing.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from domain.services.licensing_service import LicensingService
from schemas.licensing import (
    LicenseActivationRequest,
    LicenseActivationResponse,
    LicenseValidationRequest,
    LicenseValidationResponse
)

router = APIRouter(prefix="/api/v1/licensing", tags=["licensing"])
security = HTTPBearer()

@router.post("/activate", response_model=LicenseActivationResponse)
async def activate_license(
    request: LicenseActivationRequest,
    licensing_service: LicensingService = Depends(get_licensing_service)
):
    """
    Activate a license for a specific device.

    This endpoint validates the license key and registers the device
    if all conditions are met (valid license, device limit not exceeded).
    """
    try:
        result = await licensing_service.activate_license(
            license_key=request.license_key,
            device_fingerprint=request.device_fingerprint,
            device_info=request.device_info.dict()
        )
        return LicenseActivationResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/validate", response_model=LicenseValidationResponse)
async def validate_license(
    request: LicenseValidationRequest,
    licensing_service: LicensingService = Depends(get_licensing_service)
):
    """
    Validate a license token and device combination.

    This endpoint is called periodically by the Electron app to verify
    the subscription is still valid and update device heartbeat.
    """
    result = await licensing_service.validate_license(
        token=request.token,
        device_id=request.device_id
    )
    return LicenseValidationResponse(**result)
```

## 🎨 **Frontend Dashboard Architecture**

### **Project Structure**

```
subscription-dashboard/
├── src/
│   ├── app/                     # Next.js app router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Dashboard overview
│   │   ├── subscriptions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── devices/
│   │   │   └── page.tsx
│   │   ├── analytics/
│   │   │   └── page.tsx
│   │   └── api/                # API routes
│   │       └── auth/
│   │           └── route.ts
│   ├── components/             # UI components
│   │   ├── atoms/
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   └── Badge/
│   │   ├── molecules/
│   │   │   ├── SearchBar/
│   │   │   ├── DataTable/
│   │   │   ├── Chart/
│   │   │   └── Modal/
│   │   ├── organisms/
│   │   │   ├── Sidebar/
│   │   │   ├── Header/
│   │   │   ├── SubscriptionTable/
│   │   │   ├── AnalyticsChart/
│   │   │   └── DeviceMonitor/
│   │   └── templates/
│   │       ├── DashboardLayout/
│   │       └── AuthLayout/
│   ├── hooks/                  # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useSubscriptions.ts
│   │   ├── useAnalytics.ts
│   │   └── useDevices.ts
│   ├── services/               # API services
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   ├── subscriptions.ts
│   │   ├── customers.ts
│   │   └── analytics.ts
│   ├── stores/                 # Zustand stores
│   │   ├── authStore.ts
│   │   ├── subscriptionStore.ts
│   │   └── uiStore.ts
│   ├── types/                  # TypeScript types
│   │   ├── api.ts
│   │   ├── subscription.ts
│   │   ├── customer.ts
│   │   └── analytics.ts
│   ├── utils/                  # Utility functions
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   └── styles/                 # Global styles
│       └── globals.css
├── public/                     # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── .env.local
```

### **Dashboard Features Implementation**

```typescript
// hooks/useSubscriptions.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptions';
import type { Subscription, SubscriptionFilters } from '@/types/subscription';

export const useSubscriptions = (filters?: SubscriptionFilters) => {
  return useQuery({
    queryKey: ['subscriptions', filters],
    queryFn: () => subscriptionService.getSubscriptions(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });
};

export const useSubscriptionActions = () => {
  const queryClient = useQueryClient();

  const suspendSubscription = useMutation({
    mutationFn: (id: string) => subscriptionService.suspendSubscription(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  const renewSubscription = useMutation({
    mutationFn: ({ id, duration }: { id: string; duration: number }) =>
      subscriptionService.renewSubscription(id, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });

  return {
    suspendSubscription,
    renewSubscription,
  };
};
```

## 🗄️ **Database Schema**

### **PostgreSQL Schema**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscription plans table
CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    features JSONB NOT NULL,
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    max_devices INTEGER DEFAULT 1,
    grace_period_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES subscription_plans(id),
    license_key VARCHAR(255) UNIQUE NOT NULL,
    tier VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    features JSONB NOT NULL,
    max_devices INTEGER DEFAULT 1,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    grace_period_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_fingerprint VARCHAR(500),
    platform VARCHAR(50),
    app_version VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- License validation logs table
CREATE TABLE license_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    validation_type VARCHAR(20) NOT NULL CHECK (validation_type IN ('activation', 'sync', 'heartbeat')),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    validated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Usage analytics table
CREATE TABLE usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    feature_used VARCHAR(100) NOT NULL,
    usage_count INTEGER DEFAULT 1,
    session_duration INTEGER, -- in seconds
    metadata JSONB,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_license_key ON subscriptions(license_key);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX idx_devices_subscription_id ON devices(subscription_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_last_heartbeat ON devices(last_heartbeat);
CREATE INDEX idx_license_validations_subscription_id ON license_validations(subscription_id);
CREATE INDEX idx_license_validations_validated_at ON license_validations(validated_at);
CREATE INDEX idx_usage_analytics_subscription_id ON usage_analytics(subscription_id);
CREATE INDEX idx_usage_analytics_recorded_at ON usage_analytics(recorded_at);
CREATE INDEX idx_usage_analytics_feature_used ON usage_analytics(feature_used);
```

## 🔐 **Security Implementation**

### **JWT Token Management**

```python
# core/security.py
import jwt
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from typing import Optional, Dict, Any

class JWTManager:
    def __init__(self, private_key_path: str, public_key_path: str):
        self.private_key = self._load_private_key(private_key_path)
        self.public_key = self._load_public_key(public_key_path)

    def generate_subscription_token(self, subscription_data: Dict[str, Any]) -> str:
        """Generate a JWT token for subscription validation."""
        payload = {
            'subscription_id': str(subscription_data['id']),
            'customer_id': str(subscription_data['customer_id']),
            'tier': subscription_data['tier'],
            'features': subscription_data['features'],
            'device_id': subscription_data['device_id'],
            'expires_at': subscription_data['expires_at'].isoformat(),
            'issued_at': datetime.utcnow().isoformat(),
            'grace_period_days': subscription_data['grace_period_days'],
            'iss': 'flowlytix-licensing',
            'aud': 'flowlytix-app',
            'exp': int((datetime.utcnow() + timedelta(days=30)).timestamp())
        }

        return jwt.encode(payload, self.private_key, algorithm='RS256')

    def verify_subscription_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode a subscription token."""
        try:
            payload = jwt.decode(
                token,
                self.public_key,
                algorithms=['RS256'],
                audience='flowlytix-app',
                issuer='flowlytix-licensing'
            )
            return {'valid': True, 'payload': payload}
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'token_expired'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'invalid_token'}

    def _load_private_key(self, path: str):
        with open(path, 'rb') as f:
            return serialization.load_pem_private_key(
                f.read(),
                password=None
            )

    def _load_public_key(self, path: str):
        with open(path, 'rb') as f:
            return serialization.load_pem_public_key(f.read())
```

## 🧪 **Testing Strategy**

### **Backend Testing**

```python
# tests/integration/test_licensing.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import get_session
from tests.conftest import TestDatabase

@pytest.mark.asyncio
async def test_license_activation_success(
    async_client: AsyncClient,
    test_db: TestDatabase
):
    """Test successful license activation."""
    # Create test subscription
    subscription_data = {
        'customer_id': 'test-customer-id',
        'license_key': 'TEST-LICENSE-KEY-123',
        'tier': 'professional',
        'status': 'active',
        'features': ['feature1', 'feature2'],
        'max_devices': 3,
        'starts_at': '2024-01-01T00:00:00Z',
        'expires_at': '2025-01-01T00:00:00Z'
    }

    activation_request = {
        'license_key': 'TEST-LICENSE-KEY-123',
        'device_fingerprint': 'test-device-fingerprint',
        'device_info': {
            'device_id': 'test-device-123',
            'platform': 'mac',
            'app_version': '1.0.0'
        }
    }

    response = await async_client.post(
        '/api/v1/licensing/activate',
        json=activation_request
    )

    assert response.status_code == 200
    data = response.json()
    assert data['success'] is True
    assert 'signed_token' in data
    assert data['subscription_tier'] == 'professional'

@pytest.mark.asyncio
async def test_license_validation_success(
    async_client: AsyncClient,
    test_db: TestDatabase,
    valid_token: str
):
    """Test successful license validation."""
    validation_request = {
        'token': valid_token,
        'device_id': 'test-device-123'
    }

    response = await async_client.post(
        '/api/v1/licensing/validate',
        json=validation_request
    )

    assert response.status_code == 200
    data = response.json()
    assert data['valid'] is True
    assert 'features' in data
    assert data['days_remaining'] > 0
```

### **Frontend Testing**

```typescript
// components/organisms/SubscriptionTable/SubscriptionTable.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SubscriptionTable } from './SubscriptionTable';
import { subscriptionService } from '@/services/subscriptions';

// Mock the service
jest.mock('@/services/subscriptions');

const mockSubscriptions = [
  {
    id: '1',
    customerName: 'Test Company',
    tier: 'professional',
    status: 'active',
    expiresAt: '2025-01-01T00:00:00Z',
    devicesConnected: 2,
    maxDevices: 3,
    lastActivity: '2024-12-01T12:00:00Z'
  }
];

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('SubscriptionTable', () => {
  beforeEach(() => {
    jest.mocked(subscriptionService.getSubscriptions).mockResolvedValue({
      subscriptions: mockSubscriptions,
      totalCount: 1,
      page: 1,
      pageSize: 10
    });
  });

  it('renders subscription data correctly', async () => {
    renderWithProviders(<SubscriptionTable />);

    await waitFor(() => {
      expect(screen.getByText('Test Company')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('handles subscription suspension', async () => {
    const suspendMock = jest.mocked(subscriptionService.suspendSubscription);
    suspendMock.mockResolvedValue({ success: true });

    renderWithProviders(<SubscriptionTable />);

    await waitFor(() => {
      const suspendButton = screen.getByText('Suspend');
      fireEvent.click(suspendButton);
    });

    await waitFor(() => {
      expect(suspendMock).toHaveBeenCalledWith('1');
    });
  });
});
```

## 🚀 **Deployment Configuration**

### **Docker Configuration**

```dockerfile
# Dockerfile (Backend)
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/prod.txt .
RUN pip install --no-cache-dir -r prod.txt

# Copy project
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: flowlytix_subscriptions
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/flowlytix_subscriptions
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
      - redis
    ports:
      - '8000:8000'

  dashboard:
    build: ./subscription-dashboard
    environment:
      NEXT_PUBLIC_API_URL: http://api:8000
    depends_on:
      - api
    ports:
      - '3000:3000'

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api
      - dashboard
    ports:
      - '80:80'
      - '443:443'

volumes:
  postgres_data:
```

## 🔄 **Integration with Existing Electron App**

### **Update Electron App Services**

```typescript
// src/renderer/services/SubscriptionService.ts
import { z } from 'zod';

const API_BASE_URL = process.env.SUBSCRIPTION_API_URL || 'https://api.flowlytix.com';

export class SubscriptionService {
  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  static async activateLicense(licenseKey: string, deviceFingerprint: string, deviceInfo: any) {
    return this.makeRequest('/api/v1/licensing/activate', {
      method: 'POST',
      body: JSON.stringify({
        license_key: licenseKey,
        device_fingerprint: deviceFingerprint,
        device_info: deviceInfo,
      }),
    });
  }

  static async validateLicense(token: string, deviceId: string) {
    return this.makeRequest('/api/v1/licensing/validate', {
      method: 'POST',
      body: JSON.stringify({
        token,
        device_id: deviceId,
      }),
    });
  }

  static async syncSubscription(deviceId: string, tenantId: string) {
    return this.makeRequest('/api/v1/licensing/sync', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        tenant_id: tenantId,
      }),
    });
  }
}
```

## 📊 **Implementation Timeline**

### **Phase 1: Backend Foundation (Weeks 1-2)**

- Set up FastAPI project structure
- Implement database schema and models
- Create core domain entities and repositories
- Implement JWT token management
- Set up basic API endpoints

### **Phase 2: Core Licensing Logic (Weeks 3-4)**

- Implement license activation service
- Create license validation service
- Add device management functionality
- Implement subscription management
- Add comprehensive error handling

### **Phase 3: Dashboard Development (Weeks 5-6)**

- Set up Next.js dashboard project
- Create core UI components
- Implement subscription management interface
- Add analytics and reporting features
- Integrate with backend APIs

### **Phase 4: Testing & Integration (Week 7)**

- Implement comprehensive test suite
- Update Electron app to use real APIs
- Integration testing and bug fixes
- Security testing and hardening

### **Phase 5: Deployment & Monitoring (Week 8)**

- Set up production infrastructure
- Configure monitoring and logging
- Deploy to production environment
- Performance optimization and tuning

## 🎯 **Success Metrics**

### **Technical Metrics**

- API response time < 200ms for 95% of requests
- Database query optimization (no N+1 queries)
- 99.9% uptime for subscription validation
- Memory usage < 512MB for backend service
- Frontend bundle size < 1MB compressed

### **Business Metrics**

- License activation success rate > 99%
- Subscription validation accuracy 100%
- Device management efficiency
- Real-time analytics accuracy
- Customer satisfaction with subscription experience

This comprehensive implementation plan follows your Instructions file standards and provides a complete roadmap for building a robust subscription management system with administrative dashboard capabilities.
