import React, { useState, useEffect } from 'react';
import { AuthService } from './services/AuthService';

/**
 * Minimal Login Component - Authentication Only
 */
const LoginPage: React.FC<{
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}> = ({ onLogin, isLoading, error }) => {
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
          🏗️ Flowlytix Login
        </h1>

        <p style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '0.9rem', color: '#666' }}>
          Minimal Authentication Version
        </p>

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

        {/* Error Display */}
        {error && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              fontSize: '0.9rem',
            }}
          >
            ❌ {error}
          </div>
        )}

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
                boxSizing: 'border-box',
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
                boxSizing: 'border-box',
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

        <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
          <p>Default credentials:</p>
          <p>
            <strong>Email:</strong> admin@flowlytix.com
          </p>
          <p>
            <strong>Password:</strong> admin123
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Minimal Dashboard - Authentication Success Only
 */
const Dashboard: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif',
        padding: '2rem',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ color: '#333', margin: 0 }}>🎉 Authentication Successful!</h1>
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

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ margin: '0 0 1rem 0' }}>✅ Login Details</h2>
          <p>
            <strong>User ID:</strong> {user.id}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Role:</strong> {user.role}
          </p>
          <p>
            <strong>Permissions:</strong> {user.permissions?.join(', ') || 'None'}
          </p>
        </div>

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#d1ecf1',
            color: '#0c5460',
            borderRadius: '4px',
            marginBottom: '2rem',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0' }}>🚀 Next Steps</h3>
          <p>Authentication is working perfectly! Now you can:</p>
          <ul style={{ marginLeft: '1.5rem' }}>
            <li>Add the dashboard modules one by one</li>
            <li>Test additional IPC handlers</li>
            <li>Integrate Material-UI components</li>
            <li>Add routing for different pages</li>
            <li>Implement state management</li>
          </ul>
        </div>

        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#fff3cd',
            color: '#856404',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0' }}>🔧 System Status</h3>
          <p>✅ Electron App: Running</p>
          <p>✅ IPC Communication: Working</p>
          <p>✅ Authentication: Success</p>
          <p>✅ Build System: No Errors</p>
          <p>🟡 UI Framework: Minimal (ready for expansion)</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Main App Component - Minimal Authentication Only
 */
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.authenticate(credentials);

      if (result.success && result.user) {
        setUser(result.user);
        setIsAuthenticated(true);
        // Store user data for session persistence
        localStorage.setItem('flowlytix_user', JSON.stringify(result.user));
        console.log('✅ Authentication successful:', result.user);
      } else {
        setError(result.error || 'Authentication failed');
        console.error('❌ Authentication failed:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('❌ Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
    localStorage.removeItem('flowlytix_user');
    console.log('👋 User logged out');
  };

  // Check for existing session on app start
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const storedUser = localStorage.getItem('flowlytix_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('🔄 Session restored for user:', userData.email);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('flowlytix_user');
      }
    };

    checkExistingSession();
  }, []);

  // Log app status
  useEffect(() => {
    console.log('🚀 Flowlytix App Status:');
    console.log('- Electron API Available:', !!window.electronAPI);
    console.log('- Authentication State:', isAuthenticated ? 'Logged In' : 'Logged Out');
    console.log('- Current User:', user?.email || 'None');
  }, [isAuthenticated, user]);

  return (
    <div>
      {isAuthenticated && user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} isLoading={isLoading} error={error} />
      )}
    </div>
  );
};

export default App;
