import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb, allDb, runDb, logActivity, generateOrderId, getAllProducts, adjustStock, isActiveStatus } from '../db.js';
import { searchProducts } from './search.js';

export async function getApiKeys() {
  const row = await getDb("SELECT value FROM settings WHERE key = 'ai_api_keys'");
  if (!row) return [];
  try {
    return JSON.parse(row.value);
  } catch {
    return [];
  }
}

function buildSystemInstruction() {
  const statusList = [
    'تحت المراجعة', 'تم التأكيد', 'في انتظار الدفع', 'تم الدفع', 'فشل الدفع',
    'قيد التجهيز للشحن', 'بانتظار الشحن', 'قيد التوصيل', 'تم التوصيل',
    'تم الغاء الطلب', 'مرتجع من الشحن', 'العميل طلب الارجاع', 'جاري الارجاع', 'تم الارجاع',
    'طلب غير مكتمل', 'مخاطر عالية', 'مخاطر متوسطة'
  ].join('، ');

  return `أنت "مساعد X2 الذكي" (X2 Smart Assistant)، الخبير الشامل والمتكامل بنظام X2 BABY ERP. أنت المتحكم الكامل في النظام ولديك صلاحية تنفيذ أي شيء فيه.

### ميثاق العمل:
1. **اللهجة**: مصرية محترفة، ودودة، عملية جداً.
2. **الدقة**: استخدم جداول Markdown دائماً لعرض الأرقام والقوائم.
3. **الأمان**: لا تحذف أو تغير بيانات مهمة بدون تأكيد المستخدم أولاً.
4. **الاستباقية**: حلل البيانات واقترح تحسينات وحلول قبل أن يطلبها المستخدم.

### المعرفة الكاملة بقاعدة البيانات (Database Schema):

**1. المنتجات (Products) — جدول products (id, data JSON)**
- الحقول: id, name, image, images[], price, costPrice, wholesalePrice, packagingCost, category, tags[], variants[], supplierId, createdAt, description, brand
- الـ Variant: { id, size, color, quantity, price, lowStockThreshold }
- التصنيفات (Categories) منفصلة في جدول categories (id, name, parentId)

**2. الطلبات (Orders) — جدول orders (id, data JSON)**
- الحقول: id, customerName, customerPhone, address, notes, items[], totalAmount, totalCost, status, createdAt, city, shippingCost, coupon, couponDiscount, altPhone, extraData, extraData2, ref, utmSource, utmCampaign, paymentMethod, paymentStatus, funnelId, referralCode, externalOrderId, shippingMethod, shippingCompany, mapUrl, latitude, longitude
- حالات الطلب: ${statusList}
- كل طلب يحتوي على items: [{ productId, variantId, productName, variantLabel, quantity, price, costPrice }]

**3. الموردين (Suppliers) — جدول suppliers (id, name, phone, phone2, created_at)**

**4. فواتير المشتريات (Purchase Invoices) — جدولين: purchase_invoices + purchase_invoice_items**
- الفاتورة: id, supplierId, invoiceNumber, date, totalAmount, paymentMethod, image
- بنودها: id, invoiceId, productId, variantId, quantity, buyPrice
- عند إضافة فاتورة: يزيد المخزون للـ variant + يُحدث سعر التكلفة + يُسجل مصروف

**5. جهات الاتصال (Contacts) — جدول contacts**
- الحقول: id, companyName, phone, phone2, contactPerson, extraPhones, email, address, specialization, entityType (عميل/مورد/مصنع/شريك/أخرى), taxId, commercialRegistry, notes, status (نشط/غير نشط), latitude, longitude, mapUrl, ratingsEnabled, ratingsData, links

**6. المصروفات (Expenses) — جدول expenses**
- الحقول: id, amount, category, description, beneficiaryId, created_at
- فيه بند خاص: 'مشتريات مخزون (Inventory)' يأتي من فواتير المشتريات

**7. الأهداف المالية (Financial Targets) — جدول financial_targets**
- الحقول: id, title, amount, startDate, deadline, category (net_profit/total_sales)

**8. الكوبونات (Coupons) — جدول saved_coupons**
- الحقول: code (PK), discount, is_percent, updated_at

**9. نقاط الاستعادة (Checkpoints) — جدول checkpoints**
- الحقول: id, name, snapshot (JSON كامل), created_at

**10. سجل النشاطات (Activity Logs) — جدول activity_logs**
- الحقول: id, action, entity_type, entity_id, description, metadata JSON, created_at

**11. Easy Orders — جدولين: easyorders_staging + easyorders_product_map + easyorders_sync_log**
- طلبات المراجعة pending → confirm → تصبح Orders رسمية
- خرائط المنتجات لربط ERP مع Easy Orders

**12. الإعدادات (Settings) — جدول settings key-value**
- ai_api_keys, brandLogo, brandName, brandSlogan, categories, isManualMode, taxEnabled, taxRate, invoiceSettings, easyorders_config وغيرها

### استراتيجية التسعير الذكي (X2 Smart Pricing):
- تقريب الأسعار لتنتهي بـ 9 أو 49 (مثلاً 149 بدلاً من 150)
- 3 مستويات هامش ربح: سريع 20-25% | متوازن 40-50% | مميز 60%+

### تعليمات الصور:
لما تستلم صورة منتج: حللها ← ابحث في المخزون (search_products) ← لو مش موجود اقترح إضافته (add_product)

### المبدأ الأساسي:
أنت الـ Admin المطلق. تقدر تعمل أي حاجة في النظام: تقارير، تعديلات، إضافة، حذف، استعلامات. تعامل مع النظام على إنه بتاعك وانت عارف كل حاجة فيه.`;
}

