
import getpass
import json
import urllib.request
import urllib.error

BASE = "http://127.0.0.1"

def request(path, method="GET", payload=None, token=None):
    headers = {"Accept": "application/json"}

    if payload is not None:
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    data = (
        json.dumps(payload).encode("utf-8")
        if payload is not None
        else None
    )

    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers=headers,
        method=method
    )

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return response.status, json.load(response)

    except urllib.error.HTTPError as error:
        return error.code, None

    except urllib.error.URLError as error:
        print("Error de conexión:", error.reason)
        return 0, None


print("=== DIAGNÓSTICO DE API - SERVICEDESK CLOUD ===")

email = input("Correo del técnico: ").strip()
password = getpass.getpass("Contraseña: ")

status, login = request(
    "/api/auth/login",
    "POST",
    {"email": email, "password": password}
)

password = None

print("Login HTTP:", status)

if status != 200 or not isinstance(login, dict):
    raise SystemExit("No fue posible iniciar sesión.")

token = login.get("access_token")

if not token:
    raise SystemExit("La API no devolvió un token válido.")

status, profile = request(
    "/api/auth/me",
    token=token
)

print("Perfil HTTP:", status)

if status != 200 or not isinstance(profile, dict):
    raise SystemExit("No se pudo consultar el perfil.")

print("Usuario:", profile.get("full_name"))
print("Rol:", profile.get("role"))
print("ID:", profile.get("id"))

if profile.get("role") != "technician":
    raise SystemExit("La cuenta no corresponde a un técnico.")

status, tickets = request(
    "/api/tickets",
    token=token
)

print("GET /api/tickets HTTP:", status)

if not isinstance(tickets, list):
    raise SystemExit("La API no devolvió una lista de tickets.")

print("Tickets recibidos:", len(tickets))

assigned = [
    ticket for ticket in tickets
    if str(ticket.get("assigned_to")) == str(profile.get("id"))
]

print("Tickets asignados al técnico:", len(assigned))

other = [
    ticket for ticket in tickets
    if str(ticket.get("assigned_to")) != str(profile.get("id"))
]

print("Tickets de otros técnicos o sin asignar:", len(other))

for ticket in assigned[:5]:
    print({
        "id": ticket.get("id"),
        "status": ticket.get("status"),
        "priority": ticket.get("priority"),
        "assigned_to": ticket.get("assigned_to"),
        "has_sla_dates": bool(
            ticket.get("response_due_at")
            or ticket.get("resolution_due_at")
        )
    })

print("=== DIAGNÓSTICO TERMINADO ===")
