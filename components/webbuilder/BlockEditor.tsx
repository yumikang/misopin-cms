'use client';

import React from 'react';
import { BlockType } from '@prisma/client';
import { ContentBlockData, BlockContent, CarouselBlockContent, HtmlBlockContent, FormBlockContent, MapBlockContent, GridBlockContent } from '@/app/types/webbuilder';
import TipTapEditor from './TipTapEditor';
import FormBlockEditor from './FormBlockEditor';
import MapBlockEditor from './MapBlockEditor';
import GridBlockEditor from './GridBlockEditor';
import ImageUploader from './ImageUploader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';

interface BlockEditorProps {
  block: ContentBlockData;
  onChange: (block: ContentBlockData) => void;
  onSave: () => void;
  onCancel: () => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  onChange,
  onSave,
  onCancel
}) => {
  const handleContentChange = (content: Partial<BlockContent>) => {
    onChange({
      ...block,
      content: { ...block.content, ...content } as BlockContent
    });
  };

  const renderEditor = () => {
    switch (block.type) {
      case 'TEXT':
        return <TextBlockEditor content={block.content} onChange={handleContentChange} />;
      case 'IMAGE':
        return <ImageBlockEditor content={block.content} onChange={handleContentChange} />;
      case 'BUTTON':
        return <ButtonBlockEditor content={block.content} onChange={handleContentChange} />;
      case 'VIDEO':
        return <VideoBlockEditor content={block.content} onChange={handleContentChange} />;
      case 'CAROUSEL':
        return <CarouselBlockEditor content={block.content as CarouselBlockContent} onChange={handleContentChange} />;
      case 'HTML':
        return <HtmlBlockEditor content={block.content as HtmlBlockContent} onChange={handleContentChange} />;
      case 'FORM':
        return <FormBlockEditor content={block.content as FormBlockContent} onChange={handleContentChange} />;
      case 'MAP':
        return <MapBlockEditor content={block.content as MapBlockContent} onChange={handleContentChange} />;
      case 'GRID':
        return <GridBlockEditor content={block.content as GridBlockContent} onChange={handleContentChange} />;
      default:
        return <div>이 블록 타입은 아직 지원되지 않습니다.</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">블록 이름</Label>
          <Input
            id="name"
            value={block.name}
            onChange={(e) => onChange({ ...block, name: e.target.value })}
            placeholder="블록 이름을 입력하세요"
          />
        </div>
        <div>
          <Label htmlFor="type">블록 타입</Label>
          <Select value={block.type} onValueChange={(value) => onChange({ ...block, type: value as BlockType })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEXT">텍스트</SelectItem>
              <SelectItem value="IMAGE">이미지</SelectItem>
              <SelectItem value="VIDEO">비디오</SelectItem>
              <SelectItem value="BUTTON">버튼</SelectItem>
              <SelectItem value="CAROUSEL">캐러셀</SelectItem>
              <SelectItem value="HTML">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={block.isGlobal || false}
          onCheckedChange={(checked) => onChange({ ...block, isGlobal: checked })}
        />
        <Label>전역 블록으로 설정</Label>
      </div>

      <div className="border rounded-lg p-4">
        {renderEditor()}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>취소</Button>
        <Button onClick={onSave}>저장</Button>
      </div>
    </div>
  );
};

// 텍스트 블록 에디터
const TextBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const textContent = content as { type: 'TEXT'; text: string; format?: 'html' | 'plain' | 'markdown' };

  return (
    <div className="space-y-4">
      <div>
        <Label>형식</Label>
        <Select
          value={textContent.format || 'html'}
          onValueChange={(value) => onChange({ ...textContent, format: value as 'html' | 'plain' | 'markdown' })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="plain">일반 텍스트</SelectItem>
            <SelectItem value="markdown">마크다운</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {textContent.format === 'html' ? (
        <TipTapEditor
          content={textContent.text}
          onChange={(text) => onChange({ type: 'TEXT', text, format: textContent.format })}
          placeholder="텍스트를 입력하세요..."
        />
      ) : (
        <Textarea
          value={textContent.text}
          onChange={(e) => onChange({ type: 'TEXT', text: e.target.value, format: textContent.format })}
          placeholder="텍스트를 입력하세요..."
          rows={10}
        />
      )}
    </div>
  );
};

// 이미지 블록 에디터
const ImageBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const imageContent = content as { type: 'IMAGE'; src: string; alt: string; caption?: string; link?: string };

  const handleImageChange = (imageUrl: string) => {
    onChange({ ...imageContent, src: imageUrl });
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Section */}
      <div>
        <Label>이미지 업로드 또는 URL</Label>
        <ImageUploader
          value={imageContent.src}
          onChange={handleImageChange}
          folder="webbuilder/images"
          showOptimization={true}
          className="mt-2"
        />
      </div>

      {/* Image Properties */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="alt">대체 텍스트 (필수)</Label>
          <Input
            id="alt"
            value={imageContent.alt}
            onChange={(e) => onChange({ ...imageContent, alt: e.target.value })}
            placeholder="이미지 설명 (접근성을 위해 필수)"
            required
          />
        </div>
        <div>
          <Label htmlFor="caption">캡션 (선택)</Label>
          <Input
            id="caption"
            value={imageContent.caption || ''}
            onChange={(e) => onChange({ ...imageContent, caption: e.target.value })}
            placeholder="이미지 하단에 표시될 캡션"
          />
        </div>
        <div>
          <Label htmlFor="link">링크 URL (선택)</Label>
          <Input
            id="link"
            value={imageContent.link || ''}
            onChange={(e) => onChange({ ...imageContent, link: e.target.value })}
            placeholder="클릭 시 이동할 URL (https://...)"
          />
        </div>
      </div>

      {/* Advanced URL Input (fallback) */}
      {!imageContent.src && (
        <div className="border-t pt-4">
          <Label htmlFor="src">직접 URL 입력</Label>
          <Input
            id="src"
            value={imageContent.src}
            onChange={(e) => onChange({ ...imageContent, src: e.target.value })}
            placeholder="https://..."
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
};

// 버튼 블록 에디터
const ButtonBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const buttonContent = content as { type: 'BUTTON'; text: string; link: string; variant?: 'primary' | 'secondary' | 'outline'; size?: 'small' | 'medium' | 'large' };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="text">버튼 텍스트</Label>
        <Input
          id="text"
          value={buttonContent.text}
          onChange={(e) => onChange({ type: 'BUTTON', text: e.target.value, link: buttonContent.link, variant: buttonContent.variant, size: buttonContent.size })}
          placeholder="버튼 텍스트"
        />
      </div>
      <div>
        <Label htmlFor="link">링크 URL</Label>
        <Input
          id="link"
          value={buttonContent.link}
          onChange={(e) => onChange({ type: 'BUTTON', text: buttonContent.text, link: e.target.value, variant: buttonContent.variant, size: buttonContent.size })}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>스타일</Label>
          <Select
            value={buttonContent.variant || 'primary'}
            onValueChange={(value) => onChange({ type: 'BUTTON', text: buttonContent.text, link: buttonContent.link, variant: value as 'primary' | 'secondary' | 'outline', size: buttonContent.size })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="outline">Outline</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>크기</Label>
          <Select
            value={buttonContent.size || 'medium'}
            onValueChange={(value) => onChange({ type: 'BUTTON', text: buttonContent.text, link: buttonContent.link, variant: buttonContent.variant, size: value as 'small' | 'medium' | 'large' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">작게</SelectItem>
              <SelectItem value="medium">보통</SelectItem>
              <SelectItem value="large">크게</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

// 비디오 블록 에디터
const VideoBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const videoContent = content as {
    type: 'VIDEO';
    src: string;
    poster?: string;
    autoplay?: boolean;
    controls?: boolean;
    loop?: boolean;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="src">비디오 URL</Label>
        <Input
          id="src"
          value={videoContent.src}
          onChange={(e) => onChange({ ...videoContent, src: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label htmlFor="poster">포스터 이미지 URL (선택)</Label>
        <Input
          id="poster"
          value={videoContent.poster || ''}
          onChange={(e) => onChange({ ...videoContent, poster: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={videoContent.autoplay || false}
            onCheckedChange={(checked) => onChange({ ...videoContent, autoplay: checked })}
          />
          <Label>자동 재생</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={videoContent.controls !== false}
            onCheckedChange={(checked) => onChange({ ...videoContent, controls: checked })}
          />
          <Label>컨트롤 표시</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={videoContent.loop || false}
            onCheckedChange={(checked) => onChange({ ...videoContent, loop: checked })}
          />
          <Label>반복 재생</Label>
        </div>
      </div>
    </div>
  );
};

// 캐러셀 블록 에디터
const CarouselBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const carouselContent = content as {
    type: 'CAROUSEL';
    items: Array<{ image: string; title?: string; description?: string; link?: string }>;
    autoplay?: boolean;
    interval?: number;
  };

  const addItem = () => {
    const newItems = [...(carouselContent.items || []), { image: '', title: '', description: '', link: '' }];
    onChange({ ...carouselContent, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = carouselContent.items.filter((_, i) => i !== index);
    onChange({ ...carouselContent, items: newItems });
  };

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...carouselContent.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange({ ...carouselContent, items: newItems });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>캐러셀 아이템</Label>
        <Button type="button" size="sm" onClick={addItem}>
          <Plus size={16} className="mr-1" /> 아이템 추가
        </Button>
      </div>

      {carouselContent.items?.map((item, index) => (
        <div key={index} className="border rounded p-4 space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">아이템 {index + 1}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removeItem(index)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
          <Input
            value={item.image}
            onChange={(e) => updateItem(index, 'image', e.target.value)}
            placeholder="이미지 URL"
          />
          <Input
            value={item.title || ''}
            onChange={(e) => updateItem(index, 'title', e.target.value)}
            placeholder="제목 (선택)"
          />
          <Input
            value={item.description || ''}
            onChange={(e) => updateItem(index, 'description', e.target.value)}
            placeholder="설명 (선택)"
          />
          <Input
            value={item.link || ''}
            onChange={(e) => updateItem(index, 'link', e.target.value)}
            placeholder="링크 URL (선택)"
          />
        </div>
      ))}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Switch
            checked={carouselContent.autoplay || false}
            onCheckedChange={(checked) => onChange({ ...carouselContent, autoplay: checked })}
          />
          <Label>자동 재생</Label>
        </div>
        {carouselContent.autoplay && (
          <div>
            <Label htmlFor="interval">재생 간격 (밀리초)</Label>
            <Input
              id="interval"
              type="number"
              value={carouselContent.interval || 5000}
              onChange={(e) => onChange({ ...carouselContent, interval: parseInt(e.target.value) })}
              placeholder="5000"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// HTML 블록 에디터
const HtmlBlockEditor: React.FC<{
  content: BlockContent;
  onChange: (content: Partial<BlockContent>) => void;
}> = ({ content, onChange }) => {
  const htmlContent = content as { type: 'HTML'; html: string };

  return (
    <div className="space-y-4">
      <Label>HTML 코드</Label>
      <Textarea
        value={htmlContent.html}
        onChange={(e) => onChange({ ...htmlContent, html: e.target.value })}
        placeholder="HTML 코드를 입력하세요..."
        rows={15}
        className="font-mono text-sm"
      />
    </div>
  );
};

export default BlockEditor;