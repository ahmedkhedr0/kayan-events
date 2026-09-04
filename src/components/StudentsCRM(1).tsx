import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  Send,
  Printer,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  Upload,
  Phone,
  Shirt,
  Bus,
  DollarSign,
  QrCode,
  Sparkles,
  Copy,
  Check,
  FileText,
  ClipboardList,
  RotateCcw,
  UserCheck,
  UserX,
  Layers,
  Utensils,
  CheckSquare,
  X,
  ArrowUpDown,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Student, PaymentStatus, PaymentMethod, TShirtSize, Gender, ParticipantRole, PARTICIPANT_ROLES_CONFIG, TripSettings, TripAddon, getStudentMealInfo, isApparelAddon, isMealAddon, ActiveUserSession } from '../types';
import { sendWhatsAppReceipt, sendCustomWhatsAppMessage, generateWhatsAppTicketText } from '../services/storage';
import { generateStudentTicketPDF, generateReceiptPDF, exportTicketElementAsPNG, copyTicketElementToClipboard } from '../services/pdfGenerator';
import { DigitalTicketCard } from './DigitalTicketCard';
import { BusSeatPicker } from './BusSeatPicker';

interface StudentsCRMProps {
  students: Student[];
  settings: TripSettings;
  userSession?: ActiveUserSession;
  onAddStudent: (newStudent: Omit<Student, 'id' | 'ticketCode'>) => Student;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onOpenTicketPassModal: (student: Student) => void;
  onToggleMealReceived?: (studentId: string) => void;
  onToggleTShirtReceived?: (studentId: string) => void;
  onToggleCheckInDeparture?: (studentId: string) => void;
  onToggleCheckInReturn?: (studentId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const StudentsCRM: React.FC<StudentsCRMProps> = ({
  students,
  settings,
  userSession,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onOpenTicketPassModal,
  onToggleMealReceived,
  onToggleTShirtReceived,
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onNavigateTab,
}) => {
  // Bus restriction for field supervisor or specific assigned bus
  const restrictedBus = Boolean(
    userSession &&
    userSession.role !== 'admin' &&
    userSession.assignedBus &&
    userSession.assignedBus > 0
  ) ? userSession!.assignedBus! : 0;

  // Visible students constrained to the supervisor's assigned bus if restricted
  const visibleStudents = useMemo(() => {
    if (restrictedBus > 0) {
      return students.filter((s) => s.busNumber === restrictedBus);
    }
    return students;
  }, [students, restrictedBus]);

  // Local states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBusFilter, setSelectedBusFilter] = useState<number | 'all'>(restrictedBus > 0 ? restrictedBus : 'all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<Gender | 'all'>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<ParticipantRole | 'all'>('all');
  const [selectedAttendanceFilter, setSelectedAttendanceFilter] = useState<'all' | 'departure_checked' | 'departure_absent' | 'return_checked' | 'return_absent' | 'full_attendance'>('all');
  const [selectedMealFilter, setSelectedMealFilter] = useState<'all' | 'has_meal' | 'meal_received' | 'meal_pending' | 'no_meal' | 'tshirt_received' | 'tshirt_pending'>('all');

  // Modal State for Add / Edit Student
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // WhatsApp Messenger Modal States
  const [isWhatsAppMessengerOpen, setIsWhatsAppMessengerOpen] = useState(false);
  const [whatsAppStudent, setWhatsAppStudent] = useState<Student | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [whatsAppMessageText, setWhatsAppMessageText] = useState('');
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'full_ticket' | 'receipt' | 'bus_info'>('full_ticket');
  const [whatsAppTab, setWhatsAppTab] = useState<'visual_ticket' | 'text_message'>('visual_ticket');
  const [autoSendWhatsAppOnSave, setAutoSendWhatsAppOnSave] = useState(true);
  const [copiedState, setCopiedState] = useState(false);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (studentToDelete) {
          setStudentToDelete(null);
        } else if (isWhatsAppMessengerOpen) {
          setIsWhatsAppMessengerOpen(false);
        } else if (isModalOpen) {
          setIsModalOpen(false);
          setEditingStudent(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studentToDelete, isWhatsAppMessengerOpen, isModalOpen]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    faculty: 'حاسبات والمعلومات - 2026',
    gender: 'male' as Gender,
    participantRole: 'student' as ParticipantRole,
    customRole: '',
    isFreeTicket: false,
    hasCompanion: false,
    companionName: '',
    companionPhone: '',
    companionNationalId: '',
    companionSeatNumber: undefined as number | undefined,
    companionTShirtSize: 'L' as TShirtSize,
    companionHasMeal: false,
    companionMealOption: 'وجبة غداء VIP (دجاج / كفتة)',
    companionPrice: settings.ticketPrice as number | undefined,
    busNumber: 1,
    seatNumber: undefined as number | undefined,
    tshirtSize: 'L' as TShirtSize,
    paymentStatus: 'paid' as PaymentStatus,
    totalAmount: settings.ticketPrice,
    paidAmount: settings.ticketPrice,
    paymentMethod: 'vodafone_cash' as PaymentMethod,
    nationalId: '',
    emergencyPhone: '',
    pickupPoint: '',
    notes: '',
    hasMeal: false,
    mealOption: 'وجبة غداء VIP (دجاج / كفتة)',
    mealPrice: 150,
    mealReceived: false,
    tshirtReceived: false,
    selectedAddonIds: [] as string[],
    addonOptions: {} as Record<string, string>,
  });

  // Open WhatsApp Ticket Customizer Modal
  const handleOpenWhatsAppMessenger = (
    student: Student,
    templateType: 'full_ticket' | 'receipt' | 'bus_info' = 'full_ticket'
  ) => {
    setWhatsAppStudent(student);
    setWhatsAppPhone(student.phone);
    setWhatsAppTemplate(templateType);
    setWhatsAppTab('visual_ticket');
    setWhatsAppMessageText(generateWhatsAppTicketText(student, settings, templateType));
    setIsWhatsAppMessengerOpen(true);
  };

  // Calculate student total amount based on base price, isFree, tshirt, meal, and selected addons
  const calculateStudentPrice = (
    baseTicketPrice: number,
    isFreeTicket: boolean,
    selectedAddonIds: string[],
    addonsList: TripAddon[] = []
  ) => {
    if (isFreeTicket) return 0;
    let total = Number(baseTicketPrice) || 0;
    for (const addonId of selectedAddonIds) {
      const addon = addonsList.find((a) => a.id === addonId);
      if (addon) {
        total += Number(addon.price) || 0;
      }
    }
    return total;
  };

  // Open modal for new student
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setAutoSendWhatsAppOnSave(true);

    // Auto-detect first free seat across buses 1..6 (or restricted bus)
    let initialBus = restrictedBus > 0 ? restrictedBus : 1;
    let initialSeat = 1;
    const busesToCheck = restrictedBus > 0 ? [restrictedBus] : [1, 2, 3, 4, 5, 6];
    for (const b of busesToCheck) {
      const busStuds = students.filter((s) => s.busNumber === b);
      const takenSeats = new Set(busStuds.map((s) => s.seatNumber).filter(Boolean));
      let found = false;
      for (let sNo = 1; sNo <= 50; sNo++) {
        if (!takenSeats.has(sNo)) {
          initialBus = b;
          initialSeat = sNo;
          found = true;
          break;
        }
      }
      if (found) break;
    }

    const defaultAddonIds = (settings.addons || []).filter((a) => a.isDefaultSelected).map((a) => a.id);
    const tshirtAddon = (settings.addons || []).find(
      (a) => a.id.toLowerCase().includes('tshirt') || a.name.includes('تيشرت') || a.name.includes('تيشيرت')
    );
    const mealAddon = (settings.addons || []).find(
      (a) => a.id.toLowerCase().includes('meal') || a.name.includes('وجب') || a.name.includes('غداء') || a.name.includes('عشاء') || a.name.includes('إعاشة')
    );

    const hasTshirtDefault = tshirtAddon ? defaultAddonIds.includes(tshirtAddon.id) : false;
    const hasMealDefault = mealAddon ? defaultAddonIds.includes(mealAddon.id) : false;
    const initialMainTotal = calculateStudentPrice(settings.ticketPrice || 800, false, defaultAddonIds, settings.addons || []);

    setFormData({
      name: '',
      phone: '01',
      faculty: '',
      gender: 'male',
      participantRole: 'student',
      customRole: 'طالب',
      isFreeTicket: false,
      selectedAddonIds: defaultAddonIds,
      hasCompanion: false,
      companionName: '',
      companionPhone: '',
      companionEmergencyPhone: '',
      companionNationalId: '',
      companionSeatNumber: initialSeat + 1 <= 50 ? initialSeat + 1 : undefined,
      companionTShirtSize: 'L',
      companionHasMeal: false,
      companionMealOption: 'وجبة غداء VIP (دجاج / كفتة)',
      companionPrice: settings.companionFullPrice ?? settings.ticketPrice,
      companionSelectedAddonIds: defaultAddonIds,
      busNumber: initialBus,
      seatNumber: initialSeat,
      tshirtSize: hasTshirtDefault ? 'L' : 'none',
      paymentStatus: 'paid',
      totalAmount: initialMainTotal,
      paidAmount: initialMainTotal,
      paymentMethod: 'vodafone_cash',
      nationalId: '',
      emergencyPhone: '',
      pickupPoint: '',
      notes: '',
      hasMeal: hasMealDefault,
      mealOption: hasMealDefault ? 'وجبة غداء VIP (دجاج / كفتة)' : '',
      mealPrice: mealAddon ? Number(mealAddon.price) : 150,
      mealReceived: false,
      tshirtReceived: false,
      addonOptions: {},
    });
    setIsModalOpen(true);
  };

