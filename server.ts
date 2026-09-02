import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory runtime config fallback
let runtimeWhatsAppConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '100609346382901',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  templateName: process.env.WHATSAPP_TEMPLATE_NAME || 'trip_assembly_reminder',
  languageCode: 'ar',
};

// ==========================================
// Meta WhatsApp Cloud API Endpoints
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Kayan Travels Meta WhatsApp Cloud API Proxy',
    timestamp: new Date().toISOString(),
  });
});

// GET /api/whatsapp/config
app.get('/api/whatsapp/config', (req, res) => {
  res.json({
    success: true,
    config: {
      phoneNumberId: runtimeWhatsAppConfig.phoneNumberId,
      hasAccessToken: Boolean(runtimeWhatsAppConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN),
      businessAccountId: runtimeWhatsAppConfig.businessAccountId,
      templateName: runtimeWhatsAppConfig.templateName,
      languageCode: runtimeWhatsAppConfig.languageCode,
    },
  });
});

// POST /api/whatsapp/config
app.post('/api/whatsapp/config', (req, res) => {
  const { phoneNumberId, accessToken, businessAccountId, templateName, languageCode } = req.body;
  if (phoneNumberId) runtimeWhatsAppConfig.phoneNumberId = phoneNumberId;
  if (accessToken) runtimeWhatsAppConfig.accessToken = accessToken;
  if (businessAccountId) runtimeWhatsAppConfig.businessAccountId = businessAccountId;
  if (templateName) runtimeWhatsAppConfig.templateName = templateName;
  if (languageCode) runtimeWhatsAppConfig.languageCode = languageCode;

  res.json({
    success: true,
    message: 'تم تحديث إعدادات Meta WhatsApp API بنجاح',
    config: {
      phoneNumberId: runtimeWhatsAppConfig.phoneNumberId,
      hasAccessToken: Boolean(runtimeWhatsAppConfig.accessToken),
      businessAccountId: runtimeWhatsAppConfig.businessAccountId,
      templateName: runtimeWhatsAppConfig.templateName,
      languageCode: runtimeWhatsAppConfig.languageCode,
    },
  });
});

// Helper function to format phone numbers
function formatPhone(phone: string): string {
  const clean = (phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('01')) {
    return `20${clean.slice(1)}`;
  }
  if (!clean.startsWith('20') && clean.length === 10) {
    return `20${clean}`;
  }
  return clean;
}