function buildTools() {
  return [{
    functionDeclarations: [
      // ========== المنتجات (Products) ==========
      {
        name: "get_stock_summary",
        description: "ملخص كامل للمخزون: عدد المنتجات، إجمالي قيمة المخزون، أسماء المنتجات"
      },
      {
        name: "get_all_products",
        description: "عرض كل المنتجات في المخزون مع تفاصيلها كاملة (اختياري: filter by category)",
        parameters: {
          type: "object",
          properties: { category: { type: "string", description: "فلترة حسب التصنيف (اختياري)" } }
        }
      },
      {
        name: "search_products",
        description: "البحث عن منتجات بالاسم أو الوصف",
        parameters: {
          type: "object",
          properties: { query: { type: "string", description: "كلمة البحث" } },
          required: ["query"]
        }
      },
      {
        name: "get_product_by_id",
        description: "عرض منتج محدد بكل تفاصيله",
        parameters: {
          type: "object",
          properties: { productId: { type: "string", description: "معرف المنتج" } },
          required: ["productId"]
        }
      },
      {
        name: "add_product",
        description: "إضافة منتج جديد كامل التفاصيل للنظام",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "اسم المنتج" },
            price: { type: "number", description: "سعر البيع" },
            category: { type: "string", description: "التصنيف" },
            costPrice: { type: "number", description: "سعر التكلفة (اختياري، 70% من السعر افتراضياً)" },
            wholesalePrice: { type: "number", description: "سعر الجملة (اختياري)" },
            packagingCost: { type: "number", description: "تكلفة التغليف (اختياري)" },
            quantity: { type: "number", description: "الكمية المتاحة (اختياري، افتراضي 1)" },
            description: { type: "string", description: "وصف المنتج (اختياري)" },
            image: { type: "string", description: "رابط صورة المنتج (اختياري)" },
            supplierId: { type: "string", description: "معرف المورد (اختياري)" }
          },
          required: ["name", "price"]
        }
      },
      {
        name: "update_product",
        description: "تعديل بيانات منتج موجود (الاسم/السعر/التصنيف/الخ)",
        parameters: {
          type: "object",
          properties: {
            productId: { type: "string", description: "معرف المنتج" },
            name: { type: "string", description: "الاسم الجديد (اختياري)" },
            price: { type: "number", description: "السعر الجديد (اختياري)" },
            category: { type: "string", description: "التصنيف الجديد (اختياري)" },
            costPrice: { type: "number", description: "تكلفة جديدة (اختياري)" },
            description: { type: "string", description: "وصف جديد (اختياري)" }
          },
          required: ["productId"]
        }
      },
      {
        name: "update_product_variants",
        description: "تعديل كمية أو سعر variant معين لمنتج",
        parameters: {
          type: "object",
          properties: {
            productId: { type: "string", description: "معرف المنتج" },
            variantId: { type: "string", description: "معرف الـ variant" },
            quantity: { type: "number", description: "الكمية الجديدة (اختياري)" },
            price: { type: "number", description: "السعر الجديد للـ variant (اختياري)" }
          },
          required: ["productId", "variantId"]
        }
      },
      {
        name: "delete_product",
        description: "حذف منتج نهائياً من النظام",
        parameters: {
          type: "object",
          properties: { productId: { type: "string" } },
          required: ["productId"]
        }
      },
      // ========== الطلبات (Orders) ==========
      {
        name: "get_all_orders",
        description: "عرض كل الطلبات مع حالتها ومبالغها (اختياري: فلترة بالحالة)",
        parameters: {
          type: "object",
          properties: {
            status: { type: "string", description: "فلترة حسب الحالة (اختياري)" },
            limit: { type: "number", description: "أقصى عدد للطلبات (اختياري، افتراضي 50)" }
          }
        }
      },
      {
        name: "get_order_by_id",
        description: "عرض طلب محدد بكل تفاصيله",
        parameters: {
          type: "object",
          properties: { orderId: { type: "string" } },
          required: ["orderId"]
        }
      },
      {
        name: "create_order",
        description: "إنشاء طلب جديد كامل في النظام",
        parameters: {
          type: "object",
          properties: {
            customerName: { type: "string", description: "اسم العميل" },
            customerPhone: { type: "string", description: "رقم هاتف العميل" },
            items: {
              type: "array",
              description: "مصفوفة من المنتجات في الطلب",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  variantId: { type: "string" },
                  productName: { type: "string" },
                  quantity: { type: "number" },
                  price: { type: "number" }
                },
                required: ["productId", "productName", "quantity", "price"]
              }
            },
            totalAmount: { type: "number", description: "إجمالي المبلغ" },
            status: { type: "string", description: "حالة الطلب (اختياري، افتراضي تحت المراجعة)" },
            address: { type: "string", description: "العنوان (اختياري)" },
            city: { type: "string", description: "المدينة (اختياري)" },
            shippingCost: { type: "number", description: "تكلفة الشحن (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" }
          },
          required: ["customerName", "items", "totalAmount"]
        }
      },
      {
        name: "update_order",
        description: "تعديل طلب موجود (العميل/العنوان/المنتجات/المبلغ)",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            customerName: { type: "string", description: "اسم العميل (اختياري)" },
            address: { type: "string", description: "العنوان (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" }
          },
          required: ["orderId"]
        }
      },
      {
        name: "update_order_status",
        description: "تعديل حالة طلب معين",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string" },
            status: { type: "string", description: "الحالة الجديدة من القائمة: تحت المراجعة، تم التأكيد، في انتظار الدفع، تم الدفع، قيد التجهيز للشحن، بانتظار الشحن، قيد التوصيل، تم التوصيل، تم الغاء الطلب، مرتجع من الشحن، العميل طلب الارجاع، جاري الارجاع، تم الارجاع، طلب غير مكتمل، مخاطر عالية، مخاطر متوسطة" }
          },
          required: ["orderId", "status"]
        }
      },
      {
        name: "delete_order",
        description: "حذف طلب نهائياً من النظام",
        parameters: {
          type: "object",
          properties: { orderId: { type: "string" } },
          required: ["orderId"]
        }
      },
      // ========== المالية (Financial) ==========
      {
        name: "get_financial_summary",
        description: "ملخص مالي كامل: إجمالي المبيعات، الأرباح، المصروفات، هامش الربح"
      },
      {
        name: "get_low_stock_report",
        description: "تقرير المنتجات التي أوشكت على النفاذ (الكمية أقل من الحد الأدنى)"
      },
      {
        name: "get_expenses",
        description: "عرض المصروفات (اختياري: فلترة حسب التاريخ أو التصنيف)",
        parameters: {
          type: "object",
          properties: {
            category: { type: "string", description: "تصنيف المصروف (اختياري)" },
            startDate: { type: "string", description: "تاريخ البداية (اختياري)" },
            endDate: { type: "string", description: "تاريخ النهاية (اختياري)" }
          }
        }
      },
      {
        name: "add_expense",
        description: "إضافة مصروف جديد",
        parameters: {
          type: "object",
          properties: {
            amount: { type: "number", description: "المبلغ" },
            category: { type: "string", description: "التصنيف (مثلاً: إيجار، فواتير، رواتب، تسويق، تغليف، شحن، صيانة، مشتريات مخزون، أخرى)" },
            description: { type: "string", description: "الوصف (اختياري)" },
            date: { type: "string", description: "التاريخ (اختياري، format: ISO)" }
          },
          required: ["amount", "category"]
        }
      },
      {
        name: "delete_expense",
        description: "حذف مصروف",
        parameters: {
          type: "object",
          properties: { expenseId: { type: "number" } },
          required: ["expenseId"]
        }
      },
      {
        name: "get_financial_targets",
        description: "عرض الأهداف المالية الحالية"
      },
      {
        name: "add_financial_target",
        description: "إضافة هدف مالي جديد",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "عنوان الهدف" },
            amount: { type: "number", description: "المبلغ المستهدف" },
            deadline: { type: "string", description: "الموعد النهائي (ISO date)" },
            category: { type: "string", description: "net_profit (صافي الربح) أو total_sales (إجمالي المبيعات)" },
            startDate: { type: "string", description: "تاريخ البداية (اختياري)" }
          },
          required: ["title", "amount", "deadline", "category"]
        }
      },
      {
        name: "delete_financial_target",
        description: "حذف هدف مالي",
        parameters: {
          type: "object",
          properties: { targetId: { type: "string" } },
          required: ["targetId"]
        }
      },
      // ========== الموردين (Suppliers) ==========
      {
        name: "get_suppliers",
        description: "عرض جميع الموردين المسجلين في النظام"
      },
      {
        name: "add_supplier",
        description: "إضافة مورد جديد",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "اسم المورد" },
            phone: { type: "string", description: "رقم الهاتف (اختياري)" },
            phone2: { type: "string", description: "رقم هاتف ثاني (اختياري)" }
          },
          required: ["name"]
        }
      },
      {
        name: "delete_supplier",
        description: "حذف مورد",
        parameters: {
          type: "object",
          properties: { supplierId: { type: "string" } },
          required: ["supplierId"]
        }
      },
      // ========== جهات الاتصال (Contacts) ==========
      {
        name: "get_contacts",
        description: "عرض جهات الاتصال (اختياري: فلترة حسب النوع)",
        parameters: {
          type: "object",
          properties: {
            entityType: { type: "string", description: "عميل/مورد/مصنع/شريك/أخرى (اختياري)" },
            search: { type: "string", description: "بحث بالاسم أو الهاتف (اختياري)" }
          }
        }
      },
      {
        name: "add_contact",
        description: "إضافة جهة اتصال جديدة",
        parameters: {
          type: "object",
          properties: {
            companyName: { type: "string", description: "اسم الشركة" },
            phone: { type: "string", description: "رقم الهاتف (اختياري)" },
            entityType: { type: "string", description: "عميل/مورد/مصنع/شريك/أخرى (اختياري، افتراضي 'أخرى')" },
            specialization: { type: "string", description: "التخصص (اختياري)" },
            address: { type: "string", description: "العنوان (اختياري)" },
            email: { type: "string", description: "البريد الإلكتروني (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" },
            contactPerson: { type: "string", description: "جهة الاتصال بالشركة (اختياري)" }
          },
          required: ["companyName"]
        }
      },
      {
        name: "update_contact",
        description: "تعديل بيانات جهة اتصال",
        parameters: {
          type: "object",
          properties: {
            contactId: { type: "string" },
            companyName: { type: "string", description: "اسم الشركة (اختياري)" },
            phone: { type: "string", description: "رقم الهاتف (اختياري)" },
            entityType: { type: "string", description: "النوع (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" },
            status: { type: "string", description: "نشط/غير نشط (اختياري)" }
          },
          required: ["contactId"]
        }
      },
      {
        name: "delete_contact",
        description: "حذف جهة اتصال",
        parameters: {
          type: "object",
          properties: { contactId: { type: "string" } },
          required: ["contactId"]
        }
      },
      // ========== التصنيفات (Categories) ==========
      {
        name: "get_categories",
        description: "عرض جميع التصنيفات"
      },
      {
        name: "add_category",
        description: "إضافة تصنيف جديد",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "اسم التصنيف" },
            parentId: { type: "string", description: "التصنيف الأب (اختياري للتصنيفات الفرعية)" }
          },
          required: ["name"]
        }
      },
      {
        name: "delete_category",
        description: "حذف تصنيف (مع التصنيفات الفرعية)",
        parameters: {
          type: "object",
          properties: { categoryId: { type: "string" } },
          required: ["categoryId"]
        }
      },
      // ========== فواتير المشتريات ==========
      {
        name: "get_purchase_invoices",
        description: "عرض فواتير المشتريات"
      },
      {
        name: "create_purchase_invoice",
        description: "إضافة فاتورة مشتريات جديدة (تزيد المخزون وتحدث التكلفة)",
        parameters: {
          type: "object",
          properties: {
            supplierId: { type: "string", description: "معرف المورد" },
            supplierName: { type: "string", description: "اسم المورد" },
            invoiceNumber: { type: "string", description: "رقم الفاتورة" },
            totalAmount: { type: "number", description: "إجمالي المبلغ" },
            date: { type: "string", description: "التاريخ (ISO date)" },
            paymentMethod: { type: "string", description: "نقد/آجل/تحويل بنكي (اختياري)" },
            items: {
              type: "array",
              description: "المنتجات المشتراة",
              items: {
                type: "object",
                properties: {
                  productId: { type: "string" },
                  variantId: { type: "string" },
                  quantity: { type: "number" },
                  buyPrice: { type: "number" }
                },
                required: ["productId", "variantId", "quantity", "buyPrice"]
              }
            }
          },
          required: ["supplierId", "supplierName", "invoiceNumber", "totalAmount", "date", "items"]
        }
      },
      // ========== الكوبونات (Coupons) ==========
      {
        name: "get_coupons",
        description: "عرض جميع الكوبونات"
      },
      {
        name: "add_coupon",
        description: "إضافة أو تحديث كوبون خصم",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "كود الكوبون" },
            discount: { type: "number", description: "قيمة الخصم" },
            is_percent: { type: "boolean", description: "هل الخصم نسبة مئوية؟ (اختياري)" }
          },
          required: ["code", "discount"]
        }
      },
      {
        name: "delete_coupon",
        description: "حذف كوبون",
        parameters: {
          type: "object",
          properties: { code: { type: "string" } },
          required: ["code"]
        }
      },
      // ========== نقاط الاستعادة (Checkpoints) ==========
      {
        name: "get_checkpoints",
        description: "عرض نقاط الاستعادة المتاحة"
      },
      {
        name: "create_checkpoint",
        description: "إنشاء نقطة استعادة (نسخة احتياطية كاملة) الآن",
        parameters: {
          type: "object",
          properties: { name: { type: "string", description: "اسم نقطة الاستعادة" } },
          required: ["name"]
        }
      },
      // ========== Easy Orders ==========
      {
        name: "easy_orders_get_staging",
        description: "عرض طلبات Easy Orders قيد المراجعة"
      },
      {
        name: "easy_orders_confirm_staging",
        description: "تأكيد طلب Easy Orders وتحويله لطلب رسمي في النظام",
        parameters: {
          type: "object",
          properties: { stagingId: { type: "string" } },
          required: ["stagingId"]
        }
      },
      {
        name: "easy_orders_reject_staging",
        description: "رفض طلب Easy Orders قيد المراجعة",
        parameters: {
          type: "object",
          properties: { stagingId: { type: "string" } },
          required: ["stagingId"]
        }
      },
      // ========== سجل النشاطات والإعدادات ==========
      {
        name: "get_activity_logs",
        description: "عرض سجل النشاطات (اختياري: فلترة)",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "آخر كام نشاط (اختياري، افتراضي 20)" },
            entity_type: { type: "string", description: "نوع الكيان: product/order/contact/supplier/target/category/expense (اختياري)" }
          }
        }
      },
      {
        name: "get_settings",
        description: "عرض إعدادات النظام (العلامة التجارية، الضرائب، إلخ)"
      },
      // ========== المشتريات (Purchase - اختصار للوصول السريع) ==========
      {
        name: "get_branding_info",
        description: "عرض معلومات العلامة التجارية (الاسم، الشعار، الشعار النصي)"
      }
    ]
  }];
}

