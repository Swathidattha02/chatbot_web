import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/LogoutConfirmation.css";

function LogoutConfirmation() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleConfirmLogout = () => {
        logout();
        navigate("/");
    };

    const handleStayBack = () => {
        navigate(-1); // Go back to the previous page
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
                    <button onClick={handleStayBack} className="btn-stay">
                        Stay Back
                    </button>
                    <button onClick={handleConfirmLogout} className="btn-confirm-logout">
                        Yes, Log Out
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogoutConfirmation;
