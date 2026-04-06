import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import LoginPage from "../pages/LoginPage";
import ContactPage from "../pages/ContactPage";
import ContactGroup from "../pages/ContactGroup";
import ContactRequest from "../pages/ContactRequest";
import ContactGroupRequest from "../pages/ContactGroupRequest";
import HomePage from "../pages/HomePage";
import ChatPage from "../pages/ChatPage";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "/chat/:id",
        element: <ChatPage />,
      },
      {
        path: "/contacts",
        element: <ContactPage />,
      },
      {
        path: "/contacts/groups",
        element: <ContactGroup />,
      },
      {
        path: "/contacts/requests",
        element: <ContactRequest />,
      },
      {
        path: "/contacts/group-requests",
        element: <ContactGroupRequest />,
      },
    ],
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
