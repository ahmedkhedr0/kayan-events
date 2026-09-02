import React, { useState } from 'react';
import { 
  Download, 
  Share2, 
  Printer, 
  Sparkles,
  Loader2,
  Check,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, TripSettings, PARTICIPANT_ROLES_CONFIG, getStudentMealInfo, isApparelAddon, isMealAddon } from '../types';
import kayanLogo from '../assets/images/kayan_logo_1785354886047.jpg';
import kayanBadge from '../assets/images/kayan_badge_1785354902221.jpg';
import { 
  generateStudentTicketPDF, 
  exportTicketAsHighResImage,
  generateStudentTicketCanvas,
  exportTicketElementAsPNG, 
  copyTicketElementToClipboard, 
  sanitizeClonedDoc 
} from '../services/pdfGenerator';
import { sendWhatsAppReceipt, sendCustomWhatsAppMessage } from '../services/storage';
import { formatTripDateSafely } from '../utils/dateFormatter';

interface DigitalTicketCardProps {
  student: Student;
  settings: TripSettings;
  onClose?: () => void;
  autoActionText?: string;
  className?: string;
  showActions?: boolean;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({
  student,
  settings,
  onClose,
  autoActionText,
  className = '',
  showActions = true,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadSuccessInfo, setDownloadSuccessInfo] = useState<{ filename: string; url?: string } | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const elementId = `kayan-digital-ticket-${student.id}`;

  const formattedDate = formatTripDateSafely(settings.tripDate);

  const paymentText =
    student.isFreeTicket
      ? 'تذكرة مجانية VIP 🎁'
      : student.paymentStatus === 'paid'
      ? 'خالص السداد ✅'
      : `عربون (${(student.paidAmount || 0).toLocaleString()} ج.م)`;

  const handleDownloadHDImage = async () => {
    setIsExporting(true);
    try {
      const result = await exportTicketAsHighResImage(student, settings, elementId);
      if (result.success && result.dataUrl) {
        setDownloadSuccessInfo({
          filename: result.filename,
          url: result.dataUrl,
        });

        // If on mobile device, open preview modal immediately for easy long-press / save to photos gallery
        const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) {
          setPreviewImageUrl(result.dataUrl);

          // Try native file share for instant saving to Photo Gallery
          if (result.blob && navigator.share && navigator.canShare) {
            try {
              const file = new File([result.blob], result.filename, { type: 'image/png' });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: `تذكرة ${student.name}`,
                  text: `تذكرة رحلة ${settings.tripName || 'كيان'} #${student.ticketCode}`,
                  files: [file],
                });
              }
            } catch (shareErr) {
              console.log('Native mobile share canceled or dismissed:', shareErr);
            }
          }
        }

        setTimeout(() => setDownloadSuccessInfo(null), 10000);
      }
    } catch (err) {
      console.error('Error downloading ticket as image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsAppImageShare = async () => {
    setIsExporting(true);
    try {
      // Use the standalone 780px canvas to guarantee desktop VIP styling on all screens
      const canvas = await generateStudentTicketCanvas(student, settings, elementId);
      if (canvas && typeof window !== 'undefined') {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
          const file = new File([blob], `TICKET_${student.ticketCode}_${student.name}.png`, { type: 'image/png' });

          // 1. Mobile Web Share API: Shares standard PNG image file directly to WhatsApp / Gallery
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `تذكرة ${student.name}`,
              text: `تذكرة صعود إلكترونية معتمدة #${student.ticketCode} - ${settings.companyNameAr || 'شركة كيان'}`,
              files: [file],
            });
            setIsExporting(false);
            return;
          }
        }
      }

      // 2. Desktop Fallback: Copy PNG image to clipboard + Download PNG file + Open WhatsApp Web
      const copied = await copyTicketElementToClipboard(elementId);
      await exportTicketAsHighResImage(student, settings, elementId);
      
      if (copied) {
        setDownloadSuccessInfo({
          filename: `TICKET_${student.ticketCode}_${student.name}.png`,
        });
        setTimeout(() => setDownloadSuccessInfo(null), 5000);
      }

      // Open WhatsApp chat with receipt details and paste tip
      const statusText = student.paymentStatus === 'paid' ? 'خالص السداد بالكامل ✅' : `عربون (${student.paidAmount} ج.م) ⚠️`;
      const msg = `
🎟️ ════════════════════════════ 🎟️
      🎫 *تذكرة حجز رقمية معتمدة (صورة PNG)* 🎫
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

أهلاً بك يا *${student.name}* 👋
مرفق صورة تذكرتك الرسمية الخاصة بالرحلة.

👤 *صاحب التذكرة:* ${student.name}
🔢 *كود التذكرة الفريد:* \`[ ${student.ticketCode} ]\`
🎓 *الكلية / الدفعة:* ${student.faculty || 'كلية الحاسبات والمعلومات'}

🚌 ═══ *تفاصيل الحافلة والتسكين* ═══ 🚌
• الرحلة: *${settings.tripName}*
• تاريخ الرحلة: *${settings.tripDate}*
• رقم الأتوبيس: *أتوبيس رقم (${student.busNumber})*
• رقم المقعد: *${student.seatNumber ? `#${student.seatNumber}` : 'سيحدد عند الصعود'}*
• مقاس التيشرت: *${student.tshirtSize}*
• حالة السداد: *${statusText}*
• نقطة التجمع: *${student.pickupPoint || 'جامع الاستاد - كفرالشيخ'}*

