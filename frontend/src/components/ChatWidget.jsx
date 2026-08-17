import { useState, useRef, useEffect } from "react";
import { chatWithProject } from "../api/client";

export default function ChatWidget({ projectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "สวัดดีครับ! ถามอะไรเกี่ยวกับโปรเจกต์นี้ได้เลย ✨",
      sources: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const question = input;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const result = await chatWithProject(projectId, question);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: result.answer,
          sources: result.sources || [],
          lowConfidence: result.answer?.includes("Insufficient."),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "ขอโทษครับ เกิดข้อผิดพลาด ลองใหม่อีกครั้ง", sources: [] },
      ]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-[#FF6B5E] text-white rounded-full cartoon-border shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-50"
        >
          <span className="material-symbols-outlined text-3xl">chat</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 w-full md:w-[380px] h-full md:h-[600px] bg-[#FFF8ED] cartoon-border md:rounded-2xl shadow-2xl z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-[#4A3F35]/20">
            <h3 className="font-baloo text-lg text-[#4A3F35] flex items-center gap-2">
              <span>✨</span> Ask AI
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full cartoon-border flex items-center justify-center hover:bg-[#E85D5D]/10"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] p-3 rounded-2xl cartoon-border ${
                    msg.role === "user"
                      ? "bg-[#FFD34E] text-[#4A3F35]"
                      : msg.lowConfidence
                      ? "bg-white border-[#FFD34E] border-[3px] text-[#4A3F35]"
                      : "bg-white text-[#4A3F35]"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 space-y-1 max-w-[85%]">
                    {msg.sources.map((src, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-[#5EC8F2]/10 border border-[#5EC8F2]/30 rounded-lg p-2 text-xs"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[#4A3F35]/70">References</span>
                          <span className="font-bold text-[#5EC8F2]">
                            {Math.round(src.relevance_score * 100)}%
                          </span>
                        </div>
                        <p className="text-[#4A3F35] line-clamp-2">{src.chunk_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 bg-white cartoon-border rounded-full w-fit px-4 py-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-[#FF6B5E] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t-2 border-[#4A3F35]/20 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your question..."
              className="flex-1 px-4 py-2 rounded-full cartoon-border outline-none focus:ring-4 focus:ring-[#5EC8F2]/20 text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-10 h-10 rounded-full bg-[#FF6B5E] text-white cartoon-border flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}