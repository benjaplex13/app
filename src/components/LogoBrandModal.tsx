import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Smartphone, 
  Layout, 
  Sun, 
  Moon, 
  Compass, 
  Search, 
  ExternalLink,
  Eye
} from 'lucide-react';
import { RumbioLogo, LogoConcept, LogoVariant } from './RumbioLogo';

// Reference image imports
import appIconImg from '../assets/images/rumbio_app_icon_1786927776966.jpg';
import brandShowcaseImg from '../assets/images/rumbio_brand_showcase_1786927788993.jpg';
import conceptsGridImg from '../assets/images/rumbio_concepts_grid_1786927802747.jpg';

interface LogoBrandModalProps {
  currentConcept: LogoConcept;
  onSelectConcept: (concept: LogoConcept) => void;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const LogoBrandModal: React.FC<LogoBrandModalProps> = ({
  currentConcept,
  onSelectConcept,
  onClose,
  onShowToast,
}) => {
  const [selectedConcept, setSelectedConcept] = useState<LogoConcept>(currentConcept);
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'concepts' | 'variants' | 'mockups'>('variants');

  const conceptsMeta: Record<LogoConcept, { title: string; subtitle: string; description: string; tag: string }> = {
    'growth-compass': {
      title: 'Concepto 1: Rumbo Alcista (Recomendado)',
      subtitle: 'Brújula Cardinal + Flecha de Crecimiento Financiero (45°)',
      description: 'El concepto insignia. Fusiona una brújula minimalista con una aguja geométrica facetada que apunta a 45° (Noreste), transmitiendo dirección geográfica y avance financiero positivo. El aro exterior evoca una moneda y las latitudes del planeta.',
      tag: 'Principal / Flagship',
    },
    'cardinal-coin': {
      title: 'Concepto 2: Moneda Cardinal',
      subtitle: 'Disco de Acuñación + Aguja Central',
      description: 'Enfocado en la solidez bancaria. Una moneda circular grabada con las 4 coordenadas cardinales y una flecha interior ascendente que denota control de presupuesto.',
      tag: 'Fintech Clásico',
    },
    'flow-arrow': {
      title: 'Concepto 3: Flujo & Divisa',
      subtitle: 'Doble Arco de Intercambio + Vector Norte',
      description: 'Transmite el flujo de divisas internacionales mediante dos arcos envolventes sincronizados que convergen en un vector de navegación central.',
      tag: 'Dinámico & Fluido',
    },
    'prism': {
      title: 'Concepto 4: Prisma Vectorial',
      subtitle: 'Rosa de los Vientos Facetada',
      description: 'Geometría pura de líneas depuradas. Ideal para un perfil ultra-moderno y minimalista de alta precisión tecnológica.',
      tag: 'Geometría Pura',
    },
  };

  const generateSVGCode = (concept: LogoConcept, variant: LogoVariant) => {
    // Return clean stand-alone SVG string ready to copy/paste
    const isMonoWhite = variant === 'monochrome-white';
    const isMonoDark = variant === 'monochrome-dark';
    const pColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A192F' : '#2563EB';
    const aColor = isMonoWhite ? '#E2E8F0' : isMonoDark ? '#1E293B' : '#06B6D4';
    const tColor = isMonoWhite ? '#FFFFFF' : isMonoDark ? '#0A192F' : '#FFFFFF';

    if (variant === 'horizontal') {
      return `<svg width="180" height="48" viewBox="0 0 180 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(0, 4)">
    <circle cx="20" cy="20" r="18" stroke="${pColor}" stroke-width="2.5" stroke-dasharray="88 8" stroke-linecap="round" />
    <circle cx="20" cy="20" r="14" stroke="${aColor}" stroke-width="1.2" stroke-dasharray="16 72" opacity="0.6" />
    <circle cx="6" cy="20" r="1.5" fill="${aColor}" />
    <circle cx="20" cy="34" r="1.5" fill="${aColor}" />
    <path d="M 20 20 L 11 25 L 29 11 Z" fill="${pColor}" />
    <path d="M 20 20 L 29 11 L 25 29 Z" fill="${aColor}" />
    <circle cx="20" cy="20" r="2.2" fill="#FFFFFF" />
  </g>
  <text x="50" y="29" font-family="Plus Jakarta Sans, system-ui, sans-serif" font-size="22" font-weight="800" fill="${tColor}" letter-spacing="-0.5">Rumbio</text>
  <circle cx="134" cy="26" r="2.5" fill="${aColor}" />
</svg>`;
    }

    return `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="44" stroke="${pColor}" stroke-width="6" stroke-dasharray="210 20" stroke-linecap="round" />
  <circle cx="50" cy="50" r="34" stroke="${aColor}" stroke-width="2.5" stroke-dasharray="40 180" opacity="0.6" />
  <circle cx="16" cy="50" r="3" fill="${aColor}" />
  <circle cx="50" cy="84" r="3" fill="${aColor}" />
  <path d="M 50 50 L 29 63 L 73 27 Z" fill="${pColor}" />
  <path d="M 50 50 L 73 27 L 63 71 Z" fill="${aColor}" />
  <circle cx="50" cy="50" r="5.5" fill="#FFFFFF" />
  <circle cx="50" cy="50" r="3" fill="${pColor}" />
</svg>`;
  };

  const handleCopySVG = (variantName: string, variant: LogoVariant) => {
    const code = generateSVGCode(selectedConcept, variant);
    navigator.clipboard.writeText(code);
    setCopiedVariant(variantName);
    onShowToast(`¡Código SVG de "${variantName}" copiado al portapapeles!`, 'success');
    setTimeout(() => setCopiedVariant(null), 2500);
  };

  const handleDownloadSVG = (variantName: string, variant: LogoVariant) => {
    const code = generateSVGCode(selectedConcept, variant);
    const blob = new Blob([code], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rumbio-logo-${selectedConcept}-${variant}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast(`Archivo SVG descargado (${variantName}).`, 'success');
  };

  const handleApplyConcept = () => {
    onSelectConcept(selectedConcept);
    onShowToast(`¡Concepto "${conceptsMeta[selectedConcept].title.split(':')[1]}" aplicado como logo activo!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#070b15] w-full max-w-5xl rounded-[36px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-950/40 via-transparent to-transparent">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-cyan-400 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/10">
              <RumbioLogo concept={selectedConcept} variant="icon" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
                  Identidad Visual & Sistema de Logo
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-500/30">
                  Rumbio v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Fintech de viajes: Navegación cardinal, control financiero y diseño vectorial escalable.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyConcept}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-xl shadow-blue-600/25 transition active:scale-95 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-emerald-300" />
              <span>Aplicar en la App</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-2xl hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 sm:px-8 border-b border-white/5 flex gap-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'variants'
                ? 'border-blue-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-4 h-4" />
            <span>Variantes Solicitadas</span>
          </button>

          <button
            onClick={() => setActiveTab('concepts')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'concepts'
                ? 'border-blue-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4 Conceptos de Diseño</span>
          </button>

          <button
            onClick={() => setActiveTab('mockups')}
            className={`py-3.5 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'mockups'
                ? 'border-blue-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Presentación Visual & App Icon</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-8">
          
          {/* TAB 1: ALL REQUIRED VARIANTS */}
          {activeTab === 'variants' && (
            <div className="space-y-6">
              {/* Concept Selector Pill Row */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-2 rounded-2xl border border-white/5">
                <span className="text-[11px] font-bold text-slate-400 px-3 uppercase tracking-wider">Concepto activo:</span>
                {(['growth-compass', 'cardinal-coin', 'flow-arrow', 'prism'] as LogoConcept[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedConcept(c)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedConcept === c
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {conceptsMeta[c].tag}
                  </button>
                ))}
              </div>

              {/* 4 Primary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Ícono solo (App Icon) */}
                <div className="bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col justify-between group hover:border-blue-500/30 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        1. Ícono Solo (App Store / Android)
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">1:1 Cuadrado</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Símbolo geométrico autónomo, altamente reconocible sin texto. Fondo transparente o con contenedor app.
                    </p>

                    {/* Preview Box */}
                    <div className="h-44 rounded-2xl bg-[#0b1222] border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-blue-500/20 transition">
                      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-40" />
                      <div className="w-24 h-24 rounded-3xl bg-[#050811] border border-white/10 flex items-center justify-center shadow-2xl shadow-blue-900/30 relative z-10">
                        <RumbioLogo concept={selectedConcept} variant="icon" size={56} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => handleCopySVG('Ícono Solo', 'icon')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedVariant === 'Ícono Solo' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedVariant === 'Ícono Solo' ? '¡Copiado!' : 'Copiar SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSVG('icon', 'icon')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Descargar SVG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. Versión Horizontal (Header Web) */}
                <div className="bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col justify-between group hover:border-blue-500/30 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-blue-400" />
                        2. Logo Horizontal (Header / Web)
                      </span>
                      <span className="text-[10px] text-cyan-400 font-mono">Ícono + Wordmark</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Composición horizontal con tipografía moderna sans-serif semibold (Plus Jakarta Sans) para barras de navegación.
                    </p>

                    {/* Preview Box */}
                    <div className="h-44 rounded-2xl bg-[#050811] border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-blue-500/20 transition px-6">
                      <RumbioLogo concept={selectedConcept} variant="horizontal" size={40} showTagline={true} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => handleCopySVG('Logo Horizontal', 'horizontal')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedVariant === 'Logo Horizontal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedVariant === 'Logo Horizontal' ? '¡Copiado!' : 'Copiar SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSVG('horizontal', 'horizontal')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Descargar SVG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 3. Versión Monocromática Blanco (Fondos Oscuros) */}
                <div className="bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col justify-between group hover:border-blue-500/30 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-blue-400" />
                        3. Monocromo Blanco (Fondo Oscuro)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Color White</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Versión simplificada en blanco puro (#FFFFFF) para fondos oscuros, impresiones monocromáticas o serigrafía.
                    </p>

                    {/* Preview Box */}
                    <div className="h-44 rounded-2xl bg-[#000000] border border-white/10 flex items-center justify-center relative overflow-hidden">
                      <RumbioLogo concept={selectedConcept} variant="monochrome-white" size={42} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => handleCopySVG('Monocromo Blanco', 'monochrome-white')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedVariant === 'Monocromo Blanco' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedVariant === 'Monocromo Blanco' ? '¡Copiado!' : 'Copiar SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSVG('monochrome-white', 'monochrome-white')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Descargar SVG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4. Versión Monocromática Azul Oscuro (Fondos Claros) */}
                <div className="bg-slate-900/40 rounded-[28px] border border-white/5 p-6 flex flex-col justify-between group hover:border-blue-500/30 transition">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        4. Monocromo Azul Oscuro (Fondo Claro)
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">1-Color Navy</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                      Versión en azul noche profundo (#0A192F) para fondos claros, facturas, comprobantes de pago y reportes en papel.
                    </p>

                    {/* Preview Box */}
                    <div className="h-44 rounded-2xl bg-[#FFFFFF] border border-slate-200 flex items-center justify-center relative overflow-hidden">
                      <RumbioLogo concept={selectedConcept} variant="monochrome-dark" size={42} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-white/5">
                    <button
                      onClick={() => handleCopySVG('Monocromo Azul Oscuro', 'monochrome-dark')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      {copiedVariant === 'Monocromo Azul Oscuro' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedVariant === 'Monocromo Azul Oscuro' ? '¡Copiado!' : 'Copiar SVG'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadSVG('monochrome-dark', 'monochrome-dark')}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                      title="Descargar SVG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Favicon & Micro-Scale Legibility Tester (16px, 24px, 32px, 48px) */}
              <div className="bg-slate-900/50 rounded-[28px] border border-white/5 p-6">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-400" /> Test de Legibilidad a Micro-Escala (Favicon 16x16px)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verificación de contraste y geometría limpia en pestañas de navegador y notificaciones móviles.
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-semibold">
                    100% Vectorial Nítido
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  {/* 16px */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">16 x 16 px (Favicon)</span>
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center border border-white/10">
                      <RumbioLogo concept={selectedConcept} variant="icon" size={16} />
                    </div>
                  </div>

                  {/* 24px */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">24 x 24 px (Tab Bar)</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                      <RumbioLogo concept={selectedConcept} variant="icon" size={24} />
                    </div>
                  </div>

                  {/* 32px */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">32 x 32 px (Navbar)</span>
                    <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-white/10">
                      <RumbioLogo concept={selectedConcept} variant="icon" size={32} />
                    </div>
                  </div>

                  {/* 48px */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center flex flex-col items-center justify-center gap-3">
                    <span className="text-[10px] text-slate-500 uppercase font-mono">48 x 48 px (Desktop Icon)</span>
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-white/10">
                      <RumbioLogo concept={selectedConcept} variant="icon" size={48} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 4 CONCEPT COMPARISON MATRIX */}
          {activeTab === 'concepts' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(['growth-compass', 'cardinal-coin', 'flow-arrow', 'prism'] as LogoConcept[]).map((conceptKey) => {
                  const meta = conceptsMeta[conceptKey];
                  const isSelected = selectedConcept === conceptKey;

                  return (
                    <div
                      key={conceptKey}
                      onClick={() => setSelectedConcept(conceptKey)}
                      className={`p-6 rounded-[28px] border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-950/30 border-blue-500 shadow-xl shadow-blue-600/10'
                          : 'bg-slate-900/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'
                          }`}>
                            {meta.tag}
                          </span>

                          <div className="w-14 h-14 rounded-2xl bg-[#050811] border border-white/10 flex items-center justify-center shadow-lg">
                            <RumbioLogo concept={conceptKey} variant="icon" size={36} />
                          </div>
                        </div>

                        <h4 className="text-base font-bold text-white font-display mb-1">{meta.title}</h4>
                        <p className="text-xs text-cyan-400 font-medium mb-3">{meta.subtitle}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{meta.description}</p>
                      </div>

                      <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <RumbioLogo concept={conceptKey} variant="horizontal" size={24} />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConcept(conceptKey);
                            onSelectConcept(conceptKey);
                            onShowToast(`Concepto "${meta.tag}" activado como principal.`, 'success');
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ Activo' : 'Seleccionar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Concepts Render Board Image */}
              <div className="rounded-[28px] overflow-hidden border border-white/10 shadow-2xl">
                <div className="p-4 bg-slate-900/90 border-b border-white/5 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-400" /> Matriz Comparativa de Conceptos Generados
                  </span>
                  <span className="text-[10px] text-cyan-400">Render Alta Definición</span>
                </div>
                <img
                  src={conceptsGridImg}
                  alt="Conceptos de Logo Rumbio"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover max-h-96"
                />
              </div>
            </div>
          )}

          {/* TAB 3: VISUAL PRESENTATION & MOCKUPS */}
          {activeTab === 'mockups' && (
            <div className="space-y-6">
              {/* Brand Showcase Board */}
              <div className="rounded-[28px] overflow-hidden border border-white/10 shadow-2xl">
                <div className="p-4 bg-slate-900/90 border-b border-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                      Tablero de Identidad de Marca Rumbio
                    </h4>
                    <p className="text-[11px] text-slate-400">Variantes cromáticas, cuadrícula geométrica y logotipo principal</p>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400">16:9 Showcase Board</span>
                </div>
                <img
                  src={brandShowcaseImg}
                  alt="Rumbio Brand Identity Showcase"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover"
                />
              </div>

              {/* App Icon Visual Mockup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="rounded-[28px] overflow-hidden border border-white/10 shadow-2xl">
                  <div className="p-4 bg-slate-900/90 border-b border-white/5">
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                      Ícono de App Móvil (iOS & Android)
                    </h4>
                  </div>
                  <img
                    src={appIconImg}
                    alt="Rumbio Mobile App Icon"
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-cover"
                  />
                </div>

                <div className="bg-slate-900/40 p-6 rounded-[28px] border border-white/5 space-y-4">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-400" /> Especificaciones Técnicas del Icono
                  </h4>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span><b>Geometría Continua:</b> Grosor de trazo uniforme (6px proporcional) para máxima legibilidad sin distorsión.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span><b>Ángulo de Navegación a 45°:</b> Evoca el norte geográfico en orientación diagonal que psicológicamente representa crecimiento financiero alcista.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span><b>Gama Cromática:</b> Azul Cobalto Eléctrico (#2563EB) de base fintech + Acento Cian (#06B6D4) de vanguardia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span><b>Tipografía de Acompañamiento:</b> Plus Jakarta Sans / Inter Semibold, con tracking óptico de -0.5px.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-6 bg-slate-950/80 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Formatos listos para producción: SVG Vectorial, 16x16 Favicon y App Store Icon.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyConcept}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl transition"
            >
              Aplicar Concepto "{conceptsMeta[selectedConcept].tag}"
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