const toolHandlers = {
  async get_stock_summary() {
    const rows = await allDb("SELECT data FROM products");
    const products = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    const totalValue = products.reduce((sum, p) => {
      const mainPrice = p.variants?.[0]?.price || p.price || 0;
      const qty = p.variants?.reduce((s, v) => s + (v.quantity || 0), 0) || 0;
      return sum + (mainPrice * qty);
    }, 0);
    const totalQty = products.reduce((sum, p) =>
      sum + (p.variants?.reduce((s, v) => s + (v.quantity || 0), 0) || 0), 0);
    return {
      total_products: products.length,
      total_quantity: totalQty,
      total_stock_value: `${totalValue.toFixed(2)} ج.م`,
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category || '',
        variants_count: p.variants?.length || 0,
        total_quantity: p.variants?.reduce((s, v) => s + (v.quantity || 0), 0) || 0,
        price: p.price || p.variants?.[0]?.price || 0
      }))
    };
  },

  async get_all_products(args) {
    const rows = await allDb("SELECT data FROM products");
    let products = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    if (args?.category) {
      products = products.filter(p => p.category === args.category);
    }
    return products.map(p => ({
      id: p.id, name: p.name, price: p.price || p.variants?.[0]?.price || 0,
      costPrice: p.costPrice || 0, category: p.category || '',
      variants: (p.variants || []).map(v => ({
        id: v.id, size: v.size, color: v.color, quantity: v.quantity || 0, price: v.price || p.price || 0
      })),
      supplierId: p.supplierId || '', createdAt: p.createdAt || ''
    }));
  },

  async search_products(args) {
    return await searchProducts(args.query);
  },

  async get_product_by_id(args) {
    const row = await getDb("SELECT data FROM products WHERE id = ?", [args.productId]);
    if (!row) return { error: "المنتج غير موجود" };
    return JSON.parse(row.data);
  },

  async add_product(args, refreshState) {
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const costPrice = args.costPrice || (args.price * 0.7);
    const qty = args.quantity || 1;
    const product = {
      id, name: args.name, price: args.price, category: args.category || '',
      costPrice, wholesalePrice: args.wholesalePrice || costPrice,
      packagingCost: args.packagingCost || 0,
      description: args.description || '',
      image: args.image || '',
      supplierId: args.supplierId || '',
      createdAt: new Date().toISOString(),
      variants: [{
        id: `v-${id}`,
        size: "Standard", color: "Default", quantity: qty, price: args.price,
        lowStockThreshold: 2
      }]
    };
    await runDb("INSERT INTO products (id, data) VALUES (?, ?)", [id, JSON.stringify(product)]);
    refreshState.current = true;
    await logActivity('create', 'product', id, `[AI] تم إضافة المنتج ${args.name}`);
    return { success: true, message: "تمت إضافة المنتج بنجاح", productId: id, product };
  },

  async update_product(args, refreshState) {
    const row = await getDb("SELECT data FROM products WHERE id = ?", [args.productId]);
    if (!row) return { error: "المنتج غير موجود" };
    const product = JSON.parse(row.data);
    if (args.name) product.name = args.name;
    if (args.price) product.price = args.price;
    if (args.category) product.category = args.category;
    if (args.costPrice) product.costPrice = args.costPrice;
    if (args.description) product.description = args.description;
    await runDb("UPDATE products SET data = ? WHERE id = ?", [JSON.stringify(product), args.productId]);
    refreshState.current = true;
    await logActivity('update', 'product', args.productId, `[AI] تم تعديل المنتج ${product.name}`);
    return { success: true, message: "تم تعديل المنتج بنجاح", product };
  },

  async update_product_variants(args, refreshState) {
    const row = await getDb("SELECT data FROM products WHERE id = ?", [args.productId]);
    if (!row) return { error: "المنتج غير موجود" };
    const product = JSON.parse(row.data);
    let found = false;
    product.variants = (product.variants || []).map(v => {
      if (v.id === args.variantId) {
        found = true;
        if (args.quantity !== undefined) v.quantity = args.quantity;
        if (args.price !== undefined) v.price = args.price;
      }
      return v;
    });
    if (!found) return { error: "الـ variant غير موجود" };
    await runDb("UPDATE products SET data = ? WHERE id = ?", [JSON.stringify(product), args.productId]);
    refreshState.current = true;
    await logActivity('update', 'product', args.productId, `[AI] تم تعديل variant للمنتج ${product.name}`);
    return { success: true, message: "تم تعديل الـ variant بنجاح" };
  },

  async delete_product(args, refreshState) {
    const row = await getDb("SELECT data FROM products WHERE id = ?", [args.productId]);
    await runDb("DELETE FROM products WHERE id = ?", [args.productId]);
    refreshState.current = true;
    if (row) {
      const p = JSON.parse(row.data);
      await logActivity('delete', 'product', args.productId, `[AI] تم حذف المنتج ${p.name}`);
    }
    return { success: true };
  },

  // ====== Orders ======

  async get_all_orders(args) {
    const limit = args?.limit || 50;
    const rows = await allDb("SELECT data FROM orders ORDER BY id DESC LIMIT ?", [limit]);
    let orders = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    if (args?.status) {
      orders = orders.filter(o => o.status === args.status);
    }
    return orders.map(o => ({
      id: o.id, customerName: o.customerName, customerPhone: o.customerPhone || '',
      totalAmount: o.totalAmount || 0, totalCost: o.totalCost || 0,
      status: o.status, createdAt: o.createdAt, address: o.address || '',
      city: o.city || '', shippingCost: o.shippingCost || 0,
      paymentMethod: o.paymentMethod || '', items_count: o.items?.length || 0
    }));
  },

  async get_order_by_id(args) {
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [args.orderId]);
    if (!row) return { error: "الطلب غير موجود" };
    return JSON.parse(row.data);
  },

  async create_order(args, refreshState) {
    const newId = await generateOrderId();
    const totalCost = (args.items || []).reduce((sum, item) =>
      sum + ((item.costPrice || item.price * 0.7) * item.quantity), 0);
    const order = {
      id: newId,
      customerName: args.customerName,
      customerPhone: args.customerPhone || '',
      address: args.address || '',
      city: args.city || '',
      shippingCost: args.shippingCost || 0,
      notes: args.notes || '',
      items: (args.items || []).map(item => ({
        productId: item.productId,
        variantId: item.variantId || `v-${item.productId}`,
        productName: item.productName,
        variantLabel: item.variantLabel || 'Standard',
        quantity: item.quantity,
        price: item.price,
        costPrice: item.costPrice || item.price * 0.7
      })),
      totalAmount: args.totalAmount,
      totalCost,
      status: args.status || 'تحت المراجعة',
      createdAt: new Date().toISOString()
    };
    if (isActiveStatus(order.status)) {
      await adjustStock(order.items || [], 'deduct');
    }
    await runDb("INSERT INTO orders (id, data) VALUES (?, ?)", [newId, JSON.stringify(order)]);
    refreshState.current = true;
    await logActivity('create', 'order', newId, `[AI] تم إنشاء الطلب للعميل ${args.customerName}`);
    return { success: true, message: "تم إنشاء الطلب بنجاح", orderId: newId, order };
  },

  async update_order(args, refreshState) {
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [args.orderId]);
    if (!row) return { error: "الطلب غير موجود" };
    const order = JSON.parse(row.data);
    if (args.customerName) order.customerName = args.customerName;
    if (args.address) order.address = args.address;
    if (args.notes) order.notes = args.notes;
    if (args.customerPhone) order.customerPhone = args.customerPhone;
    await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(order), args.orderId]);
    refreshState.current = true;
    await logActivity('update', 'order', args.orderId, `[AI] تم تعديل الطلب للعميل ${order.customerName}`);
    return { success: true, message: "تم تعديل الطلب بنجاح" };
  },

  async update_order_status(args, refreshState) {
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [args.orderId]);
    if (!row) return { error: "الطلب غير موجود" };
    const order = JSON.parse(row.data);
    const oldStatus = order.status;
    if (isActiveStatus(oldStatus) && !isActiveStatus(args.status)) {
      await adjustStock(order.items || [], 'return');
    } else if (!isActiveStatus(oldStatus) && isActiveStatus(args.status)) {
      await adjustStock(order.items || [], 'deduct');
    }
    order.status = args.status;
    await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(order), args.orderId]);
    refreshState.current = true;
    await logActivity('update', 'order', args.orderId, `[AI] تم تغيير حالة الطلب إلى ${args.status}`);
    return { success: true, message: `تم تغيير حالة الطلب إلى ${args.status}` };
  },

  async delete_order(args, refreshState) {
    await runDb("DELETE FROM orders WHERE id = ?", [args.orderId]);
    refreshState.current = true;
    await logActivity('delete', 'order', args.orderId, '[AI] تم حذف الطلب');
    return { success: true };
  },

  // ====== Financial ======

  async get_financial_summary() {
    const rows = await allDb("SELECT data FROM orders");
    const orders = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    const activeOrders = orders.filter(o => o.status !== 'تم الغاء الطلب');
    const totalSales = activeOrders.reduce((sum, o) =>
      sum + ((o.totalAmount || 0) - (o.shippingCost || 0)), 0);
    const totalCOGS = activeOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const netProfit = totalSales - totalCOGS;

    const expRow = await getDb("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE category != 'مشتريات مخزون (Inventory)'");
    const totalOPEX = expRow?.total || 0;

    const finalProfit = netProfit - totalOPEX;

    const pendingOrders = orders.filter(o =>
      ['تحت المراجعة', 'تم التأكيد', 'قيد التجهيز للشحن', 'بانتظار الشحن', 'قيد التوصيل'].includes(o.status));

    return {
      total_sales: `${totalSales.toFixed(2)} ج.م`,
      total_cogs: `${totalCOGS.toFixed(2)} ج.م`,
      gross_profit: `${netProfit.toFixed(2)} ج.م`,
      total_opex: `${totalOPEX.toFixed(2)} ج.م`,
      net_profit: `${finalProfit.toFixed(2)} ج.م`,
      profit_margin: totalSales > 0 ? `${((finalProfit / totalSales) * 100).toFixed(2)}%` : '0%',
      total_orders: orders.length,
      active_orders: activeOrders.length,
      pending_orders: pendingOrders.length
    };
  },

  async get_low_stock_report() {
    const rows = await allDb("SELECT data FROM products");
    const products = rows.map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
    const lowStock = [];
    products.forEach(p => {
      (p.variants || []).forEach(v => {
        if (v.quantity <= (v.lowStockThreshold || 2)) {
          lowStock.push({
            productId: p.id, name: p.name, category: p.category || '',
            variant: `${v.size} - ${v.color}`,
            remaining: v.quantity, threshold: v.lowStockThreshold || 2
          });
        }
      });
    });
    return lowStock;
  },

  async get_expenses(args) {
    let query = "SELECT id, amount, category, description, created_at, beneficiary_id FROM expenses WHERE 1=1";
    const params = [];
    if (args?.startDate) { query += ' AND created_at >= ?'; params.push(args.startDate); }
    if (args?.endDate) { query += ' AND created_at <= ?'; params.push(args.endDate); }
    if (args?.category) { query += ' AND category = ?'; params.push(args.category); }
    query += ' ORDER BY created_at DESC LIMIT 100';
    const rows = await allDb(query, params);
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    return { expenses: rows, total_expenses: `${total.toFixed(2)} ج.م`, count: rows.length };
  },

  async add_expense(args, refreshState) {
    const createdAt = args.date || new Date().toISOString();
    await runDb(
      "INSERT INTO expenses (amount, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [args.amount, args.category, args.description || '', createdAt]);
    refreshState.current = true;
    const expenseId = (await allDb("SELECT last_insert_rowid() as id"))[0]?.id;
    await logActivity('create', 'expense', String(expenseId),
      `[AI] تم إضافة مصروف ${args.amount} - ${args.category}`);
    return { success: true, message: "تم إضافة المصروف بنجاح", id: expenseId };
  },

  async delete_expense(args, refreshState) {
    await runDb('DELETE FROM expenses WHERE id = ?', [args.expenseId]);
    refreshState.current = true;
    await logActivity('delete', 'expense', String(args.expenseId), '[AI] تم حذف المصروف');
    return { success: true };
  },

  async get_financial_targets() {
    const rows = await allDb(
      "SELECT id, title, amount, start_date as startDate, deadline, category, created_at as createdAt FROM financial_targets ORDER BY created_at DESC");
    return rows;
  },

  async add_financial_target(args, refreshState) {
    const id = `t-${Date.now()}`;
    await runDb(
      "INSERT INTO financial_targets (id, title, amount, start_date, deadline, category) VALUES (?, ?, ?, ?, ?, ?)",
      [id, args.title, args.amount, args.startDate || null, args.deadline, args.category]);
    refreshState.current = true;
    await logActivity('create', 'target', id, `[AI] تم إضافة هدف ${args.title}`);
    return { success: true, message: "تم إضافة الهدف المالي", targetId: id };
  },

  async delete_financial_target(args, refreshState) {
    await runDb("DELETE FROM financial_targets WHERE id = ?", [args.targetId]);
    refreshState.current = true;
    await logActivity('delete', 'target', args.targetId, '[AI] تم حذف الهدف المالي');
    return { success: true };
  },

  // ====== Suppliers ======

  async get_suppliers() {
    return await allDb("SELECT id, name, phone, phone2, created_at FROM suppliers ORDER BY name");
  },

  async add_supplier(args, refreshState) {
    const id = `s-${Date.now()}`;
    await runDb("INSERT INTO suppliers (id, name, phone, phone2) VALUES (?, ?, ?, ?)",
      [id, args.name, args.phone || '', args.phone2 || null]);
    refreshState.current = true;
    await logActivity('create', 'supplier', id, `[AI] تم إضافة المورد ${args.name}`);
    return { success: true, message: "تم إضافة المورد", supplierId: id };
  },

  async delete_supplier(args, refreshState) {
    await runDb("DELETE FROM suppliers WHERE id = ?", [args.supplierId]);
    refreshState.current = true;
    await logActivity('delete', 'supplier', args.supplierId, '[AI] تم حذف المورد');
    return { success: true };
  },

  // ====== Contacts ======

  async get_contacts(args) {
    const CONTACT_COLS = "id, company_name as companyName, phone, phone2, contact_person as contactPerson, email, address, specialization, entity_type as entityType, notes, status";
    let query = `SELECT ${CONTACT_COLS} FROM contacts WHERE 1=1`;
    const params = [];
    if (args?.entityType) { query += " AND entity_type = ?"; params.push(args.entityType); }
    if (args?.search) {
      query += " AND (company_name LIKE ? OR phone LIKE ?)";
      const s = `%${args.search}%`;
      params.push(s, s);
    }
    query += " ORDER BY company_name ASC LIMIT 100";
    return await allDb(query, params);
  },

  async add_contact(args, refreshState) {
    const id = `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await runDb(
      `INSERT INTO contacts (id, company_name, phone, entity_type, specialization, address, email, notes, contact_person, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'نشط')`,
      [id, args.companyName.trim(), args.phone || '', args.entityType || 'أخرى',
       args.specialization || '', args.address || '', args.email || '',
       args.notes || '', args.contactPerson || '']);
    refreshState.current = true;
    await logActivity('create', 'contact', id, `[AI] تم إضافة جهة اتصال: ${args.companyName}`);
    return { success: true, message: "تم إضافة جهة الاتصال", contactId: id };
  },

  async update_contact(args, refreshState) {
    const fields = [];
    const vals = [];
    if (args.companyName) { fields.push('company_name=?'); vals.push(args.companyName); }
    if (args.phone) { fields.push('phone=?'); vals.push(args.phone); }
    if (args.entityType) { fields.push('entity_type=?'); vals.push(args.entityType); }
    if (args.notes) { fields.push('notes=?'); vals.push(args.notes); }
    if (args.status) { fields.push('status=?'); vals.push(args.status); }
    if (fields.length === 0) return { error: "لا توجد بيانات للتعديل" };
    fields.push("updated_at=CURRENT_TIMESTAMP");
    vals.push(args.contactId);
    await runDb(`UPDATE contacts SET ${fields.join(',')} WHERE id=?`, vals);
    refreshState.current = true;
    await logActivity('update', 'contact', args.contactId, `[AI] تم تحديث جهة اتصال`);
    return { success: true, message: "تم تحديث جهة الاتصال" };
  },

  async delete_contact(args, refreshState) {
    await runDb("DELETE FROM contacts WHERE id = ?", [args.contactId]);
    refreshState.current = true;
    await logActivity('delete', 'contact', args.contactId, '[AI] تم حذف جهة اتصال');
    return { success: true };
  },

  // ====== Categories ======

  async get_categories() {
    return await allDb("SELECT * FROM categories ORDER BY parentId ASC, name ASC");
  },

  async add_category(args, refreshState) {
    const id = `cat-${Date.now()}`;
    await runDb("INSERT INTO categories (id, name, parentId) VALUES (?, ?, ?)",
      [id, args.name, args.parentId || null]);
    refreshState.current = true;
    await logActivity('create', 'category', id, `[AI] تم إضافة القسم ${args.name}`);
    return { success: true, message: "تم إضافة التصنيف", categoryId: id };
  },

  async delete_category(args, refreshState) {
    await runDb("DELETE FROM categories WHERE id = ? OR parentId = ?", [args.categoryId, args.categoryId]);
    refreshState.current = true;
    await logActivity('delete', 'category', args.categoryId, '[AI] تم حذف التصنيف');
    return { success: true };
  },

  // ====== Purchase Invoices ======

  async get_purchase_invoices() {
    const invoices = await allDb(`
      SELECT pi.*, COALESCE(s.name, c.company_name, '') as supplier_name
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON pi.supplier_id = s.id
      LEFT JOIN contacts c ON pi.supplier_id = c.id
      ORDER BY pi.date DESC LIMIT 50`);
    for (const inv of invoices) {
      inv.items = await allDb("SELECT * FROM purchase_invoice_items WHERE invoice_id = ?", [inv.id]);
    }
    return invoices;
  },

  async create_purchase_invoice(args, refreshState) {
    const id = `pi-${Date.now()}`;
    await runDb("BEGIN TRANSACTION");
    try {
      await runDb(
        "INSERT INTO purchase_invoices (id, supplier_id, invoice_number, total_amount, payment_method, date) VALUES (?, ?, ?, ?, ?, ?)",
        [id, args.supplierId, args.invoiceNumber, args.totalAmount, args.paymentMethod || 'نقد', args.date]);

      for (const item of (args.items || [])) {
        await runDb(
          "INSERT INTO purchase_invoice_items (id, invoice_id, product_id, variant_id, quantity, buy_price) VALUES (?, ?, ?, ?, ?, ?)",
          [`pii-${Date.now()}-${Math.random().toString(36).slice(2, 4)}`, id, item.productId, item.variantId, item.quantity, item.buyPrice]);

        const row = await getDb("SELECT data FROM products WHERE id = ?", [item.productId]);
        if (row) {
          const product = JSON.parse(row.data);
          product.supplierId = args.supplierId;
          product.wholesalePrice = item.buyPrice;
          product.costPrice = item.buyPrice + (product.packagingCost || 0);
          product.variants = product.variants.map(v => {
            if (v.id === item.variantId) v.quantity = (v.quantity || 0) + item.quantity;
            return v;
          });
          await runDb("UPDATE products SET data = ? WHERE id = ?", [JSON.stringify(product), item.productId]);
        }
      }

      await runDb(
        "INSERT INTO expenses (amount, category, description, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
        [args.totalAmount, 'مشتريات مخزون (Inventory)',
         `فاتورة مشتريات رقم ${args.invoiceNumber} من ${args.supplierName}`, args.date]);

      await runDb("COMMIT");
      refreshState.current = true;
      await logActivity('create', 'purchase_invoice', id,
        `[AI] فاتورة مشتريات رقم ${args.invoiceNumber} من ${args.supplierName} بقيمة ${args.totalAmount}`);
      return { success: true, message: "تم إضافة فاتورة المشتريات بنجاح", invoiceId: id };
    } catch (err) {
      await runDb("ROLLBACK");
      return { error: err.message };
    }
  },

  // ====== Coupons ======

  async get_coupons() {
    return await allDb("SELECT code, discount, is_percent FROM saved_coupons ORDER BY updated_at DESC");
  },

  async add_coupon(args, refreshState) {
    const isPct = args.is_percent ? 1 : 0;
    await runDb(
      "INSERT INTO saved_coupons (code, discount, is_percent, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(code) DO UPDATE SET discount = ?, is_percent = ?, updated_at = CURRENT_TIMESTAMP",
      [args.code.toUpperCase(), args.discount, isPct, args.discount, isPct]);
    refreshState.current = true;
    return { success: true, message: `تم إضافة/تحديث الكوبون ${args.code.toUpperCase()}` };
  },

  async delete_coupon(args, refreshState) {
    await runDb("DELETE FROM saved_coupons WHERE code = ?", [args.code.toUpperCase()]);
    refreshState.current = true;
    return { success: true };
  },

  // ====== Checkpoints ======

  async get_checkpoints() {
    const rows = await allDb("SELECT id, name, created_at FROM checkpoints ORDER BY created_at DESC");
    return rows;
  },

  async create_checkpoint(args, refreshState) {
    const productRows = await allDb("SELECT data FROM products");
    const products = productRows.map(r => r.data ? JSON.parse(r.data) : null).filter(Boolean);
    const orderRows = await allDb("SELECT data FROM orders");
    const orders = orderRows.map(r => r.data ? JSON.parse(r.data) : null).filter(Boolean);
    const snapshot = {
      products, orders,
      categories: await allDb("SELECT * FROM categories"),
      suppliers: await allDb("SELECT * FROM suppliers"),
      contacts: await allDb("SELECT * FROM contacts"),
      targets: await allDb("SELECT * FROM financial_targets"),
      settings: await allDb("SELECT * FROM settings"),
      coupons: await allDb("SELECT * FROM saved_coupons"),
      expenses: await allDb("SELECT * FROM expenses"),
      purchaseInvoices: await allDb("SELECT * FROM purchase_invoices"),
      purchaseInvoiceItems: await allDb("SELECT * FROM purchase_invoice_items")
    };
    const result = await runDb("INSERT INTO checkpoints (name, snapshot) VALUES (?, ?)",
      [args.name, JSON.stringify(snapshot)]);
    refreshState.current = true;
    await logActivity('create', 'settings', `checkpoint-${result.id}`,
      `[AI] تم إنشاء نقطة استعادة "${args.name}"`);
    return { success: true, message: `تم إنشاء نقطة استعادة "${args.name}"`, id: result.id };
  },

  // ====== Easy Orders ======

  async easy_orders_get_staging() {
    const rows = await allDb("SELECT id, easy_order_id, status, source_order_status, created_at FROM easyorders_staging ORDER BY created_at DESC");
    return rows;
  },

  async easy_orders_confirm_staging(args, refreshState) {
    try {
      const { confirmStagingOrder } = await import('../db.js');
      const orderData = await confirmStagingOrder(args.stagingId);
      refreshState.current = true;
      return { success: true, message: `تم تأكيد الطلب للعميل ${orderData.customerName}`, orderId: orderData.id };
    } catch (e) {
      return { error: e.message };
    }
  },

  async easy_orders_reject_staging(args, refreshState) {
    try {
      const { rejectStagingOrder } = await import('../db.js');
      await rejectStagingOrder(args.stagingId);
      refreshState.current = true;
      return { success: true, message: "تم رفض الطلب وإعادة المخزون" };
    } catch (e) {
      return { error: e.message };
    }
  },

  // ====== System ======

  async get_activity_logs(args) {
    const limit = args?.limit || 20;
    let query = "SELECT id, action, entity_type, entity_id, description, created_at FROM activity_logs WHERE 1=1";
    const params = [];
    if (args?.entity_type) { query += " AND entity_type = ?"; params.push(args.entity_type); }
    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(limit);
    return await allDb(query, params);
  },

  async get_settings() {
    const rows = await allDb("SELECT key, value FROM settings WHERE key NOT IN ('ai_api_keys', 'snapshot')");
    const settings = {};
    rows.forEach(r => {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    });
    return settings;
  },

  async get_branding_info() {
    const rows = await allDb("SELECT key, value FROM settings WHERE key IN ('brandName', 'brandLogo', 'brandSlogan', 'brandSloganDesign')");
    const info = {};
    rows.forEach(r => info[r.key] = r.value);
    return info;
  }
};

export async function callGemini(messages, refreshState = { current: false }) {
  const API_KEYS = await getApiKeys();
  if (API_KEYS.length === 0) {
    throw Object.assign(new Error("لا توجد مفاتيح API متاحة للذكاء الاصطناعي"), { statusCode: 503 });
  }

  const errors = [];

  for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
    const currentKey = API_KEYS[attempt]?.trim();
    if (!currentKey) continue;

    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: {
          parts: [{ text: buildSystemInstruction() }]
        }
      });

      let contents = messages.map(m => {
        const parts = [{ text: m.content || "" }];
        if (m.attachment && m.attachment.startsWith('data:')) {
          const [meta, data] = m.attachment.split(';base64,');
          const mimeType = meta.split(':')[1];
          parts.push({ inlineData: { mimeType, data } });
        }
        let role = 'user';
        if (m.role === 'model' || m.role === 'assistant') role = 'model';
        if (m.role === 'function' || m.role === 'tool') role = 'function';
        return { role, parts };
      });

      let cleanContents = [];
      let expectedRole = 'user';
      for (const msg of contents) {
        if (msg.role === 'function') { cleanContents.push(msg); continue; }
        if (msg.role === expectedRole) {
          cleanContents.push(msg);
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
      }

      if (cleanContents.length === 0) {
        throw Object.assign(new Error("لا توجد رسائل صالحة للمعالجة"), { statusCode: 400 });
      }

      const tools = buildTools();
      const history = cleanContents.slice(0, -1);
      const lastMessageParts = cleanContents[cleanContents.length - 1].parts;
      const chat = model.startChat({ history, tools });
      const result = await chat.sendMessage(lastMessageParts);
      const response = result.response;

      let finalContent = "";
      try { finalContent = response.text(); } catch (e) { finalContent = ""; }

      const calls = response.functionCalls();
      if (calls) {
        const toolResponses = [];
        for (const call of calls) {
          let toolResult;
          console.log(`AI invoking tool: ${call.name}`, call.args);

          const handler = toolHandlers[call.name];
          if (handler) {
            try {
              toolResult = await handler(call.args || {}, refreshState);
            } catch (err) {
              toolResult = { error: err.message };
            }
          } else {
            toolResult = { error: `الأداة ${call.name} غير معروفة` };
          }

          toolResponses.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
        }

        try {
          const secondResult = await chat.sendMessage(toolResponses);
          finalContent = secondResult.response.text();
        } catch (e) {
          finalContent = "تم تحديث البيانات بنجاح، هل هناك شيء آخر؟";
        }
      }

      return { content: finalContent, refreshRequired: refreshState.current };

    } catch (error) {
      const errMsg = error.message || "";
      console.error(`Error with Key #${attempt + 1}:`, errMsg);
      errors.push(errMsg);
      const isLastKey = attempt === API_KEYS.length - 1;

      if (errMsg.includes("SAFETY") || errMsg.includes("safety")) {
        throw Object.assign(new Error("عذراً، لا يمكنني الإجابة على هذا السؤال لأسباب تتعلق بالأمان."), { statusCode: 400 });
      }

      if (isLastKey) {
        const allQuota = errors.every(e =>
          e.includes("429") || e.includes("quota") || e.includes("RESOURCE_EXHAUSTED") || e.includes("rate"));
        if (allQuota) {
          throw Object.assign(new Error("يا باشا، للاسف كل المفاتيح المتاحة خلصت حصتها النهاردة. جرب كمان شوية أو ضيف مفتاح جديد."), { statusCode: 429 });
        }
        throw Object.assign(new Error(`خطأ في الذكاء الاصطناعي: ${errMsg}`), { statusCode: 500 });
      }

      console.log(`Rotating to Key #${attempt + 2}...`);
    }
  }

  throw Object.assign(new Error("لا توجد مفاتيح API صالحة"), { statusCode: 503 });
}