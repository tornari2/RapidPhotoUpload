import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '../App';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import DashboardPage from '../pages/DashboardPage';
import UploadPage from '../pages/UploadPage';
import PhotosPage from '../pages/PhotosPage';
import ProtectedRoute from '../components/ProtectedRoute';

/**
 * Application router configuration
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'upload',
            element: <UploadPage />,
          },
          {
            path: 'photos',
            element: <PhotosPage />,
          },
        ],
      },
    ],
  },
]);

/**
 * Router component
 */
export default function Router() {
  return <RouterProvider router={router} />;
}

