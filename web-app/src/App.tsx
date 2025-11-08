import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Main App component with layout and navigation
 */
function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-black">
        {/* Navigation */}
        <nav className="bg-black border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-white">
                    Rapid Photo Upload
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                {isAuthenticated && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-white">
                      {user?.username}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main>
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
