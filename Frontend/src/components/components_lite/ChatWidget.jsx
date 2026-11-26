import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MessageCircle, X, Send } from "lucide-react";
import { CHAT_API_ENDPOINT } from "@/utils/data";

const GREETING = {
  role: "assistant",
  content:
    'Hi! I can help you find jobs, check your applications, or use this site. Try "remote React jobs".',
};

// Floating chat bubble shown on every page (mounted in main.jsx).
const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, sending]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    // history = everything except the greeting, without the job cards
    const history = messages.slice(1).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);

    try {
      const res = await axios.post(
        CHAT_API_ENDPOINT,
        { message: text, history },
        { withCredentials: true } // sends the login cookie, so answers can be personal
      );
      setMessages((m) => [
        ...m,
        { role: "assistant", content: res.data.reply, jobs: res.data.jobs },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            error.response?.data?.message || "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open ? (
        <div className="flex flex-col w-[calc(100vw-2rem)] sm:w-96 h-[32rem] max-h-[80vh] bg-white rounded-xl shadow-2xl border">
          <div className="flex items-center justify-between px-4 py-3 bg-[#6B3AC2] text-white rounded-t-xl">
            <span className="font-semibold">AI Job Assistant</span>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <div
                  className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap text-left ${
                    m.role === "user"
                      ? "bg-[#6B3AC2] text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {m.content}
                </div>
                {m.jobs?.map((job) => (
                  // plain <a>: the widget sits outside the router, so <Link> can't be used
                  <a
                    key={job.id}
                    href={`/description/${job.id}`}
                    className="block mt-2 p-2 border rounded-lg text-sm text-left hover:bg-gray-50"
                  >
                    <div className="font-medium">{job.title}</div>
                    <div className="text-gray-500">
                      {job.company} · {job.location} · {job.salaryLPA} LPA
                    </div>
                  </a>
                ))}
              </div>
            ))}
            {sending && <div className="text-sm text-gray-400">Thinking…</div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 p-3 border-t">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about jobs…"
              aria-label="Message"
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-[#6B3AC2] text-white rounded-lg px-3 disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-[#6B3AC2] text-white rounded-full p-4 shadow-lg hover:scale-105 transition"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
};

export default ChatWidget;