🖼️ *ملاحظة:* تم حفظ صورة التذكرة على جهازك ونسخها للحافظة (يمكنك اضغط Ctrl+V لإرفاق صورة التذكرة فوراً).

📞 الدعم الفني: ${settings.supportPhone}
نتمنى لك رحلة ممتعة مع كيان! 🎉
`.trim();

      sendCustomWhatsAppMessage(student.phone, msg);
    } catch (err) {
      console.error('Error sharing ticket image on WhatsApp:', err);
      sendWhatsAppReceipt(student, settings);
    } finally {
      setIsExporting(false);
    }
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
            onClick={handleWhatsAppImageShare}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            إرسال صورة التذكرة بالواتس
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
        {/* Scalloped Notched Edges on Left and Right */}
        <div className="absolute left-[-8px] top-0 bottom-0 flex flex-col justify-between py-3.5 z-30 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
        </div>

        <div className="absolute right-[-8px] top-0 bottom-0 flex flex-col justify-between py-3.5 z-30 pointer-events-none">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
          <div className="w-3.5 h-3.5 rounded-full bg-slate-950 border border-amber-500/50"></div>
        </div>

        {/* Primary Tear Notch Cutouts */}
        <div className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 border-r-2 border-amber-500/80 z-30"></div>
        <div className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950 border-l-2 border-amber-500/80 z-30"></div>

        {/* Subtle Decorative Golden Corner Accents */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-tr-full pointer-events-none blur-xl"></div>

        {/* Top Header Logo & Company Info */}
        <div className="flex justify-between items-center border-b border-amber-500/30 pb-3.5 gap-3">
          {/* Right: Circular Logo Badge & Company Title (In RTL: right side) */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={kayanBadge}
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
                <h3 className="text-sm sm:text-base font-black text-amber-300">
                  {settings.companyNameAr || 'شركة كيان لتنظيم رحلات الـ Fun Day'}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0">
                  معتمدة ✓
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5 flex items-center gap-1.5">
                <span>تذكرة صعود رقمية رسمية</span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[10px] text-slate-400">OFFICIAL BOARDING PASS</span>
              </p>
            </div>
          </div>

          {/* Left: Golden Ticket Code Pill (In RTL: left side) */}
          <div className="text-left shrink-0">
            <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/30 text-amber-300 border border-amber-500/60 px-3.5 py-1.5 rounded-xl shadow-inner text-center">
              <span className="text-[9px] text-amber-400/80 block font-sans font-bold">كود التذكرة</span>
              <span className="text-xs sm:text-sm font-black font-mono tracking-wide">#{student.ticketCode}</span>
            </div>
          </div>
        </div>

        {/* KAYAN Official Promotional Brand Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 shadow-xl group">
          <img
            src={kayanLogo}
            alt="KAYAN Official Banner"
            className="w-full h-24 sm:h-28 object-cover object-center opacity-95 transition-transform duration-700 group-hover:scale-102"
            referrerPolicy="no-referrer"
          />
          {/* Subtle Vignette Overlays for Maximum Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/40 pointer-events-none"></div>

          {/* Floating Trip & Brand Tags */}
          <div className="absolute bottom-2.5 right-3 left-3 flex items-center justify-between pointer-events-none gap-2">
            <div className="bg-slate-950/90 backdrop-blur-md text-amber-300 border border-amber-500/50 text-[11px] sm:text-xs font-black px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{settings.tripName || 'رحلات وفاعليات كيان الرسمية'}</span>
            </div>

            <div className="bg-slate-950/90 backdrop-blur-md text-slate-300 border border-slate-700 text-[10px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl font-mono tracking-wider shadow">
              KAYAN TOURS & EVENTS
            </div>
          </div>
        </div>

        {/* Main Content Grid: Right Column (Student Details) + Left Column (QR & Barcode Stub) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          {/* Main Details (8 cols on desktop - RTL First Child is on the Right) */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-3.5">
            {/* Student Header */}
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">المسافر:</span>
                <span className="text-[11px] text-slate-400 font-mono">هاتف: <strong className="text-slate-200 font-sans">{student.phone}</strong></span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-0.5 tracking-tight">
                {student.name}
              </h2>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                {student.faculty && (
                  <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-0.5 rounded-lg font-bold">
                    {student.faculty}
                  </span>
                )}
                {(student.customRole || (student.participantRole && student.participantRole !== 'student')) && (
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-lg font-black flex items-center gap-1 border ${
                      PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.bg || 'bg-amber-500/20'
                    } ${PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.text || 'text-amber-300'} ${
                      PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.border || 'border-amber-500/40'
                    }`}
                  >
                    <span>{PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.icon || '🎫'}</span>
                    <span>{student.customRole || PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.badge}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Logistics Grid Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-inner">
              {/* Row 1: Trip Destination & Date/Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-slate-800/80 text-xs">
                {/* Trip Name & Destination */}
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">الرحلة والوجهة:</span>
                  <strong className="text-amber-300 text-sm font-black block mt-0.5">
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
                  <span className="text-[10px] text-slate-400 block font-medium">تاريخ وتوقيت الرحلة:</span>
                  <strong className="text-white text-xs sm:text-sm font-bold block mt-0.5">
                    {formattedDate}
                  </strong>
                  {student.departureTime && (
                    <span className="text-emerald-400 text-xs font-bold block mt-0.5">
                      {student.departureTime}
                    </span>
                  )}
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
                              <strong className="text-amber-300 font-black text-xs">{student.mealOption || 'وجبة طعام VIP'}</strong>
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

            {/* Bottom Bar: Rendered dynamically only if student entered pickup point, national ID, or emergency phone */}
            {Boolean(student.pickupPoint || student.nationalId || student.emergencyPhone) && (
              <div className="bg-slate-950 border border-amber-500/40 rounded-xl p-2.5 flex justify-between items-center text-xs flex-wrap gap-2 shadow-sm">
                {student.pickupPoint ? (
                  <div className="text-slate-300 flex items-center gap-1.5">
                    <span className="text-amber-400">📍</span>
                    <span className="text-slate-400">التجمع:</span>
                    <strong className="text-amber-300 font-bold">{student.pickupPoint}</strong>
                  </div>
                ) : (
                  <div className="text-slate-400 text-[11px] font-mono">KYN - {student.ticketCode}</div>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  {student.nationalId && (
                    <div className="text-slate-300 font-mono flex items-center gap-1">
                      <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">ID</span>
                      <span className="text-slate-400">القومي:</span>
                      <strong className="text-white font-mono">{student.nationalId}</strong>
                    </div>
                  )}

                  {student.emergencyPhone && (
                    <div className="text-slate-300 flex items-center gap-1">
                      <span className="text-rose-400">📞</span>
                      <span className="text-slate-400">طوارئ:</span>
                      <strong className="text-white font-mono">{student.emergencyPhone}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Verification Stub: QR Code & Barcode (4 cols on desktop - RTL Second Child is on the Left) */}
          <div className="md:col-span-4 flex flex-col items-center justify-between space-y-3 bg-slate-900/80 p-3.5 rounded-2xl border-2 border-dashed border-amber-500/40 text-center relative overflow-hidden">
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
              <span className="text-xs font-mono font-black text-slate-950 mt-1.5 block tracking-wide">
                KYN - {student.ticketCode}
              </span>
            </div>

            {/* Official Verification Tag */}
            <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-center gap-1">
              <span>✓</span>
              <span>تذكرة صعود إلكترونية معتمدة</span>
            </div>

            {/* Barcode Graphic Strip */}
            <div className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-2 text-center">
              <div className="flex justify-center items-center gap-0.5 sm:gap-1 h-5 overflow-hidden">
                <div className="w-0.5 sm:w-1 h-full bg-slate-100"></div>
                <div className="w-1.5 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-1 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-2 h-full bg-slate-100"></div>
                <div className="w-1 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-1.5 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-2 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-1 h-full bg-slate-100"></div>
                <div className="w-1 h-full bg-slate-100"></div>
                <div className="w-2 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-1.5 h-full bg-slate-100"></div>
                <div className="w-0.5 h-full bg-slate-100"></div>
                <div className="w-1 h-full bg-slate-100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS TOOLBAR */}
      {showActions && (
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 shadow-lg space-y-2.5">
          {downloadSuccessInfo && (
            <div className="bg-emerald-950/90 border border-emerald-500/60 p-3 rounded-xl text-xs text-emerald-200 flex items-center justify-between flex-wrap gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">
                    تم تنزيل صورة التذكرة بنجاح إلى جهازك! 📥
                  </div>
                  <div className="text-[11px] text-emerald-300 font-mono mt-0.5">
                    الملف: <span className="text-amber-300 font-bold">{downloadSuccessInfo.filename}</span> في مجلد التنزيلات (Downloads).
                  </div>
                </div>
              </div>

              {downloadSuccessInfo.url && (
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(downloadSuccessInfo.url || null)}
                  className="bg-emerald-800 hover:bg-emerald-700 text-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  معاينة وتكبير الصورة 🔍
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {/* Download HD PNG Image */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadHDImage}
              className="bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20 disabled:opacity-50"
              title="تنزيل صورة التذكرة فقط فائقة الدقة بجهازك"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              <span>تحميل التذكرة كصورة (HD PNG) 🖼️</span>
            </button>

            {/* Download PDF */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPDF}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>تحميل التذكرة (PDF) 📄</span>
            </button>

            {/* Direct WhatsApp Share (Ticket Image PNG) */}
            <button
              type="button"
              disabled={isExporting}
              onClick={handleWhatsAppImageShare}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <span>مشاركة بالواتساب 📲</span>
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

      {/* Standalone Generated Ticket Image Preview Modal */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-5 max-w-3xl w-full space-y-4 text-center shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-amber-300 font-bold text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" /> صورة التذكرة المستخرجة بجودة فائقة (Ultra HD)
              </h4>
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-2 rounded-2xl border border-slate-800 overflow-hidden flex justify-center">
              <img
                src={previewImageUrl}
                alt="Ticket Preview"
                className="max-h-[70vh] w-auto rounded-xl object-contain shadow-2xl"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-400">
                💡 يمكنك أيضاً الضغط مطولاً أو بالزر الأيمن على الصورة واختيار <strong>"حفظ الصورة باسم..."</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  if (previewImageUrl) {
                    const downloadLink = document.createElement('a');
                    downloadLink.href = previewImageUrl;
                    downloadLink.download = `KAYAN_Ticket_${student.ticketCode}_${student.name}.png`;
                    downloadLink.target = '_blank';
                    downloadLink.rel = 'noopener noreferrer';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    setTimeout(() => {
                      if (document.body.contains(downloadLink)) {
                        document.body.removeChild(downloadLink);
                      }
                    }, 2000);
                  }
                }}
                className="bg-amber-600 hover:bg-amber-500 text-white font-black px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                تنزيل الصورة لجهازك
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

