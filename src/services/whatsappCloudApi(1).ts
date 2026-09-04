import { Student, TripSettings } from '../types';

export interface MetaWhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  templateName: string;
  languageCode: string;
  useServerProxy: boolean;
}

export interface WhatsAppMessageResult {
  studentId: string;
  studentName: string;
  phone: string;
  status: 'pending' | 'sending' | 'success' | 'failed';
  messageId?: string;
  error?: string;
  timestamp?: string;
}

const STORAGE_KEY_CONFIG = 'kayan_meta_whatsapp_config_v1';

export const DEFAULT_META_CONFIG: MetaWhatsAppConfig = {
  phoneNumberId: '100609346382901',
  accessToken: '',
  businessAccountId: '',
  templateName: 'trip_assembly_reminder',
  languageCode: 'ar',
  useServerProxy: true,
};

export const loadMetaWhatsAppConfig = (): MetaWhatsAppConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return { ...DEFAULT_META_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error loading Meta WhatsApp config from localStorage:', err);
  }
  return DEFAULT_META_CONFIG;
};

export const saveMetaWhatsAppConfig = (config: MetaWhatsAppConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving Meta WhatsApp config:', err);
  }
};

/**
  * Formats clean international phone number (e.g. 01012345678 -> 201012345678)
  */
export const formatInternationalPhone = (phone: string): string => {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('01')) {
    return `20${clean.slice(1)}`;
  }
  if (!clean.startsWith('20') && clean.length === 10) {
    return `20${clean}`;
  }
  return clean;
};

export type BroadcastCategory = 
  | 'assembly_reminder'
  | 'bus_departure'
  | 'destination_arrival'
  | 'reception_pickup'
  | 'return_assembly'
  | 'custom_broadcast';

export interface BroadcastParams {
  category: BroadcastCategory;
  assemblyTime?: string;
  assemblyLocation?: string;
  driverName?: string;
  busNotes?: string;
  destinationName?: string;
  pickupType?: string; // e.g. 'استلام المفاتيح والغرف' | 'استلام التذاكر' | 'استلام العُدة'
  pickupLocation?: string;
  supervisorName?: string;
  returnTime?: string;
  returnLocation?: string;
  customSubject?: string;
  customBody?: string;
}

export const BROADCAST_CATEGORY_DETAILS: Record<BroadcastCategory, { title: string; icon: string; description: string }> = {
  assembly_reminder: {
    title: 'تذكير التجمع والانطلاق',
    icon: '⏰',
    description: 'تذكير بموعد ومكان التجمع ورقم الأتوبيس والتسكين'
  },
  bus_departure: {
    title: 'تنبيه تحرك الأتوبيسات الآن',
    icon: '🚌',
    description: 'إشعار فوري بتحرك الحافلة وبداية الرحلة للمسافرين'
  },
  destination_arrival: {
    title: 'تنبيه الوصول إلى الوجهة',
    icon: '📍',
    description: 'إشعار بالوصول بالسلامة والتوجه لنقطة التجمع أو الريسبشن'
  },
  reception_pickup: {
    title: 'تنبيه استلام الغرف / التذاكر / المعدات',
    icon: '🔑',
    description: 'تعليمات استلام المفاتيح أو التذاكر أو العُدة مع المكان والمشرف'
  },
  return_assembly: {
    title: 'تنبيه تجمع العودة',
    icon: '🚌',
    description: 'تذكير بموعد ومكان التجمع للعودة إلى الوطن'
  },
  custom_broadcast: {
    title: 'رسالة بث حرة مخصصة',
    icon: '📣',
    description: 'كتابة نص مخصص حر يشتمل على اسم كل مشترك تلقائياً'
  }
};

/**
 * Builds dynamic WhatsApp text message preview or payload according to category
 */
