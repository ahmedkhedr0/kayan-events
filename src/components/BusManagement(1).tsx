import React, { useState } from 'react';
import {
  Bus,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  QrCode,
  UserCheck,
  ShieldAlert,
  ArrowRightLeft,
  Search,
  Sparkles,
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Info,
  Printer,
  Download,
  Shuffle,
  FileText,
  UserPlus,
  ArrowUpDown,
  GripVertical,
  Send,
  Bell,
  ExternalLink,
  AlertTriangle,
  Shirt,
  Square,
  CheckSquare,
} from 'lucide-react';
import { Student, DriverInfo, TripSettings, ParticipantRole, PARTICIPANT_ROLES_CONFIG, getStudentMealInfo } from '../types';
import { generateStudentTicketPDF } from '../services/pdfGenerator';

interface BusManagementProps {
  students: Student[];
  drivers: DriverInfo[];
  settings?: TripSettings;
  onToggleCheckInDeparture: (studentId: string) => void;
  onToggleCheckInReturn: (studentId: string) => void;
  onToggleTShirtReceived?: (studentId: string) => void;
  onToggleMealReceived?: (studentId: string) => void;
  onUpdateStudentBus: (studentId: string, newBus: number, newSeat?: number) => void;
  onOpenQRScanner: () => void;
  onOpenTicketPassModal?: (student: Student) => void;
  onUpdateDriver?: (updatedDriver: DriverInfo) => void;
  onAddDriver?: (newDriver: DriverInfo) => void;
  onDeleteDriver?: (busNumber: number) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
  onNavigateTab?: (tab: string) => void;
}

interface SeatModificationRecord {
  previousBus: number;
  previousSeat?: number;
  newBus: number;
  newSeat?: number;
  timestamp: number;
  ticketSent: boolean;
}

