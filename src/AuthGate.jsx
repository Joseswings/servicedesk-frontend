
import { useState } from "react";
import RoleRouter from "./RoleRouter";
import "./AuthGate.css";

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(e) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      if (!response.ok) {
        throw new Error("Correo o contraseña incorrectos");
      }

      const data = await response.json();

      if (!data.access_token) {
        throw new Error("El servidor no devolvió un token válido");
      }

      const profile = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${data.access_token}`
        }
      });

      if (!profile.ok) {
        throw new Error("No se pudo verificar la sesión");
      }

      const authenticatedUser = await profile.json();

      const allowedRoles = [
        "admin",
        "technician",
        "client"
      ];

      if (!allowedRoles.includes(authenticatedUser.role)) {
        throw new Error(
          "Tu cuenta no tiene un rol autorizado en el sistema"
        );
      }

      setUser(authenticatedUser);
      setToken(data.access_token);

      setPassword("");
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setEmail("");
    setPassword("");
    setError("");
  }

  if (!user || !token) {
    return (
      <div className="auth-screen">
        <form className="auth-card" onSubmit={login}>
          <div className="auth-logo">☁</div>

          <h1>ServiceDesk Cloud</h1>

          <p>
            Plataforma de atención al cliente
            y gestión de soporte técnico
          </p>

          <label htmlFor="login-email">
            Correo electrónico
          </label>

          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@institucion.edu.gt"
          />

          <label htmlFor="login-password">
            Contraseña
          </label>

          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresa tu contraseña"
          />

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Verificando..." : "Iniciar sesión"}
          </button>

          <small>
            ServiceDesk Cloud 2.0 · Grupo 2
          </small>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="session-bar">
        <span>
          {user.full_name} · {user.role}
        </span>

        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>

      <RoleRouter
        token={token}
        user={user}
      />
    </>
  );
}
