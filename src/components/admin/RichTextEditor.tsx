"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Youtube } from "@tiptap/extension-youtube";
import { Node, Extension } from "@tiptap/core";
import { createAdminClient as createClient } from "@/utils/supabase/admin-client";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
  Image as ImageIcon,
  Undo,
  Redo,
  Loader2,
  X,
  Upload,
  Globe,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Baseline,
  Table as TableIcon,
  Video as VideoIcon,
  Plus
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
      },
    };
  },
});

// Custom Video Extension Node
const Video = Node.create({
  name: "video",
  group: "block",
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      {
        controls: true,
        class: "w-full max-w-md mx-auto rounded-xl shadow-xs my-4 block",
        ...HTMLAttributes,
      },
    ];
  },
});

const CustomImage = Image.extend({
  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: "50%",
        parseHTML: element => element.style.width || element.getAttribute("width") || "50%",
        renderHTML: attributes => {
          return { width: attributes.width };
        },
      },
      align: {
        default: "center",
        parseHTML: element => {
          if (element.style.float === "left") return "left";
          if (element.style.float === "right") return "right";
          if (element.style.display === "block" && element.style.marginLeft === "auto") return "center";
          return "center";
        },
        renderHTML: attributes => {
          return { align: attributes.align };
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const { width, align, src, alt, title } = HTMLAttributes;
    
    let style = "max-width: 100%; height: auto;";
    if (width) {
      style += ` width: ${width};`;
    }
    
    if (align === "left") {
      style += " float: left; margin-right: 1.5rem; margin-bottom: 1.5rem; display: inline-block;";
    } else if (align === "right") {
      style += " float: right; margin-left: 1.5rem; margin-bottom: 1.5rem; display: inline-block;";
    } else {
      style += " display: block; margin-left: auto; margin-right: auto; clear: both; margin-top: 1rem; margin-bottom: 1rem;";
    }

    return [
      "img",
      {
        src,
        alt,
        title,
        style,
        class: "rounded-xl",
      },
    ];
  },
});

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  label?: string;
}

