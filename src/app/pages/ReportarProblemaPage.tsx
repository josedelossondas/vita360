import { useState, useRef } from 'react';
import { Camera, Upload, X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { apiTickets, apiEvidence, imageToBase64, compressImage } from '../services/api';

export default function ReportarProblemaPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaName, setAreaName] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('media');
  const [photos, setPhotos] = useState<Array<{ file: File; preview: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocation, setGeolocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Obtener geolocalización
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

  // Capturar foto con cámara
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addPhoto(file);
    }
  };

  // Seleccionar foto de galería
  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await addPhoto(file);
    }
  };

  // Agregar foto (con compresión)
  const addPhoto = async (file: File) => {
    try {
      const base64 = await imageToBase64(file);
      const compressed = await compressImage(base64);

      const preview = compressed;
      setPhotos((prev) => [...prev, { file, preview }]);
      setError(null);
    } catch (err) {
      setError('Error al procesar la imagen');
    }
  };

  // Remover foto
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Enviar reporte
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Crear ticket
      const ticket = await apiTickets.create({
        title,
        description,
        area_name: areaName,
        urgency_level: urgencyLevel,
        priority_score: urgencyLevel === 'critica' ? 80 : urgencyLevel === 'alta' ? 60 : 40,
        latitude: geolocation?.latitude,
        longitude: geolocation?.longitude,
      });

      // Subir fotos
      for (const photo of photos) {
        const base64 = photo.preview;
        await apiEvidence.upload(ticket.id, base64, `Foto del problema: ${title}`);
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setAreaName('');
      setPhotos([]);
      setUrgencyLevel('media');

      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar reporte');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-[#E6EAF0] px-6 py-6 sticky top-0 z-10">
        <h1 className="text-[24px] font-semibold text-[#2F3A46]">Reportar Problema</h1>
        <p className="text-[14px] text-[#6D7783] mt-1">
          Comparte los detalles y fotos de tu problema urbano
        </p>
      </div>

      {/* Mensajes */}
      {success && (
        <div className="mx-6 mt-4 p-4 bg-[#48946F]/10 border border-[#48946F] rounded-lg flex gap-3">
          <CheckCircle size={20} className="text-[#48946F] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[#48946F]">¡Reporte enviado!</p>
            <p className="text-[13px] text-[#48946F]/80">
              Tu reporte ha sido registrado. Los operarios lo revisarán pronto.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-4 p-4 bg-[#DA4F44]/10 border border-[#DA4F44] rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-[#DA4F44] flex-shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#DA4F44]">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {/* Localización */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4">
          <button
            type="button"
            onClick={getLocation}
            className="w-full px-4 py-3 bg-[#306CBB]/10 border border-[#306CBB]/30 text-[#306CBB] rounded-lg font-medium text-[14px] hover:bg-[#306CBB]/20 transition-colors"
          >
            📍 {geolocation ? `Ubicación guardada (${geolocation.latitude.toFixed(4)}, ${geolocation.longitude.toFixed(4)})` : 'Usar mi ubicación'}
          </button>
        </div>

        {/* Título */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 space-y-2">
          <label className="block text-[13px] font-semibold text-[#2F3A46]">
            ¿Cuál es el problema? *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Bache en la calle, árbol caído, etc."
            className="w-full px-4 py-3 border border-[#E6EAF0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#306CBB]/30"
            required
          />
        </div>

        {/* Descripción */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 space-y-2">
          <label className="block text-[13px] font-semibold text-[#2F3A46]">
            Detalles del problema *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe con detalle lo que ves. Incluye cualquier información que pueda ser útil..."
            className="w-full px-4 py-3 border border-[#E6EAF0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#306CBB]/30 resize-none"
            rows={4}
            required
          />
        </div>

        {/* Área */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 space-y-2">
          <label className="block text-[13px] font-semibold text-[#2F3A46]">
            Área o categoría *
          </label>
          <select
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            className="w-full px-4 py-3 border border-[#E6EAF0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#306CBB]/30"
            required
          >
            <option value="">Selecciona una categoría</option>
            <option value="Espacios Públicos">Espacios Públicos (árboles, parques)</option>
            <option value="Obras Públicas">Obras Públicas (calles, aceras)</option>
            <option value="Tránsito">Tránsito (señales, semáforos)</option>
            <option value="Higiene Urbana">Higiene Urbana (basura, limpieza)</option>
            <option value="Alumbrado">Alumbrado Público</option>
            <option value="Atención Ciudadana">Atención Ciudadana (consultas generales)</option>
          </select>
        </div>

        {/* Urgencia */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 space-y-2">
          <label className="block text-[13px] font-semibold text-[#2F3A46]">
            ¿Qué tan urgente es? *
          </label>
          <div className="space-y-2">
            {[
              { value: 'media', label: '🟡 Media - Puede esperar algunos días', color: 'bg-[#F2A23A]' },
              { value: 'alta', label: '🟠 Alta - Necesita atención pronto', color: 'bg-[#F2B23A]' },
              { value: 'critica', label: '🔴 Crítica - Peligro inmediato', color: 'bg-[#DA4F44]' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 p-3 border border-[#E6EAF0] rounded-lg cursor-pointer hover:bg-[#F5F7FA] transition-colors">
                <input
                  type="radio"
                  name="urgency"
                  value={opt.value}
                  checked={urgencyLevel === opt.value}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-[14px] font-medium text-[#2F3A46]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fotos */}
        <div className="bg-white border border-[#E6EAF0] rounded-lg p-4 space-y-4">
          <label className="block text-[13px] font-semibold text-[#2F3A46]">
            Agregar fotos (opcional pero recomendado)
          </label>

          {/* Botones de captura */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#306CBB]/10 border border-[#306CBB]/30 text-[#306CBB] rounded-lg font-medium text-[14px] hover:bg-[#306CBB]/20 transition-colors"
            >
              <Camera size={18} />
              <span className="hidden sm:inline">Tomar foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#306CBB]/10 border border-[#306CBB]/30 text-[#306CBB] rounded-lg font-medium text-[14px] hover:bg-[#306CBB]/20 transition-colors"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">De galería</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleGallerySelect}
            className="hidden"
          />

          {/* Galería de fotos */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[12px] text-[#6D7783]">
            {photos.length === 0
              ? 'Tomar fotos ayuda a los operarios a entender mejor el problema'
              : `${photos.length} foto${photos.length !== 1 ? 's' : ''} agregada${photos.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!title || !description || !areaName || isLoading}
          className="w-full px-6 py-4 bg-[#306CBB] text-white font-semibold rounded-lg hover:bg-[#2555a0] disabled:bg-[#ccc] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <span>✓ Enviar Reporte</span>
            </>
          )}
        </button>

        <p className="text-center text-[12px] text-[#6D7783]">
          Tu reporte será revisado por los operarios de la municipalidad
        </p>
      </form>
    </div>
  );
}
