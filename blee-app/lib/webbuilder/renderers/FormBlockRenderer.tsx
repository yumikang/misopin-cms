import React from 'react';
import { ContentBlockData, FormBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 폼 블록 렌더러
 * 접근성 준수, 유효성 검증, 다양한 입력 타입 지원
 */
export class FormBlockRenderer extends BaseBlockRenderer {
  /**
   * 폼 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'FORM') {
      return false;
    }

    const content = block.content as FormBlockContent;
    return !!(content &&
             Array.isArray(content.fields) &&
             content.fields.length > 0);
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid form block data');
      }

      const content = block.content as FormBlockContent;
      const {
        fields = [],
        action = '#',
        method = 'POST',
        title,
        description,
        submitText = '제출',
        successMessage = '성공적으로 제출되었습니다.',
        errorMessage = '제출 중 오류가 발생했습니다.'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const formId = `form-${Math.random().toString(36).substr(2, 9)}`;
      const accessibilityAttrs = RenderUtils.generateAccessibilityAttributes('FORM', content);

      // 폼 필드 렌더링
      const fieldsHTML = fields.map(field => this.renderFormField(field)).join('');

      // 폼 헤더
      const headerHTML = (title || description) ? `
        <div class="form-header mb-6">
          ${title ? `<h2 class="text-2xl font-bold mb-2">${this.escapeHtml(title)}</h2>` : ''}
          ${description ? `<p class="text-gray-600">${this.escapeHtml(description)}</p>` : ''}
        </div>
      ` : '';

      // 폼 JavaScript
      const formScript = this.generateFormScript(formId, { successMessage, errorMessage });

      // 기본 폼 컨테이너 생성
      const baseHTML = `
        <div class="cms-form-block ${tailwindClasses}">
          <form
            id="${formId}"
            action="${this.escapeAttribute(action)}"
            method="${method}"
            class="space-y-6"
            ${accessibilityAttrs}
            novalidate
          >
            ${headerHTML}
            <div class="form-fields space-y-4">
              ${fieldsHTML}
            </div>
            <div class="form-actions">
              <button
                type="submit"
                class="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ${this.escapeHtml(submitText)}
              </button>
            </div>
            <div class="form-messages hidden">
              <div class="success-message hidden bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md">
                ${this.escapeHtml(successMessage)}
              </div>
              <div class="error-message hidden bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
                ${this.escapeHtml(errorMessage)}
              </div>
            </div>
          </form>
        </div>
        <script>
          ${formScript}
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
        throw new Error('Invalid form block data');
      }

      const content = block.content as FormBlockContent;
      const {
        fields = [],
        action = '#',
        method = 'POST',
        title,
        description,
        submitText = '제출',
        successMessage = '성공적으로 제출되었습니다.',
        errorMessage = '제출 중 오류가 발생했습니다.'
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-form-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      return (
        <div className={className} style={inlineStyles}>
          <FormComponent
            fields={fields}
            action={action}
            method={method}
            title={title}
            description={description}
            submitText={submitText}
            successMessage={successMessage}
            errorMessage={errorMessage}
          />
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'FORM 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 폼 필드 렌더링
   */
  private renderFormField(field: any): string {
    const {
      type,
      name,
      label,
      placeholder,
      required = false,
      validation,
      options,
      description
    } = field;

    const fieldId = `field-${name}`;
    const requiredAttr = required ? 'required' : '';
    const requiredMark = required ? '<span class="text-red-500 ml-1">*</span>' : '';

    // 레이블과 설명
    const labelHTML = label ? `
      <label for="${fieldId}" class="block text-sm font-medium text-gray-700 mb-1">
        ${this.escapeHtml(label)}${requiredMark}
      </label>
    ` : '';

    const descriptionHTML = description ? `
      <p class="text-sm text-gray-500 mb-2">${this.escapeHtml(description)}</p>
    ` : '';

    // 필드 타입별 렌더링
    let inputHTML = '';

    switch (type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
        inputHTML = `
          <input
            type="${type}"
            id="${fieldId}"
            name="${this.escapeAttribute(name)}"
            ${placeholder ? `placeholder="${this.escapeAttribute(placeholder)}"` : ''}
            ${requiredAttr}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            ${this.generateValidationAttributes(validation)}
          />
        `;
        break;

      case 'textarea':
        inputHTML = `
          <textarea
            id="${fieldId}"
            name="${this.escapeAttribute(name)}"
            ${placeholder ? `placeholder="${this.escapeAttribute(placeholder)}"` : ''}
            ${requiredAttr}
            rows="4"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            ${this.generateValidationAttributes(validation)}
          ></textarea>
        `;
        break;

      case 'select':
        const optionsHTML = options?.map((option: any) => `
          <option value="${this.escapeAttribute(option.value)}" ${option.selected ? 'selected' : ''}>
            ${this.escapeHtml(option.label)}
          </option>
        `).join('') || '';

        inputHTML = `
          <select
            id="${fieldId}"
            name="${this.escapeAttribute(name)}"
            ${requiredAttr}
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            ${placeholder ? `<option value="">${this.escapeHtml(placeholder)}</option>` : ''}
            ${optionsHTML}
          </select>
        `;
        break;

      case 'radio':
        inputHTML = options?.map((option: any, index: number) => `
          <div class="flex items-center">
            <input
              type="radio"
              id="${fieldId}-${index}"
              name="${this.escapeAttribute(name)}"
              value="${this.escapeAttribute(option.value)}"
              ${option.checked ? 'checked' : ''}
              ${requiredAttr}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label for="${fieldId}-${index}" class="ml-3 block text-sm font-medium text-gray-700">
              ${this.escapeHtml(option.label)}
            </label>
          </div>
        `).join('') || '';
        break;

      case 'checkbox':
        if (options && options.length > 1) {
          // 다중 체크박스
          inputHTML = options.map((option: any, index: number) => `
            <div class="flex items-center">
              <input
                type="checkbox"
                id="${fieldId}-${index}"
                name="${this.escapeAttribute(name)}[]"
                value="${this.escapeAttribute(option.value)}"
                ${option.checked ? 'checked' : ''}
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="${fieldId}-${index}" class="ml-3 block text-sm font-medium text-gray-700">
                ${this.escapeHtml(option.label)}
              </label>
            </div>
          `).join('');
        } else {
          // 단일 체크박스
          inputHTML = `
            <div class="flex items-center">
              <input
                type="checkbox"
                id="${fieldId}"
                name="${this.escapeAttribute(name)}"
                value="1"
                ${requiredAttr}
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="${fieldId}" class="ml-3 block text-sm font-medium text-gray-700">
                ${this.escapeHtml(label || placeholder || '')}
              </label>
            </div>
          `;
        }
        break;

      case 'file':
        inputHTML = `
          <input
            type="file"
            id="${fieldId}"
            name="${this.escapeAttribute(name)}"
            ${requiredAttr}
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            ${validation?.accept ? `accept="${this.escapeAttribute(validation.accept)}"` : ''}
          />
        `;
        break;

      default:
        inputHTML = `
          <div class="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            지원되지 않는 필드 타입: ${this.escapeHtml(type)}
          </div>
        `;
    }

    return `
      <div class="form-field" data-field-type="${type}">
        ${labelHTML}
        ${descriptionHTML}
        ${inputHTML}
        <div class="field-error hidden text-red-600 text-sm mt-1"></div>
      </div>
    `;
  }

  /**
   * 유효성 검증 속성 생성
   */
  private generateValidationAttributes(validation: any): string {
    if (!validation) return '';

    const attributes: string[] = [];

    if (validation.minLength) attributes.push(`minlength="${validation.minLength}"`);
    if (validation.maxLength) attributes.push(`maxlength="${validation.maxLength}"`);
    if (validation.min) attributes.push(`min="${validation.min}"`);
    if (validation.max) attributes.push(`max="${validation.max}"`);
    if (validation.pattern) attributes.push(`pattern="${this.escapeAttribute(validation.pattern)}"`);

    return attributes.join(' ');
  }

  /**
   * 폼 JavaScript 코드 생성
   */
  private generateFormScript(formId: string, options: {
    successMessage: string;
    errorMessage: string;
  }): string {
    return `
      (function() {
        const form = document.getElementById('${formId}');
        if (!form) return;

        const submitButton = form.querySelector('button[type="submit"]');
        const successMessage = form.querySelector('.success-message');
        const errorMessage = form.querySelector('.error-message');

        function showMessage(type, message) {
          successMessage?.classList.add('hidden');
          errorMessage?.classList.add('hidden');

          if (type === 'success') {
            successMessage?.classList.remove('hidden');
          } else {
            errorMessage?.classList.remove('hidden');
          }
        }

        function validateField(field) {
          const value = field.value.trim();
          const fieldContainer = field.closest('.form-field');
          const errorElement = fieldContainer?.querySelector('.field-error');

          let isValid = true;
          let errorMsg = '';

          // 필수 필드 검증
          if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMsg = '이 필드는 필수입니다.';
          }

          // 이메일 검증
          if (field.type === 'email' && value) {
            const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
            if (!emailRegex.test(value)) {
              isValid = false;
              errorMsg = '올바른 이메일 형식이 아닙니다.';
            }
          }

          // 패턴 검증
          if (field.hasAttribute('pattern') && value) {
            const pattern = new RegExp(field.getAttribute('pattern'));
            if (!pattern.test(value)) {
              isValid = false;
              errorMsg = '올바른 형식이 아닙니다.';
            }
          }

          // 길이 검증
          if (field.hasAttribute('minlength') && value.length < parseInt(field.getAttribute('minlength'))) {
            isValid = false;
            errorMsg = \`최소 \${field.getAttribute('minlength')}글자 이상 입력해주세요.\`;
          }

          if (field.hasAttribute('maxlength') && value.length > parseInt(field.getAttribute('maxlength'))) {
            isValid = false;
            errorMsg = \`최대 \${field.getAttribute('maxlength')}글자까지 입력 가능합니다.\`;
          }

          // 에러 메시지 표시
          if (errorElement) {
            if (isValid) {
              errorElement.classList.add('hidden');
              errorElement.textContent = '';
            } else {
              errorElement.classList.remove('hidden');
              errorElement.textContent = errorMsg;
            }
          }

          return isValid;
        }

        function validateForm() {
          const fields = form.querySelectorAll('input, textarea, select');
          let isValid = true;

          fields.forEach(field => {
            if (!validateField(field)) {
              isValid = false;
            }
          });

          return isValid;
        }

        // 실시간 유효성 검증
        form.addEventListener('blur', (e) => {
          if (e.target.matches('input, textarea, select')) {
            validateField(e.target);
          }
        }, true);

        // 폼 제출 처리
        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          if (!validateForm()) {
            return;
          }

          // 제출 버튼 비활성화
          if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = '제출 중...';
          }

          try {
            const formData = new FormData(form);
            const response = await fetch(form.action, {
              method: form.method,
              body: formData,
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            });

            if (response.ok) {
              showMessage('success');
              form.reset();
            } else {
              throw new Error('서버 응답 오류');
            }
          } catch (error) {
            showMessage('error');
            console.error('Form submission error:', error);
          } finally {
            // 제출 버튼 복원
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = '${options.successMessage.replace(/'/g, "\\'")}';
            }
          }
        });
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
 * React 폼 컴포넌트
 */
interface FormComponentProps {
  fields: any[];
  action: string;
  method: string;
  title?: string;
  description?: string;
  submitText: string;
  successMessage: string;
  errorMessage: string;
}

function FormComponent({
  fields,
  action,
  method,
  title,
  description,
  submitText,
  successMessage,
  errorMessage
}: FormComponentProps): JSX.Element {
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(action, {
        method,
        body: new FormData(e.target as HTMLFormElement),
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: successMessage });
        setFormData({});
      } else {
        throw new Error('서버 응답 오류');
      }
    } catch (error) {
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    fields.forEach(field => {
      const value = formData[field.name];

      if (field.required && (!value || value.toString().trim() === '')) {
        newErrors[field.name] = '이 필드는 필수입니다.';
        isValid = false;
      }

      if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[field.name] = '올바른 이메일 형식이 아닙니다.';
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {(title || description) && (
        <div className="form-header mb-6">
          {title && <h2 className="text-2xl font-bold mb-2">{title}</h2>}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}

      <div className="form-fields space-y-4">
        {fields.map((field, index) => (
          <FormFieldComponent
            key={field.name || index}
            field={field}
            value={formData[field.name] || ''}
            error={errors[field.name]}
            onChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
          />
        ))}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '제출 중...' : submitText}
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}
    </form>
  );
}

/**
 * React 폼 필드 컴포넌트
 */
interface FormFieldComponentProps {
  field: any;
  value: any;
  error?: string;
  onChange: (value: any) => void;
}

function FormFieldComponent({ field, value, error, onChange }: FormFieldComponentProps): JSX.Element {
  const fieldId = `field-${field.name}`;

  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
        return (
          <input
            type={field.type}
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            name={field.name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {field.placeholder && <option value="">{field.placeholder}</option>}
            {field.options?.map((option: any, index: number) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <div className="mt-1 p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
            지원되지 않는 필드 타입: {field.type}
          </div>
        );
    }
  };

  return (
    <div className="form-field">
      {field.label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {field.description && (
        <p className="text-sm text-gray-500 mb-2">{field.description}</p>
      )}
      {renderInput()}
      {error && (
        <div className="text-red-600 text-sm mt-1">{error}</div>
      )}
    </div>
  );
}