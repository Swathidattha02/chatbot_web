import React, { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem("token"));

    useEffect(() => {
        // Check if user is logged in on mount
        const checkAuth = async () => {
            const storedToken = localStorage.getItem("token");
            const storedUser = localStorage.getItem("user");

            if (storedToken) {
                setToken(storedToken);
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }

                // Always fetch fresh user data to ensure we have all fields (like class, section)
                try {
                    const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/auth/me`, {
                        headers: { "Authorization": `Bearer ${storedToken}` }
                    });
                    const data = await response.json();
                    if (data.success && data.user) {
                        // Standardize the id field (backend sends _id, frontend expects id)
                        const freshUser = { ...data.user, id: data.user._id };
                        setUser(freshUser);
                        localStorage.setItem("user", JSON.stringify(freshUser));
                    } else {
                        // Token might be invalid/expired
                        localStorage.removeItem("token");
                        localStorage.removeItem("user");
                        setToken(null);
                        setUser(null);
                    }
                } catch (err) {
                    console.error("Failed to refresh user auth state:", err);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await authAPI.login({ email, password });
            const { token, user } = response.data;

            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            setToken(token);
            setUser(user);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Login failed",
            };
        }
    };

    const signup = async (name, email, password, userClass, phone, extraFields = {}) => {
        try {
            const response = await authAPI.signup({
                name, email, password, class: userClass, phone, ...extraFields
            });
            const data = response.data;

            // If pending approval - don't log in, return pending flag
            if (data.pending) {
                return { success: true, pending: true, message: data.message };
            }

            const { token, user } = data;
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            setToken(token);
            setUser(user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || "Signup failed",
            };
        }
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem("token");
            if (token) {
                // Call backend logout endpoint to close open violations
                const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000/api"}/auth/logout`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });
                
                const data = await response.json();
                console.log("✅ Logout API Response:", data);
                
                if (!response.ok) {
                    console.error("❌ Logout failed:", data);
                }
            }
        } catch (err) {
            console.error("❌ Error during logout API call:", err);
        } finally {
            // Clear local storage and state regardless of API response
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
        }
    };

    const value = {
        user,
        token,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!token,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
