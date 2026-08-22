// Tipos de dominio y DTOs compartidos entre Cliente y Servidor

export type UserRole = 'SUPERADMIN' | 'ADMIN_ELECTORAL' | 'MONITOR';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: number; // 0 or 1
  created_at: string;
}

export type ElectionStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'FINISHED';

export interface Election {
  id: string;
  name: string;
  year: string | number;
  description: string;
  start_at: string;
  end_at: string;
  status: ElectionStatus;
  allow_blank_vote: number; // 0 or 1
  show_live_results: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  election_id: string;
  full_name: string;
  student_course: string;
  list_number: number;
  slogan: string;
  description: string;
  photo_url: string;
  display_order: number;
  is_active: number; // 0 or 1
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_code: string;
  full_name: string;
  grade: string;
  course: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface VoterStatus {
  id: string;
  election_id: string;
  student_id: string;
  has_voted: number; // 1
  voted_at: string;
  station_id: string;
}

// ⚠️ Secreto del voto: La tabla de votos NUNCA contiene student_id ni código de carnet
export interface AnonymousVote {
  id: string;
  election_id: string;
  candidate_id: string | null; // null si es voto en blanco
  is_blank: number; // 1 si es blanco, 0 si fue por candidato
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  username: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  allow_qr_scanner: number;
  allow_manual_id: number;
  updated_at: string;
}

// DTOs para Votación
export interface IdentifyStudentRequest {
  election_id?: string;
  student_code?: string;
  qr_payload?: string;
  station_id?: string;
}

export interface IdentifyStudentResponse {
  success: boolean;
  message?: string;
  student?: {
    full_name: string;
    course: string;
    grade: string;
  };
  voting_token?: string; // Token temporal de un solo uso
  expires_in_seconds?: number;
  candidates?: Candidate[];
  allow_blank_vote?: boolean;
}

export interface CastVoteRequest {
  voting_token: string;
  candidate_id?: string | null;
  is_blank?: boolean;
  station_id?: string;
}

export interface CastVoteResponse {
  success: boolean;
  message: string;
  receipt_id?: string; // Código de confirmación anónimo para el votante
}

// DTOs para Métricas y Dashboard
export interface ElectionStats {
  total_eligible_students: number;
  total_votes_cast: number;
  total_pending_students: number;
  participation_percentage: number;
  results: Array<{
    candidate_id: string | null;
    candidate_name: string;
    list_number: number | null;
    photo_url: string | null;
    votes_count: number;
    percentage: number;
    is_blank: boolean;
  }>;
  participation_by_course: Array<{
    course: string;
    grade: string;
    total: number;
    voted: number;
    pending: number;
    percentage: number;
  }>;
  votes_timeline: Array<{
    hour: string;
    votes_count: number;
  }>;
}
