import React from 'react';
import { ContentBlockData, CarouselBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 캐러셀 블록 렌더러
 * 이미지/콘텐츠 슬라이더, 터치 지원, 접근성 준수
 */
export class CarouselBlockRenderer extends BaseBlockRenderer {
  /**
   * 캐러셀 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'CAROUSEL') {
      return false;
    }

    const content = block.content as CarouselBlockContent;
    return !!(content &&
             Array.isArray(content.items) &&
             content.items.length > 0);
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid carousel block data');
      }

      const content = block.content as CarouselBlockContent;
      const {
        items = [],
        autoplay = false,
        interval = 5000,
        showDots = true,
        showArrows = true,
        infinite = true,
        slidesToShow = 1,
        slidesToScroll = 1
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const carouselId = `carousel-${Math.random().toString(36).substr(2, 9)}`;

      // 캐러셀 아이템 렌더링
      const itemsHTML = items.map((item, index) => {
        const isActive = index === 0;
        const itemContent = this.renderCarouselItem(item);

        return `
          <div class="carousel-item ${isActive ? 'active' : ''}" data-slide="${index}">
            ${itemContent}
          </div>
        `;
      }).join('');

      // 도트 인디케이터 생성
      const dotsHTML = showDots ? `
        <div class="carousel-dots flex justify-center space-x-2 mt-4">
          ${items.map((_, index) => `
            <button
              class="carousel-dot w-3 h-3 rounded-full transition-colors ${index === 0 ? 'bg-blue-600' : 'bg-gray-300'}"
              data-slide="${index}"
              aria-label="슬라이드 ${index + 1}로 이동"
            ></button>
          `).join('')}
        </div>
      ` : '';

      // 화살표 네비게이션 생성
      const arrowsHTML = showArrows ? `
        <button class="carousel-prev absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity" aria-label="이전 슬라이드">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <button class="carousel-next absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity" aria-label="다음 슬라이드">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
      ` : '';

      // 캐러셀 스크립트 생성
      const carouselScript = this.generateCarouselScript(carouselId, {
        autoplay,
        interval,
        infinite,
        itemsCount: items.length
      });

      // 기본 캐러셀 컨테이너 생성
      const baseHTML = `
        <div class="cms-carousel-block ${tailwindClasses}" id="${carouselId}">
          <div class="carousel-container relative overflow-hidden rounded-lg">
            <div class="carousel-track flex transition-transform duration-300 ease-in-out">
              ${itemsHTML}
            </div>
            ${arrowsHTML}
          </div>
          ${dotsHTML}
        </div>
        <script>
          ${carouselScript}
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
        throw new Error('Invalid carousel block data');
      }

      const content = block.content as CarouselBlockContent;
      const {
        items = [],
        autoplay = false,
        interval = 5000,
        showDots = true,
        showArrows = true,
        infinite = true,
        slidesToShow = 1,
        slidesToScroll = 1
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-carousel-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      // React에서는 useEffect와 useState를 사용하여 캐러셀 로직 구현
      return (
        <div className={className} style={inlineStyles}>
          <CarouselComponent
            items={items}
            autoplay={autoplay}
            interval={interval}
            showDots={showDots}
            showArrows={showArrows}
            infinite={infinite}
            slidesToShow={slidesToShow}
            slidesToScroll={slidesToScroll}
          />
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'CAROUSEL 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 캐러셀 아이템 렌더링
   */
  private renderCarouselItem(item: CarouselBlockContent['items'][0]): string {
    if (item.type === 'image') {
      const { src, alt = '', caption } = item;
      return `
        <div class="carousel-item-content">
          <img src="${this.escapeAttribute(src)}" alt="${this.escapeAttribute(alt)}" class="w-full h-auto object-cover" />
          ${caption ? `<div class="carousel-caption absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">${this.escapeHtml(caption)}</div>` : ''}
        </div>
      `;
    } else if (item.type === 'content') {
      const { title, description, image, link } = item;
      return `
        <div class="carousel-item-content flex items-center p-8">
          ${image ? `<img src="${this.escapeAttribute(image)}" alt="" class="w-1/3 h-auto object-cover rounded mr-6" />` : ''}
          <div class="flex-1">
            ${title ? `<h3 class="text-2xl font-bold mb-4">${this.escapeHtml(title)}</h3>` : ''}
            ${description ? `<p class="text-gray-600 mb-4">${this.escapeHtml(description)}</p>` : ''}
            ${link ? `<a href="${this.escapeAttribute(link.url)}" class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors">${this.escapeHtml(link.text || '더 보기')}</a>` : ''}
          </div>
        </div>
      `;
    } else {
      return `<div class="carousel-item-content p-8 text-center text-gray-500">지원되지 않는 콘텐츠 타입</div>`;
    }
  }

  /**
   * 캐러셀 JavaScript 코드 생성
   */
  private generateCarouselScript(carouselId: string, options: {
    autoplay: boolean;
    interval: number;
    infinite: boolean;
    itemsCount: number;
  }): string {
    return `
      (function() {
        const carousel = document.getElementById('${carouselId}');
        if (!carousel) return;

        const track = carousel.querySelector('.carousel-track');
        const items = carousel.querySelectorAll('.carousel-item');
        const dots = carousel.querySelectorAll('.carousel-dot');
        const prevBtn = carousel.querySelector('.carousel-prev');
        const nextBtn = carousel.querySelector('.carousel-next');

        let currentSlide = 0;
        const totalSlides = ${options.itemsCount};
        let autoplayInterval;

        function updateCarousel() {
          const translateX = -currentSlide * 100;
          track.style.transform = \`translateX(\${translateX}%)\`;

          // 도트 업데이트
          dots.forEach((dot, index) => {
            dot.classList.toggle('bg-blue-600', index === currentSlide);
            dot.classList.toggle('bg-gray-300', index !== currentSlide);
          });

          // 아이템 활성화 상태 업데이트
          items.forEach((item, index) => {
            item.classList.toggle('active', index === currentSlide);
          });
        }

        function nextSlide() {
          currentSlide = ${options.infinite} ? (currentSlide + 1) % totalSlides : Math.min(currentSlide + 1, totalSlides - 1);
          updateCarousel();
        }

        function prevSlide() {
          currentSlide = ${options.infinite} ? (currentSlide - 1 + totalSlides) % totalSlides : Math.max(currentSlide - 1, 0);
          updateCarousel();
        }

        function goToSlide(index) {
          currentSlide = index;
          updateCarousel();
        }

        function startAutoplay() {
          if (${options.autoplay}) {
            autoplayInterval = setInterval(nextSlide, ${options.interval});
          }
        }

        function stopAutoplay() {
          if (autoplayInterval) {
            clearInterval(autoplayInterval);
          }
        }

        // 이벤트 리스너 등록
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);
        if (nextBtn) nextBtn.addEventListener('click', nextSlide);

        dots.forEach((dot, index) => {
          dot.addEventListener('click', () => goToSlide(index));
        });

        // 마우스 호버시 자동재생 일시정지
        carousel.addEventListener('mouseenter', stopAutoplay);
        carousel.addEventListener('mouseleave', startAutoplay);

        // 키보드 네비게이션
        carousel.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') prevSlide();
          if (e.key === 'ArrowRight') nextSlide();
        });

        // 터치 지원
        let startX = 0;
        let endX = 0;

        carousel.addEventListener('touchstart', (e) => {
          startX = e.touches[0].clientX;
        });

        carousel.addEventListener('touchend', (e) => {
          endX = e.changedTouches[0].clientX;
          const diff = startX - endX;

          if (Math.abs(diff) > 50) {
            if (diff > 0) nextSlide();
            else prevSlide();
          }
        });

        // 초기화
        updateCarousel();
        startAutoplay();
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
 * React 캐러셀 컴포넌트 (클라이언트 사이드)
 */
interface CarouselComponentProps {
  items: CarouselBlockContent['items'];
  autoplay: boolean;
  interval: number;
  showDots: boolean;
  showArrows: boolean;
  infinite: boolean;
  slidesToShow: number;
  slidesToScroll: number;
}

function CarouselComponent({
  items,
  autoplay,
  interval,
  showDots,
  showArrows,
  infinite,
  slidesToShow,
  slidesToScroll
}: CarouselComponentProps): JSX.Element {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const totalSlides = items.length;

  // 자동재생 로직
  React.useEffect(() => {
    if (!autoplay) return;

    const autoplayInterval = setInterval(() => {
      setCurrentSlide(prev =>
        infinite ? (prev + 1) % totalSlides : Math.min(prev + 1, totalSlides - 1)
      );
    }, interval);

    return () => clearInterval(autoplayInterval);
  }, [autoplay, interval, infinite, totalSlides]);

  const nextSlide = () => {
    setCurrentSlide(prev =>
      infinite ? (prev + 1) % totalSlides : Math.min(prev + 1, totalSlides - 1)
    );
  };

  const prevSlide = () => {
    setCurrentSlide(prev =>
      infinite ? (prev - 1 + totalSlides) % totalSlides : Math.max(prev - 1, 0)
    );
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="carousel-container relative overflow-hidden rounded-lg">
      <div
        className="carousel-track flex transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {items.map((item, index) => (
          <div key={index} className="carousel-item w-full flex-shrink-0">
            <CarouselItemComponent item={item} />
          </div>
        ))}
      </div>

      {showArrows && (
        <>
          <button
            onClick={prevSlide}
            className="carousel-prev absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            aria-label="이전 슬라이드"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="carousel-next absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-opacity"
            aria-label="다음 슬라이드"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
        </>
      )}

      {showDots && (
        <div className="carousel-dots flex justify-center space-x-2 mt-4">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`carousel-dot w-3 h-3 rounded-full transition-colors ${
                index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              aria-label={`슬라이드 ${index + 1}로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 캐러셀 아이템 React 컴포넌트
 */
function CarouselItemComponent({ item }: { item: CarouselBlockContent['items'][0] }): JSX.Element {
  if (item.type === 'image') {
    const { src, alt = '', caption } = item;
    return (
      <div className="carousel-item-content relative">
        <img src={src} alt={alt} className="w-full h-auto object-cover" />
        {caption && (
          <div className="carousel-caption absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded">
            {caption}
          </div>
        )}
      </div>
    );
  } else if (item.type === 'content') {
    const { title, description, image, link } = item;
    return (
      <div className="carousel-item-content flex items-center p-8">
        {image && (
          <img src={image} alt="" className="w-1/3 h-auto object-cover rounded mr-6" />
        )}
        <div className="flex-1">
          {title && <h3 className="text-2xl font-bold mb-4">{title}</h3>}
          {description && <p className="text-gray-600 mb-4">{description}</p>}
          {link && (
            <a
              href={link.url}
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              {link.text || '더 보기'}
            </a>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="carousel-item-content p-8 text-center text-gray-500">
        지원되지 않는 콘텐츠 타입
      </div>
    );
  }
}