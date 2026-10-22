
import { useCallback, useEffect, useState } from "react";
import {
  Wrench, Ticket, Clock3, CheckCircle2,
  RefreshCw, AlertTriangle
} from "lucide-react";
import SlaCountdown from "../SlaCountdown";
import TicketHistory from "../TicketHistory";
import "./TechnicianPortal.css";

const STATUS = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
  closed: "Cerrado"
};

const PRIORITY = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica"
};

export default function TechnicianPortal({ token, user }) {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tickets", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("Formato de tickets inesperado");
      }

      const own = data.filter(
        ticket => String(ticket.assigned_to) === String(user.id)
      );

      setTickets(own);
    } catch (err) {
      setError(err.message);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, user.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  async function changeStatus(ticketId, newStatus) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : `Error HTTP ${response.status}`
        );
      }

      await loadTickets();
      setMessage(`Ticket #${ticketId} actualizado correctamente.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const selected = tickets.find(
    ticket => ticket.id === selectedId
  );

  const active = tickets.filter(
    ticket => ["open", "in_progress"].includes(ticket.status)
  ).length;

  const resolved = tickets.filter(
    ticket => ["resolved", "closed"].includes(ticket.status)
  ).length;

  return (
    <div className="tech-layout">
      <aside className="tech-sidebar">
        <div className="tech-brand">
          <Wrench size={28} />
          <div>
            <strong>ServiceDesk</strong>
            <small>Portal del técnico</small>
          </div>
        </div>

        <div className="tech-profile">
          <span>SESIÓN ACTIVA</span>
          <strong>{user.full_name}</strong>
          <small>Técnico #{user.id}</small>
        </div>

        <div className="tech-menu">
          <Ticket size={18} />
          Mis tickets asignados
        </div>
      </aside>

      <main className="tech-main">
        <header className="tech-header">
          <div>
            <span>CENTRO DE ATENCIÓN</span>
            <h1>Panel del técnico</h1>
            <p>Bienvenido, {user.full_name}</p>
          </div>
          <button onClick={loadTickets} disabled={loading}>
            <RefreshCw size={17} />
            Actualizar
          </button>
        </header>

        <section className="tech-stats">
          <article>
            <Ticket />
            <strong>{loading ? "—" : tickets.length}</strong>
            <span>Mis tickets</span>
          </article>
          <article>
            <Clock3 />
            <strong>{loading ? "—" : active}</strong>
            <span>Pendientes y en proceso</span>
          </article>
          <article>
            <CheckCircle2 />
            <strong>{loading ? "—" : resolved}</strong>
            <span>Resueltos y cerrados</span>
          </article>
        </section>

        <section className="tech-panel">
          <h2>Bandeja de atención</h2>

          {loading && <p>Cargando tickets...</p>}

          {error && (
            <p className="tech-error" role="alert">
              <AlertTriangle size={17} /> {error}
            </p>
          )}

          {!loading && !error && tickets.length === 0 && (
            <p>No tienes tickets asignados actualmente.</p>
          )}

          {!loading && !error && tickets.map(ticket => (
            <article className="tech-ticket" key={ticket.id}>
              <div>
                <small>Ticket #{ticket.id}</small>
                <h3>{ticket.title}</h3>
                <p>
                  Prioridad: {PRIORITY[ticket.priority] || ticket.priority}
                </p>
                <p>
                  Estado: {STATUS[ticket.status] || ticket.status}
                </p>
                <SlaCountdown ticket={ticket} />
              </div>
              <button onClick={() => setSelectedId(ticket.id)}>
                Ver detalle
              </button>
            </article>
          ))}
        </section>

        {message && (
          <p role="status" className="tech-success">{message}</p>
        )}

        {selected && (
          <section className="tech-panel tech-detail">
            <div className="tech-detail-heading">
              <h2>Detalle del ticket #{selected.id}</h2>
              <button onClick={() => setSelectedId(null)}>
                Cerrar detalle
              </button>
            </div>

            <h3>{selected.title}</h3>
            <p>
              <strong>Estado:</strong>{" "}
              {STATUS[selected.status] || selected.status}
            </p>
            <p>
              <strong>Prioridad:</strong>{" "}
              {PRIORITY[selected.priority] || selected.priority}
            </p>
            <p>
              <strong>Cliente (ID):</strong>{" "}
              {selected.created_by ?? "No disponible"}
            </p>
            <p>
              <strong>Descripción del problema:</strong>
            </p>
            <div className="tech-description">
              {selected.description || "Sin descripción"}
            </div>

            <h3>Seguimiento SLA</h3>
            <SlaCountdown ticket={selected} />

            <div className="tech-actions">
              {selected.status === "open" && (
                <button
                  disabled={busy || loading}
                  onClick={() => changeStatus(selected.id, "in_progress")}
                >
                  Iniciar atención
                </button>
              )}

              {selected.status === "in_progress" && (
                <button
                  disabled={busy || loading}
                  onClick={() => changeStatus(selected.id, "resolved")}
                >
                  Marcar como resuelto
                </button>
              )}

              <button
                onClick={() => setShowHistory(value => !value)}
              >
                {showHistory ? "Ocultar historial" : "Ver historial"}
              </button>
            </div>

            {showHistory && (
              <TicketHistory
                key={selected.id}
                ticketId={selected.id}
                token={token}
                ticket={selected}
                onClose={() => setShowHistory(false)}
              />
            )}

            <p className="tech-pending">
              Las respuestas, los adjuntos y la retroalimentación
              se integrarán con las nuevas APIs de Miguel.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
