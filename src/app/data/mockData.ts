export interface Case {
  id: string;
  type: string;
  typeIcon: string;
  urgency: 'alta' | 'media' | 'baja';
  urgencyAI: number;
  area: string;
  slaRemaining: number;
  slaTotal: number;
  status: 'abierto' | 'en-proceso' | 'resuelto' | 'cerrado';
  title: string;
  description: string;
  reportedBy: string;
  location: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  isRecurring?: boolean;
  aiClassification?: string;
  aiPriority?: string;
  aiSuggestion?: string;
  attachments?: string[];
  timeline?: Array<{
    status: string;
    date: string;
    user: string;
    note?: string;
  }>;
}

export interface WorkOrder {
  id: string;
  caseId: string;
  asset: string;
  crew: string;
  status: 'pendiente' | 'en-progreso' | 'completada' | 'cancelada';
  slaTechnical: number;
  priority: 'alta' | 'media' | 'baja';
  createdAt: string;
  scheduledFor?: string;
  completedAt?: string;
}

export const mockCases: Case[] = [
  {
    id: 'CASO-2026-0234',
    type: 'Vereda dañada',
    typeIcon: 'construction',
    urgency: 'alta',
    urgencyAI: 92,
    area: 'Infraestructura',
    slaRemaining: 8,
    slaTotal: 48,
    status: 'abierto',
    title: 'Vereda hundida con riesgo de caída',
    description: 'Vereda completamente hundida en la intersección. Alta circulación peatonal. Riesgo de accidentes.',
    reportedBy: 'María González',
    location: 'Av. Kennedy con Calle 15',
    coordinates: { lat: -33.4489, lng: -70.6693 },
    createdAt: '2026-02-23T08:30:00',
    isRecurring: true,
    aiClassification: 'Infraestructura crítica - Reincidencia detectada',
    aiPriority: 'Alta prioridad por frecuencia (4 reportes en 30 días) y ubicación de alta circulación',
    aiSuggestion: 'Inspección estructural inmediata. Priorizar reparación permanente sobre solución temporal.',
    attachments: ['vereda-antes.jpg'],
    timeline: [
      {
        status: 'Recibido',
        date: '2026-02-23T08:30:00',
        user: 'Sistema',
        note: 'Caso creado vía plataforma ciudadana'
      },
      {
        status: 'Clasificado por IA',
        date: '2026-02-23T08:31:00',
        user: 'IA Vita360',
        note: 'Severidad calculada: 92/100. Reincidencia detectada.'
      },
      {
        status: 'Asignado',
        date: '2026-02-23T09:00:00',
        user: 'Juan Pérez (Supervisor)',
        note: 'Asignado a área de Infraestructura'
      }
    ]
  },
  {
    id: 'CASO-2026-0235',
    type: 'Contenedor desborde',
    typeIcon: 'trash',
    urgency: 'media',
    urgencyAI: 68,
    area: 'Aseo',
    slaRemaining: 18,
    slaTotal: 24,
    status: 'en-proceso',
    title: 'Contenedor con desborde recurrente',
    description: 'Contenedor de basura desbordando hace 3 días. Olores y presencia de roedores.',
    reportedBy: 'Carlos Ramírez',
    location: 'Pasaje Los Olivos 234',
    coordinates: { lat: -33.4510, lng: -70.6650 },
    createdAt: '2026-02-22T14:20:00',
    assignedTo: 'Cuadrilla Aseo 3',
    isRecurring: true,
    aiClassification: 'Problema recurrente - Ajuste de frecuencia necesario',
    aiPriority: 'Media prioridad. Patrón de desborde cada 4-5 días detectado.',
    aiSuggestion: 'Aumentar frecuencia de recolección de 2 a 3 veces por semana en esta zona.',
    timeline: [
      {
        status: 'Recibido',
        date: '2026-02-22T14:20:00',
        user: 'Sistema'
      },
      {
        status: 'Asignado',
        date: '2026-02-22T15:00:00',
        user: 'Ana López'
      },
      {
        status: 'En proceso',
        date: '2026-02-23T07:00:00',
        user: 'Cuadrilla Aseo 3',
        note: 'Cuadrilla en camino'
      }
    ]
  },
  {
    id: 'CASO-2026-0236',
    type: 'Árbol en riesgo',
    typeIcon: 'tree',
    urgency: 'alta',
    urgencyAI: 88,
    area: 'Áreas Verdes',
    slaRemaining: 4,
    slaTotal: 24,
    status: 'abierto',
    title: 'Árbol inclinado con riesgo de caída',
    description: 'Árbol con inclinación severa hacia la calle. Riesgo de caída sobre vehículos y peatones.',
    reportedBy: 'Municipalidad (Inspección)',
    location: 'Plaza O\'Higgins, sector norte',
    coordinates: { lat: -33.4470, lng: -70.6720 },
    createdAt: '2026-02-23T06:00:00',
    aiClassification: 'Riesgo estructural inminente',
    aiPriority: 'Prioridad crítica. Intervención requerida en < 12 horas.',
    aiSuggestion: 'Acordonar área. Evaluación de especialista forestal. Considerar tala preventiva.',
    timeline: [
      {
        status: 'Detectado',
        date: '2026-02-23T06:00:00',
        user: 'Inspector Municipal',
        note: 'Detectado en ronda de inspección'
      },
      {
        status: 'Clasificado',
        date: '2026-02-23T06:15:00',
        user: 'IA Vita360',
        note: 'Riesgo estructural calculado: alto'
      }
    ]
  },
  {
    id: 'CASO-2026-0233',
    type: 'Iluminación',
    typeIcon: 'lightbulb',
    urgency: 'baja',
    urgencyAI: 34,
    area: 'Mantención',
    slaRemaining: 60,
    slaTotal: 72,
    status: 'resuelto',
    title: 'Luminaria pública sin funcionamiento',
    description: 'Poste de luz apagado en calle residencial',
    reportedBy: 'Pedro Soto',
    location: 'Calle Los Aromos 567',
    coordinates: { lat: -33.4500, lng: -70.6680 },
    createdAt: '2026-02-20T18:00:00',
    assignedTo: 'Cuadrilla Eléctrica 1',
    resolvedAt: '2026-02-22T10:30:00',
    aiClassification: 'Mantención rutinaria',
    aiPriority: 'Baja prioridad. No hay reportes de seguridad asociados.',
    timeline: [
      {
        status: 'Recibido',
        date: '2026-02-20T18:00:00',
        user: 'Sistema'
      },
      {
        status: 'Asignado',
        date: '2026-02-21T09:00:00',
        user: 'Supervisor Mantención'
      },
      {
        status: 'Resuelto',
        date: '2026-02-22T10:30:00',
        user: 'Cuadrilla Eléctrica 1',
        note: 'Lámpara reemplazada. Sistema verificado.'
      }
    ]
  },
  {
    id: 'CASO-2026-0237',
    type: 'Microbasural',
    typeIcon: 'alert-triangle',
    urgency: 'media',
    urgencyAI: 71,
    area: 'Aseo',
    slaRemaining: 32,
    slaTotal: 48,
    status: 'abierto',
    title: 'Microbasural detectado',
    description: 'Acumulación de escombros y basura en sitio eriazo',
    reportedBy: 'Vecinos sector',
    location: 'Sitio eriazo calle Las Acacias',
    coordinates: { lat: -33.4520, lng: -70.6640 },
    createdAt: '2026-02-22T11:00:00',
    aiClassification: 'Problema medioambiental localizado',
    aiPriority: 'Media. Requiere intervención coordinada con fiscalización.',
    aiSuggestion: 'Limpieza inmediata + fiscalización propietario + instalación señalética preventiva'
  },
  {
    id: 'CASO-2026-0238',
    type: 'Bache',
    typeIcon: 'construction',
    urgency: 'media',
    urgencyAI: 65,
    area: 'Infraestructura',
    slaRemaining: 28,
    slaTotal: 48,
    status: 'en-proceso',
    title: 'Bache de gran tamaño en calzada',
    description: 'Bache profundo en calle de alta circulación vehicular',
    reportedBy: 'Transporte Público',
    location: 'Av. Principal altura 2300',
    coordinates: { lat: -33.4460, lng: -70.6710 },
    createdAt: '2026-02-22T16:45:00',
    assignedTo: 'Cuadrilla Pavimentación 2',
    aiClassification: 'Infraestructura vial - Alta circulación',
    aiPriority: 'Media-Alta. Riesgo de daño vehicular.',
    timeline: [
      {
        status: 'Recibido',
        date: '2026-02-22T16:45:00',
        user: 'Sistema'
      },
      {
        status: 'En proceso',
        date: '2026-02-23T08:00:00',
        user: 'Cuadrilla Pavimentación 2',
        note: 'Materiales solicitados'
      }
    ]
  }
];

