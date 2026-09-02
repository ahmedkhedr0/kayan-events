import React from 'react';
import { Download, Smartphone, CheckCircle, Share, PlusSquare, X, ShieldCheck } from 'lucide-react';

interface PWAInstallPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall?: () => void;
  canNativeInstall?: boolean;
}

export const PWAInstallPromptModal: React.FC<PWAInstallPromptModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  canNativeInstall = false,
}) => {
  if (!isOpen) return null;

  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-5 shadow-2xl relative text-right animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/30 shrink-0">
            <img src="/favicon.png" alt="Kayan App" className="w-full h-full rounded-[14px] object-cover" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white">تثبيت تطبيق كيان إيفنتس 📲</h3>
            <p className="text-xs text-amber-400 font-medium">المنظومة الميدانية المستقلة (Standalone App)</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>يعمل كتطبيق هاتف حقيقي بدون شريط عناوين المتصفح</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>سرعة فائقة في مسح كود QR وتفقد ركاب الحافلات في الميدان</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>حفظ فوري للتذاكر والصور وكشوفات الحافلات في جهازك</span>
          </div>
        </div>

        {/* Native 1-Click Install Button (Chrome / Android / Desktop) */}
        {canNativeInstall && onInstall ? (
          <button
            type="button"
            onClick={() => {
              onInstall();
              onClose();
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 text-sm transition active:scale-95"
          >
            <Download className="w-5 h-5" />
            <span>تثبيت التطبيق الآن بنقرة واحدة 🚀</span>
          </button>
        ) : null}

        {/* Step-by-Step Instructions based on OS */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold text-slate-400">أو اتبع الخطوات السريعة حسب هاتفك:</div>

          {/* iOS Safari Guide */}
          <div className={`p-3 rounded-2xl border ${isIOS ? 'bg-amber-950/30 border-amber-500/40' : 'bg-slate-950 border-slate-800'} text-xs space-y-1.5`}>
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>لهواتف آيفون (iPhone / iPad - Safari):</span>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-1 pr-1 text-[11px] leading-relaxed">
              <li>اضغط على زر المشاركة أسفل متصفح Safari <Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /></li>
              <li>انزل في القائمة واختر <strong>"إضافة إلى الصفحة الرئيسية"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-200 mx-0.5" /> (Add to Home Screen)</li>
              <li>اضغط <strong>"إضافة" (Add)</strong> بالأعلى لتثبيت التطبيق فوراً.</li>
            </ol>
          </div>

          {/* Android Chrome Guide */}
          <div className={`p-3 rounded-2xl border ${isAndroid && !canNativeInstall ? 'bg-amber-950/30 border-amber-500/40' : 'bg-slate-950 border-slate-800'} text-xs space-y-1.5`}>
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" />
              <span>لهواتف أندرويد (Google Chrome):</span>
            </div>
            <ol className="list-decimal list-inside text-slate-300 space-y-1 pr-1 text-[11px] leading-relaxed">
              <li>اضغط على قائمة الثلاث نقاط <strong>(⋮)</strong> بأعلى أو أسفل كروم.</li>
              <li>اختر <strong>"تثبيت التطبيق" (Install app)</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</li>
              <li>سيتم تثبيت التطبيق كبرنامج مستقل على شاشة هاتفك.</li>
            </ol>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition"
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );
};
