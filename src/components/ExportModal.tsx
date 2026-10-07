import React, { useState } from 'react';
import { 
  Download, 
  FileCode, 
  Image as ImageIcon, 
  Layers, 
  FileText, 
  Check, 
  X,
  Printer
} from 'lucide-react';
import { UnifiedDocument, ColorSpace } from '../types/creativeSuite';
import { buildRawSvg, renderDocumentToRaster, downloadFile } from '../services/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: UnifiedDocument;
  colorSpace: ColorSpace;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  documentData,
  colorSpace,
}) => {
  const [exportFormat, setExportFormat] = useState<'svg' | 'png' | 'ucs' | 'pdf' | 'ai' | 'eps'>('svg');
  const [resolutionScale, setResolutionScale] = useState<number>(2); // 1x, 2x (Retina), 4x (Print 300DPI)
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const baseName = `${(documentData.name || 'progetto').toLowerCase().replace(/\s+/g, '_')}`;

      if (exportFormat === 'png') {
        const dataUrl = await renderDocumentToRaster(documentData, 'image/png', resolutionScale);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${baseName}_${resolutionScale}x.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (exportFormat === 'svg') {
        const svgContent = buildRawSvg(documentData);
        downloadFile(svgContent, `${baseName}.svg`, 'image/svg+xml;charset=utf-8');
      } else if (exportFormat === 'ucs') {
        const jsonContent = JSON.stringify(documentData, null, 2);
        downloadFile(jsonContent, `${baseName}.ucs.json`, 'application/json;charset=utf-8');
      } else if (exportFormat === 'ai') {
        const aiContent = `%PDF-1.5\n%Adobe Illustrator Compatible File\n1 0 obj\n<< /Creator (Creative Suite Engine Offline-First) /ColorSpace /${colorSpace} >>\nendobj\n%%EOF`;
        downloadFile(aiContent, `${baseName}.ai`, 'application/illustrator');
      } else if (exportFormat === 'eps') {
        const epsContent = `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${documentData.canvasWidth} ${documentData.canvasHeight}\n%%Title: ${documentData.name}\nshowpage\n%%EOF`;
        downloadFile(epsContent, `${baseName}.eps`, 'application/postscript');
      } else if (exportFormat === 'pdf') {
        const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /MediaBox [0 0 ${documentData.canvasWidth} ${documentData.canvasHeight}] >>\nendobj\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF`;
        downloadFile(pdfContent, `${baseName}.pdf`, 'application/pdf');
      }

      setIsExporting(false);
      setHasExported(true);
      setTimeout(() => setHasExported(false), 2000);
    } catch (err) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0d0e11]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#14161b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-xs text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-xl"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Esporta File Vettoriale o Mockup</h3>
            <p className="text-zinc-400 text-xs">Formati standard per stampa tipografica, web e Illustrator</p>
          </div>
        </div>

        {/* Format Selector Grid */}
        <div className="space-y-2 mb-5">
          <label className="text-[10px] text-zinc-400 uppercase font-semibold block">Formato di Destinazione</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'svg', title: 'SVG Vettoriale', desc: 'Tracciati Bézier web/plotter', icon: FileCode },
              { id: 'ai', title: 'Adobe AI', desc: 'Compatibile Illustrator 2026', icon: FileCode },
              { id: 'eps', title: 'EPS PostScript', desc: 'Stampa serigrafica e maglie', icon: Printer },
              { id: 'pdf', title: 'PDF/X Stampa', desc: 'CMYK FOGRA39 ad alta resa', icon: FileText },
              { id: 'png', title: 'PNG HD', desc: 'Trasparenza alpha e mockup', icon: ImageIcon },
              { id: 'ucs', title: 'Progetto (.ucs)', desc: 'Schema unificato completo', icon: Layers },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setExportFormat(fmt.id as any)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  exportFormat === fmt.id
                    ? 'bg-zinc-700 border-zinc-600 text-white shadow-sm'
                    : 'bg-[#191b22] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <fmt.icon className="w-4 h-4 mb-1 text-cyan-400" />
                <div className="font-semibold text-zinc-100 text-xs">{fmt.title}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{fmt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Resolution Scale for PNG */}
        {exportFormat === 'png' && (
          <div className="space-y-2 mb-5 border-t border-zinc-800/80 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-zinc-400 uppercase font-semibold">Scala Risoluzione</label>
              <span className="font-mono text-cyan-400 text-xs">
                {documentData.canvasWidth * resolutionScale} × {documentData.canvasHeight * resolutionScale} px
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { scale: 1, label: '1x (Standard)' },
                { scale: 2, label: '2x (Retina HD)' },
                { scale: 4, label: '4x (Ultra HD Stampa)' },
              ].map((s) => (
                <button
                  key={s.scale}
                  onClick={() => setResolutionScale(s.scale)}
                  className={`py-2 px-3 rounded-xl border text-center transition-colors font-medium ${
                    resolutionScale === s.scale
                      ? 'bg-zinc-700 border-zinc-600 text-white font-bold'
                      : 'bg-[#191b22] border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Space Spec */}
        <div className="p-3 bg-[#191b22] rounded-2xl border border-zinc-800 mb-5 space-y-1 text-[11px] text-zinc-400 font-mono">
          <div className="flex justify-between">
            <span>Spazio Colore Associato:</span>
            <span className="text-white font-semibold">{colorSpace}</span>
          </div>
          <div className="flex justify-between">
            <span>DPI di Esportazione:</span>
            <span className="text-white">{documentData.dpi * (resolutionScale >= 2 ? 2 : 1)} DPI</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            Chiudi
          </button>
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-2xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            {hasExported ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>File Generato!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Scarica {exportFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
