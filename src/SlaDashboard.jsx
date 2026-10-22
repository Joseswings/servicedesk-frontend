
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const periods = [
  { value: "all", label: "Todo el historial" },
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "custom", label: "Rango personalizado" },
];

const alertNames = {
  response_warning: "Respuesta próxima a vencer",
  response_breached: "Respuesta vencida",
  resolution_warning: "Resolución próxima a vencer",
  resolution_breached: "Resolución vencida",
};

function compliance(value) {
  return value == null ? "Sin datos" : `${value}%`;
}

export default function SlaDashboard({ token }) {
  const [period, setPeriod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [query, setQuery] = useState({
    period: "all",
    revision: 0,
  });

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMetrics() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("period", query.period);

      if (query.period === "custom") {
        params.set("from_date", query.fromDate);
        params.set("to_date", query.toDate);
      }

      try {
        const response = await fetch(
          `/api/sla/metrics?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            typeof data.detail === "string"
              ? data.detail
              : `Error HTTP ${response.status}`
          );
        }

        if (!controller.signal.aborted) {
          setMetrics(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMetrics();

    return () => controller.abort();
  }, [token, query]);

  function consultPeriod(event) {
    event.preventDefault();
    setError("");

    if (period === "custom") {
      if (!fromDate || !toDate) {
        setError("Selecciona ambas fechas.");
        return;
      }

      if (fromDate > toDate) {
        setError("La fecha inicial no puede superar la final.");
        return;
      }
    }

    setQuery((previous) => ({
      period,
      fromDate,
      toDate,
      revision: previous.revision + 1,
    }));
  }

  const periodLabel =
    periods.find((item) => item.value === metrics?.period)
      ?.label || "Todo el historial";

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="panel-heading">
        <h2>
          <ShieldCheck size={22} />
          {" "}Monitoreo SLA
        </h2>
      </div>

      <form
        onSubmit={consultPeriod}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <label htmlFor="sla-period">
          Período de consulta
        </label>

        <select
          id="sla-period"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
        >
          {periods.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        {period === "custom" && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <label htmlFor="sla-from">Desde</label>
              <input
                id="sla-from"
                type="date"
                required
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="sla-to">Hasta</label>
              <input
                id="sla-to"
                type="date"
                required
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
              />
            </div>
          </div>
        )}

        <button
          className="primary"
          type="submit"
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Consultando..." : "Consultar período"}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {loading && <p>Actualizando métricas SLA...</p>}

      {metrics && (
        <>
          <h3>Resultados históricos</h3>

          <p>
            Período consultado: <strong>{periodLabel}</strong>
          </p>

          {metrics.from_date && metrics.to_date && (
            <p>
              Desde {metrics.from_date} hasta {metrics.to_date}
            </p>
          )}

          <p>
            Tickets creados en el período:{" "}
            <strong>{metrics.total_tickets}</strong>
          </p>

          <div className="metrics">
            <div className="metric success">
              <CheckCircle2 />
              <span>SLA primera respuesta</span>
              <strong>
                {compliance(
                  metrics.response_sla.compliance_percent
                )}
              </strong>
              <small>
                {metrics.response_sla.met} de{" "}
                {metrics.response_sla.evaluated} evaluados
              </small>
            </div>

            <div className="metric success">
              <ShieldCheck />
              <span>SLA resolución</span>
              <strong>
                {compliance(
                  metrics.resolution_sla.compliance_percent
                )}
              </strong>
              <small>
                {metrics.resolution_sla.met} de{" "}
                {metrics.resolution_sla.evaluated} evaluados
              </small>
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>
            Monitoreo actual — Todos los tickets
          </h3>

          <p>
            Estos indicadores son globales y no dependen
            del filtro histórico.
          </p>

          <div className="metrics">
            <div className="metric">
            </div>

            <div className="metric danger">
              <AlertTriangle />
              <span>Incumplimientos activos</span>
              <strong>{metrics.active_breaches}</strong>
            </div>
          </div>

          <h3 style={{ marginTop: 24 }}>
            Alertas SLA activas
          </h3>

          {metrics.alerts.length === 0 ? (
            <p>No existen alertas SLA activas.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Prioridad</th>
                    <th>Alerta</th>
                    <th>Minutos restantes</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.alerts.map((alert, index) => (
                    <tr
                      key={`${alert.ticket_id}-${alert.type}-${index}`}
                    >
                      <td>#{alert.ticket_id}</td>
                      <td>{alert.priority}</td>
                      <td>
                        {alertNames[alert.type] || alert.type}
                      </td>
                      <td>{alert.minutes_remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </section>
  );
}

