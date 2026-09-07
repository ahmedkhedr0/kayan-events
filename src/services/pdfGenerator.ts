import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toCanvas as htmlToImageToCanvas, toBlob as htmlToImageToBlob, toPng as htmlToImageToPng } from 'html-to-image';
import QRCode from 'qrcode';
import { ContractData, ReceiptVoucher, Student, TripSettings, TreasuryTransfer, CompanyTreasury, TimelineEvent, DriverInfo, getStudentMealInfo, getCompanionMealInfo } from '../types';
import { numberToArabicWords } from '../utils/arabicTafqit';
import { formatTripDateSafely } from '../utils/dateFormatter';
import { KAYAN_LOGO_BASE64, KAYAN_BADGE_BASE64, KAYAN_EVENTS_LOGO_BASE64 } from '../assets/images/embeddedImages';

// Always use pre-embedded 100% offline Base64 data URIs - zero network lag, zero CORS errors, zero tainted canvas issues on Vercel/production
export const cachedKayanLogoBase64 = KAYAN_LOGO_BASE64;
export const cachedKayanBadgeBase64 = KAYAN_BADGE_BASE64;
export const cachedKayanEventsLogoBase64 = KAYAN_EVENTS_LOGO_BASE64;

export const convertUrlToBase64 = async (url: string): Promise<string> => {
  if (!url || url.startsWith('data:')) return url;
  if (url.includes('kayan_logo')) return KAYAN_LOGO_BASE64;
  if (url.includes('kayan_badge')) return KAYAN_BADGE_BASE64;
  if (url.includes('kayan_events_logo')) return KAYAN_EVENTS_LOGO_BASE64;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // don't reject, fallback gracefully
      img.src = url;
    });
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width || 400;
    c.height = img.naturalHeight || img.height || 400;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.92);
    }
  } catch (err) {
    console.warn('Could not convert asset image to Base64 data URL:', err);
  }
  return url;
};

const canvas2d = typeof document !== 'undefined' ? document.createElement('canvas') : null;
if (canvas2d) {
  canvas2d.width = 1;
  canvas2d.height = 1;
}
const ctx2d = canvas2d ? canvas2d.getContext('2d') : null;

export const replaceOklabWithRgb = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes('oklab') && !text.includes('oklch') && !text.includes('color(') && !text.includes('color-mix(')) {
    return text;
  }

  return text.replace(/(oklab|oklch|color|color-mix)\([^;}{)]+\)/gi, (match) => {
    // 1. Try native canvas resolution if available in browser
    if (ctx2d) {
      try {
        ctx2d.fillStyle = '#000000';
        ctx2d.fillStyle = match;
        if (ctx2d.fillStyle && ctx2d.fillStyle !== '#000000' && (ctx2d.fillStyle.startsWith('#') || ctx2d.fillStyle.startsWith('rgb'))) {
          return ctx2d.fillStyle;
        }
      } catch (_) {}
    }

    // 2. Fallback heuristic parser
    let alpha = 1;
    const alphaMatch = match.match(/\/\s*([0-9.]+)(%)?/);
    if (alphaMatch) {
      alpha = parseFloat(alphaMatch[1]) / (alphaMatch[2] ? 100 : 1);
    }

    const lower = match.toLowerCase();
    let rgb = '15, 23, 42'; // default dark slate #0f172a

    if (lower.includes('amber') || lower.includes('gold') || lower.includes('yellow')) {
      rgb = '245, 158, 11';
    } else if (lower.includes('indigo') || lower.includes('blue')) {
      rgb = '79, 70, 229';
    } else if (lower.includes('emerald') || lower.includes('green')) {
      rgb = '16, 185, 129';
    } else if (lower.includes('white') || lower.includes('1 0 0') || lower.includes('0.99')) {
      rgb = '255, 255, 255';
    } else {
      const firstNumMatch = match.match(/\(\s*([0-9.]+)(%)?/);
      if (firstNumMatch) {
        let l = parseFloat(firstNumMatch[1]);
        if (firstNumMatch[2]) l /= 100;
        if (l > 0.85) {
          rgb = '255, 255, 255';
        } else if (l > 0.65) {
          rgb = '245, 158, 11';
        } else if (l < 0.25) {
          rgb = '15, 23, 42';
        } else {
          rgb = '30, 41, 59';
        }
      }
    }

    return alpha < 1 ? `rgba(${rgb}, ${alpha})` : `rgb(${rgb})`;
  });
};

export const sanitizeClonedDoc = (clonedDoc: Document) => {
  try {
    const win = clonedDoc.defaultView || (typeof window !== 'undefined' ? window : null);
    if (win && win.getComputedStyle) {
      const origGetComputedStyle = win.getComputedStyle;
      win.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
        const style = origGetComputedStyle.call(win, elt, pseudoElt);
        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const raw = target.getPropertyValue(propertyName);
                if (typeof raw === 'string' && (raw.includes('oklab') || raw.includes('oklch') || raw.includes('color('))) {
                  return replaceOklabWithRgb(raw);
                }
                return raw;
              };
            }
            const val = Reflect.get(target, prop);
            if (typeof val === 'function') {
              return val.bind(target);
            }
            if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch') || val.includes('color('))) {
              return replaceOklabWithRgb(val);
            }
            return val;
          },
        });
      };
    }

    // 1. Sanitize style tags content
    clonedDoc.querySelectorAll('style').forEach((style) => {
      if (style.textContent && (style.textContent.includes('oklab') || style.textContent.includes('oklch') || style.textContent.includes('color('))) {
        try {
          style.textContent = replaceOklabWithRgb(style.textContent);
        } catch (_) {}
      }
    });

    // 2. Sanitize CSS Rules recursively in stylesheets (including @layer, @media, etc.)
    const sanitizeRule = (rule: CSSRule) => {
      try {
        if ('cssRules' in rule && (rule as any).cssRules) {
          Array.from((rule as any).cssRules as CSSRuleList).forEach(sanitizeRule);
        }
        const styleRule = rule as CSSStyleRule;
        if (styleRule && styleRule.style && styleRule.style.cssText) {
          if (styleRule.style.cssText.includes('oklab') || styleRule.style.cssText.includes('oklch') || styleRule.style.cssText.includes('color(')) {
            styleRule.style.cssText = replaceOklabWithRgb(styleRule.style.cssText);
          }
        }
      } catch (_) {}
    };

    try {
      Array.from(clonedDoc.styleSheets).forEach((sheet) => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            Array.from(rules).forEach(sanitizeRule);
          }
        } catch (_) {}
      });
    } catch (_) {}

    // 3. Sanitize elements with inline style attributes & computed colors
    clonedDoc.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle && (inlineStyle.includes('oklab') || inlineStyle.includes('oklch') || inlineStyle.includes('color('))) {
        el.setAttribute('style', replaceOklabWithRgb(inlineStyle));
      }
      // Never allow letter-spacing on Arabic text as it breaks cursive character joining in html2canvas
      el.style.letterSpacing = 'normal';
      el.style.wordSpacing = 'normal';
    });
  } catch (e) {
    console.warn('Error sanitizing cloned doc for html2canvas:', e);
  }
};

const triggerDirectAnchorDownload = (url: string, filename: string) => {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  link.style.position = 'fixed';
  link.style.top = '-9999px';
  link.style.left = '-9999px';
  document.body.appendChild(link);

  try {
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    link.dispatchEvent(clickEvent);
  } catch (_) {
    link.click();
  }

  setTimeout(() => {
    if (document.body.contains(link)) {
      document.body.removeChild(link);
    }
  }, 2000);
};

export const triggerFileDownload = (blobOrDataUrl: Blob | string, filename: string) => {
  try {
    const isBlob = blobOrDataUrl instanceof Blob;
    const url = isBlob ? URL.createObjectURL(blobOrDataUrl) : blobOrDataUrl;
    
    // Always trigger direct anchor download to ensure files (PNG images, PDFs) download
    // straight to the user's phone/laptop storage without intercepting with Google Drive / Google Docs links
    triggerDirectAnchorDownload(url, filename);
    
    setTimeout(() => {
      if (isBlob) {
        URL.revokeObjectURL(url);
      }
    }, 30000);
  } catch (err) {
    console.error('Error in triggerFileDownload:', err);
  }
};

/**
 * Universal jsPDF Downloader ensuring 100% reliable downloads on Mobile, Desktop, PWA, and iframe
 */
export const saveJsPDFDoc = (doc: jsPDF, filename: string): boolean => {
  try {
    const blob = doc.output('blob');
    if (blob) {
      triggerFileDownload(blob, filename);
      return true;
    }
  } catch (err) {
    console.warn('Error extracting blob from jsPDF doc, falling back to doc.save:', err);
  }
  try {
    doc.save(filename);
    return true;
  } catch (err) {
    console.error('Failed to save jsPDF doc:', err);
    return false;
  }
};

export const fallbackPrintElement = (_element: HTMLElement, title: string) => {
  // Silent fallback - do NOT automatically open browser print dialog without user intent
  console.warn(`Fallback rendering completed for: ${title}`);
};

/**
 * Universal A4 Paginated PDF Exporter ensuring 100% reliable multi-page or single-page A4 PDFs
 * without clipping, truncation, or blank trailing pages.
 */
export const createA4PaginatedPDF = (
  canvas: HTMLCanvasElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  metaTitle?: string
): boolean => {
  try {
    const imgData = canvas.toDataURL('image/png', 1.0);
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 for portrait, 297 for landscape
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 for portrait, 210 for landscape

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (metaTitle) {
      doc.setProperties({
        title: metaTitle,
        author: 'KAYAN Management System',
        creator: 'KAYAN Events & Tours',
      });
    }

    // Smart single-page fit if content fits or slightly exceeds (within 12% overflow tolerance)
    if (imgHeight <= pageHeight * 1.12) {
      const scale = imgHeight > pageHeight ? pageHeight / imgHeight : 1;
      const renderW = imgWidth * scale;
      const renderH = imgHeight * scale;
      const xOffset = (pageWidth - renderW) / 2;
      doc.addImage(imgData, 'PNG', xOffset, 0, renderW, renderH, undefined, 'FAST');
    } else {
      // Multi-Page A4 Pagination
      let heightLeft = imgHeight;
      let position = 0;

      // Page 1
      doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Subsequent Pages
      while (heightLeft > 5) { // 5mm margin tolerance to avoid blank pages
        position -= pageHeight;
        doc.addPage();
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }
    }

    return saveJsPDFDoc(doc, filename);
  } catch (err) {
    console.error(`Error generating A4 PDF [${filename}]:`, err);
    return false;
  }
};

export const exportDOMElementToPDF = async (
  element: HTMLElement,
  filename: string,
  orientation: 'portrait' | 'landscape' = 'portrait',
  _format: string | number[] = 'a4'
) => {
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      try { await document.fonts.ready; } catch (e) {}
    }

    const canvas = await html2canvas(element, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        sanitizeClonedDoc(clonedDoc);
        if (clonedElement) {
          clonedElement.style.transform = 'none';
        }
        // Clean up input fields to look like plain crisp typography in PDF
        const inputs = clonedElement.querySelectorAll('input, textarea, select');
        inputs.forEach((input) => {
          const htmlInput = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          const span = clonedDoc.createElement('span');
          span.textContent = htmlInput.value || (htmlInput as any).placeholder || '';
          span.className = (htmlInput.className || '').replace(/tracking-\S+/g, '');
          span.style.border = 'none';
          span.style.background = 'transparent';
          span.style.outline = 'none';
          span.style.padding = '0';
          span.style.boxShadow = 'none';
          span.style.letterSpacing = 'normal';
          if (htmlInput.parentNode) {
            htmlInput.parentNode.replaceChild(span, htmlInput);
          }
        });
      },
    });

    return createA4PaginatedPDF(canvas, filename, orientation);
  } catch (err) {
    console.error('Error exporting DOM element to PDF:', err);
    return false;
  }
};

/**
 * Generate Contract Canvas (Captures on-screen DOM element or creates official luxury standalone legal contract)
 */
