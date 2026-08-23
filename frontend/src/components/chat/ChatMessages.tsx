import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, User, Download, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../hooks/useAIChat';
import { exportTableToExcel } from '../../lib/chatExport';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading: boolean;
  brandLogo?: string;
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isLoading, brandLogo }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-slate-950/50 scroll-smooth">
      <AnimatePresence initial={false}>
        {messages.map((msg: ChatMessage, idx: number) => {
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm overflow-hidden ${msg.role === 'user' ? 'bg-gray-200 dark:bg-slate-700 text-gray-600' : 'bg-white dark:bg-slate-800'}`}>
                {msg.role === 'user' ? (
                  <User size={14} />
                ) : brandLogo ? (
                  <img src={brandLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Bot size={16} className="text-accent" />
                )}
              </div>
              <div className={`group relative max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm flex flex-col gap-2 ${
                msg.role === 'user'
                  ? 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 rounded-tr-none border border-gray-100 dark:border-slate-700'
                  : msg.isError
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-tl-none'
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
                    table: (props) => <div className="overflow-x-auto my-2 border rounded-xl bg-white/50 dark:bg-slate-900/50"><table className="w-full text-right border-collapse" {...props} /></div>,
                    thead: (props) => <thead className="bg-gray-100/50 dark:bg-slate-800/50" {...props} />,
                    th: (props) => <th className="p-2 border-b dark:border-slate-700 font-black text-accent" {...props} />,
                    td: (props) => <td className="p-2 border-b dark:border-slate-700 font-bold" {...props} />,
                    p: (props) => <p className="m-0 leading-relaxed" {...props} />,
                  }}
                >
                  {msg.content || ""}
                </ReactMarkdown>

                {msg.role === 'model' && !msg.isError && msg.content?.includes('|') && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportTableToExcel(msg.content!)}
                    className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black hover:bg-emerald-700 transition-colors duration-200 shadow-sm w-fit"
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
            {brandLogo ? (
              <img src={brandLogo} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <Bot size={16} />
            )}
          </div>
          <div className="bg-accent/10 p-4 rounded-2xl rounded-tl-none flex gap-1">
            <Loader2 size={16} className="animate-spin text-accent" />
          </div>
        </motion.div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatMessages;
