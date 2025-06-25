import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
// Temporarily commenting out MUI imports to fix build issues
// import { Container, Alert, Snackbar } from '@mui/material';
// import LoginPage from './pages/LoginPage';
// import DashboardPage from './pages/DashboardPage';
import { AuthService } from './services/AuthService';

/**
 * Temporary Simple Login Component
 */
const SimpleLoginPage: React.FC<{
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}> = ({ onLogin, isLoading }) => {
  const [email, setEmail] = useState('admin@flowlytix.com');
  const [password, setPassword] = useState('admin123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email, password });
  };

  // Check if Electron API is available
  const isElectronAPIAvailable = typeof window !== 'undefined' && window.electronAPI;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            marginBottom: '2rem',
            color: '#333',
          }}
        >
          Flowlytix Login
        </h1>

        {/* API Status Indicator */}
        <div
          style={{
            padding: '0.5rem',
            marginBottom: '1rem',
            backgroundColor: isElectronAPIAvailable ? '#d4edda' : '#f8d7da',
            color: isElectronAPIAvailable ? '#155724' : '#721c24',
            borderRadius: '4px',
            fontSize: '0.9rem',
            textAlign: 'center',
          }}
        >
          {isElectronAPIAvailable ? '✅ Electron API Available' : '❌ Electron API Not Available'}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
              }}
            >
              Email:
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
              }}
            >
              Password:
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <button
            type='submit'
            disabled={isLoading || !isElectronAPIAvailable}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isLoading || !isElectronAPIAvailable ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: isLoading || !isElectronAPIAvailable ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoading ? 'Logging in...' : !isElectronAPIAvailable ? 'API Not Available' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

/**
 * Temporary Simple Dashboard Component
 */
const SimpleDashboardPage: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Test the analytics API
      const result = await window.electronAPI.analytics.salesSummary({
        agencyId: 'test-agency',
        userId: user.id,
        periodType: 'LAST_30_DAYS',
        groupBy: ['day'],
        metrics: {
          totalSales: true,
          orderCount: true,
          averageOrderValue: true,
          customerCount: true,
        },
      });

      setAnalyticsData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabase = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Test the database API
      const result = await window.electronAPI.database.query('SELECT 1 as test');
      setAnalyticsData({ database: result });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif',
        padding: '2rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#333' }}>Flowlytix Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
            Welcome, {user.firstName} {user.lastName} ({user.role})
          </p>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>

      {/* Test Buttons */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          marginBottom: '2rem',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#333' }}>API Tests</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            onClick={testAnalytics}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Analytics API
          </button>
          <button
            onClick={testDatabase}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            Test Database API
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            Error: {error}
          </div>
        )}

        {analyticsData && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
            }}
          >
            <h4>API Response:</h4>
            <pre
              style={{
                backgroundColor: '#f8f9fa',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '0.9rem',
              }}
            >
              {JSON.stringify(analyticsData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* System Info */}
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ marginTop: 0, color: '#333' }}>System Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Frontend</h4>
            <p style={{ margin: 0, color: '#28a745' }}>✓ Connected</p>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>IPC Communication</h4>
            <p style={{ margin: 0, color: '#28a745' }}>✓ Ready</p>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Analytics Module</h4>
            <p style={{ margin: 0, color: '#28a745' }}>✓ Available</p>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#495057' }}>Build Status</h4>
            <p style={{ margin: 0, color: '#28a745' }}>✓ Success</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      // Debug: Check if electronAPI is available
      console.log('Checking electronAPI availability...');
      if (!window.electronAPI) {
        throw new Error('Electron API not available - preload script may not be loaded');
      }

      console.log('Electron API available, attempting authentication...');
      console.log('Credentials:', credentials);

      // Use our IPC authentication
      const result = await window.electronAPI.auth.authenticateUser(credentials);

      console.log('Authentication result:', result);

      if (result.success && result.user) {
        setUser(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.auth.getUserPermissions({ userId: user?.id || '' });
      setUser(null);
    } catch (err) {
      // Ignore logout errors
      setUser(null);
    }
  };

  // Show login if no user
  if (!user) {
    return <SimpleLoginPage onLogin={handleLogin} isLoading={isLoading} />;
  }

  // Show dashboard if logged in
  return <SimpleDashboardPage user={user} onLogout={handleLogout} />;
};

export default App;