export const generateContractCanvas = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<HTMLCanvasElement | null> => {
  let targetElement: HTMLElement | null = null;

  if (elementOrId instanceof HTMLElement) {
    targetElement = elementOrId;
  } else if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  }

  // If on-screen element exists, capture it directly with high-fidelity clone
  if (targetElement) {
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          sanitizeClonedDoc(clonedDoc);
          // Convert input fields and textareas to clean typography
          const inputs = clonedElement.querySelectorAll('input, textarea');
          inputs.forEach((input) => {
            const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
            const span = clonedDoc.createElement('span');
            span.textContent = htmlInput.value || htmlInput.placeholder || '';
            span.className = htmlInput.className.replace(/tracking-\S+/g, '');
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.outline = 'none';
            span.style.padding = '0';
            span.style.boxShadow = 'none';
            span.style.letterSpacing = 'normal';
            span.style.wordSpacing = 'normal';
            if (htmlInput.parentNode) {
              htmlInput.parentNode.replaceChild(span, htmlInput);
            }
          });
        },
      });
      if (canvas) return canvas;
    } catch (err) {
      console.warn('Could not capture existing DOM contract element, using standalone fallback:', err);
    }
  }

  // Standalone luxury legal contract matching exact presidential Kayan design
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '880px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '32px';
  container.style.boxSizing = 'border-box';

  container.innerHTML = `
    <div style="border: 4px double #1e1b4b; padding: 28px; border-radius: 14px; background: #ffffff; position: relative; box-shadow: inset 0 0 0 1px #e2e8f0;">
      
      <!-- Top Decorative Gold Accent Bar -->
      <div style="height: 6px; background: linear-gradient(90deg, #1e1b4b 0%, #d97706 50%, #1e1b4b 100%); border-radius: 4px; margin-bottom: 20px;"></div>

      <!-- Header Branding with Official Logo -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e1b4b; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="68" height="68" alt="KAYAN Badge" style="border-radius: 12px; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #1e1b4b; line-height: 1.2;">
              KAYAN EVENTS & TOURS
            </h1>
            <h2 style="margin: 3px 0 0 0; font-size: 16px; font-weight: 800; color: #d97706;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات'}
            </h2>
            <p style="margin: 4px 0 0 0; font-size: 11.5px; color: #64748b; font-weight: 700;">
              سجل تجاري وترخيص رحلات رقم: 98231 • هاتف الدعم والتعاقدات: ${settings.supportPhone || '01038574977'}
            </p>
          </div>
        </div>

        <div style="text-align: right; background: #f8fafc; border: 1.5px solid #cbd5e1; padding: 10px 16px; border-radius: 10px; min-width: 170px;">
          <div style="font-size: 11px; color: #64748b; font-weight: 800; margin-bottom: 2px;">رقم العقد المعتمد:</div>
          <div style="font-size: 14px; font-weight: 900; color: #1e1b4b; font-family: monospace; letter-spacing: 0.5px;">#${contract.id.toUpperCase()}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 800;">التاريخ: ${contract.createdAt}</div>
        </div>
      </div>

      <!-- Contract Header Title Ribbon -->
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 14px 20px; border-radius: 10px; text-align: center; margin-bottom: 22px; border-right: 6px solid #d97706; box-shadow: 0 4px 10px rgba(30,27,75,0.15);">
        <h2 style="margin: 0; font-size: 19px; font-weight: 900; color: #ffffff; letter-spacing: 0.2px;">${contract.title}</h2>
        <span style="font-size: 12px; color: #fde047; font-weight: 800; display: block; margin-top: 4px;">عقد رسمي معتمد ملزم بجميع الآثار القانونية والمالية صادر عن شركة كيان</span>
      </div>

      <!-- Legal Preamble -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px 18px; border-radius: 10px; margin-bottom: 22px; font-size: 13px; line-height: 1.9; color: #0f172a;">
        <p style="margin: 0 0 10px 0; font-weight: 800; font-size: 13.5px; color: #1e1b4b;">
          إنه في يوم <span style="color: #d97706; text-decoration: underline;">${contract.createdAt}</span> الموافق، بمدينة <span style="color: #1e1b4b; text-decoration: underline;">${contract.location || 'القاهرة / الإسماعيلية'}</span>، تم بحمد الله وتوفيقه إبرام هذا العقد والاتفاق القانوني بين كل من:
        </p>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: 10px; space-y: 6px;">
          <p style="margin: 4px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الأول (المنظم المعتمد):</strong> شركة كيان لتنظيم الفعاليات والرحلات والمؤتمرات (KAYAN Events & Tours)، ويمثلها بالتعاقد إدارة الفعالية، هاتف التواصل: <span style="font-weight: 900; color: #047857;">${settings.supportPhone || '01038574977'}</span>.
          </p>
          <p style="margin: 6px 0; font-size: 13px;">
            <strong style="color: #1e1b4b; font-size: 13.5px;">الطرف الثاني (الجهة المتعاقدة / العميل):</strong> السيد / المنشأة: <strong style="background: #fef3c7; padding: 2px 8px; border-radius: 4px; color: #78350f; font-size: 14px;">${contract.partyName}</strong>، هاتف: <strong style="color: #0f172a; font-family: monospace;">${contract.partyPhone}</strong> ${contract.partyNationalId ? `، الرقم القومي / السجل: <strong style="color: #0f172a; font-family: monospace;">${contract.partyNationalId}</strong>` : ''}.
          </p>
        </div>
      </div>

      <!-- Financial Table -->
      <div style="margin-bottom: 24px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14.5px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e1b4b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">1</span>
          البنود والشروط المالية والتكاليف المعتمدة
        </h3>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 13px;">
          <thead>
            <tr style="background: #1e1b4b; color: #ffffff; font-weight: 800;">
              <th style="padding: 10px; border: 1px solid #cbd5e1;">إجمالي قيمة العقد</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">المبلغ المدفوع (العربون)</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">المبلغ المتبقي المستحق</th>
              <th style="padding: 10px; border: 1px solid #cbd5e1;">طريقة السداد</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #ffffff; font-weight: 900;">
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 15px; font-family: monospace;">${(contract.totalCost ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #047857; font-size: 15px; background: #f0fdf4; font-family: monospace;">${(contract.depositPaid ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #be123c; font-size: 15px; background: #fff1f2; font-family: monospace;">${(contract.remainingBalance ?? 0).toLocaleString()} ج.م</td>
              <td style="padding: 12px; border: 1px solid #cbd5e1; color: #1e1b4b; font-weight: 800;">${(contract as any).paymentMethod || 'نقداً / تحويل بنكي'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Clauses List -->
      <div style="margin-bottom: 26px;">
        <h3 style="margin: 0 0 10px 0; font-size: 14.5px; font-weight: 900; color: #1e1b4b; display: flex; align-items: center; gap: 8px;">
          <span style="background: #1e1b4b; color: #ffffff; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">2</span>
          البنود والالتزامات القانونية المتبادلة بين الطرفين
        </h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${(contract.clauseNotes || []).map((clause, idx) => `
            <div style="display: flex; align-items: flex-start; gap: 8px; background: #f8fafc; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #1e293b; font-weight: 600;">
              <span style="background: #1e1b4b; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px; shrink: 0;">بند ${idx + 1}</span>
              <div style="flex: 1;">${clause}</div>
            </div>
          `).join('')}
          <div style="display: flex; align-items: flex-start; gap: 8px; background: #fefce8; padding: 9px 14px; border-radius: 8px; border-right: 4px solid #d97706; font-size: 12.5px; line-height: 1.7; color: #713f12; font-weight: 700;">
            <span style="background: #d97706; color: #ffffff; font-size: 11px; font-weight: 900; border-radius: 4px; padding: 2px 7px; shrink: 0;">إقرار</span>
            <div style="flex: 1;">يلتزم الطرفان بكافة البنود والشروط المذكورة أعلاه، وفي حالة الإخلال يتحمل الطرف المخالف كافة الآثار القانونية والمالية والشروط الجزائية المترتبة على ذلك.</div>
          </div>
        </div>
      </div>

      <!-- Signatures Area -->
      <div style="margin-top: 32px; border-top: 2px solid #e2e8f0; padding-top: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
        <!-- Left in LTR / Right in RTL: First Party Kayan -->
        <div style="width: 47%; text-align: center;">
          <p style="margin: 0; font-size: 13.5px; font-weight: 900; color: #1e1b4b;">توقيع وخاتم الطرف الأول (شركة كيان)</p>
          <div style="margin-top: 12px; min-height: 125px; display: flex; align-items: center; justify-content: center;">
            <svg width="140" height="140" viewBox="0 0 260 260" style="transform: rotate(-8deg);">
              <defs>
                <path id="pdfSealTopArc" d="M 32, 130 A 98,98 0 1,1 228, 130" fill="none" />
                <path id="pdfSealBottomArc" d="M 228, 130 A 98,98 0 1,1 32, 130" fill="none" />
              </defs>
              <circle cx="130" cy="130" r="124" fill="none" stroke="#1d4ed8" stroke-width="3.5" stroke-dasharray="14 3" opacity="0.9" />
              <circle cx="130" cy="130" r="117" fill="none" stroke="#1d4ed8" stroke-width="2" />
              <circle cx="130" cy="130" r="82" fill="none" stroke="#1d4ed8" stroke-width="2.5" stroke-dasharray="6 2" opacity="0.9" />
              <circle cx="130" cy="130" r="76" fill="none" stroke="#1d4ed8" stroke-width="1.5" />
              <text fill="#1d4ed8" font-size="13" font-weight="900" font-family="'Tajawal', sans-serif">
                <textPath href="#pdfSealTopArc" startOffset="50%" text-anchor="middle">شركة كيان لتنظيم الفعاليات والرحلات</textPath>
              </text>
              <text fill="#1d4ed8" font-size="10.5" font-weight="800" font-family="sans-serif">
                <textPath href="#pdfSealBottomArc" startOffset="50%" text-anchor="middle">KAYAN EVENTS & ORGANIZING SERVICES</textPath>
              </text>
              <g fill="#1d4ed8">
                <path d="M 38 130 L 40 126 L 44 126 L 41 129 L 42 133 L 38 131 L 34 133 L 35 129 L 32 126 L 36 126 Z" />
                <path d="M 222 130 L 224 126 L 228 126 L 225 129 L 226 133 L 222 131 L 218 133 L 219 129 L 216 126 L 220 126 Z" />
              </g>
              <rect x="62" y="114" width="136" height="32" rx="4" fill="#ffffff" stroke="#1d4ed8" stroke-width="2" />
              <text x="130" y="134" text-anchor="middle" fill="#1d4ed8" font-size="12" font-weight="900" font-family="'Tajawal', sans-serif">معتمد رسمياً • OFFICIAL SEAL</text>
              <text x="130" y="162" text-anchor="middle" fill="#1d4ed8" font-size="9.5" font-weight="800" font-family="monospace">ترخيص رقم: 98231 • 2026</text>
            </svg>
          </div>
        </div>

        <!-- Left in RTL / Second Party Client -->
        <div style="width: 47%; text-align: center;">
          <p style="margin: 0; font-size: 13.5px; font-weight: 900; color: #1e1b4b;">توقيع الطرف الثاني (العميل / المقاول)</p>
          <div style="margin-top: 12px; height: 85px; border: 2px dashed #cbd5e1; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa; padding: 8px;">
            <span style="font-size: 13.5px; color: #0f172a; font-weight: 900;">${contract.partyName}</span>
            <span style="font-size: 11px; color: #94a3b8; font-weight: 700; margin-top: 6px;">التوقيع بالموافقة والاعتماد الرسمي</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 28px; text-align: center; font-size: 10.5px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; font-weight: 600;">
        وثيقة تعاقد رسمية معتمدة صادرة إلكترونياً من نظام كيان لإدارة الفعاليات والرحلات • KAYAN Events Official Legal Contract Document
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating fallback contract canvas:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate PDF for any of the 7 Contract Types with perfect Arabic Typography and Official KAYAN Branding
 */
export const generateContractPDF = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
) => {
  const canvas = await generateContractCanvas(contract, settings, elementOrId);
  if (!canvas) {
    alert('حدث خطأ أثناء إعداد وثيقة العقد للتصدير');
    return;
  }

  const partyNameStr = contract.partyName || contract.id || 'OFFICIAL';
  const sanitizedName = partyNameStr.replace(/[^\w\u0600-\u06FF]/g, '_');
  const filename = `KAYAN_Contract_${contract.type || 'Official'}_${sanitizedName}.pdf`;

  return createA4PaginatedPDF(
    canvas,
    filename,
    'portrait',
    `عقد_${contract.title || 'كيان'}_${partyNameStr}`
  );
};

/**
 * Download Contract as High-Resolution Image (HD PNG)
 */
export const exportContractAsHighResImage = async (
  contract: ContractData,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<{ success: boolean; filename: string; dataUrl?: string }> => {
  const filename = `KAYAN_Contract_${contract.type}_${contract.partyName}.png`;

  try {
    const canvas = await generateContractCanvas(contract, settings, elementOrId);
    if (!canvas) {
      return { success: false, filename };
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
            URL.revokeObjectURL(url);
          }, 3000);

          resolve({
            success: true,
            filename,
            dataUrl: canvas.toDataURL('image/png'),
          });
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          resolve({ success: true, filename, dataUrl });
        }
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error exporting contract as high-res image:', err);
    return { success: false, filename };
  }
};

/**
 * Constructs a fully enriched official ReceiptVoucher for any student
 * Ensures all financial details, remaining amount, and detailed reason match official standards
 */
export const createStudentReceiptVoucher = (
  student: Student,
  settings: TripSettings,
  existingReceipt?: Partial<ReceiptVoucher> | null
): ReceiptVoucher => {
  const isFull = (student.remainingAmount ?? 0) <= 0 || (student.totalAmount - student.paidAmount <= 0);
  const remainingFormatted = (student.remainingAmount || 0).toLocaleString();
  const tripName = settings.tripName || 'فعاليات كيان';

  const defaultReason = isFull
    ? `سداد قيمة تذكرة رحلة (${tripName}) بالكامل - كود: ${student.ticketCode} - أتوبيس ${student.busNumber || '-'} مقعد #${student.seatNumber || '-'}`
    : `سداد عربون / دفعة حجز تذكرة رحلة (${tripName}) - كود: ${student.ticketCode} - المتبقي: ${remainingFormatted} ج.م`;

  return {
    id: existingReceipt?.id || `rc-${student.id}`,
    voucherNumber: existingReceipt?.voucherNumber || `RC-${student.ticketCode}`,
    type: 'receipt',
    personName: student.name,
    personPhone: student.phone,
    amount: student.paidAmount,
    amountInWords: numberToArabicWords(student.paidAmount),
    reason:
      existingReceipt?.reason &&
      !existingReceipt.reason.startsWith('حجز تذكرة ') &&
      existingReceipt.reason.length > 10
        ? existingReceipt.reason
        : defaultReason,
    paymentMethod: student.paymentMethod || existingReceipt?.paymentMethod || 'cash',
    date: existingReceipt?.date || new Date().toISOString().slice(0, 10),
    supervisorName: existingReceipt?.supervisorName || 'إدارة الحجوزات والمالية',
    totalAmount: student.totalAmount,
    previousPaid: existingReceipt?.previousPaid ?? 0,
    previousRemaining: existingReceipt?.previousRemaining ?? student.totalAmount,
    paidNow: existingReceipt?.paidNow ?? student.paidAmount,
    totalPaidSoFar: existingReceipt?.totalPaidSoFar ?? student.paidAmount,
    currentRemaining: student.remainingAmount,
    isDeposit: !isFull,
    isFullyPaid: isFull,
  };
};

/**
 * Generate Receipt or Payment Voucher Canvas (Captures on-screen DOM element or creates official luxury standalone voucher)
 */
