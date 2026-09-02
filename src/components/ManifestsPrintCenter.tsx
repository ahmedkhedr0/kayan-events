import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Search,
  Bus,
  Shirt,
  UtensilsCrossed,
  DollarSign,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Phone,
  User,
  Users,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw,
  AlertCircle,
  Clock,
  Eye,
  Check,
  Factory,
  ChefHat,
  ChevronDown,
  LayoutGrid,
  ListFilter,
  QrCode,
  MapPin,
} from 'lucide-react';
import {
  Student,
  TripSettings,
  DriverInfo,
  TShirtSize,
  PARTICIPANT_ROLES_CONFIG,
  getStudentMealInfo,
} from '../types';
import {
  generateMasterAttendanceDeliveryPDF,
  generateBusManifestPDF,
  generateTShirtFactoryPDF,
  generateTShirtDistributionPDF,
  generateMealKitchenPDF,
  generateMealDistributionPDF,
  generateFinancialManifestPDF,
  generateStudentsComprehensiveReportPDF,
} from '../services/pdfGenerator';
import kayanLogo from '../assets/images/kayan_logo_1785354886047.jpg';

export type ManifestType =
  | 'full_students'
  | 'bus_boarding'
  | 'tshirts'
  | 'meals'
  | 'financials'
  | 'master';

export type TShirtSubMode = 'distribution' | 'factory';
export type MealSubMode = 'distribution' | 'kitchen';

interface ManifestsPrintCenterProps {
  students: Student[];
  settings: TripSettings;
  drivers?: DriverInfo[];
  onToggleCheckInDeparture?: (studentId: string) => void;
  onToggleCheckInReturn?: (studentId: string) => void;
  onToggleTShirtReceived?: (studentId: string) => void;
  onToggleMealReceived?: (studentId: string) => void;
  onUpdateStudent?: (updatedStudent: Student) => void;
}