export const BusManagement: React.FC<BusManagementProps> = ({
  students,
  drivers,
  settings,
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onToggleTShirtReceived,
  onToggleMealReceived,
  onUpdateStudentBus,
  onOpenQRScanner,
  onOpenTicketPassModal,
  onUpdateDriver,
  onAddDriver,
  onDeleteDriver,
  onUpdateStudent,
  onNavigateTab,
}) => {
  const [selectedBus, setSelectedBus] = useState<number>(1);
  const [checkInPhase, setCheckInPhase] = useState<'departure' | 'return'>('departure');
  const [searchStudentTerm, setSearchStudentTerm] = useState('');

  // Modals state
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [busToDelete, setBusToDelete] = useState<number | null>(null);

  // Manifest & Seat Swap / Action Modals State
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isBatchSendModalOpen, setIsBatchSendModalOpen] = useState(false);
  const [selectedSeatAction, setSelectedSeatAction] = useState<{
    seatNumber: number;
    student?: Student;
  } | null>(null);

  // Drag & Drop State
  const [draggedSeat, setDraggedSeat] = useState<{
    student: Student;
    seatNumber?: number;
    busNumber: number;
  } | null>(null);
  const [dragOverSeatNo, setDragOverSeatNo] = useState<number | null>(null);
  const [dragOverBusTab, setDragOverBusTab] = useState<number | null>(null);

  // Seat Action modal state
  const [targetSwapStudentId, setTargetSwapStudentId] = useState<string>('');
  const [targetNewSeatNum, setTargetNewSeatNum] = useState<number>(1);
  const [targetNewBusNum, setTargetNewBusNum] = useState<number>(1);
  const [targetAssignStudentId, setTargetAssignStudentId] = useState<string>('');

  // Swap & Direct Transfer modal state
  const [swapStudentA, setSwapStudentA] = useState<string>('');
  const [swapStudentB, setSwapStudentB] = useState<string>('');
  const [transferStudentId, setTransferStudentId] = useState<string>('');
  const [transferTargetBus, setTransferTargetBus] = useState<number>(1);
  const [transferTargetSeat, setTransferTargetSeat] = useState<string>('');

  // Modified seats tracking state
  const [modifiedSeats, setModifiedSeats] = useState<Record<string, SeatModificationRecord>>(() => {
    try {
      const saved = localStorage.getItem('kayan_modified_seats');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Edit Bus Form
  const [editDriverForm, setEditDriverForm] = useState<DriverInfo | null>(null);

  // Add Bus Form
  const [newBusForm, setNewBusForm] = useState<DriverInfo>({
    busNumber: drivers.length > 0 ? Math.max(...drivers.map((d) => d.busNumber)) + 1 : 1,
    driverName: 'السائق الكابتن',
    driverPhone: '01000000000',
    busPlateNumber: 'أ ب ج 1234',
    supervisorName: 'المشرف المسؤول',
    supervisorPhone: '01100000000',
    capacity: 50,
    notes: 'أتوبيس مرسيدس مكيف حديث',
  });

  // Calculate dynamic bus numbers
  const busNumbers: number[] =
    drivers.length > 0
      ? Array.from(new Set<number>(drivers.map((d) => Number(d.busNumber)))).sort((a, b) => a - b)
      : [1, 2, 3, 4, 5, 6];

  const currentDriver = drivers.find((d) => d.busNumber === selectedBus) || {
    busNumber: selectedBus,
    driverName: 'السائق لم يحدد',
    driverPhone: '—',
    busPlateNumber: '—',
    supervisorName: 'مشرف الأتوبيس',
    supervisorPhone: '—',
    capacity: 50,
    notes: '',
  };

  const currentBusStudents = students.filter((s) => s.busNumber === selectedBus);

  // Dynamic Metrics across trip
  const totalRegisteredStudents = students.length;
  const totalBusCapacityAllBuses = drivers.reduce((sum, d) => sum + (d.capacity || 50), 0) || (busNumbers.length * 50);
  const recommendedBusesCount = Math.ceil(totalRegisteredStudents / 50) || 1;
  const totalRemainingSeatsInFleet = Math.max(0, totalBusCapacityAllBuses - totalRegisteredStudents);

  const currentBusCapacity = currentDriver.capacity || 50;

  // Track modification helper
  const recordSeatModification = (
    studentId: string,
    oldBus: number,
    oldSeat?: number,
    newBus?: number,
    newSeat?: number
  ) => {
    setModifiedSeats((prev) => {
      const updated = {
        ...prev,
        [studentId]: {
          previousBus: oldBus,
          previousSeat: oldSeat,
          newBus: newBus ?? oldBus,
          newSeat: newSeat,
          timestamp: Date.now(),
          ticketSent: false,
        },
      };
      try {
        localStorage.setItem('kayan_modified_seats', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save modified seats to localStorage', e);
      }
      return updated;
    });
  };

  const markTicketAsSent = (studentId: string) => {
    setModifiedSeats((prev) => {
      if (!prev[studentId]) return prev;
      const updated = {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          ticketSent: true,
        },
      };
      try {
        localStorage.setItem('kayan_modified_seats', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const clearModificationRecord = (studentId: string) => {
    setModifiedSeats((prev) => {
      const next = { ...prev };
      delete next[studentId];
      try {
        localStorage.setItem('kayan_modified_seats', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleSendUpdatedWhatsAppTicket = (student: Student, modRecord?: SeatModificationRecord) => {
    const phone = student.phone.replace(/[^0-9]/g, '');
    const formattedPhone = phone.startsWith('0') ? `2${phone}` : phone;

    const oldSeatText = modRecord?.previousSeat ? ` (بدلاً من مقعد #${modRecord.previousSeat})` : '';
    const messageText = `
🎟️ ════════════════════════════ 🎟️
    🚌 *تنبيه: تم تعديل رقم المقعد* 🚌
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

مرحباً عزيزي الطالب: *${student.name}* 👋
تم تحديث مقعدك رسمياً في *${settings?.tripName || 'رحلة كيان'}*:

💺 ═══ *بيانات المقعد الجديد* ═══ 💺
• رقم الأتوبيس: *أتوبيس رقم (${student.busNumber})*
• رقم المقعد الجديد: *#${student.seatNumber || 'سيحدد عند الصعود'}*${oldSeatText}
• كود التذكرة: \`[ ${student.ticketCode} ]\`
• مقاس التيشرت: *${student.tshirtSize}*

⚠️ *ملاحظة:* يرجى الاعتماد على هذا الرقم الجديد في الصعود للأتوبيس.
${settings?.whatsappGroupLink ? `\n🔗 *جروب الواتساب الرسمي:* ${settings.whatsappGroupLink}` : ''}

نتمنى لك رحلة ممتعة مع شركة كيان! 🥳🎉
`.trim();

    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
    markTicketAsSent(student.id);
  };

  // Drag and drop handlers
  const handleDropOnSeat = (targetSeatNo: number, targetStudent?: Student) => {
    if (!draggedSeat) return;
    const sourceStudent = draggedSeat.student;
    const sourceBus = draggedSeat.busNumber;
    const sourceSeat = draggedSeat.seatNumber;

    if (sourceStudent.id === targetStudent?.id) {
      setDraggedSeat(null);
      setDragOverSeatNo(null);
      return;
    }

    if (targetStudent) {
      // Swap seats between sourceStudent and targetStudent
      onUpdateStudentBus(sourceStudent.id, selectedBus, targetSeatNo);
      onUpdateStudentBus(targetStudent.id, sourceBus, sourceSeat);

      recordSeatModification(sourceStudent.id, sourceBus, sourceSeat, selectedBus, targetSeatNo);
      recordSeatModification(targetStudent.id, selectedBus, targetSeatNo, sourceBus, sourceSeat);
    } else {
      // Move sourceStudent to empty targetSeatNo
      onUpdateStudentBus(sourceStudent.id, selectedBus, targetSeatNo);
      recordSeatModification(sourceStudent.id, sourceBus, sourceSeat, selectedBus, targetSeatNo);
    }

    setDraggedSeat(null);
    setDragOverSeatNo(null);
  };

  const handleDropOnBusTab = (targetBusNum: number) => {
    if (!draggedSeat) return;
    const sourceStudent = draggedSeat.student;
    const sourceBus = draggedSeat.busNumber;
    const sourceSeat = draggedSeat.seatNumber;

    if (sourceBus === targetBusNum) {
      setDraggedSeat(null);
      setDragOverBusTab(null);
      return;
    }

    const targetBusStudents = students.filter((s) => s.busNumber === targetBusNum);
    const busCap = drivers.find((d) => d.busNumber === targetBusNum)?.capacity || 50;
    const occupiedSeats = new Set(targetBusStudents.map((s) => s.seatNumber).filter(Boolean));
    let nextSeat = 1;
    while (occupiedSeats.has(nextSeat) && nextSeat <= busCap) nextSeat++;
    const assignedSeat = nextSeat <= busCap ? nextSeat : undefined;

    onUpdateStudentBus(sourceStudent.id, targetBusNum, assignedSeat);
    recordSeatModification(sourceStudent.id, sourceBus, sourceSeat, targetBusNum, assignedSeat);
    setSelectedBus(targetBusNum);

    setDraggedSeat(null);
    setDragOverBusTab(null);
  };

  // Filtered by search if typed
  const displayedStudents = currentBusStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
      s.phone.includes(searchStudentTerm) ||
      s.ticketCode.toLowerCase().includes(searchStudentTerm.toLowerCase())
  );

  const departureCheckedInCount = currentBusStudents.filter((s) => s.checkInDeparture).length;
  const returnCheckedInCount = currentBusStudents.filter((s) => s.checkInReturn).length;

  const pendingModifiedStudents = students.filter(
    (s) => modifiedSeats[s.id] && !modifiedSeats[s.id].ticketSent
  );

  // Swap Seats Helper
  const handleSwapSeats = (idA: string, idB: string) => {
    const sA = students.find((s) => s.id === idA);
    const sB = students.find((s) => s.id === idB);
    if (!sA || !sB) return;

    const busA = sA.busNumber;
    const seatA = sA.seatNumber;
    const busB = sB.busNumber;
    const seatB = sB.seatNumber;

    onUpdateStudentBus(sA.id, busB, seatB);
    onUpdateStudentBus(sB.id, busA, seatA);

    recordSeatModification(sA.id, busA, seatA, busB, seatB);
    recordSeatModification(sB.id, busB, seatB, busA, seatA);
  };

  // Auto assign seats sequentially for bus students without seat numbers
  const handleSequentialAutoSeat = () => {
    const busStudents = students.filter((s) => s.busNumber === selectedBus);
    const occupiedSeats = new Set(busStudents.map((s) => s.seatNumber).filter(Boolean));
    let currentSeat = 1;

    busStudents.forEach((student) => {
      if (!student.seatNumber) {
        while (occupiedSeats.has(currentSeat) && currentSeat <= currentBusCapacity) {
          currentSeat++;
        }
        if (currentSeat <= currentBusCapacity) {
          onUpdateStudentBus(student.id, selectedBus, currentSeat);
          recordSeatModification(student.id, selectedBus, undefined, selectedBus, currentSeat);
          occupiedSeats.add(currentSeat);
          currentSeat++;
        }
      }
    });
  };

  const handleOpenEditDriver = () => {
    setEditDriverForm({ ...currentDriver });
    setIsEditDriverModalOpen(true);
  };

  const handleSaveEditDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (editDriverForm && onUpdateDriver) {
      onUpdateDriver(editDriverForm);
    }
    setIsEditDriverModalOpen(false);
  };

  const handleSaveAddBus = (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddDriver) {
      onAddDriver(newBusForm);
      setSelectedBus(newBusForm.busNumber);
    }
    setIsAddBusModalOpen(false);
    // Reset new bus form for next time
    const nextBusNum = newBusForm.busNumber + 1;
    setNewBusForm({
      busNumber: nextBusNum,
      driverName: 'السائق الجديد',
      driverPhone: '01000000000',
      busPlateNumber: 'س ص ع 5678',
      supervisorName: 'المشرف المسؤول',
      supervisorPhone: '01100000000',
      capacity: 50,
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Dynamic Bus Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Bus className="w-6 h-6 text-amber-400" />
              إدارة الأتوبيسات وتسكين المقاعد (Bus & Fleet Management)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              تكيّف تلقائي مع عدد التسجيلات والطلاب بدون حد أقصى ثوابت
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('manifests')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25 active:scale-95 flex-1 lg:flex-none justify-center cursor-pointer"
                title="فتح مركز الكشوفات والطباعة الورقية المعتمدة"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>مركز الكشوفات A4 🖨️</span>
              </button>
            )}

            <button
              onClick={() => setIsSwapModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 active:scale-95 flex-1 lg:flex-none justify-center"
              title="أداة تبديل المقاعد وإعادة تسكين الأصدقاء"
            >
              <Shuffle className="w-4 h-4" />
              تنظيم وتبديل المقاعد 🔄
            </button>

            <button
              onClick={() => setIsAddBusModalOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              إضافة أتوبيس
            </button>

            <button
              onClick={onOpenQRScanner}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              مسح QR
            </button>
          </div>
        </div>

        {/* Dynamic Capacity Notification Badge */}
        <div className="bg-slate-950/90 border border-slate-800 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              الطلاب المسجلون: <strong className="text-amber-400 font-mono text-sm">{totalRegisteredStudents} طالب</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span>
              الأتوبيسات المطلوبة لخدمتهم: <strong className="text-indigo-400 font-mono text-sm">{recommendedBusesCount} أتوبيس</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
              إجمالي المقاعد: <strong className="text-white">{totalBusCapacityAllBuses}</strong>
            </span>
            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-emerald-300">
              المقاعد المتبقية: <strong className="text-emerald-400">{totalRemainingSeatsInFleet}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Bus Tabs */}
        <div className="flex overflow-x-auto gap-2 pt-1 no-scrollbar">
          {busNumbers.map((busNum) => {
            const count = students.filter((s) => s.busNumber === busNum).length;
            const busDriver = drivers.find((d) => d.busNumber === busNum);
            const cap = busDriver?.capacity || 50;
            const isSelected = selectedBus === busNum;
            const isTabDragOver = dragOverBusTab === busNum;

            return (
              <button
                key={busNum}
                onClick={() => setSelectedBus(busNum)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverBusTab(busNum);
                }}
                onDragLeave={() => setDragOverBusTab(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnBusTab(busNum);
                }}
                className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-[120px] shrink-0 ${
                  isTabDragOver
                    ? 'bg-amber-400 border-amber-300 text-slate-950 scale-110 shadow-xl ring-4 ring-amber-400/30'
                    : isSelected
                    ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg font-black scale-105'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Bus className="w-4 h-4" />
                  <span className="text-sm">أتوبيس {busNum}</span>
                </div>
                <span className={`text-[11px] mt-1 font-mono ${isSelected || isTabDragOver ? 'text-slate-950 font-bold' : 'text-slate-400'}`}>
                  {count} / {cap} طالب
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pending Seat Modifications Notification Banner */}
      {pendingModifiedStudents.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 border-2 border-amber-500/80 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
                تنبيه هام: تم تعديل مقاعد ({pendingModifiedStudents.length}) من الطلاب برقم جديد!
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                يرجى إرسال التذكرة المحدثة للطلاب بعد التعديل لضمان معرفتهم برقم مقعدهم الجديد عند ركوب الأتوبيس.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsBatchSendModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition active:scale-95 w-full md:w-auto"
            >
              <Send className="w-4 h-4" />
              إرسال التذاكر المحدثة للطلاب 📲
            </button>
          </div>
        </div>
      )}

      {/* Driver & Supervisor Info Banner with Edit Buttons */}
      {currentDriver && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border border-indigo-900/50 rounded-2xl p-5 shadow-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Driver */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">سائق أتوبيس {selectedBus} (السعة: {currentBusCapacity} مقعد)</span>
                <h4 className="text-base font-bold text-white">{currentDriver.driverName}</h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">لوحات: {currentDriver.busPlateNumber}</p>
                <a
                  href={`tel:${currentDriver.driverPhone}`}
                  className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline mt-1"
                >
                  <Phone className="w-3 h-3" /> {currentDriver.driverPhone}
                </a>
              </div>
            </div>

            {/* Supervisor */}
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">المشرف المسؤول</span>
                <h4 className="text-base font-bold text-white">{currentDriver.supervisorName}</h4>
                <a
                  href={`tel:${currentDriver.supervisorPhone}`}
                  className="inline-flex items-center gap-1 text-xs text-indigo-300 font-bold hover:underline mt-1"
                >
                  <Phone className="w-3 h-3" /> {currentDriver.supervisorPhone}
                </a>
              </div>
            </div>

            {/* Attendance Quick Stats & Edit Actions */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">الركاب في الأتوبيس:</span>
                <strong className="text-amber-400 font-mono font-bold text-sm">
                  {currentBusStudents.length} / {currentBusCapacity}
                </strong>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <button
                  onClick={handleOpenEditDriver}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Edit className="w-3.5 h-3.5" />
                  تعديل السائق والمشرف
                </button>

                {onDeleteDriver && busNumbers.length > 1 && (
                  <button
                    onClick={() => setBusToDelete(selectedBus)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-900 transition"
                    title="حذف هذا الأتوبيس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in Phase Switcher & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Phase Toggle */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full md:w-auto">
          <button
            onClick={() => setCheckInPhase('departure')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
              checkInPhase === 'departure'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تحضير التحرك (نقطة التجمع 03:30 ص)
          </button>
          <button
            onClick={() => setCheckInPhase('return')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition ${
              checkInPhase === 'return'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تحضير العودة (الشاطئ / القرية)
          </button>
        </div>

        {/* Search Student in current bus */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="بحث عن طالب في أتوبيس..."
            value={searchStudentTerm}
            onChange={(e) => setSearchStudentTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Visual Bus Grid & Student List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Seat Map (Dynamic Seats Grid) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bus className="w-5 h-5 text-amber-400" />
              مخطط المقاعد ({currentBusCapacity} مقعد) لأتوبيس {selectedBus}
            </h3>
            <span className="text-xs text-slate-400">مظلم = شاغر</span>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            {/* Front Driver Area */}
            <div className="flex justify-between items-center bg-slate-900 p-2 rounded-xl text-xs text-slate-400 font-bold border border-slate-800">
              <span>كابينة السائق 🚘</span>
              <span>باب الصعود 🚪</span>
            </div>

            {/* Drag & Drop Hint */}
            <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-xl text-[10px] text-amber-300 flex items-center justify-between gap-1 font-semibold">
              <span className="flex items-center gap-1">
                <GripVertical className="w-3.5 h-3.5 text-amber-400" />
                اسحب المقعد وأسقطه فوق مقعد آخر لتبديله أو على تبويب أتوبيس لنقله!
              </span>
              <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">Drag & Drop</span>
            </div>

            {/* Dynamic Seats Grid */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {Array.from({ length: currentBusCapacity }, (_, i) => {
                const seatNo = i + 1;
                const student = currentBusStudents.find((s) => s.seatNumber === seatNo);
                const isCheckedIn =
                  checkInPhase === 'departure' ? student?.checkInDeparture : student?.checkInReturn;

                const modInfo = student ? modifiedSeats[student.id] : null;
                const isModified = !!modInfo;
                const isDragOver = dragOverSeatNo === seatNo;

                return (
                  <button
                    key={seatNo}
                    type="button"
                    draggable={!!student}
                    onDragStart={(e) => {
                      if (student) {
                        setDraggedSeat({ student, seatNumber: seatNo, busNumber: selectedBus });
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverSeatNo !== seatNo) {
                        setDragOverSeatNo(seatNo);
                      }
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      if (dragOverSeatNo === seatNo) {
                        setDragOverSeatNo(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnSeat(seatNo, student);
                    }}
                    onDragEnd={() => {
                      setDraggedSeat(null);
                      setDragOverSeatNo(null);
                    }}
                    onClick={() => {
                      setSelectedSeatAction({ seatNumber: seatNo, student });
                      setTargetNewSeatNum(seatNo);
                      setTargetNewBusNum(selectedBus);
                    }}
                    className={`p-2 rounded-xl border text-center relative text-[11px] transition transform active:scale-95 group select-none ${
                      student ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      isDragOver
                        ? 'bg-amber-500/30 border-2 border-dashed border-amber-400 scale-105 shadow-xl shadow-amber-500/40 ring-4 ring-amber-500/20'
                        : isModified
                        ? modInfo?.ticketSent
                          ? 'bg-emerald-950/90 border-2 border-emerald-400 text-emerald-100 shadow-md shadow-emerald-500/20'
                          : 'bg-gradient-to-br from-amber-950/90 via-purple-950/90 to-slate-900 border-2 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/40 animate-pulse'
                        : student
                        ? isCheckedIn
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/80'
                          : 'bg-amber-950/40 border-amber-500/40 text-amber-200 hover:bg-amber-900/40'
                        : 'bg-slate-900 border-slate-800/80 text-slate-500 hover:bg-slate-800/80 hover:text-amber-400'
                    }`}
                  >
                    {isModified && (
                      <span
                        className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-0.5 shadow-md z-10 ${
                          modInfo?.ticketSent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 text-slate-950 animate-bounce'
                        }`}
                        title={modInfo?.ticketSent ? 'تم إرسال التذكرة المحدثة' : 'تم تعديل المقعد - يتطلب إرسال التذكرة'}
                      >
                        {modInfo?.ticketSent ? '✓ مرسلة' : '⚠️ معدّل'}
                      </span>
                    )}
                    <span className="font-mono text-[9px] flex items-center justify-center gap-0.5 text-slate-400 font-bold group-hover:text-amber-400">
                      <span>#{seatNo}</span>
                      {student?.participantRole && student.participantRole !== 'student' && (
                        <span className="text-[10px]" title={PARTICIPANT_ROLES_CONFIG[student.participantRole]?.label}>
                          {PARTICIPANT_ROLES_CONFIG[student.participantRole]?.icon}
                        </span>
                      )}
                    </span>
                    <span className="font-bold block truncate max-w-[80px] mx-auto">
                      {student ? student.name.split(' ')[0] : 'شاغر +'}
                    </span>
                    {student ? (
                      <span className="text-[8px] block font-extrabold truncate">
                        {student.participantRole && student.participantRole !== 'student' ? (
                          <span className="text-amber-300 font-black">{PARTICIPANT_ROLES_CONFIG[student.participantRole]?.badge}</span>
                        ) : (
                          <span className="opacity-80">مقاس {student.tshirtSize}</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-[8px] block opacity-50 text-emerald-400">تسكين</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Seat Map Legend */}
            <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-800 gap-1.5 font-medium">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700"></span>
                <span>شاغر</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/40 border border-amber-500"></span>
                <span>طالب 🎓</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-300"></span>
                <span>منظم 👑</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-300"></span>
                <span>ميديا 📸</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 border border-purple-300"></span>
                <span>DJ 🎧</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-300"></span>
                <span>مشرف 🛡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Supervisor Mobile Check-In List */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                سجل تحضير الأتوبيس ({checkInPhase === 'departure' ? 'التحرك صباحاً' : 'العودة مساءً'})
              </h3>
              <p className="text-xs text-slate-400">
                انقر على اسم الطالب للتحضير السريع (حضر / لم يحضر)
              </p>
            </div>

            <div className="text-left font-mono text-xs">
              <span className="text-emerald-400 font-bold text-sm block">
                {checkInPhase === 'departure' ? departureCheckedInCount : returnCheckedInCount} / {currentBusStudents.length}
              </span>
              <span className="text-slate-400 text-[10px]">مكتمل</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {displayedStudents.length === 0 ? (
              <p className="text-center py-10 text-slate-500 text-xs">
                لا يوجد طلاب مسجلون في هذا الأتوبيس حالياً.
              </p>
            ) : (
              displayedStudents.map((student) => {
                const isCheckedIn =
                  checkInPhase === 'departure' ? student.checkInDeparture : student.checkInReturn;

                return (
                  <div
                    key={student.id}
                    onClick={() => {
                      if (checkInPhase === 'departure') {
                        onToggleCheckInDeparture(student.id);
                      } else {
                        onToggleCheckInReturn(student.id);
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                      isCheckedIn
                        ? 'bg-emerald-950/40 border-emerald-600/50 hover:bg-emerald-950/60'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl font-bold font-mono text-xs flex items-center justify-center ${
                              isCheckedIn ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {student.seatNumber ? `#${student.seatNumber}` : '—'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white">{student.name}</h4>
                              <span className="text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                {student.ticketCode}
                              </span>
                              {student.participantRole && student.participantRole !== 'student' && (
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border ${
                                    PARTICIPANT_ROLES_CONFIG[student.participantRole]?.bg || 'bg-amber-500/20'
                                  } ${PARTICIPANT_ROLES_CONFIG[student.participantRole]?.text || 'text-amber-400'} ${
                                    PARTICIPANT_ROLES_CONFIG[student.participantRole]?.border || 'border-amber-500/40'
                                  }`}
                                >
                                  <span>{PARTICIPANT_ROLES_CONFIG[student.participantRole]?.icon}</span>
                                  <span>{PARTICIPANT_ROLES_CONFIG[student.participantRole]?.badge}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {student.faculty || 'مشترك'} • تيشرت: <strong className="text-slate-200">{student.tshirtSize && student.tshirtSize !== 'none' && student.tshirtSize !== 'None' && student.tshirtSize !== 'بدون' ? student.tshirtSize : 'بدون'}</strong>
                              {student.hasMeal ? ` • وجبة: ${student.mealOption || 'VIP'}` : ' • بدون وجبة'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left hidden sm:block">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                student.paymentStatus === 'paid'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}
                            >
                              {student.paymentStatus === 'paid' ? 'مسدد' : 'عربون'}
                            </span>
                          </div>

                          <button
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition ${
                              isCheckedIn
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {isCheckedIn ? (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                حضر ✅
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 text-slate-500" />
                                لم يحضر
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Linked Companion Delivery & Manifest Sub-card */}
                      {student.hasCompanion && student.companionName && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 mt-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="p-1 bg-purple-500/20 text-purple-300 rounded-lg text-xs font-bold">👥 مرافق:</span>
                            <div>
                              <span className="font-bold text-white text-xs">{student.companionName}</span>
                              <span className="text-[10px] text-purple-300 block font-mono">
                                مقعد #{student.companionSeatNumber || 'مجاور'} • سعر المرافق: <strong className="text-amber-300">{(student.companionPrice ?? settings?.ticketPrice ?? 0).toLocaleString()} ج.م</strong> • تيشرت: {student.companionTShirtSize || 'L'}
                              </span>
                            </div>
                          </div>

                          {/* Companion Delivery Checklist Buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onUpdateStudent) {
                                  onUpdateStudent({
                                    ...student,
                                    companionTshirtReceived: !student.companionTshirtReceived,
                                  });
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                student.companionTshirtReceived
                                  ? 'bg-purple-600 text-white border-purple-400'
                                  : 'bg-slate-900 text-purple-300 border-purple-500/40 hover:bg-purple-950'
                              }`}
                            >
                              👕 تيشرت المرافق: {student.companionTshirtReceived ? '✅ مستلم' : 'تسليم'}
                            </button>

                            {student.companionHasMeal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onUpdateStudent) {
                                    onUpdateStudent({
                                      ...student,
                                      companionMealReceived: !student.companionMealReceived,
                                    });
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                  student.companionMealReceived
                                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                                    : 'bg-slate-900 text-amber-300 border-amber-500/40 hover:bg-amber-950'
                                }`}
                              >
                                🍔 وجبة المرافق: {student.companionMealReceived ? '✅ مستلم' : 'تسليم'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* MODAL 1: EDIT DRIVER / BUS MODAL */}
      {isEditDriverModalOpen && editDriverForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                تعديل بيانات أتوبيس رقم {editDriverForm.busNumber}
              </h3>
              <button
                onClick={() => setIsEditDriverModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDriver} className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم السائق</label>
                  <input
                    type="text"
                    required
                    value={editDriverForm.driverName}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, driverName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">هاتف السائق</label>
                  <input
                    type="tel"
                    required
                    value={editDriverForm.driverPhone}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, driverPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم اللوحات المعدنية</label>
                  <input
                    type="text"
                    required
                    value={editDriverForm.busPlateNumber}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, busPlateNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سعة الأتوبيس (عدد المقاعد)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editDriverForm.capacity}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم المشرف المسؤول</label>
                  <input
                    type="text"
                    required
                    value={editDriverForm.supervisorName}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, supervisorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">هاتف المشرف</label>
                  <input
                    type="tel"
                    required
                    value={editDriverForm.supervisorPhone}
                    onChange={(e) => setEditDriverForm({ ...editDriverForm, supervisorPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات الأتوبيس</label>
                <input
                  type="text"
                  value={editDriverForm.notes || ''}
                  onChange={(e) => setEditDriverForm({ ...editDriverForm, notes: e.target.value })}
                  placeholder="مثال: التجمع أمام باب الكلية الساعة 3:30 صباحاً..."
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditDriverModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW BUS MODAL */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-400" />
                إضافة أتوبيس جديد لأسطول الرحلة
              </h3>
              <button
                onClick={() => setIsAddBusModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddBus} className="space-y-3 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم الأتوبيس بالأسطول</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBusForm.busNumber}
                    onChange={(e) => setNewBusForm({ ...newBusForm, busNumber: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">سعة المقاعد الكلية</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBusForm.capacity}
                    onChange={(e) => setNewBusForm({ ...newBusForm, capacity: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم السائق</label>
                  <input
                    type="text"
                    required
                    value={newBusForm.driverName}
                    onChange={(e) => setNewBusForm({ ...newBusForm, driverName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">هاتف السائق</label>
                  <input
                    type="tel"
                    required
                    value={newBusForm.driverPhone}
                    onChange={(e) => setNewBusForm({ ...newBusForm, driverPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">رقم اللوحات المعدنية</label>
                  <input
                    type="text"
                    required
                    value={newBusForm.busPlateNumber}
                    onChange={(e) => setNewBusForm({ ...newBusForm, busPlateNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اسم المشرف المسؤول</label>
                  <input
                    type="text"
                    required
                    value={newBusForm.supervisorName}
                    onChange={(e) => setNewBusForm({ ...newBusForm, supervisorName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">هاتف المشرف</label>
                <input
                  type="tel"
                  required
                  value={newBusForm.supervisorPhone}
                  onChange={(e) => setNewBusForm({ ...newBusForm, supervisorPhone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-xl p-2.5 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-5 py-2 rounded-xl text-xs shadow-lg shadow-indigo-600/20"
                >
                  إضافة الأتوبيس الآن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Bus Confirmation Modal */}
      {busToDelete !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف الأتوبيس
              </h3>
              <button onClick={() => setBusToDelete(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-sm text-slate-300">
              هل أنت تأكد من حذف أتوبيس رقم <strong className="text-amber-400 font-mono font-bold">{busToDelete}</strong> من الأسطول؟
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBusToDelete(null)}
                className="bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteDriver) {
                    onDeleteDriver(busToDelete);
                    const remainingBuses = busNumbers.filter((b) => b !== busToDelete);
                    setSelectedBus(remainingBuses[0] || 1);
                  }
                  setBusToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20"
              >
                نعم، حذف الأتوبيس
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: INDIVIDUAL SEAT ACTION MODAL */}
      {selectedSeatAction && (
        <div 
          onClick={() => setSelectedSeatAction(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Sticky Header with Clear Exit Button */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md px-5 py-3.5 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                  <Bus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    إدارة المقعد #{selectedSeatAction.seatNumber} (أتوبيس {selectedBus})
                  </h3>
                  <span className="text-[10px] text-slate-400">تعديل التسكين، تبديل المقاعد، والخدمات</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeatAction(null)}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title="إغلاق والرجوع للخريطة"
              >
                <span>✕ خروج</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
            {selectedSeatAction.student ? (
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedSeatAction.student.name}</h4>
                      <p className="text-slate-400 text-xs mt-0.5">
                        كود التذكرة: <span className="text-amber-400 font-mono font-bold">{selectedSeatAction.student.ticketCode}</span> • هاتف: {selectedSeatAction.student.phone}
                      </p>
                    </div>
                    <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-lg">
                      مقعد #{selectedSeatAction.seatNumber}
                    </span>
                  </div>

                  {/* Interactive Attendance & T-Shirt Status Toggles */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeatAction.student) {
                          onToggleCheckInDeparture(selectedSeatAction.student.id);
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                        selectedSeatAction.student.checkInDeparture
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{selectedSeatAction.student.checkInDeparture ? '✅ تم الذهاب' : '🚪 تحضير الذهاب'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeatAction.student) {
                          onToggleCheckInReturn(selectedSeatAction.student.id);
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                        selectedSeatAction.student.checkInReturn
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{selectedSeatAction.student.checkInReturn ? '✅ تم العودة' : '🚌 تحضير العودة'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeatAction.student && onToggleTShirtReceived) {
                          onToggleTShirtReceived(selectedSeatAction.student.id);
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                        selectedSeatAction.student.tshirtReceived
                          ? 'bg-purple-950/80 border-purple-500 text-purple-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        <Shirt className="w-3.5 h-3.5" />
                        {selectedSeatAction.student.tshirtReceived ? '✅ تيشرت' : '👕 تسليم تيشرت'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSeatAction.student && onToggleMealReceived) {
                          onToggleMealReceived(selectedSeatAction.student.id);
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center gap-1 ${
                        selectedSeatAction.student.mealReceived
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300'
                          : selectedSeatAction.student.hasMeal
                          ? 'bg-slate-900 border-amber-500/40 text-amber-400 hover:border-amber-500'
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
                      }`}
                    >
                      <span className="flex items-center gap-1">
                        🍔 {selectedSeatAction.student.mealReceived ? '✅ استلم الوجبة' : selectedSeatAction.student.hasMeal ? 'تسليم الوجبة' : 'بدون وجبة'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Modified Seat Warning & Ticket Actions */}
                {modifiedSeats[selectedSeatAction.student.id] && (
                  <div className="bg-gradient-to-r from-amber-950/80 via-slate-950 to-indigo-950 p-4 rounded-xl border border-amber-500/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                        تم تعديل رقم المقعد لهذا الطالب!
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                        المقعد السابق: #{modifiedSeats[selectedSeatAction.student.id].previousSeat || 'غير محدد'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSeatAction.student) {
                            handleSendUpdatedWhatsAppTicket(
                              selectedSeatAction.student,
                              modifiedSeats[selectedSeatAction.student.id]
                            );
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                      >
                        <Send className="w-3.5 h-3.5" />
                        إرسال التذكرة المحدثة عبر WhatsApp 📲
                      </button>

                      {settings && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedSeatAction.student && settings) {
                              generateStudentTicketPDF(selectedSeatAction.student, settings);
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                        >
                          <Download className="w-3.5 h-3.5" />
                          تحميل PDF التذكرة المحدثة 🎟️
                        </button>
                      )}
                    </div>

                    {onOpenTicketPassModal && (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSeatAction.student && onOpenTicketPassModal) {
                            onOpenTicketPassModal(selectedSeatAction.student);
                            setSelectedSeatAction(null);
                          }
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                        معاينة التذكرة الرقمية في النافذة 🎫
                      </button>
                    )}
                  </div>
                )}

                {/* Option 1: Swap with another student */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4 text-indigo-400" />
                    تبديل المقعد مع طالب آخر في الأتوبيس:
                  </label>
                  <select
                    value={targetSwapStudentId}
                    onChange={(e) => setTargetSwapStudentId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- اختر الطالب المطلوب التبديل معه --</option>
                    {currentBusStudents
                      .filter((s) => s.id !== selectedSeatAction.student?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (مقعد {s.seatNumber ? `#${s.seatNumber}` : 'بدون مقعد'}) - {s.ticketCode}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!targetSwapStudentId}
                    onClick={() => {
                      if (selectedSeatAction.student && targetSwapStudentId) {
                        handleSwapSeats(selectedSeatAction.student.id, targetSwapStudentId);
                        setSelectedSeatAction(null);
                        setTargetSwapStudentId('');
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 rounded-xl text-xs transition"
                  >
                    تبديل أماكن المقاعد فوراً 🔄
                  </button>
                </div>

                {/* Option 2: Move to specific seat or bus */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-amber-400" />
                    نقل الطالب إلى مقعد أو أتوبيس آخر:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">الأتوبيس:</span>
                      <select
                        value={targetNewBusNum}
                        onChange={(e) => setTargetNewBusNum(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2 text-xs"
                      >
                        {busNumbers.map((b) => (
                          <option key={b} value={b}>أتوبيس {b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block mb-1">رقم المقعد الجديد:</span>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={targetNewSeatNum}
                        onChange={(e) => setTargetNewSeatNum(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl p-2 text-xs"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSeatAction.student) {
                        onUpdateStudentBus(selectedSeatAction.student.id, targetNewBusNum, targetNewSeatNum);
                        setSelectedSeatAction(null);
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs transition"
                  >
                    تأكيد نقل الطالب إلى المقعد الجديد
                  </button>
                </div>

                {/* Option 3: Vacate Seat */}
                <div className="pt-2 flex justify-between items-center border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSeatAction.student) {
                        onUpdateStudentBus(selectedSeatAction.student.id, selectedBus, undefined);
                        setSelectedSeatAction(null);
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300 text-xs font-bold underline"
                  >
                    إخلاء هذا المقعد (إلغاء التسكين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSeatAction(null)}
                    className="bg-slate-800 text-slate-300 font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-slate-700"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              /* Seat is Empty */
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-500/30 text-emerald-300">
                  المقعد رقم <strong className="font-mono text-white text-base">#{selectedSeatAction.seatNumber}</strong> في أتوبيس {selectedBus} شاغر ومتاح للتسكين!
                </div>

                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold">اختر طالباً لتسكينه في هذا المقعد:</label>
                  <select
                    value={targetAssignStudentId}
                    onChange={(e) => setTargetAssignStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">-- اختر من قائمة الطلاب --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.ticketCode}) - أتوبيس {s.busNumber} (مقعد {s.seatNumber ? `#${s.seatNumber}` : 'بدون مقعد'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedSeatAction(null)}
                    className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={!targetAssignStudentId}
                    onClick={() => {
                      if (targetAssignStudentId) {
                        onUpdateStudentBus(targetAssignStudentId, selectedBus, selectedSeatAction.seatNumber);
                        setSelectedSeatAction(null);
                        setTargetAssignStudentId('');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20"
                  >
                    تسكين الطالب في المقعد #{selectedSeatAction.seatNumber}
                  </button>
                </div>
              </div>
            )}
            </div>

            {/* Bottom Sticky Action Footer Bar with Clear Exit Button */}
            <div className="sticky bottom-0 z-20 bg-slate-950/95 backdrop-blur-md px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400 hidden xs:inline">انقر هنا للعودة لخريطة الأتوبيس</span>
              <button
                type="button"
                onClick={() => setSelectedSeatAction(null)}
                className="w-full xs:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition border border-slate-700 shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>✕ إغلاق والرجوع للخريطة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK SEAT SWAP & CROSS-BUS TRANSFER ORGANIZER MODAL */}
      {isSwapModalOpen && (
        <div 
          onClick={() => setIsSwapModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Sticky Header with prominent Exit button */}
            <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-black">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    أداة تنظيم وتبديل المقاعد ونقل الطلاب بين الأتوبيسات
                  </h3>
                  <span className="text-[11px] text-slate-400">نقل سريع، تبديل مقاعد الأصدقاء، وتسكين تلقائي</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                title="إغلاق والرجوع للخريطة"
              >
                <span>✕ خروج</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* Feature 1: Direct Transfer Person to Another Bus */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <Bus className="w-5 h-5" />
                  <span>1. نقل طالب / شخص من باص إلى باص آخر مباشرة:</span>
                </div>
                <p className="text-slate-400 text-xs">
                  اختر الطالب والباص المراد نقله إليه مع إمكانية تحديد رقم مقعد محدد أو تركه شاغراً:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اختر الشخص / الطالب:</label>
                    <select
                      value={transferStudentId}
                      onChange={(e) => setTransferStudentId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">-- اختر الطالب --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (حالياً: أتوبيس {s.busNumber} / مقعد {s.seatNumber ? `#${s.seatNumber}` : '—'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الأتوبيس الجديد المستهدف:</label>
                    <select
                      value={transferTargetBus}
                      onChange={(e) => setTransferTargetBus(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none font-bold"
                    >
                      {busNumbers.map((b) => (
                        <option key={b} value={b}>أتوبيس رقم {b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">رقم المقعد الجديد (اختياري):</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      placeholder="تلقائي / فارغ"
                      value={transferTargetSeat}
                      onChange={(e) => setTransferTargetSeat(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white font-mono rounded-xl p-2.5 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!transferStudentId}
                  onClick={() => {
                    if (transferStudentId) {
                      const newSeat = transferTargetSeat ? Number(transferTargetSeat) : undefined;
                      onUpdateStudentBus(transferStudentId, transferTargetBus, newSeat);
                      const movedStudent = students.find((s) => s.id === transferStudentId);
                      setTransferStudentId('');
                      setTransferTargetSeat('');
                      setIsSwapModalOpen(false);
                      setSelectedBus(transferTargetBus);
                    }
                  }}
                  className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Bus className="w-4 h-4" />
                  <span>تأكيد نقل الشخص إلى أتوبيس {transferTargetBus} فوراً 🚀</span>
                </button>
              </div>

              {/* Feature 2: Quick Swap 2 Students (Across same or different buses) */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 font-black text-sm">
                  <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
                  <span>2. تبديل مقاعد طالبين ببعضهما (Swap Seats):</span>
                </div>
                <p className="text-slate-400 text-xs">
                  تبديل أماكن طالبين بين بعضهما سواء في نفس الأتوبيس أو بين باصين مختلفين:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الطالب الأول:</label>
                    <select
                      value={swapStudentA}
                      onChange={(e) => setSwapStudentA(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- اختر الطالب الأول --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (أ{s.busNumber} / م{s.seatNumber ? `#${s.seatNumber}` : '—'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">الطالب الثاني المراد التبديل معه:</label>
                    <select
                      value={swapStudentB}
                      onChange={(e) => setSwapStudentB(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">-- اختر الطالب الثاني --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (أ{s.busNumber} / م{s.seatNumber ? `#${s.seatNumber}` : '—'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!swapStudentA || !swapStudentB || swapStudentA === swapStudentB}
                  onClick={() => {
                    handleSwapSeats(swapStudentA, swapStudentB);
                    setSwapStudentA('');
                    setSwapStudentB('');
                    setIsSwapModalOpen(false);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>تبديل أماكن الطالبين فوراً 🔄</span>
                </button>
              </div>

              {/* Feature 3: Auto Sequential Seating */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>3. التسكين التلقائي السريع لأتوبيس {selectedBus}:</span>
                </div>
                <p className="text-xs text-slate-400">
                  يقوم النظام تلقائياً بتوزيع المقاعد الشاغرة بترتيب متسلسل (1, 2, 3...) على جميع الطلاب المسجلين في هذا الأتوبيس بدون رقم مقعد.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleSequentialAutoSeat();
                    setIsSwapModalOpen(false);
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold py-2.5 rounded-xl text-xs transition active:scale-95 cursor-pointer"
                >
                  تسكين المقاعد المتبقية تلقائياً ⚡
                </button>
              </div>
            </div>

            {/* Bottom Sticky Action Footer Bar with Clear Exit Button */}
            <div className="sticky bottom-0 z-20 bg-slate-950/95 backdrop-blur-md px-6 py-3.5 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-400 hidden sm:inline">تم حفظ التغييرات تلقائياً في السجل والمزامنة</span>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-white font-black px-6 py-2.5 rounded-xl text-xs transition border border-slate-700 shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <span>✕ إغلاق والرجوع للخريطة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: BATCH MODIFIED SEATS & TICKET DISPATCH */}
      {isBatchSendModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                إرسال التذاكر المحدثة للطلاب المعدلة مقاعدهم
              </h3>
              <button onClick={() => setIsBatchSendModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              قائمة الطلاب الذين تم تغيير أو تعديل أرقام مقاعدهم حديثاً. يمكنك النقر لإرسال التذكرة المحدثة عبر واتساب لكل طالب:
            </p>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {Object.keys(modifiedSeats).length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  لا يوجد مقاعد معدلة حالياً! جميع المقاعد مستقرة والتذاكر محدثة.
                </div>
              ) : (
                (Object.entries(modifiedSeats) as [string, SeatModificationRecord][]).map(([studId, modRec]) => {
                  const student = students.find((s) => s.id === studId);
                  if (!student) return null;

                  return (
                    <div
                      key={studId}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        modRec.ticketSent
                          ? 'bg-emerald-950/30 border-emerald-500/30'
                          : 'bg-amber-950/30 border-amber-500/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">{student.name}</h4>
                          <span className="text-[10px] font-mono text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {student.ticketCode}
                          </span>
                          {modRec.ticketSent ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded">
                              ✓ تم إرسال التذكرة
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded animate-pulse">
                              ⚠️ معلّق
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 mt-1">
                          أتوبيس <strong className="text-slate-200">#{student.busNumber}</strong> • المقعد السابق: <span className="line-through text-slate-500">#{modRec.previousSeat || '—'}</span> ➔ المقعد الجديد: <strong className="text-amber-400 font-mono text-sm">#{student.seatNumber || '—'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendUpdatedWhatsAppTicket(student, modRec)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition shadow"
                        >
                          <Send className="w-3.5 h-3.5" />
                          واتساب 📲
                        </button>

                        {settings && (
                          <button
                            type="button"
                            onClick={() => generateStudentTicketPDF(student, settings)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1 transition"
                            title="تحميل PDF التذكرة"
                          >
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                            PDF
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => clearModificationRecord(studId)}
                          className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1"
                          title="مسح التعديل"
                        >
                          مسح
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  Object.keys(modifiedSeats).forEach(markTicketAsSent);
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold underline"
              >
                تحديد جميع التذاكر كـ "تم الإرسال" ✓
              </button>

              <button
                type="button"
                onClick={() => setIsBatchSendModalOpen(false)}
                className="bg-slate-800 text-slate-300 font-bold px-5 py-2 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
