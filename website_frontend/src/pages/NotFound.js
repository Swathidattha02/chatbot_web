import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "calc(100vh - 72px)",
      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      color: "white",
      textAlign: "center",
      padding: "2rem"
    }}>
      <h1 style={{ fontSize: "4rem", fontWeight: "700", margin: "0 0 1rem 0" }}>
        404
      </h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: "0 0 0.5rem 0" }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: "1.1rem", opacity: 0.9, margin: "0 0 2rem 0", maxWidth: "400px" }}>
        Sorry! The page you're looking for doesn't exist. It might have been moved or deleted.
      </p>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            background: "white",
            color: "#6366f1",
            border: "none",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "1rem"
          }}
        >
          <Home size={20} /> Go Home
        </button>

        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            border: "2px solid white",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
            fontSize: "1rem"
          }}
        >
          <ArrowLeft size={20} /> Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFound;
