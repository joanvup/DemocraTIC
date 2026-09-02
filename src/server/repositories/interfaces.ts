import { AnonymousVote, AuditLog, Candidate, Election, SchoolSettings, Student, User, VoterStatus } from '../../shared/types.js';

export interface IUserRepository {
  findByUsername(username: string): Promise<(User & { password_hash: string }) | null>;
  findById(id: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  create(user: Omit<User, 'id' | 'created_at'> & { password_hash: string }): Promise<User>;
  update(id: string, user: Partial<Omit<User, 'id' | 'created_at'>> & { password_hash?: string }): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IElectionRepository {
  findById(id: string): Promise<Election | null>;
  findActive(): Promise<Election | null>;
  findAll(): Promise<Election[]>;
  create(election: Omit<Election, 'id' | 'created_at' | 'updated_at'>): Promise<Election>;
  update(id: string, election: Partial<Omit<Election, 'id' | 'created_at' | 'updated_at'>>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ICandidateRepository {
  findById(id: string): Promise<Candidate | null>;
  findByElectionId(electionId: string): Promise<Candidate[]>;
  create(candidate: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<Candidate>;
  update(id: string, candidate: Partial<Omit<Candidate, 'id' | 'created_at' | 'updated_at'>>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByCode(studentCode: string): Promise<Student | null>;
  findAll(search?: string, grade?: string, course?: string): Promise<Student[]>;
  create(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student>;
  createBatch(students: Array<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): Promise<{ created: number; skipped: number }>;
  update(id: string, student: Partial<Omit<Student, 'id' | 'created_at' | 'updated_at'>>): Promise<void>;
  delete(id: string): Promise<void>;
  countTotal(): Promise<number>;
}

export interface IVotingToken {
  token_hash: string;
  election_id: string;
  student_id: string;
  expires_at: string;
  is_consumed: number;
  created_at: string;
}

export interface IVoteRepository {
  getVoterStatus(electionId: string, studentId: string): Promise<VoterStatus | null>;
  createVotingToken(token: IVotingToken): Promise<void>;
  findVotingToken(tokenHash: string): Promise<IVotingToken | null>;
  consumeVotingToken(tokenHash: string): Promise<void>;
  
  // Transacción atómica de emisión de voto
  castAnonymousVote(params: {
    electionId: string;
    studentId: string;
    tokenHash: string;
    candidateId: string | null;
    isBlank: boolean;
    stationId?: string;
  }): Promise<string>;

  // Métricas y resultados agregados (NUNCA vinculados al estudiante)
  getResultsByElection(electionId: string): Promise<Array<{
    candidate_id: string | null;
    is_blank: number;
    votes_count: number;
  }>>;
  getTotalVotesCount(electionId: string): Promise<number>;
  getVoterParticipationByCourse(electionId: string): Promise<Array<{
    course: string;
    grade: string;
    total: number;
    voted: number;
  }>>;
  getVotesTimeline(electionId: string): Promise<Array<{
    hour: string;
    votes_count: number;
  }>>;
}

export interface IAuditRepository {
  create(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<void>;
  findAll(limit?: number): Promise<AuditLog[]>;
  getVoteFlow(): Promise<Array<{time: string, votes: number}>>;
}

export interface ISettingsRepository {
  getSettings(): Promise<SchoolSettings>;
  updateSettings(settings: Partial<Omit<SchoolSettings, 'id' | 'updated_at'>>): Promise<void>;
}