export const generateReceiptCanvas = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<HTMLCanvasElement | null> => {
  let targetElement: HTMLElement | null = null;

  if (elementOrId instanceof HTMLElement) {
    targetElement = elementOrId;
  } else if (typeof elementOrId === 'string') {
    targetElement = document.getElementById(elementOrId);
  }

  // If on-screen element exists, capture it directly with high-fidelity clone
  // BUT on mobile or if targetElement is scaled down, bypass live DOM and use the dedicated
  // 780px official template to guarantee 100% parity with laptop quality!
  const isMobileOrNarrow =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || (targetElement && targetElement.offsetWidth < 650));

  if (targetElement && !isMobileOrNarrow) {
    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        onclone: (clonedDoc, clonedElement) => {
          sanitizeClonedDoc(clonedDoc);
          // Convert input fields and textareas to clean typography
          const inputs = clonedElement.querySelectorAll('input, textarea');
          inputs.forEach((input) => {
            const htmlInput = input as HTMLInputElement | HTMLTextAreaElement;
            const span = clonedDoc.createElement('span');
            span.textContent = htmlInput.value || htmlInput.placeholder || '';
            span.className = htmlInput.className;
            span.style.border = 'none';
            span.style.background = 'transparent';
            span.style.outline = 'none';
            span.style.padding = '0';
            span.style.boxShadow = 'none';
            if (htmlInput.parentNode) {
              htmlInput.parentNode.replaceChild(span, htmlInput);
            }
          });
        },
      });
      if (canvas) return canvas;
    } catch (err) {
      console.warn('Could not capture existing DOM voucher element, using standalone fallback:', err);
    }
  }

  // Standalone luxury voucher matching exact official design
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '780px';
  container.style.minWidth = '780px';
  container.style.maxWidth = '780px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const isReceipt = voucher.type === 'receipt';
  const title = isReceipt ? '(Receipt Voucher) إيصال استلام نقدية' : '(Payment Voucher) إيصال صرف نقدية';
  const themeBorder = isReceipt ? '#064e3b' : '#991b1b';
  const headerGradient = isReceipt
    ? 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #064e3b 100%)'
    : 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)';
  const amountWords = voucher.amountInWords || `${voucher.amount} جنيه مصري لا غير`;

  // Financial Settlement Breakdown values
  const totalAmount = voucher.totalAmount ?? voucher.amount;
  const paidNow = voucher.paidNow ?? voucher.amount;
  const previousPaid = voucher.previousPaid ?? 0;
  const previousRemaining = voucher.previousRemaining ?? Math.max(0, totalAmount - previousPaid);
  const totalPaidSoFar = voucher.totalPaidSoFar ?? (previousPaid + paidNow);
  const currentRemaining = voucher.currentRemaining ?? Math.max(0, totalAmount - totalPaidSoFar);
  const isSettled = voucher.isFullyPaid ?? (currentRemaining <= 0);
  const showFinancialBreakdown = (voucher.totalAmount !== undefined && voucher.totalAmount > 0) || voucher.previousPaid !== undefined || voucher.isDeposit || isSettled || previousPaid > 0 || currentRemaining > 0;

  // Enhance reason if it was a legacy/short reason missing remaining amount and financial breakdown details
  let displayReason = voucher.reason || (isReceipt ? 'عربون / دفعة حجز رحلة' : 'مصروفات رحلة معتمدة');
  if (displayReason.startsWith('حجز تذكرة ') && !displayReason.includes('المتبقي')) {
    if (currentRemaining > 0) {
      displayReason = `سداد عربون / دفعة حجز تذكرة رحلة (${settings.tripName || 'فعاليات كيان'}) - المتبقي: ${currentRemaining.toLocaleString()} ج.م`;
    } else {
      displayReason = `سداد قيمة تذكرة رحلة (${settings.tripName || 'فعاليات كيان'}) بالكامل - خالص السداد ✓`;
    }
  }

  container.innerHTML = `
    <div style="border: 6px double ${themeBorder}; padding: 24px; border-radius: 20px; background: #ffffff; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.08); font-family: 'Tajawal', sans-serif;">
      
      <!-- Subtle Background Watermark Stamp -->
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.035; pointer-events: none; select: none;">
        <svg viewBox="0 0 300 300" width="320" height="320">
          <circle cx="150" cy="150" r="140" fill="none" stroke="#064e3b" stroke-width="8" stroke-dasharray="6,4"/>
          <circle cx="150" cy="150" r="120" fill="none" stroke="#064e3b" stroke-width="4"/>
          <circle cx="150" cy="150" r="85" fill="none" stroke="#064e3b" stroke-width="2"/>
          <text x="150" y="145" text-anchor="middle" font-family="'Tajawal', sans-serif" font-size="22" font-weight="900" fill="#064e3b">KAYAN EVENTS</text>
          <text x="150" y="170" text-anchor="middle" font-family="'Tajawal', sans-serif" font-size="14" font-weight="700" fill="#064e3b">إدارة مالية معتمدة</text>
        </svg>
      </div>

      <!-- Top Header Banner -->
      <div style="background: ${headerGradient}; color: #ffffff; padding: 16px 20px; border-radius: 14px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.25);">
        
        <!-- Right side (in RTL): Company Name & Title -->
        <div style="text-align: right; flex: 1;">
          <h1 style="margin: 0; font-size: 21px; font-weight: 900; color: #fde047; line-height: 1.2;">
            ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
          </h1>
          <p style="margin: 3px 0 0 0; font-size: 13px; font-weight: 700; color: #ffffff;">
            ${title}
          </p>
        </div>

        <!-- Left side (in RTL): Voucher Number & Date -->
        <div style="text-align: left; background: rgba(0, 0, 0, 0.25); padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); min-width: 170px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 3px;">
            <span style="color: #cbd5e1; font-weight: 700;">رقم:</span>
            <strong style="color: #fde047; font-family: monospace; font-size: 14px; font-weight: 900;">${voucher.voucherNumber}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px;">
            <span style="color: #cbd5e1; font-weight: 700;">التاريخ:</span>
            <strong style="color: #ffffff; font-family: monospace; font-size: 13px;">${voucher.date}</strong>
          </div>
        </div>
      </div>

      <!-- Amount Display Box -->
      <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 14px 18px; border-radius: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 16px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
        
        <!-- Amount in Numbers (Right in RTL) -->
        <div style="background: #ffffff; border: 1px solid #fde68a; padding: 6px 16px; border-radius: 10px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #64748b; font-size: 12px; font-weight: 700;">المبلغ بالأرقام:</span>
          <strong style="font-size: 24px; font-weight: 900; color: #065f46; font-family: monospace;">
            ${(voucher.amount ?? 0).toLocaleString()}
          </strong>
          <span style="font-size: 14px; font-weight: 900; color: #065f46;">ج.م</span>
        </div>

        <!-- Amount in Words / Tafqit (Left in RTL) -->
        <div style="flex: 1; background: #ffffff; border: 1px solid #fde68a; padding: 8px 14px; border-radius: 10px; text-align: left;">
          <span style="color: #64748b; font-size: 10px; display: block; font-weight: 700; margin-bottom: 1px;">المبلغ بالحروف (التفقيط):</span>
          <strong style="font-size: 13px; font-weight: 800; color: #065f46; display: block;">
            ${amountWords}
          </strong>
        </div>
      </div>

      <!-- Main Voucher Details Table / Rows -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; margin-bottom: 20px; font-size: 13px;">
        
        <!-- Person Name -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">${isReceipt ? 'استلمنا من السيد/ة:' : 'صرفنا إلى السيد/ة:'}</span>
          <strong style="color: #0f172a; font-size: 16px; font-weight: 900; background: #ffffff; padding: 3px 14px; border-radius: 6px; border: 1px solid #e2e8f0;">
            ${voucher.personName}
          </strong>
        </div>

        <!-- Reason / Purpose -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">وذلك عن قيمة (السبب):</span>
          <strong style="color: #0f172a; font-size: 14px; font-weight: 800;">
            ${displayReason}
          </strong>
        </div>

        <!-- Payment Method -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">طريقة السداد:</span>
          <strong style="color: #1e1b4b; background: #e0e7ff; border: 1px solid #c7d2fe; padding: 3px 12px; border-radius: 6px; font-family: monospace; font-weight: 900; font-size: 13px;">
            ${(voucher.paymentMethod || 'CASH').toUpperCase()}
          </strong>
        </div>

        <!-- Event / Trip Name -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #475569; font-weight: 700; font-size: 13px;">الفعالية / الرحلة:</span>
          <strong style="color: #0f172a; font-size: 14px; font-weight: 900;">
            ${settings.tripName || 'فعاليات شركة كيان'}
          </strong>
        </div>
      </div>

      ${showFinancialBreakdown ? `
      <!-- Financial Settlement Breakdown Block (كشف الحركة والمركز المالي) -->
      <div style="background: ${isSettled ? '#f0fdf4' : '#fffbeb'}; border: 2px solid ${isSettled ? '#86efac' : '#fde68a'}; border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; font-size: 12px; font-family: 'Tajawal', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid ${isSettled ? '#bbf7d0' : '#fef3c7'}; padding-bottom: 6px;">
          <strong style="color: ${isSettled ? '#166534' : '#92400e'}; font-size: 13px; font-weight: 900; display: flex; align-items: center; gap: 6px;">
            ${isSettled ? '✓ كشف تسوية وتصفية الحساب (خالص السداد بالكامل)' : '⏳ كشف وتفصيل حركة سداد العربون/الدفعة'}
          </strong>
          ${isSettled ? `
            <span style="background: #15803d; color: #ffffff; padding: 3px 12px; border-radius: 20px; font-weight: 900; font-size: 11px; border: 1px solid #166534; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
              ✓ خالص السداد بالكامل
            </span>
          ` : `
            <span style="background: #f59e0b; color: #ffffff; padding: 3px 12px; border-radius: 20px; font-weight: 900; font-size: 11px; border: 1px solid #d97706;">
              عربون / سداد جزئي
            </span>
          `}
        </div>

        <div style="display: flex; gap: 8px; justify-content: space-between; text-align: center;">
          
          <div style="flex: 1; background: #ffffff; padding: 8px 6px; border-radius: 8px; border: 1px solid #cbd5e1;">
            <span style="font-size: 10px; color: #64748b; font-weight: 700; display: block; margin-bottom: 2px;">المبلغ الإجمالي الكلي</span>
            <strong style="font-size: 14px; color: #0f172a; font-weight: 900; font-family: monospace;">${totalAmount.toLocaleString()} ج.م</strong>
          </div>

          ${previousPaid > 0 ? `
          <div style="flex: 1; background: #ffffff; padding: 8px 6px; border-radius: 8px; border: 1px solid #fed7aa;">
            <span style="font-size: 10px; color: #c2410c; font-weight: 700; display: block; margin-bottom: 2px;">المدفوع سابقاً (عربون)</span>
            <strong style="font-size: 14px; color: #ea580c; font-weight: 900; font-family: monospace;">${previousPaid.toLocaleString()} ج.م</strong>
            <span style="font-size: 9px; color: #9a3412; font-weight: 700; display: block; margin-top: 1px;">وكان باقي: ${previousRemaining.toLocaleString()} ج.م</span>
          </div>
          ` : ''}

          <div style="flex: 1; background: #ffffff; padding: 8px 6px; border-radius: 8px; border: 2px solid #16a34a; box-shadow: 0 2px 5px rgba(22, 163, 74, 0.12);">
            <span style="font-size: 10px; color: #15803d; font-weight: 800; display: block; margin-bottom: 2px;">المدفوع حالياً (الإيصال)</span>
            <strong style="font-size: 15px; color: #16a34a; font-weight: 900; font-family: monospace;">${paidNow.toLocaleString()} ج.م</strong>
          </div>

          <div style="flex: 1; background: #ffffff; padding: 8px 6px; border-radius: 8px; border: 1px solid #cbd5e1;">
            <span style="font-size: 10px; color: #334155; font-weight: 700; display: block; margin-bottom: 2px;">إجمالي المدفوع حتى الآن</span>
            <strong style="font-size: 14px; color: #0f172a; font-weight: 900; font-family: monospace;">${totalPaidSoFar.toLocaleString()} ج.م</strong>
          </div>

          <div style="flex: 1; background: ${currentRemaining > 0 ? '#fff1f2' : '#f0fdf4'}; padding: 8px 6px; border-radius: 8px; border: 1px solid ${currentRemaining > 0 ? '#fecdd3' : '#86efac'};">
            <span style="font-size: 10px; color: ${currentRemaining > 0 ? '#be123c' : '#15803d'}; font-weight: 800; display: block; margin-bottom: 2px;">
              ${currentRemaining > 0 ? 'المتبقي للسداد' : 'الموقف المالي'}
            </span>
            <strong style="font-size: 14px; color: ${currentRemaining > 0 ? '#e11d48' : '#16a34a'}; font-weight: 900; font-family: monospace;">
              ${currentRemaining > 0 ? `${currentRemaining.toLocaleString()} ج.م` : 'خالص السداد ✓'}
            </strong>
          </div>

        </div>
      </div>
      ` : ''}

      <!-- Signatures & Official Stamp Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 1px dashed #cbd5e1; margin-bottom: 12px;">
        
        <!-- Recipient / Client Signature (Right in RTL) -->
        <div style="width: 45%; text-align: center;">
          <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 800;">توقيع المستلم / العميل</p>
          <div style="margin-top: 28px; border-b: 2px dashed #94a3b8; height: 1px; width: 80%; margin-left: auto; margin-right: auto;"></div>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px; font-family: monospace;">التوقيع / البصمة</span>
        </div>

        <!-- Accountant / Supervisor Signature & Official Stamp (Left in RTL) -->
        <div style="width: 45%; text-align: center; position: relative;">
          <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 800;">المحاسب / المشرف المسؤول</p>
          
          <!-- Official Blue Circular Stamp Graphic -->
          <div style="position: absolute; top: -18px; left: 10px; width: 95px; height: 95px; pointer-events: none; opacity: 0.92; transform: rotate(-8deg);">
            <svg viewBox="0 0 200 200" width="95" height="95">
              <circle cx="100" cy="100" r="94" fill="none" stroke="#1d4ed8" stroke-width="4" stroke-dasharray="6,3"/>
              <circle cx="100" cy="100" r="82" fill="none" stroke="#1d4ed8" stroke-width="2.5"/>
              <circle cx="100" cy="100" r="56" fill="none" stroke="#1d4ed8" stroke-width="1.5"/>
              
              <!-- Top Curved Text -->
              <path id="sealTop" d="M 30,100 A 70,70 0 0,1 170,100" fill="none"/>
              <text font-size="14" font-weight="900" fill="#1d4ed8" text-anchor="middle">
                <textPath href="#sealTop" startOffset="50%">شركة كيان لتنظيم الرحلات</textPath>
              </text>
              
              <!-- Center Official Text -->
              <text x="100" y="94" text-anchor="middle" font-size="12" font-weight="900" fill="#1d4ed8">سند معتمد</text>
              <text x="100" y="112" text-anchor="middle" font-size="10" font-weight="800" fill="#1d4ed8">• OFFICIAL •</text>
              
              <!-- Bottom Curved Text -->
              <path id="sealBot" d="M 170,100 A 70,70 0 0,1 30,100" fill="none"/>
              <text font-size="13" font-weight="900" fill="#1d4ed8" text-anchor="middle">
                <textPath href="#sealBot" startOffset="50%">إدارة الحسابات والمالية</textPath>
              </text>
            </svg>
          </div>

          <div style="margin-top: 24px;">
            <strong style="color: #0f172a; font-size: 14px; font-weight: 900; display: block;">
              ${voucher.supervisorName || 'إدارة مالية شركة كيان'}
            </strong>
          </div>
        </div>
      </div>

      <!-- Footnote -->
      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 10px; font-weight: 600;">
        إيصال نقدية رسمي معتمد صادر من نظام كيان لإدارة الرحلات
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating fallback receipt canvas:', err);
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Receipt or Payment Voucher PDF with exact dimensions (Never cuts off content)
 */
export const generateReceiptPDF = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
) => {
  const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
  if (!canvas) {
    alert('حدث خطأ أثناء إعداد السند للطباعة والتصدير');
    return;
  }

  const sanitizedPerson = (voucher.personName || 'عميل').replace(/[^\w\u0600-\u06FF]/g, '_');
  const filename = `KAYAN_Voucher_${voucher.voucherNumber || '001'}_${sanitizedPerson}.pdf`;

  return createA4PaginatedPDF(
    canvas,
    filename,
    'portrait',
    `سند_${voucher.voucherNumber}_${voucher.personName}`
  );
};

/**
 * Download Receipt Voucher as High-Resolution Image (HD PNG)
 */
export const exportReceiptAsHighResImage = async (
  voucher: ReceiptVoucher,
  settings: TripSettings,
  elementOrId?: HTMLElement | string | null
): Promise<{ success: boolean; filename: string; dataUrl?: string }> => {
  const sanitizedPerson = (voucher.personName || 'عميل').replace(/[^\w\u0600-\u06FF]/g, '_');
  const filename = `KAYAN_Voucher_${voucher.voucherNumber || 'RC-001'}_${sanitizedPerson}.png`;

  try {
    const canvas = await generateReceiptCanvas(voucher, settings, elementOrId);
    if (!canvas) {
      return { success: false, filename };
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          triggerFileDownload(blob, filename);
          resolve({
            success: true,
            filename,
            dataUrl: canvas.toDataURL('image/png'),
          });
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          triggerFileDownload(dataUrl, filename);
          resolve({ success: true, filename, dataUrl });
        }
      }, 'image/png', 1.0);
    });
  } catch (err) {
    console.error('Error exporting receipt as high-res image:', err);
    return { success: false, filename };
  }
};

/**
 * Direct 2D Canvas VIP Boarding Pass Renderer
 * Guaranteed 100% offline, zero-network, zero CSS bugs, instantaneous execution on all mobile & desktop browsers
 */
/**
 * Pure HTML5 2D Canvas High-Resolution VIP Digital Boarding Pass
 * Guaranteed 100% offline, zero-network, zero CSS bugs, instantaneous execution on all mobile & desktop browsers.
 * Replicates the exact visual structure, designs, luxury dark gradient, golden borders, tear cutouts, and pills from the official ticket.
 */
export const drawTicketPassToCanvas = async (
  student: Student,
  settings: TripSettings
): Promise<HTMLCanvasElement> => {
  // Delegate directly to generateStudentTicketCanvas for 100% pixel-perfect replica of the digital ticket card
  try {
    const renderedCanvas = await generateStudentTicketCanvas(student, settings);
    if (renderedCanvas && renderedCanvas.width > 0) {
      return renderedCanvas;
    }
  } catch (canvasGenErr) {
    console.warn('generateStudentTicketCanvas delegation failed, proceeding to fallback renderer:', canvasGenErr);
  }

  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch (_) {}
  }

  // Base canvas logical dimensions (Compact VIP Portrait aspect ratio matching on-screen card)
  const logicalWidth = 800;
  const logicalHeight = 960;
  const scale = 2; // Retina 2x resolution (1600x1920) for crystal clear HD rendering

  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.scale(scale, scale);

  // Helper for rounded rectangle with cross-browser fallback
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') {
      (ctx as any).roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    }
    ctx.closePath();
  };

  // 0. Dark Canvas Outer Frame (Matching screenshot modal backdrop)
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  const cardX = 20;
  const cardY = 20;
  const cardW = 760;
  const cardH = 920;
  const cardRadius = 24;

  // 1. Luxury Dark Card Gradient
  drawRoundedRect(cardX, cardY, cardW, cardH, cardRadius);
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, '#020617');
  cardGrad.addColorStop(0.45, '#0f172a');
  cardGrad.addColorStop(1, '#1e1b4b');
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // 2. Amber / Gold Outer Border
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.stroke();

  // 3. Primary Tear Notch Cutouts (Left and Right Centers)
  const notchY = cardY + cardH / 2;
  const notchRadius = 16;
  ctx.fillStyle = '#060913';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
  ctx.lineWidth = 2.5;

  // Left tear notch
  ctx.beginPath();
  ctx.arc(cardX, notchY, notchRadius, -Math.PI / 2, Math.PI / 2, false);
  ctx.fill();
  ctx.stroke();

  // Right tear notch
  ctx.beginPath();
  ctx.arc(cardX + cardW, notchY, notchRadius, Math.PI / 2, (3 * Math.PI) / 2, false);
  ctx.fill();
  ctx.stroke();

  // Small scalloped dots along left and right edges
  const scallopPositions = [cardY + 80, cardY + 160, cardY + cardH - 160, cardY + cardH - 80];
  scallopPositions.forEach((posY) => {
    // Left dot
    ctx.beginPath();
    ctx.arc(cardX, posY, 4.5, -Math.PI / 2, Math.PI / 2, false);
    ctx.fillStyle = '#060913';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Right dot
    ctx.beginPath();
    ctx.arc(cardX + cardW, posY, 4.5, Math.PI / 2, (3 * Math.PI) / 2, false);
    ctx.fillStyle = '#060913';
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Load Base64 Images safely
  const loadImg = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

  const [badgeImg, logoImg] = await Promise.all([
    loadImg(cachedKayanBadgeBase64),
    loadImg(cachedKayanLogoBase64),
  ]);

  // 4. Header Bar (Top RTL: Badge + Company Info + Official Title | Left: Ticket Code Pill)
  const headerY = cardY + 22;

  // Right circular badge (diameter 48)
  const badgeCenterX = cardX + cardW - 50;
  const badgeCenterY = headerY + 26;
  if (badgeImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(badgeCenterX, badgeCenterY, 24, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(badgeImg, badgeCenterX - 24, badgeCenterY - 24, 48, 48);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(badgeCenterX, badgeCenterY, 24, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Small green check circle at bottom right of badge
    ctx.beginPath();
    ctx.arc(badgeCenterX + 16, badgeCenterY + 16, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#020617';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✓', badgeCenterX + 16, badgeCenterY + 19);
  }

  // Company Name & Official Subtitle (RTL)
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';

  // Green verification pill [ معتمدة ✓ ]
  const greenPillW = 62;
  const greenPillH = 22;
  const greenPillX = cardX + cardW - 84 - 230 - greenPillW; // positioned nicely next to title
  drawRoundedRect(greenPillX, headerY + 4, greenPillW, greenPillH, 6);
  ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px "Tajawal", system-ui, sans-serif';
  ctx.fillText('معتمدة ✓', greenPillX + greenPillW / 2, headerY + 19);

  // Title: Fun Day الـ + شركة كيان لتنظيم رحلات
  ctx.textAlign = 'right';
  ctx.font = 'bold 15px "Tajawal", system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Fun Day الـ ', cardX + cardW - 84, headerY + 20);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(settings.companyNameAr || 'شركة كيان لتنظيم رحلات', cardX + cardW - 162, headerY + 20);

  // Subtitle: OFFICIAL BOARDING PASS • تذكرة صعود رقمية رسمية
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10.5px monospace, "Tajawal", sans-serif';
  ctx.fillText('OFFICIAL BOARDING PASS • تذكرة صعود رقمية رسمية', cardX + cardW - 84, headerY + 42);

  // Left: Ticket Code Box
  const codeBoxX = cardX + 20;
  const codeBoxY = headerY;
  const codeBoxW = 145;
  const codeBoxH = 54;
  drawRoundedRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 10);
  ctx.fillStyle = '#211708';
  ctx.fill();
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#d97706';
  ctx.font = 'bold 10px "Tajawal", sans-serif';
  ctx.fillText('كود التذكرة', codeBoxX + codeBoxW / 2, codeBoxY + 18);

  const ticketCodeFormatted = student.ticketCode.startsWith('KYN') ? student.ticketCode : `KYN-${student.ticketCode}`;
  ctx.fillStyle = '#fbbf24';
  ctx.font = '900 15px monospace';
  ctx.fillText(`#${ticketCodeFormatted}`, codeBoxX + codeBoxW / 2, codeBoxY + 42);

  // Divider below header
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 20, cardY + 86);
  ctx.lineTo(cardX + cardW - 20, cardY + 86);
  ctx.stroke();

  // 5. Official Promotional Banner Strip
  const bannerX = cardX + 20;
  const bannerY = cardY + 98;
  const bannerW = cardW - 40;
  const bannerH = 100;

  drawRoundedRect(bannerX, bannerY, bannerW, bannerH, 14);
  ctx.save();
  ctx.clip();
  if (logoImg) {
    ctx.drawImage(logoImg, bannerX, bannerY, bannerW, bannerH);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  }
  const bannerOverlay = ctx.createLinearGradient(bannerX, bannerY, bannerX, bannerY + bannerH);
  bannerOverlay.addColorStop(0, 'rgba(2, 6, 23, 0.7)');
  bannerOverlay.addColorStop(1, 'rgba(2, 6, 23, 0.88)');
  ctx.fillStyle = bannerOverlay;
  ctx.fillRect(bannerX, bannerY, bannerW, bannerH);
  ctx.restore();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.stroke();

  // Overlaid Pills on Banner:
  // Left Pill: KAYAN TOURS & EVENTS
  drawRoundedRect(bannerX + 12, bannerY + 54, 185, 34, 8);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 11px monospace';
  ctx.fillText('KAYAN TOURS & EVENTS', bannerX + 12 + 185 / 2, bannerY + 75);

  // Right Pill: Trip Name
  const tripPillW = 270;
  const tripPillX = bannerX + bannerW - 12 - tripPillW;
  drawRoundedRect(tripPillX, bannerY + 54, tripPillW, 34, 8);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 12px "Tajawal", sans-serif';
  ctx.fillText(`✨ ${settings.tripName || "El-Sherif IS '27 | Official Fun Day"}`, tripPillX + tripPillW / 2, bannerY + 76);

  // 6. Main Content Area (Two Columns Layout in RTL)
  // Left Column (QR Stub): x = cardX + 20, w = 226, h = 616
  // Right Column (Passenger details): x = cardX + 262, w = 478, h = 616
  const stubX = cardX + 20;
  const stubW = 226;
  const stubH = 616;
  const detailsX = cardX + 262;
  const detailsW = 478;

  // --- LEFT COLUMN: QR STUB ---
  drawRoundedRect(stubX, cardY + 212, stubW, stubH, 14);
  ctx.fillStyle = 'rgba(13, 21, 39, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 2;
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.restore();

  // QR Code generation
  const qrPayload = JSON.stringify({
    ticket: student.ticketCode,
    name: student.name,
    bus: student.busNumber,
    seat: student.seatNumber || 'N/A',
    phone: student.phone,
    pickup: student.pickupPoint || '',
    status: student.paymentStatus,
  });

  const qrCanvas = document.createElement('canvas');
  try {
    await QRCode.toCanvas(qrCanvas, qrPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (_) {}

  // White Box for QR Code
  const qrBoxW = 202;
  const qrBoxH = 210;
  const qrBoxX = stubX + 12;
  const qrBoxY = cardY + 224;

  drawRoundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (qrCanvas.width > 0) {
    ctx.drawImage(qrCanvas, qrBoxX + (qrBoxW - 140) / 2, qrBoxY + 12, 140, 140);
  }

  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#020617';
  ctx.font = '900 12px monospace';
  ctx.fillText(`KYN - ${ticketCodeFormatted}`, qrBoxX + qrBoxW / 2, qrBoxY + 185);

  // Verification Tag below QR
  ctx.direction = 'rtl';
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText('✓ تذكرة صعود إلكترونية معتمدة', stubX + stubW / 2, cardY + 465);

  // Simulated Barcode Box
  const barcodeBoxW = 202;
  const barcodeBoxH = 60;
  const barcodeBoxX = stubX + 12;
  const barcodeBoxY = cardY + 540;

  drawRoundedRect(barcodeBoxX, barcodeBoxY, barcodeBoxW, barcodeBoxH, 10);
  ctx.fillStyle = '#020617';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Simulated barcode stripes
  const barStart = barcodeBoxX + 12;
  const bars = [2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 5, 1, 3, 2, 4, 1, 5, 2, 3, 1, 4, 2, 4, 1, 3, 2, 5, 2];
  let bX = barStart;
  ctx.fillStyle = '#f8fafc';
  bars.forEach((w) => {
    ctx.fillRect(bX, barcodeBoxY + 12, w, 24);
    bX += w + 3.5;
  });
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.direction = 'ltr';
  ctx.fillText(`VERIFIED PASS #${ticketCodeFormatted}`, barcodeBoxX + barcodeBoxW / 2, barcodeBoxY + 49);

  // --- RIGHT COLUMN: PASSENGER & LOGISTICS DETAILS ---
  const rightEdgeX = detailsX + detailsW - 8;

  // Header row: المسافر (right) & هاتف (left)
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText('المسافر:', rightEdgeX, cardY + 230);

  ctx.textAlign = 'left';
  ctx.direction = 'ltr';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText(`هـاتـف: ${student.phone}`, detailsX + 8, cardY + 230);

  // Passenger Name
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 26px "Tajawal", sans-serif';
  ctx.fillText(student.name, rightEdgeX, cardY + 266);

  // Badges Row: Role & Faculty
  const roleBadge = student.customRole || (student.participantRole && (student as any).participantRoleLabel) || 'ADMIN KAYAN 👑';
  const facultyBadge = student.faculty || 'نظم ومعلومات';

  // Role pill (Amber)
  drawRoundedRect(rightEdgeX - 130, cardY + 282, 130, 26, 6);
  ctx.fillStyle = '#271a06';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText(roleBadge, rightEdgeX - 65, cardY + 299);

  // Faculty pill (Slate)
  drawRoundedRect(rightEdgeX - 130 - 10 - 110, cardY + 282, 110, 26, 6);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 11px "Tajawal", sans-serif';
  ctx.fillText(facultyBadge, rightEdgeX - 130 - 10 - 55, cardY + 299);

  // Logistics Details Card
  const logCardY = cardY + 322;
  const logCardH = 250;
  drawRoundedRect(detailsX, logCardY, detailsW, logCardH, 14);
  ctx.fillStyle = 'rgba(12, 19, 34, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Row 1: Destination & Date
  const formattedDate = formatTripDateSafely(settings.tripDate);

  // Right: Trip and Destination
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10.5px "Tajawal", sans-serif';
  ctx.fillText('الرحلة والوجهة:', rightEdgeX - 12, logCardY + 22);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 12.5px "Tajawal", sans-serif';
  ctx.fillText(settings.tripName || 'رحلة اليوم الترفيهي', rightEdgeX - 12, logCardY + 40);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px "Tajawal", sans-serif';
  ctx.fillText(settings.destination || 'قريه الجوهره', rightEdgeX - 12, logCardY + 56);

  // Left: Date
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 10.5px "Tajawal", sans-serif';
  ctx.fillText('تاريخ وتوقيت الرحلة:', detailsX + 175, logCardY + 22);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText(formattedDate, detailsX + 175, logCardY + 44);

  // Divider Line inside Logistics Card
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(detailsX + 12, logCardY + 66);
  ctx.lineTo(detailsX + detailsW - 12, logCardY + 66);
  ctx.stroke();

  // Row 2: Bus & Seat Box + Payment Box side-by-side
  const subBoxW = 222;
  const subBoxH = 64;
  const subBoxY = logCardY + 76;

  // Bus & Seat Box (Right)
  const busBoxX = detailsX + detailsW - 12 - subBoxW;
  drawRoundedRect(busBoxX, subBoxY, subBoxW, subBoxH, 10);
  ctx.fillStyle = '#131937';
  ctx.fill();
  ctx.strokeStyle = '#3730a3';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9.5px "Tajawal", sans-serif';
  ctx.fillText('الحافلة والمقعد 🚎:', busBoxX + subBoxW - 10, subBoxY + 18);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px "Tajawal", sans-serif';
  ctx.fillText(`أتوبيس (${student.busNumber})`, busBoxX + subBoxW - 10, subBoxY + 38);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 11px "Tajawal", sans-serif';
  ctx.fillText(`مقعد رقم ${student.seatNumber || 'حر'}`, busBoxX + subBoxW - 10, subBoxY + 54);

  // Payment Status Box (Left)
  const payBoxX = detailsX + 12;
  drawRoundedRect(payBoxX, subBoxY, subBoxW, subBoxH, 10);
  ctx.fillStyle = '#131937';
  ctx.fill();
  ctx.strokeStyle = '#3730a3';
  ctx.lineWidth = 1;
  ctx.stroke();

  const paymentText = student.isFreeTicket
    ? 'تذكرة مجانية VIP 🎁'
    : student.paymentStatus === 'paid'
    ? 'خالص السداد بالكامل ✅'
    : `عربون مسدد (${(student.paidAmount || 0).toLocaleString()} ج.م)`;

  const paymentSubText = student.isFreeTicket
    ? 'تذكرة ضيافة VIP'
    : student.remainingAmount > 0
    ? `متبقي: ${(student.remainingAmount || 0).toLocaleString()} ج.م`
    : 'كامل الرسوم مسددة';

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9.5px "Tajawal", sans-serif';
  ctx.fillText('الموقف المالي والسداد 💳:', payBoxX + subBoxW - 10, subBoxY + 18);

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText(paymentText, payBoxX + subBoxW - 10, subBoxY + 38);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '9.5px "Tajawal", sans-serif';
  ctx.fillText(paymentSubText, payBoxX + subBoxW - 10, subBoxY + 54);

  // Row 3: Addons / Inclusions
  const mealInfo = getStudentMealInfo(student, settings);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 10.5px "Tajawal", sans-serif';
  ctx.fillText('✨ الخدمات والإضافات المشمولة بالحجز:', rightEdgeX - 12, logCardY + 162);

  // Meal Inclusions Card
  const mealCardX = detailsX + 12;
  const mealCardY = logCardY + 174;
  const mealCardW = detailsW - 24;
  const mealCardH = 46;

  drawRoundedRect(mealCardX, mealCardY, mealCardW, mealCardH, 8);
  ctx.fillStyle = '#0a0e1a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9.5px "Tajawal", sans-serif';
  ctx.fillText('وجبة طعام: 🍔', mealCardX + mealCardW - 10, mealCardY + 18);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 11.5px "Tajawal", sans-serif';
  ctx.fillText(mealInfo.mealName || 'وجبة طعام مميزة مشمولة بالبرنامج', mealCardX + mealCardW - 10, mealCardY + 36);

  // Green pill on the left of meal card
  drawRoundedRect(mealCardX + 10, mealCardY + 12, 70, 22, 5);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 10px "Tajawal", sans-serif';
  ctx.fillText('مشمولة 🎫', mealCardX + 45, mealCardY + 27);

  // Bottom Logistics Bar (Pickup, National ID, Emergency Phone)
  const bottomBarX = detailsX;
  const bottomBarY = cardY + 584;
  const bottomBarW = detailsW;
  const bottomBarH = 40;

  drawRoundedRect(bottomBarX, bottomBarY, bottomBarW, bottomBarH, 10);
  ctx.fillStyle = '#070c18';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pickup location (Right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 9.5px "Tajawal", sans-serif';
  ctx.fillText('📍 التجمع:', bottomBarX + bottomBarW - 8, bottomBarY + 25);

  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 10px "Tajawal", sans-serif';
  const pickupText = student.pickupPoint || settings.assemblyLocation || 'شارع الاستاد - عند جامع الاستاد';
  ctx.fillText(pickupText.length > 25 ? `${pickupText.substring(0, 24)}...` : pickupText, bottomBarX + bottomBarW - 55, bottomBarY + 25);

  // National ID (Center)
  if (student.nationalId) {
    ctx.direction = 'ltr';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "Tajawal", sans-serif';
    ctx.fillText('ID القومي:', bottomBarX + 175, bottomBarY + 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(student.nationalId, bottomBarX + 225, bottomBarY + 25);
  }

  // Emergency Phone (Left)
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f43f5e';
  ctx.font = 'bold 9.5px "Tajawal", sans-serif';
  ctx.fillText('📞 طوارئ:', bottomBarX + 10, bottomBarY + 25);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(student.emergencyPhone || settings.supportPhone || '01067575051', bottomBarX + 58, bottomBarY + 25);

  return canvas;
};

/**
 * Generate Student Digital Pass HTML Canvas (Renders an exact, pixel-perfect VIP Boarding Pass at standard fixed desktop width)
 */
export const generateStudentTicketCanvas = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<HTMLCanvasElement | null> => {
  // 1. Direct On-Screen DOM Element Capture (Used on Desktop/Laptop when width >= 680px)
  // On mobile (< 768px or offsetWidth < 680px), the on-screen card flex-wraps vertically into a long, tall column.
  // We strictly bypass live DOM on mobile and use the dedicated 820px horizontal landscape boarding pass
  // so the downloaded ticket is wide, horizontal, high-resolution, and matches the laptop view 100%!
  const targetDomElem =
    (elementId
      ? document.getElementById(`${elementId}-frame`) || document.getElementById(elementId)
      : null) ||
    document.getElementById(`kayan-digital-ticket-${student.id}-frame`) ||
    document.getElementById(`kayan-digital-ticket-${student.id}`);

  const isMobileOrNarrow =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || (targetDomElem && targetDomElem.offsetWidth < 680));

  if (targetDomElem && !isMobileOrNarrow) {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
        } catch (_) {}
      }

      // Wait for all images inside target to load
      const domImages = Array.from(targetDomElem.querySelectorAll('img'));
      await Promise.all(
        domImages.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve(true);
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            })
        )
      );

      // Method 1: html-to-image native SVG canvas (Preserves exact DOM/CSS, zero oklab issues, 100% replica)
      try {
        const domCanvas = await htmlToImageToCanvas(targetDomElem, {
          pixelRatio: 2.5,
          backgroundColor: '#060913',
          skipFonts: true,
          cacheBust: true,
        });

        if (domCanvas && domCanvas.width > 0) {
          return domCanvas;
        }
      } catch (htiErr) {
        console.warn('html-to-image on live DOM failed, trying html2canvas:', htiErr);
      }

      // Method 2: html2canvas with sanitized styles
      const domCanvas = await html2canvas(targetDomElem, {
        scale: 2.5,
        backgroundColor: '#060913',
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById(`${elementId}-frame`);
          if (frame) {
            frame.style.width = '750px';
            frame.style.maxWidth = '750px';
            frame.style.minWidth = '750px';
            frame.style.margin = '0 auto';
            frame.style.boxSizing = 'border-box';
            frame.style.backgroundColor = '#060913';
          }
          sanitizeClonedDoc(clonedDoc);
        },
      });

      if (domCanvas && domCanvas.width > 0) {
        return domCanvas;
      }
    } catch (domCaptureErr) {
      console.warn('Direct DOM capture fallback error:', domCaptureErr);
    }
  }

  // 2. Offscreen Dedicated Container (Guarantees identical 820px desktop landscape boarding pass on ALL devices)
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '820px';
  container.style.minWidth = '820px';
  container.style.maxWidth = '820px';
  container.style.background = '#020617';
  container.style.color = '#f8fafc';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  container.style.padding = '0';
  container.style.margin = '0';
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-9999';

  // 1. Generate QR Code locally via offline Canvas/DataURL with zero network lag or CORS failures
  let qrDataUrl = '';
  try {
    const qrPayload = JSON.stringify({
      ticket: student.ticketCode,
      name: student.name,
      bus: student.busNumber,
      seat: student.seatNumber || 'N/A',
      phone: student.phone,
      pickup: student.pickupPoint || '',
      status: student.paymentStatus,
    });
    qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (qrErr) {
    console.warn('Local QRCode fallback error:', qrErr);
    const qrData = encodeURIComponent(
      JSON.stringify({
        ticket: student.ticketCode,
        name: student.name,
        bus: student.busNumber,
        seat: student.seatNumber || 'N/A',
        phone: student.phone,
      })
    );
    qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${qrData}`;
  }

  const formattedDate = formatTripDateSafely(settings.tripDate);

  const paymentText =
    student.isFreeTicket
      ? 'تذكرة مجانية VIP 🎁'
      : student.paymentStatus === 'paid'
      ? 'خالص السداد بالكامل ✅'
      : `عربون (${(student.paidAmount || 0).toLocaleString()} ج.م)`;

  const selectedAddonsList = (settings.addons || []).filter((a) => (student.selectedAddonIds || []).includes(a.id));

  // Inline SVG icons with fixed geometries to eliminate any icon-dropping or text-misalignment bugs
  const busSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2V6c0-1.7-1.3-3-3-3H4C2.3 3 1 4.3 1 6v8c0 .4.1.8.2 1.2l.8 2.8h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`;
  const walletSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`;
  const shirtSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c084fc" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`;
  const mealSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="m18 15-2 2a4 4 0 0 1-6 0l-2-2"/><path d="m15 11 1 1a2 2 0 0 1 0 3l-1 1"/><path d="m9 11-1 1a2 2 0 0 0 0 3l1 1"/><circle cx="12" cy="7" r="4"/></svg>`;
  const pinSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
  const phoneSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
  const checkSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>`;

  container.innerHTML = `
    <div style="width: 820px; box-sizing: border-box; position: relative; background: linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e1b4b 100%); border: 2.5px solid #f59e0b; border-radius: 28px; padding: 24px 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); overflow: hidden; direction: rtl; font-family: 'Tajawal', sans-serif;">
      <!-- Scalloped Notched Edges on Left and Right -->
      <div style="position: absolute; left: -8px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 0; z-index: 30; pointer-events: none;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
      </div>

      <div style="position: absolute; right: -8px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 16px 0; z-index: 30; pointer-events: none;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #090d16; border: 1px solid rgba(245, 158, 11, 0.5);"></div>
      </div>

      <!-- Primary Tear Notch Cutouts -->
      <div style="position: absolute; left: -16px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: #090d16; border-right: 2px solid rgba(245, 158, 11, 0.8); z-index: 30;"></div>
      <div style="position: absolute; right: -16px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 50%; background: #090d16; border-left: 2px solid rgba(245, 158, 11, 0.8); z-index: 30;"></div>

      <!-- Top Header Logo & Company Info -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(245, 158, 11, 0.35); padding-bottom: 12px; margin-bottom: 12px; box-sizing: border-box;">
        <!-- Right: Circular Logo Badge & Company Title -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="position: relative; width: 54px; height: 54px; flex-shrink: 0;">
            <img src="${cachedKayanBadgeBase64}" width="54" height="54" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #fde047; object-fit: cover; display: block; box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);" />
          </div>
          <div style="text-align: right;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="font-size: 17px; font-weight: 900; color: #fde047; font-family: 'Tajawal', sans-serif; line-height: 1.3;">
                ${settings.companyNameAr || 'شركة كيان لتنظيم رحلات الـ Fun Day'}
              </div>
              <div style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.5); font-size: 11px; padding: 2px 8px; border-radius: 6px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; line-height: 1.2;">
                ${checkSvg} معتمدة
              </div>
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 3px; font-family: 'Tajawal', sans-serif; line-height: 1.2;">
              تذكرة صعود رقمية رسمية • OFFICIAL BOARDING PASS
            </div>
          </div>
        </div>

        <!-- Left: Golden Ticket Code Pill -->
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.35) 100%); color: #fde047; border: 1.5px solid rgba(245, 158, 11, 0.7); font-size: 15px; font-weight: 900; font-family: monospace; padding: 6px 18px; border-radius: 14px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); text-align: center; line-height: 1.3;">
            <div style="font-size: 9.5px; color: rgba(253, 224, 71, 0.9); font-family: 'Tajawal', sans-serif; margin-bottom: 2px;">كود التذكرة</div>
            #${student.ticketCode}
          </div>
        </div>
      </div>

      <!-- KAYAN Official Promotional Brand Banner -->
      <div style="position: relative; margin-bottom: 12px; border-radius: 16px; overflow: hidden; border: 1px solid rgba(245, 158, 11, 0.45); height: 95px; background: #020617; box-sizing: border-box;">
        <img src="${cachedKayanLogoBase64}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; opacity: 0.95;" alt="KAYAN Banner" />
        <div style="position: absolute; inset: 0; background: linear-gradient(0deg, rgba(2,6,23,0.85) 0%, rgba(2,6,23,0.1) 50%, rgba(2,6,23,0.4) 100%); pointer-events: none;"></div>
        
        <div style="position: absolute; top: 10px; right: 14px; left: 14px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; box-sizing: border-box; z-index: 10;">
          <div style="background: rgba(2, 6, 23, 0.94); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.65); font-size: 11.5px; font-weight: 900; padding: 6px 14px; border-radius: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); box-sizing: border-box;">
            <span style="font-size: 11px;">✨</span>
            <span>${settings.tripName || 'fun day نظم الشريف 2027'}</span>
          </div>
          <div style="background: rgba(2, 6, 23, 0.94); color: #e2e8f0; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 11px; font-family: monospace; font-weight: 800; padding: 6px 14px; border-radius: 10px; letter-spacing: 0.5px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.5); box-sizing: border-box;">
            KAYAN TOURS & EVENTS
          </div>
        </div>
      </div>

      <!-- Main Content Grid: Main Details (Right in RTL) + Stub (Left in RTL) -->
      <div style="display: flex; gap: 16px; align-items: stretch; direction: rtl; box-sizing: border-box;">
        <!-- Right Section: Student & Trip Details -->
        <div style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; text-align: right; box-sizing: border-box;">
          <!-- Student Header -->
          <div style="margin-bottom: 8px; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
              <span style="font-size: 12px; color: #94a3b8; font-weight: 600;">المسافر:</span>
              <span style="font-size: 12px; color: #94a3b8; font-family: monospace;">هاتف: <strong style="color: #e2e8f0;">${student.phone}</strong></span>
            </div>
            <div style="font-size: 25px; font-weight: 900; color: #ffffff; margin-top: 1px; line-height: 1.25; font-family: 'Tajawal', sans-serif;">
              ${student.name}
            </div>
            ${
              student.faculty || student.customRole
                ? `
            <div style="font-size: 12.5px; color: #fde047; font-weight: 700; margin-top: 2px; line-height: 1.3;">
              ${student.faculty ? student.faculty : ''}
              ${student.customRole ? ` • <span style="color: #67e8f9;">${student.customRole}</span>` : ''}
            </div>
            `
                : ''
            }
          </div>

          <!-- Outer Logistics Box -->
          <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(51, 65, 85, 0.9); border-radius: 16px; padding: 10px 14px; margin-bottom: 8px; box-sizing: border-box;">
            <!-- Row 1: Trip & Date -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding-bottom: 8px; border-bottom: 1px solid #1e293b; box-sizing: border-box;">
              <!-- Trip & Destination -->
              <div>
                <span style="color: #94a3b8; font-size: 10.5px; display: block; line-height: 1.2;">الرحلة والوجهة:</span>
                <strong style="color: #fde047; font-size: 13.5px; font-weight: 900; display: block; margin-top: 2px; line-height: 1.3;">${settings.tripName}</strong>
                ${settings.destination ? `<span style="color: #cbd5e1; font-size: 11.5px; display: block; margin-top: 2px; line-height: 1.2;">${settings.destination}</span>` : ''}
              </div>

              <!-- Date & Time -->
              <div>
                <span style="color: #94a3b8; font-size: 10.5px; display: block; line-height: 1.2;">تاريخ وتوقيت الرحلة:</span>
                <strong style="color: #ffffff; font-size: 13.5px; font-weight: 800; display: block; margin-top: 2px; line-height: 1.3;">${formattedDate}</strong>
                ${student.departureTime ? `<span style="color: #34d399; font-size: 11.5px; font-weight: 700; display: block; margin-top: 2px; line-height: 1.2;">${student.departureTime}</span>` : ''}
              </div>
            </div>

            <!-- Row 2: Sub-pills (Bus/Seat & Financial/Payment Status) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-top: 8px; box-sizing: border-box;">
              <!-- Bus & Seat Pill -->
              <div style="background: rgba(30, 27, 75, 0.85); border: 1px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 8px 12px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  ${busSvg}
                  <span style="color: #94a3b8; font-size: 10.5px; font-weight: 700; line-height: 1.2;">الحافلة والمقعد:</span>
                </div>
                <strong style="color: #ffffff; font-size: 13.5px; font-weight: 900; display: block; margin-top: 2px; line-height: 1.3;">أتوبيس (${student.busNumber})</strong>
                <span style="color: #fde047; font-size: 12px; font-weight: 800; display: block; margin-top: 2px; line-height: 1.2;">${student.seatNumber ? `مقعد رقم ${student.seatNumber}` : 'مقعد حر'}</span>
              </div>

              <!-- Financial Payment Status Pill -->
              <div style="background: rgba(30, 27, 75, 0.85); border: 1px solid rgba(99, 102, 241, 0.45); border-radius: 12px; padding: 8px 12px; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  ${walletSvg}
                  <span style="color: #94a3b8; font-size: 10.5px; font-weight: 700; line-height: 1.2;">الموقف المالي والسداد:</span>
                </div>
                <strong style="color: #34d399; font-size: 13.5px; font-weight: 900; display: block; margin-top: 2px; line-height: 1.3;">${paymentText}</strong>
                <span style="color: #cbd5e1; font-size: 11px; font-weight: 600; display: block; margin-top: 2px; line-height: 1.2;">${student.isFreeTicket ? 'تذكرة ضيافة VIP' : student.remainingAmount > 0 ? `متبقي: ${student.remainingAmount.toLocaleString()} ج.م` : 'كامل الرسوم مسددة'}</span>
              </div>
            </div>

            <!-- Row 3: Dynamic Tshirt and Meal Cards -->
            ${(() => {
              const mealInfo = getStudentMealInfo(student, settings);
              const hasTshirt = Boolean(
                student.tshirtSize &&
                student.tshirtSize !== 'none'
              );
              const hasMeal = Boolean(mealInfo.hasMeal);

              if (!hasTshirt && !hasMeal) return '';

              const isTwoCols = hasTshirt && hasMeal;
              const gridTemplate = isTwoCols ? 'grid-template-columns: 1fr 1fr;' : 'grid-template-columns: 1fr;';

              return `
                <div style="display: grid; ${gridTemplate} gap: 10px; margin-top: 8px; box-sizing: border-box;">
                  ${
                    hasTshirt
                      ? `
                    <!-- Tshirt Status Box -->
                    <div style="background: rgba(2, 6, 23, 0.85); border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; box-sizing: border-box;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${shirtSvg}
                        <div>
                          <span style="color: #94a3b8; font-size: 10px; display: block; line-height: 1.2;">تيشيرت الفعالية:</span>
                          <strong style="color: #d8b4fe; font-weight: 900; font-size: 12px; line-height: 1.3;">
                            مقاس (${student.tshirtSize || 'L'})
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span style="background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.5); font-size: 9.5px; padding: 3px 8px; border-radius: 5px; font-weight: 800; line-height: 1.2;">
                          ${student.tshirtReceived ? 'تم الاستلام ✓' : 'مشمول بالحجز 🎫'}
                        </span>
                      </div>
                    </div>
                  `
                      : ''
                  }

                  ${
                    hasMeal
                      ? `
                    <!-- Meal Status Box -->
                    <div style="background: rgba(2, 6, 23, 0.85); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 12px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; box-sizing: border-box;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        ${mealSvg}
                        <div>
                          <span style="color: #94a3b8; font-size: 10px; display: block; line-height: 1.2;">وجبة الغداء:</span>
                          <strong style="color: #fde047; font-weight: 900; font-size: 12px; line-height: 1.3;">
                            ${mealInfo.mealName}
                          </strong>
                        </div>
                      </div>
                      <div>
                        <span style="background: rgba(245, 158, 11, 0.2); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.5); font-size: 9.5px; padding: 3px 8px; border-radius: 5px; font-weight: 800; white-space: nowrap; line-height: 1.2;">
                          ${student.mealReceived ? 'تم الاستلام ✓' : 'مشمولة بالحجز 🎫'}
                        </span>
                      </div>
                    </div>
                  `
                      : ''
                  }
                </div>
              `;
            })()}

            <!-- Extra Addons -->
            ${(() => {
              const uniqueOtherAddons = selectedAddonsList.filter((a) => {
                const name = (a.name || '').toLowerCase();
                return (
                  !name.includes('وجب') &&
                  !name.includes('غداء') &&
                  !name.includes('عشاء') &&
                  !name.includes('فطار') &&
                  !name.includes('تيشرت') &&
                  !name.includes('تي شيرت') &&
                  !name.includes('هود') &&
                  !name.includes('hoodie') &&
                  !name.includes('سويت')
                );
              });

              if (uniqueOtherAddons.length === 0) return '';

              return `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #1e293b; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; box-sizing: border-box;">
                <span style="color: #a5b4fc; font-size: 10.5px; font-weight: 700;">⚡ الخدمات المخصصة:</span>
                ${uniqueOtherAddons
                  .map(
                    (a) =>
                      `<span style="background: rgba(99, 102, 241, 0.2); color: #c7d2fe; border: 1px solid rgba(99, 102, 241, 0.4); font-size: 10px; padding: 2px 7px; border-radius: 4px; font-weight: 700; line-height: 1.2;">✓ ${a.name}</span>`
                  )
                  .join('')}
              </div>
            `;
            })()}

            <!-- Companion Details if present -->
            ${
              student.hasCompanion && student.companionName
                ? `
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #1e293b; font-size: 11.5px; color: #cbd5e1; display: flex; justify-content: space-between; box-sizing: border-box;">
                <span>👥 مرافق الحجز: <strong style="color: #ffffff;">${student.companionName}</strong></span>
                <span style="color: #fde047;">${student.companionSeatNumber ? `مقعد #${student.companionSeatNumber}` : ''} (${student.companionTShirtSize || 'L'})</span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Full-Width Bottom Bar with Pickup, National ID & Emergency -->
          <div style="background: #020617; border: 1px solid rgba(245, 158, 11, 0.45); border-radius: 12px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; flex-wrap: wrap; gap: 8px; box-sizing: border-box;">
            <div style="color: #cbd5e1; display: flex; align-items: center; gap: 6px; line-height: 1;">
              ${pinSvg}
              <span style="color: #94a3b8; font-weight: 700;">التجمع:</span>
              <strong style="color: #fde047; font-weight: 800;">${student.pickupPoint || settings.assemblyLocation || 'جامع الاستاد - كفرالشيخ'}</strong>
            </div>

            <div style="display: flex; align-items: center; gap: 14px;">
              ${
                student.nationalId
                  ? `
                <div style="color: #cbd5e1; display: flex; align-items: center; gap: 5px; line-height: 1;">
                  <span style="background: #2563eb; color: white; padding: 2px 5px; border-radius: 4px; font-size: 9px; font-weight: 900; line-height: 1; display: inline-block; vertical-align: middle;">ID</span>
                  <span style="color: #94a3b8; font-weight: 700; font-family: 'Tajawal', sans-serif;">القومي:</span>
                  <strong style="color: #ffffff; font-family: monospace; font-size: 11px; font-weight: 700;" dir="ltr">${student.nationalId}</strong>
                </div>
              `
                  : ''
              }

              <div style="color: #cbd5e1; display: flex; align-items: center; gap: 5px; line-height: 1;">
                ${phoneSvg}
                <span style="color: #f43f5e; font-weight: 800; font-family: 'Tajawal', sans-serif;">طوارئ:</span>
                <strong style="color: #ffffff; font-family: monospace; font-size: 11px; font-weight: 700;" dir="ltr">${student.emergencyPhone || settings.supportPhone || '01006735016'}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Left Section: White QR Code Box & Barcode Graphic (Verification Stub) -->
        <div style="width: 215px; background: rgba(15, 23, 42, 0.75); border-radius: 20px; padding: 14px; border: 2px dashed rgba(245, 158, 11, 0.45); display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; box-sizing: border-box; flex-shrink: 0;">
          <!-- White QR Box -->
          <div style="background: #ffffff; padding: 10px; border-radius: 16px; border: 2px solid #f59e0b; box-shadow: 0 8px 20px rgba(0,0,0,0.5); text-align: center; width: 100%; box-sizing: border-box;">
            <img src="${qrDataUrl}" width="155" height="155" alt="QR Code" style="display: block; margin: 0 auto; width: 155px; height: 155px; border-radius: 6px;" />
            <div style="font-size: 13px; font-weight: 900; font-family: monospace; color: #020617; margin-top: 6px; line-height: 1.2;">
              KYN - ${student.ticketCode}
            </div>
          </div>

          <!-- Official Verification Tag -->
          <div style="font-size: 11.5px; color: #34d399; font-weight: 800; margin: 6px 0; display: flex; align-items: center; justify-content: center; gap: 4px; line-height: 1.2;">
            ${checkSvg}
            <span>تذكرة صعود إلكترونية معتمدة</span>
          </div>

          <!-- Barcode Graphic Strip -->
          <div style="width: 100%; background: #020617; border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 8px 6px; text-align: center; box-sizing: border-box;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 2px; height: 22px; overflow: hidden;">
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 5px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 6px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 5px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 2px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 4px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 1px; height: 100%; background: #f8fafc;"></div>
              <div style="width: 3px; height: 100%; background: #f8fafc;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Wait for fonts and all images inside container to finish loading completely
    if (document.fonts) {
      await document.fonts.ready;
    }
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) return resolve(true);
            img.onload = () => resolve(true);
            img.onerror = () => resolve(true);
          })
      )
    );

    // Method 1: html-to-image on container
    try {
      const cCanvas = await htmlToImageToCanvas((container.firstElementChild as HTMLElement) || container, {
        pixelRatio: 2.5,
        backgroundColor: '#060913',
        skipFonts: true,
      });
      if (cCanvas && cCanvas.width > 0) {
        return cCanvas;
      }
    } catch (cErr) {
      console.warn('html-to-image on offscreen container failed, trying html2canvas:', cErr);
    }

    // Method 2: html2canvas on container
    const canvas = await html2canvas(container, {
      scale: 2.5,
      backgroundColor: '#060913',
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      onclone: sanitizeClonedDoc,
    });
    return canvas;
  } catch (err) {
    console.error('Error generating standalone ticket canvas, trying live DOM fallback:', err);
    
    // Fallback: Try capturing directly from mounted DOM element if available
    const domTarget = elementId ? document.getElementById(elementId) : document.getElementById(`kayan-digital-ticket-${student.id}`);
    if (domTarget) {
      try {
        const domCanvas = await html2canvas(domTarget, {
          scale: 2.5,
          backgroundColor: '#090d16',
          useCORS: true,
          logging: false,
          onclone: sanitizeClonedDoc,
        });
        return domCanvas;
      } catch (domErr) {
        console.error('DOM fallback canvas also failed:', domErr);
      }
    }
    return null;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Student Digital Pass PDF as Blob & File with luxury styling & barcode layout
 */
export const generateStudentTicketPDFBlob = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<{ blob: Blob; file: File; filename: string } | null> => {
  const safeName = (student.name || 'طالب').replace(/[^\w\u0600-\u06FF]/g, '_');
  const filename = `KAYAN_Ticket_${student.ticketCode}_${safeName}.pdf`;

  const canvas = await generateStudentTicketCanvas(student, settings, elementId);
  if (!canvas || canvas.width === 0) return null;

  try {
    const imgData = canvas.toDataURL('image/png');
    
    // High-res PDF with exact ticket pass dimensions matching visual preview
    const ticketWidth = 175;
    const ticketHeight = (canvas.height * ticketWidth) / canvas.width;
    const orientation = ticketHeight >= ticketWidth ? 'portrait' : 'landscape';

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: [ticketWidth, ticketHeight],
    });

    doc.addImage(imgData, 'PNG', 0, 0, ticketWidth, ticketHeight);

    doc.setProperties({
      title: `تذكرة ${student.name} - ${settings.companyNameAr || 'شركة كيان'}`,
      subject: `تذكرة رقمية #${student.ticketCode}`,
      author: settings.companyNameAr || 'KAYAN Events',
      keywords: 'KAYAN, Ticket, Boarding Pass',
      creator: 'KAYAN Events System',
    });

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    return { blob: pdfBlob, file, filename };
  } catch (err) {
    console.error('Error constructing jsPDF object:', err);
    return null;
  }
};

