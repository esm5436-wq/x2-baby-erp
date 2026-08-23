import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { AppState, Order, Product } from '../types';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAIChat } from '../hooks/useAIChat';
import ChatMessages from './chat/ChatMessages';
import ChatComposer from './chat/ChatComposer';
import MD3BottomSheet from './MD3BottomSheet';

interface AIAssistantProps {
  state: AppState;
  onUpdateOrderStatus: (orderId: string, status: string) => void;
  onAddOrder: (order: Order) => void;
  onUpdateProduct: (product: Product) => void;
  onRefreshState?: () => void;
  hidden?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ state, onRefreshState, hidden = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === 'compact';
  useEffect(() => { if (isMobile) setIsMinimized(false); }, [isMobile]);

  const chat = useAIChat(state.brandName, { onRefreshRequired: onRefreshState });

  const toggleOpen = () => setIsOpen(!isOpen);
  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const chatHeader = (
    <div
      className="h-16 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 flex items-center justify-between px-5 border-b border-gray-100 dark:border-slate-700 cursor-pointer shrink-0"
      onClick={isMinimized ? toggleMinimize : undefined}
    >
      <div className="flex items-center gap-3">
        {state.brandLogo ? (
          <motion.div layout className="w-16 h-16 bg-white rounded-3xl overflow-hidden shadow-md ring-2 ring-accent/10 flex-shrink-0">
            <img src={state.brandLogo} alt="Logo" className="w-full h-full object-cover p-0" />
          </motion.div>
        ) : (
          <motion.div layout className="w-12 h-12 bg-accent text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-accent/20">
            X2
          </motion.div>
        )}
        <motion.div layout className="flex flex-col">
          <span className="font-black text-gray-800 dark:text-white text-sm">مساعد X2 BABY</span>
          {!isMinimized && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> متصل الآن
            </motion.span>
          )}
        </motion.div>
      </div>
      <div className="flex items-center gap-1">
        <AnimatePresence>
          {!isMinimized && (
            <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={(e) => { e.stopPropagation(); chat.startNewChat(); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors duration-200" title="مسح المحادثة وبدء محادثة جديدة">
              <Trash2 size={16} />
            </motion.button>
          )}
        </AnimatePresence>
        {!isMobile && (
          <button onClick={toggleMinimize} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors duration-200">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
        )}
        <button onClick={toggleOpen} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors duration-200">
          <X size={20} />
        </button>
      </div>
    </div>
  );

  const chatBody = (
    <>
      <ChatMessages messages={chat.messages} isLoading={chat.isLoading} brandLogo={state.brandLogo} />
      <ChatComposer
        input={chat.input}
        setInput={chat.setInput}
        attachment={chat.attachment}
        removeAttachment={chat.removeAttachment}
        onAttachFile={chat.attachFile}
        onSend={() => chat.sendMessage()}
        isLoading={chat.isLoading}
        showQuickActions
        onQuickAction={prompt => chat.sendMessage(prompt)}
        autoFocus
      />
    </>
  );

  if (hidden) return null;

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
            className="fixed bottom-20 md:bottom-6 left-6 z-[250] w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:shadow-xl transition-all"
            style={{ backgroundColor: 'var(--md-sys-color-primary-container, #c2e7ff)', color: 'var(--md-sys-color-on-primary-container, #001e2e)' }}
            title="المساعد الذكي"
          >
            <Sparkles size={24} className="animate-pulse" />
          </motion.button>
        )}

        {isOpen && !isMobile && (
          <motion.div
            key="ai-window"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            className={`fixed bottom-6 left-6 z-[250] shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 flex flex-col rounded-[32px] w-[400px] max-w-[90vw] ${isMinimized ? '' : 'h-[600px] max-h-[80vh]'}`}
          >
            {chatHeader}
            <AnimatePresence mode="wait">
              {!isMinimized && (
                <motion.div
                  key="chat-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col overflow-hidden min-h-0"
                >
                  {chatBody}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      {isMobile && (
        <MD3BottomSheet
          isOpen={isOpen}
          onClose={toggleOpen}
          initialSnap={60}
          header={chatHeader}
          actions={
            <ChatComposer
              input={chat.input}
              setInput={chat.setInput}
              attachment={chat.attachment}
              removeAttachment={chat.removeAttachment}
              onAttachFile={chat.attachFile}
              onSend={() => chat.sendMessage()}
              isLoading={chat.isLoading}
              showQuickActions
              onQuickAction={prompt => chat.sendMessage(prompt)}
            />
          }
        >
          <ChatMessages messages={chat.messages} isLoading={chat.isLoading} brandLogo={state.brandLogo} />
        </MD3BottomSheet>
      )}
    </>
  );
};

export default AIAssistant;
