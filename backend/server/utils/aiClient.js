import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDb, allDb, runDb, logActivity, generateOrderId, getAllProducts, adjustStock, isActiveStatus, findStockShortages, buildShortageMessage } from '../db.js';
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

function parseGoogleMapsCoords(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const atM = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atM) return { lat: parseFloat(atM[1]), lng: parseFloat(atM[2]) };
    const qM = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qM) return { lat: parseFloat(qM[1]), lng: parseFloat(qM[2]) };
    const bangM = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bangM) return { lat: parseFloat(bangM[1]), lng: parseFloat(bangM[2]) };
  } catch {}
  return null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
- الحقول: id, companyName, phone, phone2, contactPerson, extraPhones (JSON), email, address, specialization, entityType, taxId, commercialRegistry, notes, status (نشط/غير نشط), latitude, longitude, mapUrl, ratingsEnabled, ratingsData, links
- قيم entityType الحقيقية: مصنع، تاجر جملة، مقدم خدمة، مستورد، شركة شحن، شركة تسويق، شركات الطباعه و التغليف، أخرى
- الجهات قد تحتوي إحداثيات GPS (latitude/longitude) تُستخرج من رابط الخريطة — استخدم find_nearby_contacts لأسئلة القرب الجغرافي

**6. العملاء (Customers) — جدول customers**
- الحقول: id, name, phone, alt_phone, email, address, city, source, tags (JSON), notes, admin_notes, map_url, latitude, longitude, rating, classification (جديد/عادي/مميز...), total_orders, total_spent, last_order_date

**7. المصروفات (Expenses) — جدول expenses**
- الحقول: id, amount, category, description, beneficiary_id, created_at
- فيه بند خاص: 'مشتريات مخزون (Inventory)' يأتي من فواتير المشتريات

**8. الأهداف المالية (Financial Targets) — جدول financial_targets**
- الحقول: id, title, amount, startDate, deadline, category (net_profit/total_sales)

**9. الكوبونات (Coupons) — جدول saved_coupons**
- الحقول: code (PK), discount, is_percent, updated_at

**10. نقاط الاستعادة (Checkpoints) — جدول checkpoints**
- الحقول: id, name, snapshot (JSON كامل), created_at

**11. سجل النشاطات (Activity Logs) — جدول activity_logs**
- الحقول: id, action, entity_type, entity_id, description, metadata JSON, created_at

**12. الإعدادات (Settings) — جدول settings key-value**
- ai_api_keys, brandLogo, brandName, brandSlogan, categories, isManualMode, taxEnabled, taxRate, invoiceSettings, warehouseLocation وغيرها
- warehouseLocation = موقع التخزين {address, latitude, longitude} — نقطة الانطلاق الافتراضية لأسئلة "الأقرب لي"

### بروتوكول القوة المطلقة (run_sql):
عندما يطلب المستخدم أمراً لا توجد له أداة جاهزة، أو أمراً معقداً على مستوى قاعدة البيانات:
1. ابحث أولاً عن أداة جاهزة تنجز المهمة — الأدوات الجاهزة أسرع وأكثر أماناً.
2. إن لم توجد أداة مناسبة، استخدم run_sql.
3. **إلزامي**: قبل أي استعلام كتابة (INSERT/UPDATE/DELETE)، اعرض على المستخدم ما ستفعله بالضبط واطلب تأكيده الصريح. لا تمرر confirm=true إلا بعد موافقته.
4. كل عملية كتابة تُسجل تلقائياً مع نسخة احتياطية من البيانات المتأثرة — يمكن التراجع عبر undo_sql فوراً.
5. اجعل WHERE ضيقاً ودقيقاً دائماً، ولا تنفذ DELETE بدون WHERE أبداً.
6. عمليات DROP/ALTER لا يمكن التراجع عنها آلياً — أكد مع المستخدم مرتين.

