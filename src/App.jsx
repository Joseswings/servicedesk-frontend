import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Headphones,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
} from "lucide-react";
import TicketHistory from "./TicketHistory";
import SlaDashboard from "./SlaDashboard";
import SlaCountdown from "./SlaCountdown";
import "./App.css";

const priorityNames = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const priorities = {
  Baja: "low",
  Media: "medium",
  Alta: "high",
  Crítica: "critical",
};

const statusNames = {
  open: "Abierto",
  in_progress: "En proceso",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const transitions = {
  open: [{ value: "in_progress", label: "Iniciar atención" }],
  in_progress: [{ value: "resolved", label: "Resolver ticket" }],
  resolved: [
    { value: "closed", label: "Cerrar ticket" },
    { value: "in_progress", label: "Reabrir ticket" },
  ],
  closed: [],
};

function normalizeTicket(ticket) {
  const now = Date.now();
  const created = new Date(ticket.created_at).getTime();
  const responseDue = ticket.response_due_at
    ? new Date(ticket.response_due_at).getTime()
    : null;
  const resolutionDue = ticket.resolution_due_at
    ? new Date(ticket.resolution_due_at).getTime()
    : null;

  const firstResponse = ticket.first_response_at
    ? new Date(ticket.first_response_at).getTime()
    : null;
  const resolved = ticket.resolved_at
    ? new Date(ticket.resolved_at).getTime()
    : null;

  const finished = ["resolved", "closed"].includes(ticket.status);

  const responseBreached =
    responseDue !== null &&
    (firstResponse !== null
      ? firstResponse > responseDue
      : now > responseDue);

  const resolutionBreached =
    resolutionDue !== null &&
    (resolved !== null
      ? resolved > resolutionDue
      : finished || now > resolutionDue);

  let sla = "Dentro del SLA";

  if (responseDue === null || resolutionDue === null) {
    sla = "Sin política SLA";
  } else if (responseBreached || resolutionBreached) {
    sla = finished ? "Incumplió SLA" : "SLA vencido";
  } else if (finished) {
    sla = "Cumplió SLA";
  } else {
    const responseWarning =
      firstResponse === null &&
      responseDue - now <= (responseDue - created) * 0.20;

    const resolutionWarning =
      resolutionDue - now <= (resolutionDue - created) * 0.20;

    if (responseWarning || resolutionWarning) {
      sla = "Próximo a vencer";
    }
  }

  return { ...ticket, sla };
}

async function apiRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  return data;
}

