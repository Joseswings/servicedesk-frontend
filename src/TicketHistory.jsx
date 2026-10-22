import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "No disponible";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours > 0 ? `${hours} h` : null, `${minutes} min`, `${seconds} s`]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value) {
  if (!value) return "No registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no válida";
  return date.toLocaleString("es-GT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Guatemala",
  });
}

function timeResult(startValue, finishValue, dueValue) {
  if (!startValue || !finishValue) return null;
  const start = new Date(startValue).getTime();
  const finish = new Date(finishValue).getTime();
  const due = dueValue ? new Date(dueValue).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(finish)) return null;
  const delay = Number.isFinite(due) ? finish - due : null;
  return { duration: formatDuration(finish - start), delay };
}

function TimeCard({ title, start, finish, due, pendingLabel }) {
  const result = timeResult(start, finish, due);
  return (
    <div style={{ flex: "1 1 230px", padding: 15, border: "1px solid #d1d5db", borderRadius: 9 }}>
      <strong>{title}</strong>
      <p style={{ fontSize: 22, fontWeight: 700, margin: "10px 0" }}>
        {result ? result.duration : pendingLabel}
      </p>
      {result && result.delay !== null && (
        <p style={{ color: result.delay > 0 ? "#dc2626" : "#15803d", fontWeight: 600 }}>
          {result.delay > 0
            ? `Incumplió por ${formatDuration(result.delay)}`
            : "Cumplió el plazo"}
        </p>
      )}
      <small>Fecha límite: {formatDate(due)}</small>
    </div>
  );
}

export default function TicketHistory({ ticketId, token, ticket, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadHistory() {
      setLoading(true);
      setError("");
      setHistory([]);
      try {
        const response = await fetch(`/api/tickets/${ticketId}/history`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string" ? data.detail : `Error HTTP ${response.status}`
          );
        }
        if (!controller.signal.aborted) setHistory(data.history || []);
      } catch (err) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadHistory();
    return () => controller.abort();
  }, [ticketId, token]);

  function describeAction(event) {
    if (event.action === "ticket_assigned") return "Asignación de técnico";
    if (event.action === "status_changed") return "Cambio de estado";
    return event.action;
  }

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-heading">
        <h2>Historial del ticket #{ticketId}</h2>
        <button type="button" onClick={onClose}><X size={17} /> Cerrar</button>
      </div>

      {ticket && (
        <div style={{ marginBottom: 25 }}>
          <h3>Tiempos de atención</h3>
          <p>Creado: {formatDate(ticket.created_at)}</p>
          <p>Primera respuesta: {formatDate(ticket.first_response_at)}</p>
          <p>Resolución: {formatDate(ticket.resolved_at)}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            <TimeCard
              title="Tiempo de primera respuesta"
              start={ticket.created_at}
              finish={ticket.first_response_at}
              due={ticket.response_due_at}
              pendingLabel="Aún sin respuesta registrada"
            />
            <TimeCard
              title="Tiempo hasta resolución"
              start={ticket.created_at}
              finish={ticket.resolved_at}
              due={ticket.resolution_due_at}
              pendingLabel="Aún sin resolución registrada"
            />
          </div>
          <small>Los tiempos se calculan desde la creación del ticket. Las fechas se muestran en horario de Guatemala.</small>
        </div>
      )}

      <h3>Movimientos del ticket</h3>
      {loading && <p>Cargando historial...</p>}
      {error && <p role="alert" style={{ color: "#dc2626" }}>{error}</p>}
      {!loading && !error && history.length === 0 && (
        <p>Este ticket todavía no tiene movimientos registrados.</p>
      )}
      {!loading && !error && history.map((event) => (
        <div key={event.id} style={{ padding: 15, marginBottom: 12, border: "1px solid #d1d5db", borderRadius: 8 }}>
          <strong>{describeAction(event)}</strong>
          <p>Responsable: {event.actor_name}</p>
          <p>{event.details}</p>
          <small><Clock size={14} style={{ verticalAlign: "middle" }} /> {" "}{formatDate(event.created_at)}</small>
        </div>
      ))}
    </section>
  );
}
