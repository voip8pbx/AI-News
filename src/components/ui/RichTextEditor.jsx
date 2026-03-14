import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Quote,
  Undo,
  Redo
} from 'lucide-react';

const MenuBar = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-surface/50 sticky top-0 z-10 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('bold') ? 'bg-accent/10 text-accent shadow-sm' : 'text-muted hover:text-ink'}`}
        title="Bold"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('italic') ? 'bg-accent/10 text-accent shadow-sm' : 'text-muted hover:text-ink'}`}
        title="Italic"
      >
        <Italic size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('underline') ? 'bg-accent/10 text-accent shadow-sm' : 'text-muted hover:text-ink'}`}
        title="Underline"
      >
        <UnderlineIcon size={16} />
      </button>
      <div className="w-px h-6 bg-border mx-1 my-auto" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent/20 text-accent' : 'text-muted'}`}
        title="Heading 1"
      >
        <Heading1 size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent/20 text-accent' : 'text-muted'}`}
        title="Heading 2"
      >
        <Heading2 size={16} />
      </button>
      <div className="w-px h-6 bg-border mx-1 my-auto" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('bulletList') ? 'bg-accent/20 text-accent' : 'text-muted'}`}
        title="Bullet List"
      >
        <List size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('orderedList') ? 'bg-accent/20 text-accent' : 'text-muted'}`}
        title="Ordered List"
      >
        <ListOrdered size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded-xl transition-all hover:bg-surface active:scale-90 ${editor.isActive('blockquote') ? 'bg-accent/20 text-accent' : 'text-muted'}`}
        title="Blockquote"
      >
        <Quote size={16} />
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface transition-all disabled:opacity-30"
        title="Undo"
      >
        <Undo size={16} />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface transition-all disabled:opacity-30"
        title="Redo"
      >
        <Redo size={16} />
      </button>
    </div>
  );
};

const RichTextEditor = ({ content, onChange, className = "" }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Heading.configure({
        levels: [1, 2, 3],
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-6 text-ink font-sans leading-relaxed',
      },
    },
  });

  // Update editor content when content prop changes (e.g. initial load)
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className={`border border-border rounded-2xl overflow-hidden bg-surface shadow-inner group transition-all focus-within:border-accent ${className}`}>
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="rich-text-editor-content" />
      <style>{`
        .rich-text-editor-content .ProseMirror {
          min-height: 200px;
          outline: none;
        }
        .rich-text-editor-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
