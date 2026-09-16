import { Printer, ChevronLeft } from 'lucide-react';
import step1Img from '../../assets/images/manual_step1_qr_1789567136761.jpg';
import step2Img from '../../assets/images/manual_step2_select_1789567153830.jpg';
import step3Img from '../../assets/images/manual_step3_confirm_1789567179762.jpg';
import step4Img from '../../assets/images/manual_step4_success_1789567198124.jpg';

interface ManualPageProps {
  onBack: () => void;
}

export function ManualPage({ onBack }: ManualPageProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Barra de Controles - No visible en impresión */}
      <div className="print:hidden bg-white border-b border-slate-200 p-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-bold text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          Volver
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all"
        >
          <Printer className="w-4 h-4" />
          Guardar como PDF / Imprimir
        </button>
      </div>

      {/* Contenido del Manual (A4 aprox) */}
      <div className="max-w-4xl mx-auto p-8 sm:p-12 print:p-0 bg-white sm:my-8 sm:shadow-lg sm:rounded-2xl print:shadow-none print:my-0">
        
        {/* Cabecera */}
        <div className="text-center mb-12 border-b-4 border-sky-500 pb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-4 uppercase tracking-tight">
            Manual del Votante
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
            Guía paso a paso para ejercer tu derecho al voto en la estación electrónica escolar. Es rápido, fácil y seguro.
          </p>
        </div>

        {/* Pasos */}
        <div className="space-y-16">
          
          {/* Paso 1 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-2xl font-black shrink-0">
                  1
                </div>
                <h2 className="text-2xl font-black text-slate-800">Escanea tu Carnet</h2>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                Acércate a la estación de votación con tu <strong>Carnet Estudiantil</strong>. Muestra el <strong>Código QR</strong> de tu carnet frente a la cámara de la pantalla para identificarte.
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <img src={step1Img} alt="Paso 1: Escanear carnet" className="rounded-2xl shadow-md border border-slate-100 w-full object-cover aspect-video" />
            </div>
          </div>

          {/* Paso 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-2xl font-black shrink-0">
                  2
                </div>
                <h2 className="text-2xl font-black text-slate-800">Elige a tu Candidato</h2>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                En la pantalla aparecerán los candidatos postulados. Toca la <strong>foto o tarjeta</strong> del candidato de tu preferencia, o selecciona la opción de "Voto en Blanco".
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <img src={step2Img} alt="Paso 2: Elegir candidato" className="rounded-2xl shadow-md border border-slate-100 w-full object-cover aspect-video" />
            </div>
          </div>

          {/* Paso 3 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl font-black shrink-0">
                  3
                </div>
                <h2 className="text-2xl font-black text-slate-800">Confirma tu Voto</h2>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                El sistema te mostrará tu selección para que la revises. Si es correcta, presiona el botón verde <strong>"Confirmar Voto"</strong>. Si te equivocaste, puedes volver atrás.
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <img src={step3Img} alt="Paso 3: Confirmar voto" className="rounded-2xl shadow-md border border-slate-100 w-full object-cover aspect-video" />
            </div>
          </div>

          {/* Paso 4 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-black shrink-0">
                  4
                </div>
                <h2 className="text-2xl font-black text-slate-800">¡Votación Exitosa!</h2>
              </div>
              <p className="text-slate-600 text-lg leading-relaxed">
                Verás un mensaje de éxito en pantalla confirmando que tu voto ha sido guardado de forma segura y secreta. <strong>¡Ya puedes retirarte de la estación!</strong>
              </p>
            </div>
            <div className="md:w-1/2 w-full">
              <img src={step4Img} alt="Paso 4: Votación exitosa" className="rounded-2xl shadow-md border border-slate-100 w-full object-cover aspect-video" />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
          <p>Sistema de Votación Escolar • Tu voto es secreto y seguro</p>
        </div>

      </div>
    </div>
  );
}
