import React, { useState } from 'react';
import { ShieldCheck, Sparkles, Check, Edit3, RotateCw, Palette } from 'lucide-react';

export interface CompanySealProps {
  companyNameAr?: string;
  companyNameEn?: string;
  licenseNo?: string;
  sealStatusText?: string;
  establishedYear?: string;
  color?: string; // hex or preset
  size?: number; // width/height in px
  rotation?: number; // degrees
  showControls?: boolean;
  onUpdateSeal?: (newDetails: Partial<CompanySealProps>) => void;
  className?: string;
}

export const SEAL_COLOR_PRESETS = [
  { id: 'blue', name: 'أزرق رسمى (الأختام)', color: '#1d4ed8', border: '#1e40af' },
  { id: 'navy', name: 'كحلي داكن', color: '#1e1b4b', border: '#0f172a' },
  { id: 'red', name: 'أحمر عاجل / اعتماد', color: '#dc2626', border: '#991b1b' },
  { id: 'emerald', name: 'أخضر زمردي', color: '#047857', border: '#065f46' },
  { id: 'gold', name: 'ذهبي / شمعي', color: '#d97706', border: '#854d0e' },
  { id: 'dark', name: 'أسود مطاطي', color: '#374151', border: '#1f2937' },
];

export const CompanySeal: React.FC<CompanySealProps> = ({
  companyNameAr = 'شركة كيان لتنظيم الفعاليات والرحلات',
  companyNameEn = 'KAYAN EVENTS & ORGANIZING SERVICES',
  licenseNo = '98231',
  sealStatusText = 'معتمد رسمياً • OFFICIAL SEAL',
  establishedYear = '2026',
  color = '#1d4ed8',
  size = 180,
  rotation = -10,
  showControls = false,
  onUpdateSeal,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localAr, setLocalAr] = useState(companyNameAr);
  const [localEn, setLocalEn] = useState(companyNameEn);
  const [localLicense, setLocalLicense] = useState(licenseNo);
  const [localStatus, setLocalStatus] = useState(sealStatusText);
  const [localEstablishedYear, setLocalEstablishedYear] = useState(establishedYear);
  const [localColor, setLocalColor] = useState(color);
  const [localRotation, setLocalRotation] = useState(rotation);
  const [applyGrunge, setApplyGrunge] = useState(true);

  React.useEffect(() => {
    setLocalAr(companyNameAr);
    setLocalEn(companyNameEn);
    setLocalLicense(licenseNo);
    setLocalStatus(sealStatusText);
    setLocalEstablishedYear(establishedYear);
    setLocalColor(color);
    setLocalRotation(rotation);
  }, [companyNameAr, companyNameEn, licenseNo, sealStatusText, establishedYear, color, rotation]);

  const handleSave = () => {
    setIsEditing(false);
    if (onUpdateSeal) {
      onUpdateSeal({
        companyNameAr: localAr,
        companyNameEn: localEn,
        licenseNo: localLicense,
        sealStatusText: localStatus,
        color: localColor,
        rotation: localRotation,
      });
    }
  };

  // SVG Unique ID generation to prevent path clash when multiple seals render
  const sealId = React.useId().replace(/:/g, '_');
  const topPathId = `sealTopArc_${sealId}`;
  const bottomPathId = `sealBottomArc_${sealId}`;
  const grungeFilterId = `grungeFilter_${sealId}`;

  return (
    <div className={`relative inline-flex flex-col items-center group ${className}`}>
      {/* SEAL RENDER SVG */}
      <div
        className="transition-transform duration-300 relative cursor-pointer"
        style={{ transform: `rotate(${localRotation}deg)` }}
        onClick={() => showControls && setIsEditing(true)}
        title={showControls ? 'انقر لتعديل بيانات وختم الشركة' : undefined}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 260 260"
          className="select-none filter drop-shadow-sm transition-all hover:scale-[1.02]"
        >
          <defs>
            {/* Top Text Arc Path */}
            <path
              id={topPathId}
              d="M 32, 130 A 98,98 0 1,1 228, 130"
              fill="none"
            />
            {/* Bottom Text Arc Path */}
            <path
              id={bottomPathId}
              d="M 228, 130 A 98,98 0 1,1 32, 130"
              fill="none"
            />

            {/* Grunge Rubber Ink Filter */}
            {applyGrunge && (
              <filter id={grungeFilterId} x="-10%" y="-10%" width="120%" height="120%">
                <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" result="noise" />
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0" result="matrix" />
                <feComposite in="SourceGraphic" in2="matrix" operator="out" />
              </filter>
            )}
          </defs>

          <g filter={applyGrunge ? `url(#${grungeFilterId})` : undefined}>
            {/* Outer Serrated / Double Ring Border */}
            <circle
              cx="130"
              cy="130"
              r="124"
              fill="none"
              stroke={localColor}
              strokeWidth="3.5"
              strokeDasharray="14 3"
              opacity="0.9"
            />
            <circle
              cx="130"
              cy="130"
              r="117"
              fill="none"
              stroke={localColor}
              strokeWidth="2"
              opacity="0.95"
            />
            <circle
              cx="130"
              cy="130"
              r="82"
              fill="none"
              stroke={localColor}
              strokeWidth="2.5"
              strokeDasharray="6 2"
              opacity="0.9"
            />
            <circle
              cx="130"
              cy="130"
              r="76"
              fill="none"
              stroke={localColor}
              strokeWidth="1.5"
            />

            {/* Arc Texts */}
            {/* Top Arabic Text */}
            <text fill={localColor} fontSize="13" fontWeight="900" fontFamily="'Tajawal', sans-serif">
              <textPath href={`#${topPathId}`} startOffset="50%" textAnchor="middle">
                {localAr}
              </textPath>
            </text>

            {/* Bottom English / Sub Text */}
            <text fill={localColor} fontSize="10.5" fontWeight="800" fontFamily="'Plus Jakarta Sans', sans-serif" letterSpacing="0.8">
              <textPath href={`#${bottomPathId}`} startOffset="50%" textAnchor="middle">
                {localEn}
              </textPath>
            </text>

            {/* Left and Right Decorative Stars */}
            <g fill={localColor}>
              {/* Left Star Cluster */}
              <path d="M 38 130 L 40 126 L 44 126 L 41 129 L 42 133 L 38 131 L 34 133 L 35 129 L 32 126 L 36 126 Z" />
              {/* Right Star Cluster */}
              <path d="M 222 130 L 224 126 L 228 126 L 225 129 L 226 133 L 222 131 L 218 133 L 219 129 L 216 126 L 220 126 Z" />
            </g>

            {/* Center Emblem Container */}
            {/* Center Background Seal Mask */}
            <circle cx="130" cy="130" r="70" fill={localColor} fillOpacity="0.04" />

            {/* Center Eagle / Falcon Emblem Graphics */}
            <g transform="translate(130, 96) scale(0.9)" fill={localColor}>
              {/* Decorative Crown/Eagle Badge */}
              <path d="M -16 -8 L 0 -20 L 16 -8 L 10 4 L -10 4 Z" opacity="0.85" />
              <circle cx="0" cy="-6" r="3" fill="#ffffff" />
              {/* Small Star Row above emblem */}
              <path d="M -22 -14 L -20 -18 L -18 -14 M 0 -22 L 2 -26 L 4 -22 M 18 -14 L 20 -18 L 22 -14" stroke={localColor} strokeWidth="1.5" strokeLinecap="round" />
            </g>

            {/* Middle Horizontal Banner Box */}
            <rect
              x="62"
              y="114"
              width="136"
              height="32"
              rx="4"
              fill="#ffffff"
              stroke={localColor}
              strokeWidth="2"
            />
            <rect
              x="65"
              y="117"
              width="130"
              height="26"
              rx="2"
              fill={localColor}
              fillOpacity="0.08"
            />

            {/* Middle Status Text */}
            <text
              x="130"
              y="134"
              textAnchor="middle"
              fill={localColor}
              fontSize="12"
              fontWeight="900"
              fontFamily="'Tajawal', sans-serif"
            >
              {localStatus}
            </text>

            {/* Center Bottom Info (License / Year) */}
            <text
              x="130"
              y="162"
              textAnchor="middle"
              fill={localColor}
              fontSize="9.5"
              fontWeight="800"
              fontFamily="monospace"
            >
              ترخيص رقم: {localLicense} • {localEstablishedYear}
            </text>

            {/* Bottom Official Signature Stamp Dots */}
            <circle cx="110" cy="176" r="2" fill={localColor} />
            <circle cx="130" cy="176" r="2.5" fill={localColor} />
            <circle cx="150" cy="176" r="2" fill={localColor} />
          </g>
        </svg>

        {/* Quick Edit Overlay Hover Hint */}
        {showControls && !isEditing && (
          <div className="no-print absolute inset-0 bg-indigo-950/60 backdrop-blur-xs rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity p-2 text-center">
            <Edit3 className="w-5 h-5 mb-1 text-amber-300" />
            <span className="text-[10px] font-bold">تعديل الختم الرسمي</span>
          </div>
        )}
      </div>

      {/* SEAL EDIT MODAL / POPUP */}
      {isEditing && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-right space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <div className="flex items-center gap-2 text-indigo-900 font-black">
                <ShieldCheck className="w-6 h-6 text-indigo-600" />
                <h3 className="text-base font-bold">تعديل الختم الرسمي للشركة</h3>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <label className="block font-bold mb-1">اسم الشركة بالعربية (النص العلوي):</label>
                <input
                  type="text"
                  value={localAr}
                  onChange={(e) => setLocalAr(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">اسم الشركة بالإنجليزية (النص السفلي):</label>
                <input
                  type="text"
                  value={localEn}
                  onChange={(e) => setLocalEn(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900 ltr text-left"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">نص اعتماد الشريط:</label>
                  <input
                    type="text"
                    value={localStatus}
                    onChange={(e) => setLocalStatus(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">رقم الترخيص / السجل:</label>
                  <input
                    type="text"
                    value={localLicense}
                    onChange={(e) => setLocalLicense(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block font-bold mb-1.5 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-indigo-600" />
                  لون الحبر والأختام:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEAL_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setLocalColor(preset.color)}
                      className={`p-2 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition ${
                        localColor === preset.color
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border shrink-0"
                        style={{ backgroundColor: preset.color, borderColor: preset.border }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Angle Slider */}
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                    زاوية ميل الختم الورقي:
                  </span>
                  <span className="font-mono">{localRotation}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={localRotation}
                  onChange={(e) => setLocalRotation(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Grunge Toggle */}
              <label className="flex items-center gap-2 pt-1 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyGrunge}
                  onChange={(e) => setApplyGrunge(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>تفعيل تأثير ملمس الحبر والمطاط الطبيعي (Grunge Ink)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow transition"
              >
                <Check className="w-4 h-4" />
                حفظ الختم المعتمد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
