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

function AppContent() {
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <>
      {!isChatPage && <Navbar />}
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
