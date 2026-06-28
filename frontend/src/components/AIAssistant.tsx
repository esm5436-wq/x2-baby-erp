import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, Send, X, Bot, Loader2, Sparkles, User, Minimize2, Maximize2, Trash2, Paperclip, Image as ImageIcon, BarChart3, PackageSearch, History, Download } from 'lucide-react';
import { AppState, Order, Product, OrderStatus } from '../types';

interface AIAssistantProps {
  state: AppState;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onAddOrder: (order: Order) => void;
  onUpdateProduct: (product: Product) => void;
  onRefreshState?: () => void;
}

interface Message {
  role: 'user' | 'model' | 'system' | 'tool';
  content?: string;
  parts?: any[];
  isError?: boolean;
  attachment?: string; // Base64 string for display
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state, onUpdateOrderStatus, onAddOrder, onUpdateProduct, onRefreshState }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{data: string, mimeType: string} | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: `مرحباً بك في ${state.brandName || 'X2 BABY'}! أنا مساعدك الذكي، أقدر أساعدك في جرد المخزون، الحسابات، أو تحليل صور المنتجات. أؤمرني يا باشا.` }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messages.length === 1 && state.brandName) {
      setMessages([{ role: 'model', content: `مرحباً بك في ${state.brandName}! أنا مساعدك الذكي، أقدر أساعدك في جرد المخزون، الحسابات، أو تحليل صور المنتجات. أؤمرني يا باشا.` }]);
    }
  }, [state.brandName]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const clearChat = () => {
    setMessages([{ role: 'model', content: 'مرحباً بك في X2 BABY! أؤمرني، محتاج تعرف إيه النهاردة؟' }]);
    setAttachment(null);
  };

  const compressImage = (file: File): Promise<{data: string, mimeType: string}> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // 800px كافية جداً للرؤية وتوفر الكثير من الـ Tokens
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // تحويل الصورة إلى JPEG بجودة 70% لتقليل الحجم جداً مع الحفاظ على الوضوح للذكاء الاصطناعي
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve({
            data: compressedBase64.split(',')[1],
            mimeType: 'image/jpeg'
          });
        };
      };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setAttachment(compressed);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          compressImage(file).then(compressed => setAttachment(compressed));
          return;
        }
      }
    }
  };

  const removeAttachment = () => setAttachment(null);

  // --- Gemini Integration ---

  const getSystemInstruction = () => {
    const statusList = Object.values(OrderStatus).join(', ');
    return `
      أنت "مساعد X2 الذكي"، الخبير الشامل لنظام X2 BABY ERP. التاريخ: ${new Date().toLocaleDateString('ar-EG')}.
      
      معلومات النظام الحيوية (A to Z):
      1. المخازن: تدعم المنتجات والأنواع (Variants). التقارير تبين النواقص وحركة الأصناف.
      2. المشتريات: مرتبطة بالموردين، وتحدث سعر التكلفة والمخزون لحظياً.
      3. المبيعات: تدعم الكاش والآجل، وتدير مديونيات العملاء بدقة.
      4. الحسابات: تقارير الأرباح والخسائر تعتمد على (سعر البيع - آخر سعر توريد).
      5. استراتيجية التسعير الذكي (X2 Smart): نستخدم علم النفس التسويقي (rounding to 9/49) وهوامش ربح (25% سريع، 45% متوازن، 60% مميز).
      
      المهام المطلوبة منك:
      - تحليل صور المنتجات وربطها بالمخازن.
      - إصدار تقارير مالية وجداول منظمة.
      - تقديم نصائح تسويقية لزيادة الأرباح بناءً على البيانات.
      - كن دائماً مستشاراً وليس مجرد آلة إجابة.
      
      القواعد: لهجة مصرية محترفة، اختصار مفيد، استخدم جداول Markdown، لا تحذف شيئاً بدون تأكيد.
    `;
  };

  const exportTableToExcel = (markdown: string) => {
    try {
      const rows = markdown.split('\n').filter(row => {
        const trimmed = row.trim();
        return trimmed.startsWith('|') && trimmed.includes('|');
      });

      if (rows.length < 2) return;

      const data = rows.map(row => {
        const cells = row.split('|').map(cell => cell.trim());
        if (cells[0] === '') cells.shift();
        if (cells[cells.length - 1] === '') cells.pop();
        return cells;
      }).filter(row => !row.every(cell => cell.includes('---')));

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AI Report");

      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const cols = [];

      for (let C = range.s.c; C <= range.e.c; ++C) {
        cols.push({ wch: 18 });
      }

      ws['!cols'] = cols;

      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellAddress];
          if (!cell) continue;

          const isHeader = R === range.s.r;
          cell.s = {
            font: {
              bold: isHeader,
              name: 'Calibri',
              sz: isHeader ? 12 : 11,
            },
            alignment: {
              horizontal: isHeader ? 'center' : 'right',
              vertical: 'center',
              wrapText: true,
            },
            border: {
              top: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { rgb: 'FFCCCCCC' } },
            },
            fill: isHeader
              ? { fgColor: { rgb: 'FFD9E1F2' } }
              : undefined,
          };
        }
      }

      if (!ws['!dir']) ws['!dir'] = 'rtl';
      ws['!rows'] = Array.from({ length: range.e.r + 1 }, () => ({ hpt: 18 }));

      XLSX.writeFile(wb, `X2_BABY_Report_${Date.now()}.xlsx`);
    } catch (error) {
      console.error("Excel Export Error:", error);
      alert("حدث خطأ أثناء تصدير ملف الإكسيل، يرجى المحاولة مرة أخرى.");
    }
  };

  const quickActions = [
    { label: '📊 ملخص مالي', prompt: 'إديني ملخص مالي كامل للأرباح والمبيعات والمصروفات' },
    { label: '📦 المخزون', prompt: 'عرض ملخص المخزون بالكامل' },
    { label: '🕒 آخر الطلبات', prompt: 'وريني آخر 10 طلبات وحالاتها' },
    { label: '⚠️ النواقص', prompt: 'إيه المنتجات اللي قربت تخلص في المخزون؟' },
    { label: '📋 تقرير شامل', prompt: 'عرض تقرير شامل: المخزون، المبيعات، الأرباح، المصروفات، وأخر الطلبات' },
    { label: '💰 المصروفات', prompt: 'عرض كل المصروفات المسجلة' },
    { label: '👥 جهات الاتصال', prompt: 'عرض كل جهات الاتصال المسجلة' },
    { label: '🏷️ الكوبونات', prompt: 'عرض كل الكوبونات المخزنة' },
  ];

  const quickActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    if (quickActionTimerRef.current) clearTimeout(quickActionTimerRef.current);
    quickActionTimerRef.current = setTimeout(() => {
      const btn = document.getElementById('ai-send-btn');
      btn?.click();
      quickActionTimerRef.current = null;
    }, 100);
  };

  const handleSend = async () => {
    if (!input.trim() && !attachment) return;

    const userMessage: Message = { role: 'user', content: input };
    if (attachment) {
      userMessage.attachment = `data:${attachment.mimeType};base64,${attachment.data}`;
    }

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const endpoint = `/api/ai/chat`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // تقليل عدد الرسائل المرسلة لـ 6 لتوفير الـ Tokens
          messages: newMessages.slice(-6).map(m => ({ 
            role: m.role, 
            content: m.content, 
            attachment: m.attachment 
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'خطأ في الاتصال');

      setMessages(prev => [...prev, { role: 'model', content: data.content }]);
      if (data.refreshRequired && onRefreshState) {
        setTimeout(() => onRefreshState(), 500);
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', content: `خطأ: ${error.message}`, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="ai-toggle-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleOpen}
            className="fixed bottom-20 md:bottom-6 left-6 z-[200] w-14 h-14 bg-gradient-to-tr from-accent to-blue-400 text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer border-2 border-white dark:border-slate-700"
            title="المساعد الذكي"
          >
            <Sparkles size={24} className="animate-pulse" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div 
            key="ai-window"
            initial={isMinimized ? { scale: 0.8, opacity: 0, y: 100 } : { scale: 0.9, opacity: 0, y: 20 }}
            animate={isMinimized ? { scale: 1, opacity: 1, y: 0, height: 64, width: 288, borderRadius: 24 } : { scale: 1, opacity: 1, y: 0, height: 600, width: 400, borderRadius: 32 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-6 z-[200] shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 flex flex-col"
            style={{ 
              maxWidth: '90vw',
              maxHeight: '80vh'
            }}
          >
            {/* Header */}
            <div 
              className="h-16 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-between px-5 border-b border-gray-100 dark:border-slate-700 cursor-pointer shrink-0"
              onClick={isMinimized ? toggleMinimize : undefined}
            >
              <div className="flex items-center gap-3">
                {state.brandLogo ? (
                  <motion.div 
                    layout
                    className="w-16 h-16 bg-white rounded-3xl overflow-hidden shadow-md ring-2 ring-accent/10 flex-shrink-0"
                  >
                    <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover p-0" />
                  </motion.div>
                ) : (
                  <motion.div 
                    layout
                    className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-accent/20"
                  >
                    X2
                  </motion.div>
                )}
                <motion.div layout className="flex flex-col">
                  <span className="font-black text-gray-800 dark:text-white text-sm">مساعد X2 BABY</span>
                  {!isMinimized && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> متصل الآن
                    </motion.span>
                  )}
                </motion.div>
              </div>
              <div className="flex items-center gap-1">
                <AnimatePresence>
                  {!isMinimized && (
                    <motion.button 
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      onClick={clearChat} 
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all" 
                      title="مسح المحادثة"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <button onClick={toggleMinimize} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all">
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button onClick={toggleOpen} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
              {!isMinimized && (
                <motion.div 
                  key="chat-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-950/50 scroll-smooth">
                    <AnimatePresence initial={false}>
                      {messages.map((msg, idx) => {
                        if (msg.role === 'tool' || msg.role === 'system') return null;
                        
                        return (
                          <motion.div 
                            key={idx} 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            layout
                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-gray-200 dark:bg-slate-700 text-gray-600' : 'bg-white dark:bg-slate-800'}`}>
                              {msg.role === 'user' ? (
                                <User size={14} />
                              ) : state.brandLogo ? (
                                <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover" />
                              ) : (
                                <Bot size={16} className="text-accent" />
                              )}
                            </div>
                            <div className={`group relative max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col gap-2 ${
                              msg.role === 'user' 
                                ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tr-none border border-gray-100 dark:border-slate-700' 
                                : msg.isError 
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-900/30 rounded-tl-none'
                                  : 'bg-accent/10 dark:bg-accent/20 text-gray-900 dark:text-white rounded-tl-none'
                            }`}>
                              {msg.attachment && (
                                <motion.img 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  src={msg.attachment} 
                                  alt="Uploaded content" 
                                  className="max-w-full rounded-lg border border-gray-200 dark:border-slate-600 mb-2 max-h-40 object-cover"
                                />
                              )}
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                className="prose dark:prose-invert max-w-full overflow-x-auto text-xs md:text-sm"
                                components={{
                                  table: ({node, ...props}) => <div className="overflow-x-auto my-2 border rounded-xl bg-white/50 dark:bg-slate-900/50"><table className="w-full text-right border-collapse" {...props} /></div>,
                                  thead: ({node, ...props}) => <thead className="bg-gray-100/50 dark:bg-slate-800/50" {...props} />,
                                  th: ({node, ...props}) => <th className="p-2 border-b dark:border-slate-700 font-black text-accent" {...props} />,
                                  td: ({node, ...props}) => <td className="p-2 border-b dark:border-slate-700 font-bold" {...props} />,
                                  p: ({node, ...props}) => <p className="m-0 leading-relaxed" {...props} />,
                                }}
                              >
                                {msg.content || ""}
                              </ReactMarkdown>

                              {msg.role === 'model' && msg.content?.includes('|') && (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => exportTableToExcel(msg.content!)}
                                  className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-all shadow-sm w-fit"
                                >
                                  <Download size={12} />
                                  تصدير الجدول لـ Excel
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    {isLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                        <div className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shrink-0 mt-1">
                          <Bot size={16} />
                        </div>
                        <div className="bg-accent/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-accent rounded-full"></motion.div>
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-accent rounded-full"></motion.div>
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-accent rounded-full"></motion.div>
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-3 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 space-y-3 shrink-0">
                    {/* Quick Suggestions */}
                    <AnimatePresence>
                      {!attachment && !isLoading && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                        >
                          {quickActions.map((action, i) => (
                            <motion.button 
                              key={i} 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleQuickAction(action.prompt)} 
                              className="whitespace-nowrap px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-full text-[10px] font-black text-gray-600 dark:text-gray-300 hover:bg-accent/10 hover:text-accent transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              {action.label}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {attachment && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 20 }}
                          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
                              <img src={`data:${attachment.mimeType};base64,${attachment.data}`} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">صورة مرفقة</span>
                          </div>
                          <button onClick={removeAttachment} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full text-gray-500">
                            <X size={16} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="relative flex items-center gap-2">
                      <input
                        ref={inputRef}
                        className="w-full pl-4 pr-24 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white focus:border-accent focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                        placeholder="اكتب رسالتك هنا..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        disabled={isLoading}
                      />
                      <div className="absolute left-2 flex items-center gap-1.5">
                        <button onClick={() => fileInputRef.current?.click()}
                          className="w-9 h-9 text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center justify-center transition-all"
                          title="إرفاق صورة"
                          disabled={isLoading}
                        >
                          <Paperclip size={18} />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          id="ai-send-btn"
                          onClick={handleSend}
                          disabled={(!input.trim() && !attachment) || isLoading}
                          className="w-9 h-9 bg-accent text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-transform shadow-md"
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
    </>
  );
};

export default AIAssistant;