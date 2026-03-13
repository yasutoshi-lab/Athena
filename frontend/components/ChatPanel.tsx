"use client";
import { useRef, useEffect, useState } from "react";
import {
  useSession,
  type ChatMessage,
  type HypothesisData,
  type ParsedQuestionData,
  type EvidenceSummaryData,
  type ReferenceData,
  type SearchActivityItem,
} from "@/hooks/useSession";
import { useAuth } from "@/hooks/useAuth";

interface ChatPanelProps {
  onSend: (query: string) => void;
  onStop: () => void;
  onClear: () => void;
  width?: number;
}

export default function ChatPanel({ onSend, onStop, onClear, width }: ChatPanelProps) {
  const messages = useSession((s) => s.messages);
  const status = useSession((s) => s.status);
  const thinking = useSession((s) => s.thinking);
  const searchActivities = useSession((s) => s.searchActivities);
  const user = useAuth((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, searchActivities, thinking]);

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
        width: width ?? 380,
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
            background: status === "running" ? "var(--accent)" : "var(--text-2)",
            opacity: 0.6,
            animation: status === "running" ? "pulse 1.5s infinite" : "none",
          }}
        />
        推論チャット
        {status === "running" && (
          <span style={{ marginLeft: "auto", fontSize: 9.5, opacity: 0.6 }}>処理中…</span>
        )}
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
        {searchActivities.length > 0 && <SearchActivityFeed activities={searchActivities} />}
        {thinking && <ThinkingIndicator icon={thinking.icon} label={thinking.label} />}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border)" }}>
        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {status === "running" && (
            <button
              onClick={onStop}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                background: "rgba(212,87,87,0.12)",
                border: "1px solid rgba(212,87,87,0.3)",
                color: "#d45757",
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              <span style={{ fontSize: 8 }}>■</span>
              停止
            </button>
          )}
          {messages.length > 0 && status !== "running" && (
            <button
              onClick={onClear}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 6,
                background: "var(--bg-2)",
                border: "1px solid var(--border-md)",
                color: "var(--text-2)",
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.04em",
                cursor: "pointer",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
              }}
            >
              クリア
            </button>
          )}
        </div>

        {/* Input row */}
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
            whiteSpace: "pre-wrap",
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
              flexShrink: 0,
            }}
          >
            {msg.stepTag}
          </span>
        </div>
      </div>
    );
  }

  if (msg.variant === "parsed" && msg.parsedQuestion) {
    return <ParsedQuestionCard parsed={msg.parsedQuestion} />;
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

  if (msg.variant === "evidence" && msg.evidenceSummary) {
    return <EvidenceSummaryCard summary={msg.evidenceSummary} />;
  }

  if (msg.variant === "answer") {
    return <AnswerCard content={msg.content} references={msg.references} />;
  }

  return (
    <MessageBubble
      type={msg.type}
      nickname={msg.type === "user" ? nickname : "ATHENA"}
      content={msg.content}
    />
  );
}

