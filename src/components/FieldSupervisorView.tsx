import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  QrCode,
  Users,
  CheckCircle2,
  Phone,
  Search,
  Bus,
  Shirt,
  UtensilsCrossed,
  Sparkles,
  LogOut,
  ShieldAlert,
  ArrowRight,
  Maximize2,
  KeyRound,
  DollarSign,
  MessageSquare,
  MapPin,
  ExternalLink,
  Radio,
  Clock,
  UserCheck,
  CreditCard,
  X,
  Send,
  User,
  Building,
  AlertTriangle,
  ChevronDown,
  Info,
  BadgeCheck,
  Navigation,
  FileText,
  Bed,
  BedDouble,
  Edit3,
  UserPlus,
  Check,
  Filter,
  RefreshCw,
  Share2,
  Printer,
  CheckCheck,
  Copy,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Award,
  Camera,
  Scan,
  Zap,
} from 'lucide-react';
import { KAYAN_LOGO_BASE64, KAYAN_BADGE_BASE64 } from '../assets/images/embeddedImages';
import kayanOfficialLogo from '../assets/images/kayan_official_logo_1789132512027.jpg';
import {
  Student,
  TripSettings,
  ActiveUserSession,
  PARTICIPANT_ROLES_CONFIG,
  getStudentMealInfo,
  HotelRoom,
  DriverInfo,
  RoomType,
  ROOM_TYPE_CONFIG,
} from '../types';

// Audio Beep Synthesizer for Quick Check-In Feedback
const playSuccessChime = (isSuccess = true) => {
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
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.12);
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
    // Ignore audio failure
  }
};

interface FieldSupervisorViewProps {
  students: Student[];
  tripSettings: TripSettings;
  session: ActiveUserSession;
  drivers?: DriverInfo[];
  rooms?: HotelRoom[];
  onOpenQRScanner: () => void;
  onLogoutToStaffModal: () => void;
  onOpenTripSwitcher?: () => void;
  onToggleCheckInDeparture: (studentId: string) => void;
  onToggleCheckInReturn: (studentId: string) => void;
  onToggleTShirtReceived: (studentId: string) => void;
  onToggleMealReceived: (studentId: string) => void;
  onToggleKeyReceived?: (studentId: string) => void;
  onFieldCashCollection?: (studentId: string, collectedAmount?: number) => void;
  onOpenTicketPassModal?: (student: Student) => void;
  onAssignStudentToRoom?: (studentId: string, roomNumber: string, hotelName?: string, roomType?: RoomType) => void;
  onRemoveStudentFromRoom?: (studentId: string) => void;
  onUpdatePayment?: (studentId: string, paidAmount: number) => void;
  onAssignRoomKey?: (studentId: string, roomNumber: string) => void;
}

