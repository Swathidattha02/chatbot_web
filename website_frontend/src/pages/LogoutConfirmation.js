import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/LogoutConfirmation.css";

function LogoutConfirmation() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirmLogout = async () => {
        // Prevent double-clicking
        if (isLoading) {
            console.log("⚠️ [Logout] Already logging out, ignoring duplicate click");
            return;
        }

        setIsLoading(true);
        console.log("🔓 [Logout] Button clicked - starting logout...");
        
        try {
            await logout(); // Wait for logout to complete with flushSync
            console.log("✅ [Logout] Logout completed, auth state cleared");
            console.log("📊 [Logout] Current token from localStorage:", localStorage.getItem("token"));
            
            // Give React maximum time to:
            // 1. Sync state changes from flushSync
            // 2. Re-render all components (Navbar with isAuthenticated=false)
            // 3. Complete DOM painting
            // Then navigate to /login (which ProtectedRoute may also trigger)
            setTimeout(() => {
                console.log("✅ [Logout] 500ms elapsed, now navigating to /login...");
                navigate("/login");
            }, 500); // Increased to 500ms for full React render cycle + DOM paint
        } catch (error) {
            console.error("❌ [Logout] Error during logout:", error);
            setIsLoading(false);
        }
    };

    const handleStayBack = () => {
        if (!isLoading) {
            navigate(-1); // Go back to the previous page
        }
    };

    return (
        <div className="logout-container">
            <div className="logout-card">
                <div className="logout-icon">👋</div>
                <h1>Already leaving?</h1>
                <p>
                    Are you sure you want to log out? We've really enjoyed learning together!
                    Your progress has been saved.
                </p>
                <div className="logout-actions">
                    <button 
                        onClick={handleStayBack} 
                        className="btn-stay"
                        disabled={isLoading}
                    >
                        Stay Back
                    </button>
                    <button 
                        onClick={handleConfirmLogout} 
                        className="btn-confirm-logout"
                        disabled={isLoading}
                    >
                        {isLoading ? "Logging out..." : "Yes, Log Out"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogoutConfirmation;
