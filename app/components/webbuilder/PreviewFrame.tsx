'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ContentBlockData } from '@/app/types/webbuilder';

interface PreviewFrameProps {
  pageUrl: string;
  sections: Record<string, ContentBlockData[]>;
  device: 'desktop' | 'tablet' | 'mobile';
  zoom?: number;
}

const DEVICE_SIZES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 }
};

const PreviewFrame: React.FC<PreviewFrameProps> = ({
  pageUrl,
  sections,
  device = 'desktop',
  zoom = 1
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deviceSize = DEVICE_SIZES[device];
  const scale = zoom;

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;

    const handleLoad = () => {
      setIsLoading(false);

      try {
        // iframe 내부 문서에 접근
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (!iframeDoc) {
          throw new Error('Cannot access iframe document');
        }

        // PostMessage로 콘텐츠 업데이트
        iframe.contentWindow?.postMessage({
          type: 'UPDATE_PREVIEW',
          sections: sections
        }, '*');

        // 스타일 주입 (미리보기 모드 표시)
        const style = iframeDoc.createElement('style');
        style.textContent = `
          [data-cms-section] {
            position: relative;
            min-height: 50px;
            outline: 2px dashed rgba(56, 176, 201, 0.3);
            outline-offset: 2px;
          }

          [data-cms-section]::before {
            content: attr(data-cms-section);
            position: absolute;
            top: -20px;
            left: 0;
            background: rgba(56, 176, 201, 0.9);
            color: white;
            padding: 2px 8px;
            font-size: 11px;
            border-radius: 3px;
            z-index: 999;
            pointer-events: none;
          }

          .cms-block {
            position: relative;
            margin: 10px 0;
            padding: 10px;
            border: 1px dashed rgba(156, 163, 175, 0.3);
          }

          .cms-block:hover {
            background: rgba(56, 176, 201, 0.05);
            border-color: rgba(56, 176, 201, 0.5);
          }
        `;

        if (iframeDoc.head) {
          iframeDoc.head.appendChild(style);
        }

        // 미리보기 업데이트 스크립트 주입
        const script = iframeDoc.createElement('script');
        script.textContent = `
          (function() {
            window.addEventListener('message', function(event) {
              if (event.data.type === 'UPDATE_PREVIEW') {
                const sections = event.data.sections;

                // 각 섹션 업데이트
                Object.keys(sections).forEach(sectionName => {
                  const sectionElement = document.querySelector('[data-cms-section="' + sectionName + '"]');
                  if (sectionElement) {
                    // 기존 콘텐츠 클리어
                    sectionElement.innerHTML = '';

                    // 새 블록 렌더링
                    sections[sectionName].forEach(block => {
                      const blockElement = renderBlock(block);
                      if (blockElement) {
                        sectionElement.appendChild(blockElement);
                      }
                    });
                  }
                });
              }
            });

            function renderBlock(block) {
              const div = document.createElement('div');
              div.className = 'cms-block cms-block-' + block.type.toLowerCase();

              switch(block.type) {
                case 'TEXT':
                  div.innerHTML = block.content.text || '';
                  break;
                case 'IMAGE':
                  if (block.content.src) {
                    const img = document.createElement('img');
                    img.src = block.content.src;
                    img.alt = block.content.alt || '';
                    div.appendChild(img);
                  }
                  break;
                case 'BUTTON':
                  const btn = document.createElement('a');
                  btn.href = block.content.link || '#';
                  btn.textContent = block.content.text || 'Button';
                  btn.className = 'btn btn-' + (block.content.variant || 'primary');
                  div.appendChild(btn);
                  break;
                case 'HTML':
                  div.innerHTML = block.content.html || '';
                  break;
                default:
                  div.innerHTML = '<p>Block type: ' + block.type + '</p>';
              }

              // 커스텀 스타일 적용
              if (block.styles) {
                Object.keys(block.styles).forEach(key => {
                  div.style[key] = block.styles[key];
                });
              }

              return div;
            }
          })();
        `;

        if (iframeDoc.body) {
          iframeDoc.body.appendChild(script);
        }

        // 초기 콘텐츠 전송
        setTimeout(() => {
          iframe.contentWindow?.postMessage({
            type: 'UPDATE_PREVIEW',
            sections: sections
          }, '*');
        }, 100);

      } catch (err) {
        console.error('Preview error:', err);
        setError('미리보기를 로드할 수 없습니다.');
      }
    };

    const handleError = () => {
      setIsLoading(false);
      setError('페이지를 로드할 수 없습니다.');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [sections]);

  // 섹션 변경시 업데이트
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'UPDATE_PREVIEW',
        sections: sections
      }, '*');
    }
  }, [sections]);

  return (
    <div className="preview-container bg-gray-100 rounded-lg overflow-hidden">
      <div className="preview-toolbar bg-white border-b p-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">미리보기:</span>
          <span className="text-sm font-medium">{device}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">배율:</span>
          <span className="text-sm font-medium">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <div className="preview-viewport p-4 overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
        <div
          className="preview-device mx-auto"
          style={{
            width: deviceSize.width,
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">미리보기 로딩중...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-white flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    iframeRef.current?.contentWindow?.location.reload();
                  }}
                  className="text-sm text-blue-500 underline"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          <iframe
            ref={iframeRef}
            src={pageUrl}
            className="w-full bg-white border rounded shadow-lg"
            style={{
              height: deviceSize.height,
              display: isLoading || error ? 'none' : 'block'
            }}
            title="Page Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewFrame;