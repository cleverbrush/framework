import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router';
import { Suspense, lazy } from 'react';
import { Flex, Spinner } from '@radix-ui/themes';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

const LoginPage = lazy(() => import('./features/auth/LoginPage'));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage'));
const TodoListPage = lazy(() => import('./features/todos/TodoListPage'));
const CreateTodoPage = lazy(() => import('./features/todos/CreateTodoPage'));
const TodoDetailPage = lazy(() => import('./features/todos/TodoDetailPage'));
const ImportTodosPage = lazy(() => import('./features/todos/ImportTodosPage'));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage'));
const WebhooksPage = lazy(() => import('./features/webhooks/WebhooksPage'));
const UsersPage = lazy(() => import('./features/admin/UsersPage'));
const ActivityPage = lazy(() => import('./features/admin/ActivityPage'));

const PageFallback = () => (
  <Flex justify="center" align="center" p="8">
    <Spinner size="3" />
  </Flex>
);

const router = createBrowserRouter([
  { path: '/login', element: <Suspense fallback={<PageFallback />}><LoginPage /></Suspense> },
  { path: '/register', element: <Suspense fallback={<PageFallback />}><RegisterPage /></Suspense> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/todos" replace /> },
          { path: '/todos', element: <Suspense fallback={<PageFallback />}><TodoListPage /></Suspense> },
          { path: '/todos/new', element: <Suspense fallback={<PageFallback />}><CreateTodoPage /></Suspense> },
          { path: '/todos/import', element: <Suspense fallback={<PageFallback />}><ImportTodosPage /></Suspense> },
          { path: '/todos/:id', element: <Suspense fallback={<PageFallback />}><TodoDetailPage /></Suspense> },
          { path: '/profile', element: <Suspense fallback={<PageFallback />}><ProfilePage /></Suspense> },
          { path: '/webhooks', element: <Suspense fallback={<PageFallback />}><WebhooksPage /></Suspense> },
          {
            element: <ProtectedRoute adminOnly />,
            children: [
              { path: '/admin/users', element: <Suspense fallback={<PageFallback />}><UsersPage /></Suspense> },
              { path: '/admin/activity', element: <Suspense fallback={<PageFallback />}><ActivityPage /></Suspense> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