/**
 * Download Student Digital Pass PDF directly
 */
export const generateStudentTicketPDF = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
) => {
  const result = await generateStudentTicketPDFBlob(student, settings, elementId);
  if (result) {
    triggerFileDownload(result.blob, result.filename);
  }
};

/**
 * Download Student Digital Pass as High-Resolution Image (HD PNG) directly to user's device Downloads
 */
export const exportTicketAsHighResImage = async (
  student: Student,
  settings: TripSettings,
  elementId?: string
): Promise<{ success: boolean; filename: string; blob?: Blob; dataUrl?: string }> => {
  const safeName = (student.name || 'طالب').replace(/[^\w\u0600-\u06FF]/g, '_');
  const filename = `KAYAN_Ticket_${student.ticketCode}_${safeName}.png`;

  try {
    const canvas = await generateStudentTicketCanvas(student, settings, elementId);
    if (!canvas || canvas.width === 0) {
      return { success: false, filename };
    }

    // Direct Blob creation is lightweight and avoids massive memory spikes on mobile
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
    });

    if (!blob) {
      return { success: false, filename };
    }

    // Trigger download with Blob (which handles Web Share on mobile or safe link download on desktop)
    triggerFileDownload(blob, filename);

    // Create a local object URL
    const objectUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename,
      blob,
      dataUrl: objectUrl,
    };
  } catch (err) {
    console.error('Error exporting ticket as high-res image:', err);
    return { success: false, filename };
  }
};

