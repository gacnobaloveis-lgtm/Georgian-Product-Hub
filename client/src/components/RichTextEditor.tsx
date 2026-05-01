import { useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  testId?: string;
}

const FONT_SIZE_WHITELIST = ["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "40px", "48px"];

let quillRegistered = false;
function ensureQuillRegistered() {
  if (quillRegistered) return;
  const Quill = (ReactQuill as unknown as { Quill: any }).Quill;
  if (!Quill) return;
  const SizeStyle = Quill.import("attributors/style/size");
  SizeStyle.whitelist = FONT_SIZE_WHITELIST;
  Quill.register(SizeStyle, true);
  quillRegistered = true;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 200,
  testId,
}: RichTextEditorProps) {
  ensureQuillRegistered();
  const quillRef = useRef<ReactQuill | null>(null);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ size: FONT_SIZE_WHITELIST }],
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "blockquote"],
        ["clean"],
      ],
      clipboard: { matchVisual: false },
    }),
    []
  );

  const formats = [
    "size",
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "align",
    "list",
    "link",
    "blockquote",
  ];

  return (
    <div className="rich-text-editor" data-testid={testId}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{ minHeight }}
      />
      <style>{`
        .rich-text-editor .ql-container {
          min-height: ${minHeight}px;
          font-size: 14px;
          font-family: inherit;
          background: white;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-toolbar {
          background: white;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        .rich-text-editor .ql-editor {
          min-height: ${minHeight}px;
          color: #111827;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-label::before,
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-value);
        }
      `}</style>
    </div>
  );
}
