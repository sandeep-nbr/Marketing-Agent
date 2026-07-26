import React, { useEffect, useRef, useState } from "react";
import MessageBubble, { ToolChip } from "./MessageBubble.jsx";
import QuickActions from "./QuickActions.jsx";
import { streamChat } from "../lib/api.js";
import {
  createRecognizer,
  speak,
  stopSpeaking,
  speechRecognitionSupported,
  speechSynthesisSupported,
} from "../lib/speech.js";

const TASK_TOOLS = new Set(["add_task", "complete_task", "delete_task"]);

export default function ChatPanel({ onTaskMutation }) {
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceReplyOn, setVoiceReplyOn] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const recognizerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, activeTool]);

  useEffect(() => {
    if (!speechRecognitionSupported) return;
    recognizerRef.current = createRecognizer({
      onResult: (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal) {
          setListening(false);
          send(transcript);
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMic() {
    if (!recognizerRef.current) return;
    if (listening) {
      recognizerRef.current.stop();
      setListening(false);
    } else {
      stopSpeaking();
      setSpeaking(false);
      setInput("");
      recognizerRef.current.start();
      setListening(true);
    }
  }

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || isStreaming) return;
    setInput("");
    stopSpeaking();
    setSpeaking(false);

    const nextMessages = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setIsStreaming(true);
    setStreamingText("");
    setActiveTool(null);

    let accumulated = "";

    await streamChat(nextMessages, {
      onText: (delta) => {
        accumulated += delta;
        setStreamingText(accumulated);
      },
      onToolStart: (name) => setActiveTool(name),
      onToolEnd: (name) => {
        setActiveTool(null);
        if (TASK_TOOLS.has(name)) onTaskMutation?.();
      },
      onDone: () => {
        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        setStreamingText("");
        setIsStreaming(false);
        setActiveTool(null);
        if (voiceReplyOn && accumulated) {
          setSpeaking(true);
          speak(accumulated, { onEnd: () => setSpeaking(false) });
        }
      },
      onError: (message) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${message || "Something went wrong."}` },
        ]);
        setStreamingText("");
        setIsStreaming(false);
        setActiveTool(null);
      },
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function autoGrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  return (
    <div className="chat-column">
      <QuickActions onPick={(prompt) => send(prompt)} />

      <div className="messages">
        {messages.length === 0 && !isStreaming && (
          <div className="empty-state">
            <div className="brand-orb" />
            <h2>I'm Aria — your marketing agent</h2>
            <p>
              Ask me to draft campaign copy, plan content, research competitors, or manage your
              marketing to-dos. Type a command or tap the mic and just talk to me.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}

        {isStreaming && (
          <>
            <MessageBubble role="assistant" content={streamingText} streaming />
            {activeTool && <ToolChip name={activeTool} />}
          </>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="composer">
        <button
          type="button"
          className={`icon-btn ${listening ? "mic-on listening" : ""}`}
          onClick={toggleMic}
          disabled={!speechRecognitionSupported}
          title={
            speechRecognitionSupported
              ? listening
                ? "Stop listening"
                : "Speak a command"
              : "Voice input not supported in this browser"
          }
        >
          {listening ? "●" : "🎤"}
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoGrow();
          }}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening…" : "Ask Aria to draft, plan, research, or track something…"}
          rows={1}
        />

        <button
          type="button"
          className={`icon-btn ${voiceReplyOn ? "active" : ""} ${speaking ? "listening" : ""}`}
          onClick={() => {
            setVoiceReplyOn((v) => !v);
            if (voiceReplyOn) {
              stopSpeaking();
              setSpeaking(false);
            }
          }}
          disabled={!speechSynthesisSupported}
          title={voiceReplyOn ? "Voice replies on — click to mute" : "Voice replies off — click to enable"}
        >
          {voiceReplyOn ? "🔊" : "🔇"}
        </button>

        <button
          type="button"
          className="icon-btn send-btn"
          onClick={() => send()}
          disabled={!input.trim() || isStreaming}
          title="Send"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