export const mockWorkOrders: WorkOrder[] = [
  {
    id: 'OT-2026-0445',
    caseId: 'CASO-2026-0234',
    asset: 'Vereda Av. Kennedy',
    crew: 'Cuadrilla Infraestructura 1',
    status: 'en-progreso',
    slaTechnical: 36,
    priority: 'alta',
    createdAt: '2026-02-23T09:30:00',
    scheduledFor: '2026-02-23T14:00:00'
  },
  {
    id: 'OT-2026-0446',
    caseId: 'CASO-2026-0236',
    asset: 'Árbol Plaza O\'Higgins',
    crew: 'Cuadrilla Áreas Verdes',
    status: 'pendiente',
    slaTechnical: 18,
    priority: 'alta',
    createdAt: '2026-02-23T06:30:00',
    scheduledFor: '2026-02-23T12:00:00'
  },
  {
    id: 'OT-2026-0447',
    caseId: 'CASO-2026-0235',
    asset: 'Contenedor Los Olivos',
    crew: 'Cuadrilla Aseo 3',
    status: 'en-progreso',
    slaTechnical: 16,
    priority: 'media',
    createdAt: '2026-02-22T15:00:00',
    scheduledFor: '2026-02-23T07:00:00'
  },
  {
    id: 'OT-2026-0444',
    caseId: 'CASO-2026-0233',
    asset: 'Luminaria Los Aromos',
    crew: 'Cuadrilla Eléctrica 1',
    status: 'completada',
    slaTechnical: 48,
    priority: 'baja',
    createdAt: '2026-02-21T09:00:00',
    scheduledFor: '2026-02-22T08:00:00',
    completedAt: '2026-02-22T10:30:00'
  }
];

export interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  location: string;
  priority: number;
  reason: string;
  coordinates: { lat: number; lng: number };
}

export const mockAlerts: Alert[] = [
  {
    id: 'ALR-001',
    type: 'critical',
    title: 'Riesgo alto caída árbol - Zona Kennedy',
    location: 'Plaza O\'Higgins, sector norte',
    priority: 88,
    reason: 'IA detectó inclinación crítica + vientos > 40km/h pronosticados',
    coordinates: { lat: -33.4470, lng: -70.6720 }
  },
  {
    id: 'ALR-002',
    type: 'warning',
    title: 'Contenedor rebalse recurrente - 3 días',
    location: 'Pasaje Los Olivos 234',
    priority: 68,
    reason: 'Patrón de desborde detectado cada 4-5 días. Ajuste de frecuencia necesario.',
    coordinates: { lat: -33.4510, lng: -70.6650 }
  },
  {
    id: 'ALR-003',
    type: 'critical',
    title: 'Vereda con reincidencia - 4 reclamos',
    location: 'Av. Kennedy con Calle 15',
    priority: 92,
    reason: 'Cuarto reporte en 30 días. Solución temporal no efectiva.',
    coordinates: { lat: -33.4489, lng: -70.6693 }
  }
];

export interface MapLayer {
  id: string;
  name: string;
  color: string;
  active: boolean;
  count: number;
}

export const mockLayers: MapLayer[] = [
  { id: 'veredas', name: 'Veredas dañadas', color: '#DC2626', active: true, count: 12 },
  { id: 'arboles', name: 'Árboles en riesgo', color: '#F59E0B', active: true, count: 5 },
  { id: 'contenedores', name: 'Contenedores con alerta', color: '#8B5CF6', active: true, count: 8 },
  { id: 'microbasurales', name: 'Microbasurales', color: '#DC2626', active: false, count: 3 },
  { id: 'casos', name: 'Casos ciudadanos activos', color: '#1F3A8A', active: true, count: 23 }
];

export interface AnalyticsData {
  slaCompliance: {
    compliant: number;
    atRisk: number;
    breached: number;
  };
  recurrences: Array<{
    location: string;
    count: number;
    type: string;
  }>;
  criticalRisks: Array<{
    title: string;
    severity: number;
    area: string;
  }>;
}

export const mockAnalytics: AnalyticsData = {
  slaCompliance: {
    compliant: 78,
    atRisk: 15,
    breached: 7
  },
  recurrences: [
    { location: 'Av. Kennedy con Calle 15', count: 4, type: 'Vereda dañada' },
    { location: 'Pasaje Los Olivos 234', count: 6, type: 'Contenedor desborde' },
    { location: 'Calle Las Rosas', count: 3, type: 'Iluminación' }
  ],
  criticalRisks: [
    { title: 'Árbol Plaza O\'Higgins', severity: 88, area: 'Áreas Verdes' },
    { title: 'Vereda Av. Kennedy', severity: 92, area: 'Infraestructura' },
    { title: 'Microbasural Las Acacias', severity: 71, area: 'Aseo' }
  ]
};
