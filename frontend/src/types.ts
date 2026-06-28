
export interface Product {
  id: string;
  sku: string;
  name: string;
  image: string;
  images?: string[];
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  packagingCost?: number;
  category: string;
  tags?: string[];
  variants: Variant[];
  url?: string;
  supplierId?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  brand?: string;
}

export interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price?: number; // Optional override
  lowStockThreshold?: number; // حد التنبيه لنقص المخزون
}

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

export enum ShippingMethod {
  EXTERNAL = 'شحن خارجي',
  LOCAL = 'توصيل محلي'
}

export enum OrderStatus {
  UNDER_REVIEW = 'تحت المراجعة',
  CONFIRMED = 'تم التأكيد',
  WAITING_PAYMENT = 'في انتظار الدفع',
  PAID = 'تم الدفع',
  PAYMENT_FAILED = 'فشل الدفع',
  PROCESSING_SHIPPING = 'قيد التجهيز للشحن',
  WAITING_SHIPPING = 'بانتظار الشحن',
  ON_DELIVERY = 'قيد التوصيل',
  DELIVERED = 'تم التوصيل', // Changed from تم التسليم to match image
  CANCELED = 'تم الغاء الطلب',
  RETURNED_FROM_SHIPPING = 'مرتجع من الشحن',
  CLIENT_RETURN_REQUEST = 'العميل طلب الارجاع',
  RETURN_IN_PROGRESS = 'جاري الارجاع',
  RETURNED = 'تم الارجاع',
  INCOMPLETE = 'طلب غير مكتمل',
  HIGH_RISK = 'مخاطر عالية',
  MODERATE_RISK = 'مخاطر متوسطة'
}

export interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  price: number;
  costPrice: number;
  sku?: string;
  image?: string;
  isProductDeleted?: boolean;
  skuStatus?: 'matched' | 'unmatched' | 'missing';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  address?: string;
  city?: string;
  source?: string;
  tags?: string;
  notes?: string;
  adminNotes?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  mapUrl?: string;
  latitude?: string;
  longitude?: string;
  rating?: number;
  classification?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  address: string;
  notes: string;
  items: OrderItem[];
  totalAmount: number;
  totalCost: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  
  // New Fields based on User Request
  city?: string;
  shippingCost?: number;
  coupon?: string;
  couponDiscount?: number;
  couponDiscountRaw?: number;
  couponDiscountIsPercent?: boolean;
  altPhone?: string;
  extraData?: string;
  extraData2?: string;
  ref?: string;
  utmSource?: string;
  utmCampaign?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  funnelId?: string;
  referralCode?: string;
  externalOrderId?: string; // External Order ID
  orderIdColumn?: string; // Explicit 'Order ID' column from file
  sourceId?: string; // Original 'ID' column from file
  shippingMethod?: ShippingMethod;
  shippingCompany?: string;
  mapUrl?: string;
  latitude?: string;
  longitude?: string;
}

export interface FinancialTarget {
  id: string;
  title: string;
  amount: number;
  startDate: string;
  deadline: string;
  category: 'net_profit' | 'total_sales';
  createdAt: string;
  updatedAt?: string;
}

export interface Branding {
  logo?: string;
  name?: string;
  slogan?: string;
  sloganDesign?: string;
}

export interface Contact {
  id: string;
  companyName: string;
  phone: string;
  phone2?: string;
  contactPerson?: string;
  extraPhones?: string;
  email?: string;
  address?: string;
  specialization?: string;
  entityType: string;
  taxId?: string;
  commercialRegistry?: string;
  notes?: string;
  status: string;
  latitude?: string;
  longitude?: string;
  mapUrl?: string;
  ratingsEnabled?: number;
  ratingsData?: string;
  links?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  label?: string;
}

export interface InvoiceSettings {
  exchangeReturnUrl: string;
  shippingUrl: string;
  showExchangeReturnQr: boolean;
  showShippingQr: boolean;
  footerText: string;
  showFooterText: boolean;
  thankYouImage?: string;
  socialLinks?: SocialLink[];
  showSocialQr?: boolean;
}

export interface AppState {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  isManualMode: boolean; // True means "No Sync"
  categories: Category[];
  brandLogo?: string;
  brandName?: string;
  brandSlogan?: string;
  brandSloganDesign?: string;
  suppliers: Supplier[];
  contacts: Contact[];
  targets: FinancialTarget[];
  taxEnabled: boolean;
  taxRate: number;
  invoiceSettings?: InvoiceSettings;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  phone2?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  paymentMethod: 'نقد' | 'آجل' | 'تحويل بنكي';
  image?: string;
  items: PurchaseInvoiceItem[];
  createdAt: string;
  updatedAt?: string;
}

export type ViewMode = 'grid' | 'list' | 'compact' | 'detailed';

export interface ActivityLog {
  id: number;
  action: 'create' | 'update' | 'delete' | 'import' | string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: string | null;
  created_at: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  buyPrice: number;
}

export interface Checkpoint {
  id: number;
  name: string;
  created_at: string;
}

// ====== Easy Orders Integration Types ======

export interface EasyOrdersConfig {
  apiKey: string;
  enabled: boolean;
  pollInterval: number;           // seconds (30-300)
  imageMode: 'imgbb' | 'tunnel' | 'external';
  imgbbApiKey: string;
  serverUrl: string;              // for tunnel mode
  autoConfirm: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EasyOrdersExportDefaults {
  trackStock: boolean;
  disableOrdersNoStock: boolean;
  enableReviews: boolean;
  salePricePercent: number;       // default 85 (% of original)
}

export interface EasyOrdersStagingOrder {
  id: string;
  easyOrderId: string;
  data: Order;                    // mapped order data
  status: 'pending' | 'confirmed' | 'rejected';
  sourceOrderStatus: string;
  createdAt: string;
  syncedAt: string;
}

export interface EasyOrdersProductMap {
  id: string;
  erpProductId: string;
  easyProductId: string | null;
  easyProductSku: string | null;
  variantsMap: Record<string, string>;  // {erpVariantId: taagerCode}
  lastSyncedAt: string | null;
  status: 'pending' | 'synced' | 'failed';
}

export interface SyncLogEntry {
  id: number;
  type: 'poll' | 'export' | 'confirm' | 'reject' | 'image_upload';
  direction: 'inbound' | 'outbound';
  entityType: 'product' | 'order' | 'category';
  entityId: string | null;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  metadata: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductExportPreview {
  product: Product;
  easyProduct: any;               // mapped product for Easy Orders
  aiSuggestions?: {
    description: string;
    keywords: string[];
    slug: string;
  };
  imageUrls: string[];            // URLs after ImgBB upload
}

export interface ExportResult {
  productId: string;
  success: boolean;
  easyProductId?: string;
  error?: string;
}
