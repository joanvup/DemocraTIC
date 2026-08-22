import {
  Candidate,
  CastVoteRequest,
  CastVoteResponse,
  Election,
  ElectionStats,
  IdentifyStudentRequest,
  IdentifyStudentResponse,
  SchoolSettings,
  Student,
  User
} from '../../shared/types.js';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {})
  };

  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Acceso no autorizado. Por favor inicia sesión.');
      }
      throw new Error(`Error en el servidor (${res.status})`);
    }
    throw new Error('El servidor retornó una respuesta que no es JSON.');
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Error en la solicitud (${res.status})`);
  }
  return data as T;
}

export const votingApi = {
  getActiveElection: () => fetchJson<{ success: boolean; election: Election | null; settings: SchoolSettings }>('/api/v1/voting/active-election'),
  identifyStudent: (payload: IdentifyStudentRequest) => fetchJson<IdentifyStudentResponse>('/api/v1/voting/identify', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  castVote: (payload: CastVoteRequest) => fetchJson<CastVoteResponse>('/api/v1/voting/cast', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  getPublicResults: () => fetchJson<{
    success: boolean;
    election: Election;
    settings: SchoolSettings;
    is_hidden: boolean;
    message?: string;
    stats?: ElectionStats;
  }>('/api/v1/voting/public-results')
};

export const adminApi = {
  login: (username: string, password: string) => fetchJson<{ success: boolean; user: User; token: string }>('/api/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  }),
  logout: () => fetchJson<{ success: boolean }>('/api/v1/admin/logout', { method: 'POST' }),
  getMe: () => fetchJson<{ success: boolean; user: User }>('/api/v1/admin/me'),
  changePassword: (oldPassword: string, newPassword: string) => fetchJson<{ success: boolean; message: string }>('/api/v1/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword })
  }),
  
  // Elecciones
  getElections: () => fetchJson<{ success: boolean; elections: Election[] }>('/api/v1/admin/elections'),
  createElection: (election: Partial<Election>) => fetchJson<{ success: boolean; election: Election }>('/api/v1/admin/elections', {
    method: 'POST',
    body: JSON.stringify(election)
  }),
  updateElection: (id: string, election: Partial<Election>) => fetchJson<{ success: boolean; election: Election }>(`/api/v1/admin/elections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(election)
  }),

  // Candidatos
  getCandidates: (electionId?: string) => fetchJson<{ success: boolean; candidates: Candidate[] }>(`/api/v1/admin/candidates${electionId ? `?election_id=${electionId}` : ''}`),
  createCandidate: (candidate: Partial<Candidate>) => fetchJson<{ success: boolean; candidate: Candidate }>('/api/v1/admin/candidates', {
    method: 'POST',
    body: JSON.stringify(candidate)
  }),
  updateCandidate: (id: string, candidate: Partial<Candidate>) => fetchJson<{ success: boolean; candidate: Candidate }>(`/api/v1/admin/candidates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(candidate)
  }),
  deleteCandidate: (id: string) => fetchJson<{ success: boolean }>(`/api/v1/admin/candidates/${id}`, { method: 'DELETE' }),

  // Estudiantes
  getStudents: (params?: { search?: string; grade?: string; course?: string; election_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.grade) query.set('grade', params.grade);
    if (params?.course) query.set('course', params.course);
    if (params?.election_id) query.set('election_id', params.election_id);
    return fetchJson<{ success: boolean; students: Array<Student & { has_voted: boolean; voted_at?: string; signed_qr_payload: string }> }>(`/api/v1/admin/students?${query.toString()}`);
  },
  createStudent: (student: Partial<Student>) => fetchJson<{ success: boolean; student: Student }>('/api/v1/admin/students', {
    method: 'POST',
    body: JSON.stringify(student)
  }),

  // Importar Excel
  analyzeExcel: (base64Data: string, fileName: string) => fetchJson<{
    success: boolean;
    analysis: {
      fileName: string;
      sheetNames: string[];
      totalRows: number;
      headers: string[];
      sampleRows: Record<string, string | number>[];
      suggestedMapping: { codeCol: string; nameCol: string; gradeCol: string; courseCol: string; statusCol?: string };
    };
  }>('/api/v1/admin/students/import-analyze', {
    method: 'POST',
    body: JSON.stringify({ base64Data, fileName })
  }),
  previewExcel: (base64Data: string, mapping: unknown, sheetIndex = 0) => fetchJson<{
    success: boolean;
    preview: {
      items: Array<{ rowNumber: number; studentCode: string; fullName: string; grade: string; course: string; status: string; isValid: boolean; errors: string[] }>;
      validCount: number;
      invalidCount: number;
      duplicateCount: number;
    };
  }>('/api/v1/admin/students/import-preview', {
    method: 'POST',
    body: JSON.stringify({ base64Data, mapping, sheetIndex })
  }),
  executeImport: (base64Data: string, mapping: unknown, sheetIndex = 0) => fetchJson<{
    success: boolean;
    result: { inserted: number; updated: number; total: number };
  }>('/api/v1/admin/students/import-execute', {
    method: 'POST',
    body: JSON.stringify({ base64Data, mapping, sheetIndex })
  }),

  // Estadísticas & Auditoría
  getStats: (electionId: string) => fetchJson<{ success: boolean; stats: ElectionStats }>(`/api/v1/admin/stats/${electionId}`),
  getAuditLogs: (limit = 100) => fetchJson<{ success: boolean; logs: Array<{ id: string; user_id: string | null; username: string; action: string; details: string; ip_address: string; created_at: string }> }>(`/api/v1/admin/audit-logs?limit=${limit}`),
  getSettings: () => fetchJson<{ success: boolean; settings: SchoolSettings }>('/api/v1/admin/settings'),
  updateSettings: (settings: Partial<SchoolSettings>) => fetchJson<{ success: boolean; settings: SchoolSettings }>('/api/v1/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  })
};
