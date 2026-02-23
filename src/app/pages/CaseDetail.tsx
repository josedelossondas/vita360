import { useParams, Link } from 'react-router';
import { ArrowLeft, CheckCircle, Clock, AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';
import { mockCases } from '../data/mockData';

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const caso = mockCases.find(c => c.id === id);

  if (!caso) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="text-gray-600">Caso no encontrado</div>
        <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  const slaPercentage = (caso.slaRemaining / caso.slaTotal) * 100;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver al Dashboard</span>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">{caso.title}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{caso.id}</span>
              <span className={`px-2.5 py-1 text-xs rounded-full ${
                caso.status === 'abierto' ? 'bg-blue-100 text-blue-700' :
                caso.status === 'en-proceso' ? 'bg-yellow-100 text-yellow-700' :
                caso.status === 'resuelto' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {caso.status === 'abierto' ? 'Abierto' :
                 caso.status === 'en-proceso' ? 'En proceso' :
                 caso.status === 'resuelto' ? 'Resuelto' : 'Cerrado'}
              </span>
              {caso.isRecurring && (
                <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                  Reincidencia detectada
                </span>
              )}
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: '#1F3A8A' }}>
            Generar Orden de Trabajo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="col-span-2 space-y-6">
          {/* Información completa */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Información del Caso</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-gray-600 mb-1">Tipo de caso</div>
                <div className="text-sm text-gray-900">{caso.type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Área asignada</div>
                <div className="text-sm text-gray-900">{caso.area}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Reportado por</div>
                <div className="text-sm text-gray-900">{caso.reportedBy}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Ubicación</div>
                <div className="text-sm text-gray-900">{caso.location}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">Fecha de reporte</div>
                <div className="text-sm text-gray-900">
                  {new Date(caso.createdAt).toLocaleString('es-CL')}
                </div>
              </div>
              {caso.assignedTo && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">Asignado a</div>
                  <div className="text-sm text-gray-900">{caso.assignedTo}</div>
                </div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray-600 mb-2">Descripción</div>
              <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {caso.description}
              </div>
            </div>
          </div>

          {/* Análisis IA */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1F3A8A' }}>
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-gray-900">Análisis Automático IA</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-600 mb-2">Clasificación</div>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-gray-900">
                  {caso.aiClassification}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-2">Severidad calculada por IA</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${caso.urgencyAI}%`,
                        backgroundColor:
                          caso.urgencyAI >= 80 ? '#DC2626' :
                          caso.urgencyAI >= 60 ? '#F59E0B' : '#16A34A'
                      }}
                    />
                  </div>
                  <span className={`text-sm ${
                    caso.urgencyAI >= 80 ? 'text-red-700' :
                    caso.urgencyAI >= 60 ? 'text-yellow-700' : 'text-green-700'
                  }`}>
                    {caso.urgencyAI}/100
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-2">Razón de prioridad</div>
                <div className="text-sm text-gray-700">{caso.aiPriority}</div>
              </div>

              <div>
                <div className="text-xs text-gray-600 mb-2">Recomendación de acción</div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-gray-700">
                  {caso.aiSuggestion}
                </div>
              </div>
            </div>
          </div>

          {/* Línea de tiempo */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Historial de Interacciones</h3>
            
            <div className="relative">
              {caso.timeline?.map((event, index) => (
                <div key={index} className="relative pb-6 last:pb-0">
                  <div className="flex gap-4">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        event.status === 'Resuelto' ? 'bg-green-100' :
                        event.status.includes('IA') ? 'bg-blue-100' :
                        'bg-gray-100'
                      }`}>
                        <CheckCircle className={`w-4 h-4 ${
                          event.status === 'Resuelto' ? 'text-green-600' :
                          event.status.includes('IA') ? 'text-blue-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      {index < (caso.timeline?.length || 0) - 1 && (
                        <div className="absolute top-8 bottom-0 w-px bg-gray-200" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-sm text-gray-900 mb-1">{event.status}</div>
                      <div className="text-xs text-gray-600 mb-1">
                        {new Date(event.date).toLocaleString('es-CL')}
                      </div>
                      <div className="text-xs text-gray-500">Por: {event.user}</div>
                      {event.note && (
                        <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                          {event.note}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adjuntos */}
          {caso.attachments && caso.attachments.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-gray-900 mb-4">Adjuntos</h3>
              <div className="grid grid-cols-2 gap-4">
                {caso.attachments.map((attachment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">{attachment}</div>
                        <div className="text-xs text-gray-500">Foto antes</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* SLA */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" style={{ color: '#1F3A8A' }} />
              <h3 className="text-gray-900">SLA Restante</h3>
            </div>

            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-2">
                <span className={`text-3xl ${
                  caso.slaRemaining < 12 ? 'text-red-700' :
                  caso.slaRemaining < 24 ? 'text-yellow-700' : 'text-gray-900'
                }`}>
                  {caso.slaRemaining}h
                </span>
                <span className="text-sm text-gray-500">/ {caso.slaTotal}h</span>
              </div>
              <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${slaPercentage}%`,
                    backgroundColor:
                      slaPercentage < 25 ? '#DC2626' :
                      slaPercentage < 50 ? '#F59E0B' : '#16A34A'
                  }}
                />
              </div>
            </div>

            {caso.slaRemaining < 12 && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">
                  Este caso está en riesgo de incumplir el SLA. Se requiere acción urgente.
                </div>
              </div>
            )}
          </div>

          {/* Trazabilidad */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Trazabilidad</h3>
            
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" style={{ color: '#16A34A' }} />
              <span className="text-sm" style={{ color: '#16A34A' }}>Trazabilidad completa</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-gray-700">Geolocalizado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-gray-700">Clasificado por IA</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-gray-700">Asignación registrada</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#16A34A' }} />
                <span className="text-gray-700">Historial completo</span>
              </div>
            </div>
          </div>

          {/* Coordenadas */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-gray-900 mb-4">Ubicación</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Dirección:</span>
                <div className="text-gray-900 mt-1">{caso.location}</div>
              </div>
              <div>
                <span className="text-gray-600">Coordenadas:</span>
                <div className="text-gray-900 mt-1 font-mono text-xs">
                  {caso.coordinates.lat}, {caso.coordinates.lng}
                </div>
              </div>
            </div>
            <button className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
              Ver en mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
