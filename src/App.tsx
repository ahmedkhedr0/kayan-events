import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { StudentsCRM } from './components/StudentsCRM';
import { BusManagement } from './components/BusManagement';
import { ContractsReceipts } from './components/ContractsReceipts';
import { FinancialsProfit } from './components/FinancialsProfit';
import { LogisticsInventory } from './components/LogisticsInventory';
import { ManifestsPrintCenter } from './components/ManifestsPrintCenter';
import { EventTimeline } from './components/EventTimeline';
import { StudentPortalMedia } from './components/StudentPortalMedia';
import { FieldSupervisorView } from './components/FieldSupervisorView';

import { QRScannerModal } from './components/QRScannerModal';
import { StudentPassModal } from './components/StudentPassModal';
import { SettingsModal } from './components/SettingsModal';
import { MainTreasuryModal } from './components/MainTreasuryModal';
import { TripSwitcherModal } from './components/TripSwitcherModal';
import { WhatsAppBatchReminderModal } from './components/WhatsAppBatchReminderModal';
import { StaffLoginModal } from './components/StaffLoginModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { AuthLockScreen } from './components/AuthLockScreen';
import { ActivityLogsModal } from './components/ActivityLogsModal';
import { PWAInstallPromptModal } from './components/PWAInstallPromptModal';

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
  TripAddon,
  TripStatus,
  CompanyTreasury,
  TreasuryTransfer,
  StaffAccount,
  ActiveUserSession,
  ActivityLog,
  ActivityActionType,
} from './types';

import {
  loadTrips,
  saveTrips,
  loadActiveTripId,
  saveActiveTripId,
  loadTreasury,
  saveTreasury,
  loadStaffAccounts,
  saveStaffAccounts,
  loadActiveUserSession,
  saveActiveUserSession,
  loadActivityLogs,
  saveActivityLogs,
  resetToDefaults,
} from './services/storage';

import {
  subscribeToTrips,
  subscribeToGlobalState,
  syncAllTripsToCloud,
  syncGlobalStateToCloud,
  subscribeToQuotaStatus,
  resetQuotaCooldown,
} from './services/firebaseSync';

