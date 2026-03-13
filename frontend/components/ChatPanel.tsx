"use client";
import { useRef, useEffect, useState } from "react";
import { useSession, type ChatMessage, type HypothesisData } from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

interface ChatPanelProps {
  onSend: (query: string) => void;
}

export default function ChatPanel({ onSend }: ChatPanelProps) {
  const messages = useSession((s) => s.messages);
  const status = useSession((s) => s.status);
  const user = useAuth((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || status === "running") return;
    onSend(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const nickname = user?.settings?.nickname || user?.username || "あなた";

  return (
    <div
      style={{
        width: 380,
        flexShrink: 0,
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          color: "var(--text-2)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--accent)",
            opacity: 0.6,
          }}
        />
        推論チャット
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <MessageBubble
            type="ai"
            nickname="ATHENA"
            content='因果的な問いを入力してください。<br /><span style="color:var(--text-1);font-size:12.5px">例：「なぜ日本のスタートアップ資金調達額がアメリカより少ないのか？」</span>'
          />
        )}
        {messages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} nickname={nickname} />
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            background: "var(--bg-2)",
            border: "1px solid var(--border-md)",
            borderRadius: 10,
            padding: "10px 12px",
            transition: "border-color 0.2s",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="因果的な問いを入力…"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              fontSize: 13.5,
              lineHeight: "1.55",
              height: 20,
              maxHeight: 120,
              color: "var(--text-0)",
              background: "transparent",
            }}
          />
          <button
            onClick={handleSend}
            disabled={status === "running"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              flexShrink: 0,
              transition: "all 0.15s",
              opacity: status === "running" ? 0.5 : 1,
            }}
          >
            ↑
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-2)",
            marginTop: 7,
            fontFamily: "var(--mono)",
          }}
        >
          Enter で送信
        </div>
      </div>
    </div>
  );
}

function MessageItem({ msg, nickname }: { msg: ChatMessage; nickname: string }) {
  if (msg.variant === "step") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 10px",
            borderRadius: 6,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-1)",
            width: "fit-content",
          }}
        >
          <span style={{ fontSize: 12 }}>{msg.stepIcon}</span>
          {msg.content}
          <span
            style={{
              fontSize: 9.5,
              background: "var(--accent-dim)",
              color: "var(--accent)",
              padding: "1px 5px",
              borderRadius: 3,
              letterSpacing: "0.04em",
            }}
          >
            {msg.stepTag}
          </span>
        </div>
      </div>
    );
  }

  if (msg.variant === "hypothesis" && msg.hypotheses) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
          {msg.hypotheses.map((h, i) => (
            <HypothesisCard key={i} hyp={h} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (msg.variant === "answer") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
        <div
          style={{
            padding: "10px 13px",
            borderRadius: 10,
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            fontSize: 13.5,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <MessageBubble
      type={msg.type}
      nickname={msg.type === "user" ? nickname : "ATHENA"}
      content={msg.content}
    />
  );
}

function MessageBubble({
  type,
  nickname,
  content,
}: {
  type: "user" | "ai";
  nickname: string;
  content: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        animation: "fadeUp 0.25s ease",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: type === "user" ? "var(--accent)" : "var(--text-2)",
          textAlign: type === "user" ? "right" : "left",
        }}
      >
        {nickname}
      </div>
      <div
        style={{
          padding: "10px 13px",
          borderRadius: 10,
          fontSize: 13.5,
          lineHeight: 1.7,
          ...(type === "user"
            ? {
                background: "var(--accent-dim)",
                border: "1px solid rgba(91,106,240,0.2)",
                alignSelf: "flex-end",
                maxWidth: "90%",
              }
            : {
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
              }),
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function HypothesisCard({ hyp, index }: { hyp: HypothesisData; index: number }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--bg-3)",
        border: "1px solid var(--border-md)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9.5,
          color: "var(--text-2)",
          marginBottom: 4,
          letterSpacing: "0.06em",
        }}
      >
        HYPOTHESIS {String(index + 1).padStart(2, "0")}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-0)", lineHeight: 1.6 }}>
        {hyp.text}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 2,
            background: "var(--border-md)",
            borderRadius: 1,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 1,
              background: "var(--accent)",
              width: `${hyp.score * 100}%`,
              transition: "width 1s ease",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            color: "var(--accent)",
          }}
        >
          {hyp.score.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