export const ManifestsPrintCenter: React.FC<ManifestsPrintCenterProps> = ({
  students,
  settings,
  drivers = [],
  onToggleCheckInDeparture,
  onToggleCheckInReturn,
  onToggleTShirtReceived,
  onToggleMealReceived,
  onUpdateStudent,
}) => {
  // Active Manifest Type
  const [activeManifest, setActiveManifest] = useState<ManifestType>('bus_boarding');

  // Sub-modes for T-Shirts & Meals
  const [tshirtSubMode, setTshirtSubMode] = useState<TShirtSubMode>('distribution');
  const [mealSubMode, setMealSubMode] = useState<MealSubMode>('distribution');

  // Bus Filter: 'all' or bus number as string '1', '2', etc.
  const [selectedBusFilter, setSelectedBusFilter] = useState<string>('all');

  // Search Query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sort Order: 'seat_asc' | 'name_asc' | 'ticket_asc' | 'bus_asc'
  const [sortBy, setSortBy] = useState<'seat_asc' | 'name_asc' | 'ticket_asc' | 'bus_asc'>('seat_asc');

  // Interactive Live Check-off Mode
  const [isLiveEditMode, setIsLiveEditMode] = useState<boolean>(true);

  // Mobile View Mode: 'cards' (responsive zero-scroll cards) | 'table' (full table view)
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'cards' | 'table'>('cards');

  // PDF Export Loading State
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [exportMessage, setExportMessage] = useState<string>('');
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);

  // List of unique bus numbers
  const busNumbers = useMemo(() => {
    const set = new Set<number>();
    students.forEach((s) => {
      if (s.busNumber) set.add(Number(s.busNumber));
    });
    // Add configured buses from settings if available
    const totalBuses = settings.busCount || 1;
    for (let i = 1; i <= totalBuses; i++) {
      set.add(i);
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [students, settings.busCount]);

  // Current selected bus driver info
  const currentBusDriver = useMemo(() => {
    if (selectedBusFilter === 'all') return null;
    const busNum = Number(selectedBusFilter);
    return drivers.find((d) => d.busNumber === busNum);
  }, [selectedBusFilter, drivers]);

  // Filtered and Sorted Students
  const filteredStudents = useMemo(() => {
    let list = [...students];

    // 1. Base filter for specific manifest requirements
    if (activeManifest === 'tshirts') {
      list = list.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
    } else if (activeManifest === 'meals') {
      list = list.filter((s) => getStudentMealInfo(s, settings).hasMeal);
    }

    // 2. Bus Filter
    if (selectedBusFilter !== 'all') {
      const busNum = Number(selectedBusFilter);
      list = list.filter((s) => Number(s.busNumber) === busNum);
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.phone.includes(q) ||
          s.ticketCode.toLowerCase().includes(q) ||
          (s.seatNumber && String(s.seatNumber).includes(q)) ||
          (s.faculty && s.faculty.toLowerCase().includes(q)) ||
          (s.pickupPoint && s.pickupPoint.toLowerCase().includes(q))
      );
    }

    // 4. Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'departure_checked') {
        list = list.filter((s) => s.checkInDeparture);
      } else if (statusFilter === 'departure_not_checked') {
        list = list.filter((s) => !s.checkInDeparture);
      } else if (statusFilter === 'tshirt_received') {
        list = list.filter((s) => s.tshirtReceived);
      } else if (statusFilter === 'tshirt_pending') {
        list = list.filter((s) => !s.tshirtReceived);
      } else if (statusFilter === 'meal_received') {
        list = list.filter((s) => s.mealReceived);
      } else if (statusFilter === 'meal_pending') {
        list = list.filter((s) => !s.mealReceived);
      } else if (statusFilter === 'unpaid_only') {
        list = list.filter((s) => (s.remainingAmount || 0) > 0);
      } else if (statusFilter === 'free_tickets') {
        list = list.filter((s) => s.isFreeTicket);
      }
    }

    // 5. Sort
    list.sort((a, b) => {
      if (sortBy === 'seat_asc') {
        if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
        return (a.seatNumber || 999) - (b.seatNumber || 999);
      }
      if (sortBy === 'bus_asc') {
        if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
        return (a.seatNumber || 999) - (b.seatNumber || 999);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name, 'ar');
      }
      if (sortBy === 'ticket_asc') {
        return a.ticketCode.localeCompare(b.ticketCode);
      }
      return 0;
    });

    return list;
  }, [students, selectedBusFilter, searchQuery, statusFilter, sortBy, activeManifest, settings]);

  // Overall Global KPI Calculations
  const stats = useMemo(() => {
    const totalCount = students.length;
    const departureCount = students.filter((s) => s.checkInDeparture).length;
    const returnCount = students.filter((s) => s.checkInReturn).length;

    // T-shirts
    const tshirtStudents = students.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
    const tshirtNeeded = tshirtStudents.length;
    const tshirtDelivered = tshirtStudents.filter((s) => s.tshirtReceived).length;

    // T-shirt size distribution
    const sizeDistribution: Record<string, number> = {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      '2XL': 0,
      '3XL': 0,
    };
    tshirtStudents.forEach((s) => {
      if (s.tshirtSize && sizeDistribution[s.tshirtSize] !== undefined) {
        sizeDistribution[s.tshirtSize]++;
      }
    });

    // Meals
    const mealStudents = students.filter((s) => getStudentMealInfo(s, settings).hasMeal);
    const mealsTotal = mealStudents.length;
    const mealsDelivered = mealStudents.filter((s) => s.mealReceived).length;

    // Meal types breakdown
    const mealTypesCount: Record<string, number> = {};
    mealStudents.forEach((s) => {
      const info = getStudentMealInfo(s, settings);
      const name = info.mealName || 'وجبة أساسية';
      mealTypesCount[name] = (mealTypesCount[name] || 0) + 1;
    });

    // Financials
    const totalOutstanding = students.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);
    const totalCollected = students.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
    const unpaidStudentsCount = students.filter((s) => (s.remainingAmount || 0) > 0).length;

    return {
      totalCount,
      departureCount,
      returnCount,
      tshirtNeeded,
      tshirtDelivered,
      sizeDistribution,
      mealsTotal,
      mealsDelivered,
      mealTypesCount,
      totalOutstanding,
      totalCollected,
      unpaidStudentsCount,
    };
  }, [students, settings]);

  // Handle Clean A4 Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export Specialized PDF
  const handleExportPDF = async (forcedType?: string) => {
    setIsExportingPDF(true);
    const busParam = selectedBusFilter === 'all' ? 'all' : Number(selectedBusFilter);
    const typeToExport = forcedType || activeManifest;

    try {
      let success = false;
      if (typeToExport === 'full_students') {
        setExportMessage('جاري إنشاء كشف وسجل الطلاب والمشاركين الشامل A4...');
        success = await generateStudentsComprehensiveReportPDF(
          filteredStudents,
          settings,
          'كشف وسجل الطلاب والمشاركين الشامل',
          selectedBusFilter === 'all' ? 'كافة الحافلات' : `حافلة رقم #${selectedBusFilter}`
        );
      } else if (typeToExport === 'bus_boarding') {
        setExportMessage('جاري إنشاء كشف صعود الحافلات الرسمي A4...');
        success = await generateBusManifestPDF(busParam, students, currentBusDriver || undefined, settings);
      } else if (typeToExport === 'tshirts' || typeToExport === 'tshirt_distribution') {
        if (tshirtSubMode === 'factory' || forcedType === 'tshirt_factory') {
          setExportMessage('جاري إنشاء أمر توريد المصنع وحصر المقاسات A4...');
          success = await generateTShirtFactoryPDF(students, settings, busParam);
        } else {
          setExportMessage('جاري إنشاء كشف تسليم وتوزيع التيشرتات A4...');
          success = await generateTShirtDistributionPDF(students, settings, busParam);
        }
      } else if (typeToExport === 'tshirt_factory') {
        setExportMessage('جاري إنشاء أمر توريد المصنع وحصر المقاسات A4...');
        success = await generateTShirtFactoryPDF(students, settings, busParam);
      } else if (typeToExport === 'meals' || typeToExport === 'meal_distribution') {
        if (mealSubMode === 'kitchen' || forcedType === 'meal_kitchen') {
          setExportMessage('جاري إنشاء أمر تجهيز وتوريد المطعم A4...');
          success = await generateMealKitchenPDF(students, settings, busParam);
        } else {
          setExportMessage('جاري إنشاء كشف تسليم الوجبات الميداني A4...');
          success = await generateMealDistributionPDF(students, settings, busParam);
        }
      } else if (typeToExport === 'meal_kitchen') {
        setExportMessage('جاري إنشاء أمر تجهيز وتوريد المطعم A4...');
        success = await generateMealKitchenPDF(students, settings, busParam);
      } else if (typeToExport === 'financials') {
        setExportMessage('جاري إنشاء كشف المتابعة والتحصيل المالي A4...');
        success = await generateFinancialManifestPDF(students, settings, busParam);
      } else {
        setExportMessage('جاري إنشاء الكشف الشامل الماستر A4...');
        success = await generateMasterAttendanceDeliveryPDF(students, settings, 'all');
      }

      if (success !== false) {
        setPdfSuccessToast('تم تجهيز وبدء تحميل ملف PDF بنجاح! تم الحفظ في التنزيلات 📥');
        setTimeout(() => setPdfSuccessToast(null), 6000);
      }
    } catch (e) {
      console.error('PDF error', e);
      alert('حدث خطأ أثناء إعداد ملف الـ PDF. يرجى المحاولة مرة أخرى أو استخدام خيار الطباعة المباشرة A4.');
    } finally {
      setIsExportingPDF(false);
      setExportMessage('');
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (activeManifest === 'full_students') {
      headers = [
        'م',
        'كود التذكرة',
        'اسم الطالب / المشترك',
        'رقم الهاتف',
        'هاتف الطوارئ',
        'الكلية / التخصص',
        'الصفة',
        'الحافلة',
        'المقعد',
        'مقاس التيشرت',
        'حالة استلام التيشرت',
        'نوع الوجبة',
        'حالة استلام الوجبة',
        'إجمالي المبلغ',
        'المبلغ المسدد',
        'المتبقي',
        'حضور الذهاب',
        'حضور العودة',
        'نقطة التجمع',
        'الملاحظات',
      ];
      rows = filteredStudents.map((s, idx) => {
        const mealInfo = getStudentMealInfo(s, settings);
        return [
          idx + 1,
          s.ticketCode,
          s.name,
          s.phone,
          s.emergencyPhone || '—',
          s.faculty || '—',
          s.customRole || s.participantRole || 'طالب',
          s.busNumber,
          s.seatNumber || '—',
          s.tshirtSize === 'none' ? 'بدون' : s.tshirtSize,
          s.tshirtReceived ? 'تم الاستلام' : 'لم يستلم',
          mealInfo.hasMeal ? mealInfo.mealName : 'بدون وجبة',
          s.mealReceived ? 'تم الاستلام' : 'لم يستلم',
          s.isFreeTicket ? 0 : s.totalAmount,
          s.isFreeTicket ? 0 : s.paidAmount,
          s.isFreeTicket ? 0 : s.remainingAmount,
          s.checkInDeparture ? 'حضر' : 'لم يحضر',
          s.checkInReturn ? 'حضر' : 'لم يحضر',
          s.pickupPoint || '—',
          s.notes || '',
        ];
      });
    } else if (activeManifest === 'bus_boarding') {
      headers = ['م', 'كود التذكرة', 'الاسم', 'رقم الهاتف', 'الحافلة', 'المقعد', 'نقطة التجمع', 'صعود الذهاب', 'صعود العودة', 'ملاحظات'];
      rows = filteredStudents.map((s, idx) => [
        idx + 1,
        s.ticketCode,
        s.name,
        s.phone,
        s.busNumber,
        s.seatNumber || '—',
        s.pickupPoint || '—',
        s.checkInDeparture ? 'نعم' : 'لا',
        s.checkInReturn ? 'نعم' : 'لا',
        s.notes || '',
      ]);
    } else if (activeManifest === 'tshirts') {
      if (tshirtSubMode === 'factory') {
        headers = ['م', 'الحافلة', 'المقعد', 'كود التذكرة', 'الاسم المطلوب للطباعة', 'الكلية', 'المقاس', 'تفاصيل التكت والملاحظات'];
        rows = filteredStudents.map((s, idx) => [
          idx + 1,
          `باص #${s.busNumber}`,
          s.seatNumber || '—',
          s.ticketCode,
          s.name,
          s.faculty || '—',
          s.tshirtSize,
          s.notes || s.pickupPoint || 'طباعة الاسم والشعار الرسمي',
        ]);
      } else {
        headers = ['م', 'كود التذكرة', 'الاسم', 'الهاتف', 'الحافلة', 'المقعد', 'مقاس التيشرت', 'حالة الاستلام', 'ملاحظات'];
        rows = filteredStudents.map((s, idx) => [
          idx + 1,
          s.ticketCode,
          s.name,
          s.phone,
          s.busNumber,
          s.seatNumber || '—',
          s.tshirtSize,
          s.tshirtReceived ? 'تم الاستلام' : 'قيد الانتظار',
          s.notes || '',
        ]);
      }
    } else if (activeManifest === 'meals') {
      if (mealSubMode === 'kitchen') {
        headers = ['م', 'الحافلة', 'المقعد', 'كود التذكرة', 'اسم المشارك', 'نوع الوجبة والتفاصيل'];
        rows = filteredStudents.map((s, idx) => {
          const mealInfo = getStudentMealInfo(s, settings);
          return [
            idx + 1,
            `باص #${s.busNumber}`,
            s.seatNumber || '—',
            s.ticketCode,
            s.name,
            mealInfo.mealName,
          ];
        });
      } else {
        headers = ['م', 'كود التذكرة', 'الاسم', 'الهاتف', 'الحافلة', 'المقعد', 'نوع الوجبة', 'حالة الاستلام', 'ملاحظات'];
        rows = filteredStudents.map((s, idx) => {
          const mealInfo = getStudentMealInfo(s, settings);
          return [
            idx + 1,
            s.ticketCode,
            s.name,
            s.phone,
            s.busNumber,
            s.seatNumber || '—',
            mealInfo.mealName,
            s.mealReceived ? 'تم الاستلام' : 'قيد الانتظار',
            s.notes || '',
          ];
        });
      }
    } else if (activeManifest === 'financials') {
      headers = ['م', 'كود التذكرة', 'الاسم', 'رقم الهاتف', 'الحافلة', 'المقعد', 'إجمالي الحساب', 'المسدد مسبقاً', 'المتبقي نقداً', 'حالة السداد'];
      rows = filteredStudents.map((s, idx) => [
        idx + 1,
        s.ticketCode,
        s.name,
        s.phone,
        s.busNumber,
        s.seatNumber || '—',
        s.isFreeTicket ? 0 : s.totalAmount,
        s.isFreeTicket ? 0 : s.paidAmount,
        s.isFreeTicket ? 0 : s.remainingAmount,
        s.isFreeTicket ? 'مجاني' : s.paymentStatus === 'paid' ? 'خالص' : 'متبقي',
      ]);
    } else {
      // Master
      headers = ['م', 'كود التذكرة', 'الاسم', 'رقم الهاتف', 'الحافلة', 'المقعد', 'التيشرت', 'الوجبة', 'صعود الذهاب', 'المتبقي'];
      rows = filteredStudents.map((s, idx) => {
        const mealInfo = getStudentMealInfo(s, settings);
        return [
          idx + 1,
          s.ticketCode,
          s.name,
          s.phone,
          s.busNumber,
          s.seatNumber || '—',
          s.tshirtSize,
          mealInfo.hasMeal ? mealInfo.mealName : 'بدون وجبة',
          s.checkInDeparture ? 'نعم' : 'لا',
          s.remainingAmount,
        ];
      });
    }

    const csvContent =
      '\uFEFF' +
      [
        `كشف ${getManifestTitle()} - رحلة: ${settings.tripName}`,
        `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')}`,
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `KAYAN_${activeManifest}_${selectedBusFilter === 'all' ? 'All_Buses' : `Bus_${selectedBusFilter}`}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Manifest Full Title
  function getManifestTitle(): string {
    switch (activeManifest) {
      case 'full_students':
        return 'كشف وبيانات الطلاب والمشاركين الكامل (Full Students Roster Manifest)';
      case 'bus_boarding':
        return 'كشف تسكين وصعود الحافلات والتجمع الميداني (Bus Boarding Manifest)';
      case 'tshirts':
        return tshirtSubMode === 'factory'
          ? 'أمر توريد وطباعة التيشرتات للمصنع وحصر المقاسات (T-Shirt Factory Order)'
          : 'كشف تسليم وتوزيع التيشرتات الميداني والتوقيعات (T-Shirt Handover Manifest)';
      case 'meals':
        return mealSubMode === 'kitchen'
          ? 'كشف أمر المطعم وتجهيز الوجبات والإعاشة (Kitchen Catering Order)'
          : 'كشف تسليم وتوزيع الوجبات الغذائية الميداني (Meal Distribution Manifest)';
      case 'financials':
        return 'كشف التحصيل والمتابعة المالية والمتبقيات النقدية (Financials & Collections)';
      case 'master':
        return 'الكشف الشامل الماستر لجميع الخدمات والتسليمات (Master Manifest)';
    }
  }

  return (
    <div className="space-y-5 text-right dir-rtl font-sans pb-16">
      
      {/* 1. TOP HEADER & MANIFEST TYPE SELECTOR (Hidden on print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black shrink-0">
              <ClipboardList className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white">
                  مركز الكشوفات والطباعة الميدانية المعتمدة
                </h1>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                  جاهز للطباعة A4 🖨️
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                توليد كشوفات الحافلات، مصنع وتوزيع التيشرتات، مطبخ وتوزيع الوجبات، والمتابعة المالية بضغطة زر مع خانات التوقيع المعتمدة.
              </p>
            </div>
          </div>

          {/* Action Bar (Print, PDF, CSV, Live Mode) */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-600/25 active:scale-95 cursor-pointer"
              title="طباعة ورقية مباشرة A4 عالية النقاء بدون خلفيات داكنة"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة ورقية A4 🖨️</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportPDF()}
              disabled={isExportingPDF}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="توليد ملف PDF عالي الدقة A4"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>{isExportingPDF ? (exportMessage || 'جاري تجهيز PDF...') : 'تحميل PDF 📄'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="تصدير شيت إكسيل CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsLiveEditMode(!isLiveEditMode)}
              className={`px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isLiveEditMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="تفعيل إمكانية التأشير المباشر من الشاشة لحفظ الاستلام والصعود"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>وضع التأشير الحي: {isLiveEditMode ? 'مفعل ⚡' : 'للقراءة فقط'}</span>
            </button>
          </div>
        </div>

        {/* PDF Download Toast Notification */}
        {pdfSuccessToast && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-emerald-200 flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/40 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold">{pdfSuccessToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setPdfSuccessToast(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs font-black px-2 py-1 rounded bg-emerald-900/50 hover:bg-emerald-800/50 transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Manifest Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-800/80">
          {[
            { id: 'full_students', label: '1. كشف الطلاب الكامل', icon: Users, count: `${stats.totalCount} طالب` },
            { id: 'bus_boarding', label: '2. كشف ركاب الحافلات', icon: Bus, count: `${stats.departureCount}/${stats.totalCount}` },
            { id: 'tshirts', label: '3. كشوفات التيشيرتات', icon: Shirt, count: `${stats.tshirtDelivered}/${stats.tshirtNeeded}` },
            { id: 'meals', label: '4. كشوفات الوجبات', icon: UtensilsCrossed, count: `${stats.mealsDelivered}/${stats.mealsTotal}` },
            { id: 'financials', label: '5. التحصيل والمتبقيات', icon: DollarSign, count: `${stats.totalOutstanding.toLocaleString()} ج.م` },
            { id: 'master', label: '6. الكشف الشامل الماستر', icon: Layers, count: `${stats.totalCount} طالب` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeManifest === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveManifest(tab.id as ManifestType);
                  setStatusFilter('all');
                }}
                className={`p-3 rounded-xl text-right transition border flex flex-col justify-between gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-amber-500/80 shadow-lg shadow-indigo-950/50 ring-1 ring-amber-500/50'
                    : 'bg-slate-950/60 hover:bg-slate-800/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                    {tab.count}
                  </span>
                </div>
                <span className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sub-Tabs for T-Shirts & Meals if active */}
        {activeManifest === 'tshirts' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 bg-purple-950/20 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-300">نوع كشف التيشيرتات المطلوب:</span>
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-purple-800/50">
                <button
                  type="button"
                  onClick={() => setTshirtSubMode('distribution')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    tshirtSubMode === 'distribution'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <Shirt className="w-3.5 h-3.5" />
                  <span>كشف توزيع واستلام الطلاب الميداني 👕✍️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTshirtSubMode('factory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    tshirtSubMode === 'factory'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  <Factory className="w-3.5 h-3.5" />
                  <span>كشف أمر المصنع وحصر المقاسات والتكت 🏭🧵</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportPDF('tshirt_factory')}
                className="bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-700/60 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                title="تحميل كشف المصنع فورا"
              >
                <Factory className="w-3.5 h-3.5 text-purple-300" />
                <span>PDF أمر المصنع</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF('tshirt_distribution')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                title="تحميل كشف التوزيع فورا"
              >
                <Shirt className="w-3.5 h-3.5 text-amber-300" />
                <span>PDF كشف التوزيع</span>
              </button>
            </div>
          </div>
        )}

        {activeManifest === 'meals' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 bg-amber-950/20 p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-300">نوع كشف الوجبات المطلوب:</span>
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-amber-800/50">
                <button
                  type="button"
                  onClick={() => setMealSubMode('distribution')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    mealSubMode === 'distribution'
                      ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-amber-300 hover:text-white'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  <span>كشف توزيع واستلام الطلاب الميداني 🍔✍️</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMealSubMode('kitchen')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    mealSubMode === 'kitchen'
                      ? 'bg-amber-600 text-slate-950 font-black shadow-md'
                      : 'text-amber-300 hover:text-white'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>كشف أمر تجهيز وتوريد المطعم والمطبخ 👨‍🍳🍱</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportPDF('meal_kitchen')}
                className="bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-700/60 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                title="تحميل كشف المطعم فورا"
              >
                <ChefHat className="w-3.5 h-3.5 text-amber-300" />
                <span>PDF أمر المطعم</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF('meal_distribution')}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition"
                title="تحميل كشف استلام الوجبات فورا"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>PDF كشف التوزيع</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. FILTER & TOOLBAR BAR (Hidden on print) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 print:hidden shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Bus Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
            <span className="text-xs text-slate-400 font-bold shrink-0 ml-1">تصفية الحافلة:</span>
            <button
              type="button"
              onClick={() => setSelectedBusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                selectedBusFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              جميع الحافلات ({students.length})
            </button>

            {busNumbers.map((busNum) => {
              const busCount = students.filter((s) => Number(s.busNumber) === busNum).length;
              return (
                <button
                  key={busNum}
                  type="button"
                  onClick={() => setSelectedBusFilter(String(busNum))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedBusFilter === String(busNum)
                      ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30 ring-1 ring-amber-400'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  أتوبيس #{busNum} ({busCount})
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، الهاتف، كود التذكرة، المقعد..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Status Badges & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-bold">حالة الكشف:</span>
            
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              الكل ({filteredStudents.length})
            </button>

            {activeManifest === 'full_students' && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('departure_checked')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'departure_checked' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  ✅ حضروا الذهاب ({students.filter((s) => s.checkInDeparture && (selectedBusFilter === 'all' || String(s.busNumber) === selectedBusFilter)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('unpaid_only')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'unpaid_only' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-rose-300'
                  }`}
                >
                  💵 عليهم متبقي ({stats.unpaidStudentsCount})
                </button>
              </>
            )}

            {activeManifest === 'bus_boarding' && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('departure_checked')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'departure_checked' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  ✅ صعدوا الذهاب ({students.filter((s) => s.checkInDeparture && (selectedBusFilter === 'all' || String(s.busNumber) === selectedBusFilter)).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('departure_not_checked')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'departure_not_checked' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-rose-300'
                  }`}
                >
                  ⏳ لم يصعدوا بعد ({students.filter((s) => !s.checkInDeparture && (selectedBusFilter === 'all' || String(s.busNumber) === selectedBusFilter)).length})
                </button>
              </>
            )}

            {activeManifest === 'tshirts' && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('tshirt_pending')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'tshirt_pending' ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-purple-300'
                  }`}
                >
                  ⏳ بانتظار التسليم ({stats.tshirtNeeded - stats.tshirtDelivered})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('tshirt_received')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'tshirt_received' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  ✅ تم تسليمهم ({stats.tshirtDelivered})
                </button>
              </>
            )}

            {activeManifest === 'meals' && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('meal_pending')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'meal_pending' ? 'bg-amber-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-amber-300'
                  }`}
                >
                  ⏳ بانتظار الوجبة ({stats.mealsTotal - stats.mealsDelivered})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('meal_received')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    statusFilter === 'meal_received' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-emerald-300'
                  }`}
                >
                  ✅ استلموا الوجبة ({stats.mealsDelivered})
                </button>
              </>
            )}

            {activeManifest === 'financials' && (
              <button
                type="button"
                onClick={() => setStatusFilter('unpaid_only')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  statusFilter === 'unpaid_only' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-rose-300'
                }`}
              >
                💵 عليهم مبالغ متبقية فقط ({stats.unpaidStudentsCount})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 text-[11px]">ترتيب حسب:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            >
              <option value="seat_asc">رقم الحافلة ثم المقعد (1 ⬅ 50)</option>
              <option value="name_asc">اسم المشترك أبجدياً</option>
              <option value="ticket_asc">كود التذكرة</option>
              <option value="bus_asc">رقم الحافلة</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. MANIFEST SPECIFIC SUMMARY MATRIX / STATS BANNER */}
      {activeManifest === 'tshirts' && (
        <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl p-4 shadow-lg print:border-slate-800 print:bg-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-purple-400 print:text-purple-700" />
              <h3 className="text-sm font-extrabold text-white print:text-black">
                {tshirtSubMode === 'factory'
                  ? '📊 جدول الحصر الإحصائي لمقاسات التيشرتات المطلوب إنتاجها للمصنع:'
                  : 'إجمالي تفقيط مقاسات وحالات تسليم التيشرتات في هذا الكشف:'}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-purple-300 print:text-slate-800">
              إجمالي التيشرتات: {stats.tshirtNeeded} قطعة
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            {Object.entries(stats.sizeDistribution).map(([size, count]) => (
              <div
                key={size}
                className="bg-slate-900/90 print:bg-white p-2 rounded-xl border border-purple-800/40 print:border-slate-300"
              >
                <span className="text-[11px] text-purple-300 print:text-slate-600 block font-bold">مقاس {size}</span>
                <strong className="text-white print:text-black text-sm font-mono font-black">{count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeManifest === 'meals' && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-2xl p-4 shadow-lg print:border-slate-800 print:bg-slate-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-400 print:text-amber-700" />
              <h3 className="text-sm font-extrabold text-white print:text-black">
                {mealSubMode === 'kitchen'
                  ? '📊 جدول الحصر والكميات المطلوب تجهيزها من المطعم المورد:'
                  : 'إجمالي الوجبات الغذائية وحالة التوزيع الميداني:'}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-amber-300 print:text-slate-800">
              إجمالي الوجبات المطلوبة: {stats.mealsTotal} وجبة
            </span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(stats.mealTypesCount).map(([mealType, count]) => (
              <div
                key={mealType}
                className="bg-slate-900/90 print:bg-white px-3 py-2 rounded-xl border border-amber-800/40 print:border-slate-300 flex items-center gap-2"
              >
                <span className="text-amber-300 print:text-slate-700 font-bold">{mealType}:</span>
                <strong className="text-white print:text-black text-sm font-mono font-black">{count}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeManifest === 'bus_boarding' && currentBusDriver && (
        <div className="bg-indigo-950/40 border border-indigo-800/60 rounded-2xl p-3.5 shadow-lg flex flex-wrap justify-between items-center gap-3 print:bg-slate-50 print:border-slate-400">
          <div className="flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-amber-400 print:text-indigo-800" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white print:text-black">
                بيانات حافلة وسائق أتوبيس #{selectedBusFilter}
              </h4>
              <p className="text-[11px] text-indigo-300 print:text-slate-700">
                السائق: <strong className="text-white print:text-black">{currentBusDriver.driverName || 'غير مسجل'}</strong> • هاتف: <span className="font-mono">{currentBusDriver.driverPhone || '—'}</span> • لوحة: <span className="font-mono">{currentBusDriver.busPlate || '—'}</span>
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-indigo-200 print:text-slate-900 flex items-center gap-2">
            <span>نسبة صعود الذهاب:</span>
            <strong className="bg-emerald-950 print:bg-emerald-100 text-emerald-300 print:text-emerald-900 border border-emerald-500/40 px-2 py-0.5 rounded-lg">
              {stats.departureCount} / {stats.totalCount} (
              {stats.totalCount > 0 ? Math.round((stats.departureCount / stats.totalCount) * 100) : 0}%)
            </strong>
          </div>
        </div>
      )}

      {/* 4. OFFICIAL PRINTABLE DOCUMENT (Target of Print / A4 Layout) */}
      <div className="printable-sheet bg-slate-900 border border-slate-800 print:border-none rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 print:p-0 print:m-0 print:bg-white print:text-black print:shadow-none">
        
        {/* Official Letterhead (KAYAN Header) */}
        <div className="border-b-2 border-slate-800 print:border-black pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <img
              src={kayanLogo}
              alt="KAYAN Events"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-slate-700 print:border-black shrink-0"
            />
            <div>
              <h2 className="text-sm sm:text-lg font-black text-white print:text-black leading-tight">
                {settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-400 print:text-slate-800 font-bold mt-0.5">
                {getManifestTitle()}
              </p>
              <p className="text-[10px] text-slate-400 print:text-slate-600 mt-0.5">
                الرحلة: <strong className="text-white print:text-black">{settings.tripName}</strong> | الوجهة: <strong className="text-white print:text-black">{settings.destination || 'الساحل / دهب'}</strong>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-left text-xs font-mono shrink-0 gap-2">
            <div className="bg-slate-950 print:bg-white border border-slate-800 print:border-black px-2.5 py-1 rounded-lg text-center">
              <span className="text-[9px] text-slate-400 print:text-slate-700 block">نطاق الكشف:</span>
              <strong className="text-amber-400 print:text-black font-bold text-xs">
                {selectedBusFilter === 'all' ? 'كافة الحافلات' : `حافلة #${selectedBusFilter}`}
              </strong>
            </div>
            <span className="text-[9px] text-slate-400 print:text-slate-600 block">
              تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}
            </span>
          </div>
        </div>

        {/* Mobile View Toggle and Indicator */}
        <div className="sm:hidden flex items-center justify-between bg-slate-950/90 border border-slate-800 p-2 rounded-xl text-xs print:hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-amber-400 font-bold">طريقة العرض:</span>
            <span className="text-[10px] text-slate-400">
              {mobileDisplayMode === 'cards' ? 'كروت سريعة (بدون سكرول)' : 'جدول الكشف الكامل'}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setMobileDisplayMode('cards')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                mobileDisplayMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3 h-3" />
              <span>كروت سريعة</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileDisplayMode('table')}
              className={`px-2 py-1 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
                mobileDisplayMode === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>جدول</span>
            </button>
          </div>
        </div>

        {/* Mobile Card List (Zero Horizontal Scroll!) */}
        {mobileDisplayMode === 'cards' && (
          <div className="sm:hidden space-y-3 print:hidden">
            {filteredStudents.length === 0 ? (
              <div className="text-center py-10 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 text-xs">
                لا توجد بيانات مطابقة لخيارات الفلترة المحددة.
              </div>
            ) : (
              filteredStudents.map((student, idx) => {
                const mealInfo = getStudentMealInfo(student, settings);
                const hasTshirt = Boolean(
                  student.tshirtSize &&
                  student.tshirtSize !== 'none' &&
                  student.tshirtSize !== 'None' &&
                  student.tshirtSize !== 'بدون' &&
                  student.tshirtSize !== '-'
                );

                return (
                  <div
                    key={student.id}
                    className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-md transition"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
                          حافلة #{student.busNumber}
                        </span>
                        <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold text-[11px]">
                          {student.seatNumber ? `مقعد #${student.seatNumber}` : 'بدون مقعد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
                        <span className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-bold border border-slate-800">
                          {student.ticketCode}
                        </span>
                        <span>#{idx + 1}</span>
                      </div>
                    </div>

                    {/* Student details */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-black text-white">{student.name}</h4>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                              student.gender === 'male'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                            }`}
                          >
                            {student.gender === 'male' ? 'ذكر' : 'أنثى'}
                          </span>
                          {(student.customRole || (student.participantRole && student.participantRole !== 'student')) && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold flex items-center gap-0.5 border ${
                                PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.bg || 'bg-amber-500/20'
                              } ${PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.text || 'text-amber-400'} ${
                                PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.border || 'border-amber-500/40'
                              }`}
                            >
                              <span>{PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.icon || '🎫'}</span>
                              <span>{student.customRole || PARTICIPANT_ROLES_CONFIG[student.participantRole || 'student']?.badge}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <a href={`tel:${student.phone}`} className="text-amber-400 hover:underline font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{student.phone}</span>
                          </a>
                          {student.faculty && <span>• {student.faculty}</span>}
                        </div>

                        {student.pickupPoint && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>نقطة التجمع: <strong className="text-slate-300">{student.pickupPoint}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Manifest-specific Direct Action Controls */}
                    {activeManifest === 'bus_boarding' && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                            student.checkInDeparture
                              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {student.checkInDeparture ? '✅ صعد الذهاب' : '🔲 صعود الذهاب'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 ${
                            student.checkInReturn
                              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {student.checkInReturn ? '✅ صعد العودة' : '🔲 صعود العودة'}
                        </button>
                      </div>
                    )}

                    {activeManifest === 'full_students' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          {hasTshirt ? (
                            <span className="bg-purple-950/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-md font-bold">
                              👕 تيشرت {student.tshirtSize} ({student.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'})
                            </span>
                          ) : (
                            <span className="bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                              بدون تيشيرت
                            </span>
                          )}

                          {mealInfo.hasMeal ? (
                            <span className="bg-amber-950/60 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-md font-bold">
                              🍔 {mealInfo.mealName} ({student.mealReceived ? '✅ استلم' : '🔲 لم يستلم'})
                            </span>
                          ) : (
                            <span className="bg-slate-900 border border-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                              بدون وجبة
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-md font-bold ${
                              student.isFreeTicket
                                ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                                : student.remainingAmount > 0
                                ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                                : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            {student.isFreeTicket
                              ? 'مجاني 🎁'
                              : student.remainingAmount > 0
                              ? `متبقي: ${student.remainingAmount} ج.م`
                              : 'مسدد بالكامل ✅'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                              student.checkInDeparture
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            {student.checkInDeparture ? '✅ حضر الذهاب' : '🔲 حضور الذهاب'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                            className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                              student.checkInReturn
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            {student.checkInReturn ? '✅ حضر العودة' : '🔲 حضور العودة'}
                          </button>
                        </div>
                      </div>
                    )}

                    {activeManifest === 'tshirts' && (
                      <div className="pt-1">
                        {hasTshirt ? (
                          <button
                            type="button"
                            onClick={() => onToggleTShirtReceived && onToggleTShirtReceived(student.id)}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                              student.tshirtReceived
                                ? 'bg-purple-950 border-purple-500 text-purple-300'
                                : 'bg-slate-900 border-purple-500/40 text-purple-300 hover:border-purple-500'
                            }`}
                          >
                            <span>👕 مقاس: <strong>{student.tshirtSize}</strong></span>
                            <span>{student.tshirtReceived ? '✅ تم التسليم بنجاح' : '🔲 اضغط لتأكيد التسليم'}</span>
                          </button>
                        ) : (
                          <div className="text-center py-2 text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800 font-medium">
                            بدون تيشيرت
                          </div>
                        )}
                      </div>
                    )}

                    {activeManifest === 'meals' && (
                      <div className="pt-1">
                        {mealInfo.hasMeal ? (
                          <button
                            type="button"
                            onClick={() => onToggleMealReceived && onToggleMealReceived(student.id)}
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 cursor-pointer ${
                              student.mealReceived
                                ? 'bg-amber-950 border-amber-500 text-amber-300'
                                : 'bg-slate-900 border-amber-500/40 text-amber-300 hover:border-amber-500'
                            }`}
                          >
                            <span>🍔 <strong>{mealInfo.mealName}</strong></span>
                            <span>{student.mealReceived ? '✅ استلم الوجبة' : '🔲 اضغط لتأكيد استلام الوجبة'}</span>
                          </button>
                        ) : (
                          <div className="text-center py-2 text-xs text-slate-500 bg-slate-900/60 rounded-xl border border-slate-800 font-medium">
                            بدون وجبة
                          </div>
                        )}
                      </div>
                    )}

                    {activeManifest === 'financials' && (
                      <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between items-center text-slate-400">
                          <span>إجمالي الحساب:</span>
                          <span className="text-white font-bold">{student.totalAmount} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>المسدد:</span>
                          <span className="font-bold">{student.paidAmount} ج.م</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-400 border-t border-slate-800 pt-1">
                          <span>المتبقي للتحصيل:</span>
                          <strong className="font-bold">{student.remainingAmount} ج.م</strong>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Manifest Table Container (Desktop / Print / Optional Mobile Table) */}
        <div className={`${mobileDisplayMode === 'cards' ? 'hidden sm:block' : 'block'} print:block overflow-x-auto custom-scrollbar -mx-2 sm:mx-0 p-1`}>
          <table className="w-full min-w-[800px] text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 print:bg-slate-200 text-slate-300 print:text-black border-y-2 border-slate-800 print:border-black font-bold text-[11px]">
                <th className="p-2 text-center w-8">م</th>
                <th className="p-2 text-center w-16">الحافلة</th>
                <th className="p-2 text-center w-14">المقعد</th>
                <th className="p-2 text-center w-20">كود التذكرة</th>
                <th className="p-2">اسم المشترك / المستلم</th>

                {/* Specific Columns based on active manifest and submodes */}
                {activeManifest === 'full_students' && (
                  <>
                    <th className="p-2 text-center">رقم الهاتف</th>
                    <th className="p-2 text-center">الكلية / الصفة</th>
                    <th className="p-2 text-center">هاتف الطوارئ</th>
                    <th className="p-2 text-center w-20">التيشرت 👕</th>
                    <th className="p-2 text-center w-28">الوجبة 🍔</th>
                    <th className="p-2 text-center w-28">الموقف المالي</th>
                    <th className="p-2 text-center w-14">الذهاب</th>
                    <th className="p-2 text-center w-14">العودة</th>
                    <th className="p-2 text-center w-28">التوقيع / ملاحظات</th>
                  </>
                )}

                {activeManifest === 'bus_boarding' && (
                  <>
                    <th className="p-2 text-center">رقم الهاتف</th>
                    <th className="p-2 text-center">نقطة التجمع</th>
                    <th className="p-2 text-center w-24">صعود الذهاب 🔲</th>
                    <th className="p-2 text-center w-24">صعود العودة 🔲</th>
                    <th className="p-2 text-center w-28">توقيع المشرف</th>
                  </>
                )}

                {activeManifest === 'tshirts' && tshirtSubMode === 'factory' && (
                  <>
                    <th className="p-2 text-center">الكلية / الدفعة</th>
                    <th className="p-2 text-center w-24 bg-purple-950/60 print:bg-purple-100 text-purple-300 print:text-black font-black">المقاس المطلوب</th>
                    <th className="p-2">تفاصيل التكت والملاحظات</th>
                    <th className="p-2 text-center w-24">فحص الجودة 🔲</th>
                    <th className="p-2 text-center w-24">التغليف والتجهيز 🔲</th>
                  </>
                )}

                {activeManifest === 'tshirts' && tshirtSubMode === 'distribution' && (
                  <>
                    <th className="p-2 text-center">الهاتف</th>
                    <th className="p-2 text-center w-20 bg-purple-950/60 print:bg-purple-100 text-purple-300 print:text-black font-black">المقاس</th>
                    <th className="p-2 text-center w-28">تأكيد الاستلام 🔲</th>
                    <th className="p-2 text-center w-36">توقيع المستلم بالقلم ✍️</th>
                    <th className="p-2 text-center w-28">ملاحظات</th>
                  </>
                )}

                {activeManifest === 'meals' && mealSubMode === 'kitchen' && (
                  <>
                    <th className="p-2 bg-amber-950/60 print:bg-amber-100 text-amber-300 print:text-black font-black">نوع الوجبة والتفاصيل</th>
                    <th className="p-2 text-center w-24">التجهيز بالمطبخ 🔲</th>
                    <th className="p-2 text-center w-24">التسليم للشاحن 🔲</th>
                  </>
                )}

                {activeManifest === 'meals' && mealSubMode === 'distribution' && (
                  <>
                    <th className="p-2 text-center">الهاتف</th>
                    <th className="p-2 bg-amber-950/60 print:bg-amber-100 text-amber-300 print:text-black font-black">نوع الوجبة</th>
                    <th className="p-2 text-center w-28">تأكيد الاستلام 🔲</th>
                    <th className="p-2 text-center w-36">توقيع المستلم بالقلم ✍️</th>
                    <th className="p-2 text-center w-28">ملاحظات</th>
                  </>
                )}

                {activeManifest === 'financials' && (
                  <>
                    <th className="p-2 text-center">رقم الهاتف</th>
                    <th className="p-2 text-center">إجمالي الحساب</th>
                    <th className="p-2 text-center text-emerald-400 print:text-black">المسدد</th>
                    <th className="p-2 text-center font-black text-rose-400 print:text-black">المتبقي نقداً</th>
                    <th className="p-2 text-center w-28">المحصل فعلياً</th>
                    <th className="p-2 text-center w-32">توقيع المستلم ✍️</th>
                  </>
                )}

                {activeManifest === 'master' && (
                  <>
                    <th className="p-2 text-center">التيشرت</th>
                    <th className="p-2">الوجبة</th>
                    <th className="p-2 text-center">الذهاب</th>
                    <th className="p-2 text-center">المتبقي</th>
                    <th className="p-2 text-center w-28">توقيع المشترك</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 print:divide-slate-400 text-slate-200 print:text-black">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 print:text-slate-800">
                    لا توجد بيانات مطابقة لخيارات الفلترة المحددة.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const mealInfo = getStudentMealInfo(student, settings);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-800/30 print:hover:bg-transparent transition"
                    >
                      <td className="p-2 text-center font-mono text-slate-500 print:text-black font-bold">
                        {idx + 1}
                      </td>
                      <td className="p-2 text-center font-mono font-bold">
                        <span className="bg-slate-950 print:bg-transparent text-indigo-300 print:text-black px-1.5 py-0.5 rounded border border-indigo-500/20 print:border-none">
                          #{student.busNumber}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono font-bold">
                        <span className="bg-slate-950 print:bg-transparent text-amber-400 print:text-black px-1.5 py-0.5 rounded border border-amber-500/20 print:border-none">
                          {student.seatNumber ? `#${student.seatNumber}` : '—'}
                        </span>
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-amber-400 print:text-black">
                        {student.ticketCode}
                      </td>
                      <td className="p-2">
                        <strong className="text-white print:text-black font-bold block text-[11px] sm:text-xs">
                          {student.name}
                        </strong>
                        <span className="text-[10px] text-slate-400 print:text-slate-700">
                          {student.faculty || 'مشترك'} {student.isFreeTicket && '• 🎁 VIP مجاني'}
                        </span>
                      </td>

                      {/* FULL STUDENTS MANIFEST SPECIFIC */}
                      {activeManifest === 'full_students' && (
                        <>
                          <td className="p-2 text-center font-mono text-[11px]">
                            {student.phone}
                          </td>
                          <td className="p-2 text-center text-[10px] text-slate-300 print:text-black">
                            <div>{student.faculty || '—'}</div>
                            <span className="text-[9px] text-indigo-400 print:text-slate-800 font-bold">{student.customRole || student.participantRole || 'طالب'}</span>
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-400 print:text-black">
                            {student.emergencyPhone || '—'}
                          </td>
                          <td className="p-2 text-center">
                            <span className="font-mono font-bold text-xs bg-purple-950/60 print:bg-slate-100 text-purple-300 print:text-black px-1.5 py-0.5 rounded border border-purple-500/30 print:border-none">
                              {student.tshirtSize === 'none' ? 'بدون' : student.tshirtSize}
                            </span>
                            <span className="block text-[9px] mt-0.5 text-slate-400 print:text-slate-700">
                              {student.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'}
                            </span>
                          </td>
                          <td className="p-2 text-center text-[10px]">
                            {mealInfo.hasMeal ? (
                              <div>
                                <span className="font-bold text-amber-300 print:text-black block">{mealInfo.mealName}</span>
                                <span className="text-[9px] text-slate-400 print:text-slate-700">{student.mealReceived ? '✅ استلم' : '🔲 لم يستلم'}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 print:text-slate-400 font-mono">بدون</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {student.isFreeTicket ? (
                              <span className="text-emerald-400 print:text-black font-bold">مجاني 🎁</span>
                            ) : student.remainingAmount > 0 ? (
                              <span className="bg-rose-950/80 print:bg-slate-100 text-rose-300 print:text-black px-1.5 py-0.5 rounded border border-rose-500/40 print:border-black font-bold">
                                متبقي {student.remainingAmount} ج.م
                              </span>
                            ) : (
                              <span className="text-emerald-400 print:text-black font-bold">مسدد بالكامل ✅</span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                  student.checkInDeparture
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-slate-700 text-slate-400'
                                }`}
                              >
                                {student.checkInDeparture ? '✅' : '🔲'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.checkInDeparture ? '✅' : '🔲'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition ${
                                  student.checkInReturn
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-slate-700 text-slate-400'
                                }`}
                              >
                                {student.checkInReturn ? '✅' : '🔲'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.checkInReturn ? '✅' : '🔲'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400 text-[10px]">
                            {student.notes || '........................'}
                          </td>
                        </>
                      )}

                      {/* BUS BOARDING MANIFEST SPECIFIC */}
                      {activeManifest === 'bus_boarding' && (
                        <>
                          <td className="p-2 text-center font-mono text-[11px]">
                            {student.phone}
                          </td>
                          <td className="p-2 text-center text-[10px]">
                            {student.pickupPoint || 'التجمع الرئيسي'}
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleCheckInDeparture && onToggleCheckInDeparture(student.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto cursor-pointer print:border-none ${
                                  student.checkInDeparture
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                {student.checkInDeparture ? '✅ صعد' : '🔲 لم يصعد'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.checkInDeparture ? '[ ✔ ] صعد' : '[   ]'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleCheckInReturn && onToggleCheckInReturn(student.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto cursor-pointer print:border-none ${
                                  student.checkInReturn
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                {student.checkInReturn ? '✅ صعد' : '🔲 لم يصعد'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.checkInReturn ? '[ ✔ ] صعد' : '[   ]'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            ........................
                          </td>
                        </>
                      )}

                      {/* T-SHIRTS MANIFEST - FACTORY MODE */}
                      {activeManifest === 'tshirts' && tshirtSubMode === 'factory' && (
                        <>
                          <td className="p-2 text-center text-[10px] text-slate-400 print:text-black">
                            {student.faculty || '—'}
                          </td>
                          <td className="p-2 text-center font-black">
                            <span className="bg-purple-950/80 print:bg-slate-100 text-purple-300 print:text-black px-2.5 py-0.5 rounded border border-purple-500/40 print:border-black font-mono text-xs">
                              {student.tshirtSize}
                            </span>
                          </td>
                          <td className="p-2 text-[10px] text-slate-300 print:text-black">
                            {student.notes || student.pickupPoint || 'طباعة الاسم والشعار الرسمي'}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 print:text-slate-800">
                            [   ]
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 print:text-slate-800">
                            [   ]
                          </td>
                        </>
                      )}

                      {/* T-SHIRTS MANIFEST - DISTRIBUTION MODE */}
                      {activeManifest === 'tshirts' && tshirtSubMode === 'distribution' && (
                        <>
                          <td className="p-2 text-center font-mono text-[11px]">
                            {student.phone}
                          </td>
                          <td className="p-2 text-center font-black">
                            <span className="bg-purple-950/80 print:bg-slate-100 text-purple-300 print:text-black px-2 py-0.5 rounded border border-purple-500/40 print:border-black font-mono text-xs">
                              {student.tshirtSize === 'none' ? 'بدون' : student.tshirtSize}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleTShirtReceived && onToggleTShirtReceived(student.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto cursor-pointer print:border-none ${
                                  student.tshirtReceived
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                {student.tshirtReceived ? '✅ تم التسليم' : '🔲 بالانتظار'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.tshirtReceived ? '[ ✔ ] استلم' : '[   ]'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            ........................
                          </td>
                          <td className="p-2 text-center text-[10px] text-slate-400 print:text-black">
                            {student.notes || '—'}
                          </td>
                        </>
                      )}

                      {/* MEALS MANIFEST - KITCHEN MODE */}
                      {activeManifest === 'meals' && mealSubMode === 'kitchen' && (
                        <>
                          <td className="p-2">
                            <span className="bg-amber-950/40 print:bg-transparent text-amber-300 print:text-black px-2 py-0.5 rounded border border-amber-500/30 print:border-none font-bold block text-[11px]">
                              🍔 {mealInfo.mealName}
                            </span>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 print:text-slate-800">
                            [   ]
                          </td>
                          <td className="p-2 text-center font-mono text-slate-500 print:text-slate-800">
                            [   ]
                          </td>
                        </>
                      )}

                      {/* MEALS MANIFEST - DISTRIBUTION MODE */}
                      {activeManifest === 'meals' && mealSubMode === 'distribution' && (
                        <>
                          <td className="p-2 text-center font-mono text-[11px]">
                            {student.phone}
                          </td>
                          <td className="p-2">
                            <span className="bg-amber-950/40 print:bg-transparent text-amber-300 print:text-black px-2 py-0.5 rounded border border-amber-500/30 print:border-none font-bold block text-[11px]">
                              🍔 {mealInfo.mealName}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            {isLiveEditMode ? (
                              <button
                                type="button"
                                onClick={() => onToggleMealReceived && onToggleMealReceived(student.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto cursor-pointer print:border-none ${
                                  student.mealReceived
                                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 print:text-black'
                                    : 'bg-slate-950 border-amber-500/40 text-amber-400 hover:border-amber-500'
                                }`}
                              >
                                {student.mealReceived ? '✅ استلم الوجبة' : '🔲 بالانتظار'}
                              </button>
                            ) : (
                              <span className="font-mono text-center block">
                                {student.mealReceived ? '[ ✔ ] استلم' : '[   ]'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            ........................
                          </td>
                          <td className="p-2 text-center text-[10px] text-slate-400 print:text-black">
                            {student.notes || '—'}
                          </td>
                        </>
                      )}

                      {/* FINANCIALS MANIFEST SPECIFIC */}
                      {activeManifest === 'financials' && (
                        <>
                          <td className="p-2 text-center font-mono text-[11px]">
                            {student.phone}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-300 print:text-black">
                            {student.isFreeTicket ? '0 (مجاني)' : `${student.totalAmount} ج.م`}
                          </td>
                          <td className="p-2 text-center font-mono text-emerald-400 print:text-black">
                            {student.isFreeTicket ? '0' : `${student.paidAmount} ج.م`}
                          </td>
                          <td className="p-2 text-center font-mono font-black">
                            {student.isFreeTicket || student.remainingAmount === 0 ? (
                              <span className="text-emerald-400 print:text-black font-bold">خالص ✅</span>
                            ) : (
                              <span className="bg-rose-950/80 print:bg-slate-100 text-rose-300 print:text-black px-2 py-0.5 rounded border border-rose-500/40 print:border-black font-bold">
                                {student.remainingAmount} ج.م
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            [ ............ ج.م ]
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            ........................
                          </td>
                        </>
                      )}

                      {/* MASTER MANIFEST SPECIFIC */}
                      {activeManifest === 'master' && (
                        <>
                          <td className="p-2 text-center font-mono text-xs">
                            {student.tshirtSize} {student.tshirtReceived ? '✅' : '🔲'}
                          </td>
                          <td className="p-2 text-[10px]">
                            {mealInfo.hasMeal ? `${mealInfo.mealName.slice(0, 14)} ${student.mealReceived ? '✅' : '🔲'}` : 'بدون'}
                          </td>
                          <td className="p-2 text-center">
                            {student.checkInDeparture ? '✅' : '🔲'}
                          </td>
                          <td className="p-2 text-center font-mono font-bold">
                            {student.remainingAmount > 0 ? (
                              <span className="text-rose-400 print:text-black">{student.remainingAmount} ج.م</span>
                            ) : (
                              <span className="text-emerald-400 print:text-black">خالص</span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 print:text-slate-400">
                            ........................
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. OFFICIAL PRINT SIGNATURE FOOTER */}
        <div className="pt-6 border-t-2 border-slate-800 print:border-black grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-center print:text-black">
          <div className="space-y-4 border border-slate-800 print:border-slate-400 p-3 rounded-xl">
            <span className="font-bold text-slate-400 print:text-black block">مشرف الحافلة / النشاط</span>
            <div className="h-6 font-mono text-slate-600 print:text-slate-400">........................................</div>
            <span className="text-[10px] text-slate-500 print:text-slate-700 block">التوقيع والاسم</span>
          </div>

          <div className="space-y-4 border border-slate-800 print:border-slate-400 p-3 rounded-xl">
            <span className="font-bold text-slate-400 print:text-black block">مسؤول الإعاشة واللوجستيات</span>
            <div className="h-6 font-mono text-slate-600 print:text-slate-400">........................................</div>
            <span className="text-[10px] text-slate-500 print:text-slate-700 block">التوقيع والتأكيد</span>
          </div>

          <div className="space-y-4 border border-slate-800 print:border-slate-400 p-3 rounded-xl">
            <span className="font-bold text-slate-400 print:text-black block">اعتماد مدير العمليات وخاتم الشركة</span>
            <div className="h-6 font-mono text-slate-600 print:text-slate-400">........................................</div>
            <span className="text-[10px] text-slate-500 print:text-slate-700 block">خاتم شركة كيان (KAYAN)</span>
          </div>
        </div>

        {/* Print Timestamp line */}
        <div className="text-center text-[10px] text-slate-500 print:text-slate-700 pt-2 border-t border-slate-800/40 print:border-slate-300">
          كشف رسمي صادر ومعتمد من منظومة شركة كيان لإدارة الرحلات والفعاليات • رقم الوثيقة: KYN-DOC-{Date.now().toString().slice(-6)}
        </div>
      </div>
    </div>
  );
};
