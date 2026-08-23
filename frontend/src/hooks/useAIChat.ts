import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, getAuthToken } from '../lib/api';

export interface ChatMessage {
  role: 'user' | 'model';
  content?: string;
  isError?: boolean;
  attachment?: string;
}

export interface AttachmentData {
  data: string;
  mimeType: string;
}

export interface ConversationMeta {
  id: string;
  title: string;
  updatedAt?: string;
  size?: number;
}

const MAX_HISTORY_SENT = 14;

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export function compressImage(file: File): Promise<AttachmentData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve({
          data: compressedBase64.split(',')[1],
          mimeType: 'image/jpeg'
        });
      };
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
  });
}

const makeConvId = () => `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useAIChat(brandName?: string, opts?: { onRefreshRequired?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `مرحباً بك في ${brandName || 'X2 BABY'}! أنا مساعدك الذكي، أقدر أساعدك في جرد المخزون، الحسابات، أو تحليل صور المنتجات. أؤمرني يا باشا.` }
  ]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const convIdRef = useRef<string | null>(null);

  const welcome = useCallback(
    () => [{ role: 'model' as const, content: `مرحباً بك في ${brandName || 'X2 BABY'}! أنا مساعدك الذكي، أقدر أساعدك في جرد المخزون، الحسابات، أو تحليل صور المنتجات. أؤمرني يا باشا.` }],
    [brandName]
  );

  useEffect(() => {
    if (messages.length === 1 && !activeConversationId && brandName) {
      setMessages(welcome());
    }
  }, [brandName]);

  const persistConversation = useCallback(async (msgs: ChatMessage[]) => {
    try {
      let convId = convIdRef.current;
      if (!convId) {
        convId = makeConvId();
        convIdRef.current = convId;
        setActiveConversationId(convId);
      }
      await fetch(`${API_BASE}/ai/conversations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          id: convId,
          title: msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'محادثة جديدة',
          messages: msgs
        })
      });
      refreshConversations();
    } catch {}
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/conversations`, { headers: authHeaders() });
      if (!res.ok) return;
      const list = await res.json();
      setConversations(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ai/conversations/${id}`, { headers: authHeaders() });
      if (!res.ok) return false;
      const data = await res.json();
      const loaded: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      convIdRef.current = id;
      setActiveConversationId(id);
      setMessages(loaded.length > 0 ? loaded : welcome());
      return true;
    } catch {
      return false;
    }
  }, [welcome]);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/ai/conversations/${id}`, { method: 'DELETE', headers: authHeaders() });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (convIdRef.current === id) {
        convIdRef.current = null;
        setActiveConversationId(null);
        setMessages(welcome());
      }
    } catch {}
  }, [welcome]);

  const startNewChat = useCallback(() => {
    convIdRef.current = null;
    setActiveConversationId(null);
    setMessages(welcome());
    setInput('');
    setAttachment(null);
  }, [welcome]);

  const sendMessage = useCallback(async (overrideText?: string, overrideAttachment?: AttachmentData | null) => {
    const text = overrideText !== undefined ? overrideText : input;
    const att = overrideAttachment !== undefined ? overrideAttachment : attachment;
    if (!text.trim() && !att) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    if (att) userMessage.attachment = `data:${att.mimeType};base64,${att.data}`;

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const history = newMessages.slice(-MAX_HISTORY_SENT);
      const lastAttIdx = (() => {
        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].attachment) return i;
        }
        return -1;
      })();
      const payload = history.map((m, i) => ({
        role: m.role,
        content: m.content,
        attachment: i === lastAttIdx ? m.attachment : undefined
      }));

      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ messages: payload })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'خطأ في الاتصال');

      const withReply = [...newMessages, { role: 'model' as const, content: data.content }];
      setMessages(withReply);
      if (data.refreshRequired) {
        setTimeout(() => opts?.onRefreshRequired?.(), 500);
      }
      persistConversation(withReply);
    } catch (error: any) {
      const errMessages = [...newMessages, { role: 'model' as const, content: `خطأ: ${error.message}`, isError: true }];
      setMessages(errMessages);
      persistConversation(errMessages);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachment, messages, opts, persistConversation]);

  const attachFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      setAttachment(compressed);
    } catch {}
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    attachment,
    setAttachment,
    isLoading,
    conversations,
    activeConversationId,
    sendMessage,
    attachFile,
    removeAttachment: () => setAttachment(null),
    startNewChat,
    loadConversation,
    deleteConversation,
    refreshConversations
  };
}
