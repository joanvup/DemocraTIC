import { useState, useEffect, useRef, ChangeEvent, DragEvent, FormEvent } from 'react';
import { Candidate } from '../../../shared/types.js';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  Trash2, 
  Check, 
  AlertCircle, 
  RefreshCw,
  User
} from 'lucide-react';

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (candidateData: Partial<Candidate>) => Promise<void>;
  candidate?: Candidate | null;
  defaultListNumber?: number;
}

// Función auxiliar para optimizar y redimensionar imágenes locales a Data URL liviano
async function processAndCompressImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen válida (debe ser JPG, PNG, WEBP o GIF).');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800; // Resolución óptima para tarjetón y carnet
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve(dataUrl);
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function CandidateModal({
  isOpen,
  onClose,
  onSave,
  candidate,
  defaultListNumber = 1
}: CandidateModalProps) {
  const [formData, setFormData] = useState({
    full_name: '',
    student_course: '11A',
    list_number: defaultListNumber,
    slogan: '',
    description: '',
    photo_url: '',
    is_active: 1
  });

  const [photoSourceMode, setPhotoSourceMode] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (candidate) {
        setFormData({
          full_name: candidate.full_name,
          student_course: candidate.student_course,
          list_number: candidate.list_number,
          slogan: candidate.slogan || '',
          description: candidate.description || '',
          photo_url: candidate.photo_url || '',
          is_active: candidate.is_active ?? 1
        });
        setPhotoSourceMode(candidate.photo_url?.startsWith('data:') ? 'file' : (candidate.photo_url ? 'url' : 'file'));
        setFileName(candidate.photo_url?.startsWith('data:') ? 'Foto local cargada' : null);
      } else {
        setFormData({
          full_name: '',
          student_course: '11A',
          list_number: defaultListNumber,
          slogan: '',
          description: '',
          photo_url: '',
          is_active: 1
        });
        setPhotoSourceMode('file');
        setFileName(null);
      }
      setImageError(null);
      setIsProcessingImage(false);
    }
  }, [isOpen, candidate, defaultListNumber]);

  if (!isOpen) return null;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setIsProcessingImage(true);
      setImageError(null);
      const dataUrl = await processAndCompressImage(file);
      setFormData(prev => ({ ...prev, photo_url: dataUrl }));
      setFileName(file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al procesar la imagen';
      setImageError(msg);
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const handleRemovePhoto = () => {
    setFormData(prev => ({ ...prev, photo_url: '' }));
    setFileName(null);
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      alert('Por favor ingresa el nombre del candidato');
      return;
    }
    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar candidato';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="candidate_modal_backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 my-8 space-y-5">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-lg text-slate-900">
              {candidate ? 'Editar Candidato' : 'Registrar Nuevo Candidato'}
            </h3>
            <p className="text-xs text-slate-500">
              Complete los datos oficiales para el tarjetón electoral.
            </p>
          </div>
          <button
            id="close_candidate_modal_btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Nombre Completo */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nombre Completo del Candidato *</label>
            <input
              id="candidate_full_name_input"
              type="text"
              required
              placeholder="Ej. Isabella Rodríguez Martínez"
              value={formData.full_name}
              onChange={e => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Tarjetón y Curso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Número en Tarjetón *</label>
              <input
                id="candidate_list_number_input"
                type="number"
                min="1"
                max="99"
                required
                value={formData.list_number}
                onChange={e => setFormData({ ...formData, list_number: parseInt(e.target.value, 10) || 1 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Curso / Grado *</label>
              <input
                id="candidate_course_input"
                type="text"
                required
                placeholder="Ej. 11A o Grado 11"
                value={formData.student_course}
                onChange={e => setFormData({ ...formData, student_course: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Lema / Slogan */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Lema o Slogan de Campaña</label>
            <input
              id="candidate_slogan_input"
              type="text"
              placeholder="Ej. 'Liderazgo, transparencia e inclusión estudiantil'"
              value={formData.slogan}
              onChange={e => setFormData({ ...formData, slogan: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* SECCIÓN DE FOTOGRAFÍA: SUBIR ARCHIVO LOCAL O URL */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-600" />
                Fotografía Oficial del Candidato
              </label>

              {/* Selector de Modo */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  id="tab_photo_file"
                  onClick={() => setPhotoSourceMode('file')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    photoSourceMode === 'file'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  Archivo Local
                </button>
                <button
                  type="button"
                  id="tab_photo_url"
                  onClick={() => setPhotoSourceMode('url')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    photoSourceMode === 'url'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  URL Web
                </button>
              </div>
            </div>

            {/* VISTA PREVIA SI YA HAY FOTO */}
            {formData.photo_url ? (
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-300 flex-shrink-0">
                  <img
                    src={formData.photo_url}
                    alt="Vista previa"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    #{formData.list_number}
                  </div>
                </div>

                <div className="flex-grow min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Foto lista para el tarjetón</span>
                  </div>
                  {fileName && (
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {fileName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="change_candidate_photo_btn"
                      onClick={() => {
                        if (photoSourceMode === 'file') {
                          fileInputRef.current?.click();
                        } else {
                          const input = document.getElementById('candidate_url_input') as HTMLInputElement;
                          input?.focus();
                        }
                      }}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                    >
                      Cambiar foto
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      id="remove_candidate_photo_btn"
                      onClick={handleRemovePhoto}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* MODO 1: SUBIR ARCHIVO LOCAL */}
            {photoSourceMode === 'file' && !formData.photo_url && (
              <div>
                <input
                  ref={fileInputRef}
                  id="candidate_photo_file_input"
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-sky-500 bg-sky-50/80 scale-[1.01]'
                      : 'border-slate-300 hover:border-sky-400 bg-white hover:bg-slate-50/60'
                  }`}
                >
                  {isProcessingImage ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2">
                      <RefreshCw className="w-6 h-6 text-sky-600 animate-spin" />
                      <p className="font-bold text-slate-700">Optimizando imagen local...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">
                          Arrastra tu foto aquí o <span className="text-sky-600 underline">haz clic para examinar</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Soporta formatos JPG, PNG o WEBP (máx. 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MODO 2: INGRESAR URL */}
            {photoSourceMode === 'url' && !formData.photo_url && (
              <div className="space-y-2">
                <input
                  id="candidate_url_input"
                  type="url"
                  placeholder="https://ejemplo.com/fotos/candidato.jpg"
                  value={formData.photo_url}
                  onChange={e => setFormData({ ...formData, photo_url: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500">
                  Ingresa un enlace directo a una imagen pública en internet.
                </p>
              </div>
            )}

            {imageError && (
              <div className="bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs flex items-center gap-2 border border-rose-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <button
              id="cancel_candidate_btn"
              type="button"
              onClick={onClose}
              className="w-1/2 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="save_candidate_btn"
              type="submit"
              disabled={isSubmitting || isProcessingImage}
              className="w-1/2 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>{candidate ? 'Actualizar Candidato' : 'Registrar Candidato'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