export default function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageTab, setImageTab] = useState<"upload" | "url">("upload");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table & Video states
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTab, setVideoTab] = useState<"upload" | "youtube" | "url">("upload");
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-zinc-950 underline font-medium cursor-pointer",
        },
      }),
      CustomImage,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({
        HTMLAttributes: {
          class: "w-full max-w-md mx-auto rounded-xl shadow-xs my-4 block aspect-video",
        },
      }),
      Video,
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-zinc focus:outline-none min-h-[300px] max-w-none p-4",
      },
    },
  });

  // Sync value from props
  useEffect(() => {
    if (!editor) return;
    if (value === editor.getHTML()) return;

    const { from, to } = editor.state.selection;
    editor.commands.setContent(value || "");
    try {
      editor.commands.setTextSelection({ from, to });
    } catch (e) {
      // Ignore if range is invalid
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        <div className="h-[350px] w-full bg-zinc-50 animate-pulse rounded-xl border border-zinc-200" />
      </div>
    );
  }

  // Formatting actions
  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleH1 = () => editor.chain().focus().toggleHeading({ level: 1 }).run();
  const toggleH2 = () => editor.chain().focus().toggleHeading({ level: 2 }).run();
  const toggleH3 = () => editor.chain().focus().toggleHeading({ level: 3 }).run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  
  // Link actions
  const openLinkModal = () => {
    const previousUrl = editor.getAttributes("link").href;
    setLinkUrl(previousUrl || "");
    setShowLinkModal(true);
  };

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setShowLinkModal(false);
    setLinkUrl("");
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  // Image actions
  const openImageModal = () => {
    setImageUrl("");
    setImageTab("upload");
    setShowImageModal(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const fileName = `${Date.now()}-${file.name}`;
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      if (publicUrl) {
        editor.chain().focus().setImage({ src: publicUrl }).run();
        toast.success("Image uploaded successfully!");
        setShowImageModal(false);
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleImageUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await handleImageUpload(file);
    } else {
      toast.error("Please drop an image file.");
    }
  };

  const handleImageUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setShowImageModal(false);
      setImageUrl("");
    }
  };

  // Video actions
  const openVideoModal = () => {
    setVideoUrl("");
    setVideoTab("upload");
    setShowVideoModal(true);
  };

  const handleVideoUpload = async (file: File) => {
    try {
      setIsVideoUploading(true);
      const fileName = `${Date.now()}-${file.name}`;
      const supabase = createClient();

      const { data, error } = await supabase.storage
        .from("product-videos")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("product-videos")
        .getPublicUrl(fileName);

      if (publicUrl) {
        editor.chain().focus().insertContent({ type: 'video', attrs: { src: publicUrl } }).run();
        toast.success("Video uploaded successfully!");
        setShowVideoModal(false);
      }
    } catch (error: any) {
      console.error("Error uploading video, trying fallback bucket:", error);
      try {
        const supabase = createClient();
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error: fbError } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);
        if (fbError) throw fbError;
        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        if (publicUrl) {
          editor.chain().focus().insertContent({ type: 'video', attrs: { src: publicUrl } }).run();
          toast.success("Video uploaded successfully!");
          setShowVideoModal(false);
          return;
        }
      } catch (fbErr: any) {
        console.error("Fallback upload error:", fbErr);
        toast.error(error.message || "Failed to upload video.");
      }
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleVideoUpload(file);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(true);
  };

  const handleVideoDragLeave = () => {
    setIsVideoDragging(false);
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsVideoDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("video/")) {
      await handleVideoUpload(file);
    } else {
      toast.error("Please drop a video file.");
    }
  };

  const handleVideoUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (videoUrl) {
      if (videoTab === "youtube") {
        editor.commands.setYoutubeVideo({ src: videoUrl });
      } else {
        editor.chain().focus().insertContent({ type: 'video', attrs: { src: videoUrl } }).run();
      }
      setShowVideoModal(false);
      setVideoUrl("");
    }
  };

  // Reusable button utility helper
  const ToolbarButton = ({
    onClick,
    active,
    title,
    icon: Icon,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    icon: any;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-2 rounded-lg transition-all flex items-center justify-center border",
        active
          ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
          : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-950 hover:border-zinc-300"
      )}
    >
      <Icon className="w-4.5 h-4.5" />
    </button>
  );

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white focus-within:ring-2 focus-within:ring-zinc-950 focus-within:border-transparent transition-all">
        {/* Editor Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-zinc-50/50 border-b border-zinc-200">
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={toggleBold} active={editor.isActive("bold")} title="Bold" icon={Bold} />
            <ToolbarButton onClick={toggleItalic} active={editor.isActive("italic")} title="Italic" icon={Italic} />
            <ToolbarButton onClick={toggleUnderline} active={editor.isActive("underline")} title="Underline" icon={UnderlineIcon} />
            <ToolbarButton onClick={toggleStrike} active={editor.isActive("strike")} title="Strikethrough" icon={Strikethrough} />
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton onClick={toggleH1} active={editor.isActive("heading", { level: 1 })} title="Heading 1" icon={Heading1} />
            <ToolbarButton onClick={toggleH2} active={editor.isActive("heading", { level: 2 })} title="Heading 2" icon={Heading2} />
            <ToolbarButton onClick={toggleH3} active={editor.isActive("heading", { level: 3 })} title="Heading 3" icon={Heading3} />
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          {/* Font Size Dropdown */}
          <div className="flex items-center gap-1">
            <select
              className="text-[11px] font-bold border border-zinc-200 rounded-lg bg-white px-2 py-1.5 focus:outline-none hover:bg-zinc-50 focus:ring-2 focus:ring-zinc-950 text-zinc-700 w-[60px]"
              onChange={(e) => {
                const size = e.target.value;
                if (size) {
                  editor.chain().focus().setFontSize(size).run();
                } else {
                  editor.chain().focus().unsetFontSize().run();
                }
              }}
              value={editor.getAttributes("textStyle").fontSize || ""}
            >
              <option value="">A</option>
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px</option>
              <option value="30px">30px</option>
              <option value="36px">36px</option>
            </select>
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton onClick={toggleBulletList} active={editor.isActive("bulletList")} title="Bullet List" icon={List} />
            <ToolbarButton onClick={toggleOrderedList} active={editor.isActive("orderedList")} title="Ordered List" icon={ListOrdered} />
            <ToolbarButton onClick={toggleBlockquote} active={editor.isActive("blockquote")} title="Blockquote" icon={Quote} />
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          {/* Text Alignment */}
          <div className="flex items-center gap-1">
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left" icon={AlignLeft} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center" icon={AlignCenter} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right" icon={AlignRight} />
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Align Justify" icon={AlignJustify} />
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          {/* Color & Highlight */}
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1">
            <div className="flex items-center gap-1 border-r border-zinc-200 pr-1.5">
              <Baseline className="w-4 h-4 text-zinc-500" />
              <input
                type="color"
                value={editor.getAttributes("textStyle").color || "#000000"}
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer rounded-xs"
                title="Text Color"
              />
              {editor.getAttributes("textStyle").color && (
                <button
                  type="button"
                  onClick={() => editor.chain().focus().unsetColor().run()}
                  className="text-zinc-400 hover:text-zinc-900 transition-colors p-0.5"
                  title="Reset Color"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Highlighter className="w-4 h-4 text-zinc-500" />
              <input
                type="color"
                value={editor.getAttributes("highlight").color || "#ffff00"}
                onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
                className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer rounded-xs"
                title="Highlight Color"
              />
              {editor.isActive("highlight") && (
                <button
                  type="button"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  className="text-zinc-400 hover:text-zinc-900 transition-colors p-0.5"
                  title="Remove Highlight"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1" />

          <div className="flex items-center gap-1">
            <ToolbarButton onClick={openLinkModal} active={editor.isActive("link")} title="Link" icon={Link2} />
            {editor.isActive("link") && (
              <ToolbarButton onClick={removeLink} title="Remove Link" icon={Unlink} />
            )}
            <ToolbarButton onClick={openImageModal} title="Image" icon={ImageIcon} />

            {/* Table Dropdown Menu */}
            <div className="relative">
              <ToolbarButton
                onClick={() => setShowTableMenu(!showTableMenu)}
                active={editor.isActive("table")}
                title="Table Options"
                icon={TableIcon}
              />
              {showTableMenu && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowTableMenu(false)} />
                  <div className="absolute left-0 z-30 mt-1 w-52 bg-white border border-zinc-200 shadow-lg rounded-lg py-1.5 text-[11px] font-medium text-zinc-755">
                    {!editor.isActive("table") ? (
                      <button
                        type="button"
                        onClick={() => {
                          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                          setShowTableMenu(false);
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50 font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Insert 3x3 Table
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().addColumnBefore().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Add Column Before
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().addColumnAfter().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Add Column After
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().deleteColumn().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 text-red-650"
                        >
                          Delete Column
                        </button>
                        <div className="h-px bg-zinc-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().addRowBefore().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Add Row Before
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().addRowAfter().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Add Row After
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().deleteRow().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 text-red-650"
                        >
                          Delete Row
                        </button>
                        <div className="h-px bg-zinc-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().mergeCells().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Merge Cells
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().splitCell().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-zinc-50"
                        >
                          Split Cell
                        </button>
                        <div className="h-px bg-zinc-100 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            editor.chain().focus().deleteTable().run();
                            setShowTableMenu(false);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-red-50 text-red-650 font-semibold"
                        >
                          Delete Table
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <ToolbarButton onClick={openVideoModal} title="Add Video" icon={VideoIcon} />
          </div>

          <div className="w-px h-6 bg-zinc-200 self-center mx-1 ml-auto" />

          <div className="flex items-center gap-1">
            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" icon={Undo} />
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" icon={Redo} />
          </div>
        </div>

        {/* Editor Area */}
        <div className="custom-scrollbar overflow-y-auto max-h-[500px] relative">
          {editor && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 100 }}
              shouldShow={({ editor }: any) => editor.isActive("image")}
            >
              <div className="flex items-center gap-1 bg-white border border-zinc-200 shadow-md rounded-xl p-1.5 text-xs font-semibold text-zinc-700">
                {/* Alignment Options */}
                <button
                  type="button"
                  onClick={() => {
                    const align = editor.getAttributes("image").align === "left" ? "center" : "left";
                    editor.chain().focus().updateAttributes("image", { align }).run();
                  }}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-zinc-50 transition-all",
                    editor.getAttributes("image").align === "left" && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Align Left"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().updateAttributes("image", { align: "center" }).run();
                  }}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-zinc-50 transition-all",
                    (editor.getAttributes("image").align === "center" || !editor.getAttributes("image").align) && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Align Center"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const align = editor.getAttributes("image").align === "right" ? "center" : "right";
                    editor.chain().focus().updateAttributes("image", { align }).run();
                  }}
                  className={cn(
                    "p-1.5 rounded-lg hover:bg-zinc-50 transition-all",
                    editor.getAttributes("image").align === "right" && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Align Right"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-zinc-200 mx-1" />

                {/* Size Presets */}
                <button
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes("image", { width: "25%" }).run()}
                  className={cn(
                    "px-2 py-1 rounded-lg hover:bg-zinc-50 transition-all text-[10px]",
                    editor.getAttributes("image").width === "25%" && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Small (25%)"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes("image", { width: "50%" }).run()}
                  className={cn(
                    "px-2 py-1 rounded-lg hover:bg-zinc-50 transition-all text-[10px]",
                    (editor.getAttributes("image").width === "50%" || editor.getAttributes("image").width === "448px") && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Medium (50%)"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes("image", { width: "75%" }).run()}
                  className={cn(
                    "px-2 py-1 rounded-lg hover:bg-zinc-50 transition-all text-[10px]",
                    editor.getAttributes("image").width === "75%" && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Large (75%)"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().updateAttributes("image", { width: "100%" }).run()}
                  className={cn(
                    "px-2 py-1 rounded-lg hover:bg-zinc-50 transition-all text-[10px]",
                    editor.getAttributes("image").width === "100%" && "bg-zinc-950 text-white hover:bg-zinc-950"
                  )}
                  title="Full Width (100%)"
                >
                  100%
                </button>

                <div className="w-px h-4 bg-zinc-200 mx-1" />

                {/* Delete Image */}
                <button
                  type="button"
                  onClick={() => editor.chain().focus().deleteSelection().run()}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-650 transition-all"
                  title="Remove Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Link Popover/Modal overlay */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-zinc-900">Insert Link</h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Link URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent transition-all"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-sm transition-colors"
                >
                  Insert Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Modal overlay */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-zinc-900">Add Image</h3>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-200 mb-4">
              <button
                type="button"
                className={cn(
                  "flex-1 pb-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5",
                  imageTab === "upload"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setImageTab("upload")}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 pb-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5",
                  imageTab === "url"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setImageTab("url")}
              >
                <Globe className="w-4 h-4" />
                Image URL
              </button>
            </div>

            {imageTab === "upload" ? (
              <div className="space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                    isDragging
                      ? "border-zinc-950 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {isUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                      <p className="text-sm font-medium text-zinc-600">Uploading your image...</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-zinc-50 rounded-full border border-zinc-100 text-zinc-500">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Drag & drop your file here</p>
                        <p className="text-xs text-zinc-400 mt-1">or click to browse from computer</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImageUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/image.png"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent transition-all"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowImageModal(false)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-sm transition-colors"
                  >
                    Add Image
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Video Modal overlay */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-zinc-900">Add Video</h3>
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-200 mb-4">
              <button
                type="button"
                className={cn(
                  "flex-1 pb-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5",
                  videoTab === "upload"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setVideoTab("upload")}
              >
                <Upload className="w-4 h-4" />
                Upload File
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 pb-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5",
                  videoTab === "youtube"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setVideoTab("youtube")}
              >
                <Globe className="w-4 h-4" />
                YouTube Embed
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 pb-2 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1.5",
                  videoTab === "url"
                    ? "border-zinc-950 text-zinc-950"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                )}
                onClick={() => setVideoTab("url")}
              >
                <Globe className="w-4 h-4" />
                Video URL
              </button>
            </div>

            {videoTab === "upload" ? (
              <div className="space-y-4">
                <div
                  onDragOver={handleVideoDragOver}
                  onDragLeave={handleVideoDragLeave}
                  onDrop={handleVideoDrop}
                  className={cn(
                    "border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                    isVideoDragging
                      ? "border-zinc-950 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-300 bg-white"
                  )}
                  onClick={() => videoFileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={videoFileInputRef}
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="hidden"
                  />
                  {isVideoUploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                      <p className="text-sm font-medium text-zinc-600">Uploading your video...</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-zinc-50 rounded-full border border-zinc-100 text-zinc-500">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">Drag & drop your video here</p>
                        <p className="text-xs text-zinc-400 mt-1">or click to browse from computer</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVideoUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    {videoTab === "youtube" ? "YouTube Video URL" : "Direct Video URL"}
                  </label>
                  <input
                    type="url"
                    placeholder={videoTab === "youtube" ? "https://www.youtube.com/watch?v=..." : "https://example.com/video.mp4"}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent transition-all"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(false)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-sm transition-colors"
                  >
                    {videoTab === "youtube" ? "Embed YouTube" : "Add Video"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