/**
 * Helper to convert numbers to Arabic words (Tafqeet) for Egyptian currency
 */
const numberToArabicCurrencyWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'صفر جنيه مصري';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertGroup = (n: number): string => {
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (h > 0) {
      res += hundreds[h];
    }
    if (remainder > 0) {
      if (res) res += ' و';
      if (remainder < 20) {
        res += ones[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          res += ones[o] + ' و' + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res;
  };

  let n = Math.floor(Math.abs(num));
  if (n === 0) return 'صفر جنيه مصري';

  const parts: string[] = [];

  const millions = Math.floor(n / 1000000);
  n %= 1000000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const units = n;

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  return parts.join(' و') + ' جنيه مصري لا غير';
};

/**
 * Generate Ultra-High Quality, Official PDF Voucher for Main Treasury Transfer (سند تحويل وقيد الخزنة الرئيسية المعتمد)
 */
export const generateTreasuryTransferPDF = async (
  transfer: TreasuryTransfer,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات'
) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '820px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '22px';
  container.style.boxSizing = 'border-box';

  const isWithdrawal = transfer.type === 'direct_withdrawal';
  const typeText =
    transfer.type === 'trip_final_profit'
      ? 'سند تحويل وتوريد صافي أرباح رحلة مكتملة'
      : transfer.type === 'partial_cash_out'
      ? 'سند تصفية وتوريد سيولة نقدية جزئية من الرحلة'
      : transfer.type === 'direct_deposit'
      ? 'سند إيداع نقدي مباشر في الخزنة الرئيسية'
      : 'سند صرف وسحب مصروفات من الخزنة الرئيسية';

  const badgeColor = isWithdrawal ? '#be123c' : '#047857';
  const badgeBg = isWithdrawal ? '#fff1f2' : '#ecfdf5';
  const badgeBorder = isWithdrawal ? '#fecdd3' : '#a7f3d0';

  const amountNumber = transfer.amount ?? 0;
  const tafqeetText = numberToArabicCurrencyWords(amountNumber);

  container.innerHTML = `
    <div style="border: 3px double #d97706; padding: 20px; border-radius: 14px; background: #ffffff; position: relative; box-shadow: inset 0 0 0 1px #e2e8f0;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 16px 20px; border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 10px; border: 2px solid #f59e0b; object-fit: cover;" />
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 0.5px;">KAYAN TREASURY • الإدارة العامة للخزينة</div>
            <h1 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff;">${companyName}</h1>
            <p style="margin: 2px 0 0 0; font-size: 11.5px; font-weight: 700; color: #94a3b8;">منظومة الإدارة المالية والرقابة المحاسبية المركزية</p>
          </div>
        </div>
        <div style="text-align: left; background: rgba(255, 255, 255, 0.08); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="font-size: 10px; color: #cbd5e1;">رقم السند المرجعي:</div>
          <div style="font-size: 14px; font-weight: 900; color: #fbbf24; font-family: monospace; letter-spacing: 0.5px;">#${transfer.referenceNumber}</div>
          <div style="font-size: 9.5px; color: #94a3b8; margin-top: 2px;">تاريخ القيد: ${transfer.date} ${transfer.time}</div>
        </div>
      </div>

      <!-- Voucher Title & Category Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1.5px solid #fde68a; padding: 9px 16px; border-radius: 8px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 13px; font-weight: 900; color: #92400e;">نوع السند:</span>
          <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 900;">
            ${typeText}
          </span>
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #78350f;">
          الحالة: <span style="color: #047857;">مقيد ومطابق دفترياً ✓</span>
        </div>
      </div>

      <!-- Amount Box (Featured) -->
      <div style="background: ${isWithdrawal ? '#fff1f2' : '#fef3c7'}; border: 2px solid ${isWithdrawal ? '#f43f5e' : '#f59e0b'}; padding: 14px 18px; border-radius: 10px; margin-bottom: 14px; text-align: center;">
        <div style="font-size: 12px; font-weight: 800; color: ${isWithdrawal ? '#9f1239' : '#92400e'}; margin-bottom: 2px;">
          المبلغ الصافي المقيد بالسند (${isWithdrawal ? 'سحب / منصرف' : 'إيداع / وارد'}):
        </div>
        <div style="font-size: 26px; font-weight: 900; color: ${isWithdrawal ? '#be123c' : '#b45309'}; font-family: monospace; letter-spacing: 0.5px;">
          ${isWithdrawal ? '-' : '+'}${amountNumber.toLocaleString()} ج.م
        </div>
        <div style="font-size: 12.5px; font-weight: 800; color: ${isWithdrawal ? '#881337' : '#78350f'}; margin-top: 4px; border-top: 1px dashed ${isWithdrawal ? '#fecdd3' : '#fde68a'}; padding-top: 4px;">
          [ فقط ${tafqeetText} ]
        </div>
      </div>

      <!-- Details Matrix Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11.5px; margin-bottom: 16px; border: 1px solid #cbd5e1;">
        <tbody>
          <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; width: 25%; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0;">الرحلة / المصدر:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #0f172a;">${transfer.tripName || 'الخزنة المركزية الرئيسية'}</td>
            <td style="padding: 8px 12px; width: 20%; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">المسؤول المنفذ:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #0f172a;">${transfer.transferredBy}</td>
          </tr>
          <tr style="background: #ffffff; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0;">طبيعة العملية:</td>
            <td style="padding: 8px 12px; font-weight: 800; color: ${isWithdrawal ? '#be123c' : '#047857'};">${typeText}</td>
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">الحساب المودع إليه:</td>
            <td style="padding: 8px 12px; font-weight: 900; color: #1e293b;">الخزنة الرئيسية (KAYAN Master Treasury)</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; font-weight: 800; color: #475569; border-left: 1px solid #e2e8f0; vertical-align: top;">البيان والملاحظات:</td>
            <td colspan="3" style="padding: 8px 12px; color: #334155; font-size: 11px; line-height: 1.6;">
              ${transfer.notes || 'تم ترحيل وقيد المبلغ بالخزنة المركزية وفقاً للأصول المحاسبية المعتمدة للشركة.'}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures & Seal Section -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 14px; margin-top: 12px;">
        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 11px; font-weight: 800; color: #475569;">إعداد وأمين الخزنة</p>
          <strong style="display: block; margin-top: 4px; font-size: 12px; color: #0f172a;">${transfer.transferredBy}</strong>
          <div style="margin-top: 14px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 9.5px; color: #94a3b8; font-family: monospace; display: block; margin-top: 3px;">توقيع المسؤول</span>
        </div>

        <div style="width: 34%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #d97706; background: #fffbeb; padding: 8px 14px; border-radius: 10px;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم الخزنة المركزية</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومقيد 2026</div>
          </div>
        </div>

        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 11px; font-weight: 800; color: #475569;">اعتماد الإدارة العامة والمالية</p>
          <strong style="display: block; margin-top: 4px; font-size: 12px; color: #0f172a;">شركة كيان للفعاليات</strong>
          <div style="margin-top: 14px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 9.5px; color: #94a3b8; font-family: monospace; display: block; margin-top: 3px;">الختم والتوقيع الرسمي</span>
        </div>
      </div>

      <!-- Security / Footer Bar -->
      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        سند مالي إلكتروني رسمي ومؤمن صادر من منظومة الخزنة المركزية لشركة كيان • المرجع: ${transfer.referenceNumber}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2.5,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Fit on A4 Portrait page with standard safe margins so nothing is ever truncated
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    const margin = 12;
    const maxW = pageWidth - (margin * 2);
    const maxH = pageHeight - (margin * 2);

    let renderW = maxW;
    let renderH = (canvas.height * renderW) / canvas.width;

    if (renderH > maxH) {
      renderH = maxH;
      renderW = (canvas.width * renderH) / canvas.height;
    }

    const posX = margin + (maxW - renderW) / 2;
    const posY = margin + (maxH - renderH) / 2;

    doc.addImage(imgData, 'PNG', posX, posY, renderW, renderH);
    saveJsPDFDoc(doc, `KAYAN_Treasury_Transfer_${transfer.referenceNumber}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating treasury transfer PDF:', err);
    fallbackPrintElement(container, transfer.referenceNumber);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Capture an existing DOM element (or use high-definition canvas pass) and download it as PNG image directly to user's device.
 * Guarantees 100% exact match in structure, layout, badges, QR, and colors.
 */
export const exportTicketElementAsPNG = async (
  elementId: string,
  fileName: string,
  student?: Student,
  settings?: TripSettings
): Promise<boolean> => {
  const downloadFileName = fileName.endsWith('.png') ? fileName : `${fileName}.png`;

  // 1. Direct High-Fidelity DOM Capture (Guarantees 100% exact replica of what the user sees on screen)
  const targetElement =
    document.getElementById(`${elementId}-frame`) ||
    document.getElementById(elementId) ||
    (student ? document.getElementById(`kayan-digital-ticket-${student.id}-frame`) : null) ||
    (student ? document.getElementById(`kayan-digital-ticket-${student.id}`) : null);

  // On Mobile or Narrow viewports, live DOM element wraps vertically into a narrow stacked column.
  // To ensure the ticket downloads EXACTLY like on a laptop (wide, high-resolution horizontal boarding pass),
  // we immediately route to generateStudentTicketCanvas which renders the fixed 820px luxury layout!
  const isMobileOrNarrow =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || (targetElement && targetElement.offsetWidth < 680));

  if (student && settings && (isMobileOrNarrow || !targetElement)) {
    try {
      const fbCanvas = await generateStudentTicketCanvas(student, settings, elementId);
      if (fbCanvas && fbCanvas.width > 0) {
        return new Promise((resolve) => {
          fbCanvas.toBlob((blob) => {
            if (blob) {
              triggerFileDownload(blob, downloadFileName);
              resolve(true);
            } else {
              const image = fbCanvas.toDataURL('image/png');
              triggerFileDownload(image, downloadFileName);
              resolve(true);
            }
          }, 'image/png', 1.0);
        });
      }
    } catch (canvasErr) {
      console.warn('generateStudentTicketCanvas fallback error:', canvasErr);
    }
  }

  if (targetElement && !isMobileOrNarrow) {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
        } catch (_) {}
      }

      const domImages = Array.from(targetElement.querySelectorAll('img'));
      await Promise.all(
        domImages.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve(true);
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            })
        )
      );

      // Method 1: Native SVG-based high-fidelity export using html-to-image toBlob (Preserves CSS gradients, fonts, shadows)
      try {
        const blob = await htmlToImageToBlob(targetElement, {
          pixelRatio: 2.5,
          backgroundColor: '#060913',
          skipFonts: true,
          cacheBust: true,
        });

        if (blob && blob.size > 0) {
          triggerFileDownload(blob, downloadFileName);
          return true;
        }
      } catch (blobErr) {
        console.warn('html-to-image toBlob error, falling back to toCanvas:', blobErr);
      }

      // Method 2: html-to-image toCanvas
      try {
        const canvas = await htmlToImageToCanvas(targetElement, {
          pixelRatio: 2.5,
          backgroundColor: '#060913',
          skipFonts: true,
          cacheBust: true,
        });

        if (canvas && canvas.width > 0) {
          return new Promise((resolve) => {
            canvas.toBlob((blob) => {
              if (blob) {
                triggerFileDownload(blob, downloadFileName);
                resolve(true);
              } else {
                const imgData = canvas.toDataURL('image/png');
                triggerFileDownload(imgData, downloadFileName);
                resolve(true);
              }
            }, 'image/png', 1.0);
          });
        }
      } catch (canvasErr) {
        console.warn('html-to-image toCanvas error, trying html2canvas:', canvasErr);
      }

      // Method 3: html2canvas with sanitized styles
      const canvas = await html2canvas(targetElement, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#060913',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1024,
        onclone: (clonedDoc) => {
          const frame = clonedDoc.getElementById(`${elementId}-frame`);
          if (frame) {
            frame.style.width = '750px';
            frame.style.maxWidth = '750px';
            frame.style.minWidth = '750px';
            frame.style.margin = '0 auto';
            frame.style.backgroundColor = '#060913';
          }
          sanitizeClonedDoc(clonedDoc);
        },
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            triggerFileDownload(blob, downloadFileName);
            resolve(true);
          } else {
            const image = canvas.toDataURL('image/png');
            triggerFileDownload(image, downloadFileName);
            resolve(true);
          }
        }, 'image/png', 1.0);
      });
    } catch (err) {
      console.error('Error capturing DOM element for ticket PNG:', err);
    }
  }

  // 2. Fallback: If DOM element is not mounted, use high-definition standalone pass
  if (student && settings) {
    try {
      const fbCanvas = await generateStudentTicketCanvas(student, settings, elementId);
      if (fbCanvas && fbCanvas.width > 0) {
        return new Promise((resolve) => {
          fbCanvas.toBlob((blob) => {
            if (blob) {
              triggerFileDownload(blob, downloadFileName);
              resolve(true);
            } else {
              const image = fbCanvas.toDataURL('image/png');
              triggerFileDownload(image, downloadFileName);
              resolve(true);
            }
          }, 'image/png', 1.0);
        });
      }
    } catch (canvasErr) {
      console.warn('generateStudentTicketCanvas fallback error:', canvasErr);
    }
  }

  return false;
};

/**
 * Copy visual ticket element image to clipboard so operator can hit Ctrl+V directly in WhatsApp Web
 */
export const copyTicketElementToClipboard = async (
  elementId: string,
  student?: Student,
  settings?: TripSettings
): Promise<boolean> => {
  let canvas: HTMLCanvasElement | null = null;

  // 1. Direct DOM Element capture to guarantee identical visual presentation
  const targetElement =
    document.getElementById(`${elementId}-frame`) ||
    document.getElementById(elementId) ||
    (student ? document.getElementById(`kayan-digital-ticket-${student.id}-frame`) : null) ||
    (student ? document.getElementById(`kayan-digital-ticket-${student.id}`) : null);

  const isMobileOrNarrow =
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || (targetElement && targetElement.offsetWidth < 680));

  if (student && settings && (isMobileOrNarrow || !targetElement)) {
    try {
      canvas = await generateStudentTicketCanvas(student, settings, elementId);
    } catch (_) {}
  } else if (targetElement && !isMobileOrNarrow) {
    try {
      if (typeof document !== 'undefined' && document.fonts) {
        try {
          await document.fonts.ready;
        } catch (_) {}
      }

      const domImages = Array.from(targetElement.querySelectorAll('img'));
      await Promise.all(
        domImages.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) return resolve(true);
              img.onload = () => resolve(true);
              img.onerror = () => resolve(true);
            })
        )
      );

      // Try html-to-image first
      try {
        canvas = await htmlToImageToCanvas(targetElement, {
          pixelRatio: 2.5,
          backgroundColor: '#060913',
          skipFonts: true,
          cacheBust: true,
        });
      } catch (htiErr) {
        console.warn('html-to-image for clipboard failed, trying html2canvas:', htiErr);
      }

      if (!canvas) {
        canvas = await html2canvas(targetElement, {
          scale: 2.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#060913',
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1024,
          onclone: (clonedDoc) => {
            const frame = clonedDoc.getElementById(`${elementId}-frame`);
            if (frame) {
              frame.style.width = '750px';
              frame.style.maxWidth = '750px';
              frame.style.minWidth = '750px';
              frame.style.margin = '0 auto';
              frame.style.backgroundColor = '#060913';
            }
            sanitizeClonedDoc(clonedDoc);
          },
        });
      }
    } catch (err) {
      console.error('Error copying ticket DOM element:', err);
    }
  }

  // 2. Fallback to ticket canvas if element is not in DOM
  if (!canvas && student && settings) {
    try {
      canvas = await generateStudentTicketCanvas(student, settings, elementId);
    } catch (_) {}
  }

  if (!canvas) return false;

  return new Promise((resolve) => {
    canvas!.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (e) {
        console.error('Clipboard write error:', e);
        resolve(false);
      }
    });
  });
};

/**
 * Generate Ultra-High Quality, Official Printable & PDF Manifest for Bus (كشف ركاب وتسكين الأتوبيس المعتمد)
 */
export const generateBusManifestPDF = async (
  busNumber: number | 'all',
  students: Student[],
  driver: DriverInfo | undefined,
  settings: TripSettings
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const busStudents = [...students].sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });
  
  // Calculate summary counts
  const totalPassengers = busStudents.length;
  const departureChecked = busStudents.filter((s) => s.checkInDeparture).length;
  const returnChecked = busStudents.filter((s) => s.checkInReturn).length;
  const mealsReserved = busStudents.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const tshirtsNeeded = busStudents.filter((s) => s.tshirtSize && s.tshirtSize !== 'none').length;
  const totalRemaining = busStudents.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <!-- Right: Logo & Company -->
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; font-family: 'Tajawal', sans-serif;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الرحلات والفعاليات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • كشف ركاب وصعود الحافلات المعتمد • ترخيص: 98231
            </div>
          </div>
        </div>

        <!-- Center: Manifest Title -->
        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; display: inline-block;">
            ${busNumber === 'all' ? 'كشف صعود وتسكين جميع الحافلات 🚌' : `كشف ركاب وتسكين حافلة رقم (${busNumber}) 🚌`}
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            كشف تحضير الحضور وتفقد المقاعد مع خانات التوقيع الورقية
          </div>
        </div>

        <!-- Left: Trip Destination & Date -->
        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">التاريخ:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Driver & Supervisor Info Banner (if single bus) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px;">
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">الكابتن السائق:</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.driverName || 'كابتن الأتوبيس'}</strong>
          <span style="color: #475569; font-family: monospace; font-weight: 700;">${driver?.driverPhone || '—'}</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">لوحات الحافلة والسعة:</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.busPlateNumber || 'سياحة خاصة'}</strong>
          <span style="color: #475569; font-weight: 700;">السعة: ${driver?.capacity || 50} راكب</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">مشرف الحافلة (كيان):</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 2px;">${driver?.supervisorName || 'تيم إشراف كيان'}</strong>
          <span style="color: #475569; font-family: monospace; font-weight: 700;">${driver?.supervisorPhone || settings.supportPhone}</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">التجمع وموعد التحرك:</span>
          <strong style="color: #0f172a; font-size: 12px; display: block; margin-top: 2px;">${settings.assemblyLocation || 'جامع الاستاد - كفرالشيخ'}</strong>
          <span style="color: #059669; font-weight: 800;">تجمع 04:00 ص • تحرك 04:30 ص</span>
        </div>
      </div>

      <!-- Quick KPI Metric Chips Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 8px 14px; margin-bottom: 14px; font-size: 11px; font-weight: 800; color: #92400e;">
        <div>👥 الركاب المسجلين: <strong style="color: #0f172a; font-size: 13px;">${totalPassengers}</strong> راكب</div>
        <div>🚌 حضور الذهاب: <strong style="color: #047857; font-size: 13px;">${departureChecked} / ${totalPassengers}</strong></div>
        <div>🔄 حضور العودة: <strong style="color: #047857; font-size: 13px;">${returnChecked} / ${totalPassengers}</strong></div>
        <div>🍔 الوجبات: <strong style="color: #0f172a; font-size: 13px;">${mealsReserved}</strong> وجبة</div>
        <div>👕 التيشرتات: <strong style="color: #0f172a; font-size: 13px;">${tshirtsNeeded}</strong> قطعة</div>
        <div>💵 متبقيات للتحصيل: <strong style="color: #b91c1c; font-size: 13px;">${totalRemaining.toLocaleString()} ج.م</strong></div>
      </div>

      <!-- Passenger Manifest Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المسافر / الطالب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">هاتف الطوارئ / الكلية</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 85px;">نقطة التجمع / تفاصيل التكت</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; background: #064e3b;">صعود الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; background: #064e3b;">صعود العودة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px;">المالية</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">توقيع المشرف ✍️</th>
          </tr>
        </thead>
        <tbody>
          ${busStudents
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; font-size: 11px; color: #b45309; background: #fffbeb; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    ${s.customRole && s.customRole !== 'طالب' ? `<span style="color: #2563eb; font-size: 8.5px; margin-right: 3px;">[${s.customRole}]</span>` : ''}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">
                    #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0; font-size: 9.5px;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 3px; color: #475569; font-size: 9px; border: 1px solid #e2e8f0;">
                    <div>${s.faculty || 'مشترك'}</div>
                    ${s.emergencyPhone ? `<div style="font-family: monospace; color: #b91c1c; font-weight: 700;">طوارئ: ${s.emergencyPhone}</div>` : ''}
                  </td>
                  <td style="padding: 4px 3px; color: #334155; font-size: 8.5px; border: 1px solid #e2e8f0;">
                    <div>${s.pickupPoint || 'التجمع الرئيسي'}</div>
                    ${s.notes ? `<div style="color: #64748b; font-style: italic;">${s.notes}</div>` : ''}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.checkInDeparture ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; text-align: center; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.checkInDeparture ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.checkInReturn ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; text-align: center; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.checkInReturn ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9px;">خالص ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 8.5px;">
                    ....................
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures and Official Stamp Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الحافلة المسؤول</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">${driver?.supervisorName || 'مشرف كيان'}</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد إدارة الفعاليات</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مدير التشغيل والأسطول</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        كشف ركاب رسمي معتمد صادر من منظومة كيان لتنظيم الرحلات • تاريخ الطباعة: ${new Date().toLocaleString('ar-EG')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      width: 1200,
      windowWidth: 1200,
      scrollX: 0,
      scrollY: 0,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: (clonedDoc) => {
        sanitizeClonedDoc(clonedDoc);
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Bus_${busNumber}_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Bus Manifest PDF:', err);
    fallbackPrintElement(container, `Bus_${busNumber}_Manifest`);
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official T-Shirt Factory & Production Manifest PDF (كشف المصنع والتصنيع للتيشرتات)
 */
export const generateTShirtFactoryPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  // Sort by Bus, then Seat
  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalTShirts = filtered.length;

  const sizeCounts: Record<string, number> = {
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    '2XL': 0,
    '3XL': 0,
  };

  filtered.forEach((s) => {
    if (s.tshirtSize && sizeCounts[s.tshirtSize] !== undefined) {
      sizeCounts[s.tshirtSize]++;
    }
  });

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #7c3aed; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              أمر تصنيع وتجهيز التيشرتات واليونيفورم المعتمد • قسم الدعاية والبراندنج
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #4c1d95; color: #ffffff; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف أمر التوريد والطباعة للمصنع (T-Shirts Factory Order) 👕
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #6b21a8; font-weight: 900;">${busFilter === 'all' ? 'كافة الحافلات بالترتيب' : `حافلة رقم #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">إجمالي المطلوب:</span> <strong style="color: #6b21a8; font-size: 14px; font-family: monospace;">${totalTShirts} قطعة</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">تاريخ التوريد:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Factory Sizes Matrix Summary Table -->
      <div style="margin-bottom: 14px; border: 2px solid #7c3aed; border-radius: 12px; overflow: hidden; background: #f5f3ff;">
        <div style="background: #4c1d95; color: #ffffff; padding: 6px 12px; font-weight: 900; font-size: 12px; text-align: center;">
          📊 جدول الحصر الإحصائي لمقاسات التيشرتات المطلوب إنتاجها للمصنع:
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: center; font-size: 12px;">
          <thead>
            <tr style="background: #ede9fe; color: #4c1d95; font-weight: 900; border-bottom: 1.5px solid #7c3aed;">
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس S</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس M</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس L</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس 2XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd;">مقاس 3XL</th>
              <th style="padding: 6px; border: 1px solid #c4b5fd; background: #4c1d95; color: #fde047;">الإجمالي الكلي المطلوب</th>
            </tr>
          </thead>
          <tbody>
            <tr style="font-weight: 900; font-size: 14px; font-family: monospace; background: #ffffff;">
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.S}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.M}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.L}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts.XL}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts['2XL']}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; color: #4c1d95;">${sizeCounts['3XL']}</td>
              <td style="padding: 8px; border: 1px solid #c4b5fd; background: #fdf4ff; color: #701a75; font-size: 16px;">${totalTShirts} تيشرت</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Factory Detailed Items List -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 28px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الحافلة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">الاسم المطلوب للطباعة / الطالب</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">الكلية / الدفعة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px; background: #6b21a8; font-size: 11px;">المقاس المطلوب</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 140px;">تفاصيل التكت والملاحظات الخاصة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">فحص الجودة 🔲</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">التغليف والتجهيز 🔲</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0; background: #faf5ff;">
                    باص #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                  </td>
                  <td style="padding: 4px 4px; color: #475569; font-size: 9px; border: 1px solid #e2e8f0;">
                    ${s.faculty || '—'}
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; background: #f3e8ff;">
                    <span style="font-weight: 900; font-family: monospace; font-size: 13px; color: #581c87;">${s.tshirtSize}</span>
                  </td>
                  <td style="padding: 4px 5px; font-size: 8.5px; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.notes || s.pickupPoint || 'طباعة الاسم والشعار الرسمي'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Factory Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول البراندنج والطباعة</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة المشتريات والتصنيع</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #7c3aed; padding: 6px 12px; border-radius: 8px; background: #faf5ff; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #581c87;">استلام وتأكيد المصنع المورد</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">توقيع وخاتم مسؤول المصنع</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">اعتماد المشرف العام</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_TShirt_Factory_Order.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating T-Shirt Factory PDF:', err);
    fallbackPrintElement(container, 'TShirt_Factory_Order');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official T-Shirt Handover & Student Distribution Manifest PDF (كشف تسليم وتوزيع التيشرتات للطلاب)
 */
