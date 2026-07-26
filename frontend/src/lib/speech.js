// Thin wrappers around the browser Web Speech API (SpeechRecognition +
// SpeechSynthesis). Both are optional browser features — callers should
// check the `supported` flags before use.

const SpeechRecognitionImpl =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export const speechRecognitionSupported = !!SpeechRecognitionImpl;
export const speechSynthesisSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Creates a one-shot (or continuous) recognizer.
 * onResult(transcript, isFinal) fires for interim and final results.
 */
export function createRecognizer({ onResult, onEnd, onError }) {
  if (!speechRecognitionSupported) return null;
  const recognizer = new SpeechRecognitionImpl();
  recognizer.continuous = false;
  recognizer.interimResults = true;
  recognizer.lang = "en-US";

  recognizer.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (finalTranscript) onResult(finalTranscript.trim(), true);
    else if (interimTranscript) onResult(interimTranscript, false);
  };

  recognizer.onerror = (event) => onError?.(event.error);
  recognizer.onend = () => onEnd?.();

  return recognizer;
}

let currentUtterance = null;

/** Strips markdown syntax so spoken output doesn't read out symbols. */
function toSpeechText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " code block omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[*_#>~-]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function speak(text, { onStart, onEnd } = {}) {
  if (!speechSynthesisSupported || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(toSpeechText(text));
  utterance.rate = 1.02;
  utterance.pitch = 1.0;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (speechSynthesisSupported) window.speechSynthesis.cancel();
  currentUtterance = null;
}