function ParsedQuestionCard({ parsed }: { parsed: ParsedQuestionData }) {
  const fields = [
    { label: "主語", value: parsed.subject },
    { label: "述語", value: parsed.predicate },
    { label: "スコープ", value: parsed.scope },
    { label: "時間軸", value: parsed.time_frame },
  ].filter((f) => f.value);
  const entities = parsed.entities?.filter(Boolean) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            color: "var(--accent)",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          STRUCTURED QUERY
        </div>
        {fields.map((f) => (
          <div key={f.label} style={{ fontSize: 12, color: "var(--text-1)", lineHeight: 1.8 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", marginRight: 6 }}>
              {f.label}:
            </span>
            {f.value}
          </div>
        ))}
        {entities.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {entities.map((e, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10.5,
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                  fontFamily: "var(--mono)",
                }}
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EvidenceSummaryCard({ summary }: { summary: EvidenceSummaryData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>
          証拠収集完了
        </div>
        <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-1)" }}>
            計 <strong style={{ color: "var(--text-0)" }}>{summary.total}</strong>件
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#2dbe8a" }}>
            支持 {summary.support}
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#d45757" }}>
            反証 {summary.counter}
          </span>
        </div>
      </div>
    </div>
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
  const displayScore = hyp.score ?? hyp.initial_score ?? 0;
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
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        HYPOTHESIS {String(index + 1).padStart(2, "0")}
        {hyp.support_count != null && (
          <span style={{ fontSize: 9, color: "#2dbe8a" }}>
            +{hyp.support_count}
          </span>
        )}
        {hyp.counter_count != null && hyp.counter_count > 0 && (
          <span style={{ fontSize: 9, color: "#d45757" }}>
            -{hyp.counter_count}
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-0)", lineHeight: 1.6 }}>
        {hyp.text}
      </div>
      {hyp.ranking_reasoning && (
        <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.5, marginTop: 4 }}>
          {hyp.ranking_reasoning}
        </div>
      )}
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
              width: `${displayScore * 100}%`,
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
          {displayScore.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

function AnswerCard({ content, references }: { content: string; references?: ReferenceData[] }) {
  const [copied, setCopied] = useState(false);

  // Split content: remove trailing reference list if present (already in structured references)
  const parts = content.split(/\n---\n参照元[:：]?\n/);
  const mainText = parts[0].trimEnd();

  const handleCopy = () => {
    // Build copyable text with references
    let text = mainText;
    if (references && references.length > 0) {
      text += "\n\n---\n参照元:\n";
      references.forEach((ref, i) => {
        text += `[${i + 1}] ${ref.title}${ref.url ? ` - ${ref.url}` : ""}\n`;
      });
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, animation: "fadeUp 0.25s ease" }}>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          color: "var(--text-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        ATHENA
        <button
          onClick={handleCopy}
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            color: copied ? "#2dbe8a" : "var(--text-2)",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {copied ? "✓ コピー済" : "📋 コピー"}
        </button>
      </div>
      <div
        style={{
          padding: "12px 14px",
          borderRadius: 10,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          fontSize: 13.5,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {mainText}
        {references && references.length > 0 && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--accent)",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              REFERENCES
            </div>
            {references.map((ref, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "var(--text-1)",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    color: "var(--accent)",
                    marginRight: 5,
                  }}
                >
                  [{i + 1}]
                </span>
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--text-1)",
                      textDecoration: "underline",
                      textDecorationColor: "var(--border-md)",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {ref.title || ref.url}
                  </a>
                ) : (
                  <span>{ref.title}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchActivityFeed({ activities }: { activities: SearchActivityItem[] }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        animation: "fadeUp 0.25s ease",
      }}
    >
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>
        ATHENA — Web検索
      </div>
      <div
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 5,
          maxHeight: 200,
          overflowY: "auto",
        }}
      >
        {activities.map((item) => (
          <SearchActivityLine key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function SearchActivityLine({ item }: { item: SearchActivityItem }) {
  if (item.type === "searching") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeUp 0.2s ease" }}>
        <span style={{ fontSize: 10, opacity: 0.7, animation: "pulse 1.5s infinite" }}>🔍</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-1)" }}>
          検索中: <span style={{ color: "var(--text-0)" }}>{item.query}</span>
        </span>
      </div>
    );
  }

  if (item.type === "results" && item.results) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, animation: "fadeUp 0.2s ease" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)", marginBottom: 1 }}>
          {item.results.length}件の結果を取得
        </div>
        {item.results.map((r, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              paddingLeft: 6,
            }}
          >
            <span
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "var(--accent)",
                flexShrink: 0,
                opacity: 0.6,
              }}
            />
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                color: "var(--text-1)",
                textDecoration: "none",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 280,
              }}
              title={r.url}
            >
              {r.title || r.url}
            </a>
          </div>
        ))}
      </div>
    );
  }

  if (item.type === "analyzing") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeUp 0.2s ease" }}>
        <span style={{ fontSize: 10, opacity: 0.7, animation: "pulse 1.5s infinite" }}>⚗</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-1)" }}>
          仮説{(item.hypothesisIndex ?? 0) + 1}の証拠を分析中
          <span style={{ color: "var(--text-2)" }}> ({item.sourceCount}件)</span>
        </span>
      </div>
    );
  }

  if (item.type === "analyzed") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, animation: "fadeUp 0.2s ease" }}>
        <span style={{ fontSize: 10 }}>✓</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-1)" }}>
          仮説{(item.hypothesisIndex ?? 0) + 1}:
          <span style={{ color: "#2dbe8a", marginLeft: 4 }}>支持 {item.supportCount ?? 0}</span>
          <span style={{ color: "#d45757", marginLeft: 6 }}>反証 {item.counterCount ?? 0}</span>
        </span>
      </div>
    );
  }

  return null;
}

function ThinkingIndicator({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        animation: "fadeUp 0.25s ease",
      }}
    >
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-2)" }}>ATHENA</div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          background: "var(--bg-2)",
          border: "1px solid var(--border)",
          width: "fit-content",
        }}
      >
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11.5,
            color: "var(--text-1)",
          }}
        >
          {label}
        </span>
        <span className="thinking-dots" style={{ display: "inline-flex", gap: 3, marginLeft: 2 }}>
          <span style={dotStyle(0)} />
          <span style={dotStyle(1)} />
          <span style={dotStyle(2)} />
        </span>
      </div>
    </div>
  );
}

function dotStyle(index: number): React.CSSProperties {
  return {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "var(--accent)",
    opacity: 0.5,
    animation: `thinkingDot 1.4s ${index * 0.2}s infinite ease-in-out`,
  };
}
