import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard, Ticket, PlusCircle,
  RefreshCw, Clock3, CheckCircle2, AlertCircle
} from "lucide-react";
import TicketForm from "../components/TicketForm";
import "./ClientPortal.css";

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

export default function ClientPortal({ token, user }) {
  const [page, setPage] = useState("inicio");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tickets", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(
          `No se pudieron consultar los tickets (HTTP ${response.status})`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("La API devolvió un formato inesperado.");
      }

      // Filtro visual adicional. La autorización real debe
      // implementarse y verificarse en FastAPI.
      const own = data.filter((ticket) => {
        const owner =
          ticket.created_by ??
          ticket.created_by_id ??
          ticket.creator_id;

        return owner != null &&
          String(owner) === String(user?.id);
      });

      setTickets(own);

      if (data.length > 0 &&
          data.some(ticket =>
            ticket.created_by == null &&
            ticket.created_by_id == null &&
            ticket.creator_id == null
          )) {
        setNotice(
          "Algunos tickets no incluyen el identificador del cliente. " +
          "Se ocultaron hasta verificar su propietario."
        );
      } else {
        setNotice("");
      }
    } catch (err) {
      setError(err.message);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const active = tickets.filter(t =>
    t.status === "open" || t.status === "in_progress"
  ).length;

  const resolved = tickets.filter(t =>
    t.status === "resolved" || t.status === "closed"
  ).length;

  function renderTickets() {
    if (loading) return <p>Cargando tus solicitudes...</p>;

    if (error) {
      return <p className="client-error" role="alert">{error}</p>;
    }

    if (!tickets.length) {
      return (
        <div className="client-empty">
          <Ticket size={35} />
          <h3>No hay solicitudes disponibles</h3>
          <p>
            Si ya reportaste un caso, verificaremos que
            el backend devuelva tu identificador de cliente.
          </p>
          <button onClick={() => setPage("nuevo")}>
            Crear solicitud
          </button>
        </div>
      );
    }

    return (
      <div className="client-ticket-list">
        {tickets.map(ticket => (
          <article className="client-ticket" key={ticket.id}>
            <div>
              <span className="client-ticket-id">
                Ticket #{ticket.id}
              </span>
              <h3>{ticket.title}</h3>
              <p>
                Prioridad: {
                  PRIORITY[ticket.priority] ||
                  ticket.priority ||
                  "Sin especificar"
                }
              </p>
              <p>
                Técnico: {
                  ticket.technician_name ||
                  ticket.assigned_to_name ||
                  (ticket.assigned_to
                    ? `ID ${ticket.assigned_to}`
                    : "Pendiente de asignación")
                }
              </p>
            </div>
            <span className={`client-status status-${ticket.status}`}>
              {STATUS[ticket.status] || ticket.status}
            </span>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="client-layout">
      <aside className="client-sidebar">
        <div className="client-brand">
          <strong>ServiceDesk Cloud</strong>
          <span>Portal de clientes · 2.0</span>
        </div>

        <nav aria-label="Menú del cliente">
          <button
            className={page === "inicio" ? "selected" : ""}
            onClick={() => setPage("inicio")}
          >
            <LayoutDashboard size={19} /> Inicio
          </button>
          <button
            className={page === "tickets" ? "selected" : ""}
            onClick={() => setPage("tickets")}
          >
            <Ticket size={19} /> Mis tickets
          </button>
          <button
            className={page === "nuevo" ? "selected" : ""}
            onClick={() => setPage("nuevo")}
          >
            <PlusCircle size={19} /> Nueva solicitud
          </button>
        </nav>
      </aside>

      <main className="client-main">
        <header className="client-header">
          <div>
            <span>PLATAFORMA DE ATENCIÓN</span>
            <h1>Hola, {user?.full_name || "Cliente"}</h1>
            <p>Consulta y administra tus solicitudes de soporte.</p>
          </div>
          <button onClick={loadTickets} disabled={loading}>
            <RefreshCw size={17} /> Actualizar
          </button>
        </header>

        {notice && (
          <p className="client-warning" role="status">{notice}</p>
        )}

        {page === "inicio" && (
          <>
            <section className="client-summary">
              <div>
                <Ticket />
                <strong>{loading ? "—" : tickets.length}</strong>
                <span>Total de solicitudes</span>
              </div>
              <div>
                <Clock3 />
                <strong>{loading ? "—" : active}</strong>
                <span>En atención</span>
              </div>
              <div>
                <CheckCircle2 />
                <strong>{loading ? "—" : resolved}</strong>
                <span>Resueltas o cerradas</span>
              </div>
            </section>

            <section className="client-panel">
              <div className="client-section-heading">
                <h2>Mis solicitudes</h2>
                <button onClick={() => setPage("tickets")}>
                  Ver todas
                </button>
              </div>
              {renderTickets()}
            </section>
          </>
        )}

        {page === "tickets" && (
          <section className="client-panel">
            <div className="client-section-heading">
              <h2>Mis tickets de soporte</h2>
            </div>
            {renderTickets()}
          </section>
        )}

        {page === "nuevo" && (
          <section className="client-panel">
            <TicketForm />
            <div className="client-warning">
              <AlertCircle size={18} />
              La vista previa funciona. El envío definitivo
              requiere la nueva API de Miguel para guardar
              área, imágenes y evidencias.
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
