import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  ArrowUpRight,
  Bot,
  MessageCircle,
  Plus,
  Square,
  X,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import "./assistant.css";

type Message = { role: "user" | "assistant"; content: string };
const suggestions: Record<string, string[]> = {
  public: [
    "How do I find an instructor?",
    "How does booking work?",
    "What can the AI assistant do?",
  ],
  Student: [
    "What's my next lesson?",
    "Do I have any payments needing action?",
    "Summarize my upcoming bookings.",
  ],
  Instructor: [
    "Summarize tomorrow's lessons.",
    "Do I have pending payouts?",
    "Which students need attention?",
  ],
  Admin: [
    "Show refunds needing attention.",
    "Summarize operational issues.",
    "Are there financial operations in manual review?",
  ],
};
function backendBaseUrl() {
  return String(
    import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_APP_BACKEND_URL ||
      "http://localhost:4000",
  )
    .replace(/\/graphql\/?$/, "")
    .replace(/\/$/, "");
}
function MessageContent({ content }: { content: string }) {
  const links: Record<string, string> = {
    "/professional": "Browse instructors",
    "/auth/signin": "Sign in",
    "/auth/signup": "Create an account",
  };
  return (
    <>
      {content
        .split(
          /(\/auth\/signin|\/auth\/signup|\/professional|\*\*[^*\n]+\*\*)/g,
        )
        .map((part, index) =>
          links[part] ? (
            <a key={index} href={part}>
              {links[part]}
            </a>
          ) : part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </>
  );
}
export default function AssistantPanel({
  pageContext,
  publicMode = false,
}: {
  pageContext: string;
  publicMode?: boolean;
}) {
  const { user, token } = useAuth();
  const scope = publicMode ? "public" : user?.role || "";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null);
  const activeRequest = useRef(0);
  const previouslyOpen = useRef(false);
  const identity = `${scope}:${publicMode ? "guest" : user?.id || ""}`;
  useEffect(() => {
    activeRequest.current++;
    controller.current?.abort();
    setMessages([]);
    setError("");
    setMode("");
    setSending(false);
    setInput("");
    return () => {
      activeRequest.current++;
      controller.current?.abort();
    };
  }, [identity]);
  useEffect(() => {
    const handleOpen = (event: Event) => {
      setOpen(true);
      if ((event as CustomEvent).detail)
        setInput(String((event as CustomEvent).detail).slice(0, 4000));
    };
    window.addEventListener("dsp:assistant-open", handleOpen);
    return () => window.removeEventListener("dsp:assistant-open", handleOpen);
  }, []);
  useEffect(() => {
    if (open) composer.current?.focus();
    else if (previouslyOpen.current) launcher.current?.focus();
    previouslyOpen.current = open;
  }, [open]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [messages, sending, error, open]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  const stop = () => {
    activeRequest.current++;
    controller.current?.abort();
    setSending(false);
  };
  const reset = () => {
    stop();
    setMessages([]);
    setError("");
    setMode("");
    composer.current?.focus();
  };
  const send = async (preset?: string, retry = false) => {
    const content = (preset ?? input).trim();
    if (!content || sending) return;
    const history =
      retry && messages[messages.length - 1]?.role === "user"
        ? messages.slice(0, -1)
        : messages;
    setMessages([...history, { role: "user", content }]);
    setInput("");
    setError("");
    setSending(true);
    const request = ++activeRequest.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 30000);
    try {
      const response = await fetch(
        `${backendBaseUrl()}/api/v1/assistant/${publicMode ? "public/" : ""}chat`,
        {
          method: "POST",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            ...(!publicMode ? { Authorization: `Bearer ${token || ""}` } : {}),
          },
          body: JSON.stringify({
            message: content,
            history: history.slice(-8),
            pageContext: `${pageContext} ${window.location.pathname}`.slice(
              0,
              80,
            ),
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          body.error || "The assistant could not connect. Please try again.",
        );
      if (request !== activeRequest.current) return;
      if (typeof body.answer !== "string" || !body.answer.trim())
        throw new Error("No answer was received. Please try again.");
      setMode(body.mode || "");
      setMessages((current) => [
        ...current,
        { role: "assistant", content: body.answer },
      ]);
    } catch (failure) {
      if (request === activeRequest.current)
        setError(
          failure instanceof Error && failure.name !== "AbortError"
            ? failure.message
            : "The request timed out. Please try again.",
        );
    } finally {
      window.clearTimeout(timeout);
      if (request === activeRequest.current) setSending(false);
    }
  };
  if (!suggestions[scope]) return null;
  return createPortal(
    <div className="dsp-chat-root">
      <button
        type="button"
        ref={launcher}
        className={`dsp-chat-launcher ${open ? "is-hidden" : ""}`}
        aria-label="Open Drive Pilot assistant"
        aria-expanded={open}
        aria-controls="dsp-chat-panel"
        onClick={() => setOpen(true)}
      >
        <span>
          <Bot size={23} />
        </span>
        <span>
          Ask Drive Pilot<small>Your driving companion</small>
        </span>
        <ArrowUpRight size={17} />
      </button>
      {open && (
        <section
          id="dsp-chat-panel"
          className="dsp-chat-panel"
          role="dialog"
          aria-labelledby="dsp-chat-title"
        >
          <header className="dsp-chat-header">
            <span className="dsp-chat-mark">
              <Bot size={24} />
            </span>
            <div>
              <h2 id="dsp-chat-title">Drive Pilot Assistant</h2>
              <p>
                <i />
                {publicMode
                  ? "Your marketplace guide"
                  : `${scope} workspace · Read-only help`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Clear conversation"
              title="New conversation"
              onClick={reset}
            >
              <Plus size={20} />
            </button>
            <button
              type="button"
              aria-label="Close assistant"
              onClick={() => {
                setOpen(false);
                launcher.current?.focus();
              }}
            >
              <X size={20} />
            </button>
          </header>
          <div
            className="dsp-chat-conversation"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-busy={sending}
          >
            {!messages.length && (
              <div className="dsp-chat-welcome">
                <span className="dsp-chat-welcome-icon">
                  <MessageCircle size={30} />
                </span>
                <span className="dsp-chat-eyebrow">
                  A LITTLE GUIDANCE. A CLEARER ROAD.
                </span>
                <h3>
                  {publicMode
                    ? "Where would you like to start?"
                    : "Your workspace, explained."}
                </h3>
                <p>
                  {publicMode
                    ? "Find your instructor, understand booking, or explore what Drive Pilot can do for you."
                    : "Ask about your lessons, payments, or the information in your workspace."}
                </p>
                <div className="dsp-chat-suggestions">
                  {suggestions[scope].map((text) => (
                    <button
                      type="button"
                      key={text}
                      onClick={() => void send(text)}
                    >
                      {text}
                      <ArrowUpRight size={15} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                className={`dsp-chat-message dsp-chat-message--${message.role}`}
                key={index}
              >
                <span className="dsp-chat-message-label">
                  {message.role === "user" ? "You" : "Drive Pilot Assistant"}
                </span>
                <div className="dsp-chat-bubble">
                  {message.role === "assistant" ? (
                    <MessageContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="dsp-chat-thinking" role="status">
                <span />
                <span />
                <span />
                <small>
                  {publicMode
                    ? "Finding your way…"
                    : "Checking your workspace…"}
                </small>
              </div>
            )}
            {error && (
              <div className="dsp-chat-error" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() =>
                    void send(messages[messages.length - 1]?.content, true)
                  }
                >
                  Try again
                </button>
              </div>
            )}
            <div ref={end} />
          </div>
          <footer className="dsp-chat-footer">
            {messages.length > 0 && !sending && !error && (
              <div className="dsp-chat-source">
                {mode === "guide"
                  ? "Product guide · Based on Drive Pilot features"
                  : publicMode
                    ? "Product information · No account access"
                    : "Answers use your authorized Drive Pilot information"}
              </div>
            )}
            <form
              className="dsp-chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <textarea
                ref={composer}
                rows={2}
                maxLength={4000}
                value={input}
                aria-label="Assistant message"
                placeholder={
                  publicMode
                    ? "Ask about lessons, booking, or Drive Pilot…"
                    : "Ask about your workspace…"
                }
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              {sending ? (
                <button type="button" aria-label="Stop response" onClick={stop}>
                  <Square size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!input.trim()}
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </form>
            <p>
              {publicMode
                ? "Personal bookings and payments? Sign in to your workspace."
                : "Read-only assistance. Review details in your workspace."}
            </p>
          </footer>
        </section>
      )}
    </div>,
    document.body,
  );
}