export const generateTShirtDistributionPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => s.tshirtSize && s.tshirtSize !== 'none');
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const deliveredCount = filtered.filter((s) => s.tshirtReceived).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #7c3aed; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف تسليم وتوزيع التيشرتات واليونيفورم الميداني على المشتركين
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف استلام وتوزيع التيشرتات والتوقيعات 👕✍️
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #6b21a8; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">حالة التسليم:</span> <strong style="color: #047857; font-size: 13px; font-family: monospace;">${deliveredCount} / ${totalCount}</strong></div>
        </div>
      </div>

      <!-- Distribution Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px; background: #6b21a8; font-size: 11px;">المقاس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">تأكيد الاستلام 🔲</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 110px;">توقيع المشترك بالقلم ✍️</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">${s.name}</td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; font-weight: 900; font-family: monospace; font-size: 12px; color: #581c87; background: #faf5ff;">${s.tshirtSize}</td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.tshirtReceived ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.tshirtReceived ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ..................................
                  </td>
                  <td style="padding: 4px 4px; font-size: 8.5px; color: #475569; border: 1px solid #e2e8f0;">
                    ${s.notes || '—'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول تسليم التيشرتات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #7c3aed; padding: 4px 10px; border-radius: 8px; background: #faf5ff; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #581c87;">لجنة الاستقبال والتجهيزات</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الفعالية والرحلة</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_TShirt_Distribution_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating T-Shirt Distribution PDF:', err);
    fallbackPrintElement(container, 'TShirt_Distribution_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Restaurant & Kitchen Catering Order PDF (كشف المطعم والمطبخ وتجهيز الوجبات)
 */
export const generateMealKitchenPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => getStudentMealInfo(s, settings).hasMeal);
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalMeals = filtered.length;

  // Breakdown by meal types
  const mealTypesCount: Record<string, number> = {};
  filtered.forEach((s) => {
    const info = getStudentMealInfo(s, settings);
    const name = info.mealName || 'وجبة أساسية';
    mealTypesCount[name] = (mealTypesCount[name] || 0) + 1;
  });

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              أمر تجهيز وتوريد وجبات الإعاشة والبوفيه للمطعم والمطبخ
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #78350f; color: #ffffff; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف أمر التجهيز للمطعم والمطبخ (Kitchen & Catering Order) 🍔
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الطلب: <span style="color: #b45309; font-weight: 900;">${busFilter === 'all' ? 'كافة الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">إجمالي الوجبات:</span> <strong style="color: #b45309; font-size: 14px; font-family: monospace;">${totalMeals} وجبة</strong></div>
        </div>
      </div>

      <!-- Meal Types Breakdown Summary -->
      <div style="margin-bottom: 14px; border: 2px solid #d97706; border-radius: 12px; overflow: hidden; background: #fffbeb;">
        <div style="background: #92400e; color: #ffffff; padding: 6px 12px; font-weight: 900; font-size: 12px; text-align: center;">
          🍔 تفصيل وحصر كميات الوجبات المطلوب إعدادها وتغليفها من المطعم:
        </div>
        <div style="display: grid; grid-template-columns: repeat(${Math.max(Object.keys(mealTypesCount).length, 1)}, 1fr); gap: 8px; padding: 10px; text-align: center;">
          ${Object.entries(mealTypesCount)
            .map(
              ([name, count]) => `
              <div style="background: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 8px;">
                <span style="color: #78350f; font-weight: 800; font-size: 11px; display: block;">${name}</span>
                <strong style="color: #0f172a; font-size: 16px; font-family: monospace; font-weight: 900;">${count} وجبة</strong>
              </div>
            `
            )
            .join('')}
        </div>
      </div>

      <!-- Kitchen Manifest Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 28px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الحافلة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 180px; background: #92400e; color: #ffffff;">نوع الوجبة والتفاصيل</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px;">التجهيز بالمطبخ 🔲</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px;">التسليم للشاحن 🔲</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0; background: #fffbeb;">
                    باص #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 900; color: #78350f; border: 1px solid #e2e8f0; background: #fef3c7;">
                    ${mealInfo.mealName}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1;">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px;"></span>
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Kitchen Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول الإعاشة واللوجستيات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 4px 10px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #92400e;">استلام وخاتم المطعم المورد</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">اعتماد مدير العمليات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Kitchen_Meals_Order.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Kitchen Meals PDF:', err);
    fallbackPrintElement(container, 'Kitchen_Meals_Order');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Meal Distribution & Handover Manifest PDF (كشف توزيع واستلام الوجبات الميداني للطلاب)
 */
export const generateMealDistributionPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = students.filter((s) => getStudentMealInfo(s, settings).hasMeal);
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const deliveredCount = filtered.filter((s) => s.mealReceived).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #d97706; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف تسليم وتوزيع وجبات الغداء والإعاشة الميداني
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف استلام وتوزيع الوجبات الغذائية 🍔✍️
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #b45309; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">حالة التوزيع:</span> <strong style="color: #047857; font-size: 13px; font-family: monospace;">${deliveredCount} / ${totalCount}</strong></div>
        </div>
      </div>

      <!-- Meal Handover Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 120px; color: #fde047;">نوع الوجبة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">تأكيد الاستلام 🔲</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 110px;">توقيع المستلم ✍️</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 85px;">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">${s.name}</td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #78350f; border: 1px solid #e2e8f0; background: #fffbeb;">${mealInfo.mealName}</td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #cbd5e1; background: ${s.mealReceived ? '#dcfce7' : '#ffffff'};">
                    <span style="display: inline-block; width: 14px; height: 14px; border: 1.5px solid #0f172a; border-radius: 3px; vertical-align: middle; line-height: 12px; font-weight: 900; font-size: 11px; color: #047857;">
                      ${s.mealReceived ? '✔' : ''}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ..................................
                  </td>
                  <td style="padding: 4px 4px; font-size: 8.5px; color: #475569; border: 1px solid #e2e8f0;">
                    ${s.notes || '—'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Footer Signatures -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول توزيع الوجبات</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 4px 10px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #b45309;">لجنة الإعاشة والتموين</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مشرف الرحلة المسؤول</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Meal_Distribution_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Meal Distribution PDF:', err);
    fallbackPrintElement(container, 'Meal_Distribution_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official Financial & Cash Collections Manifest PDF (كشف التحصيل والمتبقيات المالية الميدانية)
 */
export const generateFinancialManifestPDF = async (
  students: Student[],
  settings: TripSettings,
  busFilter: number | 'all' = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  let filtered = [...students];
  if (busFilter !== 'all') {
    filtered = filtered.filter((s) => Number(s.busNumber) === Number(busFilter));
  }

  filtered.sort((a, b) => {
    if (b.remainingAmount !== a.remainingAmount) return (b.remainingAmount || 0) - (a.remainingAmount || 0);
    if (a.busNumber !== b.busNumber) return a.busNumber - b.busNumber;
    return (a.seatNumber || 999) - (b.seatNumber || 999);
  });

  const totalCount = filtered.length;
  const totalOutstanding = filtered.reduce((sum, s) => sum + (s.remainingAmount || 0), 0);
  const totalPaid = filtered.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
  const unpaidCount = filtered.filter((s) => (s.remainingAmount || 0) > 0).length;

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #059669; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              كشف المتابعة المالية والتحصيلات النقدية الميدانية • الإدارة المالية
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #064e3b; color: #fde047; padding: 6px 20px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف التحصيل والمتبقيات المالية الميدانية 💵📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق الكشف: <span style="color: #047857; font-weight: 900;">${busFilter === 'all' ? 'جميع الحافلات' : `حافلة #${busFilter}`}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">إجمالي المطلوب تحصيله:</span> <strong style="color: #dc2626; font-size: 14px; font-family: monospace;">${totalOutstanding.toLocaleString()} ج.م</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">المسدد مسبقاً:</span> <strong style="color: #059669; font-size: 12px; font-family: monospace;">${totalPaid.toLocaleString()} ج.م</strong></div>
        </div>
      </div>

      <!-- Financial Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 3px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">الباص</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 44px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 62px;">الكود</th>
            <th style="padding: 6px 6px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 4px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">إجمالي الحساب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px; color: #34d399;">المسدد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 75px; background: #991b1b; color: #ffffff; font-size: 11px;">المتبقي نقداً</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 80px;">المحصل فعلياً</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 100px;">توقيع المشترك ✍️</th>
            <th style="padding: 6px 8px; text-align: center; border: 1px solid #334155; width: 90px;">توقيع المحصل ✍️</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((s, idx) => {
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket || s.remainingAmount === 0;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 2px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 800; font-family: monospace; border: 1px solid #e2e8f0;">#${s.busNumber}</td>
                  <td style="padding: 4px 2px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0;">${s.seatNumber ? `#${s.seatNumber}` : '—'}</td>
                  <td style="padding: 4px 2px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">${s.ticketCode}</td>
                  <td style="padding: 4px 5px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900;"> (مجاني 🎁)</span>' : ''}
                  </td>
                  <td style="padding: 4px 3px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">${s.phone}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; border: 1px solid #e2e8f0;">${s.isFreeTicket ? '0' : `${s.totalAmount} ج.م`}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; color: #059669; font-weight: 700; border: 1px solid #e2e8f0;">${s.isFreeTicket ? '0' : `${s.paidAmount} ج.م`}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 900; border: 1px solid #e2e8f0; ${isPaid ? 'color: #059669; background: #f0fdf4;' : 'color: #dc2626; background: #fef2f2; font-size: 11px;'}">
                    ${isPaid ? 'خالص ✅' : `${s.remainingAmount} ج.م`}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; color: #94a3b8; font-size: 9px;">
                    [ ....... ج.م ]
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ....................
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-size: 9px;">
                    ....................
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Financial Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التحصيل والخزينة الميداني</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #059669; padding: 4px 10px; border-radius: 8px; background: #ecfdf5; display: inline-block;">
            <div style="font-size: 10px; font-weight: 900; color: #065f46;">خاتم واعتماد الإدارة المالية</div>
          </div>
        </div>
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير التنفيذي للشركة</span>
          <span style="color: #94a3b8; font-size: 10px; display: block; margin-top: 6px;">التوقيع: ___________________</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Financial_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Financial Manifest PDF:', err);
    fallbackPrintElement(container, 'Financial_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Master Attendance & Delivery Checkoff PDF for All Students (كشف التسليمات والحضور الشامل لجميع الطلاب)
 */
export const generateMasterAttendanceDeliveryPDF = async (
  students: Student[],
  settings: TripSettings,
  filterOption = 'all'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const displayedStudents = students
    .filter((s) => {
      if (filterOption === 'free') return s.isFreeTicket;
      if (filterOption === 'addons') return (s.selectedAddonIds || []).length > 0 || getStudentMealInfo(s, settings).hasMeal;
      if (filterOption === 'tshirts_pending') return !s.tshirtReceived;
      if (filterOption === 'unpaid') return (s.remainingAmount || 0) > 0;
      return true;
    })
    .sort((a, b) => a.busNumber - b.busNumber || (a.seatNumber || 999) - (b.seatNumber || 999));

  const totalCount = displayedStudents.length;
  const mealsReserved = displayedStudents.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const mealsDelivered = displayedStudents.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = displayedStudents.filter((s) => s.tshirtReceived).length;
  const totalRemaining = displayedStudents.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • الإدارة العامة للحجوزات والتسليمات الميدانية
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            كشف التسليمات والحضور الشامل لجميع المشاركين 📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            تأكيد تسليم الوجبات، التيشرتات، الحضور، وتصفية المبالغ المتبقية
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">التاريخ:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- KPI Summary Bar -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px;">
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي الطلاب والمشاركين:</span>
          <strong style="color: #0f172a; font-size: 14px; font-family: monospace;">${totalCount} مشارك</strong>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم الوجبات الغذائية 🍔:</span>
          <strong style="color: #b45309; font-size: 14px; font-family: monospace;">${mealsDelivered} / ${mealsReserved} وجبة</strong>
          <span style="color: #475569; font-size: 10px; display: block;">(متبقي تسليم: ${mealsReserved - mealsDelivered})</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم التيشرتات الرسمية 👕:</span>
          <strong style="color: #6b21a8; font-size: 14px; font-family: monospace;">${tshirtsDelivered} / ${totalCount} تيشرت</strong>
          <span style="color: #475569; font-size: 10px; display: block;">(متبقي تسليم: ${totalCount - tshirtsDelivered})</span>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي المبالغ المتبقية للتحصيل:</span>
          <strong style="color: #b91c1c; font-size: 14px; font-family: monospace;">${totalRemaining.toLocaleString()} ج.م</strong>
        </div>
      </div>

      <!-- Master Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 26px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم الطالب / المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 80px;">رقم الهاتف</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px; color: #fde047;">الأتوبيس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 70px;">التيشرت 👕</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 130px; color: #fde047;">الوجبة 🍔</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 80px;">المالية</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">العودة</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">توقيع الاستلام</th>
          </tr>
        </thead>
        <tbody>
          ${displayedStudents
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    <span style="display: block; font-size: 9px; color: #64748b; font-weight: 600;">${s.faculty || ''}</span>
                  </td>
                  <td style="padding: 4px 4px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: #f0fdf4;">
                    حافلة (${s.busNumber})
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0; background: #fffbeb;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-weight: 800; font-family: monospace;">${s.tshirtSize === 'none' ? 'بدون' : s.tshirtSize}</span>
                    <span style="display: block; font-size: 8.5px; color: ${s.tshirtReceived ? '#059669' : '#94a3b8'}; font-weight: 700;">
                      ${s.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      mealInfo.hasMeal
                        ? `
                      <span style="color: #0f172a; font-weight: 800; font-size: 9.5px; display: block;">${mealInfo.mealName}</span>
                      <span style="display: inline-block; font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; ${
                        s.mealReceived ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                      }">
                        ${s.mealReceived ? '✅ تم التسليم' : '🔲 في الانتظار'}
                      </span>
                    `
                        : '<span style="color: #94a3b8; font-size: 9px;">بدون وجبة</span>'
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مسدد ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9.5px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInDeparture ? '#059669' : '#94a3b8'};">
                    ${s.checkInDeparture ? '✅' : '🔲'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInReturn ? '#059669' : '#94a3b8'};">
                    ${s.checkInReturn ? '✅' : '🔲'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #cbd5e1; font-size: 8.5px;">
                    ___________
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التسليمات الميدانية</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة التجهيزات والإعاشة</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير المالي والتنفيذي</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        كشف تسليمات وحضور رسمي معتمد صادر من منظومة كيان • تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Master_Attendance_Manifest.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Master Attendance Manifest PDF:', err);
    fallbackPrintElement(container, 'Master_Attendance_Manifest');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Ultra-High Quality, Official PDF Report for Students CRM (تقرير كشف الطلاب والمشاركين الرسمي لشركة كيان)
 */
export const generateStudentsComprehensiveReportPDF = async (
  students: Student[],
  settings: TripSettings,
  reportTitle = 'تقرير وبيانات المشاركين الشامل (CRM Export)',
  filterDescription = 'جميع السجلات المعروضة'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const totalCount = students.length;
  const mealsReserved = students.filter((s) => getStudentMealInfo(s, settings).hasMeal).length;
  const mealsDelivered = students.filter((s) => s.mealReceived).length;
  const tshirtsDelivered = students.filter((s) => s.tshirtReceived).length;
  const departureChecked = students.filter((s) => s.checkInDeparture).length;
  const returnChecked = students.filter((s) => s.checkInReturn).length;
  const totalPaid = students.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  const totalRemaining = students.reduce((acc, s) => acc + (s.remainingAmount || 0), 0);

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-15';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 20px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="60" height="60" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a;">
              ${settings.companyNameAr || 'شركة كيان لتنظيم الفعاليات والرحلات الرسمية'}
            </div>
            <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-top: 2px;">
              KAYAN EVENTS & TOURS • تقرير إدارة الحجوزات والبيانات المركزية CRM • ترخيص رقم: 98231
            </div>
          </div>
        </div>

        <div style="text-align: center;">
          <div style="background: #0f172a; color: #fde047; padding: 6px 18px; border-radius: 10px; font-size: 16px; font-weight: 900;">
            ${reportTitle} 📑
          </div>
          <div style="font-size: 11px; color: #475569; font-weight: 800; margin-top: 4px;">
            نطاق التقرير: <span style="color: #d97706; font-weight: 900;">${filterDescription}</span>
          </div>
        </div>

        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 14px; border-radius: 10px; font-size: 11px;">
          <div><span style="color: #64748b; font-weight: 700;">الرحلة:</span> <strong style="color: #0f172a; font-size: 12px;">${settings.tripName}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">الوجهة:</span> <strong style="color: #0f172a;">${settings.destination || 'فايد - العين السخنة'}</strong></div>
          <div style="margin-top: 3px;"><span style="color: #64748b; font-weight: 700;">تاريخ الرحلة:</span> <strong style="color: #0f172a;">${formattedDate}</strong></div>
        </div>
      </div>

      <!-- Key Performance Indicators (KPIs) Summary Bar -->
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; font-size: 11px;">
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">إجمالي المسجلين:</span>
          <strong style="color: #0f172a; font-size: 14px; font-family: monospace;">${totalCount} مشارك</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">حضور الذهاب / العودة 🚌:</span>
          <strong style="color: #047857; font-size: 13px; font-family: monospace;">ذهاب: ${departureChecked} | عودة: ${returnChecked}</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم الوجبات 🍔:</span>
          <strong style="color: #b45309; font-size: 13px; font-family: monospace;">${mealsDelivered} / ${mealsReserved}</strong>
        </div>
        <div style="border-left: 1px solid #e2e8f0; padding-left: 6px;">
          <span style="color: #64748b; display: block; font-weight: 700;">تسليم التيشرتات 👕:</span>
          <strong style="color: #7c3aed; font-size: 13px; font-family: monospace;">${tshirtsDelivered} / ${totalCount}</strong>
        </div>
        <div>
          <span style="color: #64748b; display: block; font-weight: 700;">الماليات المحصلة / المتبقية:</span>
          <strong style="color: #059669; font-size: 12px; font-family: monospace;">${totalPaid.toLocaleString()} ج.م</strong>
          <span style="color: #dc2626; font-size: 11px; font-weight: 800; display: block;">متبقي: ${totalRemaining.toLocaleString()} ج.م</span>
        </div>
      </div>

      <!-- Students Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 10px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; line-height: 1.6;">
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 24px;">م</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 60px;">الكود</th>
            <th style="padding: 6px 8px; border: 1px solid #334155;">اسم المشارك</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 75px;">الهاتف</th>
            <th style="padding: 6px 6px; border: 1px solid #334155; width: 90px;">الكلية / الصفة</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 50px; color: #fde047;">الأتوبيس</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px; color: #fde047;">المقعد</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 65px;">التيشرت 👕</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 110px; color: #fde047;">الوجبة 🍔</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 70px;">المالية</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">الذهاب</th>
            <th style="padding: 6px 4px; text-align: center; border: 1px solid #334155; width: 45px;">العودة</th>
            <th style="padding: 6px 6px; text-align: center; border: 1px solid #334155; width: 75px;">ملاحظات / توقيع</th>
          </tr>
        </thead>
        <tbody>
          ${students
            .map((s, idx) => {
              const mealInfo = getStudentMealInfo(s, settings);
              const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
              const isPaid = s.paymentStatus === 'paid' || s.isFreeTicket;
              return `
                <tr style="background: ${bg}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 4px 3px; text-align: center; font-weight: 700; color: #64748b; border: 1px solid #e2e8f0;">${idx + 1}</td>
                  <td style="padding: 4px 3px; text-align: center; font-family: monospace; font-weight: 800; color: #1e1b4b; border: 1px solid #e2e8f0;">
                    ${s.ticketCode}
                  </td>
                  <td style="padding: 4px 6px; font-weight: 800; color: #0f172a; border: 1px solid #e2e8f0;">
                    ${s.name}
                    ${s.isFreeTicket ? '<span style="color: #059669; font-size: 8.5px; font-weight: 900; margin-right: 4px;">(VIP 🎁)</span>' : ''}
                    ${s.hasCompanion ? `<div style="font-size: 8.5px; color: #d97706; font-weight: 700;">+ مرافق: ${s.companionName || '—'}</div>` : ''}
                  </td>
                  <td style="padding: 4px 4px; font-family: monospace; font-weight: 700; color: #334155; border: 1px solid #e2e8f0;">
                    ${s.phone}
                  </td>
                  <td style="padding: 4px 4px; font-size: 9px; color: #475569; border: 1px solid #e2e8f0;">
                    <div>${s.faculty || '—'}</div>
                    <span style="font-weight: 700; color: #0284c7;">${s.customRole || s.participantRole || 'طالب'}</span>
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 800; border: 1px solid #e2e8f0; background: #f0fdf4;">
                    #${s.busNumber}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; font-weight: 900; font-family: monospace; color: #b45309; border: 1px solid #e2e8f0; background: #fffbeb;">
                    ${s.seatNumber ? `#${s.seatNumber}` : '—'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-weight: 800; font-family: monospace;">${s.tshirtSize === 'none' ? 'بدون' : s.tshirtSize}</span>
                    <span style="display: block; font-size: 8.5px; color: ${s.tshirtReceived ? '#059669' : '#94a3b8'}; font-weight: 700;">
                      ${s.tshirtReceived ? '✅ استلم' : '🔲 لم يستلم'}
                    </span>
                  </td>
                  <td style="padding: 4px 4px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      mealInfo.hasMeal
                        ? `
                      <span style="color: #0f172a; font-weight: 800; font-size: 9px; display: block;">${mealInfo.mealName}</span>
                      <span style="display: inline-block; font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; ${
                        s.mealReceived ? 'background: #dcfce7; color: #15803d;' : 'background: #fef3c7; color: #b45309;'
                      }">
                        ${s.mealReceived ? '✅ تم التسليم' : '🔲 في الانتظار'}
                      </span>
                    `
                        : '<span style="color: #94a3b8; font-size: 9px;">بدون وجبة</span>'
                    }
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0;">
                    ${
                      s.isFreeTicket
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مجاني 🎁</span>'
                        : isPaid
                        ? '<span style="color: #059669; font-weight: 800; font-size: 9.5px;">مسدد ✅</span>'
                        : `<span style="color: #b91c1c; font-weight: 800; font-size: 9.5px;">متبقي ${s.remainingAmount}</span>`
                    }
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInDeparture ? '#059669' : '#94a3b8'};">
                    ${s.checkInDeparture ? '✅ حضر' : '🔲'}
                  </td>
                  <td style="padding: 4px 2px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.checkInReturn ? '#059669' : '#94a3b8'};">
                    ${s.checkInReturn ? '✅ حضر' : '🔲'}
                  </td>
                  <td style="padding: 4px 3px; text-align: center; border: 1px solid #e2e8f0; color: #cbd5e1; font-size: 8.5px;">
                    ${s.notes ? `<span style="color: #475569; font-size: 8px; display: block;">${s.notes}</span>` : '___________'}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <!-- Signatures Footer -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 2px dashed #cbd5e1; font-size: 11px;">
        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">مسؤول التسجيل وشؤون الطلاب</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة الحجوزات والـ CRM</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>

        <div style="text-align: center; width: 35%;">
          <div style="border: 2px solid #d97706; padding: 6px 12px; border-radius: 8px; background: #fffbeb; display: inline-block;">
            <div style="font-size: 11px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة</div>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800; margin-top: 2px;">✓ معتمد ومطابق لمنظومة KAYAN 2026</div>
          </div>
        </div>

        <div style="text-align: center; width: 30%;">
          <span style="color: #64748b; font-weight: 700; display: block;">المدير التنفيذي والمالي</span>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان</strong>
          <span style="color: #94a3b8; font-size: 10px;">التوقيع: ___________________</span>
        </div>
      </div>

      <div style="margin-top: 12px; text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 6px;">
        تقرير رسمي معتمد صادر من منظومة كيان لتنظيم الرحلات • تاريخ الاستخراج: ${new Date().toLocaleString('ar-EG')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Students_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Students Comprehensive Report PDF:', err);
    fallbackPrintElement(container, 'Students_Report');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Official Main Treasury Ledger & Financial Statement PDF (كشف حساب وسجل حركات الخزنة الرئيسية المعتمد)
 */
export const generateTreasuryFullLedgerPDF = async (
  treasury: CompanyTreasury,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات',
  transfersOverride?: TreasuryTransfer[],
  filterTitle?: string
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const transfersToDisplay = transfersOverride && transfersOverride.length > 0
    ? transfersOverride
    : (treasury.transfers || []);

  const totalDeposits = transfersToDisplay
    .filter((t) => t.type !== 'direct_withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalWithdrawals = transfersToDisplay
    .filter((t) => t.type === 'direct_withdrawal')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const currentBal = treasury.currentBalance ?? (treasury as any).balance ?? (totalDeposits - totalWithdrawals);
  const netMovement = totalDeposits - totalWithdrawals;

  const serialNum = `KAYAN-LEDGER-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000 + 1000))}`;

  container.innerHTML = `
    <div style="border: 3px double #d97706; border-radius: 16px; padding: 24px; background: #ffffff; position: relative;">
      <!-- Top Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #334155;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="${cachedKayanBadgeBase64}" width="70" height="70" alt="KAYAN Badge" style="border-radius: 12px; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #fbbf24; letter-spacing: 0.5px;">KAYAN EVENTS & TOURS • الإدارة المالية المركزية</div>
            <h1 style="margin: 3px 0 0 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">${companyName}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; color: #cbd5e1;">
              كشف حساب وسجل حركات الخزنة الرئيسية المركزية (Master Treasury Statement)
              ${filterTitle ? `<span style="display: inline-block; background: rgba(245, 158, 11, 0.2); color: #fde047; padding: 2px 8px; border-radius: 6px; margin-right: 8px; font-size: 11px; border: 1px solid rgba(245, 158, 11, 0.4);">${filterTitle}</span>` : ''}
            </p>
          </div>
        </div>
        <div style="text-align: left; background: rgba(255, 255, 255, 0.08); padding: 10px 18px; border-radius: 10px; border: 1px solid rgba(245, 158, 11, 0.4);">
          <div style="font-size: 10.5px; color: #cbd5e1;">رقم الكشف المرجعي:</div>
          <div style="font-size: 13px; font-weight: 900; color: #fbbf24; font-family: monospace;">${serialNum}</div>
          <div style="font-size: 10.5px; color: #94a3b8; margin-top: 4px;">تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG', { weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric' })}</div>
          <div style="font-size: 10px; color: #94a3b8; font-family: monospace;">الوقت: ${new Date().toLocaleTimeString('ar-EG')}</div>
        </div>
      </div>

      <!-- Financial Balance Summary KPI Cards -->
      <div style="display: grid; grid-template-columns: 1.2fr 1.2fr 1.4fr 1fr; gap: 12px; margin-bottom: 20px;">
        <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #047857; font-weight: 800; display: block;">إجمالي الإيداعات وأرباح الرحلات (+)</span>
          <strong style="font-size: 22px; font-weight: 900; color: #065f46; font-family: monospace; display: block; margin-top: 3px;">+${totalDeposits.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #059669;">واردات الخزنة المقيدة</span>
        </div>

        <div style="background: #fff1f2; border: 2px solid #f43f5e; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #be123c; font-weight: 800; display: block;">إجمالي المصروفات والسحوبات (-)</span>
          <strong style="font-size: 22px; font-weight: 900; color: #9f1239; font-family: monospace; display: block; margin-top: 3px;">-${totalWithdrawals.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #e11d48;">مصروفات تشغيلية وإدارية</span>
        </div>

        <div style="background: #fffbeb; border: 2px solid #d97706; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #92400e; font-weight: 800; display: block;">صافي الرصيد المتاح الفعلي (Net Master Balance)</span>
          <strong style="font-size: 24px; font-weight: 900; color: #b45309; font-family: monospace; display: block; margin-top: 3px;">${currentBal.toLocaleString()} ج.م</strong>
          <span style="font-size: 10px; color: #78350f; font-weight: 700;">السيولة النقدية المحفوظة بالخزنة</span>
        </div>

        <div style="background: #f8fafc; border: 2px solid #64748b; border-radius: 12px; padding: 12px 14px; text-align: center;">
          <span style="font-size: 11.5px; color: #334155; font-weight: 800; display: block;">إجمالي السندات</span>
          <strong style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace; display: block; margin-top: 3px;">${transfersToDisplay.length} سند</strong>
          <span style="font-size: 10px; color: #64748b;">حركات مقيدة ومطابقة</span>
        </div>
      </div>

      <!-- Ledger Transactions Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 11px; margin-bottom: 20px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #f8fafc; font-weight: 900;">
            <th style="padding: 10px 6px; border: 1px solid #334155; width: 35px; text-align: center;">م</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 110px; text-align: center;">رقم المرجع</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 125px; text-align: center;">التاريخ والوقت</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 150px;">نوع الحركة</th>
            <th style="padding: 10px 10px; border: 1px solid #334155;">الرحلة المصدر / البيان والوصف التفصيلي</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 130px;">المسؤول المنفذ</th>
            <th style="padding: 10px 8px; border: 1px solid #334155; width: 120px; text-align: center;">المبلغ (ج.م)</th>
          </tr>
        </thead>
        <tbody>
          ${transfersToDisplay.length === 0
            ? `<tr><td colspan="7" style="padding: 24px; text-align: center; color: #64748b; font-size: 13px;">لا توجد حركات مسجلة مطابقة حتى الآن.</td></tr>`
            : transfersToDisplay.map((trf, idx) => {
                const isOut = trf.type === 'direct_withdrawal';
                const typeName =
                  trf.type === 'trip_final_profit'
                    ? 'أرباح رحلة مكتملة 🏆'
                    : trf.type === 'partial_cash_out'
                    ? 'تصفية سيولة جزئية 💵'
                    : trf.type === 'direct_deposit'
                    ? 'إيداع مباشر 📥'
                    : 'سحب / مصروف شركة 🔴';

                const badgeBg = isOut ? '#fff1f2' : '#ecfdf5';
                const badgeColor = isOut ? '#be123c' : '#047857';
                const badgeBorder = isOut ? '#fecdd3' : '#a7f3d0';

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 900; color: #b45309; background: #fffbeb;">
                      ${trf.referenceNumber}
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; color: #475569; font-size: 10.5px;">
                      <div>${trf.date}</div>
                      <div style="color: #94a3b8; font-size: 9.5px;">${trf.time}</div>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1;">
                      <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 10.5px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                        ${typeName}
                      </span>
                    </td>
                    <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">
                      <strong style="color: #0f172a; display: block; font-size: 11.5px;">${trf.tripName || 'الخزنة المركزية'}</strong>
                      <span style="color: #64748b; font-size: 10px; display: block; margin-top: 2px;">${trf.notes || '-'}</span>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; color: #334155; font-weight: 700; font-size: 11px;">
                      ${trf.transferredBy}
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 900; font-size: 13px; color: ${isOut ? '#e11d48' : '#059669'}; background: ${isOut ? '#fff5f5' : '#f0fdf4'};">
                      ${isOut ? '-' : '+'}${(trf.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                `;
              }).join('')}
        </tbody>
        <tfoot>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900; font-size: 12px;">
            <td colspan="4" style="padding: 10px 12px; border: 1px solid #334155;">
              إجمالي الحركات المعروضة في هذا الكشف (${transfersToDisplay.length} سند)
            </td>
            <td colspan="2" style="padding: 10px 12px; border: 1px solid #334155; text-align: left; color: #fde047;">
              صافي حركة الفترة:
            </td>
            <td style="padding: 10px 8px; border: 1px solid #334155; text-align: center; font-family: monospace; font-size: 14px; color: ${netMovement >= 0 ? '#4ade80' : '#f87171'};">
              ${netMovement >= 0 ? '+' : ''}${netMovement.toLocaleString()} ج.م
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Signatures and Official Approvals -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 18px; margin-top: 16px;">
        <div style="width: 30%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">إعداد ومراجعة الحسابات</p>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">لجنة المالية والخزينة</strong>
          <div style="margin-top: 18px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 10px; color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">توقيع المحاسب المسؤول</span>
        </div>

        <div style="width: 35%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #d97706; background: #fffbeb; padding: 10px 18px; border-radius: 12px;">
            <div style="font-size: 12px; font-weight: 900; color: #b45309;">خاتم واعتماد الإدارة العامة للخزينة</div>
            <div style="font-size: 10px; color: #047857; font-weight: 800; margin-top: 4px;">✓ معتمد ومطابق للحسابات البنكية والنقدية 2026</div>
          </div>
        </div>

        <div style="width: 30%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">اعتماد المدير العام التنفيذي</p>
          <strong style="color: #0f172a; font-size: 13px; display: block; margin-top: 6px;">إدارة شركة كيان لتنظيم الفعاليات</strong>
          <div style="margin-top: 18px; border-bottom: 2px dashed #cbd5e1; width: 75%; margin-left: auto; margin-right: auto;"></div>
          <span style="font-size: 10px; color: #94a3b8; font-family: monospace; display: block; margin-top: 4px;">الختم والتوقيع الرسمي</span>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        وثيقة مالية معتمدة ورسمية صادرة من نظام الإدارة المالية لشركة كيان للفعاليات والرحلات • استخرجت بواسطة: المسؤول المالي • ${new Date().toLocaleString('ar-EG')}
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Treasury_Ledger_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Treasury Full Ledger PDF:', err);
    fallbackPrintElement(container, 'Treasury_Ledger');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};

/**
 * Generate Official Run-of-Show Timeline Schedule PDF (جدول سير اليوم والبرنامج التنفيذي A4)
 */
export const generateRunOfShowPDF = async (
  events: TimelineEvent[],
  settings: TripSettings,
  companyName = 'شركة كيان لتنظيم الفعاليات والرحلات'
): Promise<boolean> => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Tajawal', -apple-system, sans-serif";
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';

  const formattedDate = settings.tripDate
    ? new Date(settings.tripDate).toLocaleDateString('ar-EG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : settings.tripDate || '2026-08-25';

  container.innerHTML = `
    <div style="border: 2px solid #0f172a; border-radius: 16px; padding: 22px; background: #ffffff; position: relative;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #d97706; padding-bottom: 16px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${cachedKayanBadgeBase64}" width="65" height="65" alt="KAYAN Badge" style="border-radius: 50%; border: 2px solid #f59e0b; object-fit: cover;" />
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #0f172a;">${companyName}</h1>
            <p style="margin: 3px 0 0 0; font-size: 13.5px; font-weight: 700; color: #d97706;">البرنامج التنفيذي الزمني الميداني المعتمد (Run-of-Show Official Schedule)</p>
          </div>
        </div>
        <div style="text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 10px;">
          <div style="font-size: 13px; font-weight: 900; color: #1e1b4b;">الفعالية: ${settings.tripName}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">التاريخ: ${formattedDate}</div>
          <div style="font-size: 11px; color: #475569;">الوجهة: ${settings.destination || 'الموقع المحدد'}</div>
        </div>
      </div>

      <!-- Events Table -->
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 12px; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-weight: 900;">
            <th style="padding: 10px; border: 1px solid #334155; width: 45px; text-align: center;">م</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 110px;">التوقيت</th>
            <th style="padding: 10px; border: 1px solid #334155;">الفقرة والتعليمات التنفيذية</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 160px;">المكان المحدد</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 160px;">اللجنة والمسؤول</th>
            <th style="padding: 10px; border: 1px solid #334155; width: 90px; text-align: center;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${events.map((ev, idx) => {
            const statusText = ev.status === 'completed' ? '✅ مكتمل' : ev.status === 'in_progress' ? '⏳ جاري' : '📌 قادم';
            return `
              <tr style="border-bottom: 1px solid #cbd5e1; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: center; font-family: monospace; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 900; color: #b45309; font-size: 13px;">${ev.time}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1;">
                  <strong style="color: #0f172a; font-size: 13px; display: block;">${ev.title}</strong>
                  <span style="color: #475569; font-size: 11px; display: block; margin-top: 2px;">${ev.description}</span>
                  ${ev.performer ? `<span style="color: #4338ca; font-size: 10.5px; font-weight: 700;">🎤 المؤدي/المنسق: ${ev.performer}</span>` : ''}
                </td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; color: #1e293b; font-weight: 700;">📍 ${ev.location}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; color: #1e293b;">👥 ${ev.assignedTeam}</td>
                <td style="padding: 9px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: 800; font-size: 11px;">${statusText}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <!-- Signatures & Official Stamp -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #0f172a; padding-top: 18px;">
        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">توقيع مسؤول العمليات والليدر</p>
          <div style="margin-top: 32px; border-bottom: 2px dashed #cbd5e1; width: 80%; margin-left: auto; margin-right: auto;"></div>
        </div>

        <div style="width: 32%; text-align: center;">
          <div style="display: inline-block; border: 2px solid #1d4ed8; padding: 6px 14px; border-radius: 10px; color: #1d4ed8; font-weight: 900; font-size: 12px;">
            ★ معتمد رسمياً من عمليات كيان ★
          </div>
        </div>

        <div style="width: 32%; text-align: center;">
          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #475569;">اعتماد إدارة الفعالية</p>
          <div style="margin-top: 32px; border-bottom: 2px dashed #cbd5e1; width: 80%; margin-left: auto; margin-right: auto;"></div>
        </div>
      </div>

      <div style="margin-top: 16px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        جدول سير العمليات والفقرات المعتمد • صادر من نظام كيان لإدارة الفعاليات
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      onclone: sanitizeClonedDoc,
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = doc.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      doc.addPage();
      doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    saveJsPDFDoc(doc, `KAYAN_Run_of_Show_${settings.tripName || 'Schedule'}.pdf`);
    return true;
  } catch (err) {
    console.error('Error generating Run of Show PDF:', err);
    fallbackPrintElement(container, 'Run_of_Show');
    return false;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
};



