import { useState } from "react";

const AREAS = [
  { value: "redes", label: "Redes y conectividad" },
  { value: "software", label: "Software y aplicaciones" },
  { value: "hardware", label: "Hardware y equipos" },
  { value: "otros", label: "Otros problemas" }
];

export default function TicketForm({ onSubmitTicket }) {
  const [area, setArea] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);

  const lines = description
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .length;

  const validEvidence = images.length > 0 || lines >= 60;

  function handleImages(event) {
    const selected = Array.from(event.target.files || []);

    if (selected.length > 5) {
      setError("Puedes adjuntar un máximo de 5 imágenes.");
      setImages([]);
      event.target.value = "";
      return;
    }

    const valid = selected.every(file =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      && file.size <= 5 * 1024 * 1024
    );

    if (!valid) {
      setError("Solo se permiten JPG, PNG o WEBP de máximo 5 MB.");
      setImages([]);
      event.target.value = "";
      return;
    }

    setImages(selected);
    setError("");
    setPreview(false);
  }

  function validate() {
    if (!area) return "Selecciona el área del problema.";
    if (title.trim().length < 10)
      return "El título debe tener al menos 10 caracteres.";
    if (!validEvidence)
      return "Adjunta una imagen o escribe al menos 60 líneas de descripción.";
    return "";
  }

  function showPreview(event) {
    event.preventDefault();
    const problem = validate();

    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setPreview(true);
  }

  async function sendTicket() {
    if (typeof onSubmitTicket !== "function") {
      setError("El envío aún no está conectado al servidor.");
      return;
    }

    setSending(true);
    setError("");

    try {
      await onSubmitTicket({
        area,
        title: title.trim(),
        description: description.trim(),
        images
      });

      setArea("");
      setTitle("");
      setDescription("");
      setImages([]);
      setPreview(false);
    } catch (err) {
      setError(err.message || "No se pudo enviar el ticket.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="ticket-form-container">
      <header>
        <h2>Nuevo ticket de soporte</h2>
        <p>Describe tu problema para recibir atención especializada.</p>
      </header>

      <form onSubmit={showPreview}>
        <label htmlFor="ticket-area">Área del problema</label>
        <select
          id="ticket-area"
          value={area}
          onChange={e => {
            setArea(e.target.value);
            setPreview(false);
          }}
          required
        >
          <option value="">Selecciona un área</option>
          {AREAS.map(item => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label htmlFor="ticket-title">Título</label>
        <input
          id="ticket-title"
          value={title}
          onChange={e => {
            setTitle(e.target.value);
            setPreview(false);
          }}
          placeholder="Ej. Mi computadora no tiene conexión a Internet"
          maxLength={150}
          required
        />

        <label htmlFor="ticket-description">
          Descripción detallada
        </label>
        <textarea
          id="ticket-description"
          rows={9}
          value={description}
          onChange={e => {
            setDescription(e.target.value);
            setPreview(false);
          }}
          placeholder="Explica qué ocurre, desde cuándo, qué intentaste y cómo afecta tu trabajo."
        />

        <p>
          Líneas de descripción: <strong>{lines} / 60</strong>
        </p>

        <label htmlFor="ticket-images">
          Imágenes de evidencia (máximo 5)
        </label>
        <input
          id="ticket-images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImages}
        />

        <p>
          Imágenes seleccionadas: <strong>{images.length}</strong>
        </p>

        <p>
          Evidencia: <strong>
            {validEvidence ? "Requisito cumplido" : "Pendiente"}
          </strong>
        </p>

        {error && <p role="alert" className="auth-error">{error}</p>}

        <button type="submit">Revisar ticket</button>
      </form>

      {preview && (
        <div className="ticket-preview">
          <h3>Vista previa del ticket</h3>
          <p><strong>Área:</strong> {area}</p>
          <p><strong>Título:</strong> {title}</p>
          <p><strong>Imágenes:</strong> {images.length}</p>
          <p><strong>Líneas:</strong> {lines}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{description}</p>

          <p><strong>Esta vista previa no está guardada.</strong></p>

          <button
            type="button"
            disabled={sending || !onSubmitTicket}
            onClick={sendTicket}
          >
            {sending ? "Enviando..." : "Enviar ticket"}
          </button>
        </div>
      )}
    </section>
  );
}
