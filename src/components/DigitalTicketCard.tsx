import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  Printer, 
  Sparkles,
  Loader2,
  Check,
  Receipt,
  Image as ImageIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, TripSettings, PARTICIPANT_ROLES_CONFIG, getStudentMealInfo, isApparelAddon, isMealAddon } from '../types';
import { KAYAN_LOGO_BASE64, KAYAN_BADGE_BASE64 } from '../assets/images/embeddedImages';
import { 
  generateStudentTicketPDF, 
  generateReceiptPDF,
  exportTicketElementAsPNG,
} from '../services/pdfGenerator';
import { numberToArabicWords } from './ContractsReceipts';
import { sendWhatsAppReceipt } from '../services/storage';
import { formatTripDateSafely } from '../utils/dateFormatter';

interface DigitalTicketCardProps {
  student: Student;
  settings: TripSettings;
  onClose?: () => void;
  onOpenReceipt?: () => void;
  autoActionText?: string;
  className?: string;
  showActions?: boolean;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({
  student,
  settings,
  onClose,
  onOpenReceipt,
  autoActionText,
  className = '',
  showActions = true,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const elementId = `kayan-digital-ticket-${student.id}`;

  const formattedDate = formatTripDateSafely(settings.tripDate);

  const paymentText =
    student.isFreeTicket
      ? 'تذكرة مجانية VIP 🎁'
      : student.paymentStatus === 'paid'
      ? 'خالص السداد ✅'
      : `عربون (${(student.paidAmount || 0).toLocaleString()} ج.م)`;

  const handleShareWhatsApp = () => {
    sendWhatsAppReceipt(student, settings);
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await generateStudentTicketPDF(student, settings, elementId);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImage = async () => {
    setIsExportingImage(true);
    try {
      await exportTicketElementAsPNG(elementId, `تذكرة_${student.name.replace(/\s+/g, '_')}_${student.ticketCode}.png`);
    } catch (err) {
      console.error('Error exporting Ticket Image:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      const elem = document.getElementById(elementId);
      if (printWindow && elem) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
            <head>
              <meta charset="utf-8" />
              <title>تذكرة ${student.name} - ${student.ticketCode}</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; background: #090d16; color: white; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                @media print {
                  body { background: white !important; color: black !important; padding: 0 !important; }
                  .no-print { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div style="max-width: 780px; width: 100%;">${elem.outerHTML}</div>
              <script>
                setTimeout(function() { window.print(); }, 400);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (e) {
      window.print();
    }
  };

  const selectedAddonsList = (settings.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));

  return (
    <div className={`space-y-4 text-right dir-rtl ${className}`}>
      {/* Auto Action Banner if provided */}
      {autoActionText && (
        <div className="bg-gradient-to-r from-emerald-500/20 via-amber-500/10 to-indigo-500/20 border border-amber-500/30 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <span>{autoActionText}</span>
          </div>
          <button
            onClick={handleShareWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            إرسال التذكرة بالواتس
          </button>
        </div>
      )}

      {/* TICKET CONTAINER WITH REALISTIC LUXURY VIP BOARDING PASS FRAME */}
      <div
        id={elementId}
        className="printable-sheet relative max-w-[700px] w-full mx-auto bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-500/80 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-slate-100 font-sans space-y-4"
        style={{
          boxShadow: '0 25px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* Subtle Decorative Golden Corner Accents */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-tr-full pointer-events-none blur-xl"></div>

        {/* Scalloped Notched Edges on Left and Right */}
        <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-between py-6 z-30 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
        </div>

        <div className="absolute -right-2 top-0 bottom-0 flex flex-col justify-between py-6 z-30 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#080c17] border border-amber-500/50"></div>
        </div>

        {/* Primary Tear Notch Cutouts */}
        <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#080c17] border-r-2 border-amber-500/80 z-30 pointer-events-none"></div>
        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#080c17] border-l-2 border-amber-500/80 z-30 pointer-events-none"></div>

        {/* Top Header Logo & Company Info */}
        <div className="flex justify-between items-center border-b border-amber-500/30 pb-3.5 gap-3">
          {/* Right: Circular Logo Badge & Company Title (In RTL: right side) */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={KAYAN_BADGE_BASE64}
                alt="KAYAN Badge"
                className="w-13 h-13 rounded-full object-cover border-2 border-amber-400 shadow-md shadow-amber-500/30 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-slate-950 shadow">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 text-[11px] px-2 py-0.5 rounded-md font-bold shrink-0">
                  معتمدة ✓
                </span>
                <div className="text-sm sm:text-base font-black">
                  <span className="text-white">Fun Day الـ </span>
                  <span className="text-amber-400">{settings.companyNameAr || 'شركة كيان لتنظيم رحلات'}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 tracking-wider">
                OFFICIAL BOARDING PASS • تذكرة صعود رقمية رسمية
              </p>
            </div>
          </div>

          {/* Left: Golden Ticket Code Pill (In RTL: left side) */}
          <div className="text-left shrink-0">
            <div className="bg-[#181512] text-amber-300 border border-amber-500/60 px-3.5 py-1.5 rounded-xl shadow-inner text-center">
              <span className="text-[10px] text-amber-400/90 block font-sans font-bold">كود التذكرة</span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-wide text-amber-300">
                {student.ticketCode.startsWith('KYN') ? student.ticketCode : `KYN-${student.ticketCode}`}#
              </span>
            </div>
          </div>
        </div>

        {/* KAYAN Official Promotional Brand Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 shadow-xl group">
          <img
            src={KAYAN_LOGO_BASE64}
            alt="KAYAN Official Banner"
            className="w-full h-24 sm:h-28 object-cover object-center opacity-95 transition-transform duration-700 group-hover:scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Subtle Vignette Overlays for Maximum Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none"></div>

          {/* Floating Trip & Brand Tags - Centered inside solid pill containers */}
          <div className="absolute top-2.5 sm:top-3 right-3 left-3 flex items-center justify-between pointer-events-none gap-2 z-10 flex-wrap">
            <div className="bg-slate-950/92 backdrop-blur-md text-amber-300 border border-amber-500/60 text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 leading-none">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{settings.tripName || 'fun day نظم الشريف 2027'}</span>
            </div>

            <div className="bg-slate-950/92 backdrop-blur-md text-slate-200 border border-amber-500/40 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-xl font-mono tracking-wider shadow leading-none">
              KAYAN TOURS & EVENTS
            </div>
          </div>
        </div>

        {/* Main Content Grid: Right Column (Student Details) + Left Column (QR & Barcode Stub) */}
        <div className="ticket-main-grid grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Main Details (8 cols on desktop - RTL First Child is on the Right) */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-3.5">
            {/* Student Header */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">المسافر:</span>
                <span className="text-xs text-slate-400 font-mono">هـاتـف: <strong className="text-slate-100 font-sans tracking-wide">{student.phone}</strong></span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-0.5 tracking-wide">
                {student.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {(student.customRole || (student.participantRole && student.participantRole !== 'student')) && (
                  <span className="bg-[#2b1e0a] text-amber-300 border border-amber-500/50 text-xs px-3 py-1 rounded-lg font-black flex items-center gap-1.5 shadow-sm">
                    <span>{student.customRole?.includes('👑') ? '' : (PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.icon || '👑')}</span>
                    <span>{student.customRole || PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.badge || 'ADMIN KAYAN 👑'}</span>
                  </span>
                )}
                {student.faculty && (
                  <span className="bg-slate-800/90 text-slate-200 border border-slate-700 text-xs px-3 py-1 rounded-lg font-bold shadow-sm">
                    {student.faculty}
                  </span>
                )}
              </div>
            </div>

            {/* Logistics Grid Box */}
            <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-4 space-y-3.5 shadow-inner">
              {/* Row 1: Trip Destination & Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800/80 text-xs">
                {/* Trip Name & Destination */}
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">الرحلة والوجهة:</span>
                  <strong className="text-amber-400 text-sm font-black block mt-0.5">
                    {settings.tripName}
                  </strong>
                  {settings.destination && (
                    <span className="text-slate-300 text-xs block mt-0.5">
                      {settings.destination}
                    </span>
                  )}
                </div>

                {/* Date & Time */}
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">تاريخ وتوقيت الرحلة:</span>
                  <strong className="text-white text-xs sm:text-sm font-bold block mt-0.5">
                    {formattedDate}
                  </strong>
                </div>
              </div>

              {/* Row 2: Sub-pills (Bus/Seat & Financial/Payment Status) */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Bus & Seat */}
                <div className="bg-indigo-950/70 border border-indigo-500/40 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block font-medium">الحافلة والمقعد 🚌:</span>
                  <strong className="text-white text-xs sm:text-sm font-black block mt-0.5">
                    أتوبيس ({student.busNumber})
                  </strong>
                  <span className="text-amber-300 text-xs font-bold block mt-0.5">
                    {student.seatNumber ? `مقعد رقم ${student.seatNumber}` : 'مقعد حر'}
                  </span>
                </div>

                {/* Financial Payment Status */}
                <div className="bg-indigo-950/70 border border-indigo-500/40 rounded-xl p-2.5">
                  <span className="text-[10px] text-slate-400 block font-medium">الموقف المالي والسداد 💳:</span>
                  <strong className="text-emerald-400 text-xs sm:text-sm font-black block mt-0.5">
                    {paymentText}
                  </strong>
                  <span className="text-slate-300 text-[11px] font-medium block mt-0.5">
                    {student.isFreeTicket ? 'تذكرة ضيافة VIP' : student.remainingAmount > 0 ? `متبقي: ${student.remainingAmount.toLocaleString()} ج.م` : 'كامل الرسوم مسددة'}
                  </span>
                </div>
              </div>

              {/* Hotel Room & Accommodation (if student is assigned to a room) */}
              {student.roomNumber && (
                <div className="bg-indigo-950/70 border border-indigo-500/40 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">🏨</span>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">الإقامة والغرفة الفندقية:</span>
                      <strong className="text-white text-xs sm:text-sm font-black block mt-0.5">
                        غرفة ({student.roomNumber}) {student.hotelName ? `• ${student.hotelName}` : ''}
                      </strong>
                    </div>
                  </div>
                  {student.roomType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                      {student.roomType === 'single'
                        ? 'فردية 🛏️'
                        : student.roomType === 'double'
                        ? 'ثنائية 🛏️🛏️'
                        : student.roomType === 'triple'
                        ? 'ثلاثية 🛏️🛏️🛏️'
                        : student.roomType === 'quad'
                        ? 'رباعية 🛏️🛏️🛏️🛏️'
                        : 'جناح فندقي 👑'}
                    </span>
                  )}
                </div>
              )}

              {/* Dynamic Addons / Inclusions Display: ONLY shown if the student actually selected addons */}
              {(() => {
                const userSelectedAddons = (settings.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));
                const legacyTshirt = !userSelectedAddons.some(a => isApparelAddon(a)) && student.tshirtSize && student.tshirtSize !== 'none';
                const legacyMeal = !userSelectedAddons.some(a => isMealAddon(a)) && student.hasMeal;

                if (userSelectedAddons.length === 0 && !legacyTshirt && !legacyMeal) return null;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                      <span>✨</span>
                      <span>الخدمات والإضافات المشمولة بالحجز:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {userSelectedAddons.map((addon) => {
                        const isApparel = isApparelAddon(addon);
                        const isMeal = isMealAddon(addon);
                        const size = student.addonOptions?.[addon.id] || (isApparel ? student.tshirtSize : undefined) || 'L';

                        if (isApparel) {
                          return (
                            <div key={addon.id} className="bg-slate-950/85 p-2.5 rounded-xl border border-purple-500/35 flex items-center justify-between gap-2 shadow-inner">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">👕</span>
                                <div className="min-w-0">
                                  <span className="text-[10px] text-slate-400 block font-medium truncate">{addon.name}</span>
                                  <strong className="text-purple-300 font-black text-xs">
                                    مقاس ({size})
                                  </strong>
                                </div>
                              </div>
                              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0">
                                {student.tshirtReceived ? '✅ تم الاستلام' : 'مشمول 🎫'}
                              </span>
                            </div>
                          );
                        }

                        if (isMeal) {
                          return (
                            <div key={addon.id} className="bg-slate-950/85 p-2.5 rounded-xl border border-amber-500/35 flex items-center justify-between gap-2 shadow-inner">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base shrink-0">🍔</span>
                                <div className="min-w-0">
                                  <span className="text-[10px] text-slate-400 block font-medium">وجبة طعام:</span>
                                  <strong className="text-amber-300 font-black text-xs truncate block" title={addon.name}>
                                    {addon.name}
                                  </strong>
                                </div>
                              </div>
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0">
                                {student.mealReceived ? '✅ تم الاستلام' : 'مشمولة 🎫'}
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div key={addon.id} className="bg-slate-950/85 p-2.5 rounded-xl border border-indigo-500/35 flex items-center justify-between gap-2 shadow-inner">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">⚡</span>
                              <div className="min-w-0">
                                <span className="text-[10px] text-slate-400 block font-medium">خدمة إضافية:</span>
                                <strong className="text-indigo-300 font-black text-xs truncate block" title={addon.name}>
                                  {addon.name}
                                </strong>
                              </div>
                            </div>
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0">
                              مشمول بالحجز 🎫
                            </span>
                          </div>
                        );
                      })}

                      {legacyTshirt && (
                        <div className="bg-slate-950/85 p-2.5 rounded-xl border border-purple-500/35 flex items-center justify-between gap-2 shadow-inner">
                          <div className="flex items-center gap-2">
                            <span className="text-base">👕</span>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">تيشيرت الفعالية:</span>
                              <strong className="text-purple-300 font-black text-xs">مقاس ({student.tshirtSize})</strong>
                            </div>
                          </div>
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {student.tshirtReceived ? '✅ تم الاستلام' : 'مشمول 🎫'}
                          </span>
                        </div>
                      )}

                      {legacyMeal && (
                        <div className="bg-slate-950/85 p-2.5 rounded-xl border border-amber-500/35 flex items-center justify-between gap-2 shadow-inner">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🍔</span>
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">وجبة الغداء:</span>
                              <strong className="text-amber-300 font-black text-xs">{getStudentMealInfo(student, settings).mealName}</strong>
                            </div>
                          </div>
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {student.mealReceived ? '✅ تم الاستلام' : 'مشمولة 🎫'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Companion details if any */}
              {student.hasCompanion && student.companionName && (
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between text-slate-200">
                  <span>👥 مرافق الحجز: <strong className="text-white">{student.companionName}</strong></span>
                  <span className="text-amber-300 text-[11px] font-bold font-mono">
                    {student.companionSeatNumber ? `مقعد #${student.companionSeatNumber}` : ''} ({student.companionTShirtSize || 'L'})
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Bar: Clean, well-formatted pickup, national ID, and emergency phone */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-2.5 flex justify-between items-center text-xs flex-wrap gap-2 shadow-sm">
              <div className="text-slate-300 flex items-center gap-1.5 leading-none">
                <span className="text-amber-400 shrink-0 text-sm">📍</span>
                <span className="text-slate-400 font-bold">التجمع:</span>
                <strong className="text-amber-300 font-bold">
                  {student.pickupPoint || settings.assemblyLocation || 'جامع الاستاد - كفرالشيخ'}
                </strong>
              </div>

              <div className="flex items-center gap-3.5 flex-wrap">
                {student.nationalId && (
                  <div className="text-slate-300 flex items-center gap-1.5 leading-none">
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black tracking-tighter shrink-0 leading-none">ID</span>
                    <span className="text-slate-400 font-bold">القومي:</span>
                    <strong className="text-white font-mono font-bold tracking-wide" dir="ltr">{student.nationalId}</strong>
                  </div>
                )}

                <div className="text-slate-300 flex items-center gap-1.5 leading-none">
                  <span className="text-rose-400 shrink-0 text-sm">📞</span>
                  <span className="text-slate-400 font-bold">طوارئ:</span>
                  <strong className="text-white font-mono font-bold tracking-wide" dir="ltr">{student.emergencyPhone || settings.supportPhone || '01006735016'}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Stub: QR Code & Barcode (4 cols on desktop - RTL Second Child is on the Left) */}
          <div className="md:col-span-4 flex flex-col items-center justify-between space-y-3.5 bg-slate-900/80 p-4 rounded-2xl border-2 border-dashed border-amber-500/40 text-center relative overflow-hidden">
            {/* White QR Box */}
            <div className="w-full bg-white p-3 rounded-2xl shadow-xl border-2 border-amber-400 flex flex-col items-center justify-center">
              <QRCodeSVG
                value={JSON.stringify({
                  ticket: student.ticketCode,
                  name: student.name,
                  bus: student.busNumber,
                  seat: student.seatNumber || 'N/A',
                  phone: student.phone,
                  pickup: student.pickupPoint || '',
                  status: student.paymentStatus,
                })}
                size={135}
                level="M"
              />
              <span className="text-xs font-mono font-black text-slate-950 mt-2 block tracking-wide">
                KYN - {student.ticketCode.startsWith('KYN') ? student.ticketCode : `KYN-${student.ticketCode}`}
              </span>
            </div>

            {/* Official Verification Tag */}
            <div className="text-xs text-emerald-400 font-bold flex items-center justify-center gap-1.5 leading-none">
              <span>تذكرة صعود إلكترونية معتمدة</span>
              <span className="text-sm">✓</span>
            </div>

            {/* Barcode Graphic Strip */}
            <div className="w-full bg-slate-950 border border-amber-500/40 rounded-xl py-2 px-3 flex items-center justify-center shadow-inner">
              <div className="flex justify-center items-center gap-[2.5px] h-6 overflow-hidden">
                <div className="w-[3px] h-full bg-white rounded-xs"></div>
                <div className="w-[1.5px] h-full bg-white"></div>
                <div className="w-[4px] h-full bg-white rounded-xs"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[5px] h-full bg-white rounded-xs"></div>
                <div className="w-[1.5px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[4px] h-full bg-white rounded-xs"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1.5px] h-full bg-white"></div>
                <div className="w-[5px] h-full bg-white rounded-xs"></div>
                <div className="w-[2px] h-full bg-white"></div>
                <div className="w-[3px] h-full bg-white"></div>
                <div className="w-[1px] h-full bg-white"></div>
                <div className="w-[4px] h-full bg-white rounded-xs"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS TOOLBAR */}
      {showActions && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-lg space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
            {/* Download Ticket as Image (PNG) */}
            <button
              type="button"
              disabled={isExportingImage}
              onClick={handleDownloadImage}
              className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-amber-500/20 disabled:opacity-50"
              title="تنزيل بطاقة التذكرة كصورة عالية الدقة PNG تناسب الموبايل والكمبيوتر"
            >
              {isExportingImage ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <ImageIcon className="w-4 h-4" />}
              <span>تنزيل كصورة (PNG) 🖼️</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>تنزيل التذكرة (PDF) 📄</span>
            </button>

            {/* Receipt Voucher Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenReceipt) {
                  onOpenReceipt();
                } else {
                  generateReceiptPDF(
                    {
                      id: `rc-${student.id}`,
                      voucherNumber: `RC-${student.ticketCode}`,
                      type: 'receipt',
                      personName: student.name,
                      amount: student.paidAmount,
                      amountInWords: numberToArabicWords(student.paidAmount),
                      reason: `حجز تذكرة ${settings.tripName} - أتوبيس ${student.busNumber}`,
                      paymentMethod: student.paymentMethod,
                      date: new Date().toISOString().slice(0, 10),
                      supervisorName: 'إدارة كيان',
                      totalAmount: student.totalAmount,
                      previousPaid: 0,
                      previousRemaining: student.totalAmount,
                      paidNow: student.paidAmount,
                      totalPaidSoFar: student.paidAmount,
                      currentRemaining: student.remainingAmount,
                      isDeposit: student.remainingAmount > 0,
                      isFullyPaid: student.remainingAmount === 0,
                    },
                    settings
                  );
                }
              }}
              className="bg-teal-700 hover:bg-teal-600 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-teal-700/20 active:scale-95"
              title="عرض وطباعة إيصال السداد المالي المعتمد"
            >
              <Receipt className="w-4 h-4 text-emerald-300" />
              <span>إيصال القبض المالي 🧾</span>
            </button>

            {/* Direct WhatsApp Share */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20"
            >
              <Share2 className="w-4 h-4" />
              <span>مشاركة واتساب 📲</span>
            </button>

            {/* Print Ticket */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التذكرة 🖨️</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