  // Open modal for editing student
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setAutoSendWhatsAppOnSave(false);
    const defaultAddonIds = (settings.addons || []).filter((a) => a.isDefaultSelected).map((a) => a.id);
    setFormData({
      name: student.name,
      phone: student.phone,
      faculty: student.faculty || '',
      gender: student.gender,
      participantRole: student.participantRole || 'student',
      customRole: student.customRole || (student.participantRole === 'companion' ? 'مرافق' : student.participantRole === 'organizer' ? 'منظم' : 'طالب'),
      isFreeTicket: student.isFreeTicket || false,
      selectedAddonIds: student.selectedAddonIds || defaultAddonIds,
      addonOptions: student.addonOptions || {},
      hasCompanion: student.hasCompanion || false,
      companionName: student.companionName || '',
      companionPhone: student.companionPhone || '',
      companionEmergencyPhone: student.companionEmergencyPhone || '',
      companionNationalId: student.companionNationalId || '',
      companionSeatNumber: student.companionSeatNumber,
      companionTShirtSize: student.companionTShirtSize || 'L',
      companionHasMeal: student.companionHasMeal || false,
      companionMealOption: student.companionMealOption || 'وجبة غداء VIP (دجاج / كفتة)',
      companionPrice: student.companionPrice !== undefined ? student.companionPrice : (settings.companionFullPrice ?? settings.ticketPrice),
      companionSelectedAddonIds: student.companionSelectedAddonIds || defaultAddonIds,
      companionAddonOptions: student.companionAddonOptions || {},
      busNumber: student.busNumber,
      seatNumber: student.seatNumber,
      tshirtSize: student.tshirtSize,
      paymentStatus: student.paymentStatus,
      totalAmount: student.totalAmount,
      paidAmount: student.paidAmount,
      paymentMethod: student.paymentMethod,
      nationalId: student.nationalId || '',
      emergencyPhone: student.emergencyPhone || '',
      pickupPoint: student.pickupPoint || '',
      notes: student.notes || '',
      hasMeal: student.hasMeal || false,
      mealOption: student.mealOption || '',
      mealPrice: student.mealPrice || 150,
      mealReceived: student.mealReceived || false,
      tshirtReceived: student.tshirtReceived || false,
    });
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('برجاء كتابة اسم المشارك ورقم الهاتف بشكل صحيح');
      return;
    }

    const remainingAmount = Math.max(0, formData.totalAmount - formData.paidAmount);
    let targetStudentForWhatsApp: Student | null = null;

    if (editingStudent) {
      const updatedStudent: Student = {
        ...editingStudent,
        ...formData,
        remainingAmount,
      };
      onUpdateStudent(updatedStudent);
      targetStudentForWhatsApp = updatedStudent;
    } else {
      const savedStudent = onAddStudent({
        ...formData,
        remainingAmount,
        checkInDeparture: false,
        checkInReturn: false,
      });
      targetStudentForWhatsApp = savedStudent;
    }

    setIsModalOpen(false);

    // Automatically open WhatsApp visual ticket card modal upon reservation completion!
    if (targetStudentForWhatsApp) {
      setTimeout(() => {
        handleOpenWhatsAppMessenger(targetStudentForWhatsApp!, 'full_ticket');
        setWhatsAppTab('visual_ticket');
      }, 100);
    }
  };

  // Filtered Students (derived from visibleStudents for isolation)
  const filteredStudents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return visibleStudents.filter((student) => {
      const matchQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.phone.includes(q) ||
        student.ticketCode.toLowerCase().includes(q) ||
        student.faculty.toLowerCase().includes(q) ||
        (student.companionName && student.companionName.toLowerCase().includes(q)) ||
        (student.notes && student.notes.toLowerCase().includes(q));

      const matchBus = selectedBusFilter === 'all' || student.busNumber === selectedBusFilter;
      const matchStatus = selectedStatusFilter === 'all' || student.paymentStatus === selectedStatusFilter;
      const matchGender = selectedGenderFilter === 'all' || student.gender === selectedGenderFilter;
      const matchRole = selectedRoleFilter === 'all' || (student.participantRole || 'student') === selectedRoleFilter;

      let matchAttendance = true;
      if (selectedAttendanceFilter === 'departure_checked') matchAttendance = !!student.checkInDeparture;
      else if (selectedAttendanceFilter === 'departure_absent') matchAttendance = !student.checkInDeparture;
      else if (selectedAttendanceFilter === 'return_checked') matchAttendance = !!student.checkInReturn;
      else if (selectedAttendanceFilter === 'return_absent') matchAttendance = !student.checkInReturn;
      else if (selectedAttendanceFilter === 'full_attendance') matchAttendance = !!student.checkInDeparture && !!student.checkInReturn;

      const mealInfo = getStudentMealInfo(student, settings);
      let matchMeal = true;
      if (selectedMealFilter === 'has_meal') matchMeal = !!mealInfo.hasMeal;
      else if (selectedMealFilter === 'meal_received') matchMeal = !!student.mealReceived;
      else if (selectedMealFilter === 'meal_pending') matchMeal = !!mealInfo.hasMeal && !student.mealReceived;
      else if (selectedMealFilter === 'no_meal') matchMeal = !mealInfo.hasMeal;
      else if (selectedMealFilter === 'tshirt_received') matchMeal = !!student.tshirtReceived;
      else if (selectedMealFilter === 'tshirt_pending') matchMeal = !student.tshirtReceived;

      return matchQuery && matchBus && matchStatus && matchGender && matchRole && matchAttendance && matchMeal;
    });
  }, [visibleStudents, searchTerm, selectedBusFilter, selectedStatusFilter, selectedGenderFilter, selectedRoleFilter, selectedAttendanceFilter, selectedMealFilter, settings]);

  // Overall Statistics for Dashboard
  const stats = useMemo(() => {
    const total = visibleStudents.length;
    const departureCount = visibleStudents.filter((s) => s.checkInDeparture).length;
    const returnCount = visibleStudents.filter((s) => s.checkInReturn).length;
    const mealsCount = visibleStudents.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
    const mealsReceivedCount = visibleStudents.filter((s) => s.mealReceived).length;
    const tshirtsReceivedCount = visibleStudents.filter((s) => s.tshirtReceived).length;
    const totalPaid = visibleStudents.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
    const totalRemaining = visibleStudents.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);
    const totalExpected = visibleStudents.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const departurePercent = total > 0 ? Math.round((departureCount / total) * 100) : 0;
    const returnPercent = total > 0 ? Math.round((returnCount / total) * 100) : 0;
    const mealsPercent = mealsCount > 0 ? Math.round((mealsReceivedCount / mealsCount) * 100) : 0;
    const tshirtsPercent = total > 0 ? Math.round((tshirtsReceivedCount / total) * 100) : 0;

    return {
      total,
      departureCount,
      departurePercent,
      returnCount,
      returnPercent,
      mealsCount,
      mealsReceivedCount,
      mealsPercent,
      tshirtsReceivedCount,
      tshirtsPercent,
      totalPaid,
      totalRemaining,
      totalExpected,
    };
  }, [visibleStudents, settings]);

  const isFilterActive =
    searchTerm !== '' ||
    selectedBusFilter !== 'all' ||
    selectedStatusFilter !== 'all' ||
    selectedGenderFilter !== 'all' ||
    selectedRoleFilter !== 'all' ||
    selectedAttendanceFilter !== 'all' ||
    selectedMealFilter !== 'all';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBusFilter('all');
    setSelectedStatusFilter('all');
    setSelectedGenderFilter('all');
    setSelectedRoleFilter('all');
    setSelectedAttendanceFilter('all');
    setSelectedMealFilter('all');
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'كود التذكرة',
      'اسم الطالب',
      'نوع التذكرة / الصفة',
      'رقم الهاتف',
      'الكلية/الدفعة',
      'الجنس',
      'رقم الأتوبيس',
      'رقم المقعد',
      'مقاس التيشرت',
      'تسليم التيشرت',
      'الوجبة الغذائية',
      'تسليم الوجبة',
      'الإضافات والخدمات المطلوبة',
      'حالة السداد',
      'المبلغ الكلي',
      'المدفوع',
      'المتبقي',
      'طريقة الدفع',
      'حضور الذهاب',
      'حضور العودة',
    ];

    const rows = filteredStudents.map((s) => {
      const mealInfo = getStudentMealInfo(s, settings);
      const addonNames = (settings.addons || [])
        .filter((a) => (s.selectedAddonIds || []).includes(a.id))
        .map((a) => a.name)
        .join(' + ');

      return [
        s.ticketCode,
        `"${s.name}"`,
        s.isFreeTicket ? 'تذكرة مجانية VIP 🎁' : `"${s.customRole || s.participantRole || 'طالب'}"`,
        s.phone,
        `"${s.faculty}"`,
        s.gender === 'male' ? 'ذكر' : 'أنثى',
        s.busNumber,
        s.seatNumber || '',
        s.tshirtSize,
        s.tshirtReceived ? 'تم الاستلام' : 'لم يستلم',
        `"${mealInfo.hasMeal ? mealInfo.mealName : 'بدون وجبة'}"`,
        s.mealReceived ? 'تم التسليم' : 'في الانتظار',
        `"${addonNames || 'بدون إضافات'}"`,
        s.isFreeTicket ? 'مجاني 🎁' : s.paymentStatus,
        s.isFreeTicket ? 0 : s.totalAmount,
        s.isFreeTicket ? 0 : s.paidAmount,
        s.isFreeTicket ? 0 : s.remainingAmount,
        s.paymentMethod,
        s.checkInDeparture ? 'حضر ✅' : 'غائب 🔲',
        s.checkInReturn ? 'حضر ✅' : 'غائب 🔲',
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KAYAN_Students_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Bus Isolation Alert Banner for Field Supervisors */}
      {restrictedBus > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/80 border-2 border-amber-500/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white">صلاحية مقيدة: إدارة حافلة #{restrictedBus} فقط 🚌</h4>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  عزل الصلاحيات مفعّل
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                أنت مسجل كمشرف مسؤول عن حافلة رقم ({restrictedBus}). تم حجب بيانات وركاب الحافلات الأخرى لضمان خصوصية وعدم التداخل مع زملائك.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-slate-950/80 border border-amber-500/30 px-3 py-1.5 rounded-xl self-end sm:self-auto">
            <span>حافلتك المصرحة:</span>
            <span className="font-mono text-white bg-amber-500/30 px-2 py-0.5 rounded-md">#{restrictedBus}</span>
          </div>
        </div>
      )}

      {/* Header & Command Dashboard Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
        {/* Top Title & Actions Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  لوحة إدارة الحجوزات والطلاب المركزية (CRM)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  المنظومة المركزية الشاملة لإدارة المشاركين، الحضور، الإعاشة، واستخراج التقارير الرسمية
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('manifests')}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg shadow-amber-500/25 active:scale-95 cursor-pointer"
                title="مركز الكشوفات الشامل والطباعة الورقية المعتمدة A4"
              >
                <ClipboardList className="w-4 h-4 text-slate-950" />
                <span>مركز الكشوفات A4 🖨️</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مشترك جديد</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Ribbon (لوحة المؤشرات الحية) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {/* Total Registered */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">إجمالي المسجلين</span>
              <strong className="text-lg font-black text-white font-mono">{stats.total}</strong>
              <span className="text-[10px] text-amber-400 font-bold block">مشارك ومرافقة</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Departure Attendance */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">حضور الذهاب 🚌</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">
                {stats.departureCount} <span className="text-xs text-slate-400">/ {stats.total}</span>
              </strong>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                نسبة الصعود: {stats.departurePercent}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Return Attendance */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">حضور العودة 🚌</span>
              <strong className="text-lg font-black text-indigo-400 font-mono">
                {stats.returnCount} <span className="text-xs text-slate-400">/ {stats.total}</span>
              </strong>
              <div className="text-[10px] text-indigo-400 font-bold mt-0.5">
                نسبة الصعود: {stats.returnPercent}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bus className="w-5 h-5" />
            </div>
          </div>

          {/* Meals Delivery Progress */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">الوجبات الغذائية 🍔</span>
              <strong className="text-lg font-black text-amber-400 font-mono">
                {stats.mealsReceivedCount} <span className="text-xs text-slate-400">/ {stats.mealsCount}</span>
              </strong>
              <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                تم التسليم: {stats.mealsPercent}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Utensils className="w-5 h-5" />
            </div>
          </div>

          {/* Financials Overview */}
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold">التحصيل المالي</span>
              <strong className="text-base font-black text-emerald-400 font-mono block">
                {stats.totalPaid.toLocaleString()} ج.م
              </strong>
              <span className="text-[10px] text-rose-400 font-bold block">
                متبقي: {stats.totalRemaining.toLocaleString()} ج.م
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar (شريط البحث السريع والفلاتر المتقدمة) */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
            {/* Quick Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                placeholder="بحث سريع بالاسم، الهاتف، كود التذكرة، الكلية، المرافق..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl pr-9 pl-8 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none placeholder:text-slate-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-3 text-slate-400 hover:text-white"
                  title="مسح البحث"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Attendance Status Filter (فلتر حالة الحضور) */}
            <div className="lg:col-span-2">
              <select
                value={selectedAttendanceFilter}
                onChange={(e) => setSelectedAttendanceFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-emerald-300 font-bold rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="all">حالة الحضور (الكل)</option>
                <option value="departure_checked">حضر الذهاب فقط ✅</option>
                <option value="departure_absent">غائب في الذهاب 🔲</option>
                <option value="return_checked">حضر العودة فقط ✅</option>
                <option value="return_absent">غائب في العودة 🔲</option>
                <option value="full_attendance">حضور كامل (ذهاب وعودة) 🌟</option>
              </select>
            </div>

            {/* Meal & Delivery Status Filter (فلتر الوجبات والتسليمات) */}
            <div className="lg:col-span-2">
              <select
                value={selectedMealFilter}
                onChange={(e) => setSelectedMealFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-amber-300 font-bold rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="all">الوجبات والتسليمات (الكل)</option>
                <option value="has_meal">طلبوا وجبة طعام 🍔</option>
                <option value="meal_received">استلموا الوجبة 🍔✅</option>
                <option value="meal_pending">لم يستلموا الوجبة 🍔⏳</option>
                <option value="no_meal">بدون وجبة طعام</option>
                <option value="tshirt_received">استلموا التيشرت 👕✅</option>
                <option value="tshirt_pending">لم يستلموا التيشرت 👕⏳</option>
              </select>
            </div>

            {/* Bus Filter */}
            <div className="lg:col-span-1">
              {restrictedBus > 0 ? (
                <div className="w-full bg-slate-950 border border-amber-500/50 text-amber-300 font-bold rounded-xl px-2.5 py-2 text-xs flex items-center justify-between shadow-sm">
                  <span className="truncate">حافلة #{restrictedBus}</span>
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                </div>
              ) : (
                <select
                  value={selectedBusFilter}
                  onChange={(e) => setSelectedBusFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="all">الأتوبيس</option>
                  {[1, 2, 3, 4, 5, 6].map((b) => (
                    <option key={b} value={b}>حافلة {b}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Payment Status Filter */}
            <div className="lg:col-span-1">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as PaymentStatus | 'all')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="all">السداد</option>
                <option value="paid">مسدد ✅</option>
                <option value="deposit">عربون ⏳</option>
                <option value="unpaid">غير مدفوع ❌</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="lg:col-span-1">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value as ParticipantRole | 'all')}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
              >
                <option value="all">الصفة</option>
                <option value="student">طلاب</option>
                <option value="companion">مرافقون</option>
                <option value="organizer">منظمون</option>
                <option value="photographer">ميديا</option>
                <option value="dj">DJ</option>
                <option value="supervisor">مشرفون</option>
                <option value="staff">خدمات</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            <div className="lg:col-span-1">
              <button
                type="button"
                onClick={handleResetFilters}
                disabled={!isFilterActive}
                className={`w-full h-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${
                  isFilterActive
                    ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/80 cursor-pointer'
                    : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title="إعادة ضبط وتفريغ جميع الفلاتر"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إلغاء</span>
              </button>
            </div>
          </div>

          {/* Active Filtering Feedback Badge */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">
                عرض <strong className="text-amber-400 font-mono text-sm">{filteredStudents.length}</strong> من أصل <strong className="text-white font-mono text-sm">{students.length}</strong> مشترك
              </span>
              {isFilterActive && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                  ⚡ فلاتر نشطة
                </span>
              )}
            </div>
            {searchTerm && (
              <span className="text-[11px] text-slate-400">
                نتائج البحث عن: <strong className="text-amber-300">"{searchTerm}"</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Card List (Visible on phones) & Desktop Table List (Visible on tablet/desktop) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Mobile View: Clean, stacked touch cards */}
        <div className="block md:hidden divide-y divide-slate-800">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              لا يوجد طلاب مطابقون للبحث والفلترة الحالية.
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isPaid = student.paymentStatus === 'paid';
              const isDeposit = student.paymentStatus === 'deposit';
              const mealInfo = getStudentMealInfo(student, settings);

              return (
                <div key={student.id} className="p-4 space-y-3 bg-slate-900/90 hover:bg-slate-850 transition">
                  {/* Header Row */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-white text-base">{student.name}</h4>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                            student.gender === 'male'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                          }`}
                        >
                          {student.gender === 'male' ? 'ذكر' : 'أنثى'}
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
                        {student.isFreeTicket && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-black">
                            🎁 مجاني VIP
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{student.faculty}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md shrink-0">
                      {student.ticketCode}
                    </span>
                  </div>

                  {/* Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <a
                      href={`tel:${student.phone}`}
                      className="bg-slate-950 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 active:scale-95"
                    >
                      <Phone className="w-3 h-3 text-amber-400" />
                      {student.phone}
                    </a>

                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-1 rounded-lg font-bold">
                      أتوبيس {student.busNumber} {student.seatNumber ? `• مقعد #${student.seatNumber}` : ''}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 ${
                        isPaid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isDeposit
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPaid ? 'مسدد بالكامل' : isDeposit ? `عربون (${student.paidAmount} ج.م)` : 'غير مدفوع'}
                    </span>
                  </div>

                  {/* Interactive Attendance & Merch Quick Toggles (Mobile Row) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {/* Departure Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center ${
                        student.checkInDeparture
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400">حضور الذهاب</span>
                      <span>{student.checkInDeparture ? '✅ حضر الذهاب' : '🔲 غائب في الذهاب'}</span>
                    </button>

                    {/* Return Toggle */}
                    <button
                      type="button"
                      onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center ${
                        student.checkInReturn
                          ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400">حضور العودة</span>
                      <span>{student.checkInReturn ? '✅ حضر العودة' : '🔲 غائب في العودة'}</span>
                    </button>

                    {/* Meal Toggle */}
                    {mealInfo.hasMeal ? (
                      <button
                        type="button"
                        onClick={() => onToggleMealReceived && onToggleMealReceived(student.id)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center ${
                          student.mealReceived
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                            : 'bg-slate-950 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        <span className="text-[10px] opacity-80">وجبة 🍔</span>
                        <span>{student.mealReceived ? '✅ استلم الوجبة' : '🔲 في الانتظار'}</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-xl text-[10px] bg-slate-950/60 border border-slate-800/80 text-slate-500 flex items-center justify-center text-center font-medium">
                        بدون وجبة
                      </div>
                    )}

                    {/* T-Shirt Toggle / Empty badge */}
                    {student.tshirtSize && student.tshirtSize !== 'none' && student.tshirtSize !== 'None' && student.tshirtSize !== 'بدون' && student.tshirtSize !== '-' ? (
                      <button
                        type="button"
                        onClick={() => onToggleTShirtReceived && onToggleTShirtReceived(student.id)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition flex flex-col items-center justify-center ${
                          student.tshirtReceived
                            ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] text-slate-400">تيشرت {student.tshirtSize}</span>
                        <span>{student.tshirtReceived ? '✅ تم التسليم' : '🔲 لم يستلم'}</span>
                      </button>
                    ) : (
                      <div className="p-2 rounded-xl text-[10px] bg-slate-950/60 border border-slate-800/80 text-slate-500 flex items-center justify-center text-center font-medium">
                        بدون تيشيرت
                      </div>
                    )}
                  </div>

                  {/* Selected Addons Mobile Badges */}
                  {student.selectedAddonIds && student.selectedAddonIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="text-[10px] text-amber-400 font-bold">⚡ الإضافات:</span>
                      {(settings.addons || [])
                        .filter((a) => (student.selectedAddonIds || []).includes(a.id))
                        .map((a) => (
                          <span key={a.id} className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold">
                            {a.name} {student.isFreeTicket && '🎁 (مجاناً)'}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Registered Companions List (Mobile Card) */}
                  {student.hasCompanion && student.companions && student.companions.length > 0 && (
                    <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-xs space-y-2">
                      <div className="flex items-center justify-between text-amber-300 font-bold">
                        <span className="flex items-center gap-1.5 text-xs">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>المرافقون المسجلون ({student.companions.length}):</span>
                        </span>
                      </div>
                      {student.companions.map((comp, idx) => (
                        <div key={comp.id || idx} className="bg-slate-950/90 p-2 rounded-lg border border-slate-800 flex justify-between items-center text-[11px]">
                          <div>
                            <span className="text-white font-bold">{idx + 1}. {comp.name}</span>
                            <span className="text-amber-400 text-[10px] mr-1">({comp.relation || 'مرافق'})</span>
                            {comp.phone && <span className="text-slate-400 text-[10px] block font-mono">{comp.phone}</span>}
                          </div>
                          <div className="text-left font-mono text-[10px]">
                            <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 block text-center">
                              تيشرت {comp.tshirtSize || 'L'}
                            </span>
                            <span className="text-amber-400 font-bold block mt-0.5">
                              أتوبيس #{comp.busNumber || student.busNumber} {comp.seatNumber ? `• مقعد #${comp.seatNumber}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Financials detail */}
                  {student.remainingAmount > 0 && (
                    <div className="bg-slate-950/80 p-2 rounded-xl border border-rose-900/30 text-xs flex justify-between items-center text-rose-300 font-mono">
                      <span>المبلغ المتبقي للتحصيل:</span>
                      <strong className="text-rose-400 font-bold">{student.remainingAmount} ج.م</strong>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="pt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => handleOpenWhatsAppMessenger(student, 'full_ticket')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span>إرسال وتعديل الواتساب</span>
                    </button>

                    <button
                      onClick={() => onOpenTicketPassModal(student)}
                      className="bg-slate-800 text-amber-400 p-2.5 rounded-xl border border-slate-700 active:scale-95"
                      title="معاينة التذكرة"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        generateReceiptPDF(
                          {
                            id: `rc-${student.id}`,
                            voucherNumber: `RC-${student.ticketCode}`,
                            type: 'receipt',
                            personName: student.name,
                            amount: student.paidAmount,
                            reason: `حجز تذكرة ${settings.tripName} - أتوبيس ${student.busNumber}`,
                            paymentMethod: student.paymentMethod,
                            date: new Date().toISOString().slice(0, 10),
                            supervisorName: 'إدارة كيان',
                          },
                          settings
                        )
                      }
                      className="bg-slate-800 text-indigo-300 p-2.5 rounded-xl border border-slate-700 active:scale-95"
                      title="طباعة إيصال PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleOpenEdit(student)}
                      className="bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700 active:scale-95"
                      title="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف الطالب ${student.name}؟`)) {
                          onDeleteStudent(student.id);
                        }
                      }}
                      className="bg-slate-800 text-rose-400 p-2.5 rounded-xl border border-slate-700 active:scale-95"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs border-b border-slate-800 uppercase font-bold">
                <th className="py-3.5 px-3 text-center">كود</th>
                <th className="py-3.5 px-3">المشارك والصفة</th>
                <th className="py-3.5 px-3">الهاتف</th>
                <th className="py-3.5 px-3 text-center">الأتوبيس والمقعد</th>
                <th className="py-3.5 px-3 text-center">التيشرت والوجبة</th>
                <th className="py-3.5 px-3 text-center">حضور الذهاب والعودة</th>
                <th className="py-3.5 px-3">السداد والماليات</th>
                <th className="py-3.5 px-3 text-center">إجراءات وواتساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    لا يوجد طلاب مطابقون للبحث والفلترة الحالية.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const isPaid = student.paymentStatus === 'paid';
                  const isDeposit = student.paymentStatus === 'deposit';
                  const mealInfo = getStudentMealInfo(student, settings);

                  return (
                    <tr key={student.id} className="hover:bg-slate-800/40 transition">
                      {/* Ticket Code */}
                      <td className="py-3 px-3 font-mono font-bold text-amber-400 text-center">
                        {student.ticketCode}
                      </td>

                      {/* Name & Faculty */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{student.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              student.gender === 'male'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                            }`}
                          >
                            {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                          </span>
                          
                          {/* Custom Role or Preset Badge */}
                          {(student.customRole || (student.participantRole && student.participantRole !== 'student')) && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-md font-extrabold flex items-center gap-1 border ${
                                PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.bg || 'bg-amber-500/20'
                              } ${PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.text || 'text-amber-400'} ${
                                PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.border || 'border-amber-500/40'
                              }`}
                            >
                              <span>{PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.icon || '🎫'}</span>
                              <span>{student.customRole || PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.badge}</span>
                            </span>
                          )}

                          {/* Free Ticket Badge */}
                          {student.isFreeTicket && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.2 rounded font-black">
                              🎁 مجاني VIP
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 text-[11px] block truncate">{student.faculty}</span>

                        {/* Linked Single Companion */}
                        {student.hasCompanion && student.companionName && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            <span className="bg-purple-950/80 text-purple-200 border border-purple-500/40 text-[9px] px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                              <span>👥 + مرافق: <strong>{student.companionName}</strong></span>
                              {student.companionSeatNumber && <span className="text-amber-300 font-mono">(#{student.companionSeatNumber})</span>}
                            </span>
                          </div>
                        )}

                        {/* Multiple Companions List (if exists) */}
                        {student.hasCompanion && student.companions && student.companions.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {student.companions.map((comp, cIdx) => (
                              <span key={comp.id || cIdx} className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[9px] px-1 py-0.2 rounded font-bold flex items-center gap-1">
                                <span>👥 ({comp.relation || 'مرافق'}): {comp.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 text-slate-300 font-mono text-xs">
                        <a href={`tel:${student.phone}`} className="flex items-center gap-1 hover:text-amber-400">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{student.phone}</span>
                        </a>
                      </td>

                      {/* Bus & Seat */}
                      <td className="py-3 px-3 text-center">
                        <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/50 text-[11px] px-2 py-0.5 rounded-md font-bold block mb-1">
                          حافلة #{student.busNumber}
                        </span>
                        <span className="font-mono text-amber-400 font-bold text-xs">
                          {student.seatNumber ? `مقعد #${student.seatNumber}` : '—'}
                        </span>
                      </td>

                      {/* Merch & Meals (T-Shirt & Meal toggles) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {/* T-Shirt Toggle Button */}
                          {student.tshirtSize && student.tshirtSize !== 'none' && student.tshirtSize !== 'None' && student.tshirtSize !== 'بدون' && student.tshirtSize !== '-' ? (
                            <button
                              type="button"
                              onClick={() => onToggleTShirtReceived && onToggleTShirtReceived(student.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                                student.tshirtReceived
                                  ? 'bg-purple-950/80 border-purple-500/50 text-purple-300'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                              title="انقر لتعديل حالة تسليم التيشرت"
                            >
                              <span>👕 {student.tshirtSize}</span>
                              <span>{student.tshirtReceived ? '✅' : '🔲'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-800/80 px-2 py-0.5 rounded font-medium">
                              بدون تيشيرت
                            </span>
                          )}

                          {/* Meal Toggle Button */}
                          {mealInfo.hasMeal ? (
                            <button
                              type="button"
                              onClick={() => onToggleMealReceived && onToggleMealReceived(student.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition flex items-center gap-1 ${
                                student.mealReceived
                                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                                  : 'bg-slate-900 border-amber-500/30 text-amber-400 hover:border-amber-500'
                              }`}
                              title="انقر لتعديل حالة تسليم الوجبة"
                            >
                              <span>🍔 {mealInfo.mealName.slice(0, 10)}</span>
                              <span>{student.mealReceived ? '✅' : '🔲'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-800/80 px-2 py-0.5 rounded font-medium">
                              بدون وجبة
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Toggles (Departure & Return) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {/* Departure Check-in Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition flex items-center justify-between gap-1 w-24 ${
                              student.checkInDeparture
                                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                            title="انقر لتغيير حالة حضور الذهاب"
                          >
                            <span>ذهاب:</span>
                            <span>{student.checkInDeparture ? '✅ حضر' : '🔲 غائب'}</span>
                          </button>

                          {/* Return Check-in Toggle */}
                          <button
                            type="button"
                            onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition flex items-center justify-between gap-1 w-24 ${
                              student.checkInReturn
                                ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                            title="انقر لتغيير حالة حضور العودة"
                          >
                            <span>عودة:</span>
                            <span>{student.checkInReturn ? '✅ حضر' : '🔲 غائب'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-bold flex items-center gap-1 ${
                              isPaid
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : isDeposit
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isPaid && <CheckCircle className="w-2.5 h-2.5" />}
                            {isDeposit && <AlertCircle className="w-2.5 h-2.5" />}
                            {!isPaid && !isDeposit && <XCircle className="w-2.5 h-2.5" />}
                            {isPaid ? 'كامل' : isDeposit ? 'عربون' : 'غير مدفوع'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          {student.participantRole && student.participantRole !== 'student' ? (
                            <span className="text-amber-400 font-bold block text-[10px]">
                              👑 مقعد مجاني (0)
                            </span>
                          ) : (
                            <>
                              <span className="text-emerald-400 font-bold">{student.paidAmount}</span> / {student.totalAmount}
                              {student.remainingAmount > 0 && (
                                <span className="text-rose-400 block text-[10px] font-bold">
                                  متبقي: {student.remainingAmount}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Actions & WhatsApp */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* WhatsApp Custom Messenger Button */}
                          <button
                            onClick={() => handleOpenWhatsAppMessenger(student, 'full_ticket')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1.5 rounded-lg text-xs flex items-center gap-1 transition shadow-md shadow-emerald-600/20 active:scale-95"
                            title="إرسال ومعاينة وتعديل تذكرة الواتساب قبل الإرسال"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline text-[11px]">واتساب</span>
                          </button>

                          {/* Digital Pass Modal */}
                          <button
                            onClick={() => onOpenTicketPassModal(student)}
                            className="bg-slate-800 hover:bg-slate-700 text-amber-400 p-1.5 rounded-lg transition border border-slate-700"
                            title="معاينة التذكرة الرقمية مع QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          {/* Print PDF Receipt */}
                          <button
                            onClick={() =>
                              generateReceiptPDF(
                                {
                                  id: `rc-${student.id}`,
                                  voucherNumber: `RC-${student.ticketCode}`,
                                  type: 'receipt',
                                  personName: student.name,
                                  amount: student.paidAmount,
                                  reason: `حجز تذكرة ${settings.tripName} - أتوبيس ${student.busNumber}`,
                                  paymentMethod: student.paymentMethod,
                                  date: new Date().toISOString().slice(0, 10),
                                  supervisorName: 'إدارة كيان',
                                },
                                settings
                              )
                            }
                            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 p-1.5 rounded-lg transition border border-slate-700"
                            title="تنزيل إيصال PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(student)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg transition border border-slate-700"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-400 p-1.5 rounded-lg transition border border-slate-700"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
              setEditingStudent(null);
            }
          }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto"
        >
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl sm:max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92dvh] sm:max-h-[90vh] shrink-0">
            {/* Modal Header - Sticky */}
            <div className="flex justify-between items-center border-b border-slate-800 p-3.5 sm:p-4 bg-slate-950 shrink-0">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="truncate">{editingStudent ? `تعديل بيانات المشارك: ${editingStudent.name}` : 'إضافة حجز / مشارك جديد'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStudent(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm custom-scrollbar">
                {/* Step 1: Visual Bus & Seat Selector */}
                <BusSeatPicker
                  students={students}
                  selectedBus={formData.busNumber}
                  selectedSeat={formData.seatNumber}
                  editingStudentId={editingStudent?.id}
                  restrictedBus={restrictedBus}
                  onSelectSeat={(busNumber, seatNumber) => {
                    setFormData((prev) => ({
                      ...prev,
                      busNumber,
                      seatNumber,
                    }));
                  }}
                />

              {/* Step 2: Participant Data */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  استكمال بيانات المشارك والتذكرة
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">اسم الطالب / المشارك رباعي *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                      placeholder="مثال: أحمد محمد عبد الله"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">رقم الهاتف (واتساب) *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="01012345678"
                    />
                  </div>

                  {/* Participant Role / Type - Custom Text Input & Toggle */}
                  <div className="col-span-1 sm:col-span-2 bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-slate-200 font-bold text-xs sm:text-sm flex items-center gap-1.5">
                        <span className="text-amber-400">🏷️</span>
                        <span>صفة الحجز (تكتب يدوياً) *</span>
                      </label>
                      
                      {/* Paid vs Free Ticket Toggle Button */}
                      <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              isFreeTicket: false,
                              totalAmount: settings.ticketPrice || 1200,
                              paidAmount: settings.ticketPrice || 1200,
                              paymentStatus: 'paid',
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            !formData.isFreeTicket
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>🎟️ تيكت مدفوع</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              isFreeTicket: true,
                              totalAmount: 0,
                              paidAmount: 0,
                              remainingAmount: 0,
                              paymentStatus: 'paid',
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            formData.isFreeTicket
                              ? 'bg-emerald-500 text-slate-950 shadow-md animate-pulse'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>🎁 تيكت مجاني (0 ج.م VIP)</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* Manual Free-Text Input for Role */}
                      <div>
                        <input
                          type="text"
                          required
                          value={formData.customRole}
                          onChange={(e) => setFormData({ ...formData, customRole: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
                          placeholder="اكتب صفة الحجز هنا (مثال: طالب، رئيس دفعة، مرافق، مشرف...)"
                        />
                      </div>

                      {/* Select Presets */}
                      <div>
                        <select
                          value={formData.participantRole}
                          onChange={(e) => {
                            const newRole = e.target.value as ParticipantRole;
                            let roleTitle = 'طالب';
                            if (newRole === 'companion') roleTitle = 'مرافق';
                            else if (newRole === 'organizer') roleTitle = 'منظم وقائد';
                            else if (newRole === 'photographer') roleTitle = 'مصور ميديا';
                            else if (newRole === 'dj') roleTitle = 'دي جي ورئيس فقرات';
                            else if (newRole === 'supervisor') roleTitle = 'مشرف حافلة';
                            else if (newRole === 'staff') roleTitle = 'طاقم خدمات';

                            setFormData({
                              ...formData,
                              participantRole: newRole,
                              customRole: roleTitle,
                            });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 font-bold rounded-xl px-3 py-2 text-xs sm:text-sm focus:border-amber-500 focus:outline-none"
                        >
                          <option value="student">🎓 طالب / مشترك عادي</option>
                          <option value="companion">👥 مرافق مستقل</option>
                          <option value="organizer">👑 منظم / قائد فريق</option>
                          <option value="photographer">📸 مصور / ميديا</option>
                          <option value="dj">🎧 دي جي / صوتيات</option>
                          <option value="supervisor">🛡️ مشرف حافلة</option>
                          <option value="staff">🛠️ طاقم عمل</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Role Chip Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-400">اختصارات سريعة:</span>
                      {['طالب', 'مرافق', 'رئيس دفعة', 'مشرف حافلة', 'منظم VIP', 'مصور ميديا'].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setFormData({ ...formData, customRole: chip })}
                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition ${
                            formData.customRole === chip
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  </div>



                  {/* Faculty */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الكلية / الدفعة / الجهة</label>
                    <input
                      type="text"
                      value={formData.faculty}
                      onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                      placeholder="مثال: حاسبات ومعلومات - 2026"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">الجنس</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  {/* Confirmed Bus & Seat Display */}
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-400 font-bold block">التخصيص المؤكد:</span>
                      <span className="text-xs font-black text-white">
                        حافلة #{formData.busNumber} • مقعد #{formData.seatNumber || '—'}
                      </span>
                    </div>
                    <span className="text-xs bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black">
                      محدد 🎯
                    </span>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">طريقة الدفع</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as PaymentMethod })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="vodafone_cash">فودافون كاش</option>
                      <option value="cash">كاش / نقدي</option>
                      <option value="instapay">أنستا باي (InstaPay)</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                    </select>
                  </div>

                  {/* Dynamic Trip Addons / Services from Trip Settings */}
                  {(() => {
                    const tripAddons = settings.addons || [];
                    if (tripAddons.length === 0) {
                      return (
                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                          <h5 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2 border-b border-slate-800 pb-2">
                            <span>👕🍔</span>
                            <span>اختيارات التيشيرت والوجبة الغذائية</span>
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Standalone T-Shirt Selection */}
                            <div>
                              <label className="block text-slate-300 font-semibold mb-1 text-xs">مقاس التيشيرت 👕</label>
                              <select
                                value={formData.tshirtSize || 'none'}
                                onChange={(e) => setFormData({ ...formData, tshirtSize: e.target.value as TShirtSize })}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none text-xs sm:text-sm font-bold"
                              >
                                <option value="none">🚫 بدون تيشيرت</option>
                                <option value="S">مقاس S</option>
                                <option value="M">مقاس M</option>
                                <option value="L">مقاس L</option>
                                <option value="XL">مقاس XL</option>
                                <option value="2XL">مقاس 2XL</option>
                                <option value="3XL">مقاس 3XL</option>
                              </select>
                            </div>

                            {/* Standalone Meal Selection */}
                            <div>
                              <label className="block text-slate-300 font-semibold mb-1 text-xs">الوجبة الغذائية 🍔</label>
                              <select
                                value={formData.hasMeal ? (formData.mealOption || 'وجبة سوبر VIP') : 'none'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === 'none') {
                                    setFormData({ ...formData, hasMeal: false, mealOption: '' });
                                  } else {
                                    setFormData({ ...formData, hasMeal: true, mealOption: val });
                                  }
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none text-xs sm:text-sm font-bold"
                              >
                                <option value="none">🚫 بدون وجبة</option>
                                <option value="وجبة سوبر VIP">🍔 وجبة سوبر VIP</option>
                                <option value="وجبة عادية">🍔 وجبة عادية</option>
                                <option value="ساندوتش خفيف">🥪 ساندوتش خفيف</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // Helper to update addons and trigger instant auto-recalculation
                    const updateAddonsAndRecalculate = (
                      nextAddonIds: string[],
                      nextOptions: Record<string, string>,
                      extraUpdates: Partial<typeof formData> = {}
                    ) => {
                      const newTotal = calculateStudentPrice(
                        settings.ticketPrice || 0,
                        formData.isFreeTicket,
                        nextAddonIds,
                        settings.addons
                      );
                      const newPaid = formData.isFreeTicket
                        ? 0
                        : formData.paymentStatus === 'paid'
                        ? newTotal
                        : formData.paymentStatus === 'unpaid'
                        ? 0
                        : Math.min(newTotal, formData.paidAmount);

                      setFormData({
                        ...formData,
                        selectedAddonIds: nextAddonIds,
                        addonOptions: nextOptions,
                        totalAmount: newTotal,
                        paidAmount: newPaid,
                        ...extraUpdates,
                      });
                    };

                    const handleToggleAddon = (addon: TripAddon, defaultOption?: string) => {
                      const currentSelected = formData.selectedAddonIds || [];
                      const isCurrentlySelected = currentSelected.includes(addon.id);
                      let nextSelected: string[];
                      const nextOptions = { ...(formData.addonOptions || {}) };

                      if (isCurrentlySelected) {
                        nextSelected = currentSelected.filter((id) => id !== addon.id);
                        delete nextOptions[addon.id];
                      } else {
                        nextSelected = [...currentSelected, addon.id];
                        if (defaultOption) {
                          nextOptions[addon.id] = defaultOption;
                        } else if (addon.options && addon.options.length > 0) {
                          nextOptions[addon.id] = addon.options[0];
                        }
                      }

                      const extraUpdates: Partial<typeof formData> = {};
                      if (isMealAddon(addon)) {
                        extraUpdates.hasMeal = !isCurrentlySelected;
                        extraUpdates.mealOption = !isCurrentlySelected ? addon.name : '';
                        extraUpdates.mealPrice = Number(addon.price) || 150;
                      }
                      if (isApparelAddon(addon)) {
                        extraUpdates.tshirtSize = !isCurrentlySelected ? ((nextOptions[addon.id] as TShirtSize) || 'L') : 'none';
                      }

                      updateAddonsAndRecalculate(nextSelected, nextOptions, extraUpdates);
                    };

                    const handleSelectOption = (addon: TripAddon, optionVal: string) => {
                      let nextSelected = [...(formData.selectedAddonIds || [])];
                      const nextOptions = { ...(formData.addonOptions || {}) };

                      if (optionVal !== 'none' && optionVal !== '') {
                        if (!nextSelected.includes(addon.id)) {
                          nextSelected.push(addon.id);
                        }
                        nextOptions[addon.id] = optionVal;
                      } else {
                        nextSelected = nextSelected.filter((id) => id !== addon.id);
                        delete nextOptions[addon.id];
                      }

                      const extraUpdates: Partial<typeof formData> = {};
                      if (isMealAddon(addon)) {
                        extraUpdates.hasMeal = optionVal !== 'none' && optionVal !== '';
                        extraUpdates.mealOption = optionVal !== 'none' && optionVal !== '' ? addon.name : '';
                        extraUpdates.mealPrice = Number(addon.price) || 150;
                      }
                      if (isApparelAddon(addon)) {
                        extraUpdates.tshirtSize = optionVal !== 'none' && optionVal !== '' ? (optionVal as TShirtSize) : 'none';
                      }

                      updateAddonsAndRecalculate(nextSelected, nextOptions, extraUpdates);
                    };

                    const handleSelectAllAddons = () => {
                      const allIds = tripAddons.map((a) => a.id);
                      const allOptions: Record<string, string> = {};
                      tripAddons.forEach((a) => {
                        if (a.options && a.options.length > 0) {
                          allOptions[a.id] = a.options[0];
                        } else if (isApparelAddon(a)) {
                          allOptions[a.id] = 'L';
                        }
                      });
                      updateAddonsAndRecalculate(allIds, allOptions, {
                        hasMeal: tripAddons.some((a) => isMealAddon(a)),
                        tshirtSize: 'L',
                      });
                    };

                    const handleDeselectAllAddons = () => {
                      updateAddonsAndRecalculate([], {}, {
                        hasMeal: false,
                        mealOption: '',
                        tshirtSize: 'none',
                      });
                    };

                    return (
                      <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3.5 space-y-3 shadow-md">
                        {/* Header with Fast Controls */}
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <h5 className="font-bold text-white text-xs sm:text-sm">
                              قائمة الإضافات والخدمات المخصصة للرحلة ({tripAddons.length} متاح)
                            </h5>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                              تحديث تلقائي للسعر ⚡
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={handleSelectAllAddons}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 font-bold transition active:scale-95"
                            >
                              تحديد الكل ✓
                            </button>
                            <button
                              type="button"
                              onClick={handleDeselectAllAddons}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 font-bold transition active:scale-95"
                            >
                              إلغاء الكل ✕
                            </button>
                          </div>
                        </div>

                        {/* Grid of Dynamic Addon Controls */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {tripAddons.map((addon) => {
                            const isSelected = (formData.selectedAddonIds || []).includes(addon.id);
                            const isApparel = isApparelAddon(addon);
                            const isMeal = isMealAddon(addon);
                            const currentOption = (formData.addonOptions && formData.addonOptions[addon.id]) || (isApparel && isSelected ? formData.tshirtSize : '');
                            const optionsList = addon.options && addon.options.length > 0
                              ? addon.options
                              : isApparel
                              ? ['S', 'M', 'L', 'XL', '2XL', '3XL']
                              : null;

                            return (
                              <div
                                key={addon.id}
                                className={`p-3 rounded-2xl border transition-all space-y-2 flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-slate-900/90 border-amber-500 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/5'
                                    : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {/* Addon Title & Price Header */}
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                    <span>{isApparel ? '👕' : isMeal ? '🍔' : '⚡'}</span>
                                    <span className="truncate" title={addon.name}>{addon.name}</span>
                                  </label>
                                  <span className="text-[11px] font-black font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-lg shrink-0">
                                    +{addon.price} ج.م
                                  </span>
                                </div>

                                {/* Dynamic Dropdown Selector */}
                                <div>
                                  {optionsList ? (
                                    <select
                                      value={isSelected ? (currentOption || optionsList[0]) : 'none'}
                                      onChange={(e) => handleSelectOption(addon, e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none"
                                    >
                                      <option value="none">🚫 بدون {addon.name} (0 ج.م)</option>
                                      {optionsList.map((opt) => (
                                        <option key={opt} value={opt}>
                                          اختيار: {opt} (+{addon.price} ج.م)
                                        </option>
                                      ))}
                                    </select>
                                  ) : isMeal ? (
                                    <select
                                      value={isSelected ? 'included' : 'none'}
                                      onChange={(e) => handleSelectOption(addon, e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none"
                                    >
                                      <option value="none">🚫 بدون وجبة (0 ج.م)</option>
                                      <option value="included">
                                        🍔 تشمل: {addon.name} (+{addon.price} ج.م)
                                      </option>
                                    </select>
                                  ) : (
                                    <select
                                      value={isSelected ? 'included' : 'none'}
                                      onChange={(e) => handleSelectOption(addon, e.target.value)}
                                      className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-xs font-bold focus:border-amber-500 focus:outline-none"
                                    >
                                      <option value="none">🚫 غير مشمول (0 ج.م)</option>
                                      <option value="included">
                                        ✓ تشمل: {addon.name} (+{addon.price} ج.م)
                                      </option>
                                    </select>
                                  )}
                                </div>

                                {/* Quick Button Option Pills / Toggle Chips */}
                                {optionsList ? (
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSelectOption(addon, 'none')}
                                      className={`text-[9px] px-2 py-0.5 rounded-md border font-bold transition ${
                                        !isSelected
                                          ? 'bg-slate-800 text-slate-300 border-slate-700 font-black'
                                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                      }`}
                                    >
                                      بدون ✕
                                    </button>
                                    {optionsList.map((opt) => {
                                      const isOptActive = isSelected && currentOption === opt;
                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => handleSelectOption(addon, opt)}
                                          className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold transition ${
                                            isOptActive
                                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-sm'
                                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-amber-300'
                                          }`}
                                        >
                                          {opt}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAddon(addon)}
                                      className={`w-full py-1 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 active:scale-95 ${
                                        isSelected
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                                      }`}
                                    >
                                      <span>{isSelected ? '✓ مضافة للحجز' : '+ إضافة للتذكرة'}</span>
                                      <span className="text-[10px] font-mono">({isSelected ? `+${addon.price}` : `+${addon.price} ج.م`})</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Dynamic Pricing Calculation Summary Banner */}
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-gradient-to-r from-amber-950/50 via-slate-950 to-indigo-950/50 border border-amber-500/40 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Base Ticket Price */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
                          <span className="text-[10px] text-slate-400 block font-medium">سعر التذكرة الأساسية:</span>
                          <strong className="text-xs sm:text-sm font-black text-white font-mono">
                            {formData.isFreeTicket ? '0 (مجاني VIP)' : `${settings.ticketPrice || 0} ج.م`}
                          </strong>
                        </div>

                        <span className="text-slate-500 font-bold text-sm">+</span>

                        {/* Addons Total */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            إجمالي الإضافات المختارة:
                          </span>
                          <strong className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                            +{((settings.addons || []).filter((a) => (formData.selectedAddonIds || []).includes(a.id)).reduce((sum, a) => sum + (Number(a.price) || 0), 0))} ج.م
                          </strong>
                        </div>

                        <span className="text-slate-500 font-bold text-sm">=</span>

                        {/* Total Calculated Ticket Amount */}
                        <div className="bg-amber-500 text-slate-950 rounded-xl px-3.5 py-1.5 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50">
                          <span className="text-[10px] font-extrabold block opacity-95">سعر التذكرة الإجمالي النهائي:</span>
                          <strong className="text-sm sm:text-base font-black font-mono">
                            {formData.totalAmount} ج.م
                          </strong>
                        </div>
                      </div>

                      {/* Payment Status Live Breakdown */}
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-emerald-400 font-bold bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">
                          المدفوع: {formData.paidAmount} ج.م
                        </span>
                        <span className={`font-bold px-2.5 py-1 rounded-xl ${
                          formData.totalAmount - formData.paidAmount > 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {formData.totalAmount - formData.paidAmount > 0
                            ? `المتبقي: ${formData.totalAmount - formData.paidAmount} ج.م`
                            : 'خالص بالكامل ✓'}
                        </span>
                      </div>
                    </div>

                    {/* Active Selected Addons Badges Row */}
                    {(formData.selectedAddonIds || []).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/80 text-[10px]">
                        <span className="text-slate-400 font-bold">الإضافات المضمنة في تذكرة الطالب:</span>
                        {(settings.addons || [])
                          .filter((a) => (formData.selectedAddonIds || []).includes(a.id))
                          .map((a) => {
                            const opt = formData.addonOptions && formData.addonOptions[a.id];
                            return (
                              <span
                                key={a.id}
                                className="bg-slate-900 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                              >
                                <span>{a.name}</span>
                                {opt && <span className="text-cyan-300 font-mono font-bold">({opt})</span>}
                                <span className="text-slate-400 font-mono">+{a.price} ج.م</span>
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">حالة السداد</label>
                    <select
                      value={formData.paymentStatus}
                      onChange={(e) => {
                        const status = e.target.value as PaymentStatus;
                        let paid = formData.paidAmount;
                        if (status === 'paid') paid = formData.totalAmount;
                        if (status === 'unpaid') paid = 0;
                        if (status === 'deposit' && (paid >= formData.totalAmount || paid === 0)) paid = Math.min(formData.totalAmount, settings.defaultDeposit ?? 500);

                        setFormData({
                          ...formData,
                          paymentStatus: status,
                          paidAmount: paid,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="paid">مسدد بالكامل ✅</option>
                      <option value="deposit">عربون فقط ⏳</option>
                      <option value="unpaid">غير مدفوع ❌</option>
                    </select>
                  </div>

                  {/* Total Amount */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">إجمالي سعر التذكرة (ج.م)</label>
                    <input
                      type="number"
                      value={formData.totalAmount}
                      onChange={(e) => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">المبلغ المدفوع (ج.م)</label>
                    <input
                      type="number"
                      value={formData.paidAmount}
                      onChange={(e) => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 font-mono focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Extra Fields Section */}
              <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <h5 className="font-bold text-slate-300 text-xs flex items-center gap-2">
                    <span className="text-amber-400">📝</span>
                    <span>بيانات إضافية توثيقية (اختيارية حسب الحاجة)</span>
                  </h5>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                    غير إلزامية
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* National ID */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1">
                      الرقم القومي (اختياري)
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={formData.nationalId}
                      onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="14 رقم للتوثيق"
                    />
                  </div>

                  {/* Emergency Phone */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1">
                      رقم ولي الأمر / الطوارئ (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.emergencyPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:border-amber-500 focus:outline-none"
                      placeholder="010xxxxxxx"
                    />
                  </div>

                  {/* Pickup Point */}
                  <div>
                    <label className="block text-slate-400 text-xs font-medium mb-1">
                      نقطة التجمع / المحطة (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formData.pickupPoint}
                      onChange={(e) => setFormData({ ...formData, pickupPoint: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none"
                      placeholder="مثال: الموقف الجديد / بوابة 1"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 focus:border-amber-500 focus:outline-none"
                  placeholder="أي طلب خاص بالمقعد، السداد، أو التغذية..."
                ></textarea>
              </div>

              {/* Auto Send WhatsApp Checkbox */}
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <label htmlFor="autoWhatsappToggle" className="text-xs font-bold text-emerald-300 flex items-center gap-2 cursor-pointer">
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span>فتح نافذة تذكرة الواتساب وإرسال الرسالة فور الحفظ مباشرة 📲</span>
                </label>
                <input
                  id="autoWhatsappToggle"
                  type="checkbox"
                  checked={autoSendWhatsAppOnSave}
                  onChange={(e) => setAutoSendWhatsAppOnSave(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer rounded"
                />
              </div>

              </div>

              {/* Sticky Footer */}
              <div className="flex justify-between sm:justify-end items-center gap-2 p-3 sm:p-4 bg-slate-950 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl transition text-xs sm:text-sm"
                >
                  إلغاء وخروج
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-6 py-2 rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95 text-xs sm:text-sm"
                >
                  <span>{editingStudent ? 'حفظ التعديلات' : 'تأكيد الحجز والإضافة'}</span>
                  {autoSendWhatsAppOnSave && <span className="text-xs">💬</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Student */}
      {studentToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setStudentToDelete(null);
          }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                تأكيد حذف بيانات الطالب
              </h3>
              <button onClick={() => setStudentToDelete(null)} className="text-slate-400 hover:text-white p-1">✕</button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              هل أنت متأكد من حذف بيانات الطالب <strong className="text-amber-400">{studentToDelete.name}</strong> كود التذكرة: <span className="text-indigo-400 font-mono font-bold">{studentToDelete.ticketCode}</span>؟
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-rose-600/20 transition active:scale-95"
              >
                نعم، حذف الطالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP MESSENGER & TICKET CUSTOMIZER */}
      {isWhatsAppMessengerOpen && whatsAppStudent && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWhatsAppMessengerOpen(false);
          }}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto"
        >
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl max-h-[92dvh] sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col my-auto overflow-hidden shrink-0">
            {/* Header - Sticky */}
            <div className="flex justify-between items-center border-b border-slate-800 p-3.5 sm:p-4 bg-slate-950 shrink-0">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>إرسال تذكرة الحجز عبر الواتساب</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">تذكرة رقمية رسمية مصممة مع إمكانية التحميل والإرسال الفوري</p>
              </div>
              <button
                onClick={() => setIsWhatsAppMessengerOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs custom-scrollbar">

            {/* Recipient Info Bar */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-0.5">اسم الطالب وتذكرة الحجز:</span>
                <strong className="text-white text-sm font-bold flex items-center gap-2">
                  {whatsAppStudent.name}
                  <span className="text-amber-400 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-lg text-xs border border-amber-500/20">
                    {whatsAppStudent.ticketCode}
                  </span>
                </strong>
              </div>

              <div>
                <label className="text-slate-400 block text-[11px] mb-0.5">رقم الواتساب (مصر +20):</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={whatsAppPhone}
                    onChange={(e) => setWhatsAppPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-emerald-300 font-mono font-bold rounded-xl pr-8 pl-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                    placeholder="01012345678"
                  />
                </div>
              </div>
            </div>

            {/* View Tab Switching Bar */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWhatsAppTab('visual_ticket')}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  whatsAppTab === 'visual_ticket'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>🎫 كارد التذكرة المرئي والرسمي (Visual Ticket Pass)</span>
              </button>

              <button
                type="button"
                onClick={() => setWhatsAppTab('text_message')}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  whatsAppTab === 'text_message'
                    ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>💬 نص رسالة الواتساب والتعديل</span>
              </button>
            </div>

            {/* TAB 1: REAL GRAPHICAL DIGITAL TICKET PASS */}
            {whatsAppTab === 'visual_ticket' && (
              <DigitalTicketCard
                student={whatsAppStudent}
                settings={settings}
                onClose={() => setIsWhatsAppMessengerOpen(false)}
              />
            )}

            {/* TAB 2: TEXT MESSAGE CUSTOMIZER */}
            {whatsAppTab === 'text_message' && (
              <div className="space-y-3">
                {/* Template Chooser Buttons */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-bold text-xs">اختر قالب رسالة التذكرة المنسقة:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppTemplate('full_ticket');
                        setWhatsAppMessageText(generateWhatsAppTicketText(whatsAppStudent, settings, 'full_ticket'));
                      }}
                      className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                        whatsAppTemplate === 'full_ticket'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span>🎫 التذكرة الرقمية الكاملة</span>
                      <span className="text-[10px] opacity-80">كود، أتوبيس، مقعد وسداد</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppTemplate('receipt');
                        setWhatsAppMessageText(generateWhatsAppTicketText(whatsAppStudent, settings, 'receipt'));
                      }}
                      className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                        whatsAppTemplate === 'receipt'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span>🧾 إيصال سداد واستلام</span>
                      <span className="text-[10px] opacity-80">تفاصيل المدفوع والمتبقي</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setWhatsAppTemplate('bus_info');
                        setWhatsAppMessageText(generateWhatsAppTicketText(whatsAppStudent, settings, 'bus_info'));
                      }}
                      className={`p-2.5 rounded-xl font-bold border transition text-center flex flex-col items-center gap-1 ${
                        whatsAppTemplate === 'bus_info'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span>🚌 موعد الأتوبيس والتسكين</span>
                      <span className="text-[10px] opacity-80">الأتوبيس والمقعد والتعليمات</span>
                    </button>
                  </div>
                </div>

                {/* Editable Text Area */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <label className="text-slate-300 font-bold flex items-center gap-1">
                      <FileText className="w-4 h-4 text-amber-400" />
                      نص التذكرة والرسالة (مباشرة وقابلة للتعديل الكامل):
                    </label>
                  </div>
                  <textarea
                    rows={9}
                    value={whatsAppMessageText}
                    onChange={(e) => setWhatsAppMessageText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 font-sans leading-relaxed rounded-xl p-3 text-xs focus:border-emerald-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>
            )}
            </div>

            {/* Action Footer - Sticky */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppMessageText);
                  setCopiedState(true);
                  setTimeout(() => setCopiedState(false), 2000);
                }}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                {copiedState ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-amber-400" />}
                <span>{copiedState ? 'تم نسخ النص! ✅' : 'نسخ نص التذكرة 📋'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsWhatsAppMessengerOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  إلغاء وخروج
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendCustomWhatsAppMessage(whatsAppPhone, whatsAppMessageText);
                    setIsWhatsAppMessengerOpen(false);
                  }}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95 text-xs sm:text-sm"
                >
                  <Send className="w-4 h-4" />
                  فتح وتفعيل الواتساب والتذكرة 📲
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
