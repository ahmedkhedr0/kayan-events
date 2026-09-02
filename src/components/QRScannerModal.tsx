import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  X,
  FlipHorizontal,
  Phone,
  MessageCircle,
  Bus,
  Sparkles,
  Shirt,
  UtensilsCrossed,
  UserCheck,
  RotateCw,
  Eye,
  Check,
  Search,
  Users,
  CreditCard,
  MapPin,
  Clock,
  Zap,
  Lock,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Student, PARTICIPANT_ROLES_CONFIG, ActiveUserSession } from '../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  userSession?: ActiveUserSession;
  onUpdateStudent?: (student: Student) => void;
  onToggleCheckInDeparture?: (studentId: string) => void;
  onToggleCheckInReturn?: (studentId: string) => void;
  onToggleTShirtReceived?: (studentId: string) => void;
  onToggleMealReceived?: (studentId: string) => void;
  onOpenDigitalTicket?: (student: Student) => void;
  onCheckInStudentByCode?: (code: string) => { success: boolean; studentName?: string; message: string };
}

// Audio Beep & Haptic Vibration Feedback
const playScannerBeep = (isSuccess = true) => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (isSuccess) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12); // A6
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch {
    // Ignore audio failures silently
  }

  // Mobile vibration feedback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (isSuccess) {
        navigator.vibrate([60, 30, 80]);
      } else {
        navigator.vibrate([150, 50, 150]);
      }
    } catch {
      // Ignore vibration errors
    }
  }
};

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  students,
  userSession,
  onUpdateStudent,
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onToggleTShirtReceived,
  onToggleMealReceived,
  onOpenDigitalTicket,
  onCheckInStudentByCode,
}) => {
  const restrictedBus =
    userSession && userSession.role !== 'admin' && userSession.assignedBus && userSession.assignedBus > 0
      ? userSession.assignedBus
      : 0;

  const visibleStudents = restrictedBus > 0 ? students.filter((s) => s.busNumber === restrictedBus) : students;

  const [manualCode, setManualCode] = useState('');
  const [activeTab, setActiveTab] = useState<'camera' | 'search'>('camera');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusFilter, setSelectedBusFilter] = useState<number | 'all'>(restrictedBus > 0 ? restrictedBus : 'all');
  const [scannedStudentId, setScannedStudentId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Keep selectedBusFilter in sync if restrictedBus changes
  useEffect(() => {
    if (restrictedBus > 0) {
      setSelectedBusFilter(restrictedBus);
    }
  }, [restrictedBus]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const qrRegionId = 'qr-reader-viewport';

  // Get currently selected/scanned student
  const currentStudent = students.find((s) => s.id === scannedStudentId) || null;

  // Global Check-in metrics (based on visible/permitted students)
  const totalStudents = visibleStudents.length;
  const departureCheckedCount = visibleStudents.filter((s) => s.checkInDeparture).length;
  const returnCheckedCount = visibleStudents.filter((s) => s.checkInReturn).length;
  const tshirtDeliveredCount = visibleStudents.filter((s) => s.tshirtReceived).length;
  const mealDeliveredCount = visibleStudents.filter((s) => s.mealReceived).length;

  // Parse and match any code (JSON or Plain String)
  const processScannedCode = (decodedText: string) => {
    if (!decodedText || !decodedText.trim()) return;

    let ticketCode = decodedText.trim();

    // Check if QR contains structured JSON
    try {
      if (ticketCode.startsWith('{') && ticketCode.endsWith('}')) {
        const parsed = JSON.parse(ticketCode);
        if (parsed.ticket) {
          ticketCode = String(parsed.ticket);
        } else if (parsed.ticketCode) {
          ticketCode = String(parsed.ticketCode);
        }
      }
    } catch {
      // Continue with raw string
    }

    // Prevent immediate duplicate firing
    if (lastScannedCodeRef.current === ticketCode) return;
    lastScannedCodeRef.current = ticketCode;

    const normalizedInput = ticketCode.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Search student by ticketCode, phone, ID, or National ID
    const found = students.find((s) => {
      const sTicketNorm = s.ticketCode.toLowerCase().replace(/[^a-z0-9]/g, '');
      const sPhoneNorm = s.phone.replace(/[^0-9]/g, '');
      const sIdNorm = s.id.toLowerCase();
      const sNationalId = (s.nationalId || '').replace(/[^0-9]/g, '');

      return (
        sTicketNorm === normalizedInput ||
        s.ticketCode.toLowerCase() === ticketCode.toLowerCase() ||
        (normalizedInput.length >= 4 && sTicketNorm.includes(normalizedInput)) ||
        (sPhoneNorm && sPhoneNorm.includes(normalizedInput)) ||
        (sNationalId && sNationalId.includes(normalizedInput)) ||
        sIdNorm === normalizedInput
      );
    });

    if (found) {
      // Check bus permission isolation
      if (restrictedBus > 0 && found.busNumber !== restrictedBus) {
        playScannerBeep(false);
        setScanResult({
          success: false,
          message: `⛔ غير مصرح: المشترك (${found.name}) مسجل بحافلة #${found.busNumber}. أنت مخصص لحافلة #${restrictedBus} فقط!`,
        });
        setTimeout(() => {
          lastScannedCodeRef.current = null;
        }, 3000);
        return;
      }

      setScannedStudentId(found.id);
      playScannerBeep(true);
      setScanResult({
        success: true,
        message: `تم التعرف على تذكرة ${found.name} (حافلة ${found.busNumber})`,
      });
      // Optionally run onCheckInStudentByCode callback if present
      if (onCheckInStudentByCode) {
        onCheckInStudentByCode(found.ticketCode);
      }
    } else {
      playScannerBeep(false);
      setScanResult({
        success: false,
        message: `لم يتم العثور على تذكرة بالكود: "${ticketCode}"`,
      });
    }

    // Reset scanner lock after 3 seconds
    setTimeout(() => {
      lastScannedCodeRef.current = null;
    }, 3000);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      // Ensure region exists in DOM
      const targetElem = document.getElementById(qrRegionId);
      if (!targetElem) return;

      const html5QrCode = new Html5Qrcode(qrRegionId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => processScannedCode(decodedText),
        () => {} // Silently ignore individual frame lookup errors
      );

      setIsScanning(true);
    } catch (err: unknown) {
      console.warn('Camera start error:', err);
      setIsScanning(false);
      const msg =
        err instanceof Error ? err.message : 'عذراً، تعذر الاتصال بالكاميرا. يرجى التأكد من منح صلاحية الكاميرا للمتصفح.';
      setCameraError(msg);
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Failed to stop scanner:', err);
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  };

  // Toggle Camera (Front / Back)
  const toggleCamera = async () => {
    await stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Lifecycle control
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !currentStudent) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, facingMode, currentStudent]);

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setScannedStudentId(null);
      setScanResult(null);
      setManualCode('');
      setSearchQuery('');
      stopCamera();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModalClose = async () => {
    await stopCamera();
    onClose();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScannedCode(manualCode.trim());
    setManualCode('');
  };

  // ----------------------------------------------------
  // QUICK SHORTCUT HANDLERS (الاختصارات السريعة للتحضير)
  // ----------------------------------------------------
  const handleToggleDeparture = (student: Student) => {
    if (onToggleCheckInDeparture) {
      onToggleCheckInDeparture(student.id);
    } else if (onUpdateStudent) {
      const isNowChecked = !student.checkInDeparture;
      onUpdateStudent({
        ...student,
        checkInDeparture: isNowChecked,
        departureTime: isNowChecked ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : undefined,
      });
    }
    playScannerBeep(true);
  };

  const handleToggleReturn = (student: Student) => {
    if (onToggleCheckInReturn) {
      onToggleCheckInReturn(student.id);
    } else if (onUpdateStudent) {
      const isNowChecked = !student.checkInReturn;
      onUpdateStudent({
        ...student,
        checkInReturn: isNowChecked,
        returnTime: isNowChecked ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : undefined,
      });
    }
    playScannerBeep(true);
  };

  const handleToggleTShirt = (student: Student) => {
    if (onToggleTShirtReceived) {
      onToggleTShirtReceived(student.id);
    } else if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        tshirtReceived: !student.tshirtReceived,
      });
    }
    playScannerBeep(true);
  };

  const handleToggleMeal = (student: Student) => {
    if (onToggleMealReceived) {
      onToggleMealReceived(student.id);
    } else if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        mealReceived: !student.mealReceived,
      });
    }
    playScannerBeep(true);
  };

  const handleToggleCompanionTshirt = (student: Student) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        companionTshirtReceived: !student.companionTshirtReceived,
      });
      playScannerBeep(true);
    }
  };

  const handleToggleCompanionMeal = (student: Student) => {
    if (onUpdateStudent) {
      onUpdateStudent({
        ...student,
        companionMealReceived: !student.companionMealReceived,
      });
      playScannerBeep(true);
    }
  };

  // Master 1-Click All-in-One Shortcut
  const handleMarkAllReceivedAndChecked = (student: Student) => {
    const timeNow = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const updated: Student = {
      ...student,
      checkInDeparture: true,
      departureTime: student.departureTime || timeNow,
      tshirtReceived: true,
      mealReceived: student.hasMeal ? true : student.mealReceived,
      companionTshirtReceived: student.hasCompanion ? true : student.companionTshirtReceived,
      companionMealReceived: student.hasCompanion && student.companionHasMeal ? true : student.companionMealReceived,
    };

    if (onUpdateStudent) {
      onUpdateStudent(updated);
    }
    playScannerBeep(true);
    setScanResult({
      success: true,
      message: `✓ تم تسجيل حضور الذهاب واستلام التيشرت والوجبة بالكامل لـ ${student.name}`,
    });
  };

  // Filtered students for search tab (derived from visibleStudents for isolation)
  const filteredStudents = visibleStudents.filter((s) => {
    const matchesBus = selectedBusFilter === 'all' || s.busNumber === selectedBusFilter;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesBus;

    const matchesName = s.name.toLowerCase().includes(query);
    const matchesPhone = s.phone.includes(query);
    const matchesTicket = s.ticketCode.toLowerCase().includes(query);
    const matchesFaculty = s.faculty.toLowerCase().includes(query);
    const matchesCompanion = s.companionName?.toLowerCase().includes(query);

    return matchesBus && (matchesName || matchesPhone || matchesTicket || matchesFaculty || matchesCompanion);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-5 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-2xl text-slate-950 shadow-md shadow-amber-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  ماسح كود QR والتحضير الإلكتروني السريع
                </h3>
                {restrictedBus > 0 ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    حافلة #{restrictedBus} فقط
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    مباشر
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {restrictedBus > 0
                  ? `أنت مصرح لك بمسح وتفقد ركاب حافلة رقم (${restrictedBus}) فقط`
                  : 'تسجيل الحضور وتسليم التيشرت والوجبات بنقرة واحدة'}
              </p>
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-2 rounded-xl transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Bar Barometer */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-4 py-2.5 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
          <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 block">ذهاب</span>
            <span className="text-xs font-bold text-indigo-300 font-mono">
              {departureCheckedCount}/{totalStudents}
            </span>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 block">عودة</span>
            <span className="text-xs font-bold text-emerald-300 font-mono">
              {returnCheckedCount}/{totalStudents}
            </span>
          </div>
          <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 block">تيشرت</span>
            <span className="text-xs font-bold text-amber-300 font-mono">
              {tshirtDeliveredCount}/{totalStudents}
            </span>
          </div>
          <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-1.5">
            <span className="text-[10px] text-slate-400 block">وجبات</span>
            <span className="text-xs font-bold text-purple-300 font-mono">
              {mealDeliveredCount}/{totalStudents}
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* If student is scanned -> Show Full Shortcuts Deck */}
          {currentStudent ? (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              {/* Student Summary Card */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 relative overflow-hidden">
                {/* Gold ambient glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

                {/* Card Top: Name, Role & Ticket Code */}
                <div className="flex justify-between items-start gap-3 border-b border-slate-800 pb-3">
                  <div className="space-y-1 text-right">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-md font-black border ${
                          PARTICIPANT_ROLES_CONFIG[currentStudent.participantRole || 'student']?.bg || 'bg-indigo-500/20'
                        } ${PARTICIPANT_ROLES_CONFIG[currentStudent.participantRole || 'student']?.text || 'text-indigo-300'} ${
                          PARTICIPANT_ROLES_CONFIG[currentStudent.participantRole || 'student']?.border || 'border-indigo-500/40'
                        }`}
                      >
                        {PARTICIPANT_ROLES_CONFIG[currentStudent.participantRole || 'student']?.icon}{' '}
                        {currentStudent.customRole || PARTICIPANT_ROLES_CONFIG[currentStudent.participantRole || 'student']?.label}
                      </span>

                      {currentStudent.gender === 'female' ? (
                        <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                          أنثى 👧
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                          ذكر 👦
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {currentStudent.name}
                    </h2>

                    <p className="text-xs text-amber-300 font-bold">
                      {currentStudent.faculty || 'نظم ومعلومات - 2026'}
                    </p>
                  </div>

                  {/* Golden Ticket Code */}
                  <div className="bg-gradient-to-r from-amber-500/25 to-amber-600/35 border border-amber-500/60 rounded-2xl px-3.5 py-1.5 text-center shrink-0 shadow-inner">
                    <span className="text-[9px] text-amber-400 font-bold block">كود التذكرة</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300 font-mono tracking-wide">
                      #{currentStudent.ticketCode}
                    </span>
                  </div>
                </div>

                {/* Key Logistics Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Bus & Seat */}
                  <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-2.5 flex items-center gap-2.5">
                    <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-300 shrink-0">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">الحافلة والمقعد</span>
                      <strong className="text-white text-xs sm:text-sm font-black block">
                        أتوبيس ({currentStudent.busNumber})
                      </strong>
                      <span className="text-amber-300 text-[11px] font-bold">
                        {currentStudent.seatNumber ? `مقعد #${currentStudent.seatNumber}` : 'مقعد حر'}
                      </span>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div
                    className={`rounded-2xl p-2.5 border flex items-center gap-2.5 ${
                      currentStudent.paymentStatus === 'paid'
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-black/20 shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">حالة السداد</span>
                      <strong className="text-xs font-black block">
                        {currentStudent.paymentStatus === 'paid'
                          ? 'مسدد بالكامل ✓'
                          : currentStudent.paymentStatus === 'deposit'
                          ? `عربون (متبقي ${currentStudent.remainingAmount} ج.م)`
                          : `غير مسدد (${currentStudent.totalAmount} ج.م)`}
                      </strong>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {currentStudent.paidAmount} / {currentStudent.totalAmount} ج.م
                      </span>
                    </div>
                  </div>

                  {/* Pickup point */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 col-span-2 sm:col-span-1 flex items-center gap-2.5">
                    <div className="bg-amber-500/20 p-2 rounded-xl text-amber-300 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <span className="text-[10px] text-slate-400 block font-medium">نقطة التجمع</span>
                      <strong className="text-slate-200 text-xs font-bold block truncate">
                        {currentStudent.pickupPoint || 'جامع الاستاد - كفرالشيخ'}
                      </strong>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {currentStudent.departureTime ? `حضر: ${currentStudent.departureTime}` : 'لم يحضر بعد'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Phone Call & WhatsApp Bar */}
                <div className="flex items-center justify-between bg-slate-950/90 border border-slate-800 rounded-2xl p-2.5 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-400 text-[11px]">الهاتف:</span>
                    <strong className="text-white font-mono text-xs">{currentStudent.phone}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${currentStudent.phone}`}
                      className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>اتصال</span>
                    </a>
                    <a
                      href={`https://wa.me/2${currentStudent.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors shadow-sm shadow-emerald-600/30"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>
                </div>

                {/* THE 4 CORE SHORTCUT BUTTONS (الاختصارات السريعة) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      اختصارات التسجيل والاستلام الفورية:
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">اضغط على الزر للتبديل السريع</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* 1. حضور الذهاب */}
                    <button
                      type="button"
                      onClick={() => handleToggleDeparture(currentStudent)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between group ${
                        currentStudent.checkInDeparture
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50'
                          : 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            currentStudent.checkInDeparture
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400 group-hover:text-indigo-300'
                          }`}
                        >
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs font-black">حضور الذهاب (التحرك)</strong>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            {currentStudent.checkInDeparture
                              ? `✓ تم التحضير (${currentStudent.departureTime || 'تجمع الصباح'})`
                              : '⏳ لم يسجل حضور الذهاب'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-black ${
                          currentStudent.checkInDeparture
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-slate-500'
                        }`}
                      >
                        {currentStudent.checkInDeparture ? '✓' : ''}
                      </div>
                    </button>

                    {/* 2. حضور العودة */}
                    <button
                      type="button"
                      onClick={() => handleToggleReturn(currentStudent)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between group ${
                        currentStudent.checkInReturn
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50'
                          : 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            currentStudent.checkInReturn
                              ? 'bg-emerald-500 text-slate-950 font-black'
                              : 'bg-slate-800 text-slate-400 group-hover:text-indigo-300'
                          }`}
                        >
                          <RotateCw className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs font-black">حضور العودة (المساء)</strong>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            {currentStudent.checkInReturn
                              ? `✓ تم تأكيد العودة (${currentStudent.returnTime || 'باص العودة'})`
                              : '⏳ لم يسجل حضور العودة'}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-black ${
                          currentStudent.checkInReturn
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900 text-slate-500'
                        }`}
                      >
                        {currentStudent.checkInReturn ? '✓' : ''}
                      </div>
                    </button>

                    {/* 3. استلام التيشرت - Only show if student has a tshirt, or show 'غير مشمول' state */}
                    {currentStudent.tshirtSize &&
                    currentStudent.tshirtSize !== 'none' &&
                    currentStudent.tshirtSize !== 'None' &&
                    currentStudent.tshirtSize !== 'بدون' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleTShirt(currentStudent)}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between group ${
                          currentStudent.tshirtReceived
                            ? 'bg-amber-950/80 border-amber-500 text-amber-200 shadow-md shadow-amber-950/50'
                            : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              currentStudent.tshirtReceived
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-400 group-hover:text-amber-300'
                            }`}
                          >
                            <Shirt className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-black">استلام التيشرت</strong>
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                                {currentStudent.tshirtSize}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {currentStudent.tshirtReceived
                                ? `✓ تم تسليم التيشرت (مقاس ${currentStudent.tshirtSize})`
                                : `⏳ في انتظار التسليم (مقاس ${currentStudent.tshirtSize})`}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-black ${
                            currentStudent.tshirtReceived
                              ? 'bg-amber-500 border-amber-400 text-slate-950'
                              : 'border-slate-700 bg-slate-900 text-slate-500'
                          }`}
                        >
                          {currentStudent.tshirtReceived ? '✓' : ''}
                        </div>
                      </button>
                    ) : (
                      <div className="p-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 text-right flex items-center justify-between opacity-70">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-slate-600 flex items-center justify-center shrink-0">
                            <Shirt className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-xs font-bold text-slate-400 block">التيشرت</strong>
                            <span className="text-[10px] text-slate-400 block">التذكرة بدون تيشرت</span>
                          </div>
                        </div>
                        <span className="bg-slate-900 text-slate-400 text-[10px] px-2 py-0.5 rounded-lg font-bold border border-slate-800">
                          غير مشمول ✕
                        </span>
                      </div>
                    )}

                    {/* 4. استلام الوجبة - Only show if student has a meal option */}
                    {currentStudent.hasMeal ? (
                      <button
                        type="button"
                        onClick={() => handleToggleMeal(currentStudent)}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between group ${
                          currentStudent.mealReceived
                            ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow-md shadow-purple-950/50'
                            : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              currentStudent.mealReceived
                                ? 'bg-purple-500 text-white font-black'
                                : 'bg-slate-800 text-slate-400 group-hover:text-purple-300'
                            }`}
                          >
                            <UtensilsCrossed className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-black">استلام الوجبة</strong>
                              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] px-1.5 py-0.2 rounded font-bold">
                                {currentStudent.mealOption || 'وجبة'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-[140px]">
                              {currentStudent.mealReceived
                                ? '✓ تم تسليم وجبة الطعام'
                                : `⏳ في انتظار التسليم (${currentStudent.mealOption || 'وجبة'})`}
                            </span>
                          </div>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-black ${
                            currentStudent.mealReceived
                              ? 'bg-purple-500 border-purple-400 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-500'
                          }`}
                        >
                          {currentStudent.mealReceived ? '✓' : ''}
                        </div>
                      </button>
                    ) : (
                      <div className="p-3 rounded-2xl border border-slate-800/80 bg-slate-950/40 text-right flex items-center justify-between opacity-70">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-slate-600 flex items-center justify-center shrink-0">
                            <UtensilsCrossed className="w-5 h-5" />
                          </div>
                          <div>
                            <strong className="text-xs font-bold text-slate-400 block">وجبة الطعام</strong>
                            <span className="text-[10px] text-slate-400 block">التذكرة بدون وجبة</span>
                          </div>
                        </div>
                        <span className="bg-slate-900 text-slate-400 text-[10px] px-2 py-0.5 rounded-lg font-bold border border-slate-800">
                          غير مشمول ✕
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Companion Sub-Card */}
                {currentStudent.hasCompanion && currentStudent.companionName && (
                  <div className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-bold">
                        <Users className="w-4 h-4 text-amber-400" />
                        <span>مرافق الحجز: <strong className="text-white">{currentStudent.companionName}</strong></span>
                      </div>
                      <span className="text-slate-400 text-[10px] font-mono">
                        {currentStudent.companionSeatNumber ? `مقعد #${currentStudent.companionSeatNumber}` : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleCompanionTshirt(currentStudent)}
                        className={`p-2 rounded-xl border text-right transition-all flex items-center justify-between ${
                          currentStudent.companionTshirtReceived
                            ? 'bg-amber-950/70 border-amber-500 text-amber-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Shirt className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px] font-bold">
                            تيشرت المرافق ({currentStudent.companionTShirtSize || 'L'})
                          </span>
                        </div>
                        <span>{currentStudent.companionTshirtReceived ? '✓' : '⏳'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleCompanionMeal(currentStudent)}
                        className={`p-2 rounded-xl border text-right transition-all flex items-center justify-between ${
                          currentStudent.companionMealReceived
                            ? 'bg-purple-950/70 border-purple-500 text-purple-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[11px] font-bold">وجبة المرافق</span>
                        </div>
                        <span>{currentStudent.companionMealReceived ? '✓' : '⏳'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Master Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {/* Master 1-Click Check All Button */}
                  <button
                    type="button"
                    onClick={() => handleMarkAllReceivedAndChecked(currentStudent)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-transform active:scale-98"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>تسجيل الكل بنقرة واحدة (حضور + تيشرت + وجبة)</span>
                  </button>

                  {/* View Full Digital Ticket Card */}
                  {onOpenDigitalTicket && (
                    <button
                      type="button"
                      onClick={() => onOpenDigitalTicket(currentStudent)}
                      className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                      <span>التذكرة الكاملة</span>
                    </button>
                  )}

                  {/* Scan Next Ticket Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setScannedStudentId(null);
                      setScanResult(null);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    <span>مسح تذكرة جديدة</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* SCANNER & SEARCH INTERFACE */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'camera'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>كاميرا الـ QR المباشرة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('search')}
                  className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'search'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>البحث السريع والكود اليدوي</span>
                </button>
              </div>

              {/* CAMERA TAB */}
              {activeTab === 'camera' && (
                <div className="space-y-3">
                  <div className="bg-slate-950 border-2 border-amber-500/50 rounded-3xl p-3 text-center relative overflow-hidden space-y-2">
                    {/* Live Camera Container */}
                    <div className="relative w-full min-h-[270px] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
                      {/* Target element for html5-qrcode */}
                      <div id={qrRegionId} className="w-full h-full"></div>

                      {/* Camera Switch Floating Button */}
                      {isScanning && (
                        <button
                          type="button"
                          onClick={toggleCamera}
                          className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/40 hover:bg-slate-800 z-20 flex items-center gap-1.5 text-xs font-bold shadow-lg"
                          title="تبديل الكاميرا (أمامية / خلفية)"
                        >
                          <FlipHorizontal className="w-4 h-4" />
                          <span>تبديل الكاميرا</span>
                        </button>
                      )}

                      {/* Camera Error Message */}
                      {cameraError && (
                        <div className="p-4 text-center space-y-2 z-10">
                          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                          <p className="text-xs text-rose-300 font-bold">{cameraError}</p>
                          <button
                            onClick={startCamera}
                            className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center gap-1 mt-2"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> إعادة المحاولة
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      وجه الكاميرا نحو QR Code التذكرة لتأكيد الحضور واستلام التيشرت والوجبة فوراً
                    </p>
                  </div>
                </div>
              )}

              {/* SEARCH & MANUAL INPUT TAB */}
              {activeTab === 'search' && (
                <div className="space-y-3">
                  {/* Search and Filter Inputs */}
                  <div className="space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="ابحث بالاسم، كود التذكرة (#8001)، الهاتف، أو الكلية..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl pr-9 pl-4 py-2.5 text-xs focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
                        autoFocus
                      />
                    </div>

                    {/* Bus Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      <span className="text-slate-500 text-[10px] shrink-0">الحافلة:</span>
                      {restrictedBus > 0 ? (
                        <div className="px-3 py-1 rounded-lg font-bold shrink-0 bg-amber-500 text-slate-950 font-black flex items-center gap-1.5 text-xs shadow-sm">
                          <Lock className="w-3.5 h-3.5" />
                          <span>حافلة #{restrictedBus} ({visibleStudents.length})</span>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedBusFilter('all')}
                            className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                              selectedBusFilter === 'all'
                                ? 'bg-amber-500 text-slate-950 font-black'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            الكل ({students.length})
                          </button>
                          {[1, 2, 3, 4, 5, 6].map((busNum) => {
                            const count = students.filter((s) => s.busNumber === busNum).length;
                            if (count === 0) return null;
                            return (
                              <button
                                key={busNum}
                                type="button"
                                onClick={() => setSelectedBusFilter(busNum)}
                                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-colors ${
                                  selectedBusFilter === busNum
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-900 text-slate-400 hover:text-white'
                                }`}
                              >
                                باص {busNum} ({count})
                              </button>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Student List Results */}
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        لم يتم العثور على أي مشترك يطابق بحثك
                      </div>
                    ) : (
                      filteredStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setScannedStudentId(s.id);
                            playScannerBeep(true);
                          }}
                          className="bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/50 p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                              B{s.busNumber}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <strong className="text-white text-xs font-black group-hover:text-amber-300 transition-colors truncate">
                                  {s.name}
                                </strong>
                                <span className="bg-slate-900 text-amber-300 text-[10px] font-mono px-1.5 py-0.2 rounded border border-slate-800 shrink-0">
                                  #{s.ticketCode}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {s.faculty} • {s.phone}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Badges */}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                s.checkInDeparture
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}
                            >
                              {s.checkInDeparture ? 'ذهاب ✓' : 'ذهاب ⏳'}
                            </span>

                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                s.tshirtReceived
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}
                            >
                              👕 {s.tshirtSize || 'L'}
                            </span>

                            <span className="bg-amber-500 text-slate-950 text-[11px] font-bold px-2 py-1 rounded-lg group-hover:bg-amber-400 transition-colors">
                              فتح
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Manual Code Input Bar */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300">أو إدخال كود التذكرة أو الهاتف يدوياً:</label>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="مثال: 8001 أو KYN-8001 أو رقم الهاتف..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                  >
                    تحضير
                  </button>
                </form>
              </div>

              {/* Quick Sample Student Code Pickers */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold block mb-1.5">
                  ⚡ اختبار فوري للتذاكر (انقر على أي تذكرة لتجربة نافذة التحضير):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {visibleStudents.slice(0, 8).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setScannedStudentId(s.id);
                        playScannerBeep(true);
                      }}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-500 text-[10px] text-amber-300 hover:text-white px-2 py-1 rounded-xl font-mono transition-colors flex items-center gap-1"
                    >
                      <span>#{s.ticketCode}</span>
                      <span className="text-slate-400 font-sans">({s.name.split(' ')[0]})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scan Feedback Banner */}
          {scanResult && (
            <div
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-lg ${
                scanResult.success
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-500 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {scanResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span>{scanResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
