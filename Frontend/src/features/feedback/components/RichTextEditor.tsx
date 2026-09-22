import React from "react";
import ReactQuill from "react-quill";
import { Mic, Sparkles } from "lucide-react";
import "react-quill/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  showAIGenerate?: boolean;
  onAIGenerate?: () => void;
  error?: string;
  helperText?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Type Here",
  disabled = false,
  label = "Points to work on for the next lesson",
  showAIGenerate = false,
  onAIGenerate,
  error,
  helperText = "Give the student clear, actionable guidance for what to practice next.",
}) => {
  const quillModules = {
    toolbar: [
      ["bold", "italic"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      ["link"],
    ],
  };

  return (
    <div className="dsp-feedback-editor-field">
      <div className="dsp-feedback-editor-field__heading">
        <div>
          <label className="dsp-feedback-field__label">{label}</label>
          <p className="dsp-feedback-field__helper">{helperText}</p>
        </div>
        {showAIGenerate && !disabled && (
          <div className="dsp-feedback-editor-tools" aria-label="Feedback assistance">
            <button
              type="button"
              onClick={onAIGenerate}
              disabled={!onAIGenerate}
              className="dsp-feedback-tool-button dsp-feedback-tool-button--ai"
              title={!onAIGenerate ? "AI suggestions are not available yet" : undefined}
            >
              <Sparkles size={15} aria-hidden="true" />
              Generate suggestion
            </button>
            <button
              type="button"
              className="dsp-feedback-tool-button dsp-feedback-tool-button--voice"
              disabled
              aria-label="Dictate feedback (not available yet)"
              title="Voice input is not available yet"
            >
              <Mic size={15} aria-hidden="true" />
              <span>Dictate</span>
            </button>
          </div>
        )}
      </div>

      <div className={`dsp-feedback-editor ${error ? "is-invalid" : ""}`}>
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={quillModules}
          placeholder={placeholder}
          className="dsp-feedback-editor__quill"
          readOnly={disabled}
        />
      </div>
      {error && <p className="dsp-feedback-field__error" role="alert">{error}</p>}
    </div>
  );
};
