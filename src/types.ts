export type PaymentStatus = 'paid' | 'deposit' | 'unpaid';
export type PaymentMethod = 'cash' | 'vodafone_cash' | 'instapay' | 'bank_transfer';
export type TShirtSize = 'none' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';
export type Gender = 'male' | 'female';
export type ParticipantRole = 'student' | 'companion' | 'organizer' | 'photographer' | 'dj' | 'supervisor' | 'staff';

export const PARTICIPANT_ROLES_CONFIG: Record<ParticipantRole, {
  label: string;
  badge: string;
  bg: string;
  text: string;
  border: string;
  icon: string;
}> = {
  student: { label: 'طالب / مشترك', badge: 'طالب', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30', icon: '🎓' },
  companion: { label: 'مرافق', badge: 'مرافق', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', icon: '👥' },
  organizer: { label: 'منظم / قائد فريق (Organizer)', badge: 'منظم', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', icon: '👑' },
  photographer: { label: 'مصور / ميديا (Photographer / Drone)', badge: 'مصور / ميديا', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', icon: '📸' },
  dj: { label: 'دي جي / صوتيات (DJ & Sound)', badge: 'دي جي / DJ', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', icon: '🎧' },
  supervisor: { label: 'مشرف حافلة / مشرف دفتري', badge: 'مشرف', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', icon: '🛡️' },
  staff: { label: 'طاقم عمل / خدمات لوجستية', badge: 'طاقم عمل', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40', icon: '🛠️' },
};

export interface Student {
  id: string;
  ticketCode: string; // e.g. KYN-8921
  name: string;
  phone: string;
  faculty: string; // e.g. حاسبات والمعلومات - دفعة 2026
  gender: Gender;
  participantRole?: ParticipantRole; // طالب / مرافق / منظم / مصور / دي جي / مشرف / طاقم عمل
  customRole?: string; // صفة الحجز اليدوية (مثل: طالب، رئيس اتحاد، ضيف VIP، مشرف...)
  isFreeTicket?: boolean; // هل التذكرة مجانية أم مدفوعة
  hasCompanion?: boolean; // هل يوجد مرافق مرتبط بنفس التذكرة
  companionName?: string; // اسم المرافق المرتبط
  companionPhone?: string; // هاتف المرافق المرتبط
  companionEmergencyPhone?: string; // رقم طوارئ المرافق
  companionNationalId?: string; // الرقم القومي للمرافق
  companionSeatNumber?: number; // مقعد المرافق
  companionTShirtSize?: TShirtSize; // مقاس تيشرت المرافق
  companionHasMeal?: boolean; // هل للمرافق وجبة
  companionMealOption?: string; // نوع وجبة المرافق
  companionMealReceived?: boolean; // هل استلم المرافق الوجبة
  companionTshirtReceived?: boolean; // هل استلم المرافق التيشرت
  companionPrice?: number; // سعر/قيمة تذكرة المرافق
  selectedAddonIds?: string[]; // معُرفات الإضافات والخدمات الاختيارية للمشترك
  addonOptions?: Record<string, string>; // تفاصيل/خيارات الإضافات للمشترك (مثل المقاسات أو الخيارات: { [addonId]: 'L' })
  companionSelectedAddonIds?: string[]; // معُرفات الإضافات والخدمات الاختيارية للمرافق
  companionAddonOptions?: Record<string, string>; // تفاصيل/خيارات إضافات المرافق
  busNumber: number; // 1 - 6
  seatNumber?: number; // 1 - 50
  tshirtSize: TShirtSize;
  paymentStatus: PaymentStatus;
  totalAmount: number; // e.g. 1200 EGP
  paidAmount: number; // e.g. 1200 or 500 or 0
  remainingAmount: number;
  paymentMethod: PaymentMethod;
  nationalId?: string; // الرقم القومي (اختياري)
  emergencyPhone?: string; // رقم ولي الأمر / الطوارئ (اختياري)
  pickupPoint?: string; // نقطة التجمع المفضلة / المحطة (اختياري)
  notes?: string;
  checkInDeparture: boolean; // التحرك من التجمع
  checkInReturn: boolean; // التحرك للعودة
  tshirtReceived?: boolean; // استلام التيشرت
  hasMeal?: boolean; // هل تم إضافة وجبة طعام (اختياري)
  mealOption?: string; // نوع الوجبة (اختياري)
  mealPrice?: number; // سعر الوجبة (اختياري)
  mealReceived?: boolean; // هل استلم الوجبة (تأكيد تسليم الوجبة)
  departureTime?: string;
  returnTime?: string;
}

export interface StudentMealInfo {
  hasMeal: boolean;
  mealName: string;
  mealPrice: number;
  mealReceived: boolean;
}

export const isApparelAddon = (addon: { name: string; type?: AddonType }): boolean => {
  if (addon.type === 'apparel') return true;
  if (addon.type === 'meal' || addon.type === 'service') return false;
  const n = (addon.name || '').toLowerCase();
  return (
    n.includes('هودي') ||
    n.includes('هودى') ||
    n.includes('تيشرت') ||
    n.includes('تيشيرت') ||
    n.includes('سويت شيرت') ||
    n.includes('كاب') ||
    n.includes('tshirt') ||
    n.includes('t-shirt') ||
    n.includes('hoodie') ||
    n.includes('sweatshirt')
  );
};

export const isMealAddon = (addon: { name: string; type?: AddonType }): boolean => {
  if (addon.type === 'meal') return true;
  if (addon.type === 'apparel' || addon.type === 'service') return false;
  const n = (addon.name || '').toLowerCase();
  return (
    n.includes('وجبة') ||
    n.includes('وجبه') ||
    n.includes('غداء') ||
    n.includes('عشاء') ||
    n.includes('فطار') ||
    n.includes('إعاشة') ||
    n.includes('اعاشة') ||
    n.includes('ساندوتش') ||
    n.includes('سندوتش') ||
    n.includes('meal') ||
    n.includes('lunch') ||
    n.includes('dinner')
  );
};

export const getStudentMealInfo = (student: Student, settings?: TripSettings): StudentMealInfo => {
  // 1. Check if student has an addon related to meals
  const selectedAddons = (settings?.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));
  const mealAddonFound = selectedAddons.find((a) => {
    const n = a.name.toLowerCase();
    return (
      n.includes('وجبة') ||
      n.includes('غداء') ||
      n.includes('عشاء') ||
      n.includes('تغذية') ||
      n.includes('meal') ||
      n.includes('lunch') ||
      n.includes('dinner')
    );
  });

  // 2. Direct explicit boolean flag or selected meal option
  const hasMeal = Boolean(
    student.hasMeal === true ||
    (student.mealOption && student.mealOption !== 'none' && student.mealOption !== 'بدون' && student.mealOption.trim() !== '') ||
    Boolean(mealAddonFound)
  );

  let mealName = 'بدون وجبة';
  if (hasMeal) {
    if (student.mealOption && student.mealOption !== 'none' && student.mealOption !== 'بدون' && student.mealOption.trim() !== '') {
      mealName = student.mealOption;
    } else if (mealAddonFound) {
      mealName = mealAddonFound.name;
    } else {
      mealName = 'وجبة غداء VIP (دجاج / كفتة)';
    }
  }

  const mealPrice =
    student.mealPrice ||
    (mealAddonFound ? Number(mealAddonFound.price) : 0) ||
    (hasMeal ? (settings?.mealPriceDefault ?? 150) : 0);

  const mealReceived = Boolean(student.mealReceived);

  return {
    hasMeal,
    mealName,
    mealPrice,
    mealReceived,
  };
};

export const getCompanionMealInfo = (student: Student, settings?: TripSettings): StudentMealInfo => {
  const hasMeal = Boolean(
    student.companionHasMeal === true ||
    (student.companionMealOption && student.companionMealOption !== 'none' && student.companionMealOption !== 'بدون' && student.companionMealOption.trim() !== '')
  );

  const mealName = hasMeal
    ? (student.companionMealOption || 'وجبة مرافق VIP')
    : 'بدون وجبة';

  return {
    hasMeal,
    mealName,
    mealPrice: hasMeal ? (settings?.mealPriceDefault ?? 150) : 0,
    mealReceived: Boolean(student.companionMealReceived),
  };
};

export interface DriverInfo {
  busNumber: number;
  driverName: string;
  driverPhone: string;
  busPlateNumber: string;
  supervisorName: string;
  supervisorPhone: string;
  capacity: number; // 50
  notes?: string;
}

export type ExpenseCategory = 
  | 'hotel_resort' // حجز القرية / الفندق
  | 'meals' // الوجبات
  | 'buses' // الأتوبيسات
  | 'party_supplies' // مستلزمات الحفلة (شماريخ، ألوان، أساور، نظارات، فوم) 🥳
  | 'printing' // المطبوعات والرول أب
  | 'tshirts' // التيشرتات والبراندنج
  | 'media_drone' // الميديا والدرون
  | 'dj_entertainment' // الـ DJ والفقرات
  | 'tolls_fees' // كارتات الطرق والرسوم
  | 'beverages' // المشروبات والمياه
  | 'tips_petty' // الإكراميات والمصروفات النثرية
  | 'other'; // أخرى

export interface ExpenseItem {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number; // إجمالي التكلفة
  paidAmount?: number; // العربون / المدفوع للمورد
  remainingAmount?: number; // المتبقي للمورد
  paidTo: string;
  date: string;
  receiptNumber?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: 'fully_paid' | 'deposit' | 'unpaid';
}

export type ContractType = 
  | 'student_rep' // عقد ممثل الدفعة والاتحاد الطلابي
  | 'resort' // عقد القرية السياحية والفندق
  | 'meals' // عقد توريد الوجبات والإعاشة
  | 'bus_company' // عقد أسطول الحافلات السياحية والنقل VIP
  | 'media' // عقد الإنتاج الإعلامي والتصوير والدرون
  | 'dj' // عقد مسارح الصوت والـ DJ والفقرات الفنية
  | 'printing' // عقد مطبعة التيشرتات والبراندنج
  | 'sponsorship' // عقد الرعاية والشراكة التسويقية التجارية
  | 'security' // عقد الحراسة والأمن وإدارة الحشود
  | 'conference'; // عقد تنظيم المؤتمرات والندوات وورش العمل

export type ContractStatus = 'active' | 'draft' | 'under_review' | 'completed' | 'terminated';

export interface ContractData {
  id: string;
  type: ContractType;
  title: string;
  partyName: string; // اسم الطرف الثاني
  partyPhone: string;
  partyNationalId?: string;
  partyRepTitle?: string; // صفة المفوض بالتعاقد (مثال: رئيس مجلس الإدارة / المدير التنفيذي)
  partyAddress?: string; // العنوان أو المقر الرسمي
  partyEmail?: string;
  totalCost: number;
  depositPaid: number;
  remainingBalance: number;
  eventDate: string;
  location: string;
  clauseNotes: string[];
  createdAt: string;
  status?: ContractStatus; // حالة العقد القانونية
  contractNumber?: string; // رقم العقد المسلسل الرسمي e.g. KYN-AGR-2026-089
  currency?: string; // العملة
  firstPartySignature?: string; // التوقيع الرقمي للطرف الأول (Base64)
  secondPartySignature?: string; // التوقيع الرقمي للطرف الثاني (Base64)
  firstPartySignerName?: string; // اسم الموقع عن الطرف الأول
  secondPartySignerName?: string; // اسم الموقع عن الطرف الثاني
  securityHash?: string; // كود التوثيق المشفر
  witness1Name?: string; // الشاهد الأول
  witness2Name?: string; // الشاهد الثاني
  contractTheme?: 'royal_gold' | 'corporate_navy' | 'modern_emerald'; // نمط العقد البصري
  showWatermark?: boolean; // تفعيل العلامة المائية
  showQrCode?: boolean; // تفعيل كود التحقق QR
}

export interface ReceiptVoucher {
  id: string;
  voucherNumber: string; // e.g. RC-2026-001 or PV-2026-001
  type: 'receipt' | 'payment'; // استلام من طالب أو صرف لمورد
  personName: string;
  amount: number;
  amountInWords?: string;
  reason: string;
  paymentMethod: PaymentMethod;
  date: string;
  supervisorName: string;
}

export type LogisticsCategory =
  | 'beverages' // المشروبات والإعاشة 🥤
  | 'party_branding' // مستلزمات الحفلة والبراندنج 🥳
  | 'apparel' // الملابس والهدايا التذكارية 👕
  | 'first_aid' // حقائب الإسعافات والطوارئ 🩺
  | 'tech_sound' // المعدات التقنية والصوتيات 📻
  | 'petty_cash' // العهد النقدية الطارئة 💸
  | 'other'; // مستلزمات أخرى 📦

export interface LogisticsItem {
  id: string;
  name: string;
  category: LogisticsCategory;
  totalQuantity: number;
  consumedQuantity: number;
  unit: string; // كرتونة / علبة / كيس / قطعة / جنيه / جهاز / حقيبة
  assignedTo?: string; // اسم المشرف المسؤول
  assignedBus?: number; // رقم الباص المخصص (1, 2, 3...)
  status: 'good' | 'low' | 'critical';
  estimatedCost?: number; // التكلفة التقديرية للبند
  location?: string; // مكان التخزين (باص 1 / المخزن المركزي / مع المشرف)
  handoverConfirmed?: boolean; // تم تأكيد الاستلام من المشرف
  notes?: string;
}

export type EventCategory = 'party' | 'dj' | 'photo' | 'meals' | 'ceremony' | 'sports' | 'travel' | 'other';

export interface TimelineEvent {
  id: string;
  time: string; // e.g. "03:30 ص"
  title: string;
  location: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTeam: string;
  category?: EventCategory;
  performer?: string; // الفنان / الـ DJ / المصور المسؤول
  isOptionalAddon?: boolean; // فعالية اختيارية بطلب خاص
  costExtra?: number; // تكلفة الفعالية الاختيارية إن وجدت
}

export interface BroadcastNotice {
  id: string;
  sender: string;
  time: string;
  message: string;
  targetGroup: 'all' | 'supervisors' | 'students';
  priority: 'normal' | 'urgent';
}

export type AddonType = 'apparel' | 'meal' | 'service' | 'custom_options';

export interface AddonOptionItem {
  id: string;
  name: string; // e.g. "مقاس S" or "وجبة فراخ مشوية"
  priceOffset?: number; // e.g. 0 or +50 EGP
}

export interface TripAddon {
  id: string;
  name: string;
  price: number;
  type?: AddonType; // apparel (هودي/تيشرت), meal (وجبة), service (خدمة), custom_options (خيارات مخصصة)
  options?: string[]; // e.g. ['S', 'M', 'L', 'XL', '2XL', '3XL'] or ['دجاج مشوي', 'ميكس جريل']
  description?: string;
  isDefaultSelected?: boolean;
}

export interface TripSettings {
  tripName: string;
  tripDate: string;
  destination: string;
  totalSeats: number; // e.g. 300 (6 buses * 50)
  ticketPrice: number; // e.g. 800 EGP (سعر التذكرة الأساسية بدون إضافات)
  defaultDeposit?: number; // e.g. 500 EGP (العربون الافتراضي المبدئي)
  companionFullPrice?: number; // e.g. 1200 EGP (سعر تذكرة المرافق الشاملة)
  companionBasePrice?: number; // e.g. 800 EGP (سعر تذكرة المرافق الأساسية)
  mealPriceDefault?: number; // e.g. 150 EGP (سعر الوجبة المنفصلة)
  addons?: TripAddon[]; // قائمة الإضافات والخدمات الاختيارية المخصصة للرحلة
  driveLink: string;
  whatsappGroupLink: string;
  supportPhone: string;
  assemblyTime?: string;
  assemblyLocation?: string;
  companyPhone?: string;
  companyNameAr?: string;
  companyNameEn?: string;
  companyLicenseNo?: string;
  companySealColor?: string;
}

export type TripStatus = 'planning' | 'active' | 'completed' | 'archived';

export interface TripData {
  students: Student[];
  drivers: DriverInfo[];
  expenses: ExpenseItem[];
  contracts: ContractData[];
  receipts: ReceiptVoucher[];
  logistics: LogisticsItem[];
  timeline: TimelineEvent[];
  notices: BroadcastNotice[];
  settings: TripSettings;
}

export interface Trip extends TripData {
  id: string;
  status: TripStatus;
  createdAt: string;
}

export type TreasuryTransferType = 
  | 'trip_final_profit'  // تحويل صافي أرباح الرحلة بعد الانتهاء
  | 'partial_cash_out'    // تحويل نقدية جزئي أثناء الرحلة
  | 'direct_deposit'      // إيداع مباشر بالخزنة
  | 'direct_withdrawal';  // سحب/مصروف مباشر من الخزنة

export interface TreasuryTransfer {
  id: string;
  referenceNumber?: string; // e.g. TRF-2026-001
  tripId?: string;
  tripName: string;
  amount: number;
  type: TreasuryTransferType;
  date: string;
  time: string;
  transferredBy: string; // اسم المسؤول عن التحويل
  notes: string;
  timestamp?: string;
}

export interface CompanyTreasury {
  currentBalance: number;
  transfers: TreasuryTransfer[];
}

export type AppUserRole = 'admin' | 'field_supervisor' | 'pr_ticketing';

export interface StaffPermissions {
  canScanQR: boolean; // ماسح الباركود
  canCheckInOut: boolean; // كشف صعود ونزول الحافلة
  canDeliverItems: boolean; // تسليم التيشرت والوجبات
  canRegisterStudents: boolean; // تسجيل وحجز طلاب جدد
  canIssueTickets: boolean; // إصدار ومشاركة التذاكر والواتساب
  canManageBuses: boolean; // توزيع المقاعد والحافلات
  canViewFinancials: boolean; // رؤية تقارير الأرباح والمصروفات
  canAccessTreasury: boolean; // السحب والإيداع في الخزنة
  canExportPrint: boolean; // طباعة الكشوفات والعقود
  canEditSettings: boolean; // تعديل أسعار وإعدادات الرحلة
}

export const DEFAULT_ROLE_PERMISSIONS: Record<AppUserRole, StaffPermissions> = {
  admin: {
    canScanQR: true,
    canCheckInOut: true,
    canDeliverItems: true,
    canRegisterStudents: true,
    canIssueTickets: true,
    canManageBuses: true,
    canViewFinancials: true,
    canAccessTreasury: true,
    canExportPrint: true,
    canEditSettings: true,
  },
  field_supervisor: {
    canScanQR: true,
    canCheckInOut: true,
    canDeliverItems: true,
    canRegisterStudents: false,
    canIssueTickets: false,
    canManageBuses: false,
    canViewFinancials: false,
    canAccessTreasury: false,
    canExportPrint: false,
    canEditSettings: false,
  },
  pr_ticketing: {
    canScanQR: true,
    canCheckInOut: false,
    canDeliverItems: false,
    canRegisterStudents: true,
    canIssueTickets: true,
    canManageBuses: false,
    canViewFinancials: false,
    canAccessTreasury: false,
    canExportPrint: true,
    canEditSettings: false,
  },
};

export interface StaffAccount {
  id: string;
  name: string;
  pin: string; // 4-6 digit passcode
  role: AppUserRole;
  permissions?: StaffPermissions; // Custom multi-option granular permissions
  assignedBus?: number; // 0 = all buses, 1-6 = specific bus
  allowedTripIds?: string[]; // Empty or undefined = all trips; or array of specific trip IDs
  phone?: string;
  notes?: string;
  status?: 'active' | 'suspended'; // Active or Suspended
  suspensionReason?: string; // Reason shown to employee if suspended
}

export interface ActiveUserSession {
  role: AppUserRole;
  name: string;
  pin: string;
  permissions: StaffPermissions;
  assignedBus?: number;
  allowedTripIds?: string[];
}

export const isStaffAllowedBus = (
  busNumber: number,
  session?: { role?: AppUserRole; assignedBus?: number } | null
): boolean => {
  if (!session) return true;
  if (session.role === 'admin') return true;
  if (!session.assignedBus || session.assignedBus === 0) return true;
  return session.assignedBus === busNumber;
};

export type ActivityActionType =
  | 'login'
  | 'login_blocked'
  | 'checkin_departure'
  | 'checkin_return'
  | 'deliver_tshirt'
  | 'tshirt_delivery'
  | 'deliver_meal'
  | 'meal_delivery'
  | 'seat_change'
  | 'seat_transfer'
  | 'bus_transfer'
  | 'student_add'
  | 'student_register'
  | 'student_update'
  | 'student_delete'
  | 'expense_add'
  | 'expense_update'
  | 'expense_delete'
  | 'treasury_transfer'
  | 'treasury_deposit'
  | 'treasury_withdraw'
  | 'contract_add'
  | 'receipt_add'
  | 'logistics_update'
  | 'staff_update'
  | 'trip_create'
  | 'trip_switch'
  | 'trip_status_change'
  | 'trip_delete'
  | 'broadcast_notice'
  | 'system';

export interface ActivityLog {
  id: string;
  timestamp: string | number;
  dateString: string; // e.g. "2026-08-28" or "الجمعة 28 أغسطس 2026"
  timeString: string; // e.g. "04:30 م"
  dayName?: string;
  userName: string;
  userRole: AppUserRole;
  userPin?: string;
  actionType: ActivityActionType;
  actionTitle: string;
  details: string;
  targetId?: string; // studentId, tripId, etc.
  targetName?: string;
  tripId?: string;
  tripName?: string;
  busNumber?: number;
  metadata?: Record<string, unknown>;
}
