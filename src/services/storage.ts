import {
  Student,
  DriverInfo,
  ExpenseItem,
  ContractData,
  ReceiptVoucher,
  LogisticsItem,
  TimelineEvent,
  BroadcastNotice,
  TripSettings,
  Trip,
  CompanyTreasury,
  TreasuryTransfer,
} from '../types';

import {
  initialStudents,
  initialDrivers,
  initialExpenses,
  initialContracts,
  initialReceipts,
  initialLogistics,
  initialTimeline,
  initialNotices,
  initialTripSettings,
} from '../data/initialData';

const KEYS = {
  TRIPS: 'kayan_trips_clean_v1',
  ACTIVE_TRIP_ID: 'kayan_active_trip_id_clean_v1',
  TREASURY: 'kayan_treasury_clean_v1',
  STAFF_ACCOUNTS: 'kayan_staff_accounts_clean_v1',
  ACTIVE_USER_SESSION: 'kayan_user_session_clean_v1',
  ACTIVITY_LOGS: 'kayan_activity_logs_clean_v1',
  LEGACY_STUDENTS: 'kayan_students_v1',
};

// Automatic cleanup of legacy mock/dummy data from previous versions
try {
  const legacyKeys = ['kayan_trips_v2', 'kayan_trips_v1', 'kayan_treasury_v1', 'kayan_activity_logs_v1', 'kayan_modified_seats'];
  legacyKeys.forEach((k) => localStorage.removeItem(k));
} catch {}

