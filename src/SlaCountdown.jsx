import { useEffect, useState } from "react";

export default function SlaCountdown({ ticket }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (["resolved", "closed"].includes(ticket.status)) return null;

  const needsResponse = !ticket.first_response_at;
  const deadline = needsResponse
    ? ticket.response_due_at
    : ticket.resolution_due_at;

  if (!deadline) return null;

  const end = new Date(deadline).getTime();
  const created = new Date(ticket.created_at).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(created)) return null;

  const remaining = end - now;
  const warning = (end - created) * 0.2;
  const elapsedSeconds = Math.floor(Math.abs(remaining) / 1000);
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const clock = [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");

  const color = remaining <= 0
    ? "#dc2626"
    : remaining <= warning
      ? "#d97706"
      : "#15803d";

  return (
    <div style={{ marginTop: 6, color, fontSize: 12 }}>
      <strong>{remaining < 0 ? "+" : ""}{clock}</strong>
      <div>
        {remaining <= 0
          ? "Tiempo vencido"
          : remaining <= warning
            ? "Próximo a vencer"
            : "Tiempo restante"}
      </div>
      <small>{needsResponse ? "Primera respuesta" : "Resolución"}</small>
    </div>
  );
}
