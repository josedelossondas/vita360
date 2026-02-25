// API Service - Comunicación con backend Vita360
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Types
export interface Ticket {
  id: number;
  title: string;
  description: string;
  priority_score: number;
  urgency_level: string;
  status: string;
  area_name: string;
  created_at: string;
  user_id: number;
}

export interface Evidence {
  id: number;
  ticket_id: number;
  image_url: string;
  description?: string;
  created_at: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority_score: number;
  urgency_level: string;
  area_name: string;
  latitude?: number;
  longitude?: number;
}

export interface DashboardStats {
  total_open: number;
  resolved_first_contact_percentage: number;
  avg_response_time: number;
  at_risk_count: number;
}

// Helper para obtener token
const getToken = (): string | null => {
  const authData = localStorage.getItem('auth');
  if (authData) {
    try {
      return JSON.parse(authData).token;
    } catch {
      return null;
    }
  }
  return null;
};

// Headers con autenticación
const getHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

// ─── USUARIOS ───────────────────────────────────────────────────────────────

export const apiAuth = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ username: email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    return data;
  },

  register: async (name: string, email: string, password: string, role: 'ciudadano' | 'operador' = 'ciudadano') => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: getHeaders(false),
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    return await response.json();
  },
};

// ─── TICKETS (CASOS/PROBLEMAS) ───────────────────────────────────────────────

export const apiTickets = {
  // Crear nuevo ticket (ciudadano reporta un problema)
  create: async (payload: CreateTicketPayload) => {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create ticket');
    }

    return await response.json();
  },

  // Obtener todos los tickets del usuario actual
  getMyTickets: async () => {
    const response = await fetch(`${API_BASE_URL}/tickets/my-tickets`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch tickets');
    }

    return await response.json();
  },

  // Obtener ticket específico
  getById: async (ticketId: number) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ticket');
    }

    return await response.json();
  },

  // Obtener todos los tickets (solo operadores)
  getAll: async (status?: string, area?: string) => {
    let url = `${API_BASE_URL}/tickets`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (area) params.append('area', area);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tickets');
    }

    return await response.json();
  },

  // Actualizar ticket
  update: async (ticketId: number, data: Partial<CreateTicketPayload> & { status?: string }) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update ticket');
    }

    return await response.json();
  },

  // Eliminar ticket
  delete: async (ticketId: number) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to delete ticket');
    }
  },
};

// ─── EVIDENCIA (FOTOS) ───────────────────────────────────────────────────────

export const apiEvidence = {
  // Subir evidencia (foto) a un ticket
  upload: async (ticketId: number, imageBase64: string, description?: string) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/evidence`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({
        image_url: imageBase64,
        description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload evidence');
    }

    return await response.json();
  },

  // Obtener todas las evidencias de un ticket
  getByTicket: async (ticketId: number): Promise<Evidence[]> => {
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/evidence`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  },

  // Eliminar evidencia
  delete: async (evidenceId: number) => {
    const response = await fetch(`${API_BASE_URL}/evidence/${evidenceId}`, {
      method: 'DELETE',
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to delete evidence');
    }
  },
};

// ─── ESTADÍSTICAS ───────────────────────────────────────────────────────────

export const apiStats = {
  // Obtener estadísticas del dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await fetch(`${API_BASE_URL}/stats/dashboard`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch stats');
    }

    return await response.json();
  },

  // Obtener reportes por área
  getAreaStats: async () => {
    const response = await fetch(`${API_BASE_URL}/stats/areas`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      return {};
    }

    return await response.json();
  },
};

// ─── ÁREAS ──────────────────────────────────────────────────────────────────

export const apiAreas = {
  // Obtener todas las áreas
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/areas`, {
      headers: getHeaders(true),
    });

    if (!response.ok) {
      return [];
    }

    return await response.json();
  },
};

// ─── HELPER: Convertir imagen a Base64 ──────────────────────────────────────

export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// ─── HELPER: Compresión de imagen ──────────────────────────────────────────

export const compressImage = (base64: string, maxWidth: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = maxWidth / img.width;
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.src = base64;
  });
};