// Initial default staff accounts
export const initialStaffAccounts: import('../types').StaffAccount[] = [
  {
    id: 'staff-admin-1',
    name: 'المدير العام (الأدمن)',
    pin: '0000',
    role: 'admin',
    assignedBus: 0,
    permissions: {
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
    notes: 'وصول كامل لكافة الخزن والتقارير والإعدادات',
  },
  {
    id: 'staff-scanner-1',
    name: 'مشرف الميدان / البوابة',
    pin: '1234',
    role: 'field_supervisor',
    assignedBus: 0,
    permissions: {
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
    notes: 'ماسح ضوئي وكشوفات حضور وصعود فقط بدون ماليات',
  },
  {
    id: 'staff-bus1',
    name: 'مشرف حافلة #1',
    pin: '1111',
    role: 'field_supervisor',
    assignedBus: 1,
    permissions: {
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
    notes: 'كشف صعود وتسكين حافلة 1',
  },
  {
    id: 'staff-pr-1',
    name: 'علاقات عامة وحجوزات',
    pin: '2222',
    role: 'pr_ticketing',
    assignedBus: 0,
    permissions: {
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
    notes: 'تسجيل الطلاب وإصدار التذاكر والواتساب',
  },
];

export const loadStaffAccounts = (): import('../types').StaffAccount[] => {
  try {
    const data = localStorage.getItem(KEYS.STAFF_ACCOUNTS);
    if (!data) return initialStaffAccounts;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialStaffAccounts;
  } catch {
    return initialStaffAccounts;
  }
};

export const saveStaffAccounts = (accounts: import('../types').StaffAccount[]) => {
  try {
    localStorage.setItem(KEYS.STAFF_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save staff accounts:', err);
  }
};

export const loadActiveUserSession = (): import('../types').ActiveUserSession => {
  const defaultAdminSession: import('../types').ActiveUserSession = {
    role: 'admin',
    name: 'المدير العام (الأدمن)',
    pin: '0000',
    assignedBus: 0,
    permissions: {
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
  };

  try {
    const data = localStorage.getItem(KEYS.ACTIVE_USER_SESSION);
    if (!data) return defaultAdminSession;
    const parsed = JSON.parse(data);
    if (!parsed.permissions) {
      parsed.permissions = defaultAdminSession.permissions;
    }
    return parsed;
  } catch {
    return defaultAdminSession;
  }
};

export const saveActiveUserSession = (session: import('../types').ActiveUserSession) => {
  try {
    localStorage.setItem(KEYS.ACTIVE_USER_SESSION, JSON.stringify(session));
  } catch (err) {
    console.error('Failed to save user session:', err);
  }
};

// ==========================================
// ACTIVITY LOGS SYSTEM (سجل النشاط المتقدم)
// ==========================================
export const initialActivityLogs: import('../types').ActivityLog[] = [];

export const loadActivityLogs = (): import('../types').ActivityLog[] => {
  try {
    const data = localStorage.getItem(KEYS.ACTIVITY_LOGS);
    if (!data) return initialActivityLogs;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : initialActivityLogs;
  } catch {
    return initialActivityLogs;
  }
};

export const saveActivityLogs = (logs: import('../types').ActivityLog[]) => {
  try {
    localStorage.setItem(KEYS.ACTIVITY_LOGS, JSON.stringify(logs.slice(0, 500))); // Keep up to 500 logs
  } catch (err) {
    console.error('Failed to save activity logs:', err);
  }
};

// Clean initial trip ready for user input
const createInitialTrips = (): Trip[] => {
  const trip1: Trip = {
    id: 'trip-1',
    status: 'active',
    createdAt: new Date().toISOString().split('T')[0],
    students: [],
    drivers: [],
    expenses: [],
    contracts: [],
    receipts: [],
    logistics: [],
    timeline: [],
    notices: [],
    settings: {
      ...initialTripSettings,
      tripName: 'رحلة العمل الأولى',
    },
  };

  return [trip1];
};

const createInitialTreasury = (): CompanyTreasury => {
  return {
    currentBalance: 0,
    transfers: [],
  };
};

export const loadState = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (err) {
    console.error(`Error loading key ${key} from localStorage:`, err);
    return fallback;
  }
};

export const saveState = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key} to localStorage:`, err);
  }
};

export const loadTrips = (): Trip[] => {
  return loadState<Trip[]>(KEYS.TRIPS, createInitialTrips());
};

export const saveTrips = (trips: Trip[]): void => {
  saveState(KEYS.TRIPS, trips);
};

export const loadActiveTripId = (trips: Trip[]): string => {
  const defaultId = trips[0]?.id || 'trip-1';
  return loadState<string>(KEYS.ACTIVE_TRIP_ID, defaultId);
};

export const saveActiveTripId = (id: string): void => {
  saveState(KEYS.ACTIVE_TRIP_ID, id);
};

export const loadTreasury = (): CompanyTreasury => {
  const data = loadState<any>(KEYS.TREASURY, createInitialTreasury());
  if (!data) return createInitialTreasury();
  return {
    currentBalance: typeof data.currentBalance === 'number' ? data.currentBalance : 0,
    transfers: Array.isArray(data.transfers) ? data.transfers : [],
  };
};

export const saveTreasury = (treasury: CompanyTreasury): void => {
  saveState(KEYS.TREASURY, treasury);
};

export const resetToDefaults = () => {
  localStorage.clear();
  const initialTrips = createInitialTrips();
  const initialTreasury = createInitialTreasury();
  saveTrips(initialTrips);
  saveActiveTripId(initialTrips[0].id);
  saveTreasury(initialTreasury);
  return {
    trips: initialTrips,
    activeTripId: initialTrips[0].id,
    treasury: initialTreasury,
  };
};

/**
 * Format WhatsApp message text as a realistic framed Digital Ticket with visual borders, barcode, and structured info
 */
export const generateWhatsAppTicketText = (
  student: Student,
  settings: TripSettings,
  templateType: 'full_ticket' | 'receipt' | 'bus_info' | 'reminder' = 'full_ticket'
): string => {
  const statusText =
    student.paymentStatus === 'paid'
      ? '🟢 تم السداد بالكامل'
      : student.paymentStatus === 'deposit'
      ? '🟡 تم سداد العربون'
      : '🔴 غير مدفوع';

  const payMethodText =
    student.paymentMethod === 'vodafone_cash'
      ? 'فودافون كاش 📱'
      : student.paymentMethod === 'instapay'
      ? 'أنستا باي InstaPay 💳'
      : student.paymentMethod === 'bank_transfer'
      ? 'تحويل بنكي 🏦'
      : 'نقدي (كاش) 💵';

  const roleText = student.customRole || (student.participantRole === 'companion' ? 'مرافق' : student.participantRole === 'organizer' ? 'منظم وقائد' : 'طالب');
  const freeBadge = student.isFreeTicket ? ' 🎁 (تذكرة مجانية VIP)' : '';

  const selectedAddonsList = (settings.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));
  const apparelAddons = selectedAddonsList.filter((a) => (a.type === 'apparel' || a.name.includes('هودي') || a.name.includes('تيشرت')));
  const mealAddons = selectedAddonsList.filter((a) => (a.type === 'meal' || a.name.includes('وجب') || a.name.includes('غداء')));
  const otherAddons = selectedAddonsList.filter((a) => !apparelAddons.includes(a) && !mealAddons.includes(a));

  const itemsList: string[] = [];
  apparelAddons.forEach((a) => {
    const size = student.addonOptions?.[a.id] || (student.tshirtSize !== 'none' ? student.tshirtSize : 'L');
    itemsList.push(`• ${a.name}: مقاس (${size})${student.tshirtReceived ? ' (استلم ✅)' : ''}`);
  });
  if (apparelAddons.length === 0 && student.tshirtSize && student.tshirtSize !== 'none') {
    itemsList.push(`• تيشرت الفعالية: مقاس (${student.tshirtSize})${student.tshirtReceived ? ' (استلم ✅)' : ''}`);
  }
  mealAddons.forEach((a) => {
    itemsList.push(`• وجبة طعام: ${a.name}${student.mealReceived ? ' (استلمت ✅)' : ''}`);
  });
  if (mealAddons.length === 0 && student.hasMeal) {
    itemsList.push(`• وجبة الغداء: ${student.mealOption || 'وجبة طعام VIP'}${student.mealReceived ? ' (استلمت ✅)' : ''}`);
  }
  otherAddons.forEach((a) => {
    itemsList.push(`• خدمة إضافية: ${a.name}`);
  });

  const inclusionsSection = itemsList.length > 0 ? `\n✨ ═══ *الخدمات والإضافات المشمولة* ═══ ✨\n${itemsList.join('\n')}\n` : '';

  const companionSection = student.hasCompanion && student.companionName ? `
👥 ═══ *بطاقة وتفاصيل المرافق المنسق (تحت المشترك)* ═══ 👥
• اسم المرافق: *${student.companionName}*
• هاتف المرافق: *${student.companionPhone || student.phone}*
${student.companionNationalId ? `• الرقم القومي للمرافق: *${student.companionNationalId}*\n` : ''}• مقعد المرافق بالحافلة: *${student.companionSeatNumber ? `#${student.companionSeatNumber}` : 'مجاور للمشترك الرئيسي'}*
• سعر/قيمة تذكرة المرافق: *${(student.companionPrice ?? settings.ticketPrice ?? 0).toLocaleString()} ج.م*
• تيشرت المرافق: *${student.companionTShirtSize === 'none' ? 'بدون' : student.companionTShirtSize || 'L'}${student.companionTshirtReceived ? ' (استلم ✅)' : ''}*
• وجبة طعام المرافق: *${student.companionHasMeal ? `${student.companionMealOption || 'وجبة غداء VIP'}${student.companionMealReceived ? ' (استلم ✅)' : ''}` : 'بدون وجبة'}*
` : '';

  if (templateType === 'receipt') {
    return `
🎟️ ════════════════════════════ 🎟️
       🧾 *إيصال سداد وتأكيد حجز* 🧾
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

👤 *اسم المسافر:* ${student.name} (${roleText})${freeBadge}
🔢 *كود التذكرة:* \`[ ${student.ticketCode} ]\`
🚌 *اسم الرحلة:* ${settings.tripName}
${companionSection}
💳 ═══ *البيانات المالية والإيصال* ═══ 💳
• إجمالي قيمة التذكرة: *${student.isFreeTicket ? '0 ج.م (تذكرة مجانية VIP)' : `${student.totalAmount} ج.م`}*
• المبلغ المدفوع: *${student.paidAmount} ج.م*
• المتبقي للسداد: *${student.remainingAmount} ج.م*
• حالة السداد: *${statusText}*
• طريقة الدفع: *${payMethodText}*

📞 للدعم الفني والمالي: ${settings.supportPhone}
شكراً لثقتكم بشركة كيان! 🥳🎉
`.trim();
  }

  if (templateType === 'bus_info') {
    return `
🎟️ ════════════════════════════ 🎟️
       🚌 *بطاقة تسكين الأتوبيس* 🚌
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

👤 *اسم المشارك:* ${student.name} (${roleText})
🔢 *كود التذكرة:* \`[ ${student.ticketCode} ]\`
🚌 *الرحلة:* ${settings.tripName}
📅 *تاريخ التحرك:* ${settings.tripDate}
📍 *نقطة التجمع:* ${settings.destination}
${companionSection}
💺 ═══ *بيانات المقعد والتحضير* ═══ 💺
• رقم الأتوبيس: *أتوبيس رقم (${student.busNumber})*
• رقم المقعد: *${student.seatNumber ? `#${student.seatNumber}` : 'سيحدد عند الصعود'}*
${student.pickupPoint ? `• محطة الركوب: *${student.pickupPoint}*\n` : ''}${inclusionsSection}
🔗 *جروب الواتساب الرسمي:*
${settings.whatsappGroupLink}

⚠️ يرجى التواجد قبل التحرك بـ 30 دقيقة.
`.trim();
  }

  // Default: Full Graphical Digital Ticket Format
  return `
🎟️ ════════════════════════════ 🎟️
      🎫 *تذكرة حجز رقمية معتمدة* 🎫
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

👤 *صاحب التذكرة:* ${student.name}${freeBadge}
🔢 *كود التذكرة:* \`[ ${student.ticketCode} ]\`
🎓 *الكلية / صفة الحجز:* ${student.faculty} (${roleText})
${companionSection}
🚌 ═══ *تفاصيل الرحلة والتحرك* ═══ 🚌
• الرحلة: *${settings.tripName}*
• تاريخ الرحلة: *${settings.tripDate}*
• الوجهة والتجمع: *${settings.destination}*
• رقم الأتوبيس: *أتوبيس رقم (${student.busNumber})*
• رقم المقعد: *${student.seatNumber ? `#${student.seatNumber}` : 'سيحدد عند الصعود'}*
${student.pickupPoint ? `• محطة الركوب: *${student.pickupPoint}*\n` : ''}${student.nationalId ? `• الرقم القومي: *${student.nationalId}*\n` : ''}${student.emergencyPhone ? `• رقم الطوارئ: *${student.emergencyPhone}*\n` : ''}${inclusionsSection}
💳 ═══ *بيانات السداد والحساب* ═══ 💳
• إجمالي قيمة التذكرة: *${student.isFreeTicket ? '0 ج.م (تذكرة مجانية VIP)' : `${student.totalAmount} ج.م`}*
• المبلغ المدفوع: *${student.paidAmount} ج.م*
• المتبقي للسداد: *${student.remainingAmount} ج.م*
• حالة السداد: *${statusText}*
• طريقة الدفع: *${payMethodText}*

${settings.whatsappGroupLink ? `🔗 جروب الواتساب: ${settings.whatsappGroupLink}\n` : ''}${settings.driveLink ? `📸 ألبوم صور الميديا والرحلة: ${settings.driveLink}\n` : ''}📞 للدعم الفني والاستفسارات: ${settings.supportPhone}

║▌║█║▌│║▌║▌█
*KAYAN OFFICIAL DIGITAL TICKET*
نتمنى لكم رحلة سعيدة ومميزة مع كيان! 🥳🎉
`.trim();
};

export const generateWhatsAppTicketTextWithPDFLink = (
  student: Student,
  settings: TripSettings,
  customPdfLink?: string
): string => {
  const statusText = student.paymentStatus === 'paid' ? 'خالص السداد بالكامل ✅' : `عربون (${student.paidAmount} ج.م) ⚠️`;
  const portalUrl = customPdfLink || (typeof window !== 'undefined' ? `${window.location.origin}` : '');
  const downloadLink = settings.driveLink || portalUrl;

  return `
🎟️ ════════════════════════════ 🎟️
      🎫 *تذكرة حجز رقمية معتمدة PDF* 🎫
       ✨ KAYAN EVENTS & TRAVELS ✨
🎟️ ════════════════════════════ 🎟️

أهلاً بك يا *${student.name}* 👋
تم إصدار وتجهيز تذكرتك الرسمية للرحلة بصيغة PDF.

👤 *صاحب التذكرة:* ${student.name}
🔢 *كود التذكرة الفريد:* \`[ ${student.ticketCode} ]\`
🎓 *الكلية / الدفعة:* ${student.faculty || 'كلية الحاسبات والمعلومات'}

🚌 ═══ *تفاصيل الحافلة والتسكين* ═══ 🚌
• الرحلة: *${settings.tripName}*
• تاريخ الرحلة: *${settings.tripDate}*
• الوجهة وتجمع: *${settings.destination}*
• رقم الأتوبيس: *أتوبيس رقم (${student.busNumber})*
• رقم المقعد: *${student.seatNumber ? `#${student.seatNumber}` : 'سيحدد عند الصعود'}*
• مقاس التيشرت: *${student.tshirtSize}*
• حالة السداد: *${statusText}*

📄 ═══ *رابط تحميل وتصفح التذكرة PDF* ═══ 📄
🔗 ${downloadLink}

📁 *ملاحظة:* تم إنشاء وتنزيل ملف التذكرة PDF مباشرة على جهازك لإمكانية إرفاق الملف فوراً في المحادثة!

🔗 *جروب الواتساب الرسمي:*
${settings.whatsappGroupLink}

📞 الخط الساخن للدعم: ${settings.supportPhone}
نتمنى لك رحلة ممتعة مع كيان! 🎉
`.trim();
};

export const formatWhatsAppReceiptMessage = (student: Student, settings: TripSettings): string => {
  return encodeURIComponent(generateWhatsAppTicketText(student, settings, 'full_ticket'));
};

export const sendCustomWhatsAppMessage = (phone: string, messageText: string) => {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  let formattedPhone = cleanPhone;
  if (cleanPhone.startsWith('01')) {
    formattedPhone = `20${cleanPhone.slice(1)}`;
  } else if (!cleanPhone.startsWith('20') && cleanPhone.length === 10) {
    formattedPhone = `20${cleanPhone}`;
  }
  const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  window.open(url, '_blank');
};

export const sendWhatsAppReceipt = (student: Student, settings: TripSettings) => {
  sendCustomWhatsAppMessage(student.phone, generateWhatsAppTicketText(student, settings, 'full_ticket'));
};

export const sendWhatsAppPDFTicket = (student: Student, settings: TripSettings, pdfLink?: string) => {
  sendCustomWhatsAppMessage(
    student.phone,
    generateWhatsAppTicketTextWithPDFLink(student, settings, pdfLink)
  );
};

