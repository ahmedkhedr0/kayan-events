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
} from '../types';

export const initialTripSettings: TripSettings = {
  tripName: 'رحلة العمل الأولى',
  tripDate: new Date().toISOString().split('T')[0],
  destination: '',
  totalSeats: 50,
  ticketPrice: 500,
  defaultDeposit: 200,
  companionFullPrice: 500,
  companionBasePrice: 500,
  mealPriceDefault: 0,
  addons: [],
  driveLink: '',
  whatsappGroupLink: '',
  supportPhone: '',
  companyNameAr: 'شركة كيان لتنظيم الفعاليات والرحلات',
  companyNameEn: 'KAYAN EVENTS & ORGANIZING SERVICES',
  companyLicenseNo: '',
  companyPhone: '',
};

export const initialStudents: Student[] = [];
export const initialDrivers: DriverInfo[] = [];
export const initialExpenses: ExpenseItem[] = [];
export const initialContracts: ContractData[] = [];
export const initialReceipts: ReceiptVoucher[] = [];
export const initialLogistics: LogisticsItem[] = [];
export const initialTimeline: TimelineEvent[] = [];
export const initialNotices: BroadcastNotice[] = [];