export default function App({ token, user }) {
  const [page, setPage] = useState("dashboard");
  const [historyTicketId, setHistoryTicketId] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [apiStatus, setApiStatus] = useState("Verificando");
  const [loading, setLoading] = useState(false);
  const [busyTicket, setBusyTicket] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Media",
  });

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("API no disponible");
        return response.json();
      })
      .then((data) => {
        setApiStatus(
          data.status === "ok" ? "Conectada" : "Respuesta inesperada"
        );
      })
      .catch(() => setApiStatus("Sin conexión"));
  }, []);

  const loadTickets = useCallback(async () => {
    if (!token) return;

    const data = await apiRequest("/api/tickets", token);
    setTickets(data.map(normalizeTicket));
  }, [token]);

  const loadTechnicians = useCallback(async () => {
    if (!token || !isAdmin) return;

    const data = await apiRequest("/api/technicians", token);
    setTechnicians(data);
  }, [token, isAdmin]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);

      try {
        const data = await apiRequest("/api/tickets", token);

        if (!cancelled) {
          setTickets(data.map(normalizeTicket));
        }

        if (isAdmin) {
          const techniciansData = await apiRequest(
            "/api/technicians",
            token
          );

          if (!cancelled) {
            setTechnicians(techniciansData);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) initialize();

    return () => {
      cancelled = true;
    };
  }, [token, isAdmin]);

  const metrics = useMemo(
    () => ({
      open: tickets.filter(
        (ticket) =>
          ticket.status === "open" ||
          ticket.status === "in_progress"
      ).length,
      expired: tickets.filter(
        (ticket) => ["Vencido", "SLA vencido", "Incumplió SLA"].includes(ticket.sla)
      ).length,
      critical: tickets.filter(
        (ticket) => ticket.priority === "critical"
      ).length,
      resolved: tickets.filter(
        (ticket) => ticket.status === "resolved"
      ).length,
    }),
    [tickets]
  );

  function clearMessages() {
    setMessage("");
    setError("");
  }

  async function refreshTickets() {
    clearMessages();
    setLoading(true);

    try {
      await loadTickets();

      if (isAdmin) {
        await loadTechnicians();
      }

      setMessage("Información actualizada correctamente.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket(event) {
    event.preventDefault();
    clearMessages();

    if (!form.title.trim() || !form.description.trim()) return;

    setLoading(true);

    try {
      const saved = await apiRequest("/api/tickets", token, {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: priorities[form.priority],
        }),
      });

      await loadTickets();

      setForm({
        title: "",
        description: "",
        priority: "Media",
      });

      setPage("tickets");
      setMessage(`Ticket #${saved.id} creado correctamente.`);
    } catch (err) {
      setError(`No se pudo crear el ticket: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function assignTicket(ticketId, technicianId) {
    clearMessages();

    if (!isAdmin) {
      setError("Solo los administradores pueden asignar tickets.");
      return;
    }

    if (!technicianId) {
      setError("Selecciona un técnico.");
      return;
    }

    setBusyTicket(ticketId);

    try {
      await apiRequest(
        `/api/tickets/${ticketId}/assign`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            technician_id: Number(technicianId),
          }),
        }
      );

      await loadTickets();

      setMessage(
        `Ticket #${ticketId} asignado correctamente.`
      );
    } catch (err) {
      setError(`No se pudo asignar: ${err.message}`);
    } finally {
      setBusyTicket(null);
    }
  }

  async function changeStatus(ticketId, newStatus) {
    clearMessages();
    setBusyTicket(ticketId);

    try {
      await apiRequest(
        `/api/tickets/${ticketId}/status`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      await loadTickets();

      setMessage(
        `Estado del ticket #${ticketId} actualizado correctamente.`
      );
    } catch (err) {
      setError(`No se pudo cambiar el estado: ${err.message}`);
    } finally {
      setBusyTicket(null);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
          <div className="brand">
            <Headphones size={27} />
            <span>ServiceDesk <b>Cloud</b></span>
          </div>

          <p className="menu-label">MENÚ PRINCIPAL</p>

          <button
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <LayoutDashboard size={19} />
            Dashboard
          </button>

          <button
            className={page === "tickets" ? "active" : ""}
            onClick={() => setPage("tickets")}
          >
            <Ticket size={19} />
            Tickets
          </button>

          <button
            className={page === "new" ? "active" : ""}
            onClick={() => setPage("new")}
          >
            <PlusCircle size={19} />
            Nuevo ticket
          </button>

          {isAdmin && (
            <button
              className={page === "sla" ? "active" : ""}
              onClick={() => setPage("sla")}
            >
              <Activity size={19} />
              Monitoreo SLA
            </button>
          )}

          <div className="sidebar-bottom">
            <Activity size={17} />
            Grupo 2 · Cloud Computing
          </div>
        </aside>

        <main className="main">
        <header className="header">
          <div>
            <h1>
              {page === "dashboard"
                ? "Dashboard"
                : page === "tickets"
                  ? "Gestión de tickets"
                  : page === "sla"
                    ? "Monitoreo SLA"
                    : "Crear nuevo ticket"}
            </h1>

            <p>Plataforma de gestión de soporte técnico</p>
            <p>
              Sesión: {user?.full_name || "Usuario"} ·{" "}
              {user?.role || "Sin rol"}
            </p>
          </div>

          <span
            className={`api ${
              apiStatus === "Conectada" ? "connected" : ""
            }`}
          >
            ● API: {apiStatus}
          </span>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              marginBottom: 15,
              border: "1px solid #dc2626",
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              padding: 14,
              marginBottom: 15,
              border: "1px solid #16a34a",
              borderRadius: 8,
            }}
          >
            {message}
          </div>
        )}

        {page === "sla" && isAdmin && (
          <SlaDashboard token={token} />
        )}

        {page === "dashboard" && (
          <>
            <section className="metrics">
              <div className="metric">
                <Ticket />
                <span>Tickets abiertos</span>
                <strong>{metrics.open}</strong>
              </div>

              <div className="metric danger">
                <AlertTriangle />
                <span>Tickets vencidos</span>
                <strong>{metrics.expired}</strong>
              </div>

              <div className="metric">
                <Clock />
                <span>Prioridad crítica</span>
                <strong>{metrics.critical}</strong>
              </div>

              <div className="metric success">
                <CheckCircle2 />
                <span>Tickets resueltos</span>
                <strong>{metrics.resolved}</strong>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>Tickets recientes</h2>

                <button
                  className="primary"
                  onClick={() => setPage("tickets")}
                >
                  Ver todos
                </button>
              </div>

              <TicketTable
                tickets={tickets.slice(0, 5)}
                technicians={technicians}
                user={user}
                busyTicket={busyTicket}
                onAssign={assignTicket}
                onStatusChange={changeStatus}
                onViewHistory={setHistoryTicketId}
              />
            </section>
          </>
        )}

        {page === "tickets" && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Todos los tickets</h2>

              <button
                className="primary"
                onClick={refreshTickets}
                disabled={loading}
              >
                <RefreshCw size={16} />
                {loading ? "Cargando..." : "Actualizar"}
              </button>
            </div>

            <TicketTable
              tickets={tickets}
              technicians={technicians}
              user={user}
              busyTicket={busyTicket}
              onAssign={assignTicket}
              onStatusChange={changeStatus}
                onViewHistory={setHistoryTicketId}
            />
          </section>
        )}

        {page === "new" && (
          <section className="panel form-panel">
            <h2>Registrar solicitud de soporte</h2>

            <form onSubmit={createTicket}>
              <label htmlFor="ticket-title">
                Asunto del ticket
              </label>

              <input
                id="ticket-title"
                required
                maxLength={120}
                value={form.title}
                onChange={(event) =>
                  setForm({
                    ...form,
                    title: event.target.value,
                  })
                }
                placeholder="Ej. Problema de acceso al sistema"
              />

              <label htmlFor="ticket-description">
                Descripción
              </label>

              <textarea
                id="ticket-description"
                required
                rows={5}
                value={form.description}
                onChange={(event) =>
                  setForm({
                    ...form,
                    description: event.target.value,
                  })
                }
                placeholder="Describe el problema..."
              />

              <label htmlFor="ticket-priority">
                Prioridad
              </label>

              <select
                id="ticket-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority: event.target.value,
                  })
                }
              >
                <option>Baja</option>
                <option>Media</option>
                <option>Alta</option>
                <option>Crítica</option>
              </select>

              <button
                className="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar ticket"}
              </button>
            </form>

            <p className="notice">
              Los tickets se almacenan en PostgreSQL.
            </p>
          </section>
        )}

        {historyTicketId !== null && (
          <TicketHistory
            ticketId={historyTicketId}
            token={token}
            ticket={tickets.find((t) => Number(t.id) === Number(historyTicketId))}
            onClose={() => setHistoryTicketId(null)}
          />
        )}

        <footer>
          ServiceDesk Cloud · Grupo 2 · Entorno académico
        </footer>
      </main>
    </div>
  );
}

