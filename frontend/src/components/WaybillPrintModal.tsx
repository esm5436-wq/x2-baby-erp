import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, LayoutGrid, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { Order, Branding, InvoiceSettings } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { downscaleDataUrl } from '../lib/imageUtils';

interface WaybillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  branding?: Branding;
  invoiceSettings?: InvoiceSettings;
}

const LAYOUT_OPTIONS = [
  { value: 1, label: '1', desc: 'بوليصة كاملة' },
  { value: 2, label: '2', desc: 'بوليصة مزدوجة' },
  { value: 4, label: '4', desc: '2×2' },
] as const;

const formatCurrency = (v: number) => new Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);
const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
const formatPrintDate = () => new Date().toLocaleString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const WaybillCard: React.FC<{ order: Order; branding?: Branding; invoiceSettings?: InvoiceSettings }> = React.memo(({ order, branding, invoiceSettings }) => (
  <div className="waybill-card bg-white rounded-2xl p-5 border-2 border-gray-100 relative">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        {branding?.logo && (
          <img src={branding.logo} alt="Logo" className="w-12 h-12 object-contain rounded-xl border border-gray-100" />
        )}
        <div>
          <h3 className="font-black text-sm text-gray-900">{branding?.name || 'X2 BABY'}</h3>
          {branding?.sloganDesign ? (
            <img src={branding.sloganDesign} alt="" className="h-5 w-auto object-contain mt-1" />
          ) : branding?.slogan ? (
            <p className="text-[9px] text-gray-500 font-bold">{branding.slogan}</p>
          ) : null}
        </div>
      </div>
      <div className="text-left">
        <p className="font-black text-xs text-gray-900">بوليصة شحن #{order.sourceId || order.id}</p>
        <p className="text-[9px] text-gray-500 font-bold">{formatDate(order.createdAt)}</p>
        <p className="text-[7px] text-gray-400 font-bold">تاريخ طباعة البوليصة: {formatPrintDate()}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-400 w-12 shrink-0">العميل:</span>
          <span className="text-[10px] font-bold text-gray-800">{order.customerName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-400 w-12 shrink-0">الهاتف:</span>
          <span className="text-[10px] font-bold font-mono text-gray-700" dir="ltr">{order.customerPhone}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[9px] font-black text-gray-400 w-12 shrink-0 mt-0.5">المدينة:</span>
          <span className="text-[10px] font-bold text-gray-600">{order.city || '-'}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-[9px] font-black text-gray-400 w-12 shrink-0 mt-0.5">العنوان:</span>
          <span className="text-[9px] font-bold text-gray-600 line-clamp-2">{order.address || '-'}</span>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-400 w-12 shrink-0">الشحن:</span>
          <span className="text-[10px] font-bold text-gray-800">{order.shippingMethod || 'شحن خارجي'}</span>
        </div>
        {order.shippingCompany && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-400 w-12 shrink-0">الشركة:</span>
            <span className="text-[10px] font-bold text-gray-600">{order.shippingCompany}</span>
          </div>
        )}
        {order.shippingCost ? (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-gray-400 w-12 shrink-0">التكلفة:</span>
            <span className="text-[10px] font-bold text-gray-600">{formatCurrency(order.shippingCost)}</span>
          </div>
        ) : null}
        {order.notes && (
          <div className="flex items-start gap-2">
            <span className="text-[9px] font-black text-gray-400 w-12 shrink-0 mt-0.5">ملاحظات:</span>
            <span className="text-[9px] font-bold text-gray-500 line-clamp-2">{order.notes}</span>
          </div>
        )}
      </div>
    </div>

    <table className="w-full mb-3">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-right text-[9px] font-black text-gray-400 pb-2">المنتج</th>
          <th className="text-right text-[9px] font-black text-gray-400 pb-2">المقاس</th>
          <th className="text-center text-[9px] font-black text-gray-400 pb-2">اللون</th>
          <th className="text-center text-[9px] font-black text-gray-400 pb-2">ك</th>
          <th className="text-left text-[9px] font-black text-gray-400 pb-2">السعر</th>
          <th className="text-left text-[9px] font-black text-gray-400 pb-2">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item, idx) => {
          const [size = '', color = ''] = (item.variantLabel || '').split(' - ');
          return (
            <tr key={idx} className="border-b border-gray-50">
              <td className="text-[10px] font-bold text-gray-800 py-1.5">{item.productName}</td>
              <td className="text-[10px] text-gray-600 py-1.5">{size || item.variantLabel}</td>
              <td className="text-center text-[10px] text-gray-600 py-1.5">{color || '-'}</td>
              <td className="text-center text-[10px] font-bold py-1.5">{item.quantity}</td>
              <td className="text-left text-[10px] font-bold py-1.5">{formatCurrency(item.price)}</td>
              <td className="text-left text-[10px] font-bold text-gray-900 py-1.5">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>

    <div className="border-t border-gray-200 pt-3 space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-gray-500">إجمالي المنتجات</span>
        <span className="font-bold">{formatCurrency(order.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
      </div>
      {order.shippingCost ? (
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-gray-500">الشحن</span>
          <span className="font-bold">{formatCurrency(order.shippingCost)}</span>
        </div>
      ) : null}
      {order.couponDiscount ? (
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-bold text-gray-500">الخصم ({order.coupon})</span>
          <span className="font-bold text-emerald-500">-{formatCurrency(order.couponDiscount)}</span>
        </div>
      ) : null}
      <div className="flex items-center justify-between text-xs border-t border-gray-200 pt-2">
        <span className="font-black text-gray-700">المطلوب تحصيله</span>
        <span className="font-black text-lg text-indigo-600">{formatCurrency(order.totalAmount)}</span>
      </div>
    </div>

    {invoiceSettings && (invoiceSettings.showExchangeReturnQr || invoiceSettings.showShippingQr || (invoiceSettings.showSocialQr && invoiceSettings.socialLinks?.some(l => l.url))) && (
      <div className="flex items-center justify-center gap-1 mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
        {invoiceSettings.showExchangeReturnQr && invoiceSettings.exchangeReturnUrl && (
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <QRCodeSVG value={invoiceSettings.exchangeReturnUrl} size={40} level="M" />
            <span className="text-[6px] font-bold text-gray-400 text-center whitespace-nowrap">سياسة الاستبدال والاسترجاع</span>
          </div>
        )}
        {invoiceSettings.showShippingQr && invoiceSettings.shippingUrl && (
          <div className="flex flex-col items-center gap-0.5 shrink-0">
            <QRCodeSVG value={invoiceSettings.shippingUrl} size={40} level="M" />
            <span className="text-[6px] font-bold text-gray-400 text-center whitespace-nowrap">سياسة الشحن</span>
          </div>
        )}
        {invoiceSettings.showSocialQr && invoiceSettings.socialLinks?.filter(l => l.url).map((link, idx) => {
          const platformNames: Record<string, string> = { store: 'المتجر', facebook: 'فيسبوك', instagram: 'إنستغرام', whatsapp: 'واتساب', tiktok: 'تيك توك', youtube: 'يوتيوب', x: 'X', linkedin: 'لينكد إن', snapchat: 'سناب شات', telegram: 'تيليغرام' };
          return (
            <div key={idx} className="flex flex-col items-center gap-0.5 shrink-0">
              <QRCodeSVG value={link.url} size={40} level="M" />
              <span className="text-[6px] font-bold text-gray-400 text-center whitespace-nowrap">{link.label || platformNames[link.platform] || link.platform}</span>
            </div>
          );
        })}
      </div>
    )}

    {invoiceSettings?.thankYouImage && (
      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-center">
        <img src={invoiceSettings.thankYouImage} alt="شكراً لك" className="h-16 w-auto object-contain" />
      </div>
    )}

    {invoiceSettings?.showFooterText && invoiceSettings?.footerText && (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-[9px] font-bold text-gray-500 text-center leading-relaxed whitespace-pre-line">{invoiceSettings.footerText}</p>
      </div>
    )}
  </div>
));

const WaybillCardHtml = ({ order, branding, invoiceSettings, qrSvgs, socialQrSvgs }: { order: Order; branding?: Branding; invoiceSettings?: InvoiceSettings; qrSvgs?: { exchangeReturn?: string; shipping?: string }; socialQrSvgs?: { svg: string; platform: string }[] }) => {
  const formatC = (v: number) => new Intl.NumberFormat('ar-EG-u-nu-latn', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(v);
  const formatD = (d: string) => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatPrintD = () => new Date().toLocaleString('ar-EG-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const itemsRows = order.items.map(item => {
    const [s = '', c = ''] = (item.variantLabel || '').split(' - ');
    return `<tr><td>${item.productName}</td><td>${s || item.variantLabel}</td><td style="text-align:center">${c || '-'}</td><td style="text-align:center">${item.quantity}</td><td style="text-align:left">${formatC(item.price)}</td><td style="text-align:left">${formatC(item.price * item.quantity)}</td></tr>`;
  }).join('');

  const orderId = order.sourceId || order.id;

  const platformNames: Record<string, string> = { store: 'المتجر', facebook: 'فيسبوك', instagram: 'إنستغرام', whatsapp: 'واتساب', tiktok: 'تيك توك', youtube: 'يوتيوب', x: 'X', linkedin: 'لينكد إن', snapchat: 'سناب شات', telegram: 'تيليغرام' };

  const qrSection = invoiceSettings && (invoiceSettings.showExchangeReturnQr || invoiceSettings.showShippingQr || (invoiceSettings.showSocialQr && socialQrSvgs?.length))
    ? `<div class="qr-section">
        ${invoiceSettings.showExchangeReturnQr && invoiceSettings.exchangeReturnUrl && qrSvgs?.exchangeReturn
          ? `<div class="qr-item">${qrSvgs.exchangeReturn}<span>استبدال واسترجاع</span></div>`
          : ''}
        ${invoiceSettings.showShippingQr && invoiceSettings.shippingUrl && qrSvgs?.shipping
          ? `<div class="qr-item">${qrSvgs.shipping}<span>سياسة الشحن</span></div>`
          : ''}
        ${(invoiceSettings.showSocialQr && socialQrSvgs?.length)
          ? socialQrSvgs.map(sq => `<div class="qr-item">${sq.svg}<span>${sq.platform}</span></div>`).join('')
          : ''}
      </div>`
    : '';

  const thankYouImage = invoiceSettings?.thankYouImage
    ? `<div class="thank-you-img"><img src="${invoiceSettings.thankYouImage}" alt="شكراً لك" /></div>`
    : '';

  const footerText = invoiceSettings?.showFooterText && invoiceSettings?.footerText
    ? `<div class="footer-text">${invoiceSettings.footerText}</div>`
    : '';

  return `
<div class="waybill-card">
  <div class="wb-header">
    <div class="wb-brand">
      ${branding?.logo ? `<img src="${branding.logo}" class="wb-logo" alt="Logo" />` : ''}
      <div>
        <h3>${branding?.name || 'X2 BABY'}</h3>
        ${branding?.sloganDesign
          ? `<img src="${branding.sloganDesign}" class="wb-slogan-img" alt="" />`
          : branding?.slogan
            ? `<p class="wb-slogan-text">${branding.slogan}</p>`
            : ''}
      </div>
    </div>
    <div class="wb-meta">
      <div class="wb-number">بوليصة شحن #${orderId}</div>
      <div class="wb-date">${formatD(order.createdAt)}</div>
      <div style="font-size:7px;color:#999;margin-top:2px;">تاريخ طباعة البوليصة: ${formatPrintD()}</div>
    </div>
  </div>
  <div class="wb-customer-grid">
    <div class="wb-customer-box">
      <div><span class="wb-label">العميل:</span><span class="wb-value">${order.customerName}</span></div>
      <div><span class="wb-label">الهاتف:</span><span class="wb-value" dir="ltr">${order.customerPhone}</span></div>
      <div><span class="wb-label">المدينة:</span><span class="wb-value">${order.city || '-'}</span></div>
      ${order.address ? `<div><span class="wb-label">العنوان:</span><span class="wb-value" style="font-size:9px;">${order.address}</span></div>` : ''}
    </div>
    <div class="wb-customer-box">
      <div><span class="wb-label">الشحن:</span><span class="wb-value">${order.shippingMethod || 'شحن خارجي'}</span></div>
      ${order.shippingCompany ? `<div><span class="wb-label">الشركة:</span><span class="wb-value">${order.shippingCompany}</span></div>` : ''}
      ${order.shippingCost ? `<div><span class="wb-label">التكلفة:</span><span class="wb-value">${formatC(order.shippingCost)}</span></div>` : ''}
      ${order.notes ? `<div><span class="wb-label">ملاحظات:</span><span class="wb-value" style="font-size:9px;">${order.notes}</span></div>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>المنتج</th><th>المقاس</th><th style="text-align:center">اللون</th><th style="text-align:center">ك</th><th style="text-align:left">السعر</th><th style="text-align:left">الإجمالي</th></tr></thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="wb-totals">
    <div class="wb-row"><span>إجمالي المنتجات</span><span>${formatC(order.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span></div>
    ${order.shippingCost ? `<div class="wb-row"><span>الشحن</span><span>${formatC(order.shippingCost)}</span></div>` : ''}
    ${order.couponDiscount ? `<div class="wb-row"><span>الخصم (${order.coupon})</span><span style="color:#10b981;">-${formatC(order.couponDiscount)}</span></div>` : ''}
    <div class="wb-grand"><span>المطلوب تحصيله</span><span class="wb-amount">${formatC(order.totalAmount)}</span></div>
  </div>
  ${qrSection}
  ${thankYouImage}
  ${footerText}
</div>`;
};

const generatePrintHtml = (orders: Order[], branding?: Branding, invoiceSettings?: InvoiceSettings, layout: number, qrSvgs?: { exchangeReturn?: string; shipping?: string }, socialQrSvgs?: { svg: string; platform: string }[], title?: string, perPageOverride?: number) => {
  const cols = layout === 4 ? 2 : layout === 2 ? 1 : 1;
  const perPage = perPageOverride || layout;
  const gridTemplate = `repeat(${cols}, 1fr)`;
  const isMulti = layout > 1;
  const pageMargin = '5mm';

  const allCards = orders.map(order => WaybillCardHtml({ order, branding, invoiceSettings, qrSvgs, socialQrSvgs })).join('');

  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<title>${title || 'بوليصات شحن'}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  @page { margin: ${pageMargin}; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; background: #f1f5f9; padding: 10px; }
  .print-grid { display: grid; grid-template-columns: ${gridTemplate}; gap: ${isMulti ? 12 : 16}px; }
  .waybill-card { background: white; border-radius: ${isMulti ? 4 : 12}px; padding: ${isMulti ? 10 : 16}px; border: ${isMulti ? '2px dashed #cbd5e1' : '1px solid #e2e8f0'}; page-break-inside: avoid; }
  .wb-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
  .wb-brand { display: flex; align-items: center; gap: 8px; }
  .wb-logo { width: 40px; height: 40px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; }
  .wb-brand h3 { font-size: 13px; font-weight: 900; color: #0f172a; }
  .wb-slogan-img { height: 14px; width: auto; object-fit: contain; margin-top: 1px; }
  .wb-slogan-text { font-size: 8px; color: #64748b; font-weight: 700; }
  .wb-meta { text-align: left; }
  .wb-number { font-size: 12px; font-weight: 900; color: #0f172a; }
  .wb-date { font-size: 8px; color: #94a3b8; font-weight: 700; }
  .wb-customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
  .wb-customer-box { background: #f8fafc; border-radius: 8px; padding: 8px; }
  .wb-customer-box div { display: flex; gap: 4px; margin-bottom: 2px; }
  .wb-label { font-size: 8px; font-weight: 900; color: #94a3b8; min-width: 36px; }
  .wb-value { font-size: 9px; font-weight: 700; color: #334155; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { text-align: right; font-size: 8px; font-weight: 900; color: #94a3b8; padding: 4px; border-bottom: 1px solid #e2e8f0; }
  td { font-size: 9px; padding: 3px 4px; border-bottom: 1px solid #f1f5f9; }
  .wb-totals { border-top: 1px solid #e2e8f0; padding-top: 6px; }
  .wb-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 2px; }
  .wb-grand { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 2px; }
  .wb-amount { font-size: 14px; color: #6366f1; }
  .qr-section { display: flex; justify-content: center; align-items: center; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; }
  .qr-item { display: flex; flex-direction: column; align-items: center; gap: 1px; }
  .qr-item svg { display: block; }
  .qr-item span { font-size: 6px; font-weight: 700; color: #94a3b8; white-space: nowrap; }
  .thank-you-img { margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; display: flex; justify-content: center; }
  .thank-you-img img { height: 48px; width: auto; object-fit: contain; }
  .footer-text { margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 7px; font-weight: 700; color: #64748b; }
  .waybill-card:nth-child(${perPage}n):not(:last-child) { page-break-after: always; }
  @media print {
    body { background: white; padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:20px;">
  <button onclick="window.print()" style="padding:12px 40px;background:#6366f1;color:white;border:none;border-radius:12px;font-size:14px;font-weight:900;cursor:pointer;">🖨️ طباعة</button>
  <p style="margin-top:8px;font-size:11px;color:#94a3b8;">${orders.length} بوليصة | تخطيط ${layout} لكل صفحة</p>
</div>
<div class="print-grid">${allCards}</div>
</body>
</html>`;
};

const WaybillPrintModal: React.FC<WaybillPrintModalProps> = ({ isOpen, onClose, orders, branding, invoiceSettings }) => {
  const [layout, setLayout] = useState<number>(1);
  const [previewPage, setPreviewPage] = useState(0);
  const [duplicateSingle, setDuplicateSingle] = useState(false);

  const cols = layout === 4 ? 2 : layout === 2 ? 1 : 1;
  const perPage = layout;
  const effectiveOrders = duplicateSingle && layout === 1 ? orders.flatMap(o => [o, o]) : orders;
  const effectivePerPage = duplicateSingle && layout === 1 ? 2 : perPage;
  const totalPages = Math.ceil(effectiveOrders.length / effectivePerPage);
  const pageOrders = effectiveOrders.slice(previewPage * effectivePerPage, (previewPage + 1) * effectivePerPage);

  const getPrintTitle = () => {
    const nums = orders.map(o => o.sourceId || o.id);
    if (orders.length === 1) return `بوليصة_${nums[0]}`;
    return `بوليصات_شحن_${nums.join('_')}`;
  };

  const handlePrint = async () => {
    const title = getPrintTitle();

    let processedBranding = branding;
    let processedInvoiceSettings = invoiceSettings;
    try {
      if (branding?.logo) {
        const downscaledLogo = await downscaleDataUrl(branding.logo, 240, 0.7);
        processedBranding = { ...branding, logo: downscaledLogo };
      }
      if (invoiceSettings?.thankYouImage) {
        const downscaledThankYou = await downscaleDataUrl(invoiceSettings.thankYouImage, 180, 0.7);
        processedInvoiceSettings = { ...invoiceSettings, thankYouImage: downscaledThankYou };
      }
    } catch (_) {}

    const stripXmlProlog = (svg: string) => svg.replace(/^<\?xml[\s\S]*?\?>/, '').replace(/^<!DOCTYPE[\s\S]*?>/, '').trim();
    let qrSvgs: { exchangeReturn?: string; shipping?: string } = {};
    let socialQrSvgs: { svg: string; platform: string }[] = [];
    try {
      if (processedInvoiceSettings?.showExchangeReturnQr && processedInvoiceSettings?.exchangeReturnUrl) {
        const raw = await QRCode.toString(processedInvoiceSettings.exchangeReturnUrl, { type: 'svg', width: 40, margin: 1 });
        qrSvgs.exchangeReturn = stripXmlProlog(raw);
      }
      if (processedInvoiceSettings?.showShippingQr && processedInvoiceSettings?.shippingUrl) {
        const raw = await QRCode.toString(processedInvoiceSettings.shippingUrl, { type: 'svg', width: 40, margin: 1 });
        qrSvgs.shipping = stripXmlProlog(raw);
      }
      if (processedInvoiceSettings?.showSocialQr && processedInvoiceSettings?.socialLinks?.length) {
        const platformNames: Record<string, string> = { store: 'المتجر', facebook: 'فيسبوك', instagram: 'إنستغرام', whatsapp: 'واتساب', tiktok: 'تيك توك', youtube: 'يوتيوب', x: 'X', linkedin: 'لينكد إن', snapchat: 'سناب شات', telegram: 'تيليغرام' };
        for (const link of processedInvoiceSettings.socialLinks) {
          if (link.url) {
            const raw = await QRCode.toString(link.url, { type: 'svg', width: 40, margin: 1 });
            socialQrSvgs.push({ svg: stripXmlProlog(raw), platform: platformNames[link.platform] || link.platform });
          }
        }
      }
    } catch (e) { console.error('QR generation failed:', e); }

    const html = generatePrintHtml(effectiveOrders, processedBranding, processedInvoiceSettings, layout, qrSvgs, socialQrSvgs, title, effectivePerPage);
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.document.title = title;
      win.focus();
      win.onafterprint = () => win.close();
      setTimeout(() => { win.print(); }, 500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-5xl max-h-[90vh] shadow-2xl border border-white/20 overflow-hidden flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-500" />

            <div className="p-6 pb-0 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">طباعة بوليصات الشحن</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-1">
                    {orders.length} بوليصة
                    {duplicateSingle && layout === 1 ? <span className="mr-2 text-emerald-500">· نسختين لكل صفحة</span> : ''}
                  </p>
                </div>
                <button onClick={onClose} className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-2xl hover:text-red-500 transition-all active:scale-95">
                  <X size={22} />
                </button>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-gray-400">تخطيط الطباعة</span>
                  <div className="flex gap-2">
                    {LAYOUT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setLayout(opt.value); setPreviewPage(0); if (opt.value !== 1) setDuplicateSingle(false); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 ${
                          layout === opt.value
                            ? 'bg-indigo-500 text-white shadow-lg'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <LayoutGrid size={14} />
                        {opt.label}
                        <span className="text-[8px] opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1" />

                {layout === 1 && (
                  <button
                    onClick={() => { setDuplicateSingle(!duplicateSingle); setPreviewPage(0); }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all active:scale-95 ${
                      duplicateSingle
                        ? 'bg-emerald-500 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                    }`}
                    title="نسخ البطاقة لتكرر في الصفحة لتعبئة المساحة الفارغة وتوفير الورق"
                  >
                    <Copy size={14} />
                    {duplicateSingle ? 'نسختين' : 'تكرار'}
                  </button>
                )}

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl font-black hover:shadow-lg transition-all active:scale-95"
                >
                  <Printer size={20} />
                  طباعة
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="bg-gray-50 dark:bg-slate-900/50 rounded-[32px] p-6 border border-gray-100 dark:border-slate-800">
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <button
                      onClick={() => setPreviewPage(p => Math.max(0, p - 1))}
                      disabled={previewPage === 0}
                      className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 disabled:opacity-30"
                    >
                      <ChevronRight size={18} />
                    </button>
                    <span className="text-xs font-black text-gray-500">
                      صفحة {previewPage + 1} من {totalPages}
                    </span>
                    <button
                      onClick={() => setPreviewPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={previewPage >= totalPages - 1}
                      className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 disabled:opacity-30"
                    >
                      <ChevronLeft size={18} />
                    </button>
                  </div>
                )}
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: cols === 1 ? '1fr' : '1fr 1fr',
                  }}
                >
                  {pageOrders.map((order, idx) => (
                    <WaybillCard
                      key={order.id + '_' + idx + '_' + previewPage}
                      order={order}
                      branding={branding}
                      invoiceSettings={invoiceSettings}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WaybillPrintModal;