export const FieldSupervisorView: React.FC<FieldSupervisorViewProps> = ({
  students,
  tripSettings,
  session,
  drivers = [],
  rooms = [],
  onOpenQRScanner,
  onLogoutToStaffModal,
  onOpenTripSwitcher,
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onToggleTShirtReceived,
  onToggleMealReceived,
  onToggleKeyReceived,
  onFieldCashCollection,
  onOpenTicketPassModal,
  onAssignStudentToRoom,
  onRemoveStudentFromRoom,
  onUpdatePayment,
  onAssignRoomKey,
}) => {
  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState<
    'none' | 'broadcast' | 'emergency' | 'staff_id' | 'payment' | 'assign_room' | 'rooms_overview'
  >('none');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [customCollectionAmount, setCustomCollectionAmount] = useState<number>(0);
  const [broadcastTemplate, setBroadcastTemplate] = useState<string>('assembly');
  const [customBroadcastMessage, setCustomBroadcastMessage] = useState<string>('');

  // Individual WhatsApp Broadcast State
  const [sentWhatsAppMap, setSentWhatsAppMap] = useState<Record<string, boolean>>({});
  const [broadcastPassengerFilter, setBroadcastPassengerFilter] = useState<'all' | 'unsent' | 'sent'>('all');
  const [broadcastPassengerSearch, setBroadcastPassengerSearch] = useState<string>('');
  const [copiedBroadcastMsg, setCopiedBroadcastMsg] = useState<boolean>(false);

  // Switch Trip Allowed Only if Admin or Has Multiple Assigned Trips
  const canSwitchTrips = Boolean(
    onOpenTripSwitcher && (
      session.role === 'admin' ||
      (session.allowedTripIds && session.allowedTripIds.length > 1)
    )
  );

  // Granular Role & Operational Permissions Enforcement
  const isAdmin = session.role === 'admin';
  const permissions = session.permissions;
  const canScanQR = isAdmin || permissions?.canScanQR !== false;
  const canCheckInOut = isAdmin || permissions?.canCheckInOut !== false;
  const canDeliverItems = isAdmin || permissions?.canDeliverItems !== false;
  const canManageRooms = isAdmin || permissions?.canManageRooms !== false;
  const canCollectPayments = isAdmin || permissions?.canCollectPayments !== false;

  // Room Assignment Form State
  const [assignRoomNumber, setAssignRoomNumber] = useState<string>('');
  const [assignHotelName, setAssignHotelName] = useState<string>('');
  const [assignRoomType, setAssignRoomType] = useState<RoomType>('double');
  const [assignDeliverKeyImmediate, setAssignDeliverKeyImmediate] = useState<boolean>(true);
  const [roomOverviewSearch, setRoomOverviewSearch] = useState<string>('');

  // Bus Assignment Lock Logic
  const isAssignedToSpecificBus = Boolean(session.assignedBus && session.assignedBus > 0);
  const userBusNumber = isAssignedToSpecificBus ? (session.assignedBus as number) : 1;

  // Big Hero QR Scanner Quick Direct Check-in State
  const [heroQuickCode, setHeroQuickCode] = useState('');
  const [heroQuickFeedback, setHeroQuickFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [busFilter, setBusFilter] = useState<number | 'all'>(
    isAssignedToSpecificBus ? userBusNumber : 'all'
  );

  const [filterType, setFilterType] = useState<
    | 'all'
    | 'pending_departure'
    | 'checked_departure'
    | 'pending_room'
    | 'unassigned_room'
    | 'unpaid'
    | 'pending_meal'
    | 'pending_tshirt'
  >('all');

  // Staff Accreditation Card Face (Front / Back) & Code Copy Feedback
  const [staffCardFace, setStaffCardFace] = useState<'front' | 'back'>('front');
  const [copiedStaffCode, setCopiedStaffCode] = useState<boolean>(false);

  // Active Driver Info
  const activeBusNumber = isAssignedToSpecificBus ? userBusNumber : busFilter === 'all' ? 1 : busFilter;
  const currentDriver = useMemo(() => {
    return drivers.find((d) => d.busNumber === activeBusNumber);
  }, [drivers, activeBusNumber]);

  // Target Students depending on bus scope
  const targetStudents = useMemo(() => {
    return isAssignedToSpecificBus
      ? students.filter((s) => s.busNumber === userBusNumber)
      : busFilter === 'all'
      ? students
      : students.filter((s) => s.busNumber === busFilter);
  }, [students, isAssignedToSpecificBus, userBusNumber, busFilter]);

  // Filter Students
  const filteredStudents = useMemo(() => {
    return targetStudents.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').includes(q);
        const matchTicket = (s.ticketCode || '').toLowerCase().includes(q);
        const matchSeat = s.seatNumber?.toString() === q;
        const matchRoom = s.roomNumber?.toString().includes(q);
        if (!matchName && !matchPhone && !matchTicket && !matchSeat && !matchRoom) return false;
      }

      if (filterType === 'pending_departure' && s.checkInDeparture) return false;
      if (filterType === 'checked_departure' && !s.checkInDeparture) return false;
      if (filterType === 'pending_room') {
        if (!s.roomNumber || s.keyReceived) return false;
      }
      if (filterType === 'unassigned_room') {
        if (s.roomNumber) return false;
      }
      if (filterType === 'unpaid') {
        const remaining = s.remainingAmount ?? (s.totalAmount || 0) - (s.paidAmount || 0);
        if (remaining <= 0) return false;
      }
      if (filterType === 'pending_meal') {
        const meal = getStudentMealInfo(s, tripSettings);
        if (!meal.hasMeal || s.mealReceived) return false;
      }
      if (filterType === 'pending_tshirt') {
        const hasTshirt = s.tshirtSize && s.tshirtSize !== 'none' && s.tshirtSize !== 'None' && s.tshirtSize !== 'بدون';
        if (!hasTshirt || s.tshirtReceived) return false;
      }

      return true;
    });
  }, [targetStudents, searchQuery, filterType, tripSettings]);

  // Operational Field Statistics
  const totalCount = targetStudents.length;
  const departureChecked = targetStudents.filter((s) => s.checkInDeparture).length;
  const returnChecked = targetStudents.filter((s) => s.checkInReturn).length;
  const mealsDelivered = targetStudents.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = targetStudents.filter((s) => s.tshirtReceived).length;
  const pendingDepartureCount = totalCount - departureChecked;

  const totalRoomAssigned = targetStudents.filter((s) => Boolean(s.roomNumber)).length;
  const roomKeysDelivered = targetStudents.filter((s) => Boolean(s.roomNumber && s.keyReceived)).length;
  const pendingKeyCount = targetStudents.filter((s) => Boolean(s.roomNumber && !s.keyReceived)).length;
  const unassignedRoomsCount = targetStudents.filter((s) => !s.roomNumber).length;

  const totalRemainingCash = targetStudents.reduce((acc, s) => {
    const rem = s.remainingAmount ?? Math.max(0, (s.totalAmount || 0) - (s.paidAmount || 0));
    return acc + (rem > 0 ? rem : 0);
  }, 0);

  const checkInPercentage = totalCount > 0 ? Math.round((departureChecked / totalCount) * 100) : 0;

  // Handlers
  const handleHeroQuickCheckIn = () => {
    const raw = heroQuickCode.trim();
    if (!raw) return;
    const clean = raw.replace(/^#/, '').toLowerCase();

    // Find student matching ticketCode, id, or phone
    const matched = students.find((s) => {
      const sCode = (s.ticketCode || '').replace(/^#/, '').toLowerCase();
      const sId = (s.id || '').toLowerCase();
      const sPhone = (s.phone || '').replace(/\D/g, '');
      const cleanPhone = clean.replace(/\D/g, '');

      return (
        sCode === clean ||
        sId === clean ||
        (cleanPhone.length >= 4 && sPhone.endsWith(cleanPhone)) ||
        s.name.toLowerCase().includes(clean)
      );
    });

    if (!matched) {
      playSuccessChime(false);
      setHeroQuickFeedback({
        type: 'error',
        message: `لم يتم العثور على طالب يطابق الكود أو الرقم (${raw})`,
      });
      setTimeout(() => setHeroQuickFeedback(null), 3500);
      return;
    }

    // Perform departure check-in if not yet checked in
    if (!matched.checkInDeparture) {
      onToggleCheckInDeparture(matched.id);
    }
    playSuccessChime(true);

    setHeroQuickFeedback({
      type: 'success',
      message: `تم تحضير الطالب: ${matched.name} (مقعد #${matched.seatNumber || 'حر'} - حافلة #${matched.busNumber}) بنجاح!`,
    });
    setHeroQuickCode('');
    setTimeout(() => setHeroQuickFeedback(null), 4500);
  };

  const handleOpenWhatsApp = (phone: string, message?: string) => {
    const formattedPhone = phone.replace(/[^0-9]/g, '');
    const cleanPhone = formattedPhone.startsWith('0') ? `2${formattedPhone}` : formattedPhone;
    const url = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
    window.open(url, '_blank');
  };

  const handleOpenPaymentModal = (student: Student) => {
    setSelectedStudent(student);
    const remaining = student.remainingAmount ?? Math.max(0, (student.totalAmount || 0) - (student.paidAmount || 0));
    setCustomCollectionAmount(remaining > 0 ? remaining : 0);
    setActiveModal('payment');
  };

  const handleConfirmCollection = () => {
    if (!selectedStudent) return;
    const remaining = selectedStudent.remainingAmount ?? Math.max(0, (selectedStudent.totalAmount || 0) - (selectedStudent.paidAmount || 0));
    const amountToCollect = customCollectionAmount > 0 ? customCollectionAmount : remaining;

    if (onFieldCashCollection) {
      onFieldCashCollection(selectedStudent.id, amountToCollect);
    } else if (onUpdatePayment) {
      const currentPaid = selectedStudent.paidAmount || 0;
      onUpdatePayment(selectedStudent.id, currentPaid + amountToCollect);
    }

    // Receipt prompt over WhatsApp
    const newPaid = (selectedStudent.paidAmount || 0) + amountToCollect;
    const newRemaining = Math.max(0, (selectedStudent.totalAmount || 0) - newPaid);
    const receiptMsg = `مرحباً ${selectedStudent.name} 👋\nتم استلام مبلغ مالى قدره: ${amountToCollect} ج.م بنجاح من قِبل المشرف الميداني (${session.name}).\nإجمالي المدفوع: ${newPaid} ج.م\nالمتبقي: ${newRemaining} ج.م\nشكراً لتعاونك مع كيان إيفينتس ✨`;
    handleOpenWhatsApp(selectedStudent.phone, receiptMsg);

    setActiveModal('none');
    setSelectedStudent(null);
  };

  // Open Room Assignment Modal
  const handleOpenAssignRoomModal = (student: Student) => {
    setSelectedStudent(student);
    setAssignRoomNumber(student.roomNumber || '');
    setAssignHotelName(student.hotelName || tripSettings.hotelName || '');
    setAssignRoomType(student.roomType || 'double');
    setAssignDeliverKeyImmediate(!student.keyReceived);
    setActiveModal('assign_room');
  };

  // Save Room Assignment
  const handleSaveRoomAssignment = () => {
    if (!selectedStudent || !assignRoomNumber.trim()) return;

    if (onAssignStudentToRoom) {
      onAssignStudentToRoom(
        selectedStudent.id,
        assignRoomNumber.trim(),
        assignHotelName.trim() || undefined,
        assignRoomType
      );
    } else if (onAssignRoomKey) {
      onAssignRoomKey(selectedStudent.id, assignRoomNumber.trim());
    }

    // If immediate key delivery is selected and key not yet marked
    if (assignDeliverKeyImmediate && !selectedStudent.keyReceived) {
      if (onToggleKeyReceived) {
        onToggleKeyReceived(selectedStudent.id);
      } else if (onAssignRoomKey) {
        onAssignRoomKey(selectedStudent.id, assignRoomNumber.trim());
      }
    }

    // Send WhatsApp notification option
    const hotelTxt = assignHotelName.trim() || tripSettings.hotelName || 'الفندق';
    const roomMsg = `أهلاً بك يا ${selectedStudent.name} ✨\nيسعدنا إبلاغك بتفاصيل غرفتك في رحلة (${tripSettings.tripName || tripSettings.destination}):\n🏨 الفندق: ${hotelTxt}\n🛏️ رقم الغرفة: ${assignRoomNumber.trim()}\n🔑 حالة المفتاح: ${assignDeliverKeyImmediate ? 'تم التسليم من المشرف الميداني' : 'بانتظار الاستلام من المشرف'}\nنتمنى لك إقامة ممتعة وسعيدة مع كيان إيفينتس! 🌟`;
    handleOpenWhatsApp(selectedStudent.phone, roomMsg);

    setActiveModal('none');
    setSelectedStudent(null);
  };

  // Unassign Room
  const handleUnassignRoom = () => {
    if (!selectedStudent) return;
    if (onRemoveStudentFromRoom) {
      onRemoveStudentFromRoom(selectedStudent.id);
    }
    setActiveModal('none');
    setSelectedStudent(null);
  };

  // Toggle Key Delivery
  const handleKeyToggle = (student: Student) => {
    if (onToggleKeyReceived) {
      onToggleKeyReceived(student.id);
    } else if (onAssignRoomKey && student.roomNumber) {
      onAssignRoomKey(student.id, student.roomNumber);
    }
  };

  // Professional operational broadcast messaging presets
  const broadcastTemplates = {
    assembly: `📢 تنبيه هام من إدارة عمليات كيان:\nأهلاً بك [اسم المشترك]، يرجى التواجد الآن في نقطة التجمع وصعود الحافلة رقم (#[رقم_الحافلة]) - مقعدك رقم ([رقم المقعد]).\nالحافلة جاهزة للتحرك في الموعد المحدد إلى [الوجهة] 🚌\nنتمنى لك رحلة سعيدة وممتعة!`,
    rest_stop: `☕ تنبيه استراحة الطريق:\nأعزاءنا ركاب الحافلة رقم (#[رقم_الحافلة])، توقفنا الآن في استراحة الطريق لمدة 25 دقيقة.\nيرجى العودة للحافلة والجلوس في مقعدك ([رقم المقعد]) قبل موعد التحرك المحدد لتجنب أي تأخير. رافقتكم السلامة! ⏱️`,
    hotel_checkin: `🏨 تنبيه التسكين والوصول:\nحمداً لله على السلامة [اسم المشترك]! وصلنا بفضل الله إلى مقر الإقامة في [الوجهة].\n• رقم غرفتك المعتمد: ([رقم الغرفة])\nيرجى التوجه للمشرف الميداني ([اسم_المشرف]) لاستلام مفتاح غرفتك وتأكيد بيانات التسكين. إقامة هانئة مع شركة كيان! 🔑`,
    meal_service: `🍔 تنبيه استلام الوجبة:\nأهلاً [اسم المشترك]، بدأ الآن تسليم وجبات الطعام المخصصة للمشتركين بالحافلة رقم (#[رقم_الحافلة]).\nيرجى التواصل مع المشرف الميداني ([اسم_المشرف]) لاستلام وجبتك. بالهناء والشفاء! 🥤`,
    program_event: `🎡 تنبيه البرنامج والفعاليات:\nأهلاً [اسم المشترك]، نود تذكيركم بموعد الفعالية القادمة وفق البرنامج المعتمد للرحلة في [الوجهة].\nيرجى التواجد في نقطة التجمع المحددة بالموعد المقرر للاستمتاع بالنشاط 🌟`,
    return_departure: `🚌 موعد رحلة العودة:\nعزيزنا [اسم المشترك]، يرجى من جميع ركاب الحافلة رقم (#[رقم_الحافلة]) التجمع الفوري وصعود مقعدك ([رقم المقعد]) لبدء التحرك في طريق العودة. يرجى التأكد من جمع كافة متعلقاتك من الغرفة. رافقتكم السلامة! 🤍`
  };

  // Students for individual WhatsApp broadcast
  const broadcastStudents = useMemo(() => {
    return students.filter((s) => {
      if (isAssignedToSpecificBus) {
        return s.busNumber === userBusNumber;
      }
      if (busFilter !== 'all') {
        return s.busNumber === busFilter;
      }
      return true;
    });
  }, [students, isAssignedToSpecificBus, userBusNumber, busFilter]);

  // Filtered by search and sent/unsent tab
  const filteredBroadcastStudents = useMemo(() => {
    return broadcastStudents.filter((s) => {
      const isSent = Boolean(sentWhatsAppMap[s.id]);
      if (broadcastPassengerFilter === 'sent' && !isSent) return false;
      if (broadcastPassengerFilter === 'unsent' && isSent) return false;

      if (broadcastPassengerSearch.trim()) {
        const q = broadcastPassengerSearch.trim().toLowerCase();
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchPhone = (s.phone || '').toLowerCase().includes(q);
        const matchSeat = String(s.seatNumber || '').includes(q);
        const matchRoom = (s.roomNumber || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchSeat || matchRoom;
      }
      return true;
    });
  }, [broadcastStudents, broadcastPassengerFilter, broadcastPassengerSearch, sentWhatsAppMap]);

  const broadcastSentCount = useMemo(() => {
    return broadcastStudents.filter((s) => sentWhatsAppMap[s.id]).length;
  }, [broadcastStudents, sentWhatsAppMap]);

  const broadcastUnsentCount = broadcastStudents.length - broadcastSentCount;

  // Next unsent student with valid phone
  const nextUnsentStudent = useMemo(() => {
    return broadcastStudents.find((s) => !sentWhatsAppMap[s.id] && s.phone);
  }, [broadcastStudents, sentWhatsAppMap]);

  // Helper to generate personalized text
  const getPersonalizedMessage = (student: Student) => {
    let msg = customBroadcastMessage || broadcastTemplates[broadcastTemplate as keyof typeof broadcastTemplates] || '';
    return msg
      .replace(/\[اسم المشترك\]/g, student.name)
      .replace(/\[الاسم\]/g, student.name)
      .replace(/\[الوجهة\]/g, tripSettings.destination || tripSettings.tripName || 'الوجهة المحددة')
      .replace(/\[رقم_الحافلة\]/g, String(student.busNumber || session.assignedBus || 1))
      .replace(/\[الحافلة\]/g, String(student.busNumber || session.assignedBus || 1))
      .replace(/\[رقم المقعد\]/g, student.seatNumber ? String(student.seatNumber) : 'مقعد حر')
      .replace(/\[المقعد\]/g, student.seatNumber ? String(student.seatNumber) : 'مقعد حر')
      .replace(/\[رقم الغرفة\]/g, student.roomNumber ? String(student.roomNumber) : 'بانتظار التسكين')
      .replace(/\[الغرفة\]/g, student.roomNumber ? String(student.roomNumber) : 'بانتظار التسكين')
      .replace(/\[اسم_المشرف\]/g, session.name || 'مشرف العمليات')
      .replace(/\[المشرف\]/g, session.name || 'مشرف العمليات');
  };

  const handleSendIndividualWhatsApp = (student: Student) => {
    if (!student.phone) {
      alert(`عذراً، المشترك (${student.name}) ليس لديه رقم هاتف مسجل.`);
      return;
    }
    const cleanPhone = student.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.startsWith('2') ? cleanPhone : `2${cleanPhone}`;
    const text = getPersonalizedMessage(student);
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setSentWhatsAppMap((prev) => ({ ...prev, [student.id]: true }));
  };

  const handleSendNextUnsent = () => {
    if (!nextUnsentStudent) {
      alert('تم إرسال الرسائل لجميع الركاب بنجاح! لا يوجد ركاب متبقين.');
      return;
    }
    handleSendIndividualWhatsApp(nextUnsentStudent);
  };

  // Grouped hotel rooms with occupants for room overview modal
  const roomsOccupantsMap = useMemo(() => {
    const map = new Map<string, Student[]>();
    students.forEach((st) => {
      if (st.roomNumber) {
        const list = map.get(st.roomNumber) || [];
        list.push(st);
        map.set(st.roomNumber, list);
      }
    });
    return map;
  }, [students]);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 pb-28 font-sans dir-rtl text-right">
      {/* Executive Obsidian & Amber Top Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-800 px-3 py-3 sm:px-6 shadow-2xl transition-all">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Brand Logo & Supervisor Profile (Organized & Vertically Stacked with generous space) */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-xl shadow-amber-500/25 ring-2 ring-amber-400/30">
                  <img
                    src={kayanOfficialLogo}
                    alt="KAYAN | كيان"
                    className="w-full h-full object-cover rounded-full bg-slate-950"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = KAYAN_LOGO_BASE64;
                    }}
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F172A] rounded-full animate-pulse" title="حساب معتمد نشط"></span>
              </div>

              <div className="min-w-0 flex-1 flex flex-col justify-center space-y-1.5">
                {/* Line 1: Name and Job Title */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg lg:text-xl font-black text-white tracking-tight">
                    {session.name}
                  </h1>
                  <span className="bg-amber-500/15 border border-amber-500/35 text-amber-300 font-bold text-xs px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shrink-0">
                    <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                    {session.role === 'admin' ? 'المدير العام والعمليات المركزية' : 'مشرف ميداني معتمد'}
                  </span>
                  <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0">
                    نشط ومعتمد ✓
                  </span>
                </div>

                {/* Line 2: Bus Assignment & Destination */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {isAssignedToSpecificBus ? (
                    <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-xl font-bold flex items-center gap-1.5 shrink-0">
                      <Bus className="w-3.5 h-3.5 text-indigo-400" />
                      حافلة رقم #{session.assignedBus}
                    </span>
                  ) : (
                    <span className="bg-slate-800/90 text-slate-300 border border-slate-700 text-xs px-2.5 py-1 rounded-xl font-bold shrink-0">
                      إشراف عام لكافة الحافلات
                    </span>
                  )}

                  <span className="bg-slate-900/90 text-slate-300 border border-slate-800 text-xs px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-slate-400">الوجهة:</span>
                    <strong className="text-white">
                      {tripSettings.destination || tripSettings.tripName}
                    </strong>
                    {canSwitchTrips && (
                      <button
                        type="button"
                        onClick={onOpenTripSwitcher}
                        className="text-amber-400 hover:text-amber-300 font-bold mr-1 underline cursor-pointer text-xs"
                        title="تبديل الرحلة"
                      >
                        (تبديل)
                      </button>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons (The 6 shortcut boxes) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap justify-start lg:justify-end pt-1 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
              {/* 1. QR Scanner (When canScanQR is true) */}
              {canScanQR && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onOpenQRScanner}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 border border-emerald-400/40 cursor-pointer active:scale-95 transition"
                >
                  <QrCode className="w-4 h-4 shrink-0 animate-pulse" />
                  <span className="font-black whitespace-nowrap">الماسح الضوئي</span>
                </motion.button>
              )}

              {/* 2. Rooms Directory (When canManageRooms is true) */}
              {canManageRooms && (
                <button
                  onClick={() => setActiveModal('rooms_overview')}
                  className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-600/40 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                  title="دليل الغرف والتسكين"
                >
                  <Building className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline whitespace-nowrap">دليل الغرف</span>
                </button>
              )}

              {/* 3. WhatsApp Hub */}
              <button
                onClick={() => setActiveModal('broadcast')}
                className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition cursor-pointer relative flex items-center gap-1.5 text-xs font-bold active:scale-95"
                title="مركز البث والإرسال الفردي واتساب"
              >
                <Radio className="w-4 h-4" />
                <span className="hidden sm:inline whitespace-nowrap">مركز البث</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full animate-ping"></span>
              </button>

              {/* 4. Staff ID Badge */}
              <button
                onClick={() => setActiveModal('staff_id')}
                className="p-2 sm:px-3 sm:py-2.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-600/40 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold active:scale-95"
                title="بطاقة اعتماد كيان"
              >
                <BadgeCheck className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline whitespace-nowrap">بطاقة الاعتماد</span>
              </button>

              {/* 5. Driver & Emergency */}
              <button
                onClick={() => setActiveModal('emergency')}
                className="p-2 sm:px-2.5 sm:py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-600/40 transition cursor-pointer flex items-center gap-1 text-xs font-bold active:scale-95"
                title="دليل السائق والطوارئ"
              >
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="hidden xl:inline whitespace-nowrap">الطوارئ</span>
              </button>

              {/* 6. Logout */}
              <button
                onClick={onLogoutToStaffModal}
                className="p-2 sm:px-2.5 sm:py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 text-slate-400 border border-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-bold active:scale-95"
                title="تسجيل الخروج / تبديل الحساب"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline whitespace-nowrap">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Content */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* BIG ANIMATED QR SCANNER HERO SHOWCASE (Mobile-Optimized Compact Cyber View) */}
        {canScanQR && (
          <section className="relative overflow-hidden rounded-2xl p-0.5 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-500 shadow-lg shadow-emerald-500/15 transition-all duration-300">
            {/* Ambient Background Glow Effect */}
            <div className="bg-gradient-to-br from-[#0B132B] via-[#0F172A] to-[#090D16] rounded-[14px] p-3 sm:p-4.5 relative overflow-hidden">
              {/* Background ambient radial gradients & particles */}
              <div className="absolute top-0 -right-10 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                {/* Scanner Visualizer Viewfinder */}
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div
                    onClick={onOpenQRScanner}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 bg-slate-950/90 rounded-xl border border-emerald-400/60 p-1.5 shrink-0 flex items-center justify-center cursor-pointer group shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-transform"
                    title="انقر لفتح كاميرا المسح الضوئي"
                  >
                    {/* Futuristic Corner Targeting Brackets */}
                    <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-amber-400 rounded-tr"></div>
                    <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400 rounded-tl"></div>
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400 rounded-br"></div>
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-amber-400 rounded-bl"></div>

                    {/* Animated Laser Scanning Beam */}
                    <motion.div
                      animate={{ y: [-16, 16, -16] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-x-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] z-10 pointer-events-none"
                    />

                    {/* Glowing Pulse Rings */}
                    <span className="absolute inset-0 rounded-xl border border-emerald-400/40 animate-ping opacity-25 pointer-events-none"></span>

                    {/* Central High-Tech QR Icon */}
                    <QrCode className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 group-hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>

                  <div className="space-y-0.5 sm:space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                        كاميرا المسح جاهزة
                      </span>
                      <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                        PRO
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                      <span>الماسح الذكي لتذاكر الطلاب</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
                    </h2>

                    <p className="text-[11px] sm:text-xs text-slate-300 leading-snug line-clamp-1 sm:line-clamp-none">
                      وجّه كاميرا الهاتف للتحضير الفوري وصعود الباص وتسليم التيشرت والوجبة.
                    </p>
                  </div>
                </div>

                {/* Compact CTA Button */}
                <div className="flex items-stretch sm:items-center gap-2 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    whileHover={{ scale: 1.02 }}
                    type="button"
                    onClick={onOpenQRScanner}
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black py-2.5 px-4 sm:py-3 sm:px-5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/30 border border-emerald-300 cursor-pointer active:scale-95 transition-all"
                  >
                    <Camera className="w-4 h-4 text-slate-950 shrink-0" />
                    <span>تشغيل كاميرا الـ QR</span>
                    <Zap className="w-3.5 h-3.5 text-slate-950 fill-current shrink-0" />
                  </motion.button>
                </div>
              </div>

              {/* Instant Manual Code / Phone Quick Lookup Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={heroQuickCode}
                    onChange={(e) => setHeroQuickCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleHeroQuickCheckIn();
                    }}
                    placeholder="كود التذكرة (#8001) أو آخر 4 أرقام من الهاتف..."
                    className="w-full bg-slate-950/90 border border-slate-700/80 focus:border-amber-400 text-white rounded-lg pr-9 pl-7 py-1.5 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/50 font-mono transition"
                  />
                  {heroQuickCode && (
                    <button
                      type="button"
                      onClick={() => setHeroQuickCode('')}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleHeroQuickCheckIn}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm shadow-amber-500/20 active:scale-95 transition cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>تحضير فوري</span>
                </button>
              </div>

              {/* Quick Feedback Toast inside the box */}
              <AnimatePresence>
                {heroQuickFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center gap-2 border ${
                      heroQuickFeedback.type === 'success'
                        ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                        : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                    }`}
                  >
                    {heroQuickFeedback.type === 'success' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="truncate">{heroQuickFeedback.message}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Dispatch Operations Status Dashboard */}
        <section className="bg-gradient-to-br from-slate-900 via-[#0D1527] to-[#0A0F1D] border border-indigo-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                  <Bus className="w-4 h-4" />
                  <span>لوحة متابعة الحافلة الميدانية</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                  حافلة رقم #{isAssignedToSpecificBus ? userBusNumber : busFilter === 'all' ? '1 (العامة)' : busFilter}
                </h2>
              </div>

              {/* Progress Tracker Pill */}
              <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-2xl shrink-0">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold">نسبة اكتمال الصعود</div>
                  <div className="text-sm font-mono font-black text-emerald-400">{checkInPercentage}%</div>
                </div>
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="4" className="text-slate-800" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="18"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-emerald-500 transition-all duration-1000 ease-out"
                      fill="transparent"
                      strokeDasharray={113}
                      strokeDashoffset={113 - (113 * checkInPercentage) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-mono font-bold text-white">{departureChecked}</span>
                </div>
              </div>
            </div>

            {/* Quick Bus Info Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300">
              <div className="bg-slate-950/50 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
                <User className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">السائق المسؤول</div>
                  <div className="font-bold text-white truncate">
                    {currentDriver?.driverName || 'كابتن الحافلة المعتمد'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400">هاتف السائق</div>
                  {currentDriver?.driverPhone ? (
                    <a
                      href={`tel:${currentDriver.driverPhone}`}
                      className="font-mono font-bold text-emerald-400 hover:underline dir-ltr text-right block truncate"
                    >
                      {currentDriver.driverPhone}
                    </a>
                  ) : (
                    <span className="text-slate-500 font-mono">غير مسجل</span>
                  )}
                </div>
              </div>

              {canManageRooms && (
                <div className="bg-slate-950/50 border border-slate-800/80 p-2.5 rounded-xl flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-slate-400">حالة التسكين والغرف</div>
                    <button
                      onClick={() => setActiveModal('rooms_overview')}
                      className="font-bold text-purple-300 hover:underline truncate flex items-center gap-1 cursor-pointer"
                    >
                      <span>{roomKeysDelivered} مسلّم من {totalRoomAssigned}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Operational Executive KPI Cards Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>إجمالي الركاب</span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-1">{totalCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">مشترك مخصص للحافلة</div>
          </div>

          {/* Departure Check In KPI (When canCheckInOut is true) */}
          {canCheckInOut && (
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>صعود الذهاب</span>
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono mt-1">
                {departureChecked} <span className="text-xs text-slate-400 font-normal">/ {totalCount}</span>
              </div>
              <div className="text-[10px] text-amber-400 mt-0.5 font-bold">متبقي لم يصعدوا: {pendingDepartureCount}</div>
            </div>
          )}

          {/* Key & Room Management KPI Card (When canManageRooms is true) */}
          {canManageRooms && (
            <div
              onClick={() => setActiveModal('rooms_overview')}
              className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 p-3.5 rounded-2xl shadow-lg relative overflow-hidden group transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>مفاتيح الغرف</span>
                <KeyRound className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono mt-1">
                {roomKeysDelivered} <span className="text-xs text-slate-400 font-normal">/ {totalRoomAssigned}</span>
              </div>
              <div className="text-[10px] text-purple-300 mt-0.5 font-bold flex items-center justify-between">
                <span>متبقي: {pendingKeyCount}</span>
                {unassignedRoomsCount > 0 && (
                  <span className="text-amber-400 text-[9px]">({unassignedRoomsCount} بدون غرفة)</span>
                )}
              </div>
            </div>
          )}

          {/* Remaining Cash KPI Card (When canCollectPayments is true) */}
          {canCollectPayments && (
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>المتبقي كاش</span>
                <DollarSign className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono mt-1">
                {totalRemainingCash.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span>
              </div>
              <div className="text-[10px] text-rose-300 mt-0.5 font-bold">مبالغ مطلوب تحصيلها</div>
            </div>
          )}
        </section>

        {/* Live Search and Bus & Status Filtering Section */}
        <section className="bg-slate-900/90 border border-slate-800 p-3.5 sm:p-4 rounded-3xl space-y-3 shadow-xl">
          {/* Search Box */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث سريع بالاسم، رقم المقعد، الهاتف، الغرفة، أو كود الحجز..."
                className="w-full bg-slate-950/80 border border-slate-700/80 text-white rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition shadow-inner"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Bus Filter Switcher (When not locked to single bus) */}
          {!isAssignedToSpecificBus && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs border-t border-slate-800/60 pt-2.5">
              <span className="text-[10px] text-slate-400 font-bold shrink-0 ml-1">الحافلة:</span>
              <button
                onClick={() => setBusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  busFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                جميع الحافلات
              </button>
              {[1, 2, 3, 4, 5, 6].map((b) => (
                <button
                  key={b}
                  onClick={() => setBusFilter(b)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    busFilter === b
                      ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  حافلة #{b}
                </button>
              ))}
            </div>
          )}

          {/* Filter Status Pills Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pt-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-100 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              الكل ({targetStudents.length})
            </button>

            {/* Check-in Filters (When canCheckInOut is true) */}
            {canCheckInOut && (
              <>
                <button
                  onClick={() => setFilterType('pending_departure')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                    filterType === 'pending_departure'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                      : 'bg-slate-950 text-amber-400/80 border border-amber-500/30'
                  }`}
                >
                  ⏳ لم يصعدوا ({pendingDepartureCount})
                </button>
                <button
                  onClick={() => setFilterType('checked_departure')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                    filterType === 'checked_departure'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-950 text-emerald-400/80 border border-emerald-500/30'
                  }`}
                >
                  ✅ تم الصعود ({departureChecked})
                </button>
              </>
            )}

            {/* Room & Key Filters (When canManageRooms is true) */}
            {canManageRooms && (
              <>
                <button
                  onClick={() => setFilterType('pending_room')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                    filterType === 'pending_room'
                      ? 'bg-purple-600 text-white font-black shadow-lg shadow-purple-600/20'
                      : 'bg-slate-950 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  🔑 بانتظار المفتاح ({pendingKeyCount})
                </button>
                <button
                  onClick={() => setFilterType('unassigned_room')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                    filterType === 'unassigned_room'
                      ? 'bg-fuchsia-600 text-white font-black shadow-lg shadow-fuchsia-600/20'
                      : 'bg-slate-950 text-fuchsia-300 border border-fuchsia-500/30'
                  }`}
                >
                  🛏️ غير مسكنين ({unassignedRoomsCount})
                </button>
              </>
            )}

            {/* Payment Filter (When canCollectPayments is true) */}
            {canCollectPayments && (
              <button
                onClick={() => setFilterType('unpaid')}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                  filterType === 'unpaid'
                    ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20'
                    : 'bg-slate-950 text-rose-400/80 border border-rose-500/30'
                }`}
              >
                💵 متبقي مالي
              </button>
            )}

            {/* Items Delivery Filters (When canDeliverItems is true) */}
            {canDeliverItems && (
              <>
                {targetStudents.some((s) => getStudentMealInfo(s, tripSettings).hasMeal) && (
                  <button
                    onClick={() => setFilterType('pending_meal')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                      filterType === 'pending_meal'
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    🍔 الوجبة
                  </button>
                )}
                {targetStudents.some((s) => s.tshirtSize && s.tshirtSize !== 'none') && (
                  <button
                    onClick={() => setFilterType('pending_tshirt')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition shrink-0 cursor-pointer ${
                      filterType === 'pending_tshirt'
                        ? 'bg-indigo-500 text-white font-black'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    👕 التيشرت
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Field Student Roster Interactive Cards List */}
        <section className="space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-600 mx-auto animate-bounce" />
              <div className="text-sm font-bold text-slate-300">لا توجد نتائج مطابقة لفلتر البحث</div>
              <p className="text-xs text-slate-500">جرّب تغيير كلمة البحث أو إعادة تعيين تبويب الفلتر.</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const mealInfo = getStudentMealInfo(student, tripSettings);
              const hasTshirt = Boolean(
                student.tshirtSize &&
                student.tshirtSize !== 'none' &&
                student.tshirtSize !== 'None' &&
                student.tshirtSize !== 'بدون' &&
                student.tshirtSize !== '-'
              );

              const remainingCash = student.remainingAmount ?? Math.max(0, (student.totalAmount || 0) - (student.paidAmount || 0));

              return (
                <motion.div
                  key={student.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-[#0F172A] border rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl transition-all ${
                    student.checkInDeparture
                      ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/10 to-transparent'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Bar: Seat & Bus Badges & Room Pill */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Prominent Seat Number Badge */}
                      <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black px-2.5 py-1 rounded-xl shadow-md text-xs sm:text-sm flex items-center gap-1">
                        مقعد #{student.seatNumber || 'بدون'}
                      </span>

                      <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-2.5 py-1 rounded-xl font-mono font-bold text-xs">
                        حافلة #{student.busNumber}
                      </span>

                      {/* Room Status Badge with direct edit modal click (Only if canManageRooms is true) */}
                      {canManageRooms && (
                        student.roomNumber ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignRoomModal(student)}
                            className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${
                              student.keyReceived
                                ? 'bg-purple-950/80 border-purple-500/60 text-purple-200'
                                : 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                            }`}
                            title="انقر لتعديل بيانات الغرفة"
                          >
                            <Building className="w-3.5 h-3.5 text-purple-400" />
                            <span>غرفة #{student.roomNumber}</span>
                            <span className="text-[10px] opacity-75">
                              {student.keyReceived ? '🔑 تم المفتاح' : '⏳ بانتظار المفتاح'}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400 mr-0.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAssignRoomModal(student)}
                            className="bg-fuchsia-950/50 hover:bg-fuchsia-900/60 text-fuchsia-300 border border-fuchsia-600/40 px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                          >
                            <UserPlus className="w-3 h-3 text-fuchsia-400" />
                            <span>+ تسكين بغرفة</span>
                          </button>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenTicketPassModal && onOpenTicketPassModal(student)}
                        className="font-mono text-xs bg-slate-950 px-2.5 py-1 rounded-xl text-amber-400 hover:text-amber-300 font-bold border border-slate-800 transition cursor-pointer flex items-center gap-1"
                        title="عرض التذكرة الرقمية"
                      >
                        <span>{student.ticketCode}</span>
                        <Maximize2 className="w-3 h-3 opacity-60" />
                      </button>
                    </div>
                  </div>

                  {/* Student Details & Direct Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm sm:text-base text-white">{student.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            student.gender === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : 'bg-pink-500/10 text-pink-400 border border-pink-500/30'
                          }`}
                        >
                          {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                        </span>

                        {student.participantRole && student.participantRole !== 'student' && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                              PARTICIPANT_ROLES_CONFIG[student.participantRole]?.bg || 'bg-slate-800'
                            } ${PARTICIPANT_ROLES_CONFIG[student.participantRole]?.text || 'text-slate-300'} ${
                              PARTICIPANT_ROLES_CONFIG[student.participantRole]?.border || 'border-slate-700'
                            }`}
                          >
                            {PARTICIPANT_ROLES_CONFIG[student.participantRole]?.badge || student.participantRole}
                          </span>
                        )}

                        {/* Financial Status Badge (Only if canCollectPayments is true) */}
                        {canCollectPayments && (
                          remainingCash > 0 ? (
                            <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] px-2 py-0.5 rounded-md font-bold">
                              متبقي {remainingCash.toLocaleString()} ج.م
                            </span>
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                              خالص السداد ✅
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                        <a
                          href={`tel:${student.phone}`}
                          className="text-emerald-400 hover:underline font-mono flex items-center gap-1 font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-lg"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{student.phone}</span>
                        </a>

                        <button
                          onClick={() => handleOpenWhatsApp(student.phone)}
                          className="text-emerald-400 hover:underline font-bold text-[11px] flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3" />
                          واتساب مباشر
                        </button>

                        {canManageRooms && student.hotelName && (
                          <span className="text-purple-300 flex items-center gap-1 text-[11px]">
                            <Building className="w-3 h-3 text-purple-400" />
                            {student.hotelName}
                          </span>
                        )}

                        {student.faculty && <span className="text-slate-400">• {student.faculty}</span>}
                      </div>

                      {student.pickupPoint && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>نقطة التجمع:</span>
                          <strong className="text-slate-200">{student.pickupPoint}</strong>
                        </div>
                      )}
                    </div>

                    {/* Quick Collection Action Button if money owed and canCollectPayments is true */}
                    {canCollectPayments && remainingCash > 0 && (
                      <button
                        onClick={() => handleOpenPaymentModal(student)}
                        className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-rose-500/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <DollarSign className="w-4 h-4" />
                        تحصيل {remainingCash.toLocaleString()} ج.م
                      </button>
                    )}
                  </div>

                  {/* Primary Operation Actions Grid (Departure & Return Toggles) */}
                  {canCheckInOut && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => onToggleCheckInDeparture(student.id)}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md ${
                          student.checkInDeparture
                            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {student.checkInDeparture ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تم صعود الذهاب ✅</span>
                          </>
                        ) : (
                          <>
                            <Bus className="w-4 h-4 text-slate-400" />
                            <span>تسجيل صعود الذهاب</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleCheckInReturn(student.id)}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-black border transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md ${
                          student.checkInReturn
                            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {student.checkInReturn ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>تم صعود العودة ✅</span>
                          </>
                        ) : (
                          <>
                            <Bus className="w-4 h-4 text-slate-400" />
                            <span>تسجيل صعود العودة</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Logistics Toggles Grid: Room Key, T-Shirt, Meal (Strictly conditional based on ticket inclusions) */}
                  {(canManageRooms || canDeliverItems) && (() => {
                    const showRoom = canManageRooms;
                    const showTshirt = canDeliverItems && hasTshirt;
                    const showMeal = canDeliverItems && mealInfo.hasMeal;
                    const activeCount = (showRoom ? 1 : 0) + (showTshirt ? 1 : 0) + (showMeal ? 1 : 0);

                    if (activeCount === 0) return null;

                    const gridClass = activeCount === 3 ? 'grid-cols-3' : activeCount === 2 ? 'grid-cols-2' : 'grid-cols-1';

                    return (
                      <div className={`grid ${gridClass} gap-2 ${!canCheckInOut ? 'pt-2 border-t border-slate-800/80' : ''}`}>
                        {/* Room Key Logistics Toggle (When canManageRooms is true) */}
                        {showRoom && (
                          student.roomNumber ? (
                            <button
                              type="button"
                              onClick={() => handleKeyToggle(student)}
                              className={`p-2.5 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                                student.keyReceived
                                  ? 'bg-purple-950/90 border-purple-500 text-purple-300 shadow-md shadow-purple-900/30'
                                  : 'bg-slate-950 border-slate-800 text-purple-300 hover:border-purple-500/50'
                              }`}
                            >
                              <span className="text-[10px] text-slate-400 font-mono">🔑 غرفة ({student.roomNumber})</span>
                              <span className="mt-0.5">{student.keyReceived ? '✅ تم استلام المفتاح' : '🔲 تسليم المفتاح'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAssignRoomModal(student)}
                              className="p-2.5 rounded-xl text-[11px] font-bold bg-fuchsia-950/30 hover:bg-fuchsia-900/40 border border-dashed border-fuchsia-700/60 text-fuchsia-300 flex flex-col items-center justify-center transition cursor-pointer"
                            >
                              <Bed className="w-3.5 h-3.5 mb-0.5 text-fuchsia-400" />
                              <span>تسكين في غرفة</span>
                            </button>
                          )
                        )}

                        {/* T-Shirt Toggle (Only if student has t-shirt and canDeliverItems is true) */}
                        {showTshirt && (
                          <button
                            type="button"
                            onClick={() => onToggleTShirtReceived(student.id)}
                            className={`p-2.5 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                              student.tshirtReceived
                                ? 'bg-indigo-950/90 border-indigo-500 text-indigo-300 shadow-md shadow-indigo-900/30'
                                : 'bg-slate-950 border-slate-800 text-indigo-300 hover:border-indigo-500/50'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400">👕 مقاس ({student.tshirtSize})</span>
                            <span className="mt-0.5">{student.tshirtReceived ? '✅ تم استلام التيشرت' : '🔲 تسليم التيشرت'}</span>
                          </button>
                        )}

                        {/* Meal Toggle (Only if student has meal and canDeliverItems is true) */}
                        {showMeal && (
                          <button
                            type="button"
                            onClick={() => onToggleMealReceived(student.id)}
                            className={`p-2.5 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                              student.mealReceived
                                ? 'bg-amber-950/90 border-amber-500 text-amber-300 shadow-md shadow-amber-900/30'
                                : 'bg-slate-950 border-slate-800 text-amber-300 hover:border-amber-500/50'
                            }`}
                          >
                            <span className="text-[10px] text-slate-400 truncate max-w-full">🍔 {mealInfo.mealName}</span>
                            <span className="mt-0.5">{student.mealReceived ? '✅ تم استلام الوجبة' : '🔲 تسليم الوجبة'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Read-only notice if no operational permissions */}
                  {!canCheckInOut && !canManageRooms && !canDeliverItems && !canCollectPayments && (
                    <div className="text-[11px] text-slate-500 py-1.5 text-center font-medium bg-slate-950/40 rounded-xl border border-slate-800/80">
                      صلاحياتك الحالية للعرض والمتابعة فقط
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </section>
      </main>

      {/* ========================================================================= */}
      {/* INTEGRATED EXECUTIVE MODALS */}
      {/* ========================================================================= */}

      <AnimatePresence>
        {/* Modal 1: Quick Room Assignment Modal (خيار وإدارة الغرف الميدانية) */}
        {activeModal === 'assign_room' && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border border-purple-500/40 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-purple-400 font-black">
                  <Building className="w-5 h-5" />
                  <span>إدارة وتسكين الغرفة الفندقية</span>
                </div>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Summary Box */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">النزيل / المشترك:</span>
                  <strong className="text-white text-sm">{selectedStudent.name}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">الحافلة ورقم المقعد:</span>
                  <span className="text-indigo-300 font-mono font-bold">
                    حافلة #{selectedStudent.busNumber} | مقعد #{selectedStudent.seatNumber || 'بدون'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">الغرفة الحالية:</span>
                  <span className="text-purple-300 font-bold">
                    {selectedStudent.roomNumber ? `غرفة #${selectedStudent.roomNumber}` : 'لم تسكن بعد (بدون غرفة)'}
                  </span>
                </div>
              </div>

              {/* Available Rooms Quick Picker (if any configured) */}
              {rooms.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>اختر من غرف الفندق المجهزة ({rooms.length}):</span>
                    <span className="text-[10px] text-purple-400 font-normal">انقر للاختيار التلقائي</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                    {rooms.map((rm) => {
                      const occupants = roomsOccupantsMap.get(rm.roomNumber) || [];
                      const isFull = occupants.length >= rm.capacity;
                      const isSelected = assignRoomNumber === rm.roomNumber;

                      return (
                        <button
                          key={rm.id}
                          type="button"
                          onClick={() => {
                            setAssignRoomNumber(rm.roomNumber);
                            if (rm.hotelName) setAssignHotelName(rm.hotelName);
                            if (rm.roomType) setAssignRoomType(rm.roomType);
                          }}
                          className={`p-2 rounded-xl border text-right transition cursor-pointer text-xs flex flex-col justify-between ${
                            isSelected
                              ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                              : isFull
                              ? 'bg-slate-900/50 border-slate-800 text-slate-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span>غرفة #{rm.roomNumber}</span>
                            <span className="text-[10px] opacity-75">{ROOM_TYPE_CONFIG[rm.roomType]?.icon || '🛏️'}</span>
                          </div>
                          <div className="text-[10px] mt-1 flex items-center justify-between">
                            <span>{ROOM_TYPE_CONFIG[rm.roomType]?.label.split(' ')[0]}</span>
                            <span className={`font-mono ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {occupants.length}/{rm.capacity}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Direct Inputs */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    رقم الغرفة الفندقية <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={assignRoomNumber}
                    onChange={(e) => setAssignRoomNumber(e.target.value)}
                    placeholder="مثال: 204 أو A-12"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">نوع الغرفة:</label>
                    <select
                      value={assignRoomType}
                      onChange={(e) => setAssignRoomType(e.target.value as RoomType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:border-purple-500 focus:outline-none"
                    >
                      <option value="single">غرفة فردية (Single)</option>
                      <option value="double">غرفة ثنائية (Double)</option>
                      <option value="triple">غرفة ثلاثية (Triple)</option>
                      <option value="quad">غرفة رباعية (Quadruple)</option>
                      <option value="suite">جناح فندقي (Suite)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">اسم الفندق:</label>
                    <input
                      type="text"
                      value={assignHotelName}
                      onChange={(e) => setAssignHotelName(e.target.value)}
                      placeholder="اسم الفندق أو المنتجع"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Instant Key Delivery Checkbox */}
                <label className="flex items-center gap-2.5 bg-purple-950/30 border border-purple-800/40 p-3 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignDeliverKeyImmediate}
                    onChange={(e) => setAssignDeliverKeyImmediate(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded bg-slate-900 border-slate-700 focus:ring-purple-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-purple-200">تسليم مفتاح الغرفة فوراً</span>
                    <p className="text-[10px] text-purple-400">سيتم تسجيل المفتاح كـ "مسلّم" للنزيل في السجلات الميدانية.</p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                {selectedStudent.roomNumber && (
                  <button
                    type="button"
                    onClick={handleUnassignRoom}
                    className="px-3.5 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition cursor-pointer"
                  >
                    إلغاء التسكين
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveRoomAssignment}
                  disabled={!assignRoomNumber.trim()}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  حفظ التسكين وإرسال تفاصيل الغرفة واتساب
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 2: Hotel Rooms Master Directory Overview Modal */}
        {activeModal === 'rooms_overview' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border border-purple-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2 text-purple-400 font-black">
                  <Building className="w-5 h-5" />
                  <span>دليل الغرف الفندقية والتسكين الميداني</span>
                </div>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Room Stats Overview Bar */}
              <div className="grid grid-cols-3 gap-2 shrink-0 text-center text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">المسكنين في غرف</div>
                  <div className="text-base font-black text-white font-mono mt-0.5">{totalRoomAssigned}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">استلموا المفاتيح</div>
                  <div className="text-base font-black text-purple-400 font-mono mt-0.5">{roomKeysDelivered}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">غير مسكنين</div>
                  <div className="text-base font-black text-amber-400 font-mono mt-0.5">{unassignedRoomsCount}</div>
                </div>
              </div>

              {/* Search Inside Rooms */}
              <div className="relative shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={roomOverviewSearch}
                  onChange={(e) => setRoomOverviewSearch(e.target.value)}
                  placeholder="ابحث برقم الغرفة أو اسم النزيل..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Rooms List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {Array.from(roomsOccupantsMap.entries()).length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    لم يتم تسكين أي مشترك في غرف حتى الآن.
                  </div>
                ) : (
                  Array.from(roomsOccupantsMap.entries())
                    .filter(([roomNo, occs]) => {
                      if (!roomOverviewSearch.trim()) return true;
                      const q = roomOverviewSearch.toLowerCase();
                      return (
                        roomNo.toLowerCase().includes(q) ||
                        occs.some((st) => st.name.toLowerCase().includes(q))
                      );
                    })
                    .map(([roomNo, occupants]) => {
                      const allKeysDelivered = occupants.every((o) => o.keyReceived);

                      return (
                        <div
                          key={roomNo}
                          className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="bg-purple-950 text-purple-300 border border-purple-700 px-2.5 py-0.5 rounded-lg font-mono font-bold text-xs">
                                غرفة #{roomNo}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {occupants.length} نزلاء
                              </span>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                allKeysDelivered
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {allKeysDelivered ? '✅ اكتمل استلام المفتاح' : '⏳ بانتظار استلام المفتاح'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {occupants.map((occ) => (
                              <div
                                key={occ.id}
                                className="bg-slate-900/70 p-2 rounded-xl flex items-center justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate">{occ.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    حافلة #{occ.busNumber} | مقعد #{occ.seatNumber || '-'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleKeyToggle(occ)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shrink-0 ${
                                    occ.keyReceived
                                      ? 'bg-purple-950 text-purple-300 border-purple-600'
                                      : 'bg-slate-950 text-slate-400 border-slate-700 hover:border-purple-500'
                                  }`}
                                >
                                  {occ.keyReceived ? '🔑 مسلّم' : 'تسليم المفتاح'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 3: Financial Cash Collection Modal */}
        {activeModal === 'payment' && selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <CreditCard className="w-5 h-5" />
                  <span>تحصيل مبلغ نقدي ميداني</span>
                </div>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                  <div className="text-slate-400">اسم المشترك: <strong className="text-white">{selectedStudent.name}</strong></div>
                  <div className="text-slate-400">إجمالي قيمة التذكرة: <strong className="text-amber-400">{(selectedStudent.totalAmount || 0).toLocaleString()} ج.م</strong></div>
                  <div className="text-slate-400">المبلغ المدفوع سابقاً: <strong className="text-emerald-400">{(selectedStudent.paidAmount || 0).toLocaleString()} ج.م</strong></div>
                  <div className="text-slate-400">المتبقي المطلوب: <strong className="text-rose-400">{(selectedStudent.remainingAmount || 0).toLocaleString()} ج.م</strong></div>
                </div>

                <div className="space-y-1 pt-2">
                  <label className="text-xs font-bold text-slate-300">المبلغ المحصّل حالياً (ج.م):</label>
                  <input
                    type="number"
                    value={customCollectionAmount}
                    onChange={(e) => setCustomCollectionAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-3 text-lg font-mono font-black text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleConfirmCollection}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  تأكيد التحصيل وإصدار إيصال واتساب
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 4: Broadcast & Individual WhatsApp Hub */}
        {activeModal === 'broadcast' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0F172A] border border-amber-500/30 rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5 text-amber-400 font-black">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-white">
                      مركز البث والإرسال الفردي عبر واتساب
                    </h2>
                    <p className="text-[11px] text-slate-400 font-normal">
                      إرسال رسائل وتنبيهات فردية مخصصة لكل راكب بالاسم ورقم المقعد والحافلة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto space-y-4 pr-1 flex-1">
                {/* 1. Pre-made Broadcast Templates */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">اختر قالب التنبيه المعتمد:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'assembly', label: '📢 تجمع وصعود الحافلة' },
                      { id: 'rest_stop', label: '☕ استراحة الطريق' },
                      { id: 'hotel_checkin', label: '🏨 الوصول والتسكين' },
                      { id: 'meal_service', label: '🍔 استلام الوجبات' },
                      { id: 'program_event', label: '🎡 تنبيه الفعاليات' },
                      { id: 'return_departure', label: '🚌 تحرك رحلة العودة' },
                    ].map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setBroadcastTemplate(tmpl.id);
                          setCustomBroadcastMessage(broadcastTemplates[tmpl.id as keyof typeof broadcastTemplates]);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                          broadcastTemplate === tmpl.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tmpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Message Editor with Dynamic Variable Tags */}
                <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <label className="font-bold text-slate-300 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      نص الرسالة (يمكنك استخدام المتغيرات التلقائية):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const msg = customBroadcastMessage || broadcastTemplates[broadcastTemplate as keyof typeof broadcastTemplates];
                        navigator.clipboard.writeText(msg);
                        setCopiedBroadcastMsg(true);
                        setTimeout(() => setCopiedBroadcastMsg(false), 2000);
                      }}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedBroadcastMsg ? 'تم نسخ النص ✓' : 'نسخ النص'}
                    </button>
                  </div>

                  {/* Variable Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">إدراج متغير:</span>
                    {[
                      { tag: '[اسم المشترك]', desc: 'الاسم' },
                      { tag: '[رقم_الحافلة]', desc: 'الحافلة' },
                      { tag: '[رقم المقعد]', desc: 'المقعد' },
                      { tag: '[رقم الغرفة]', desc: 'الغرفة' },
                      { tag: '[اسم_المشرف]', desc: 'المشرف' },
                      { tag: '[الوجهة]', desc: 'الوجهة' },
                    ].map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => {
                          const current = customBroadcastMessage || broadcastTemplates[broadcastTemplate as keyof typeof broadcastTemplates];
                          setCustomBroadcastMessage(current + ' ' + v.tag);
                        }}
                        className="text-[10px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 px-2 py-0.5 rounded-md cursor-pointer transition font-mono"
                      >
                        +{v.desc}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={customBroadcastMessage || broadcastTemplates[broadcastTemplate as keyof typeof broadcastTemplates]}
                    onChange={(e) => setCustomBroadcastMessage(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none resize-none"
                    placeholder="اكتب نص الرسالة هنا..."
                  ></textarea>
                </div>

                {/* 3. Fast Sequential Dispatcher Toolbar */}
                <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/30 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">الإجمالي:</span>
                      <strong className="text-white font-mono">{broadcastStudents.length}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>تم الإرسال:</span>
                      <strong className="font-mono">{broadcastSentCount}</strong>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span>بانتظار الإرسال:</span>
                      <strong className="font-mono">{broadcastUnsentCount}</strong>
                    </div>
                  </div>

                  {nextUnsentStudent ? (
                    <button
                      type="button"
                      onClick={handleSendNextUnsent}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95 transition shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال تتابعي للمشترك التالي:</span>
                      <span className="underline truncate max-w-[120px]">{nextUnsentStudent.name}</span>
                    </button>
                  ) : (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" />
                      تم إرسال الرسالة لكافة الركاب بنجاح!
                    </div>
                  )}
                </div>

                {/* 4. Filter & Search Row */}
                <div className="flex flex-col sm:flex-row gap-2 items-center justify-between pt-1">
                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث بالاسم أو المقعد أو الهاتف..."
                      value={broadcastPassengerSearch}
                      onChange={(e) => setBroadcastPassengerSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                    {[
                      { id: 'all', label: `الكل (${broadcastStudents.length})` },
                      { id: 'unsent', label: `بانتظار الإرسال (${broadcastUnsentCount})` },
                      { id: 'sent', label: `تم الإرسال (${broadcastSentCount})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setBroadcastPassengerFilter(tab.id as any)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                          broadcastPassengerFilter === tab.id
                            ? 'bg-slate-700 text-white border border-slate-600'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Passenger Dispatch List */}
                <div className="space-y-1.5 max-h-60 sm:max-h-64 overflow-y-auto pr-1">
                  {filteredBroadcastStudents.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
                      لا يوجد ركاب مطابقين للبحث أو الفلتر المحدد
                    </div>
                  ) : (
                    filteredBroadcastStudents.map((st) => {
                      const isSent = Boolean(sentWhatsAppMap[st.id]);
                      return (
                        <div
                          key={st.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            isSent
                              ? 'bg-emerald-950/15 border-emerald-500/25 text-slate-300'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 font-mono">
                              {st.seatNumber || '-'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white truncate max-w-[140px] sm:max-w-[180px]">
                                  {st.name}
                                </span>
                                {isSent && (
                                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                    تم ✓
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                                <span>حافلة #{st.busNumber || session.assignedBus || 1}</span>
                                {st.roomNumber && (
                                  <span className="text-purple-300">غرفة: {st.roomNumber}</span>
                                )}
                                {st.phone && <span className="font-mono">{st.phone}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {st.phone ? (
                              <button
                                type="button"
                                onClick={() => handleSendIndividualWhatsApp(st)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
                                  isSent
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                                }`}
                                title="إرسال رسالة واتساب مخصصة لهذا الراكب"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{isSent ? 'إعادة إرسال' : 'إرسال فردي'}</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                                بدون هاتف
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Close Footer */}
              <div className="border-t border-slate-800 pt-3 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  إغلاق المركز
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 5: Emergency & Driver Guide */}
        {activeModal === 'emergency' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-rose-400 font-black">
                  <ShieldAlert className="w-5 h-5" />
                  <span>دليل الطوارئ والاتصال السريع</span>
                </div>
                <button onClick={() => setActiveModal('none')} className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {currentDriver && (
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{currentDriver.driverName}</div>
                      <div className="text-slate-400">سائق الحافلة رقم #{currentDriver.busNumber}</div>
                    </div>
                    {currentDriver.driverPhone && (
                      <a href={`tel:${currentDriver.driverPhone}`} className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">مسؤول عمليات KAYAN Central</div>
                    <div className="text-slate-400">إدارة الأزمات والمتابعة الميدانية</div>
                  </div>
                  <a href="tel:01006353046" className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white">الشرطة والإسعاف الموحد</div>
                    <div className="text-slate-400">خط الطوارئ الوطني</div>
                  </div>
                  <a href="tel:123" className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/30">
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal 6: VIP Kayan Accreditation Card (بطاقة اعتماد كيان للموظف الميداني) */}
        {activeModal === 'staff_id' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-gradient-to-b from-[#0F172A] via-[#111C33] to-[#0A0E1A] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 relative overflow-hidden"
            >
              {/* Metallic Lanyard Clip Cutout */}
              <div className="flex justify-center -mt-2">
                <div className="w-20 h-3 bg-slate-950 border-2 border-slate-700/80 rounded-full shadow-inner flex items-center justify-center">
                  <div className="w-8 h-1 bg-amber-500/60 rounded-full"></div>
                </div>
              </div>

              {/* Decorative Ambient Glowing Orbs */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Top Bar: Hologram Tag & Close Button */}
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-amber-400 font-black tracking-widest uppercase bg-gradient-to-r from-amber-500/20 to-amber-400/10 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    OFFICIAL FIELD PASS 2026
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    معتمد ✓
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStaffCardFace((f) => (f === 'front' ? 'back' : 'front'))}
                    className="p-1.5 text-xs text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 rounded-xl cursor-pointer transition flex items-center gap-1 font-bold"
                    title="قلب البطاقة"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{staffCardFace === 'front' ? 'الظهر' : 'الوجه'}</span>
                  </button>
                  <button
                    onClick={() => setActiveModal('none')}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* CARD FRONT */}
              {staffCardFace === 'front' ? (
                <div className="space-y-3.5 relative z-10">
                  {/* Official Company Branding Header */}
                  <div className="flex items-center gap-3 bg-slate-950/90 border border-amber-500/30 p-3 rounded-2xl shadow-inner">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-300 to-amber-500 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
                      <img
                        src={tripSettings.logo || kayanOfficialLogo || KAYAN_LOGO_BASE64}
                        alt="KAYAN LOGO"
                        className="w-full h-full object-cover rounded-[14px] bg-slate-950"
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <h3 className="text-xs font-black text-amber-400 tracking-wide leading-tight">
                        شركة كيان لتنظيم الفعاليات والرحلات
                      </h3>
                      <p className="text-[9px] text-amber-200/70 font-medium font-mono uppercase mt-0.5">
                        KAYAN FOR TOURS & EVENT LOGISTICS
                      </p>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-300 font-bold bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                        <Award className="w-3 h-3 text-amber-400" />
                        <span>بطاقة اعتماد وتفويج ميداني معتمد</span>
                      </div>
                    </div>
                  </div>

                  {/* Supervisor Profile Hero */}
                  <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-3.5 text-center space-y-1.5 shadow-lg">
                    <div className="relative inline-block">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 mx-auto shadow-md">
                        <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xl font-black text-amber-400 overflow-hidden">
                          {session.name ? session.name.charAt(0) : 'K'}
                        </div>
                      </div>
                      <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
                    </div>

                    <div>
                      <div className="text-base sm:text-lg font-black text-white">{session.name}</div>
                      <div className="text-xs font-bold text-amber-400 flex items-center justify-center gap-1 mt-0.5">
                        <BadgeCheck className="w-4 h-4 text-emerald-400" />
                        <span>{session.role === 'admin' ? 'المدير العام ورئيس العمليات المركزية' : 'مشرف عمليات وتفويج ميداني معتمد'}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {session.role === 'admin' ? 'CHIEF OPERATIONS EXECUTIVE' : 'CERTIFIED FIELD DISPATCH SUPERVISOR'}
                      </div>
                    </div>

                    {/* License Badge & Copy Code Button */}
                    <div className="pt-1 flex items-center justify-center gap-2">
                      <div className="bg-slate-950 border border-emerald-500/30 px-3 py-1 rounded-xl font-mono text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>KYN-2026-B{session.assignedBus || 'HQ'}-{session.pin || 'AUTH'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const code = `KYN-2026-B${session.assignedBus || 'HQ'}-${session.pin || 'AUTH'}`;
                          navigator.clipboard.writeText(code);
                          setCopiedStaffCode(true);
                          setTimeout(() => setCopiedStaffCode(false), 2000);
                        }}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedStaffCode ? 'تم النسخ ✓' : 'نسخ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 4-Box Credentials Grid */}
                  <div className="grid grid-cols-2 gap-2 text-right text-xs">
                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-slate-400">الحافلة المعتمدة:</div>
                      <div className="font-bold text-white mt-0.5">
                        {isAssignedToSpecificBus ? `حافلة رقم #${session.assignedBus}` : 'إشراف عام شامل'}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-slate-400">الوجهة:</div>
                      <div className="font-bold text-amber-300 truncate mt-0.5">
                        {tripSettings.destination || tripSettings.tripName || 'الوجهة المعتمدة'}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-slate-400">تاريخ الرحلة:</div>
                      <div className="font-bold text-slate-200 mt-0.5 font-mono">
                        {tripSettings.tripDate || 'موسم 2026'}
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-slate-400">سلطة التفويج:</div>
                      <div className="font-bold text-emerald-400 font-mono text-[11px] mt-0.5">
                        صلاحيات تشغيلية كاملة
                      </div>
                    </div>
                  </div>

                  {/* Scannable Verification QR Code */}
                  <div className="bg-white p-2.5 rounded-2xl max-w-[130px] mx-auto shadow-xl text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        `https://kayan-events.com/verify?staff=${encodeURIComponent(session.name)}&role=${session.role}&bus=${session.assignedBus || 'ALL'}&auth=KYN-2026`
                      )}`}
                      alt="Supervisor Official QR"
                      className="w-full h-auto aspect-square rounded-lg"
                    />
                    <div className="text-[9px] text-slate-700 font-bold mt-1">امسح للتحقق الفوري</div>
                  </div>

                  {/* Security Seal Note */}
                  <div className="text-center text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 space-y-0.5">
                    <div className="text-amber-400/90 font-black flex items-center justify-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      <span>معتمد رسمياً من الإدارة العامة لشركة كيان</span>
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-[9px]">
                      صالح للدخول لكافة المنشآت السياحية وإدارة التفويج والتسكين
                    </p>
                  </div>
                </div>
              ) : (
                /* CARD BACK */
                <div className="space-y-3 relative z-10 text-right">
                  {/* Watermark Header */}
                  <div className="text-center pb-2 border-b border-slate-800/80">
                    <div className="text-xs font-black text-amber-400">شروط وأحكام الاعتماد الرسمي</div>
                    <div className="text-[10px] text-slate-400">OFFICIAL TERMS OF FIELD AUTHORITY</div>
                  </div>

                  {/* Terms List */}
                  <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-2xl border border-slate-800">
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-black">1.</span>
                      <p>تمنح هذه البطاقة حاملها الصفة الرسمية والكاملة لإدارة وتنظيم وتفويج المشتركين في رحلات وفعاليات شركة كيان.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-black">2.</span>
                      <p>يُرجى من إدارات الفنادق والقرى السياحية والمزارات السياحية تقديم كافة التسهيلات لحامل هذا التصريح وتيسير إجراءات الدخول والتسكين.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-black">3.</span>
                      <p>هذه البطاقة شخصية ومعتمدة وغير قابلة للتحويل ويجب إبرازها فوراً عند الطلب لجهات التفتيش الميداني.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-amber-400 font-black">4.</span>
                      <p>خط الدعم المركزي وغرفة عمليات الطوارئ لشركة كيان متاح على مدار 24 ساعة لتقديم المساندة الكاملة.</p>
                    </div>
                  </div>

                  {/* Emergency Dispatch Contact */}
                  <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">غرفة العمليات المركزية (24/7):</div>
                      <div className="font-mono font-bold text-emerald-400">01006353046 / 01038574977</div>
                    </div>
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>

                  {/* Digital Signature & Barcode */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <div>
                      <div className="text-slate-400">توقيع مسؤول العمليات:</div>
                      <div className="font-serif italic text-amber-400 font-bold text-xs mt-0.5">Kayan Operations Dir.</div>
                    </div>
                    <div className="text-left font-mono text-[9px] text-slate-400">
                      <div>SERIAL: KYN-PASS-88219</div>
                      <div>HASH: 7C9F-44A2-B901</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons: Print & WhatsApp */}
              <div className="grid grid-cols-2 gap-2 pt-1 relative z-10">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer transition active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة البطاقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = `🪪 بطاقة اعتماد مشرف ميداني معتمد لدى شركة كيان:\n• الاسم: ${session.name}\n• الصفة: ${
                      session.role === 'admin' ? 'المدير العام ورئيس العمليات' : 'مشرف عمليات وتفويج ميداني معتمد'
                    }\n• الحافلة: ${session.assignedBus ? `حافلة رقم #${session.assignedBus}` : 'إشراف عام شامل'}\n• الوجهة: ${
                      tripSettings.destination || tripSettings.tripName || 'الوجهة المعتمدة'
                    }\n• كود الترخيص: KYN-2026-B${session.assignedBus || 'HQ'}-${session.pin || 'AUTH'}\n• معتمد رسمياً من الإدارة العامة لشركة كيان`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>مشاركة واتساب</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
