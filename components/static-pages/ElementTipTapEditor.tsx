'use client';

import React, { useCallback, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Underline as UnderlineIcon, Link as LinkIcon, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';

interface ElementTipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  inline?: boolean;
}

const ElementTipTapEditor: React.FC<ElementTipTapEditorProps> = ({
  content,
  onChange,
  placeholder = '내용을 입력하세요...',
  inline = false
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
        class: inline
          ? 'prose prose-sm focus:outline-none p-2'
          : 'prose prose-sm focus:outline-none min-h-[100px] p-3'
      }
    }
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

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
    <div className="border rounded-md overflow-hidden bg-white">
      {/* 간소화된 툴바 */}
      <div className="border-b bg-gray-50 p-1.5 flex flex-wrap gap-0.5">
        <div className="flex gap-0.5 items-center pr-2 border-r">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="제목 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="제목 2"
          >
            <Heading2 size={16} />
          </button>
        </div>

        <div className="flex gap-0.5 items-center px-2 border-r">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('bold') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="굵게"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('italic') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="기울임"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('underline') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="밑줄"
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            onClick={setLink}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('link') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="링크"
          >
            <LinkIcon size={16} />
          </button>
        </div>

        <div className="flex gap-0.5 items-center px-2">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('bulletList') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="목록"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1 rounded hover:bg-gray-200 ${
              editor.isActive('orderedList') ? 'bg-gray-200' : ''
            }`}
            type="button"
            title="번호 목록"
          >
            <ListOrdered size={16} />
          </button>
        </div>
      </div>

      {/* 에디터 */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default ElementTipTapEditor;
