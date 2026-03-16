import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ChatWithAvatar from "./pages/ChatWithAvatar";
import SubjectChapters from "./pages/SubjectChapters";
import PDFViewer from "./pages/PDFViewer";
import Analytics from "./pages/Analytics";
import LogoutConfirmation from "./pages/LogoutConfirmation";
import Contact from "./pages/Contact";
import TeacherDashboard from "./pages/TeacherDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SubjectLayout from "./components/SubjectLayout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Role-based Route — only allows a specific role, otherwise → /login
const RoleRoute = ({ children, role }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  // Fallback to localStorage if context not yet populated but authenticated
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const currentUser = user || storedUser;

  if (!isAuthenticated || !currentUser || currentUser.role !== role) {
    return <Navigate to="/login" />;
  }

  return children;
};

function AppContent() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const isSubjectPage = location.pathname.startsWith('/subjects');
  const isTeacherPage = location.pathname.startsWith('/teacher');
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isChatPage && !isTeacherPage && !isAdminPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:role/:token" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatWithAvatar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/chapters"
          element={
            <ProtectedRoute>
              <SubjectLayout>
                <SubjectChapters />
              </SubjectLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/chapters/:chapterId/pdf"
          element={
            <ProtectedRoute>
              <SubjectLayout>
                <PDFViewer />
              </SubjectLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/teacher/dashboard"
          element={
            <RoleRoute role="teacher">
              <TeacherDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <RoleRoute role="admin">
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/logout-confirm"
          element={
            <ProtectedRoute>
              <LogoutConfirmation />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isChatPage && !isSubjectPage && !isTeacherPage && !isAdminPage && <Footer />}
    </>
  );
}

function AppRoutes() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
