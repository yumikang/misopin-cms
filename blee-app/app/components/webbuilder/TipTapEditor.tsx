'use client';

import React, { useCallback } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon,
         AlignLeft, AlignCenter, AlignRight, Heading1, Heading2,
         List, ListOrdered, Image as ImageIcon, Undo, Redo } from 'lucide-react';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  className = ''
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 underline'
        }
      }),
      Image.configure({
        inline: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[200px] p-4'
      }
    }
  });

  const addImage = useCallback(() => {
    const url = window.prompt('이미지 URL을 입력하세요');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('URL을 입력하세요', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '' && editor) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* 툴바 */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        <div className="flex gap-1 items-center px-2 border-r">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <Heading1 size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <Heading2 size={18} />
          </button>
        </div>

        <div className="flex gap-1 items-center px-2 border-r">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <Bold size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <Italic size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('underline') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <UnderlineIcon size={18} />
          </button>
          <button
            onClick={setLink}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('link') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <LinkIcon size={18} />
          </button>
        </div>

        <div className="flex gap-1 items-center px-2 border-r">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <AlignLeft size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <AlignCenter size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <AlignRight size={18} />
          </button>
        </div>

        <div className="flex gap-1 items-center px-2 border-r">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
            type="button"
          >
            <ListOrdered size={18} />
          </button>
        </div>

        <div className="flex gap-1 items-center px-2 border-r">
          <button
            onClick={addImage}
            className="p-1.5 rounded hover:bg-gray-200"
            type="button"
          >
            <ImageIcon size={18} />
          </button>
        </div>

        <div className="flex gap-1 items-center px-2">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
            type="button"
          >
            <Undo size={18} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50"
            type="button"
          >
            <Redo size={18} />
          </button>
        </div>
      </div>

      {/* 버블 메뉴 */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        className="bg-black text-white rounded px-2 py-1 flex gap-1"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded hover:bg-gray-700 ${
            editor.isActive('bold') ? 'bg-gray-700' : ''
          }`}
          type="button"
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded hover:bg-gray-700 ${
            editor.isActive('italic') ? 'bg-gray-700' : ''
          }`}
          type="button"
        >
          <Italic size={14} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1 rounded hover:bg-gray-700 ${
            editor.isActive('underline') ? 'bg-gray-700' : ''
          }`}
          type="button"
        >
          <UnderlineIcon size={14} />
        </button>
      </BubbleMenu>

      {/* 에디터 */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapEditor;