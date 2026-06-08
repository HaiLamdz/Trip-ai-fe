'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';

interface Message { role: 'user' | 'ai'; content: string; }

interface Props {
  tripId: number;
  onClose: () => void;
  onTimelineUpdate: (days: unknown[]) => void;
}

const CHAT_LIMIT = 50;

export default function AIChatSidebar({ tripId, onClose, onTimelineUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || chatCount >= CHAT_LIMIT) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const { data } = await api.post(`/trips/${tripId}/chat`, { message: userMsg });
      setMessages(prev => [...prev, { role: 'ai', content: data.message }]);
      setChatCount(data.chat_count || chatCount + 1);

      if (data.updated_days) {
        onTimelineUpdate(data.updated_days);
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setMessages(prev => [...prev, { role: 'ai', content: 'Đã đạt giới hạn chỉnh sửa cho lịch trình này.' }]);
        setChatCount(CHAT_LIMIT);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const atLimit = chatCount >= CHAT_LIMIT;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900">✏️ Chỉnh sửa với AI</h3>
          <p className="text-xs text-gray-500">{chatCount}/{CHAT_LIMIT} lượt</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-8">
            <p className="text-3xl mb-3">💬</p>
            <p>Hỏi AI để chỉnh sửa lịch trình</p>
            <p className="text-xs mt-2 text-gray-400">Ví dụ: "Thêm quán cafe buổi sáng", "Giảm chi phí ngày 2"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-900 rounded-bl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-500">
              <span className="animate-pulse">AI đang suy nghĩ...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        {atLimit ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg text-sm text-center">
            Đã đạt giới hạn 50 lượt chỉnh sửa cho lịch trình này.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              placeholder="Nhập yêu cầu chỉnh sửa..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
