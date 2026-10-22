import App from "./App";
import ClientPortal from "./portals/ClientPortal";
import TechnicianPortal from "./portals/TechnicianPortal";
import AdminPortal from "./portals/AdminPortal";

export default function RoleRouter({ token, user }) {
  if (!user || !token) {
    return <p>Sesión no disponible.</p>;
  }

  switch (user.role) {
    case "client":
      return <ClientPortal token={token} user={user} />;

    case "technician":
      return <TechnicianPortal token={token} user={user} />;

    case "admin":
      return <AdminPortal token={token} user={user} />;

    default:
      return <p>Tu cuenta no tiene un rol autorizado.</p>;
  }
}
