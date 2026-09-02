import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';

interface DigitalSignaturePadProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureBase64: string, signerName: string) => void;
  title?: string;
  initialSignerName?: string;
  partyLabel?: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'التوقيع الإلكتروني المعتمد (Digital Signature)',
  initialSignerName = '',
  partyLabel = 'الموقع المفوض',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState(initialSignerName);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [penColor, setPenColor] = useState<'#1e3a8a' | '#0f172a' | '#047857'>('#1e3a8a'); // Navy / Slate / Emerald

  useEffect(() => {
    if (isOpen) {
      setSignerName(initialSignerName);
      setHasDrawn(false);
      setTimeout(initCanvas, 60);
    }
  }, [isOpen, initialSignerName]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High DPI scaling
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw baseline guide
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, rect.height - 35);
    ctx.lineTo(rect.width - 20, rect.height - 35);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    initCanvas();
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      alert('برجاء التوقيع داخل المربع أولاً.');
      return;
    }
    if (!signerName.trim()) {
      alert('برجاء كتابة اسم الموقع المفوض.');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, signerName.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print">
      <div className="bg-slate-900 border border-indigo-900/80 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-right font-sans">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/20 text-amber-400 rounded-xl">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{title}</h3>
              <p className="text-xs text-slate-400">توقيع رقمي موثق وخاضع للآثار القانونية للعقد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Signer Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            اسم الموقع المفوض ({partyLabel}):
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="اكتب الاسم الثلاثي أو الرباعي المعتمد"
            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white outline-none font-bold placeholder:text-slate-500"
          />
        </div>

        {/* Color Switcher & Clear Button */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-bold">لون الحبر:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPenColor('#1e3a8a')}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-blue-900 border-2 transition active:scale-95 flex items-center justify-center ${
                  penColor === '#1e3a8a' ? 'border-amber-400 ring-2 ring-amber-400/40 scale-110 shadow' : 'border-slate-700'
                }`}
                title="حبر كحلي ملكي (Official Navy)"
              />
              <button
                type="button"
                onClick={() => setPenColor('#0f172a')}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-slate-950 border-2 transition active:scale-95 flex items-center justify-center ${
                  penColor === '#0f172a' ? 'border-amber-400 ring-2 ring-amber-400/40 scale-110 shadow' : 'border-slate-700'
                }`}
                title="حبر أسود رسمي"
              />
              <button
                type="button"
                onClick={() => setPenColor('#047857')}
                className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-emerald-700 border-2 transition active:scale-95 flex items-center justify-center ${
                  penColor === '#047857' ? 'border-amber-400 ring-2 ring-amber-400/40 scale-110 shadow' : 'border-slate-700'
                }`}
                title="حبر زمردي مالي"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-300 hover:text-rose-400 flex items-center gap-1.5 font-bold transition px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>مسح وإعادة الرسم</span>
          </button>
        </div>

        {/* Canvas Drawing Area */}
        <div className="relative border-2 border-dashed border-indigo-700/60 rounded-2xl overflow-hidden bg-white shadow-inner">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-44 cursor-crosshair touch-none select-none"
          />
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 space-y-1">
              <PenTool className="w-6 h-6 text-slate-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-bold text-slate-600">وقّع هنا باستخدام القلم، اللمس، أو الماوس</span>
              <span className="text-[10px] sm:text-xs text-slate-400">Sign directly on screen</span>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-indigo-950/40 border border-indigo-900/50 p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-indigo-300">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>يتم ختم التوقيع برقم التحقق الأمني وتاريخ وتوقيت الاعتماد الرسمي على وثيقة كيان.</span>
        </div>

        {/* Action Buttons with 48px touch targets */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm transition min-h-[48px] flex items-center justify-center"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 min-h-[48px]"
          >
            <Check className="w-4 h-4" />
            اعتماد وحفظ التوقيع بالعقد
          </button>
        </div>
      </div>
    </div>
  );
};
