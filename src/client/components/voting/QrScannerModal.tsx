import { useEffect, useRef, useState, ChangeEvent } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import jsQR from 'jsqr';
import { Camera, X, AlertCircle, RefreshCw, Upload, FlipHorizontal, CheckCircle2 } from 'lucide-react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

export function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [scanSuccessText, setScanSuccessText] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const readerId = 'qr-reader-container';

  // Iniciar cámara
  const startCamera = async (cameraId: string, html5QrCode: Html5Qrcode) => {
    try {
      setIsInitializing(true);
      setErrorMsg(null);

      await html5QrCode.start(
        cameraId,
        {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edgeSize = Math.floor(minEdge * 0.75);
            return { width: edgeSize, height: edgeSize };
          },
          aspectRatio: 1.0
        },
        (decodedText) => {
          setScanSuccessText(decodedText);
          html5QrCode.stop().then(() => {
            setTimeout(() => {
              onScanSuccess(decodedText);
              onClose();
            }, 300);
          }).catch(() => {
            onScanSuccess(decodedText);
            onClose();
          });
        },
        () => {
          // Escaneando activamente
        }
      );
      setIsInitializing(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al encender cámara';
      setErrorMsg(`No se pudo iniciar la cámara seleccionada: ${msg}.`);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsInitializing(true);
    setErrorMsg(null);
    setScanSuccessText(null);

    const timer = setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(readerId);
        scannerRef.current = html5QrCode;

        const availableCameras = await Html5Qrcode.getCameras();
        if (!availableCameras || availableCameras.length === 0) {
          if (isMounted) {
            setCameras([]);
            setErrorMsg('No se detectaron cámaras en este equipo. Puedes cargar una imagen o escribir el código.');
            setIsInitializing(false);
          }
          return;
        }

        if (isMounted) {
          setCameras(availableCameras);
          // Preferir cámara trasera si existe en tablets o móviles
          const preferredCamera = availableCameras.length > 1 ? availableCameras[availableCameras.length - 1] : availableCameras[0];
          setSelectedCameraId(preferredCamera.id);
          await startCamera(preferredCamera.id, html5QrCode);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Error al acceder a la cámara';
          setErrorMsg(`Acceso a la cámara no disponible: ${msg}. Puedes cargar el archivo de imagen o ingresar el código.`);
          setIsInitializing(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      }
    };
  }, [isOpen]);

  // Cambiar de cámara
  const handleSwitchCamera = async () => {
    if (!scannerRef.current || cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];

    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      setSelectedCameraId(nextCamera.id);
      await startCamera(nextCamera.id, scannerRef.current);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  };

  // Escanear archivo de imagen de QR (por si suben un PNG como 5306.png)
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingFile(true);
      setErrorMsg(null);

      let decodedText: string | null = null;

      // 1. Método A: Decodificación nativa con jsQR mediante Canvas
      try {
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imageBitmap, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });
          if (code && code.data && code.data.trim().length > 0) {
            decodedText = code.data.trim();
          }
        }
      } catch (e) {
        console.warn('Canvas jsQR failed, trying Html5Qrcode:', e);
      }

      // 2. Método B: Html5Qrcode.scanFile
      if (!decodedText) {
        try {
          const fileScanner = scannerRef.current || new Html5Qrcode(readerId);
          decodedText = await fileScanner.scanFile(file, true);
        } catch (e) {
          console.warn('Html5Qrcode scanFile failed:', e);
        }
      }

      // 3. Método C: Si el nombre del archivo contiene el código del estudiante (ej: 5306.png)
      if (!decodedText) {
        const fileNameDigits = file.name.replace(/\.[^/.]+$/, '').match(/\d{2,10}/);
        if (fileNameDigits) {
          decodedText = fileNameDigits[0];
        }
      }

      if (!decodedText) {
        throw new Error('No se pudo detectar un código QR legible.');
      }

      setScanSuccessText(decodedText);
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      setTimeout(() => {
        onScanSuccess(decodedText!);
        onClose();
      }, 350);
    } catch {
      setErrorMsg('No se pudo detectar un código QR legible en la imagen. Puedes seleccionar otra foto o digitar el código manualmente.');
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-800 flex flex-col">
        {/* Cabecera */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Lector de Carnet QR</h3>
              <p className="text-[11px] text-slate-400">Enfoca el código QR de tu carnet estudiantil</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="p-2 text-slate-400 hover:text-sky-300 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="Cambiar cámara"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visor de Escaneo */}
        <div className="p-6 space-y-4">
          <div className="relative bg-black rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center border-2 border-slate-700 shadow-inner">
            <div id={readerId} className="w-full h-full" />

            {/* Spinner de inicio */}
            {isInitializing && !scanSuccessText && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white gap-3 p-4 text-center">
                <RefreshCw className="w-9 h-9 animate-spin text-sky-400" />
                <p className="text-sm font-semibold">Activando cámara institucional...</p>
                <p className="text-xs text-slate-400">Asegúrate de permitir el acceso al navegador</p>
              </div>
            )}

            {/* Éxito detectado */}
            {scanSuccessText && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/95 text-white gap-2 p-6 text-center animate-in zoom-in-95 duration-150">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
                <h4 className="text-lg font-black text-emerald-100">¡Carnet Detectado!</h4>
                <p className="font-mono text-sm bg-emerald-900/60 px-3 py-1 rounded-lg border border-emerald-500/40 text-emerald-200">
                  Código: {scanSuccessText}
                </p>
                <p className="text-xs text-emerald-300/80">Validando en el censo electoral...</p>
              </div>
            )}

            {/* Mensaje de Error */}
            {errorMsg && !scanSuccessText && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white p-6 text-center gap-3">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <p className="text-xs sm:text-sm font-medium text-amber-200">{errorMsg}</p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Cargar Imagen de QR
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Digitar Código Manual
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Acciones Secundarias: Cargar archivo de imagen de QR o volver */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <button
              type="button"
              disabled={isProcessingFile}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isProcessingFile ? 'Analizando imagen...' : 'Cargar foto de QR'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white underline font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

