import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Users,
  Timer,
  MessageSquare,
  BarChart3,
  Headset,
  ArrowRight
} from "lucide-react";
import App from "../App";
import "./AdminPortal.css";

const NAVIGATION = [
  { id: "inicio", label: "Inicio", icon: LayoutDashboard },
  { id: "tickets", label: "Gestión de tickets", icon: Ticket },
  { id: "tecnicos", label: "Técnicos", icon: Users },
  { id: "sla", label: "Supervisión SLA", icon: Timer },
  { id: "feedback", label: "Retroalimentación", icon: MessageSquare },
  { id: "estadisticas", label: "Estadísticas", icon: BarChart3 }
];

export default function AdminPortal({ token, user }) {
  const [section, setSection] = useState("inicio");

  return (
    <div className="crm-admin">
      <aside className="crm-sidebar">
        <div className="crm-brand">
          <Headset size={28} />
          <div>
            <strong>ServiceDesk</strong>
            <span>Cloud CRM 2.0</span>
          </div>
        </div>

        <div className="crm-nav-title">ADMINISTRACIÓN</div>

        <nav aria-label="Navegación del administrador">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  "crm-nav-button " +
                  (section === item.id ? "active" : "")
                }
                onClick={() => setSection(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="crm-sidebar-footer">
          Grupo 2 · Cloud Computing
        </div>
      </aside>

      <div className="crm-workspace">
        <header className="crm-topbar">
          <div>
            <span className="crm-eyebrow">CENTRO DE CONTROL</span>
            <h2>Panel administrativo</h2>
          </div>

          <div className="crm-user-chip">
            <span className="crm-avatar">
              {(user?.full_name || "A").charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{user?.full_name || "Administrador"}</strong>
              <small>Supervisor del servicio</small>
            </div>
          </div>
        </header>

        <main className="crm-content">
          {section === "inicio" && (
            <>
              <div className="crm-welcome">
                <span>PLATAFORMA DE SOPORTE</span>
                <h1>Bienvenido al centro de control</h1>
                <p>
                  Administra la atención de clientes, supervisa
                  al equipo técnico y controla la calidad
                  del servicio desde un solo lugar.
                </p>
              </div>

              <div className="crm-cards">
                <button
                  className="crm-card"
                  onClick={() => setSection("tickets")}
                >
                  <Ticket size={26} />
                  <h3>Gestión de tickets</h3>
                  <p>
                    Consulta y administra los casos
                    registrados en el sistema.
                  </p>
                  <span>Acceder <ArrowRight size={16} /></span>
                </button>

                <button
                  className="crm-card"
                  onClick={() => setSection("tecnicos")}
                >
                  <Users size={26} />
                  <h3>Equipo técnico</h3>
                  <p>
                    Consulta los técnicos, sus áreas
                    y su carga de trabajo.
                  </p>
                  <span>Acceder <ArrowRight size={16} /></span>
                </button>

                <button
                  className="crm-card"
                  onClick={() => setSection("sla")}
                >
                  <Timer size={26} />
                  <h3>Supervisión SLA</h3>
                  <p>
                    Da seguimiento a los tiempos
                    de atención y resolución.
                  </p>
                  <span>Acceder <ArrowRight size={16} /></span>
                </button>

                <button
                  className="crm-card"
                  onClick={() => setSection("feedback")}
                >
                  <MessageSquare size={26} />
                  <h3>Retroalimentación</h3>
                  <p>
                    Evalúa el desempeño y registra
                    observaciones para tus técnicos.
                  </p>
                  <span>Acceder <ArrowRight size={16} /></span>
                </button>
              </div>

              <div className="crm-info-panel">
                <BarChart3 size={24} />
                <div>
                  <h3>Estadísticas y gráficos de fallos</h3>
                  <p>
                    Esta sección utilizará información real
                    del backend cuando Miguel habilite
                    los nuevos reportes.
                  </p>
                </div>
                <button onClick={() => setSection("estadisticas")}>
                  Abrir estadísticas
                </button>
              </div>
            </>
          )}

          {section === "tickets" && (
            <div className="crm-legacy">
              <App token={token} user={user} />
            </div>
          )}

          {!["inicio", "tickets"].includes(section) && (
            <div className="crm-placeholder">
              <div className="crm-placeholder-icon">
                {(() => {
                  const item = NAVIGATION.find(
                    (nav) => nav.id === section
                  );
                  const Icon = item.icon;
                  return <Icon size={32} />;
                })()}
              </div>

              <h2>
                {NAVIGATION.find(
                  (item) => item.id === section
                )?.label}
              </h2>

              <p>
                Estamos preparando este módulo para
                conectarlo con las APIs reales del CRM.
              </p>

              <span>En desarrollo · ServiceDesk Cloud 2.0</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
