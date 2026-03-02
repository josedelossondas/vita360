import { useState, useEffect, useRef } from 'react';
import { useAuth, API_URL } from '../../context/AuthContext';
import { PlusCircle, RefreshCw, CheckCircle2, Clock, AlertTriangle, Mic } from 'lucide-react';

interface Evidence {
  image_url: string;
  description: string;
  created_at: string;
}

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: string;
  urgency_level: string;
  area_name: string;
  assigned_to: string | null;
  planned_date: string;
  created_at: string;
  evidences: Evidence[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Recibido: 'bg-blue-50 text-blue-700 border border-blue-200',
    Asignado: 'bg-purple-50 text-purple-700 border border-purple-200',
    'En Gestión': 'bg-amber-50 text-amber-700 border border-amber-200',
    Resuelto: 'bg-green-50 text-green-700 border border-green-200',
    Cerrado: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function UrgencyBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    Alta: 'bg-red-50 text-red-700 border border-red-200',
    Media: 'bg-amber-50 text-amber-700 border border-amber-200',
    Baja: 'bg-green-50 text-green-700 border border-green-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11.5px] font-medium ${map[level] || 'bg-gray-100 text-gray-600'}`}>
      {level}
    </span>
  );
}

export default function CiudadanoPage() {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const fetchTickets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTickets(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchTickets(); }, [token]);

  const getLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => console.log('Geolocation error:', err)
      );
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      alert('Sesión no lista aún. Intenta nuevamente.');
      return;
    }
    if (!description.trim()) {
      alert('Por favor describe el problema');
      return;
    }
    setSubmitting(true);
    try {
      const problem = description.trim();
      const titleFromProblem =
        problem.length > 80 ? `${problem.slice(0, 77)}...` : (problem || 'Reporte ciudadano');

      const res = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: titleFromProblem, description: problem, image_url: photoDataUrl || null }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccessMsg(`Ticket #${data.ticket_id} enviado · Área: ${data.area} · Prioridad: ${data.priority}`);
        setDescription('');
        setPhotoDataUrl('');
        setShowForm(false);
        fetchTickets();
        // Limpiar mensaje después de 5 segundos
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        alert(`Error: ${data.detail || data.message || 'Error al enviar ticket'}`);
        console.error('Error response:', data);
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Solo imágenes');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const stepFlow = ['Recibido', 'Asignado', 'En Gestión', 'Resuelto'];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Mis Solicitudes</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Hola, <span className="font-medium">{user?.name}</span> — sigue el estado de tus reportes ciudadanos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTickets} disabled={loading}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors">
            <PlusCircle className="w-4 h-4" />
            Nueva solicitud
          </button>
        </div>
      </div>

      {/* Success msg */}
      {successMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-[13px] text-green-800">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          {successMsg}
          <button onClick={() => setSuccessMsg('')} className="ml-auto text-green-600 hover:text-green-800 text-lg leading-none">×</button>
        </div>
      )}

      {/* Form nueva solicitud */}
      {showForm && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 mb-5">
          <h2 className="text-[14px] font-semibold mb-4">Nueva solicitud ciudadana</h2>
          <div className="space-y-4">
            {/* Ubicación */}
            <div className="bg-[#F9FAFB] border border-border rounded-lg p-3">
              <button
                type="button"
                onClick={getLocation}
                className="w-full px-3 py-2 bg-[#306CBB]/10 border border-[#306CBB]/30 text-[#306CBB] rounded-lg font-medium text-[13px] hover:bg-[#306CBB]/20 transition-colors"
              >
                📍 {geolocation ? `Ubicación guardada (${geolocation.latitude.toFixed(4)}, ${geolocation.longitude.toFixed(4)})` : 'Usar mi ubicación'}
              </button>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                La ubicación se utiliza como referencia aproximada del problema.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[12px] text-muted-foreground font-medium">¿Cuál es el problema?</label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-2 py-1 border border-border rounded-full text-[11px] text-muted-foreground bg-background"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Voz
                </button>
              </div>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describa el problema con el mayor detalle posible. Mencione la dirección exacta y el tipo de problema (árbol, basura, vereda, bache, luz, agua, etc.)"
                rows={4}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-[13px] outline-none focus:border-primary resize-none" />
              <p className="text-[11px] text-muted-foreground mt-1">
                💡 El sistema clasificará automáticamente su solicitud según las palabras clave del problema
              </p>
            </div>

            {/* Foto (máx 1) */}
            <div>
              <label className="block text-[12px] text-muted-foreground mb-1.5 font-medium">Foto (opcional, máx 1)</label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoPick}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoPick}
                />
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-2 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Cámara
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="px-3 py-2 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Galería
                </button>
                {photoDataUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl('')}
                    className="px-3 py-2 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {photoDataUrl && (
                <div className="mt-3">
                  <img
                    src={photoDataUrl}
                    alt="Foto adjunta"
                    className="w-full max-w-[360px] rounded-lg border border-border"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">Se guarda en el ticket como evidencia (máx 1).</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-[13px] text-muted-foreground hover:bg-secondary transition-colors">
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={submitting || !description.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                {submitting ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTicket ? (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setSelectedTicket(null)}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-[12.5px] text-muted-foreground hover:bg-secondary transition-colors"
          >
            ← Volver a mis solicitudes
          </button>
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5">
              <div>
              <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11.5px] text-muted-foreground font-mono">#{selectedTicket.id}</span>
                  <StatusBadge status={selectedTicket.status} />
                  {selectedTicket.urgency_level && <UrgencyBadge level={selectedTicket.urgency_level} />}
                  {selectedTicket.area_name && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-muted-foreground border border-border">
                      {selectedTicket.area_name}
                    </span>
                  )}
                </div>
                <h2 className="text-[13.5px] font-medium text-foreground mt-1.5">
                  {selectedTicket.description || selectedTicket.title}
                </h2>
              </div>

              {/* Timeline del estado */}
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2.5">Estado del proceso</div>
                <div className="space-y-2">
                  {stepFlow.map((step, i) => {
                    const currentIdx = stepFlow.indexOf(selectedTicket.status);
                    const done = i <= currentIdx;
                    const active = i === currentIdx;
                    return (
                      <div key={step} className={`flex items-center gap-2.5 p-2 rounded-lg ${active ? 'bg-primary/5' : ''}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                          done ? 'bg-green-500' : 'bg-border'
                        }`}>
                          {done ? (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-white/50" />
                          )}
                        </div>
                        <span className={`text-[12.5px] ${done ? (active ? 'text-primary font-semibold' : 'text-green-700 font-medium') : 'text-muted-foreground'}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Detalles</div>
                {selectedTicket.area_name && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">Área asignada</span>
                    <span className="font-medium">{selectedTicket.area_name}</span>
                  </div>
                )}
                {selectedTicket.assigned_to && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">Equipo</span>
                    <span className="font-medium">{selectedTicket.assigned_to}</span>
                  </div>
                )}
                {selectedTicket.urgency_level && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">Urgencia</span>
                    <UrgencyBadge level={selectedTicket.urgency_level} />
                  </div>
                )}
                {selectedTicket.planned_date && (
                  <div className="flex justify-between text-[12.5px]">
                    <span className="text-muted-foreground">Fecha planificada</span>
                    <span>{new Date(selectedTicket.planned_date).toLocaleDateString('es-CL')}</span>
                  </div>
                )}
              </div>

              {/* Foto (máx 1) */}
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-2.5">Foto adjunta</div>
                {selectedTicket.evidences?.[0]?.image_url ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <img
                      src={selectedTicket.evidences[0].image_url}
                      alt="Evidencia"
                      className="w-full object-cover max-h-56"
                    />
                    {selectedTicket.evidences[0].description && (
                      <div className="px-3 py-2 text-[12px] text-muted-foreground">
                        {selectedTicket.evidences[0].description}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[13px] text-muted-foreground">Sin foto</div>
                )}
              </div>
            </div>
        </div>
      ) : (
        <div className="space-y-3">
          {loading && tickets.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-[13px]">
              Cargando solicitudes...
            </div>
          )}
          {!loading && tickets.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-[13px] text-muted-foreground">No has enviado solicitudes aún</p>
              <button onClick={() => setShowForm(true)} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium">
                Crear primera solicitud
              </button>
            </div>
          )}
          {tickets.map(ticket => (
            <button key={ticket.id} onClick={() => setSelectedTicket(ticket)}
              className={`w-full text-left bg-white rounded-xl border shadow-sm p-4 hover:border-primary/50 transition-colors ${
                selectedTicket?.id === ticket.id ? 'border-primary' : 'border-border'
              }`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-muted-foreground font-mono">#{ticket.id}</span>
                  <StatusBadge status={ticket.status} />
                  {ticket.urgency_level && <UrgencyBadge level={ticket.urgency_level} />}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString('es-CL')}
                </span>
              </div>
              <h3 className="text-[13.5px] font-medium text-foreground mb-1">{ticket.title}</h3>
              <p className="text-[12px] text-muted-foreground line-clamp-2">{ticket.description}</p>
              <div className="mt-2.5 flex items-center gap-3 text-[11.5px] text-muted-foreground">
                {ticket.area_name && <span>{ticket.area_name}</span>}
                {ticket.assigned_to && <span>👷 {ticket.assigned_to}</span>}
                {ticket.evidences?.length > 0 && <span>📎 {ticket.evidences.length} foto(s)</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