function TicketTable({
  tickets,
  technicians,
  user,
  busyTicket,
  onAssign,
  onStatusChange,
  onViewHistory,
}) {
  const isAdmin = user?.role === "admin";
  const isTechnician = user?.role === "technician";
  const canManage = isAdmin || isTechnician;

  if (tickets.length === 0) {
    return (
      <p className="notice">
        No hay tickets disponibles.
      </p>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Asunto</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>SLA</th>
            <th>Técnico</th>
            {canManage && <th>Acciones</th>}
            <th>Historial</th>
          </tr>
        </thead>

        <tbody>
          {tickets.map((ticket) => {
            const assignedToMe =
              Number(ticket.assigned_to) === Number(user?.id);

            const canChangeStatus =
              isAdmin || (isTechnician && assignedToMe);

            const choices = canChangeStatus
              ? transitions[ticket.status] || []
              : [];

            const selectedTechnician = technicians.find(
              (technician) =>
                Number(technician.id) ===
                Number(ticket.assigned_to)
            );

            return (
              <tr key={ticket.id}>
                <td>#{ticket.id}</td>

                <td>{ticket.title}</td>

                <td>
                  <span
                    className={`pill ${
                      priorityNames[ticket.priority]
                        ?.toLowerCase() || ""
                    }`}
                  >
                    {priorityNames[ticket.priority] ||
                      ticket.priority}
                  </span>
                </td>

                <td>
                  {statusNames[ticket.status] || ticket.status}
                </td>

                <td>
                  <span
                    className={
                      ["Vencido", "SLA vencido", "Incumplió SLA"].includes(ticket.sla)
                        ? "expired"
                        : ""
                    }
                  >
                    {ticket.sla}
                  </span>
                  <SlaCountdown ticket={ticket} />
                </td>

                <td>
                  {isAdmin ? (
                    <select
                      aria-label={`Técnico para ticket ${ticket.id}`}
                      key={`${ticket.id}-${ticket.assigned_to ?? "none"}`}
                      defaultValue={ticket.assigned_to ?? ""}
                      disabled={
                        busyTicket === ticket.id ||
                        technicians.length === 0
                      }
                      onChange={(event) => {
                        const value = event.target.value;

                        if (value) {
                          onAssign(ticket.id, value);
                        }
                      }}
                    >
                      <option value="">
                        Sin asignar
                      </option>

                      {technicians.map((technician) => (
                        <option
                          key={technician.id}
                          value={technician.id}
                        >
                          {technician.full_name}
                        </option>
                      ))}
                    </select>
                  ) : ticket.assigned_to ? (
                    assignedToMe
                      ? "Asignado a mí"
                      : `Técnico #${ticket.assigned_to}`
                  ) : (
                    "Sin asignar"
                  )}

                  {isAdmin && selectedTechnician && (
                    <small style={{ display: "block" }}>
                      Actual: {selectedTechnician.full_name}
                    </small>
                  )}
                </td>

                {canManage && (
                  <td>
                    {choices.length > 0 ? (
                      <select
                        aria-label={`Cambiar estado de ticket ${ticket.id}`}
                        value=""
                        disabled={busyTicket === ticket.id}
                        onChange={(event) => {
                          const value = event.target.value;

                          if (value) {
                            onStatusChange(ticket.id, value);
                          }
                        }}
                      >
                        <option value="">
                          Cambiar estado...
                        </option>

                        {choices.map((choice) => (
                          <option
                            key={choice.value}
                            value={choice.value}
                          >
                            {choice.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span>
                        {busyTicket === ticket.id
                          ? "Procesando..."
                          : "Sin acciones"}
                      </span>
                    )}
                  </td>
                )}
                <td>
                  <button
                    type="button"
                    onClick={() => onViewHistory(ticket.id)}
                  >
                    Ver historial
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