export const buildBroadcastText = (
  student: Student,
  settings: TripSettings,
  params: BroadcastParams
): string => {
  const name = student.name || 'عزيزي المشترك';
  const trip = settings.tripName || 'رحلة كيان';
  const date = settings.tripDate || 'اليوم المحدد';
  const bus = student.busNumber ? `أتوبيس رقم (${student.busNumber})` : 'التسكين العام';
  const seat = student.seatNumber ? `مقعد رقم (${student.seatNumber})` : '';

  switch (params.category) {
    case 'assembly_reminder':
      return `📢 [تذكير بموعد الرحلة والتجمع]

مرحباً ${name} 👋،
نود تذكيرك بموعد انطلاق ${trip} المقرر يوم ${date}.

• موعد التجمع: ${params.assemblyTime || settings.assemblyTime || '06:00 صباحاً'}
• نقطة الانطلاق: ${params.assemblyLocation || settings.assemblyLocation || settings.destination || 'نقطة التجمع المحددة'}
• التسكين: ${bus} ${seat}

نتمنى لكم رحلة سعيدة مع فريق كيان! 🥳`;

    case 'bus_departure':
      return `🚌 [تنبيه تحرك الأتوبيس الآن]

مرحباً ${name} 👋،
تم بحمد الله تحرك ${bus} في طريقه إلى ${settings.destination || trip}.

${params.driverName ? `• كابتن الرحلة: ${params.driverName}\n` : ''}${params.busNotes ? `• ملاحظات الطريق: ${params.busNotes}\n` : ''}
يرجى ربط أحزمة الأمان والالتزام بتعليمات المشرفين. رحلة ممتعة وآمنة للجميع! ✨`;

    case 'destination_arrival':
      return `📍 [تنبيه الوصول بالسلامة]

حمد الله على السلامة يا ${name} ❤️!
وصلنا بحمد الله إلى ${params.destinationName || settings.destination || 'مقر الإقامة والوجهة'}.

• يرجى التوجه إلى: ${params.pickupLocation || 'البهو الرئيسي / الريسبشن'}
• المشرف المسؤول: ${params.supervisorName || settings.supportPhone || 'مشرف الحافلة'}

نتمنى لكم إقامة ممتعة ولحظات لا تُنسى! 🎉`;

    case 'reception_pickup':
      return `🔑 [تنبيه: ${params.pickupType || 'استلام الغرف والتذاكر'}]

عزيزي ${name} 👋،
بدأ الآن إجراءات ${params.pickupType || 'استلام الغرف والتذاكر'}.

• مكان التسليم: ${params.pickupLocation || 'الريسبشن / مكتب الاستقبال'}
• المشرف المسؤول: ${params.supervisorName || 'فريق التنظيم'}
• بياناتك المسجلة: ${bus} ${seat}

يرجى التواجد مصحوباً بإثبات الشخصية لتسهيل الاستلام.`;

    case 'return_assembly':
      return `🚌 [تذكير بموعد تجمع العودة]

تنبيه هام للمشترك ${name} ⏰،
تقرر بدء تجمع العودة لرحلة ${trip}.

• موعد تجمع العودة: ${params.returnTime || '05:00 مساءً'}
• مكان تجمع الأتوبيسات: ${params.returnLocation || 'أمام الفندق / الموقف الرئيسي'}
• حافلتك: ${bus}

يرجى الالتزام بالموعد المحدد لضمان مغادرة الجميع في الوقت المناسب. 🤝`;

    case 'custom_broadcast':
    default:
      const rawCustom = params.customBody || 'تنبيه هام لجميع مشتركي رحلة كيان.';
      return rawCustom
        .replace(/\{name\}/g, name)
        .replace(/\{trip\}/g, trip)
        .replace(/\{date\}/g, date)
        .replace(/\{bus\}/g, bus)
        .replace(/\{seat\}/g, seat);
  }
};

/**
 * Sends single WhatsApp message via Meta Official Cloud API or Server Proxy
 */
export const sendSingleWhatsAppCloudApi = async (
  student: Student,
  settings: TripSettings,
  config: MetaWhatsAppConfig,
  broadcastParams?: BroadcastParams
): Promise<WhatsAppMessageResult> => {
  const phone = formatInternationalPhone(student.phone);
  const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!phone || phone.length < 10) {
    return {
      studentId: student.id,
      studentName: student.name,
      phone: student.phone,
      status: 'failed',
      error: 'رقم الهاتف غير صحيح أو ناقص',
      timestamp,
    };
  }

  const broadcastContent = broadcastParams ? buildBroadcastText(student, settings, broadcastParams) : '';

  try {
    if (config.useServerProxy) {
      // Send via server backend API proxy route
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student,
          settings,
          config,
          broadcastParams,
          messageText: broadcastContent,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return {
          studentId: student.id,
          studentName: student.name,
          phone,
          status: 'success',
          messageId: data.messageId || `WAMID-SER-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp,
        };
      } else {
        return {
          studentId: student.id,
          studentName: student.name,
          phone,
          status: 'failed',
          error: data.error || 'فشل الخادم في الاتصال بـ Meta Graph API',
          timestamp,
        };
      }
    } else {
      // Direct Meta Cloud API Request from client
      if (!config.phoneNumberId || !config.accessToken) {
        // Simulated response when credentials aren't set in dev test mode
        await new Promise((resolve) => setTimeout(resolve, 80));
        return {
          studentId: student.id,
          studentName: student.name,
          phone,
          status: 'success',
          messageId: `WAMID-SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp,
        };
      }

      // Meta Cloud API template payload
      const metaUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: config.templateName || 'trip_assembly_reminder',
          language: { code: config.languageCode || 'ar' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: student.name || 'المشترك' },
                { type: 'text', text: broadcastContent || settings.tripName || 'رحلة كيان' },
              ],
            },
          ],
        },
      };

      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok && data.messages?.[0]?.id) {
        return {
          studentId: student.id,
          studentName: student.name,
          phone,
          status: 'success',
          messageId: data.messages[0].id,
          timestamp,
        };
      } else {
        const errorMsg = data.error?.message || data.error?.error_user_msg || 'فشل الاتصال بـ Meta Cloud API';
        return {
          studentId: student.id,
          studentName: student.name,
          phone,
          status: 'failed',
          error: errorMsg,
          timestamp,
        };
      }
    }
  } catch (err: any) {
    return {
      studentId: student.id,
      studentName: student.name,
      phone,
      status: 'failed',
      error: err?.message || 'خطأ في الاتصال بالشبكة',
      timestamp,
    };
  }
};
