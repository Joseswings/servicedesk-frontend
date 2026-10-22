export default function TechnicianPortal({ user }) {
  return (
    <main style={{ padding: 32 }}>
      <h1>Panel del Técnico</h1>
      <p>Bienvenido, {user.full_name}</p>
      <p>Aquí aparecerán tus tickets asignados y SLA.</p>
    </main>
  );
}
