// src/pages/Callback.tsx
// Handles OAuth callback from WorkOS and redirects to dashboard
import { useEffect } from "react";
import { useAuth } from "@workos-inc/authkit-react";
import { useNavigate } from "react-router-dom";

export default function Callback() {
  const { isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Once authentication is complete, redirect to dashboard
    if (!isLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, user, navigate]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "var(--bg-primary, #fff)",
        color: "var(--text-primary, #111)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2>Signing you in...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}