export default function App() {
  // Multi-Trip and Treasury State
  const [trips, setTrips] = useState<Trip[]>(loadTrips);
  const [activeTripId, setActiveTripId] = useState<string>(() => loadActiveTripId(loadTrips()));
  const [companyTreasury, setCompanyTreasury] = useState<CompanyTreasury>(loadTreasury);

  // Staff & Role Security State
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(loadStaffAccounts);
  const [userSession, setUserSession] = useState<ActiveUserSession>(loadActiveUserSession);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(loadActivityLogs);

  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal controls
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedStudentForPass, setSelectedStudentForPass] = useState<Student | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTreasuryModalOpen, setIsTreasuryModalOpen] = useState(false);
  const [isTripSwitcherOpen, setIsTripSwitcherOpen] = useState(false);
  const [isWhatsAppReminderOpen, setIsWhatsAppReminderOpen] = useState(false);
  const [targetReminderTrip, setTargetReminderTrip] = useState<Trip | null>(null);
  const [isStaffLoginOpen, setIsStaffLoginOpen] = useState(false);
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState(false);
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState(false);

  // Active Trip derived object
  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || loadTrips()[0];

  // Global Activity Logger helper
  const addLog = (
    actionType: ActivityActionType,
    actionTitle: string,
    details: string,
    targetName?: string,
    targetId?: string,
    busNumber?: number,
    metadata?: Record<string, unknown>
  ) => {
    const now = new Date();
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      dateString: now.toISOString().split('T')[0],
      timeString: now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dayName: dayNames[now.getDay()],
      userName: userSession.name || 'المستخدم',
      userRole: userSession.role || 'admin',
      actionType,
      actionTitle,
      details,
      targetName,
      targetId,
      busNumber: busNumber !== undefined ? busNumber : userSession.assignedBus || undefined,
      tripName: activeTrip?.settings?.tripName || 'الرحلة الحالية',
      tripId: activeTripId,
      metadata,
    };

    setActivityLogs((prev) => {
      const updated = [newLog, ...prev].slice(0, 1000);
      saveActivityLogs(updated);
      return updated;
    });
  };

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);

  // Firestore quota status
  const [isCloudQuotaExceeded, setIsCloudQuotaExceeded] = useState(false);
  const [isQuotaBannerDismissed, setIsQuotaBannerDismissed] = useState(false);

  // Guard against bidirectional echo loop between Firestore snapshot and local state
  const isIncomingRemoteUpdateRef = React.useRef(false);
  const lastSyncedTripsJsonRef = React.useRef(JSON.stringify(trips));
  const lastSyncedGlobalJsonRef = React.useRef(JSON.stringify({ activeTripId, companyTreasury, staffAccounts }));

  // Save session & accounts
  const handleUserLogin = (session: ActiveUserSession) => {
    setUserSession(session);
    saveActiveUserSession(session);
    setIsAuthenticated(true);

    // If user has granular trip permissions, ensure activeTripId matches an allowed trip
    if (session.role !== 'admin' && session.allowedTripIds && session.allowedTripIds.length > 0) {
      if (!session.allowedTripIds.includes(activeTripId)) {
        const validTrip = trips.find((t) => session.allowedTripIds!.includes(t.id));
        if (validTrip) {
          setActiveTripId(validTrip.id);
        }
      }
    }
  };

  const handleLockApp = () => {
    setIsAuthenticated(false);
  };

  const handleSaveStaffAccounts = (accounts: StaffAccount[]) => {
    setStaffAccounts(accounts);
    saveStaffAccounts(accounts);
    syncGlobalStateToCloud(activeTripId, companyTreasury, accounts);
  };

  // Subscribe to real-time Cloud updates from Firebase Firestore with echo suppression
  useEffect(() => {
    const unsubscribeTrips = subscribeToTrips((cloudTrips) => {
      if (cloudTrips && cloudTrips.length > 0) {
        const newJson = JSON.stringify(cloudTrips);
        if (newJson !== lastSyncedTripsJsonRef.current) {
          isIncomingRemoteUpdateRef.current = true;
          lastSyncedTripsJsonRef.current = newJson;
          setTrips(cloudTrips);
          saveTrips(cloudTrips);
        }
      }
    }, trips);

    const unsubscribeGlobal = subscribeToGlobalState(
      (cloudState) => {
        const newGlobalJson = JSON.stringify(cloudState);
        if (newGlobalJson !== lastSyncedGlobalJsonRef.current) {
          isIncomingRemoteUpdateRef.current = true;
          lastSyncedGlobalJsonRef.current = newGlobalJson;

          if (cloudState.activeTripId) {
            setActiveTripId(cloudState.activeTripId);
            saveActiveTripId(cloudState.activeTripId);
          }
          if (cloudState.treasury) {
            setCompanyTreasury(cloudState.treasury);
            saveTreasury(cloudState.treasury);
          }
          if (cloudState.staffAccounts && cloudState.staffAccounts.length > 0) {
            setStaffAccounts(cloudState.staffAccounts);
            saveStaffAccounts(cloudState.staffAccounts);
          }
        }
      },
      activeTripId,
      companyTreasury,
      staffAccounts
    );

    const unsubscribeQuota = subscribeToQuotaStatus((exceeded) => {
      setIsCloudQuotaExceeded(exceeded);
    });

    return () => {
      unsubscribeTrips();
      unsubscribeGlobal();
      unsubscribeQuota();
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPWAInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsPWAInstallable(false);
        }
        setDeferredPrompt(null);
      });
    } else {
      setIsPWAInstallModalOpen(true);
    }
  };

  // Sync state changes to local storage & Cloud Firestore with debouncing and echo suppression
  useEffect(() => {
    saveTrips(trips);
    if (isIncomingRemoteUpdateRef.current) {
      isIncomingRemoteUpdateRef.current = false;
      return;
    }

    const currentJson = JSON.stringify(trips);
    if (currentJson === lastSyncedTripsJsonRef.current) return;

    const timer = setTimeout(() => {
      lastSyncedTripsJsonRef.current = currentJson;
      syncAllTripsToCloud(trips);
    }, 600);

    return () => clearTimeout(timer);
  }, [trips]);

  useEffect(() => {
    saveActiveTripId(activeTripId);
    saveTreasury(companyTreasury);
    saveStaffAccounts(staffAccounts);

    if (isIncomingRemoteUpdateRef.current) {
      isIncomingRemoteUpdateRef.current = false;
      return;
    }

    const currentGlobalJson = JSON.stringify({ activeTripId, companyTreasury, staffAccounts });
    if (currentGlobalJson === lastSyncedGlobalJsonRef.current) return;

    const timer = setTimeout(() => {
      lastSyncedGlobalJsonRef.current = currentGlobalJson;
      syncGlobalStateToCloud(activeTripId, companyTreasury, staffAccounts);
    }, 600);

    return () => clearTimeout(timer);
  }, [activeTripId, companyTreasury, staffAccounts]);

  // Helper to update current active trip state
  const updateActiveTrip = (updater: (prevTrip: Trip) => Trip) => {
    setTrips((prevTrips) =>
      prevTrips.map((trip) => (trip.id === activeTrip.id ? updater(trip) : trip))
    );
  };

  // Student CRUD Operations
  const handleAddStudent = (newStudentData: Omit<Student, 'id' | 'ticketCode'>): Student => {
    const newStudent: Student = {
      ...newStudentData,
      id: `std-${Date.now()}`,
      ticketCode: `KYN-${8500 + activeTrip.students.length + 1}`,
    };
    updateActiveTrip((prev) => ({
      ...prev,
      students: [newStudent, ...prev.students],
    }));
    addLog(
      'student_register',
      'تسجيل مشترك جديد',
      `تم تسجيل الطالب ${newStudent.name} بكود تذكرة ${newStudent.ticketCode} على باص ${newStudent.busNumber}.`,
      newStudent.name,
      newStudent.id,
      newStudent.busNumber
    );
    return newStudent;
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const prevStudent = activeTrip.students.find((s) => s.id === updatedStudent.id);
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s)),
    }));

    if (prevStudent && (prevStudent.busNumber !== updatedStudent.busNumber || prevStudent.seatNumber !== updatedStudent.seatNumber)) {
      addLog(
        'seat_transfer',
        'تعديل المقعد / الحافلة',
        `تم نقل الطالب ${updatedStudent.name} من (باص ${prevStudent.busNumber} مقعد #${prevStudent.seatNumber || 'غير محدد'}) إلى (باص ${updatedStudent.busNumber} مقعد #${updatedStudent.seatNumber || 'غير محدد'}).`,
        updatedStudent.name,
        updatedStudent.id,
        updatedStudent.busNumber
      );
    } else {
      addLog(
        'student_update',
        'تحديث بيانات المشترك',
        `تم تحديث بيانات الطالب ${updatedStudent.name} (حالة الدفع: ${updatedStudent.paymentStatus}).`,
        updatedStudent.name,
        updatedStudent.id,
        updatedStudent.busNumber
      );
    }
  };

  const handleDeleteStudent = (id: string) => {
    const student = activeTrip.students.find((s) => s.id === id);
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.filter((s) => s.id !== id),
    }));
    if (student) {
      addLog(
        'student_delete',
        'حذف مشترك من الرحلة',
        `تم حذف المشترك ${student.name} صاحب التذكرة ${student.ticketCode}.`,
        student.name,
        student.id,
        student.busNumber
      );
    }
  };

  // Check-In Toggles
  const handleToggleCheckInDeparture = (studentId: string) => {
    const student = activeTrip.students.find((s) => s.id === studentId);
    const isNowChecked = !student?.checkInDeparture;
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              checkInDeparture: !s.checkInDeparture,
              departureTime: !s.checkInDeparture ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : s
      ),
    }));
    if (student) {
      addLog(
        'checkin_departure',
        isNowChecked ? 'تسجيل حضور الذهاب' : 'إلغاء حضور الذهاب',
        isNowChecked
          ? `تم تأكيد حضور وصعود ${student.name} إلى باص ${student.busNumber}.`
          : `تم إلغاء تسجيل حضور الذهاب لـ ${student.name}.`,
        student.name,
        student.id,
        student.busNumber
      );
    }
  };

  const handleToggleCheckInReturn = (studentId: string) => {
    const student = activeTrip.students.find((s) => s.id === studentId);
    const isNowChecked = !student?.checkInReturn;
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              checkInReturn: !s.checkInReturn,
              returnTime: !s.checkInReturn ? new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : undefined,
            }
          : s
      ),
    }));
    if (student) {
      addLog(
        'checkin_return',
        isNowChecked ? 'تسجيل حضور العودة' : 'إلغاء حضور العودة',
        isNowChecked
          ? `تم تأكيد ركوب ${student.name} في رحلة العودة (باص ${student.busNumber}).`
          : `تم إلغاء تسجيل حضور العودة لـ ${student.name}.`,
        student.name,
        student.id,
        student.busNumber
      );
    }
  };

  const handleToggleTShirtReceived = (studentId: string) => {
    const student = activeTrip.students.find((s) => s.id === studentId);
    const isNowReceived = !student?.tshirtReceived;
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              tshirtReceived: !s.tshirtReceived,
            }
          : s
      ),
    }));
    if (student) {
      addLog(
        'tshirt_delivery',
        isNowReceived ? 'تسليم التيشرت' : 'إلغاء استلام التيشرت',
        isNowReceived
          ? `تم تسليم تيشرت (مقاس ${student.tshirtSize}) للمشترك ${student.name}.`
          : `تم إلغاء حالة تسليم التيشرت للمشترك ${student.name}.`,
        student.name,
        student.id,
        student.busNumber
      );
    }
  };

  const handleToggleMealReceived = (studentId: string) => {
    const student = activeTrip.students.find((s) => s.id === studentId);
    const isNowReceived = !student?.mealReceived;
    updateActiveTrip((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              mealReceived: !s.mealReceived,
            }
          : s
      ),
    }));
    if (student) {
      addLog(
        'meal_delivery',
        isNowReceived ? 'تسليم وجبة الطعام' : 'إلغاء استلام الوجبة',
        isNowReceived
          ? `تم تسليم وجبة الطعام للمشترك ${student.name}.`
          : `تم إلغاء حالة تسليم الوجبة للمشترك ${student.name}.`,
        student.name,
        student.id,
        student.busNumber
      );
    }
  };

  // Scan Code Check-In Helper
  const handleCheckInByCode = (code: string) => {
    const student = activeTrip.students.find(
      (s) => s.ticketCode.toLowerCase() === code.trim().toLowerCase()
    );

    if (!student) {
      return { success: false, message: `لم يتم العثور على طالب بالكود ${code}` };
    }

    // Toggle check in departure
    handleToggleCheckInDeparture(student.id);

    return {
      success: true,
      studentName: student.name,
      message: `تم تحضير الطالب ${student.name} بنجاح (أتوبيس رقم ${student.busNumber}) 🎉`,
    };
  };

  // Drivers / Buses CRUD
  const handleUpdateDriver = (updatedDriver: DriverInfo) => {
    updateActiveTrip((prev) => ({
      ...prev,
      drivers: prev.drivers.map((d) => (d.busNumber === updatedDriver.busNumber ? updatedDriver : d)),
    }));
  };

  const handleAddDriver = (newDriver: DriverInfo) => {
    updateActiveTrip((prev) => ({
      ...prev,
      drivers: [...prev.drivers.filter((d) => d.busNumber !== newDriver.busNumber), newDriver].sort(
        (a, b) => a.busNumber - b.busNumber
      ),
    }));
  };

  const handleDeleteDriver = (busNumber: number) => {
    updateActiveTrip((prev) => ({
      ...prev,
      drivers: prev.drivers.filter((d) => d.busNumber !== busNumber),
    }));
  };

  // Expenses CRUD
  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id'>) => {
    const newExpense: ExpenseItem = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    updateActiveTrip((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
    addLog(
      'expense_add',
      'إضافة مصروف جديد',
      `تم تسجيل مصروف بقيمة ${newExpense.amount.toLocaleString()} ج.م (${newExpense.title}) لصالح: ${newExpense.paidTo || 'غير محدد'}.`,
      newExpense.title,
      newExpense.id,
      undefined,
      { amount: newExpense.amount, category: newExpense.category, paidTo: newExpense.paidTo }
    );
  };

  const handleUpdateExpense = (updatedExpense: ExpenseItem) => {
    updateActiveTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)),
    }));
    addLog(
      'expense_update',
      'تعديل بند مصروفات',
      `تم تحديث بند المصروف (${updatedExpense.title}) بقيمة ${updatedExpense.amount.toLocaleString()} ج.م.`,
      updatedExpense.title,
      updatedExpense.id,
      undefined,
      { amount: updatedExpense.amount, category: updatedExpense.category }
    );
  };

  const handleDeleteExpense = (id: string) => {
    const expense = activeTrip.expenses.find((e) => e.id === id);
    updateActiveTrip((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
    if (expense) {
      addLog(
        'expense_delete',
        'حذف بند مصروفات',
        `تم حذف بند المصروف (${expense.title}) وقيمته ${expense.amount.toLocaleString()} ج.م.`,
        expense.title,
        expense.id
      );
    }
  };

  // Contracts & Receipts
  const handleAddContract = (contract: ContractData) => {
    updateActiveTrip((prev) => ({
      ...prev,
      contracts: [contract, ...prev.contracts],
    }));
    addLog(
      'contract_add',
      'إنشاء عقد جديد',
      `تم إنشاء وتوثيق عقد (${contract.title}) مع (${contract.partyName}) بقيمة إجمالية ${contract.totalCost.toLocaleString()} ج.م.`,
      contract.partyName,
      contract.id,
      undefined,
      { contractType: contract.type, totalCost: contract.totalCost, depositPaid: contract.depositPaid }
    );
  };

  const handleUpdateContract = (updatedContract: ContractData) => {
    updateActiveTrip((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => (c.id === updatedContract.id ? updatedContract : c)),
    }));
  };

  const handleDeleteContract = (id: string) => {
    updateActiveTrip((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== id),
    }));
  };

  const handleAddReceipt = (receipt: ReceiptVoucher) => {
    updateActiveTrip((prev) => ({
      ...prev,
      receipts: [receipt, ...prev.receipts],
    }));
    addLog(
      'receipt_add',
      receipt.type === 'receipt' ? 'إصدار سند استلام / قبض' : 'إصدار سند صرف / دفع',
      `تم إصدار سند برقم (${receipt.voucherNumber}) بقيمة ${receipt.amount.toLocaleString()} ج.م لـ (${receipt.personName}).`,
      receipt.personName,
      receipt.id,
      undefined,
      { amount: receipt.amount, voucherNumber: receipt.voucherNumber, paymentMethod: receipt.paymentMethod, type: receipt.type }
    );
  };

  const handleUpdateReceipt = (updatedReceipt: ReceiptVoucher) => {
    updateActiveTrip((prev) => ({
      ...prev,
      receipts: prev.receipts.map((r) => (r.id === updatedReceipt.id ? updatedReceipt : r)),
    }));
  };

  const handleDeleteReceipt = (id: string) => {
    updateActiveTrip((prev) => ({
      ...prev,
      receipts: prev.receipts.filter((r) => r.id !== id),
    }));
  };

  // Logistics
  const handleUpdateLogisticsQuantity = (id: string, deltaConsumed: number) => {
    updateActiveTrip((prev) => ({
      ...prev,
      logistics: prev.logistics.map((item) => {
        if (item.id === id) {
          const newConsumed = Math.max(0, Math.min(item.totalQuantity, item.consumedQuantity + deltaConsumed));
          return { ...item, consumedQuantity: newConsumed };
        }
        return item;
      }),
    }));
  };

  const handleAddLogisticsItem = (item: Omit<LogisticsItem, 'id'>) => {
    const newItem: LogisticsItem = {
      ...item,
      id: `log-${Date.now()}`,
    };
    updateActiveTrip((prev) => ({
      ...prev,
      logistics: [...prev.logistics, newItem],
    }));
  };

  const handleBatchAddLogistics = (items: Array<Omit<LogisticsItem, 'id'>>) => {
    const newItems: LogisticsItem[] = items.map((item, idx) => ({
      ...item,
      id: `log-${Date.now()}-${idx}`,
    }));
    updateActiveTrip((prev) => ({
      ...prev,
      logistics: [...prev.logistics, ...newItems],
    }));
  };

  const handleUpdateLogisticsItem = (updatedItem: LogisticsItem) => {
    updateActiveTrip((prev) => ({
      ...prev,
      logistics: prev.logistics.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    }));
  };

  const handleDeleteLogisticsItem = (id: string) => {
    updateActiveTrip((prev) => ({
      ...prev,
      logistics: prev.logistics.filter((item) => item.id !== id),
    }));
  };

  // Timeline & Notices
  const handleUpdateTimelineStatus = (id: string, status: 'pending' | 'in_progress' | 'completed') => {
    updateActiveTrip((prev) => ({
      ...prev,
      timeline: prev.timeline.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  };

  const handleUpdateTimelineEvent = (updatedEvent: TimelineEvent) => {
    updateActiveTrip((prev) => ({
      ...prev,
      timeline: prev.timeline.map((t) => (t.id === updatedEvent.id ? updatedEvent : t)),
    }));
  };

  const handleAddTimelineEvent = (newEvent: Omit<TimelineEvent, 'id'>) => {
    const eventItem: TimelineEvent = {
      ...newEvent,
      id: `time-${Date.now()}`,
    };
    updateActiveTrip((prev) => ({
      ...prev,
      timeline: [...prev.timeline, eventItem],
    }));
  };

  const handleDeleteTimelineEvent = (id: string) => {
    updateActiveTrip((prev) => ({
      ...prev,
      timeline: prev.timeline.filter((t) => t.id !== id),
    }));
  };

  const handleSendNotice = (notice: Omit<BroadcastNotice, 'id' | 'time'>) => {
    const newNotice: BroadcastNotice = {
      ...notice,
      id: `not-${Date.now()}`,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    };
    updateActiveTrip((prev) => ({
      ...prev,
      notices: [newNotice, ...prev.notices],
    }));
    addLog(
      'broadcast_notice',
      'إرسال إشعار جماعي',
      `تم إرسال إشعار: "${newNotice.message}" لكافة المشتركين في الرحلة.`,
      newNotice.sender,
      newNotice.id
    );
  };

  // Drive Link
  const handleUpdateDriveLink = (link: string) => {
    updateActiveTrip((prev) => ({
      ...prev,
      settings: { ...prev.settings, driveLink: link },
    }));
  };

  // Multi-Trip Management Handlers
  const handleSelectTrip = (tripId: string) => {
    setActiveTripId(tripId);
    const target = trips.find((t) => t.id === tripId);
    if (target) {
      addLog(
        'trip_switch',
        'التبديل إلى رحلة أخرى',
        `تم الانتقال إلى إدارة (${target.settings?.tripName || 'رحلة'}).`,
        target.settings?.tripName,
        target.id
      );
    }
  };

  const handleCreateNewTrip = (newTripData: {
    tripName: string;
    tripDate: string;
    destination: string;
    totalSeats: number;
    ticketPrice: number;
    defaultDeposit?: number;
    companionFullPrice?: number;
    companionBasePrice?: number;
    addons?: TripAddon[];
    whatsappGroupLink?: string;
    assemblyLocation?: string;
    assemblyTime?: string;
    supportPhone?: string;
    driveLink?: string;
  }) => {
    const newTripId = `trip-${Date.now()}`;
    const defaultTemplate = loadTrips()[0];

    const newTrip: Trip = {
      id: newTripId,
      status: 'active',
      createdAt: new Date().toISOString(),
      settings: {
        tripName: newTripData.tripName,
        tripDate: newTripData.tripDate,
        destination: newTripData.destination,
        totalSeats: newTripData.totalSeats,
        ticketPrice: newTripData.ticketPrice,
        defaultDeposit: newTripData.defaultDeposit ?? 500,
        companionFullPrice: newTripData.companionFullPrice ?? newTripData.ticketPrice,
        companionBasePrice: newTripData.companionBasePrice ?? 800,
        mealPriceDefault: 150,
        addons: newTripData.addons || [
          { id: 'addon-meal', name: 'وجبة غداء VIP متكاملة (شاملة المشروب)', price: 150, isDefaultSelected: true },
          { id: 'addon-tshirt', name: 'تيشرت البراند الرسمي المعتمد للرحلة', price: 250, isDefaultSelected: true },
          { id: 'addon-photo', name: 'جلسة تصوير وفوتوسيشن احترافي', price: 100, isDefaultSelected: false },
        ],
        whatsappGroupLink: newTripData.whatsappGroupLink || 'https://chat.whatsapp.com/kayan-events',
        supportPhone: newTripData.supportPhone || '01012345678 / 01198765432',
        companyPhone: '01012345678 / 01198765432',
        driveLink: newTripData.driveLink || 'https://drive.google.com/drive/folders/kayan-events',
        assemblyLocation: newTripData.assemblyLocation || 'ميدان الرماية - أمام البوابة الرئيسية',
        assemblyTime: newTripData.assemblyTime || '06:30 ص',
      },
      students: [],
      drivers: defaultTemplate ? defaultTemplate.drivers : [],
      expenses: [],
      contracts: [],
      receipts: [],
      logistics: defaultTemplate ? defaultTemplate.logistics : [],
      timeline: defaultTemplate ? defaultTemplate.timeline : [],
      notices: [],
    };

    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(newTripId);
    addLog(
      'trip_create',
      'تأسيس رحلة جديدة',
      `تم إنشاء وتجهيز ملف رحلة جديدة بعنوان (${newTripData.tripName}) وتحديد سعة ${newTripData.totalSeats} مقعد وسعر تذكرة ${newTripData.ticketPrice} ج.م.`,
      newTripData.tripName,
      newTripId,
      undefined,
      { destination: newTripData.destination, totalSeats: newTripData.totalSeats, ticketPrice: newTripData.ticketPrice }
    );
  };

  const handleUpdateTripStatus = (tripId: string, status: TripStatus) => {
    setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, status } : t)));
    addLog(
      'trip_status_change',
      'تغيير حالة الرحلة',
      `تم تحويل حالة الرحلة إلى: ${status === 'active' ? 'نشطة وقيد الحجز' : status === 'completed' ? 'مكتملة ومقفلة' : 'قيد التجهيز والتخطيط'}.`,
      tripId,
      tripId
    );
  };

  const handleDeleteTrip = (tripId: string) => {
    if (trips.length <= 1) {
      alert('لا يمكن حذف الرحلة الأخيرة في النظام');
      return;
    }
    const target = trips.find((t) => t.id === tripId);
    const filtered = trips.filter((t) => t.id !== tripId);
    setTrips(filtered);
    if (activeTripId === tripId) {
      setActiveTripId(filtered[0].id);
    }
    addLog(
      'trip_delete',
      'حذف ملف رحلة',
      `تم حذف ملف (${target?.settings?.tripName || tripId}) من النظام نهائياً.`,
      target?.settings?.tripName,
      tripId
    );
  };

  // Main Treasury Handler
  const handleAddTreasuryTransfer = (transferData: Omit<TreasuryTransfer, 'id' | 'timestamp'>) => {
    const newTransfer: TreasuryTransfer = {
      ...transferData,
      id: `trf-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    setCompanyTreasury((prev) => ({
      ...prev,
      currentBalance: prev.currentBalance + (newTransfer.type === 'direct_withdrawal' ? -newTransfer.amount : newTransfer.amount),
      transfers: [newTransfer, ...prev.transfers],
    }));

    // If trip status was active, mark as completed
    if (newTransfer.tripId && newTransfer.type === 'trip_final_profit') {
      handleUpdateTripStatus(newTransfer.tripId, 'completed');
    }

    addLog(
      'treasury_transfer',
      newTransfer.type === 'direct_withdrawal' ? 'سحب من الخزنة' : 'إيداع بالخزنة المركزية',
      `تم تسجيل حركة مالية (${newTransfer.type === 'direct_withdrawal' ? 'سحب' : 'إيداع'}) بمبلغ ${newTransfer.amount.toLocaleString()} ج.م - ${newTransfer.notes || ''}.`,
      newTransfer.referenceNumber || 'الخزنة المركزية',
      newTransfer.id,
      undefined,
      { amount: newTransfer.amount, type: newTransfer.type, transferredBy: newTransfer.transferredBy }
    );
  };

  const handleUpdateTreasuryTransfer = (updatedTransfer: TreasuryTransfer) => {
    setCompanyTreasury((prev) => {
      const oldTransfer = prev.transfers.find((t) => t.id === updatedTransfer.id);
      const oldDelta = oldTransfer
        ? oldTransfer.type === 'direct_withdrawal'
          ? -oldTransfer.amount
          : oldTransfer.amount
        : 0;
      const newDelta =
        updatedTransfer.type === 'direct_withdrawal'
          ? -updatedTransfer.amount
          : updatedTransfer.amount;
      const diff = newDelta - oldDelta;

      const newTransfers = prev.transfers.map((t) =>
        t.id === updatedTransfer.id ? updatedTransfer : t
      );
      return {
        ...prev,
        currentBalance: prev.currentBalance + diff,
        transfers: newTransfers,
      };
    });
  };

  const handleDeleteTreasuryTransfer = (transferId: string) => {
    setCompanyTreasury((prev) => {
      const target = prev.transfers.find((t) => t.id === transferId);
      if (!target) return prev;
      const delta = target.type === 'direct_withdrawal' ? -target.amount : target.amount;

      return {
        ...prev,
        currentBalance: prev.currentBalance - delta,
        transfers: prev.transfers.filter((t) => t.id !== transferId),
      };
    });
  };

  // Reset
  const handleResetData = () => {
    if (confirm('هل أنت تأكد من إعادة ضبط كافة البيانات والرحلات للافتراضي؟')) {
      const defaults = resetToDefaults();
      setTrips(defaults.trips);
      setActiveTripId(defaults.activeTripId);
      setCompanyTreasury(defaults.treasury);
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <AuthLockScreen
          staffAccounts={staffAccounts}
          tripName={activeTrip?.settings?.tripName || 'رحلة دهب وسانت كاترين'}
          destination={activeTrip?.settings?.destination || 'كيان Events'}
          supportPhone={activeTrip?.settings?.supportPhone || activeTrip?.settings?.companyPhone || '01023456789'}
          onAuthenticate={handleUserLogin}
          onInstallPWA={handleInstallPWA}
        />
        <PWAInstallPromptModal
          isOpen={isPWAInstallModalOpen}
          onClose={() => setIsPWAInstallModalOpen(false)}
          onInstall={handleInstallPWA}
          canNativeInstall={!!deferredPrompt}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950 max-w-full overflow-x-hidden">
      {/* If Field Supervisor Mode is active, show the specialized mobile field view */}
      {userSession.role === 'field_supervisor' ? (
        <FieldSupervisorView
          students={activeTrip.students}
          tripSettings={activeTrip.settings}
          session={userSession}
          onOpenQRScanner={() => setIsQRScannerOpen(true)}
          onLogoutToStaffModal={() => setIsStaffLoginOpen(true)}
          onOpenTripSwitcher={() => setIsTripSwitcherOpen(true)}
          onToggleCheckInDeparture={handleToggleCheckInDeparture}
          onToggleCheckInReturn={handleToggleCheckInReturn}
          onToggleTShirtReceived={handleToggleTShirtReceived}
          onToggleMealReceived={handleToggleMealReceived}
        />
      ) : (
        <>
          {/* Top Navigation */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tripSettings={activeTrip.settings}
            userSession={userSession}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenStudentPass={() => setSelectedStudentForPass(activeTrip.students[0] || null)}
            onResetData={handleResetData}
            isPWAInstallable={isPWAInstallable}
            onInstallPWA={handleInstallPWA}
            onOpenTripSwitcher={() => setIsTripSwitcherOpen(true)}
            onOpenTreasuryModal={() => setIsTreasuryModalOpen(true)}
            onOpenStaffLogin={() => setIsStaffLoginOpen(true)}
            onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
            onOpenActivityLogs={() => setIsActivityLogsOpen(true)}
            onLockApp={handleLockApp}
            treasuryBalance={companyTreasury.currentBalance}
          />

          {/* Offline / Quota Safety Banner */}
          {isCloudQuotaExceeded && !isQuotaBannerDismissed && (
            <div className="bg-amber-950/70 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 backdrop-blur-md">
              <div className="flex items-center gap-2 flex-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                <p>
                  <strong>وضع التخزين المحلي فائق السرعة مفعّل:</strong> تم الوصول للحد اليومي للطلبات السحابية (Firestore Quota Limit). كافة العمليات والبيانات والتذاكر محفوظة محلياً وتعمل بسرعة كاملة.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    resetQuotaCooldown();
                    syncAllTripsToCloud(trips);
                  }}
                  className="text-amber-300 hover:text-white text-xs px-2.5 py-1 rounded bg-amber-800/60 hover:bg-amber-700/80 transition cursor-pointer"
                >
                  🔄 إعادة فحص السحابة
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuotaBannerDismissed(true)}
                  className="text-amber-400 hover:text-amber-200 font-bold px-2 py-1 rounded bg-amber-900/50 hover:bg-amber-800/50 transition cursor-pointer"
                >
                  إخفاء
                </button>
              </div>
            </div>
          )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 sm:px-6 lg:px-8 py-3 sm:py-6 pb-24 sm:pb-8 space-y-6 overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <Dashboard
            students={activeTrip.students}
            drivers={activeTrip.drivers}
            expenses={activeTrip.expenses}
            settings={activeTrip.settings}
            onNavigate={setActiveTab}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenWhatsAppReminder={() => {
              setTargetReminderTrip(activeTrip);
              setIsWhatsAppReminderOpen(true);
            }}
          />
        )}

        {activeTab === 'students' && (
          <StudentsCRM
            students={activeTrip.students}
            settings={activeTrip.settings}
            userSession={userSession}
            onAddStudent={handleAddStudent}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenTicketPassModal={(student) => setSelectedStudentForPass(student)}
            onToggleMealReceived={handleToggleMealReceived}
            onToggleTShirtReceived={handleToggleTShirtReceived}
            onToggleCheckInDeparture={handleToggleCheckInDeparture}
            onToggleCheckInReturn={handleToggleCheckInReturn}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'buses' && (
          <BusManagement
            students={activeTrip.students}
            drivers={activeTrip.drivers}
            settings={activeTrip.settings}
            onToggleCheckInDeparture={handleToggleCheckInDeparture}
            onToggleCheckInReturn={handleToggleCheckInReturn}
            onToggleTShirtReceived={handleToggleTShirtReceived}
            onToggleMealReceived={handleToggleMealReceived}
            onUpdateStudentBus={(id, bus, seat) => {
              const student = activeTrip.students.find((s) => s.id === id);
              if (student) {
                handleUpdateStudent({ ...student, busNumber: bus, seatNumber: seat });
              }
            }}
            onOpenQRScanner={() => setIsQRScannerOpen(true)}
            onOpenTicketPassModal={(student) => setSelectedStudentForPass(student)}
            onUpdateDriver={handleUpdateDriver}
            onAddDriver={handleAddDriver}
            onDeleteDriver={handleDeleteDriver}
            onUpdateStudent={handleUpdateStudent}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'manifests' && (
          <ManifestsPrintCenter
            students={activeTrip.students}
            settings={activeTrip.settings}
            drivers={activeTrip.drivers}
            onToggleCheckInDeparture={handleToggleCheckInDeparture}
            onToggleCheckInReturn={handleToggleCheckInReturn}
            onToggleTShirtReceived={handleToggleTShirtReceived}
            onToggleMealReceived={handleToggleMealReceived}
            onUpdateStudent={handleUpdateStudent}
          />
        )}

        {activeTab === 'contracts' && (
          <ContractsReceipts
            contracts={activeTrip.contracts}
            receipts={activeTrip.receipts}
            students={activeTrip.students}
            settings={activeTrip.settings}
            onAddContract={handleAddContract}
            onUpdateContract={handleUpdateContract}
            onDeleteContract={handleDeleteContract}
            onAddReceipt={handleAddReceipt}
            onUpdateReceipt={handleUpdateReceipt}
            onDeleteReceipt={handleDeleteReceipt}
            onUpdateStudent={handleUpdateStudent}
          />
        )}

        {activeTab === 'financials' && (
          <FinancialsProfit
            expenses={activeTrip.expenses}
            students={activeTrip.students}
            receipts={activeTrip.receipts}
            settings={activeTrip.settings}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateStudent={handleUpdateStudent}
            onAddReceipt={handleAddReceipt}
            onOpenTreasuryModal={() => setIsTreasuryModalOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            treasuryBalance={companyTreasury.currentBalance}
          />
        )}

        {activeTab === 'logistics' && (
          <LogisticsInventory
            logistics={activeTrip.logistics}
            students={activeTrip.students}
            settings={activeTrip.settings}
            drivers={activeTrip.drivers}
            expenses={activeTrip.expenses}
            onUpdateQuantity={handleUpdateLogisticsQuantity}
            onAddLogisticsItem={handleAddLogisticsItem}
            onBatchAddLogistics={handleBatchAddLogistics}
            onUpdateLogisticsItem={handleUpdateLogisticsItem}
            onDeleteLogisticsItem={handleDeleteLogisticsItem}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'timeline' && (
          <EventTimeline
            timeline={activeTrip.timeline}
            notices={activeTrip.notices}
            students={activeTrip.students}
            settings={activeTrip.settings}
            onUpdateTimelineStatus={handleUpdateTimelineStatus}
            onSendNotice={handleSendNotice}
            onAddTimelineEvent={handleAddTimelineEvent}
            onUpdateTimelineEvent={handleUpdateTimelineEvent}
            onDeleteTimelineEvent={handleDeleteTimelineEvent}
          />
        )}

        {activeTab === 'portal' && (
          <StudentPortalMedia
            students={activeTrip.students}
            settings={activeTrip.settings}
            onUpdateDriveLink={handleUpdateDriveLink}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 شركة كيان لتنظيم الفعاليات والرحلات (KAYAN Events). جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-3 text-slate-400">
            <span>نظام رحلات متعدد 🚌</span>
            <span>•</span>
            <span>الخزنة الرئيسية 🏛️</span>
            <span>•</span>
            <span>فصل الصلاحيات 🛡️</span>
          </div>
        </div>
      </footer>
        </>
      )}

      {/* Modals */}
      <QRScannerModal
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        students={activeTrip.students}
        userSession={userSession}
        onUpdateStudent={handleUpdateStudent}
        onToggleCheckInDeparture={handleToggleCheckInDeparture}
        onToggleCheckInReturn={handleToggleCheckInReturn}
        onToggleTShirtReceived={handleToggleTShirtReceived}
        onToggleMealReceived={handleToggleMealReceived}
        onOpenDigitalTicket={(student) => setSelectedStudentForPass(student)}
        onCheckInStudentByCode={handleCheckInByCode}
      />

      <StudentPassModal
        student={selectedStudentForPass}
        settings={activeTrip.settings}
        onClose={() => setSelectedStudentForPass(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={activeTrip.settings}
        onSaveSettings={(newSettings) =>
          updateActiveTrip((prev) => ({ ...prev, settings: newSettings }))
        }
        onResetToDefaults={handleResetData}
      />

      <MainTreasuryModal
        isOpen={isTreasuryModalOpen}
        onClose={() => setIsTreasuryModalOpen(false)}
        treasury={companyTreasury}
        trips={trips}
        activeTripId={activeTripId}
        onAddTransfer={handleAddTreasuryTransfer}
        onUpdateTransfer={handleUpdateTreasuryTransfer}
        onDeleteTransfer={handleDeleteTreasuryTransfer}
      />

      <TripSwitcherModal
        isOpen={isTripSwitcherOpen}
        onClose={() => setIsTripSwitcherOpen(false)}
        trips={trips}
        activeTripId={activeTripId}
        userSession={userSession}
        onSelectTrip={handleSelectTrip}
        onCreateNewTrip={handleCreateNewTrip}
        onUpdateTripStatus={handleUpdateTripStatus}
        onUpdateTripSettings={(tripId, newSettings) => {
          setTrips((prev) =>
            prev.map((t) => (t.id === tripId ? { ...t, settings: newSettings } : t))
          );
        }}
        onDeleteTrip={handleDeleteTrip}
        onOpenTreasuryModal={() => setIsTreasuryModalOpen(true)}
        onOpenWhatsAppReminderForTrip={(trip) => {
          setTargetReminderTrip(trip);
          setIsWhatsAppReminderOpen(true);
        }}
      />

      {/* Staff Role Switcher & Login Modal */}
      <StaffLoginModal
        isOpen={isStaffLoginOpen}
        onClose={() => setIsStaffLoginOpen(false)}
        staffAccounts={staffAccounts}
        currentSession={userSession}
        onLogin={handleUserLogin}
        onManageAccounts={() => {
          setIsStaffLoginOpen(false);
          setIsStaffManagementOpen(true);
        }}
      />

      {/* Staff Accounts Management Modal (PINs & Roles) */}
      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={() => setIsStaffManagementOpen(false)}
        staffAccounts={staffAccounts}
        trips={trips}
        onSaveStaffAccounts={handleSaveStaffAccounts}
      />

      {/* Meta WhatsApp Official Cloud API Reminder Modal */}
      <WhatsAppBatchReminderModal
        isOpen={isWhatsAppReminderOpen}
        onClose={() => setIsWhatsAppReminderOpen(false)}
        students={(targetReminderTrip || activeTrip).students}
        settings={(targetReminderTrip || activeTrip).settings}
      />

      {/* Advanced Activity Logs & Audit Trail Modal */}
      <ActivityLogsModal
        isOpen={isActivityLogsOpen}
        onClose={() => setIsActivityLogsOpen(false)}
        logs={activityLogs}
        onClearLogs={() => {
          setActivityLogs([]);
          saveActivityLogs([]);
        }}
      />

      {/* PWA Phone Installation Modal */}
      <PWAInstallPromptModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
        onInstall={handleInstallPWA}
        canNativeInstall={!!deferredPrompt}
      />
    </div>
  );
}
