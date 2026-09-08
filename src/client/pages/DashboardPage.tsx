import { useState, useEffect, useCallback, ChangeEvent, FormEvent, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AuditLog,
  Candidate,
  Election,
  ElectionStats,
  MachineAuditSummary,
  SchoolSettings,
  Student,
  User
} from '../../shared/types.js';
import { adminApi } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useSSE } from '../hooks/useSSE.js';
import { StudentCardModal } from '../components/admin/StudentCardModal.js';
import { CandidateModal } from '../components/admin/CandidateModal.js';
import { ElectionModal } from '../components/admin/ElectionModal.js';
import { ChangePasswordModal } from '../components/admin/ChangePasswordModal.js';
import { generateActaPDF } from '../utils/pdfReportService.js';
import { ElectionCountdown } from '../components/admin/ElectionCountdown.js';
import { ElectionCharts } from '../components/charts/ElectionCharts.js';
import { openPdfDocument } from '../utils/pdfHelper.js';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Key,
  LayoutDashboard,
  LogOut,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Vote,
  ExternalLink,
  Lock,
  Edit3,
  Image as ImageIcon,
  ShieldAlert,
  Cpu,
  Laptop,
  Monitor,
  Network,
  Smartphone,
  Tablet
} from 'lucide-react';

type AdminTab = 'DASHBOARD' | 'ELECTIONS' | 'CANDIDATES' | 'STUDENTS' | 'IMPORT' | 'REPORTS' | 'AUDIT' | 'SETTINGS';