### استراتيجية التسعير الذكي (X2 Smart Pricing):
- تقريب الأسعار لتنتهي بـ 9 أو 49 (مثلاً 149 بدلاً من 150)
- 3 مستويات هامش ربح: سريع 20-25% | متوازن 40-50% | مميز 60%+

### تعليمات الصور:
لما تستلم صورة منتج: حللها ← ابحث في المخزون (search_products) ← لو مش موجود اقترح إضافته (add_product)

### المبدأ الأساسي:
أنت الـ Admin المطلق. تقدر تعمل أي حاجة في النظام: تقارير، تعديلات، إضافة، حذف، استعلامات، وحتى أوامر معقدة على مستوى قاعدة البيانات عبر run_sql. تعامل مع النظام على إنه بتاعك وانت عارف كل حاجة فيه.
- **الأوامر المعقدة**: يمكنك ربط عدة أدوات متتالية في خطوات (مثلاً: ابحث ← قارن ← عدّل ← أكّد) — النظام يدعم تنفيذ سلسلة خطوات حتى 6 جولات.
- **الاقتصاد**: لا تجلب بيانات أكثر من حاجتك، واعرض نتائج مركزة.`;
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
      // ========== العملاء (Customers) ==========
      {
        name: "get_customers",
        description: "عرض العملاء مع بحث ذكي في الاسم/الهاتف/العنوان/المدينة (اختياري: بحث أو حد أقصى)",
        parameters: {
          type: "object",
          properties: {
            search: { type: "string", description: "كلمة بحث في الاسم/الهاتف/البريد/المدينة/العنوان (اختياري)" },
            limit: { type: "number", description: "أقصى عدد نتائج (افتراضي 50، أقصى 200)" }
          }
        }
      },
      {
        name: "get_customer_by_id",
        description: "عرض عميل محدد بكل تفاصيله وإحصائياته",
        parameters: {
          type: "object",
          properties: { customerId: { type: "string" } },
          required: ["customerId"]
        }
      },
      {
        name: "add_customer",
        description: "إضافة عميل جديد",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "اسم العميل" },
            phone: { type: "string", description: "الهاتف (اختياري)" },
            altPhone: { type: "string", description: "هاتف بديل (اختياري)" },
            email: { type: "string", description: "البريد الإلكتروني (اختياري)" },
            address: { type: "string", description: "العنوان (اختياري)" },
            city: { type: "string", description: "المدينة (اختياري)" },
            source: { type: "string", description: "مصدر العميل (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" }
          },
          required: ["name"]
        }
      },
      {
        name: "update_customer",
        description: "تعديل بيانات عميل موجود",
        parameters: {
          type: "object",
          properties: {
            customerId: { type: "string" },
            name: { type: "string", description: "الاسم (اختياري)" },
            phone: { type: "string", description: "الهاتف (اختياري)" },
            altPhone: { type: "string", description: "هاتف بديل (اختياري)" },
            email: { type: "string", description: "البريد (اختياري)" },
            address: { type: "string", description: "العنوان (اختياري)" },
            city: { type: "string", description: "المدينة (اختياري)" },
            classification: { type: "string", description: "تصنيف العميل (اختياري)" },
            adminNotes: { type: "string", description: "ملاحظات إدارية (اختياري)" },
            notes: { type: "string", description: "ملاحظات (اختياري)" }
          },
          required: ["customerId"]
        }
      },
      {
        name: "delete_customer",
        description: "حذف عميل نهائياً (اسأل المستخدم للتأكيد أولاً)",
        parameters: {
          type: "object",
          properties: { customerId: { type: "string" } },
          required: ["customerId"]
        }
      },
      // ========== جهات الاتصال (Contacts) ==========
      {
        name: "get_contacts",
        description: "عرض جهات الاتصال مع بحث ذكي في الاسم/الهاتف/العنوان/التخصص/الملاحظات",
        parameters: {
          type: "object",
          properties: {
            entityType: { type: "string", description: "فلترة بالنوع: مصنع/تاجر جملة/مقدم خدمة/مستورد/شركة شحن/شركة تسويق/شركات الطباعه و التغليف/أخرى (اختياري)" },
            search: { type: "string", description: "بحث في الاسم/الهاتف/العنوان/التخصص (اختياري)" },
            status: { type: "string", description: "نشط/غير نشط (اختياري)" },
            limit: { type: "number", description: "أقصى عدد نتائج (افتراضي 50، أقصى 200)" }
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
            address: { type: "string", description: "العنوان النصي (اختياري)" },
            specialization: { type: "string", description: "التخصص (اختياري)" },
            email: { type: "string", description: "البريد الإلكتروني (اختياري)" },
            mapUrl: { type: "string", description: "رابط خرائط جوجل للموقع (اختياري — يستخرج الإحداثيات تلقائياً)" },
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
      // ========== الموقع الجغرافي ==========
      {
        name: "find_nearby_contacts",
        description: "ترتيب جهات الاتصال حسب القرب الجغرافي من موقع معين (يحسب المسافة بالكيلومترات للجهات ذات الإحداثيات، ويبحث نصياً في العناوين للباقي). مثال: أقرب شركة شحن لموقع التخزين",
        parameters: {
          type: "object",
          properties: {
            locationName: { type: "string", description: "اسم الموقع الهدف نصياً مثل 'مدينة نصر' أو 'القطامية، القاهرة الجديدة' (اختياري إذا مررت الإحداثيات)" },
            latitude: { type: "number", description: "خط عرض الموقع الهدف (اختياري — لو مش موجود هيستخدم موقع التخزين)" },
            longitude: { type: "number", description: "خط طول الموقع الهدف (اختياري — لو مش موجود هيستخدم موقع التخزين)" },
            entityType: { type: "string", description: "فلترة بالنوع مثل شركة شحن (اختياري)" },
            keyword: { type: "string", description: "كلمة إضافية للبحث النصي في العنوان/التخصص/الاسم (اختياري)" },
            radiusKm: { type: "number", description: "نطاق بالكيلومترات (اختياري — بدون حد افتراضياً)" }
          }
        }
      },
      {
        name: "set_warehouse_location",
        description: "حفظ موقع التخزين (المستودع) لاستخدامه كنقطة انطلاق في حسابات القرب الجغرافي",
        parameters: {
          type: "object",
          properties: {
            address: { type: "string", description: "وصف العنوان نصياً" },
            latitude: { type: "number", description: "خط العرض (اختياري)" },
            longitude: { type: "number", description: "خط الطول (اختياري)" }
          },
          required: ["address"]
        }
      },
      // ========== القوة المطلقة (SQL) ==========
      {
        name: "run_sql",
        description: "تنفيذ أي استعلام SQL مباشرة على قاعدة البيانات للأوامر التي لا توجد لها أداة جاهزة. عمليات الكتابة تحتاج تأكيد المستخدم أولاً (confirm=true)، وتُسجل نسخة احتياطية تلقائية قابلة للتراجع عبر undo_sql",
        parameters: {
          type: "object",
          properties: {
            sql: { type: "string", description: "استعلام SQL واحد فقط" },
            confirm: { type: "boolean", description: "true فقط بعد تأكيد المستخدم الصريح لعمليات الكتابة (اختياري للقراءة SELECT)" }
          },
          required: ["sql"]
        }
      },
      {
        name: "undo_sql",
        description: "التراجع عن عملية كتابة سابقة نفذتها عبر run_sql — يستعيد البيانات من النسخة الاحتياطية التلقائية",
        parameters: {
          type: "object",
          properties: { historyId: { type: "number", description: "معرف العملية من نتيجة run_sql" } },
          required: ["historyId"]
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
      const shortages = await findStockShortages(order.items || []);
      if (shortages.length > 0) {
        return {
          error: 'الكمية المطلوبة غير متوفرة في المخزون: ' +
            shortages.map(s => `${s.productName}${s.variantLabel ? ` (${s.variantLabel})` : ''} — المطلوب ${s.requested} والمتاح ${s.available}`).join('، ')
        };
      }
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
      const shortages = await findStockShortages(order.items || []);
      if (shortages.length > 0) return { error: buildShortageMessage(shortages), shortages };
      await adjustStock(order.items || [], 'deduct');
    }
    order.status = args.status;
    await runDb("UPDATE orders SET data = ? WHERE id = ?", [JSON.stringify(order), args.orderId]);
    refreshState.current = true;
    await logActivity('update', 'order', args.orderId, `[AI] تم تغيير حالة الطلب إلى ${args.status}`);
    return { success: true, message: `تم تغيير حالة الطلب إلى ${args.status}` };
  },

  async delete_order(args, refreshState) {
    const row = await getDb("SELECT data FROM orders WHERE id = ?", [args.orderId]);
    if (!row) return { error: "الطلب غير موجود" };
    const order = JSON.parse(row.data);
    // إرجاع مخزون الطلب المحتجز قبل حذفه (إن كان نشطاً)
    if (isActiveStatus(order.status)) {
      await adjustStock(order.items || [], 'return');
    }
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

  // ====== Customers ======

  async get_customers(args) {
    let query = "SELECT id, name, phone, alt_phone as altPhone, email, address, city, source, tags, notes, classification, rating, total_orders as totalOrders, total_spent as totalSpent, last_order_date as lastOrderDate FROM customers WHERE 1=1";
    const params = [];
    if (args?.search) {
      query += " AND (name LIKE ? OR phone LIKE ? OR alt_phone LIKE ? OR email LIKE ? OR city LIKE ? OR address LIKE ?)";
      const s = `%${args.search}%`;
      params.push(s, s, s, s, s, s);
    }
    const limit = Math.min(Math.max(args?.limit || 50, 1), 200);
    query += " ORDER BY name ASC LIMIT ?";
    params.push(limit);
    return await allDb(query, params);
  },

  async get_customer_by_id(args) {
    const row = await getDb("SELECT * FROM customers WHERE id = ?", [args.customerId]);
    if (!row) return { error: "العميل غير موجود" };
    return row;
  },

  async add_customer(args, refreshState) {
    const id = `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await runDb(
      "INSERT INTO customers (id, name, phone, alt_phone, email, address, city, source, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))",
      [id, args.name.trim(), args.phone || '', args.altPhone || null, args.email || null,
       args.address || null, args.city || null, args.source || null, args.notes || null]);
    refreshState.current = true;
    await logActivity('create', 'customer', id, `[AI] تم إضافة العميل ${args.name}`);
    return { success: true, message: "تم إضافة العميل بنجاح", customerId: id };
  },

  async update_customer(args, refreshState) {
    const existing = await getDb("SELECT * FROM customers WHERE id = ?", [args.customerId]);
    if (!existing) return { error: "العميل غير موجود" };
    const fields = [];
    const vals = [];
    if (args.name !== undefined) { fields.push('name=?'); vals.push(args.name); }
    if (args.phone !== undefined) { fields.push('phone=?'); vals.push(args.phone); }
    if (args.altPhone !== undefined) { fields.push('alt_phone=?'); vals.push(args.altPhone); }
    if (args.email !== undefined) { fields.push('email=?'); vals.push(args.email); }
    if (args.address !== undefined) { fields.push('address=?'); vals.push(args.address); }
    if (args.city !== undefined) { fields.push('city=?'); vals.push(args.city); }
    if (args.classification !== undefined) { fields.push('classification=?'); vals.push(args.classification); }
    if (args.adminNotes !== undefined) { fields.push('admin_notes=?'); vals.push(args.adminNotes); }
    if (args.notes !== undefined) { fields.push('notes=?'); vals.push(args.notes); }
    if (fields.length === 0) return { error: "لا توجد بيانات للتعديل" };
    fields.push("updated_at=datetime('now')");
    vals.push(args.customerId);
    await runDb(`UPDATE customers SET ${fields.join(',')} WHERE id=?`, vals);
    refreshState.current = true;
    await logActivity('update', 'customer', args.customerId, `[AI] تم تحديث بيانات العميل ${existing.name}`);
    return { success: true, message: "تم تعديل بيانات العميل" };
  },

  async delete_customer(args, refreshState) {
    const existing = await getDb("SELECT * FROM customers WHERE id = ?", [args.customerId]);
    if (!existing) return { error: "العميل غير موجود" };
    await runDb("DELETE FROM customers WHERE id = ?", [args.customerId]);
    refreshState.current = true;
    await logActivity('delete', 'customer', args.customerId, `[AI] تم حذف العميل ${existing.name}`);
    return { success: true, message: "تم حذف العميل" };
  },

  // ====== Contacts ======

  async get_contacts(args) {
    const CONTACT_COLS = "id, company_name as companyName, phone, phone2, contact_person as contactPerson, email, address, specialization, entity_type as entityType, notes, status, latitude, longitude, map_url as mapUrl";
    let query = `SELECT ${CONTACT_COLS} FROM contacts WHERE 1=1`;
    const params = [];
    if (args?.entityType) { query += " AND entity_type = ?"; params.push(args.entityType); }
    if (args?.status) { query += " AND status = ?"; params.push(args.status); }
    if (args?.search) {
      query += " AND (company_name LIKE ? OR phone LIKE ? OR phone2 LIKE ? OR address LIKE ? OR specialization LIKE ? OR notes LIKE ? OR contact_person LIKE ?)";
      const s = `%${args.search}%`;
      params.push(s, s, s, s, s, s, s);
    }
    const limit = Math.min(Math.max(args?.limit || 50, 1), 200);
    query += " ORDER BY company_name ASC LIMIT ?";
    params.push(limit);
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
    if (args.address !== undefined) { fields.push('address=?'); vals.push(args.address); }
    if (args.specialization !== undefined) { fields.push('specialization=?'); vals.push(args.specialization); }
    if (args.email !== undefined) { fields.push('email=?'); vals.push(args.email); }
    if (args.notes) { fields.push('notes=?'); vals.push(args.notes); }
    if (args.status) { fields.push('status=?'); vals.push(args.status); }
    if (args.mapUrl) {
      fields.push('map_url=?');
      vals.push(args.mapUrl);
      const coords = parseGoogleMapsCoords(args.mapUrl);
      if (coords) {
        fields.push('latitude=?', 'longitude=?');
        vals.push(String(coords.lat), String(coords.lng));
      }
    }
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

  // ====== الموقع الجغرافي ======

  async find_nearby_contacts(args) {
    let origin = null;
    let originLabel = args?.locationName || '';
    if (args?.latitude != null && args?.longitude != null) {
      origin = { lat: Number(args.latitude), lng: Number(args.longitude) };
    } else {
      const sRow = await getDb("SELECT value FROM settings WHERE key = 'warehouseLocation'");
      if (sRow) {
        try {
          const wh = JSON.parse(sRow.value);
          if (wh?.latitude != null && wh?.longitude != null) {
            origin = { lat: Number(wh.latitude), lng: Number(wh.longitude) };
            originLabel = originLabel || wh.address || 'موقع التخزين';
          } else if (!originLabel && wh?.address) {
            originLabel = wh.address;
          }
        } catch {}
      }
    }

    if (!origin && !originLabel) {
      return { error: "لا يوجد موقع هدف. مرر latitude/longitude أو locationName، أو احفظ موقع التخزين أولاً عبر set_warehouse_location" };
    }

    let query = "SELECT id, company_name as companyName, phone, phone2, address, specialization, entity_type as entityType, status, latitude, longitude FROM contacts";
    const params = [];
    const conds = [];
    if (args?.entityType) { conds.push("entity_type = ?"); params.push(args.entityType); }
    if (conds.length) query += " WHERE " + conds.join(' AND ');
    query += " ORDER BY company_name ASC";

    const rows = await allDb(query, params);

    const geoMatches = [];
    const textMatches = [];
    const radiusKm = args?.radiusKm ? Number(args.radiusKm) : null;

    for (const c of rows) {
      const lat = c.latitude != null ? parseFloat(c.latitude) : NaN;
      const lng = c.longitude != null ? parseFloat(c.longitude) : NaN;
      if (origin && !isNaN(lat) && !isNaN(lng)) {
        const distKm = haversineKm(origin.lat, origin.lng, lat, lng);
        if (radiusKm == null || distKm <= radiusKm) {
          geoMatches.push({
            id: c.id, companyName: c.companyName, entityType: c.entityType,
            phone: c.phone, address: c.address || '', specialization: c.specialization || '',
            distance_km: Math.round(distKm * 10) / 10,
            location_source: 'GPS'
          });
        }
        continue;
      }
      if (originLabel) {
        const hay = `${c.companyName} ${c.address || ''} ${c.specialization || ''} ${c.notes || ''}`;
        const words = originLabel.split(/[\s،,]+/).filter(w => w.length >= 3);
        if (words.some(w => hay.includes(w))) {
          textMatches.push({
            id: c.id, companyName: c.companyName, entityType: c.entityType,
            phone: c.phone, address: c.address || '', specialization: c.specialization || '',
            location_source: 'نص العنوان (بدون GPS)'
          });
        }
      }
    }

    geoMatches.sort((a, b) => a.distance_km - b.distance_km);

    return {
      origin: { name: originLabel || `${origin.lat}, ${origin.lng}`, has_coordinates: !!origin },
      note: !origin
        ? "موقع التخزين غير محفوظ بإحداثيات — النتائج أدناه مطابقة نصية فقط. للحصول على مسافات دقيقة احفظ الموقع بالإحداثيات."
        : "مرتبة من الأقرب للأبعد بمسافة كيلومترات تقريبية (خط مستقيم).",
      by_distance: geoMatches.slice(0, 50),
      text_matches: textMatches.slice(0, 30),
      total_geo_matches: geoMatches.length,
      total_text_matches: textMatches.length
    };
  },

  async set_warehouse_location(args, refreshState) {
    const loc = { address: String(args.address), latitude: args.latitude ?? null, longitude: args.longitude ?? null };
    await runDb(
      "INSERT INTO settings (key, value) VALUES ('warehouseLocation', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [JSON.stringify(loc)]
    );
    refreshState.current = true;
    await logActivity('update', 'settings', 'warehouseLocation', `[AI] تم حفظ موقع التخزين: ${loc.address}`);
    return { success: true, message: "تم حفظ موقع التخزين", warehouseLocation: loc };
  },

  // ====== القوة المطلقة (SQL) ======

  async run_sql(args, refreshState) {
    const raw = String(args?.sql || '').trim();
    if (!raw) return { error: "لا يوجد استعلام" };
    const sql = raw.replace(/;\s*$/, '');
    if (/;/.test(sql.replace(/'[^']*'/g, "''"))) return { error: "استعلام واحد فقط في كل مرة (بدون فاصلة منقوطة داخلية)" };

    const forbidden = /^\s*(PRAGMA|ATTACH|DETACH|VACUUM|REINDEX|BEGIN|COMMIT|ROLLBACK)\b/i;
    if (forbidden.test(sql)) return { error: "هذا النوع من الأوامر محظور لأسباب أمنية" };

    const kindM = sql.match(/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i);
    if (!kindM) return { error: "نوع استعلام غير مدعوم" };
    const kind = kindM[1].toUpperCase();

    if (kind === 'SELECT') {
      const limited = /\bLIMIT\s+\d+/i.test(sql) ? sql : `${sql} LIMIT 100`;
      try {
        const res = await allDb(limited);
        const slim = res.map(r => {
          const o = {};
          for (const [k, v] of Object.entries(r)) {
            o[k] = typeof v === 'string' && v.length > 300 ? v.slice(0, 300) + '…' : v;
          }
          return o;
        });
        return { executed: true, kind, rows: slim, count: slim.length, truncated_note: res.length >= 100 ? "النتائج محدودة بـ 100 صف لتوفير التوكن — ضع شروطاً أدق لاستعلامات أوسع" : undefined };
      } catch (e) {
        return { error: e.message };
      }
    }

    if (kind === 'CREATE' || kind === 'ALTER' || kind === 'DROP') {
      if (args?.confirm !== true) {
        return { needsConfirmation: true, warning: "عملية على هيكل قاعدة البيانات ولا يمكن التراجع عنها آلياً. اشرح للمستخدم ما ستفعله واطلب تأكيده الصريح ثم أعد التنفيذ بـ confirm=true", kind };
      }
      try {
        await runDb(sql);
        refreshState.current = true;
        await logActivity('update', 'settings', 'run_sql', `[AI-SQL] ${sql.slice(0, 150)}`);
        return { executed: true, kind, irreversible: true, message: "تم التنفيذ. لا يمكن التراجع عن عمليات الهياكل آلياً." };
      } catch (e) {
        return { error: e.message };
      }
    }

    // INSERT / UPDATE / DELETE — نسخ احتياطي قابل للتراجع
    if (args?.confirm !== true) {
      return {
        needsConfirmation: true,
        kind,
        protocol: "اعرض على المستخدم ملخص ما سيحدث بالضبط (الجدول، الشروط، عدد الصفوف المتوقع إن أمكن) واحصل على موافقته الصريحة، ثم أعد نفس الاستعلام مع confirm=true"
      };
    }

    const tableM = sql.match(/^\s*(?:INSERT\s+(?:OR\s+\w+\s+)?INTO|UPDATE|DELETE\s+FROM)\s+["'`\[]?([\w]+)/i);
    const table = tableM ? tableM[1] : null;

    try {
      let historyId = null;

      if (kind === 'INSERT') {
        let maxBefore = 0;
        if (table) {
          const r = await getDb(`SELECT COALESCE(MAX(rowid), 0) as m FROM "${table}"`);
          maxBefore = r?.m || 0;
        }
        await runDb(sql);
        let newIds = [];
        if (table) {
          const rowsAfter = await allDb(`SELECT rowid as rid FROM "${table}" WHERE rowid > ?`, [maxBefore]);
          newIds = rowsAfter.map(r => r.rid);
        }
        const hres = await runDb(
          "INSERT INTO ai_sql_history (sql_text, kind, target_table, new_rowids) VALUES (?, 'insert', ?, ?)",
          [sql, table, JSON.stringify(newIds)]
        );
        historyId = hres?.lastInsertRowid ?? hres?.id ?? null;
        refreshState.current = true;
        await logActivity('create', 'settings', 'run_sql', `[AI-SQL] ${sql.slice(0, 150)}`);
        return {
          executed: true, kind, affected_rows: newIds.length || 'غير معروف',
          historyId, reversible: newIds.length > 0,
          message: `تم التنفيذ${newIds.length ? ` وأُدرج ${newIds.length} صف — يمكن التراجع عبر undo_sql` : ''}`
        };
      }

      // UPDATE / DELETE — نسخ الصفوف المتأثرة قبل التنفيذ
      if (!table) return { error: "لم أتعرف على اسم الجدول — استخدم صيغة SQL قياسية" };
      const whereM = sql.match(/\bWHERE\b([\s\S]*)$/i);
      const whereClause = whereM ? whereM[1].trim() : null;
      if (kind === 'DELETE' && !whereClause) {
        return { error: "DELETE بدون WHERE محظور تماماً. إذا كنت تريد إفراغ جدول كامل اطلب من المستخدم استخدام نقاط الاستعادة بدلاً منه." };
      }

      const backupSql = `SELECT rowid as __rid, * FROM "${table}"${whereClause ? ` WHERE ${whereClause}` : ''}`;
      const backupRows = await allDb(backupSql);
      if (backupRows.length > 5000) {
        return { error: `الشروط ستؤثر على ${backupRows.length} صف — هذا كثير جداً. ضيّق الشروط أو استخدم نقطة استعادة.` };
      }
      const backup = backupRows.map(r => ({ rid: r.__rid, data: Object.fromEntries(Object.entries(r).filter(([k]) => k !== '__rid')) }));

      await runDb(sql);

      const hres = await runDb(
        "INSERT INTO ai_sql_history (sql_text, kind, target_table, backup_data) VALUES (?, ?, ?, ?)",
        [sql, kind.toLowerCase(), table, JSON.stringify(backup)]
      );
      historyId = hres?.lastInsertRowid ?? hres?.id ?? null;
      refreshState.current = true;
      await logActivity(kind === 'UPDATE' ? 'update' : 'delete', 'settings', 'run_sql', `[AI-SQL] ${sql.slice(0, 150)} (${backup.length} صف بنسخة احتياطية)`);

      return {
        executed: true, kind, affected_rows: backup.length,
        historyId, reversible: true,
        message: `تم التنفيذ على ${backup.length} صف — النسخة الاحتياطية محفوظة ويمكن التراجع فوراً عبر undo_sql (historyId: ${historyId})`
      };
    } catch (e) {
      return { error: e.message };
    }
  },

  async undo_sql(args) {
    const id = Number(args?.historyId);
    if (!id) return { error: "historyId مطلوب" };
    const row = await getDb("SELECT * FROM ai_sql_history WHERE id = ?", [id]);
    if (!row) return { error: "لا توجد عملية بهذا المعرف" };
    if (row.undone) return { error: "هذه العملية تم التراجع عنها بالفعل" };
    if (row.kind === 'insert') {
      const ids = JSON.parse(row.new_rowids || '[]');
      if (!ids.length) return { error: "لا توجد نسخة احتياطية لهذه العملية" };
      await runDb(`DELETE FROM "${row.target_table}" WHERE rowid IN (${ids.map(() => '?').join(',')})`, ids);
    } else if (row.kind === 'update' || row.kind === 'delete') {
      const backup = JSON.parse(row.backup_data || '[]');
      if (!backup.length) return { error: "لا توجد نسخة احتياطية لهذه العملية" };
      const cols = Object.keys(backup[0].data);
      for (const item of backup) {
        if (row.kind === 'delete') {
          await runDb(
            `INSERT INTO "${row.target_table}" (${cols.map(c => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`,
            cols.map(c => item.data[c])
          );
        } else {
          await runDb(
            `UPDATE "${row.target_table}" SET ${cols.map(c => `"${c}" = ?`).join(',')} WHERE rowid = ?`,
            [...cols.map(c => item.data[c]), item.rid]
          );
        }
      }
    } else {
      return { error: "نوع عملية غير قابل للتراجع" };
    }
    await runDb("UPDATE ai_sql_history SET undone = 1 WHERE id = ?", [id]);
    await logActivity('update', 'settings', 'undo_sql', `[AI-SQL] تراجع عن العملية #${id} (${row.kind} على ${row.target_table})`);
    return { success: true, message: `تم التراجع عن العملية #${id} واستعادة البيانات بنجاح` };
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

export { toolHandlers };

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

      let calls = response.functionCalls();
      const MAX_TOOL_ROUNDS = 6;
      let round = 0;

      while (calls && calls.length > 0 && round < MAX_TOOL_ROUNDS) {
        round++;
        const toolResponses = [];
        for (const call of calls) {
          let toolResult;
          console.log(`AI invoking tool (round ${round}): ${call.name}`, call.args);

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
          const stepResult = await chat.sendMessage(toolResponses);
          try { finalContent = stepResult.response.text(); } catch { finalContent = ""; }
          calls = stepResult.response.functionCalls();
        } catch (e) {
          finalContent = finalContent || "تم تحديث البيانات بنجاح، هل هناك شيء آخر؟";
          calls = null;
        }
      }

      if (!finalContent) {
        finalContent = refreshState.current ? "تم تنفيذ المطلوب بنجاح ✅" : "تم بحمد الله، هل هناك شيء آخر؟";
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