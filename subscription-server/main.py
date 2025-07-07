"""
Main FastAPI Application

Entry point for the Flowlytix Subscription Server.
Follows Instructions file standards for application structure and lifecycle management.
"""

import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.exceptions import (
    BaseSubscriptionException,
    subscription_exception_handler,
    http_exception_handler,
    general_exception_handler,
)
from app.core.middleware import setup_middleware

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown tasks following Instructions file standards
    for proper resource management and memory leak prevention.
    """
    logger.info("Starting Flowlytix Subscription Server", version=settings.version)
    
    # Startup
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized successfully")
        
        # Initialize other services as needed
        logger.info("Application startup completed")
        
    except Exception as e:
        logger.error("Application startup failed", error=str(e), exc_info=e)
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
        logger.error("Error during shutdown", error=str(e), exc_info=e)


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application.
    
    Follows Instructions file standards for application configuration.
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
    
    # Setup middleware
    setup_middleware(app)
    
    # Setup exception handlers
    app.add_exception_handler(BaseSubscriptionException, subscription_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)
    
    # Include routers (will be added as we create them)
    # app.include_router(auth_router, prefix=settings.api_v1_prefix)
    # app.include_router(subscription_router, prefix=settings.api_v1_prefix)
    # app.include_router(device_router, prefix=settings.api_v1_prefix)
    # app.include_router(analytics_router, prefix=settings.api_v1_prefix)
    
    return app


# Create application instance
app = create_app()


# Health check endpoint
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    
    Returns application health status.
    """
    return {
        "status": "healthy",
        "version": settings.version,
        "environment": settings.environment,
        "timestamp": structlog.get_logger().info("Health check"),
    }


# Metrics endpoint (for monitoring)
@app.get("/metrics")
async def metrics():
    """
    Metrics endpoint for monitoring.
    
    Returns basic application metrics.
    """
    if settings.is_production:
        # In production, you might want to restrict access to this endpoint
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


if __name__ == "__main__":
    import uvicorn
    
    # Configure structlog for better logging
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(int(settings.log_level)),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
    
    logger.info("Starting server in development mode")
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
        access_log=True,
    ) 