export function DashboardPage({
  onNavigateToVoting,
  onNavigateToPublicResults
}: {
  onNavigateToVoting: () => void;
  onNavigateToPublicResults: () => void;
}) {
  const { user, logout } = useAuth();

  // Navegación
  const [activeTab, setActiveTab] = useState<AdminTab>('DASHBOARD');

  // Datos Generales
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('');
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [students, setStudents] = useState<Array<Student & { has_voted: boolean; voted_at?: string; signed_qr_payload: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [machineAudit, setMachineAudit] = useState<MachineAuditSummary | null>(null);
  const [auditSubTab, setAuditSubTab] = useState<'MACHINES' | 'SYSTEM'>('MACHINES');
  const [loadingMachineAudit, setLoadingMachineAudit] = useState(false);
  const [machineSearch, setMachineSearch] = useState('');
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Estudiantes
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('');
  const [studentCourseFilter, setStudentCourseFilter] = useState('');

  // Modales
  const [carnetStudent, setCarnetStudent] = useState<(Student & { signed_qr_payload?: string }) | null>(null);
  const [isCarnetModalOpen, setIsCarnetModalOpen] = useState(false);

  // Modales de Candidatos
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [candidateToEdit, setCandidateToEdit] = useState<Candidate | null>(null);

  // Modales de Elecciones
  const [isNewElectionModalOpen, setIsNewElectionModalOpen] = useState(false);
  const [electionToEdit, setElectionToEdit] = useState<Election | null>(null);
  
  // Contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [studentForm, setStudentForm] = useState({
    student_code: '',
    full_name: '',
    grade: '5',
    course: '5A',
    status: 'ACTIVE' as const
  });

  // Estado de Importación Excel
  const [importFile, setImportFile] = useState<{ base64: string; name: string } | null>(null);
  const [importAnalysis, setImportAnalysis] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState({
    codeCol: '',
    nameCol: '',
    gradeCol: '',
    courseCol: '',
    statusCol: ''
  });
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Configuración Form
  const [settingsForm, setSettingsForm] = useState<Partial<SchoolSettings>>({});
  const [myIp, setMyIp] = useState<string>('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Cargar lista de elecciones inicial
  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [elecRes, setRes] = await Promise.all([adminApi.getElections(), adminApi.getSettings()]);
      if (elecRes && elecRes.success) {
        setElections(elecRes.elections);
        if (elecRes.elections.length > 0) {
          setSelectedElectionId(elecRes.elections[0].id);
        }
      }
      if (setRes && setRes.success) {
        setSettings(setRes.settings);
        setSettingsForm(setRes.settings);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('no autorizado') && !msg.includes('401')) {
        console.error('Error cargando elecciones:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user, loadInitialData]);

  // Cargar datos de la elección seleccionada
  const loadElectionData = useCallback(async (electionId: string) => {
    if (!user || !electionId) return;
    try {
      const [statsRes, candRes] = await Promise.all([
        adminApi.getStats(electionId),
        adminApi.getCandidates(electionId)
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (candRes.success) setCandidates(candRes.candidates);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('no autorizado') && !msg.includes('401')) {
        console.error('Error cargando métricas de elección:', err);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedElectionId) {
      loadElectionData(selectedElectionId);
    }
  }, [user, selectedElectionId, loadElectionData]);

  // Suscripción SSE para actualizar métricas en vivo en el dashboard
  useSSE(selectedElectionId, (newStats) => {
    setStats(newStats);
  });

  // Cargar Estudiantes
  const loadStudents = useCallback(async () => {
    if (!user) return;
    try {
      const res = await adminApi.getStudents({
        search: studentSearch,
        grade: studentGradeFilter,
        course: studentCourseFilter,
        election_id: selectedElectionId
      });
      if (res.success) {
        setStudents(res.students);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('no autorizado') && !msg.includes('401')) {
        console.error('Error cargando estudiantes:', err);
      }
    }
  }, [user, studentSearch, studentGradeFilter, studentCourseFilter, selectedElectionId]);

  useEffect(() => {
    if (user && activeTab === 'STUDENTS') {
      loadStudents();
    }
  }, [user, activeTab, loadStudents]);

  // Cargar Logs de Auditoría
  const loadAuditLogs = useCallback(async () => {
    if (!user) return;
    try {
      const res = await adminApi.getAuditLogs(100);
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('no autorizado') && !msg.includes('401')) {
        console.error('Error cargando auditoría:', err);
      }
    }
  }, [user]);

  // Cargar Auditoría de Máquinas y Equipos
  const loadMachineAudit = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingMachineAudit(true);
      const res = await adminApi.getMachineAudit(selectedElectionId || undefined);
      if (res.success) {
        setMachineAudit(res.summary);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('no autorizado') && !msg.includes('401')) {
        console.error('Error cargando auditoría de máquinas:', err);
      }
    } finally {
      setLoadingMachineAudit(false);
    }
  }, [user, selectedElectionId]);

  useEffect(() => {
    if (user && activeTab === 'AUDIT') {
      loadAuditLogs();
      loadMachineAudit();
    }
  }, [user, activeTab, loadAuditLogs, loadMachineAudit]);

  // Cambiar Estado de Elección (Abrir / Cerrar)
  const handleUpdateElectionStatus = async (id: string, newStatus: Election['status']) => {
    try {
      await adminApi.updateElection(id, { status: newStatus });
      await loadInitialData();
      if (selectedElectionId === id) {
        loadElectionData(id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar estado';
      alert(msg);
    }
  };

  // Crear o Editar Elección
  const handleOpenNewElectionModal = () => {
    setElectionToEdit(null);
    setIsNewElectionModalOpen(true);
  };

  const handleOpenEditElectionModal = (elec: Election) => {
    setElectionToEdit(elec);
    setIsNewElectionModalOpen(true);
  };

  const handleSaveElection = async (electionData: Partial<Election>) => {
    if (electionToEdit) {
      const res = await adminApi.updateElection(electionToEdit.id, electionData);
      if (res.success) {
        await loadInitialData();
        if (selectedElectionId === electionToEdit.id) {
          loadElectionData(electionToEdit.id);
        }
      }
    } else {
      const res = await adminApi.createElection(electionData);
      if (res.success && res.election) {
        await loadInitialData();
        setSelectedElectionId(res.election.id);
        loadElectionData(res.election.id);
      }
    }
  };

  // Crear o Editar Candidato (con soporte de foto local o URL)
  const handleSaveCandidate = async (candidateData: Partial<Candidate>) => {
    if (!selectedElectionId) return;
    if (candidateToEdit) {
      await adminApi.updateCandidate(candidateToEdit.id, candidateData);
    } else {
      await adminApi.createCandidate({
        ...candidateData,
        election_id: selectedElectionId
      });
    }
    loadElectionData(selectedElectionId);
  };

  const handleOpenNewCandidateModal = () => {
    setCandidateToEdit(null);
    setIsCandidateModalOpen(true);
  };

  const handleOpenEditCandidateModal = (cand: Candidate) => {
    setCandidateToEdit(cand);
    setIsCandidateModalOpen(true);
  };

  // Eliminar Candidato
  const handleDeleteCandidate = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este candidato?')) return;
    try {
      await adminApi.deleteCandidate(id);
      loadElectionData(selectedElectionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      alert(msg);
    }
  };

  // Crear Estudiante Manual
  const handleCreateStudent = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createStudent(studentForm);
      setIsNewStudentModalOpen(false);
      setStudentForm({
        student_code: '',
        full_name: '',
        grade: '5',
        course: '5A',
        status: 'ACTIVE'
      });
      loadStudents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear estudiante';
      alert(msg);
    }
  };

  // Manejo de Carga de Archivo Excel
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      setImportFile({ base64, name: file.name });
      try {
        const res = await adminApi.analyzeExcel(base64, file.name);
        if (res.success) {
          setImportAnalysis(res.analysis);
          setColumnMapping(res.analysis.suggestedMapping);

          // Generar preview inicial
          const prevRes = await adminApi.previewExcel(base64, res.analysis.suggestedMapping);
          if (prevRes.success) {
            setImportPreview(prevRes.preview);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al analizar archivo';
        alert(msg);
      }
    };
    reader.readAsDataURL(file);
  };

  // Ejecutar Importación
  const handleExecuteImport = async () => {
    if (!importFile) return;
    try {
      setIsImporting(true);
      const res = await adminApi.executeImport(importFile.base64, columnMapping);
      if (res.success) {
        setImportSuccessMsg(`¡Importación exitosa! Se procesaron ${res.result.total} estudiantes (${res.result.inserted} nuevos registros, ${res.result.updated} actualizados).`);
        setImportFile(null);
        setImportAnalysis(null);
        setImportPreview(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al importar datos';
      alert(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Exportar Acta Oficial en PDF con Logo Institucional, Gráficos y Tablas
  const [isGeneratingActa, setIsGeneratingActa] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const handleExportActaPDF = async () => {
    if (!stats) return;
    const currentElection = elections.find(e => e.id === selectedElectionId);
    try {
      setIsGeneratingActa(true);
      await generateActaPDF({
        election: currentElection,
        stats,
        settings
      });
    } catch (err) {
      console.error('Error al generar PDF del acta:', err);
      alert('Ocurrió un error al generar el PDF del acta oficial.');
    } finally {
      setIsGeneratingActa(false);
    }
  };

  const handleLogoFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setSettingsForm(prev => ({ ...prev, logo_url: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Guardar Ajustes del Colegio
  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await adminApi.updateSettings(settingsForm);
      if (res.success) {
        setSettings(res.settings);
        alert('Configuración guardada exitosamente');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar';
      alert(msg);
    } finally {
      setSavingSettings(false);
    }
  };

  const currentElection = elections.find(e => e.id === selectedElectionId);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      {/* 1. Barra de Navegación Principal */}
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-bold shadow-md">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-black text-lg text-white leading-tight">
              Panel de Control Electoral
            </h1>
            <p className="text-xs text-sky-400 font-medium">
              {settings?.school_name || 'Colegio Bilingüe San Patricio'}
            </p>
          </div>
        </div>

        {/* Accesos rápidos & Usuario */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToVoting}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Vote className="w-4 h-4" />
            <span className="hidden sm:inline">Estación de Votación</span>
          </button>

          <button
            onClick={onNavigateToPublicResults}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Proyector Resultados</span>
          </button>

          <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />

          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-white">{user?.full_name}</span>
            <span className="text-[10px] text-sky-400 font-mono">{user?.role}</span>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Cambiar Contraseña"
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Sub-Barra de Pestañas */}
      <div className="bg-white border-b border-slate-200 px-6 overflow-x-auto">
        <div className="flex items-center gap-2 py-2 min-w-max">
          {[
            { id: 'DASHBOARD', label: 'Resumen en Vivo', icon: LayoutDashboard },
            { id: 'ELECTIONS', label: 'Elecciones', icon: Calendar },
            { id: 'CANDIDATES', label: 'Candidatos', icon: Users },
            { id: 'STUDENTS', label: 'Censo Estudiantil & Carnets', icon: UserCheck },
            { id: 'IMPORT', label: 'Importar Excel', icon: FileSpreadsheet },
            { id: 'REPORTS', label: 'Reportes & Actas', icon: FileText },
            { id: 'AUDIT', label: 'Auditoría', icon: History },
            { id: 'SETTINGS', label: 'Configuración', icon: SettingsIcon }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Contenido de la Pestaña */}
      <main className="flex-grow p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Selector de Elección Activa si aplica */}
        {elections.length > 1 && (
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Elección Seleccionada:</span>
            <select
              value={selectedElectionId}
              onChange={e => setSelectedElectionId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
            >
              {elections.map(el => (
                <option key={el.id} value={el.id}>
                  {el.name} ({el.year}) - Estado: {el.status}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 1: DASHBOARD DE MÉTRICAS EN VIVO
           =================================================================== */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6">
            {/* Banner de Estado de la Elección */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    currentElection?.status === 'OPEN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : currentElection?.status === 'SCHEDULED'
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {currentElection?.status === 'OPEN' 
                      ? 'Jornada en Curso (Abierta)' 
                      : currentElection?.status === 'SCHEDULED' 
                      ? 'Jornada Programada' 
                      : `Estado: ${currentElection?.status || 'Inactiva'}`}
                  </span>
                  {currentElection?.status === 'SCHEDULED' && currentElection?.start_at && (
                    <span className="text-xs text-sky-300 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(currentElection.start_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {currentElection?.name || 'Elección Activa'}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  {currentElection?.description || 'Monitoreo en tiempo real de participación democrática y escrutinio.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {currentElection && (
                  <button
                    onClick={() => handleOpenEditElectionModal(currentElection)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar / Fechas
                  </button>
                )}

                {currentElection?.status === 'OPEN' ? (
                  <button
                    onClick={() => handleUpdateElectionStatus(currentElection.id, 'CLOSED')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow cursor-pointer"
                  >
                    Cerrar Elección
                  </button>
                ) : (
                  <button
                    onClick={() => currentElection && handleUpdateElectionStatus(currentElection.id, 'OPEN')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow cursor-pointer"
                  >
                    Abrir Elección Ahora
                  </button>
                )}

                <button
                  onClick={() => selectedElectionId && loadElectionData(selectedElectionId)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white cursor-pointer"
                  title="Recargar Datos"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
              <ElectionCountdown election={currentElection} />
              
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Habilitados</span>
                <p className="text-3xl font-black text-slate-900 font-mono mt-1">
                  {stats?.total_eligible_students?.toLocaleString() || 0}
                </p>
                <span className="text-[11px] text-slate-400">Total en Censo</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-emerald-600 uppercase">Votos Emitidos</span>
                <p className="text-3xl font-black text-emerald-600 font-mono mt-1">
                  {stats?.total_votes_cast?.toLocaleString() || 0}
                </p>
                <span className="text-[11px] text-slate-400">En Urna Electrónica</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-amber-600 uppercase">Pendientes</span>
                <p className="text-3xl font-black text-amber-600 font-mono mt-1">
                  {stats?.total_pending_students?.toLocaleString() || 0}
                </p>
                <span className="text-[11px] text-slate-400">Faltan por votar</span>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-indigo-600 uppercase">Participación</span>
                <p className="text-3xl font-black text-indigo-600 font-mono mt-1">
                  {stats?.participation_percentage || 0}%
                </p>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats?.participation_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <ElectionCharts stats={stats} isDark={false} />

            {/* Gráficos de Resultados y Participación */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Resultados por Candidato */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-sky-600" />
                    Escrutinio en Tiempo Real
                  </h3>
                  <span className="text-xs font-mono text-slate-500">Votos Totales: {stats?.total_votes_cast || 0}</span>
                </div>

                <div className="space-y-4">
                  {stats?.results.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
                        <div className="flex items-center gap-2">
                          {item.photo_url && (
                            <img src={item.photo_url} alt="" className="w-7 h-7 rounded-lg object-cover" referrerPolicy="no-referrer" />
                          )}
                          <span>{item.candidate_name}</span>
                          {item.list_number && (
                            <span className="text-[10px] font-mono bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
                              #{item.list_number}
                            </span>
                          )}
                        </div>
                        <div className="font-mono">
                          <span className="font-black text-slate-900">{item.votes_count} votos</span>
                          <span className="text-slate-500 text-xs ml-1.5">({item.percentage}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-100 h-4 rounded-xl overflow-hidden p-0.5">
                        <div
                          className={`h-full rounded-lg transition-all duration-500 ${
                            idx === 0 && item.votes_count > 0 && !item.is_blank
                              ? 'bg-emerald-500'
                              : item.is_blank
                              ? 'bg-slate-400'
                              : 'bg-sky-600'
                          }`}
                          style={{ width: `${Math.max(item.percentage, 1)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Participación por Curso */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Participación por Curso
                </h3>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {stats?.participation_by_course.map((c, i) => (
                    <div key={i} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800">Curso {c.course}</span>
                        <span className="font-mono text-slate-600">{c.voted} / {c.total} ({c.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${c.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 2: GESTIÓN DE ELECCIONES
           =================================================================== */}
        {activeTab === 'ELECTIONS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Jornadas Electorales</h2>
                <p className="text-xs text-slate-500">Administra las elecciones institucionales, apertura/cierre de urnas y reglas.</p>
              </div>
              <button
                id="create_new_election_btn"
                onClick={handleOpenNewElectionModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva Elección
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {elections.map(elec => {
                const isSelected = selectedElectionId === elec.id;
                const isScheduled = elec.status === 'SCHEDULED';
                const isOpen = elec.status === 'OPEN';
                const isClosed = elec.status === 'CLOSED';

                const formattedStart = elec.start_at 
                  ? new Date(elec.start_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                  : null;
                const formattedEnd = elec.end_at 
                  ? new Date(elec.end_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                  : null;

                return (
                  <div 
                    key={elec.id} 
                    className={`bg-white p-6 rounded-3xl border ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} shadow-sm space-y-4 transition-all flex flex-col justify-between`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 font-mono">Año {elec.year}</span>
                            {isSelected && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-[10px] font-extrabold uppercase">
                                Activa en Panel
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-xl text-slate-900 mt-0.5">{elec.name}</h3>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 ${
                          isOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : isScheduled
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : isClosed
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {isOpen ? '🟢 ABIERTA' : isScheduled ? '🔵 PROGRAMADA' : isClosed ? '🔴 CERRADA' : elec.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 min-h-[32px]">{elec.description || 'Sin descripción adicional.'}</p>

                      {/* Caja de Programación de Fechas */}
                      {(formattedStart || formattedEnd) && (
                        <div className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                          isScheduled 
                            ? 'bg-sky-50/80 border-sky-200 text-sky-950' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60 pb-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-sky-600" />
                              Horario Programado
                            </span>
                            {isScheduled && (
                              <span className="text-sky-700 font-extrabold">Configurada</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 text-xs font-medium">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Apertura (Inicio):</span>
                              <span className="font-semibold text-slate-800 font-mono text-[11px]">{formattedStart || 'No fijada'}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Cierre (Fin):</span>
                              <span className="font-semibold text-slate-800 font-mono text-[11px]">{formattedEnd || 'No fijada'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-slate-500 block text-[11px]">
                          Voto Blanco: <strong>{elec.allow_blank_vote ? 'Habilitado' : 'Deshabilitado'}</strong>
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          Resultados en Vivo: <strong>{elec.show_live_results ? 'Públicos' : 'Ocultos'}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditElectionModal(elec)}
                          className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          title="Editar parámetros y fecha de la elección"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar / Programar
                        </button>

                        {!isSelected && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedElectionId(elec.id);
                              loadElectionData(elec.id);
                            }}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                          >
                            Seleccionar
                          </button>
                        )}

                        {elec.status !== 'OPEN' ? (
                          <button
                            onClick={() => handleUpdateElectionStatus(elec.id, 'OPEN')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm transition-colors"
                          >
                            Abrir Mesas
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateElectionStatus(elec.id, 'CLOSED')}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm transition-colors"
                          >
                            Cerrar Mesas
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 3: GESTIÓN DE CANDIDATOS
           =================================================================== */}
        {activeTab === 'CANDIDATES' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Aspirantes a Personería</h2>
                <p className="text-xs text-slate-500">Candidatos habilitados para el tarjetón oficial.</p>
              </div>
              <button
                id="open_register_candidate_modal_btn"
                onClick={handleOpenNewCandidateModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Registrar Candidato
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map(c => (
                <div key={c.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 relative flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="aspect-[4/3] rounded-2xl bg-slate-100 overflow-hidden border border-slate-200">
                      <img src={c.photo_url || ''} alt={c.full_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>

                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-sky-900 text-white mb-1">
                        TARJETÓN #{c.list_number}
                      </span>
                      <h3 className="font-bold text-lg text-slate-900">{c.full_name}</h3>
                      <p className="text-xs font-semibold text-sky-700">Curso: {c.student_course}</p>
                      {c.slogan && <p className="text-xs italic text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">{c.slogan}</p>}

                      {/* Documento PDF de Propuestas */}
                      {c.proposals_pdf_url ? (
                        <button
                          type="button"
                          onClick={() => openPdfDocument(c.proposals_pdf_url!, `Propuestas - ${c.full_name}`)}
                          className="mt-3 w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer group"
                          title="Abrir documento PDF de propuestas de campaña"
                        >
                          <FileText className="w-3.5 h-3.5 text-rose-600 group-hover:scale-110 transition-transform" />
                          <span>Ver Propuestas (PDF)</span>
                          <ExternalLink className="w-3 h-3 text-rose-400 ml-auto" />
                        </button>
                      ) : (
                        <div className="mt-3 py-1.5 px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-300" />
                          <span>Sin PDF de propuestas</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-mono">Orden: {c.display_order}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCandidateModal(c)}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar datos o cambiar foto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCandidate(c.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar candidato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 4: CENSO ESTUDIANTIL & GENERADOR DE CARNETS
           =================================================================== */}
        {activeTab === 'STUDENTS' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Censo Electoral Escolar</h2>
                <p className="text-xs text-slate-500">Censo oficial de estudiantes con carnets QR institucionales.</p>
              </div>
              <button
                onClick={() => setIsNewStudentModalOpen(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Agregar Estudiante
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-grow w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={studentGradeFilter}
                  onChange={e => setStudentGradeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="">Todos los Grados</option>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'].map(g => (
                    <option key={g} value={g}>Grado {g}</option>
                  ))}
                </select>

                <select
                  value={studentCourseFilter}
                  onChange={e => setStudentCourseFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                >
                  <option value="">Todos los Cursos</option>
                  {['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B'].map(c => (
                    <option key={c} value={c}>Curso {c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabla de Estudiantes */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Código ID</th>
                      <th className="py-3 px-4">Nombre Completo</th>
                      <th className="py-3 px-4">Curso</th>
                      <th className="py-3 px-4">Grado</th>
                      <th className="py-3 px-4">Estado Voto</th>
                      <th className="py-3 px-4 text-right">Carnet QR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-900">{s.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.full_name}</td>
                        <td className="py-3 px-4 font-semibold">{s.course}</td>
                        <td className="py-3 px-4">{s.grade}</td>
                        <td className="py-3 px-4">
                          {s.has_voted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> YA VOTÓ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              PENDIENTE
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setCarnetStudent(s);
                              setIsCarnetModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1.5 ml-auto transition-colors"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Ver Carnet
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 5: IMPORTACIÓN DE ESTUDIANTES DESDE EXCEL
           =================================================================== */}
        {activeTab === 'IMPORT' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div>
              <h2 className="text-xl font-black text-slate-900">Importación Masiva de Estudiantes</h2>
              <p className="text-xs text-slate-500">Carga el censo desde archivos .xlsx, .xls o .csv con mapeo dinámico de columnas y validación previa.</p>
            </div>

            {importSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {!importFile ? (
              <div className="bg-white border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center space-y-4 hover:border-sky-500 transition-colors">
                <div className="w-16 h-16 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mx-auto">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-800">Arrastra o selecciona el archivo Excel del censo</h3>
                  <p className="text-xs text-slate-400 mt-1">Soporta formatos .xlsx, .xls, .csv con columnas de ID, Nombre, Grado y Curso.</p>
                </div>
                <label className="inline-block px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow">
                  Examinar Archivo
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs text-slate-400">Archivo Seleccionado</span>
                    <h3 className="font-bold text-base text-slate-900">{importFile.name}</h3>
                  </div>
                  <button
                    onClick={() => {
                      setImportFile(null);
                      setImportAnalysis(null);
                      setImportPreview(null);
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline"
                  >
                    Cambiar archivo
                  </button>
                </div>

                {/* Mapeo de Columnas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Columna Código ID *</label>
                    <select
                      value={columnMapping.codeCol}
                      onChange={e => setColumnMapping({ ...columnMapping, codeCol: e.target.value })}
                      className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold"
                    >
                      {importAnalysis?.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Columna Nombre *</label>
                    <select
                      value={columnMapping.nameCol}
                      onChange={e => setColumnMapping({ ...columnMapping, nameCol: e.target.value })}
                      className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold"
                    >
                      {importAnalysis?.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Columna Grado</label>
                    <select
                      value={columnMapping.gradeCol}
                      onChange={e => setColumnMapping({ ...columnMapping, gradeCol: e.target.value })}
                      className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold"
                    >
                      {importAnalysis?.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Columna Curso</label>
                    <select
                      value={columnMapping.courseCol}
                      onChange={e => setColumnMapping({ ...columnMapping, courseCol: e.target.value })}
                      className="w-full mt-1 bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold"
                    >
                      {importAnalysis?.headers.map((h: string) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Previsualización */}
                {importPreview && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700">
                        Vista Previa ({importPreview.validCount} válidos, {importPreview.invalidCount} con observaciones)
                      </span>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold">
                          <tr>
                            <th className="p-2.5">Fila</th>
                            <th className="p-2.5">Código</th>
                            <th className="p-2.5">Nombre</th>
                            <th className="p-2.5">Grado / Curso</th>
                            <th className="p-2.5">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.items.slice(0, 15).map((item: any) => (
                            <tr key={item.rowNumber} className={item.isValid ? '' : 'bg-rose-50'}>
                              <td className="p-2.5 font-mono">{item.rowNumber}</td>
                              <td className="p-2.5 font-mono font-bold">{item.studentCode}</td>
                              <td className="p-2.5 font-bold">{item.fullName}</td>
                              <td className="p-2.5">{item.course}</td>
                              <td className="p-2.5">
                                {item.isValid ? (
                                  <span className="text-emerald-700 font-bold">✓ Válido</span>
                                ) : (
                                  <span className="text-rose-600 font-bold">{item.errors.join(', ')}</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || importPreview.validCount === 0}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isImporting ? 'Importando Base de Datos...' : `Confirmar e Importar ${importPreview.validCount} Estudiantes`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 6: REPORTES & ACTAS OFICIALES (PDF & Excel)
           =================================================================== */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <h2 className="text-xl font-black text-slate-900">Generación de Reportes y Actas</h2>
              <p className="text-xs text-slate-500">Descarga actas oficiales de escrutinio firmadas en PDF y hojas de cálculo para secretaría académica.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Reporte PDF */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Acta Oficial de Escrutinio (PDF)</h3>
                  <p className="text-xs text-slate-500">
                    Documento formal con membrete institucional, consolidado de votos válidos, votos en blanco, porcentajes de participación y campos de firma de jurados.
                  </p>
                </div>

                <button
                  onClick={handleExportActaPDF}
                  disabled={isGeneratingActa}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
                >
                  {isGeneratingActa ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generando Acta con Logo Oficial...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Descargar Acta en PDF con Logo Institucional
                    </>
                  )}
                </button>
              </div>

              {/* Reporte Excel */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900">Libro de Escrutinio (Excel)</h3>
                  <p className="text-xs text-slate-500">
                    Archivo Excel con 3 hojas estructuradas: Resumen General, Resultados Electorales por Candidato y Participación detallada por cada Curso.
                  </p>
                </div>

                <a
                  href={`/api/v1/admin/reports/${selectedElectionId}/export-excel`}
                  download
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow text-center"
                >
                  <Download className="w-4 h-4" />
                  Descargar Libro en Excel
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 7: AUDITORÍA Y REGISTRO DE MÁQUINAS DE VOTACIÓN
           =================================================================== */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <ShieldCheck className="w-6 h-6 text-sky-600" />
                  Auditoría y Registro de Máquinas
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Control y trazabilidad de los equipos, direcciones IP y navegadores desde donde los estudiantes emiten sus votos.
                </p>
              </div>

              {/* Subpestañas */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setAuditSubTab('MACHINES')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    auditSubTab === 'MACHINES'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-4 h-4 text-sky-600" />
                  <span>Máquinas de Votación</span>
                  {machineAudit && (
                    <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {machineAudit.summary.unique_stations}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuditSubTab('SYSTEM')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    auditSubTab === 'SYSTEM'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <History className="w-4 h-4 text-slate-600" />
                  <span>Acciones de Sistema</span>
                  <span className="bg-slate-300 text-slate-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {auditLogs.length}
                  </span>
                </button>
              </div>
            </div>

            {/* VISTA 1: AUDITORÍA DE MÁQUINAS Y EQUIPOS */}
            {auditSubTab === 'MACHINES' && (
              <div className="space-y-6">
                {/* 1. Tarjetas Resumen de Máquinas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">Equipos Registrados</span>
                      <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                        <Monitor className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {machineAudit?.summary.unique_stations ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Terminales / PCs utilizados</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">Votos Auditados</span>
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Vote className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {machineAudit?.summary.total_logged_votes ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Votos con huella técnica</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">Direcciones IP</span>
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Network className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {machineAudit?.summary.unique_ips ?? 0}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Redes / conexiones escolares</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500">Promedio Votos/PC</span>
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Cpu className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {machineAudit && machineAudit.summary.unique_stations > 0
                        ? (machineAudit.summary.total_logged_votes / machineAudit.summary.unique_stations).toFixed(1)
                        : '0'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Carga media por estación</p>
                  </div>
                </div>

                {/* Banner de Garantía Democrática */}
                <div className="bg-sky-50/80 border border-sky-200/80 rounded-2xl p-4 text-xs text-sky-900 flex items-start gap-3">
                  <div className="p-1 bg-sky-100 rounded-lg text-sky-700 shrink-0 mt-0.5">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="font-bold text-sky-950 block mb-0.5">
                      Garantía de Secreto de Voto y Auditoría Transparente:
                    </strong>
                    El sistema registra con precisión el identificador de la máquina, dirección IP, fecha/hora y curso del estudiante para prevenir fraudes, votos duplicados o suplantación en salas de sistemas. <strong>La opción de voto (candidato) nunca se vincula al equipo ni a la IP</strong>, manteniendo el secreto inviolable de la voluntad democrática.
                  </div>
                </div>

                {/* Barra de Acciones y Búsqueda */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={machineSearch}
                      onChange={(e) => setMachineSearch(e.target.value)}
                      placeholder="Buscar por equipo, IP, curso, SO..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => loadMachineAudit()}
                      disabled={loadingMachineAudit}
                      className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingMachineAudit ? 'animate-spin' : ''}`} />
                      <span>Actualizar</span>
                    </button>

                    <a
                      href={`/api/v1/admin/machine-audit/export${selectedElectionId ? `?election_id=${selectedElectionId}` : ''}`}
                      download
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Exportar Auditoría (Excel)</span>
                    </a>
                  </div>
                </div>

                {/* 2. Tabla de Estaciones / Equipos Resumidos */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Equipos y Terminales Detectados</h3>
                      <p className="text-[11px] text-slate-400">Detalle de cada máquina donde se realizaron votaciones</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      {machineAudit?.station_stats.length || 0} máquinas
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Identificador Equipo</th>
                          <th className="py-3 px-4">Dirección IP</th>
                          <th className="py-3 px-4">Dispositivo</th>
                          <th className="py-3 px-4">Sistema / Navegador</th>
                          <th className="py-3 px-4">Cursos Participantes</th>
                          <th className="py-3 px-4 text-center">Total Votos</th>
                          <th className="py-3 px-4">Última Votación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {(!machineAudit?.station_stats || machineAudit.station_stats.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              <Monitor className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                              <p className="font-bold text-sm text-slate-600">Aún no se han registrado votos en esta jornada.</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Cuando los estudiantes voten desde los computadores del colegio, aquí aparecerá el registro de cada equipo.
                              </p>
                            </td>
                          </tr>
                        ) : (
                          machineAudit.station_stats
                            .filter(st => {
                              if (!machineSearch.trim()) return true;
                              const q = machineSearch.toLowerCase();
                              return (
                                st.station_id.toLowerCase().includes(q) ||
                                st.ip_address.toLowerCase().includes(q) ||
                                st.device_type.toLowerCase().includes(q) ||
                                st.os_name.toLowerCase().includes(q) ||
                                st.courses_used.some(c => c.toLowerCase().includes(q))
                              );
                            })
                            .map((st) => {
                              const totalVotes = machineAudit.summary.total_logged_votes || 1;
                              const pct = Math.round((st.vote_count / totalVotes) * 100);
                              return (
                                <tr key={st.station_id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                        <Monitor className="w-3.5 h-3.5" />
                                      </div>
                                      <span>{st.station_id}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
                                      {st.ip_address}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {st.device_type}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600">
                                    <div className="font-semibold text-slate-800">{st.os_name}</div>
                                    <div className="text-[10px] text-slate-400">{st.browser_name}</div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {st.courses_used.slice(0, 6).map((crs) => (
                                        <span
                                          key={crs}
                                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-100"
                                        >
                                          {crs}
                                        </span>
                                      ))}
                                      {st.courses_used.length > 6 && (
                                        <span className="text-[10px] text-slate-400 font-bold self-center">
                                          +{st.courses_used.length - 6} más
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="inline-flex flex-col items-center">
                                      <span className="font-black text-slate-900 text-sm">{st.vote_count}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">({pct}%)</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                                    <div>{new Date(st.last_vote_at).toLocaleDateString()}</div>
                                    <div className="text-[10px] text-slate-400">{new Date(st.last_vote_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                  </td>
                                </tr>
                              );
                            })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Tabla Cronológica Detallada de Votos por Máquina */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Historial Cronológico de Votos por Equipo</h3>
                      <p className="text-[11px] text-slate-400">Últimos eventos registrados en las urnas electrónicas</p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Mostrando {machineAudit?.logs.length || 0} registros
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Fecha y Hora</th>
                          <th className="py-3 px-4">Terminal / Equipo</th>
                          <th className="py-3 px-4">Dirección IP</th>
                          <th className="py-3 px-4">Curso del Votante</th>
                          <th className="py-3 px-4">Dispositivo</th>
                          <th className="py-3 px-4">SO y Navegador</th>
                          <th className="py-3 px-4">Resolución</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {(!machineAudit?.logs || machineAudit.logs.length === 0) ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400">
                              Sin registros aún.
                            </td>
                          </tr>
                        ) : (
                          machineAudit.logs
                            .filter(log => {
                              if (!machineSearch.trim()) return true;
                              const q = machineSearch.toLowerCase();
                              return (
                                log.station_id.toLowerCase().includes(q) ||
                                log.ip_address.toLowerCase().includes(q) ||
                                log.student_course.toLowerCase().includes(q) ||
                                log.os_name.toLowerCase().includes(q) ||
                                log.browser_name.toLowerCase().includes(q)
                              );
                            })
                            .map(log => (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                  {new Date(log.voted_at).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-sky-800">
                                  {log.station_id}
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                                  {log.ip_address}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-100">
                                    {log.student_course}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-slate-600">
                                  {log.device_type}
                                </td>
                                <td className="py-2.5 px-4 text-slate-600">
                                  <span>{log.os_name}</span> • <span className="text-slate-400">{log.browser_name}</span>
                                </td>
                                <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">
                                  {log.screen_resolution}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: ACCIONES ADMINISTRATIVAS DEL SISTEMA */}
            {auditSubTab === 'SYSTEM' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Historial Inmutable de Acciones Administrativas</h3>
                    <p className="text-[11px] text-slate-400">Eventos de sesión, cambios de configuración, gestión de elecciones y estudiantes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadAuditLogs()}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    <span>Recargar</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Acción</th>
                        <th className="py-3 px-4">Detalles</th>
                        <th className="py-3 px-4">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            No hay acciones de sistema registradas.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{log.username}</td>
                            <td className="py-3 px-4 font-mono font-bold text-sky-800">{log.action}</td>
                            <td className="py-3 px-4 text-slate-600">{log.details}</td>
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ip_address}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
           PESTAÑA 8: CONFIGURACIÓN INSTITUCIONAL
           =================================================================== */}
        {activeTab === 'SETTINGS' && (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-900">Identidad Institucional del Colegio</h2>
              <p className="text-xs text-slate-500">Personaliza el nombre, logo y textos visibles en la estación de votación.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-black text-orange-900 mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Seguridad Perimetral (Filtro IP)
                </h3>
                <p className="text-xs text-orange-800 mb-3 leading-relaxed">
                  Restringe el acceso a la estación de votación para que solo funcione desde la red Wi-Fi o computadores del colegio.
                  <br /><strong>Tu IP actual es:</strong> <code className="bg-orange-100 px-1 rounded">{myIp}</code>
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="checkbox" 
                    id="restrict_by_ip"
                    checked={settingsForm.restrict_by_ip === 1}
                    onChange={e => setSettingsForm({ ...settingsForm, restrict_by_ip: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <label htmlFor="restrict_by_ip" className="text-xs font-bold text-orange-900 cursor-pointer">
                    Habilitar Restricción por IP
                  </label>
                </div>

                {settingsForm.restrict_by_ip === 1 && (
                  <div>
                    <label className="text-xs font-bold text-orange-800 block mb-1">IPs Permitidas (separadas por coma)</label>
                    <input
                      type="text"
                      value={settingsForm.allowed_ips || ''}
                      onChange={e => setSettingsForm({ ...settingsForm, allowed_ips: e.target.value })}
                      placeholder="Ej: 190.158.12.34, 200.14.55.1"
                      className="w-full bg-white border border-orange-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-[10px] text-orange-700 mt-1">Si dejas esto en blanco y activas la restricción, nadie podrá votar.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Oficial del Colegio</label>
                <input
                  type="text"
                  value={settingsForm.school_name || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, school_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Logo Institucional (Para Actas en PDF, Carnets y Estaciones)</label>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                    {settingsForm.logo_url ? (
                      <img
                        src={settingsForm.logo_url}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-300"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Subir imagen de logo (PNG / SVG / JPG)
                    </button>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400">O ingresa la URL directa abajo:</p>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="https://..."
                  value={settingsForm.logo_url || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, logo_url: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Texto Pie de Página en Estaciones</label>
                <input
                  type="text"
                  value={settingsForm.footer_text || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, footer_text: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow transition-colors cursor-pointer"
                >
                  {savingSettings ? 'Guardando...' : 'Guardar Ajustes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Modal de Carnet Individual con QR firmado */}
      <StudentCardModal
        isOpen={isCarnetModalOpen}
        onClose={() => setIsCarnetModalOpen(false)}
        student={carnetStudent}
        schoolName={settings?.school_name}
      />

      {/* Modal Crear / Editar Elección */}
      <ElectionModal
        isOpen={isNewElectionModalOpen}
        onClose={() => {
          setIsNewElectionModalOpen(false);
          setElectionToEdit(null);
        }}
        onSave={handleSaveElection}
        election={electionToEdit}
      />

      {/* Modal Crear / Editar Candidato con Soporte de Foto Local y URL */}
      <CandidateModal
        isOpen={isCandidateModalOpen}
        onClose={() => {
          setIsCandidateModalOpen(false);
          setCandidateToEdit(null);
        }}
        onSave={handleSaveCandidate}
        candidate={candidateToEdit}
        defaultListNumber={candidates.length + 1}
      />

      {/* Modal Nuevo Estudiante */}
      {isNewStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-slate-900">Agregar Estudiante al Censo</h3>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Código ID / Carnet *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 20260101"
                  value={studentForm.student_code}
                  onChange={e => setStudentForm({ ...studentForm, student_code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={studentForm.full_name}
                  onChange={e => setStudentForm({ ...studentForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Grado *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.grade}
                    onChange={e => setStudentForm({ ...studentForm, grade: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Curso *</label>
                  <input
                    type="text"
                    required
                    value={studentForm.course}
                    onChange={e => setStudentForm({ ...studentForm, course: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewStudentModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 rounded-xl font-bold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-slate-900 text-white rounded-xl font-bold"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