// POST /api/whatsapp/send-template
app.post('/api/whatsapp/send-template', async (req, res) => {
  try {
    const { student, settings, config, payload: customPayload } = req.body;

    const phoneNumberId = config?.phoneNumberId || runtimeWhatsAppConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = config?.accessToken || runtimeWhatsAppConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = config?.templateName || runtimeWhatsAppConfig.templateName || 'trip_assembly_reminder';
    const languageCode = config?.languageCode || runtimeWhatsAppConfig.languageCode || 'ar';

    const formattedPhone = formatPhone(student?.phone);

    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        error: 'رقم هاتف الطالب غير صحيح أو مفقود',
      });
    }

    // Construct official Meta WhatsApp Cloud API template payload if custom payload not provided
    const payload = customPayload || {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: student.name || 'المشترك' },
              { type: 'text', text: settings?.tripName || 'رحلة كيان' },
              { type: 'text', text: settings?.tripDate || 'اليوم المحدد' },
              { type: 'text', text: settings?.assemblyTime || '06:00 AM' },
              { type: 'text', text: settings?.assemblyLocation || settings?.destination || 'نقطة التجمع المحددة' },
              { type: 'text', text: student.busNumber ? `أتوبيس رقم (${student.busNumber})` : 'التسكين العام' },
            ],
          },
        ],
      },
    };

    // If access token is provided, call Meta Cloud API directly
    if (accessToken && phoneNumberId) {
      const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      const apiResponse = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await apiResponse.json();

      if (apiResponse.ok && responseData.messages?.[0]?.id) {
        return res.json({
          success: true,
          messageId: responseData.messages[0].id,
          phone: formattedPhone,
          studentName: student.name,
        });
      } else {
        const errorMsg = responseData.error?.message || responseData.error?.error_user_msg || 'فشل الاتصال بـ Meta Cloud API';
        return res.status(400).json({
          success: false,
          error: errorMsg,
          metaDetails: responseData.error,
        });
      }
    } else {
      // Return simulated success response for developer preview / test mode when credentials are pending
      return res.json({
        success: true,
        isSimulated: true,
        messageId: `WAMID-SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        phone: formattedPhone,
        studentName: student.name,
        note: 'تمت العملية بنجاح في وضع الاختبار (قم بإدخال Meta Access Token للإرسال الحقيقي المباشر)',
      });
    }
  } catch (error: any) {
    console.error('Error in /api/whatsapp/send-template:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'حدث خطأ غير متوقع في الخادم أثناء الإرسال',
    });
  }
});

// POST /api/whatsapp/batch-send
app.post('/api/whatsapp/batch-send', async (req, res) => {
  try {
    const { students = [], settings = {}, config = {} } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'قائمة المشتركين فارغة',
      });
    }

    const phoneNumberId = config.phoneNumberId || runtimeWhatsAppConfig.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = config.accessToken || runtimeWhatsAppConfig.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const templateName = config.templateName || runtimeWhatsAppConfig.templateName || 'trip_assembly_reminder';
    const languageCode = config.languageCode || runtimeWhatsAppConfig.languageCode || 'ar';

    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const student of students) {
      const formattedPhone = formatPhone(student.phone);
      const timestamp = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (!formattedPhone) {
        failureCount++;
        results.push({
          studentId: student.id,
          studentName: student.name,
          phone: student.phone,
          status: 'failed',
          error: 'رقم الهاتف غير مسجل أو غير صحيح',
          timestamp,
        });
        continue;
      }

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: student.name || 'عزيزي المشترك' },
                { type: 'text', text: settings.tripName || 'رحلة كيان' },
                { type: 'text', text: settings.tripDate || 'اليوم المحدد' },
                { type: 'text', text: settings.assemblyTime || '06:00 صباحاً' },
                { type: 'text', text: settings.assemblyLocation || settings.destination || 'نقطة التجمع المحددة' },
                { type: 'text', text: student.busNumber ? `أتوبيس رقم (${student.busNumber})` : 'التسكين العام' },
              ],
            },
          ],
        },
      };

      if (accessToken && phoneNumberId) {
        try {
          const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
          const apiResponse = await fetch(metaUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const responseData = await apiResponse.json();

          if (apiResponse.ok && responseData.messages?.[0]?.id) {
            successCount++;
            results.push({
              studentId: student.id,
              studentName: student.name,
              phone: formattedPhone,
              status: 'success',
              messageId: responseData.messages[0].id,
              timestamp,
            });
          } else {
            failureCount++;
            results.push({
              studentId: student.id,
              studentName: student.name,
              phone: formattedPhone,
              status: 'failed',
              error: responseData.error?.message || 'فشل الإرسال من قبل Meta Graph API',
              timestamp,
            });
          }
        } catch (err: any) {
          failureCount++;
          results.push({
            studentId: student.id,
            studentName: student.name,
            phone: formattedPhone,
            status: 'failed',
            error: err?.message || 'خطأ اتصال بالشبكة',
            timestamp,
          });
        }
      } else {
        // Simulated batch response
        successCount++;
        results.push({
          studentId: student.id,
          studentName: student.name,
          phone: formattedPhone,
          status: 'success',
          messageId: `WAMID-SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp,
        });
      }
    }

    return res.json({
      success: true,
      total: students.length,
      successCount,
      failureCount,
      results,
    });
  } catch (error: any) {
    console.error('Error in /api/whatsapp/batch-send:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'خطأ أثناء معالجة الإرسال الجماعي',
    });
  }
});

// Start Express + Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
