import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, MessageSquare, Trash2, History, X } from 'lucide-react';
import { AppState } from '../types';
import { useAIChat, ConversationMeta } from '../hooks/useAIChat';
import ChatMessages from './chat/ChatMessages';
import ChatComposer from './chat/ChatComposer';
import MD3BottomSheet from './MD3BottomSheet';

interface AssistantPageProps {
  state: AppState;
  onRefreshState?: () => void;
}

function formatConvDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `اليوم ${time}`;
    return `${d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} · ${time}`;
  } catch {
    return dateStr;
  }
}

interface ConversationListProps {
  conversations: ConversationMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function ConversationListItem(props: { conv: ConversationMeta; active: boolean; onSelect: () => void; onDelete: () => void }) {
  const { conv, active, onSelect, onDelete } = props;
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className={'group relative rounded-xl border transition-colors duration-200 cursor-pointer ' + (active ? 'bg-accent/10 border-accent/30' : 'bg-white dark:bg-slate-800/60 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800')}
      onClick={onSelect}
    >
      <div className="p-3 pl-9">
        <p className={'text-xs font-bold truncate ' + (active ? 'text-accent' : 'text-gray-700 dark:text-gray-200')}>
          {conv.title || 'محادثة جديدة'}
        </p>
        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{formatConvDate(conv.updatedAt)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 md:opacity-0 md:group-hover:opacity-100"
        title="حذف المحادثة"
      >
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, activeId, onSelect, onDelete, onNew }) => {
  const items = conversations.map((conv) => (
    <ConversationListItem
      key={conv.id}
      conv={conv}
      active={conv.id === activeId}
      onSelect={() => onSelect(conv.id)}
      onDelete={() => onDelete(conv.id)}
    />
  ));

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNew}
        className="m-3 flex items-center justify-center gap-2 px-4 py-3 bg-accent text-white rounded-xl font-black text-sm shadow-md hover:bg-accent/90 transition-colors duration-200 shrink-0"
      >
        <Plus size={18} />
        <span>محادثة جديدة</span>
      </button>
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center px-4">
            <History size={32} className="text-gray-300 dark:text-slate-600 mb-3" />
            <p className="text-xs font-bold text-gray-400 dark:text-slate-500">لا توجد محادثات محفوظة بعد</p>
            <p className="text-[10px] text-gray-300 dark:text-slate-600 mt-1">ستظهر محادثاتك هنا تلقائياً</p>
          </div>
        ) : items}
      </div>
    </div>
  );
};

const AssistantPage: React.FC<AssistantPageProps> = ({ state, onRefreshState }) => {
  const chat = useAIChat(state.brandName, { onRefreshRequired: onRefreshState });
  const [showConversations, setShowConversations] = useState(false);

  const composer = (
    <ChatComposer
      input={chat.input}
      setInput={chat.setInput}
      attachment={chat.attachment}
      removeAttachment={chat.removeAttachment}
      onAttachFile={chat.attachFile}
      onSend={() => chat.sendMessage()}
      isLoading={chat.isLoading}
      showQuickActions
      onQuickAction={(prompt) => chat.sendMessage(prompt)}
      autoFocus
    />
  );

  return (
    <div className="h-[calc(100dvh-140px)] min-h-[420px] flex gap-4" dir="rtl">
      <aside className="hidden lg:flex flex-col w-72 shrink-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
        <ConversationList
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          onSelect={(id) => chat.loadConversation(id)}
          onDelete={(id) => chat.deleteConversation(id)}
          onNew={chat.startNewChat}
        />
      </aside>

      <section className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
        <div className="h-14 px-5 flex items-center justify-between border-b border-gray-100 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {state.brandLogo ? (
              <img src={state.brandLogo} alt="" className="w-9 h-9 rounded-xl object-cover shadow-sm ring-2 ring-accent/10 shrink-0" />
            ) : (
              <div className="w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0">X2</div>
            )}
            <div className="min-w-0">
              <h2 className="font-black text-gray-800 dark:text-white text-sm truncate">مساعد {state.brandName || 'X2 BABY'} الذكي</h2>
              <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span>متصل الآن — يتحكم بالنظام بالكامل</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowConversations(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors duration-200"
              title="المحادثات المحفوظة"
            >
              <MessageSquare size={18} />
            </button>
            <button
              onClick={chat.startNewChat}
              className="lg:hidden p-2 text-accent hover:bg-accent/10 rounded-xl transition-colors duration-200"
              title="محادثة جديدة"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={chat.startNewChat}
              className="hidden lg:flex p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors duration-200"
              title="بدء محادثة جديدة"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <ChatMessages messages={chat.messages} isLoading={chat.isLoading} brandLogo={state.brandLogo} />
        {composer}
      </section>

      <MD3BottomSheet isOpen={showConversations} onClose={() => setShowConversations(false)} initialSnap={70}>
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="font-black text-sm text-gray-800 dark:text-white">المحادثات المحفوظة</h3>
          <button onClick={() => setShowConversations(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <ConversationList
          conversations={chat.conversations}
          activeId={chat.activeConversationId}
          onSelect={(id) => { chat.loadConversation(id); setShowConversations(false); }}
          onDelete={(id) => chat.deleteConversation(id)}
          onNew={() => { chat.startNewChat(); setShowConversations(false); }}
        />
      </MD3BottomSheet>
    </div>
  );
};

export default AssistantPage;
