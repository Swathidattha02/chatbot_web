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

// Components
import Navbar from "./components/Navbar";

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
  const stored = localStorage.getItem("user");
  const token = localStorage.getItem("token");
  if (!stored || !token) return <Navigate to="/login" />;
  const u = JSON.parse(stored);
  if (u.role !== role) return <Navigate to="/login" />;
  return children;
};

function AppContent() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';
  const isTeacherPage = location.pathname.startsWith('/teacher');
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isChatPage && !isTeacherPage && !isAdminPage && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
              <SubjectChapters />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/chapters/:chapterId/pdf"
          element={
            <ProtectedRoute>
              <PDFViewer />
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
