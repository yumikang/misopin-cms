import React from 'react';
import { ContentBlockData, ComponentBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 컴포넌트 블록 렌더러
 * 재사용 가능한 컴포넌트, 동적 props, 라이프사이클 지원
 */
export class ComponentBlockRenderer extends BaseBlockRenderer {
  /**
   * 컴포넌트 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'COMPONENT') {
      return false;
    }

    const content = block.content as ComponentBlockContent;
    return !!(content &&
             content.componentName &&
             typeof content.componentName === 'string');
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid component block data');
      }

      const content = block.content as ComponentBlockContent;
      const {
        componentName,
        props = {},
        children,
        version = 'latest',
        source = 'internal'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const componentId = `component-${Math.random().toString(36).substr(2, 9)}`;

      // 컴포넌트 HTML 생성
      const componentHTML = this.generateComponentHTML(componentName, props, children, componentId);

      // 컴포넌트 스크립트 생성 (클라이언트 사이드 하이드레이션용)
      const componentScript = this.generateComponentScript(componentId, {
        componentName,
        props,
        children,
        version,
        source
      });

      // 기본 컴포넌트 컨테이너 생성
      const baseHTML = `
        <div class="cms-component-block ${tailwindClasses}" data-component="${componentName}">
          <div id="${componentId}" class="component-container">
            ${componentHTML}
          </div>
        </div>
        <script>
          ${componentScript}
        </script>
      `.trim();

      // 스타일 적용
      return this.applyStyles(baseHTML, block);

    } catch (error) {
      return this.generateErrorFallback(block, error as Error);
    }
  }

  /**
   * React JSX로 렌더링
   */
  renderToReact(block: ContentBlockData): JSX.Element {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid component block data');
      }

      const content = block.content as ComponentBlockContent;
      const {
        componentName,
        props = {},
        children,
        version = 'latest',
        source = 'internal'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-component-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      return (
        <div className={className} style={inlineStyles} data-component={componentName}>
          <DynamicComponent
            componentName={componentName}
            props={props}
            version={version}
            source={source}
          >
            {children}
          </DynamicComponent>
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'COMPONENT 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 컴포넌트 HTML 생성
   */
  private generateComponentHTML(
    componentName: string,
    props: Record<string, unknown>,
    children?: React.ReactNode,
    componentId?: string
  ): string {
    // 빌트인 컴포넌트 처리
    const builtinComponent = this.renderBuiltinComponent(componentName, props, children);
    if (builtinComponent) {
      return builtinComponent;
    }

    // 커스텀 컴포넌트 플레이스홀더
    return `
      <div class="custom-component" data-component="${componentName}" ${componentId ? `id="${componentId}"` : ''}>
        <div class="component-placeholder bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div class="text-gray-600 mb-2">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
            <h3 class="text-lg font-medium text-gray-700 mb-2">${this.escapeHtml(componentName)}</h3>
            <p class="text-sm text-gray-500">컴포넌트가 로드되면 여기에 표시됩니다.</p>
          </div>
          ${Object.keys(props).length > 0 ? `
            <div class="component-props mt-4 text-left bg-white p-3 rounded border">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Props:</h4>
              <pre class="text-xs text-gray-600 overflow-auto">${this.escapeHtml(JSON.stringify(props, null, 2))}</pre>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 빌트인 컴포넌트 렌더링
   */
  private renderBuiltinComponent(
    componentName: string,
    props: Record<string, unknown>,
    children?: React.ReactNode
  ): string | null {
    switch (componentName.toLowerCase()) {
      case 'card':
        return this.renderCardComponent(props, children);
      case 'alert':
        return this.renderAlertComponent(props, children);
      case 'badge':
        return this.renderBadgeComponent(props, children);
      case 'progress':
        return this.renderProgressComponent(props);
      case 'accordion':
        return this.renderAccordionComponent(props);
      case 'tabs':
        return this.renderTabsComponent(props);
      case 'modal':
        return this.renderModalComponent(props, children);
      default:
        return null;
    }
  }

  /**
   * 카드 컴포넌트 렌더링
   */
  private renderCardComponent(props: Record<string, unknown>, children?: React.ReactNode): string {
    const { title, subtitle, image, footer, variant = 'default' } = props;

    const variantClasses = {
      default: 'bg-white border border-gray-200',
      elevated: 'bg-white shadow-lg border-0',
      outlined: 'bg-transparent border-2 border-gray-300'
    };

    return `
      <div class="card ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.default} rounded-lg overflow-hidden">
        ${image ? `<img src="${this.escapeAttribute(image)}" alt="" class="w-full h-48 object-cover" />` : ''}
        <div class="card-body p-6">
          ${title ? `<h3 class="card-title text-xl font-semibold text-gray-900 mb-2">${this.escapeHtml(title)}</h3>` : ''}
          ${subtitle ? `<p class="card-subtitle text-gray-600 mb-4">${this.escapeHtml(subtitle)}</p>` : ''}
          ${children ? `<div class="card-content">${children}</div>` : ''}
        </div>
        ${footer ? `<div class="card-footer px-6 py-4 bg-gray-50 border-t border-gray-200">${footer}</div>` : ''}
      </div>
    `;
  }

  /**
   * 알림 컴포넌트 렌더링
   */
  private renderAlertComponent(props: Record<string, unknown>, children?: React.ReactNode): string {
    const { type = 'info', dismissible = false, title } = props;

    const typeClasses = {
      success: 'bg-green-50 border-green-200 text-green-800',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      error: 'bg-red-50 border-red-200 text-red-800',
      info: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const icons = {
      success: '✓',
      warning: '⚠',
      error: '✕',
      info: 'ℹ'
    };

    return `
      <div class="alert ${typeClasses[type as keyof typeof typeClasses] || typeClasses.info} border rounded-lg p-4" role="alert">
        <div class="flex items-start">
          <span class="alert-icon text-lg mr-3">${icons[type as keyof typeof icons] || icons.info}</span>
          <div class="flex-1">
            ${title ? `<h4 class="alert-title font-medium mb-1">${this.escapeHtml(title)}</h4>` : ''}
            <div class="alert-content">${children || ''}</div>
          </div>
          ${dismissible ? `
            <button class="alert-dismiss ml-4 text-current opacity-50 hover:opacity-100" aria-label="닫기">
              <span class="text-xl">&times;</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * 배지 컴포넌트 렌더링
   */
  private renderBadgeComponent(props: Record<string, unknown>, children?: React.ReactNode): string {
    const { variant = 'default', size = 'md' } = props;

    const variantClasses = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };

    const sizeClasses = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-2 text-base'
    };

    return `
      <span class="badge inline-flex items-center rounded-full font-medium ${variantClasses[variant as keyof typeof variantClasses] || variantClasses.default} ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md}">
        ${children || ''}
      </span>
    `;
  }

  /**
   * 진행률 컴포넌트 렌더링
   */
  private renderProgressComponent(props: Record<string, unknown>): string {
    const { value = 0, max = 100, label, color = 'blue' } = props;
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const colorClasses = {
      blue: 'bg-blue-600',
      green: 'bg-green-600',
      yellow: 'bg-yellow-600',
      red: 'bg-red-600'
    };

    return `
      <div class="progress-container">
        ${label ? `<div class="progress-label text-sm text-gray-700 mb-2">${this.escapeHtml(label)}</div>` : ''}
        <div class="progress-bar bg-gray-200 rounded-full h-2 relative overflow-hidden">
          <div class="progress-fill ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} h-full rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text text-xs text-gray-500 mt-1 text-right">${Math.round(percentage)}%</div>
      </div>
    `;
  }

  /**
   * 아코디언 컴포넌트 렌더링
   */
  private renderAccordionComponent(props: Record<string, unknown>): string {
    const { items = [], allowMultiple = false } = props;

    const itemsHTML = (items as Array<{title?: string; content?: string}>).map((item, index: number) => `
      <div class="accordion-item border border-gray-200 rounded mb-2">
        <button class="accordion-header w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors" data-accordion-index="${index}">
          <div class="flex justify-between items-center">
            <span class="font-medium">${this.escapeHtml(item.title || '')}</span>
            <span class="accordion-icon transition-transform">▼</span>
          </div>
        </button>
        <div class="accordion-content hidden px-4 py-3 border-t border-gray-200">
          ${item.content || ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="accordion" data-allow-multiple="${allowMultiple}">
        ${itemsHTML}
      </div>
    `;
  }

  /**
   * 탭 컴포넌트 렌더링
   */
  private renderTabsComponent(props: Record<string, unknown>): string {
    const { tabs = [], defaultTab = 0 } = props;

    const tabHeadersHTML = (tabs as Array<{title?: string}>).map((tab, index: number) => `
      <button class="tab-header px-4 py-2 font-medium border-b-2 transition-colors ${index === defaultTab ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}" data-tab-index="${index}">
        ${this.escapeHtml(tab.title || '')}
      </button>
    `).join('');

    const tabContentsHTML = (tabs as Array<{content?: string}>).map((tab, index: number) => `
      <div class="tab-content p-4 ${index === defaultTab ? '' : 'hidden'}" data-tab-content="${index}">
        ${tab.content || ''}
      </div>
    `).join('');

    return `
      <div class="tabs">
        <div class="tab-headers flex border-b border-gray-200 mb-4">
          ${tabHeadersHTML}
        </div>
        <div class="tab-contents">
          ${tabContentsHTML}
        </div>
      </div>
    `;
  }

  /**
   * 모달 컴포넌트 렌더링
   */
  private renderModalComponent(props: Record<string, unknown>, children?: React.ReactNode): string {
    const { title, size = 'md', trigger } = props;

    const sizeClasses = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    };

    const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;

    return `
      ${trigger ? `
        <button class="modal-trigger bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors" data-modal-target="${modalId}">
          ${trigger}
        </button>
      ` : ''}
      <div id="${modalId}" class="modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="modal-content bg-white rounded-lg ${sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md} w-full mx-4">
          <div class="modal-header flex justify-between items-center p-6 border-b border-gray-200">
            ${title ? `<h3 class="text-lg font-semibold">${this.escapeHtml(title)}</h3>` : '<div></div>'}
            <button class="modal-close text-gray-400 hover:text-gray-600" data-modal-close>
              <span class="text-2xl">&times;</span>
            </button>
          </div>
          <div class="modal-body p-6">
            ${children || ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 컴포넌트 JavaScript 코드 생성
   */
  private generateComponentScript(componentId: string, options: {
    componentName: string;
    props: Record<string, unknown>;
    children?: React.ReactNode;
    version: string;
    source: string;
  }): string {
    return `
      (function() {
        const container = document.getElementById('${componentId}');
        if (!container) return;

        // 아코디언 이벤트 처리
        const accordion = container.querySelector('.accordion');
        if (accordion) {
          accordion.addEventListener('click', (e) => {
            if (e.target.matches('.accordion-header, .accordion-header *')) {
              const header = e.target.closest('.accordion-header');
              const item = header.closest('.accordion-item');
              const content = item.querySelector('.accordion-content');
              const icon = header.querySelector('.accordion-icon');
              const allowMultiple = accordion.dataset.allowMultiple === 'true';

              if (!allowMultiple) {
                // 다른 아코디언 아이템 닫기
                accordion.querySelectorAll('.accordion-content').forEach(c => {
                  if (c !== content) c.classList.add('hidden');
                });
                accordion.querySelectorAll('.accordion-icon').forEach(i => {
                  if (i !== icon) i.style.transform = 'rotate(0deg)';
                });
              }

              // 현재 아이템 토글
              content.classList.toggle('hidden');
              icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
            }
          });
        }

        // 탭 이벤트 처리
        const tabs = container.querySelector('.tabs');
        if (tabs) {
          tabs.addEventListener('click', (e) => {
            if (e.target.matches('.tab-header')) {
              const clickedIndex = parseInt(e.target.dataset.tabIndex);

              // 모든 탭 헤더 비활성화
              tabs.querySelectorAll('.tab-header').forEach((header, index) => {
                if (index === clickedIndex) {
                  header.classList.add('border-blue-500', 'text-blue-600');
                  header.classList.remove('border-transparent', 'text-gray-500');
                } else {
                  header.classList.remove('border-blue-500', 'text-blue-600');
                  header.classList.add('border-transparent', 'text-gray-500');
                }
              });

              // 모든 탭 컨텐츠 숨기기
              tabs.querySelectorAll('.tab-content').forEach((content, index) => {
                if (index === clickedIndex) {
                  content.classList.remove('hidden');
                } else {
                  content.classList.add('hidden');
                }
              });
            }
          });
        }

        // 모달 이벤트 처리
        const modalTrigger = container.querySelector('.modal-trigger');
        if (modalTrigger) {
          modalTrigger.addEventListener('click', () => {
            const modalId = modalTrigger.dataset.modalTarget;
            const modal = document.getElementById(modalId);
            if (modal) {
              modal.classList.remove('hidden');
            }
          });
        }

        const modal = container.querySelector('.modal');
        if (modal) {
          // 모달 닫기 이벤트
          modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.matches('.modal-close, .modal-close *')) {
              modal.classList.add('hidden');
            }
          });

          // ESC 키로 모달 닫기
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
              modal.classList.add('hidden');
            }
          });
        }

        // 알림 닫기 이벤트 처리
        const alertDismiss = container.querySelector('.alert-dismiss');
        if (alertDismiss) {
          alertDismiss.addEventListener('click', () => {
            const alert = alertDismiss.closest('.alert');
            if (alert) {
              alert.style.display = 'none';
            }
          });
        }
      })();
    `;
  }

  /**
   * HTML 속성값 이스케이프
   */
  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * React 인라인 스타일 생성
   */
  private generateInlineStyles(block: ContentBlockData): React.CSSProperties {
    const styles = block.styles;
    if (!styles) return {};

    const inlineStyles: React.CSSProperties = {};

    if (styles.backgroundColor) inlineStyles.backgroundColor = styles.backgroundColor;
    if (styles.padding) inlineStyles.padding = styles.padding;
    if (styles.margin) inlineStyles.margin = styles.margin;
    if (styles.border) inlineStyles.border = styles.border;
    if (styles.borderRadius) inlineStyles.borderRadius = styles.borderRadius;
    if (styles.boxShadow) inlineStyles.boxShadow = styles.boxShadow;
    if (styles.maxWidth) inlineStyles.maxWidth = styles.maxWidth;

    return inlineStyles;
  }

  /**
   * HTML 텍스트 이스케이프
   */
  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

/**
 * React 동적 컴포넌트
 */
interface DynamicComponentProps {
  componentName: string;
  props: Record<string, unknown>;
  children?: React.ReactNode;
  version: string;
  source: string;
}

function DynamicComponent({
  componentName,
  props,
  children,
  version,
  source
}: DynamicComponentProps): JSX.Element {
  const [Component, setComponent] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadComponent();
  }, [componentName, version, source]);

  const loadComponent = async () => {
    setLoading(true);
    setError(null);

    try {
      if (source === 'internal') {
        // 내부 컴포넌트 로드
        const InternalComponent = await loadInternalComponent(componentName);
        setComponent(() => InternalComponent);
      } else {
        // 외부 컴포넌트 로드 (예: npm 패키지)
        setError('외부 컴포넌트 로드는 아직 지원되지 않습니다.');
      }
    } catch (err) {
      setError(`컴포넌트를 로드할 수 없습니다: ${componentName}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="component-loading flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">컴포넌트 로드 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="component-error bg-red-50 border border-red-200 text-red-800 p-4 rounded">
        <p className="font-medium">컴포넌트 로드 오류</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (Component) {
    return <Component {...props}>{children}</Component>;
  }

  return (
    <div className="component-placeholder bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
      <div className="text-gray-600">
        <h3 className="text-lg font-medium text-gray-700 mb-2">{componentName}</h3>
        <p className="text-sm text-gray-500">컴포넌트를 찾을 수 없습니다.</p>
      </div>
    </div>
  );
}

/**
 * 내부 컴포넌트 로더
 */
async function loadInternalComponent(componentName: string): Promise<React.ComponentType<Record<string, unknown>>> {
  // 빌트인 컴포넌트 매핑
  const builtinComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {
    Card: ({ title, subtitle, children, ...props }) => (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" {...props}>
        <div className="p-6">
          {title && <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>}
          {subtitle && <p className="text-gray-600 mb-4">{subtitle}</p>}
          {children}
        </div>
      </div>
    ),
    Alert: ({ type = 'info', title, children, ...props }) => {
      const typeClasses = {
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
      };

      return (
        <div className={`border rounded-lg p-4 ${typeClasses[type as keyof typeof typeClasses]}`} {...props}>
          {title && <h4 className="font-medium mb-1">{title}</h4>}
          {children}
        </div>
      );
    }
  };

  const BuiltinComponent = builtinComponents[componentName];
  if (BuiltinComponent) {
    return BuiltinComponent;
  }

  // 커스텀 컴포넌트 동적 import (예시)
  try {
    const importedModule = await import(`@/components/custom/${componentName}`);
    return importedModule.default || importedModule[componentName];
  } catch {
    throw new Error(`컴포넌트를 찾을 수 없습니다: ${componentName}`);
  }
}