import { useMemo, useState } from "react";
import { Box, Button, Chip, Divider, Drawer, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import { Bot, RotateCcw, Send, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

type AssistantRole = "Student" | "Instructor" | "Admin";
type AssistantMessage = { role: "user" | "assistant"; content: string };

const suggestions: Record<AssistantRole, string[]> = {
  Student: ["What's my next lesson?", "Do I have any payments needing action?", "Summarize my upcoming bookings."],
  Instructor: ["Summarize tomorrow's lessons.", "Do I have pending payouts?", "Which students need attention?"],
  Admin: ["Show refunds needing attention.", "Summarize operational issues.", "Are there financial operations in manual review?"],
};

function backendBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:4000";
  return String(configured).replace(/\/graphql\/?$/, "").replace(/\/$/, "");
}

export default function AssistantPanel({ pageContext }: { pageContext: string }) {
  const { user, token } = useAuth();
  const role = user?.role as AssistantRole | undefined;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: "assistant", content: "Ask me about your authorized DSP Marketplace information." },
  ]);

  const roleSuggestions = useMemo(() => (role ? suggestions[role] : []), [role]);
  if (!role || !["Student", "Instructor", "Admin"].includes(role)) return null;

  const sendMessage = async (preset?: string) => {
    const content = (preset ?? input).trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    try {
      const response = await fetch(`${backendBaseUrl()}/api/v1/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ message: content, history: nextMessages.slice(-8, -1), pageContext }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "The assistant is temporarily unavailable.");
      setMessages((current) => [...current, { role: "assistant", content: body.answer || "I could not find an answer." }]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The assistant is temporarily unavailable.");
    } finally {
      setSending(false);
    }
  };

  const clearConversation = () => {
    setMessages([{ role: "assistant", content: "Ask me about your authorized DSP Marketplace information." }]);
    setError(null);
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) void sendMessage(lastUserMessage.content);
  };

  return (
    <>
      <IconButton aria-label="Open DSP assistant" onClick={() => setOpen(true)} sx={{ position: "fixed", right: 24, bottom: 24, zIndex: 1200, bgcolor: "primary.main", color: "white", boxShadow: 4, "&:hover": { bgcolor: "primary.dark" } }}>
        <Bot size={22} />
      </IconButton>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: { xs: "100vw", sm: 390 }, maxWidth: "100vw", height: "100%", display: "flex", flexDirection: "column" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
            <Box><Typography variant="h6" fontWeight={700}>DSP Assistant</Typography><Typography variant="caption" color="text.secondary">Read-only help for your dashboard</Typography></Box>
            <Stack direction="row"><IconButton aria-label="Clear conversation" onClick={clearConversation}><RotateCcw size={18} /></IconButton><IconButton aria-label="Close assistant" onClick={() => setOpen(false)}><X size={20} /></IconButton></Stack>
          </Stack>
          <Divider />
          <Box sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Stack spacing={1.5}>
              {messages.map((message, index) => <Paper key={`${message.role}-${index}`} elevation={0} sx={{ p: 1.5, alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", bgcolor: message.role === "user" ? "primary.main" : "grey.100", color: message.role === "user" ? "white" : "text.primary", borderRadius: 2 }}><Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{message.content}</Typography></Paper>)}
              {sending && <Typography variant="body2" color="text.secondary">Checking your authorized data…</Typography>}
              {error && <Stack spacing={0.5}><Typography variant="body2" color="error">{error}</Typography><Button size="small" onClick={retryLastMessage} disabled={sending} sx={{ alignSelf: "flex-start" }}>Retry</Button></Stack>}
            </Stack>
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>{roleSuggestions.map((suggestion) => <Chip key={suggestion} label={suggestion} size="small" onClick={() => void sendMessage(suggestion)} disabled={sending} />)}</Stack>
            <Stack component="form" direction="row" spacing={1} onSubmit={(event) => { event.preventDefault(); void sendMessage(); }}>
              <TextField value={input} onChange={(event) => setInput(event.target.value)} fullWidth size="small" placeholder="Ask about your dashboard" inputProps={{ maxLength: 4000, "aria-label": "Assistant message" }} disabled={sending} />
              <Button type="submit" variant="contained" aria-label="Send message" disabled={sending || !input.trim()} sx={{ minWidth: 48 }}><Send size={18} /></Button>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
