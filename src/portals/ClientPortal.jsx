import TicketForm from "../components/TicketForm";

export default function ClientPortal({ user }) {
  return (
    <main className="client-portal" style={{
      maxWidth: "920px",
      margin: "30px auto",
      padding: "24px"
    }}>
      <header>
        <h1>Portal del Cliente</h1>
        <p>Bienvenido, {user.full_name}</p>
        <p>
          Desde aquí podrás registrar problemas,
          consultar tus solicitudes y dar seguimiento
          a su resolución.
        </p>
      </header>

      <hr />

      <TicketForm />

      <p style={{ marginTop: "24px", opacity: 0.8 }}>
        El envío definitivo estará disponible cuando
        se integre la API de tickets del cliente.
      </p>
    </main>
  );
}
