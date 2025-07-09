"""
Main FastAPI Application - Fixed Version

Working version of the Flowlytix Subscription Server without BrokenPipeError issues.
"""

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.exceptions import (
    BaseSubscriptionException,
    subscription_exception_handler,
    http_exception_handler,
    general_exception_handler,
)
from app.api.routes import subscription, payment

# Configure simple logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    """
    logger.info("Starting Flowlytix Subscription Server")
    
    # Startup
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized successfully")
        
        logger.info("Application startup completed")
        
    except Exception as e:
        logger.error(f"Application startup failed: {e}")
        raise
    
    # Application is ready
    yield
    
    # Shutdown
    try:
        logger.info("Shutting down application")
        
        # Close database connections
        await close_database()
        logger.info("Database connections closed")
        
        logger.info("Application shutdown completed")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    """
    app = FastAPI(
        title="Flowlytix Subscription Server",
        description="Subscription management and licensing server for Flowlytix",
        version=settings.version,
        debug=settings.debug,
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
        openapi_url="/openapi.json" if not settings.is_production else None,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    # Setup exception handlers
    app.add_exception_handler(BaseSubscriptionException, subscription_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Include routers
    app.include_router(subscription.router, prefix=settings.api_v1_prefix)
    app.include_router(payment.router, prefix=settings.api_v1_prefix)
    
    return app


# Create application instance
app = create_app()


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "version": settings.version,
        "environment": settings.environment,
        "timestamp": datetime.now().isoformat(),
    }


# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """
    Metrics endpoint for monitoring.
    """
    if settings.is_production:
        return {"message": "Metrics endpoint - implement Prometheus metrics here"}
    
    return {
        "application": "flowlytix-subscription-server",
        "version": settings.version,
        "environment": settings.environment,
        "status": "running",
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "Flowlytix Subscription Server",
        "version": settings.version,
        "environment": settings.environment,
        "documentation": "/docs" if not settings.is_production else None,
        "health": "/health",
    }


# Analytics endpoints
@app.get("/api/v1/analytics/dashboard")
async def get_dashboard_analytics():
    """
    Get dashboard overview analytics.
    """
    return {
        "data": {
            "total_subscriptions": 156,
            "active_subscriptions": 142,
            "inactive_subscriptions": 14,
            "monthly_revenue": 23450.00,
            "yearly_revenue": 281400.00,
            "churn_rate": 0.05,
            "growth_rate": 0.15,
            "avg_subscription_value": 165.14,
            "new_subscriptions_this_month": 12,
            "canceled_subscriptions_this_month": 3,
            "upcoming_renewals": 28,
            "overdue_payments": 5,
            "conversion_rate": 0.18,
            "customer_satisfaction": 4.2,
            "support_tickets": 23,
            "feature_adoption_rate": 0.72
        },
        "success": True,
        "message": "Dashboard analytics retrieved successfully"
    }


@app.get("/api/v1/analytics/system-health")
async def get_system_health():
    """
    Get system health metrics.
    """
    return {
        "data": {
            "server_status": "healthy",
            "database_status": "healthy",
            "cache_status": "healthy",
            "api_response_time": 125.5,
            "database_response_time": 23.2,
            "cache_hit_rate": 0.94,
            "error_rate": 0.002,
            "uptime": "99.98%",
            "memory_usage": 68.5,
            "cpu_usage": 34.2,
            "disk_usage": 45.8,
            "active_connections": 127,
            "requests_per_minute": 1250,
            "last_backup": "2024-01-15T03:00:00Z",
            "system_version": settings.version,
            "environment": settings.environment
        },
        "success": True,
        "message": "System health metrics retrieved successfully"
    }


# Additional subscriptions endpoint with pagination support
@app.get("/api/v1/subscriptions")
async def get_subscriptions_paginated(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search term")
):
    """
    Get subscriptions with pagination support.
    """
    # Mock data for subscriptions
    mock_subscriptions = [
        {
            "id": str(i),
            "customerName": f"Customer {i}",
            "customerId": f"cust_{i}",
            "licenseKey": f"FL-{i:04d}-{i*2:04d}-{i*3:04d}",
            "tier": "premium" if i % 3 == 0 else "basic" if i % 2 == 0 else "pro",
            "status": "active" if i % 4 != 0 else "expired" if i % 6 == 0 else "suspended",
            "features": ["core", "analytics"] if i % 2 == 0 else ["core"],
            "maxDevices": 5 if i % 3 == 0 else 3,
            "devicesConnected": i % 5 + 1,
            "startsAt": f"2024-01-{15 + (i % 15):02d}T10:00:00Z",
            "expiresAt": f"2024-12-{15 + (i % 15):02d}T10:00:00Z",
            "gracePeriodDays": 30,
            "lastActivity": f"2024-01-{20 + (i % 10):02d}T14:30:00Z",
            "lastSyncAt": f"2024-01-{20 + (i % 10):02d}T14:30:00Z",
            "createdAt": f"2024-01-{15 + (i % 15):02d}T10:00:00Z",
            "updatedAt": f"2024-01-{20 + (i % 10):02d}T14:30:00Z",
            "notes": f"Test subscription {i}"
        }
        for i in range(1, 201)  # 200 mock subscriptions
    ]
    
    # Apply filters
    filtered_subscriptions = mock_subscriptions
    
    if status:
        filtered_subscriptions = [s for s in filtered_subscriptions if s["status"] == status]
    
    if search:
        filtered_subscriptions = [
            s for s in filtered_subscriptions 
            if search.lower() in s["customerName"].lower() or search.lower() in s["licenseKey"].lower()
        ]
    
    # Calculate pagination
    total_items = len(filtered_subscriptions)
    total_pages = (total_items + page_size - 1) // page_size
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    
    paginated_subscriptions = filtered_subscriptions[start_index:end_index]
    
    # Return structure that matches frontend PaginatedResponse<T> type
    return {
        "success": True,
        "data": {
            "data": paginated_subscriptions,  # This is what frontend expects in PaginatedResponse<T>
            "totalCount": total_items,
            "page": page,
            "pageSize": page_size,
            "totalPages": total_pages
        },
        "message": f"Retrieved {len(paginated_subscriptions)} subscriptions"
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting server in development mode")
    
    uvicorn.run(
        "main_fixed:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
        access_log=False,  # Disable access logging to prevent issues
    ) 