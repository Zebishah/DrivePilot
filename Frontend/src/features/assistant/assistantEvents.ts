export function openAssistant(message = "") {
  window.dispatchEvent(
    new CustomEvent("dsp:assistant-open", { detail: message }),
  );
}
