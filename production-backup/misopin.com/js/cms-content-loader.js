/**
 * CMS Content Loader Library
 * 미소핀의원 정적 사이트에서 CMS 콘텐츠를 동적으로 로드하는 라이브러리
 * @version 1.0.0
 */

(function(window, document) {
  'use strict';

  // 설정
  const CONFIG = {
    API_BASE_URL: window.CMS_API_URL || 'https://misopin-cms.vercel.app/api/public',
    CACHE_DURATION: 5 * 60 * 1000, // 5분 캐시
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1초
    DEBUG: window.CMS_DEBUG || false,
  };

  // 캐시 저장소
  const cache = new Map();

  // 유틸리티 함수
  const utils = {
    /**
     * 로그 출력
     */
    log: function(...args) {
      if (CONFIG.DEBUG) {
        console.log('[CMS Loader]', ...args);
      }
    },

    /**
     * 에러 로그
     */
    error: function(...args) {
      console.error('[CMS Loader Error]', ...args);
    },

    /**
     * 캐시 키 생성
     */
    getCacheKey: function(url) {
      return `cache_${url}`;
    },

    /**
     * 캐시 체크
     */
    getFromCache: function(key) {
      const cached = cache.get(key);
      if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        utils.log('Cache hit:', key);
        return cached.data;
      }
      return null;
    },

    /**
     * 캐시 저장
     */
    saveToCache: function(key, data) {
      cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      utils.log('Cached:', key);
    },

    /**
     * API 호출 with retry
     */
    fetchWithRetry: async function(url, attempt = 1) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          utils.log(`Retry attempt ${attempt} for:`, url);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY * attempt));
          return utils.fetchWithRetry(url, attempt + 1);
        }
        throw error;
      }
    },

    /**
     * HTML 엘리먼트 생성
     */
    createElement: function(type, content, styles = {}) {
      const element = document.createElement('div');
      element.innerHTML = content;

      // 스타일 적용
      Object.keys(styles).forEach(key => {
        element.style[key] = styles[key];
      });

      return element;
    }
  };

  // 블록 렌더러
  const blockRenderers = {
    /**
     * 텍스트 블록 렌더링
     */
    TEXT: function(block) {
      const content = block.content;
      const format = content.format || 'html';

      if (format === 'markdown') {
        // 마크다운은 간단한 변환만 처리
        return content.text
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*)\*/g, '<em>$1</em>');
      }

      return content.text;
    },

    /**
     * 이미지 블록 렌더링
     */
    IMAGE: function(block) {
      const content = block.content;
      let html = `<img src="${content.src}" alt="${content.alt || ''}"`;

      if (block.styles) {
        const styleStr = Object.entries(block.styles)
          .map(([key, value]) => `${key}: ${value}`)
          .join('; ');
        html += ` style="${styleStr}"`;
      }

      html += '>';

      if (content.caption) {
        html = `<figure>${html}<figcaption>${content.caption}</figcaption></figure>`;
      }

      if (content.link) {
        html = `<a href="${content.link}">${html}</a>`;
      }

      return html;
    },

    /**
     * 비디오 블록 렌더링
     */
    VIDEO: function(block) {
      const content = block.content;
      const attrs = [];

      if (content.poster) attrs.push(`poster="${content.poster}"`);
      if (content.autoplay) attrs.push('autoplay');
      if (content.controls !== false) attrs.push('controls');
      if (content.loop) attrs.push('loop');

      return `<video src="${content.src}" ${attrs.join(' ')}></video>`;
    },

    /**
     * 버튼 블록 렌더링
     */
    BUTTON: function(block) {
      const content = block.content;
      const classes = ['btn'];

      if (content.variant) classes.push(`btn-${content.variant}`);
      if (content.size) classes.push(`btn-${content.size}`);

      return `<a href="${content.link}" class="${classes.join(' ')}">${content.text}</a>`;
    },

    /**
     * HTML 블록 렌더링
     */
    HTML: function(block) {
      return block.content.html;
    },

    /**
     * 캐러셀 블록 렌더링
     */
    CAROUSEL: function(block) {
      const content = block.content;
      const items = content.items.map((item, index) => `
        <div class="swiper-slide">
          <img src="${item.image}" alt="${item.title || ''}">
          ${item.title ? `<h3>${item.title}</h3>` : ''}
          ${item.description ? `<p>${item.description}</p>` : ''}
          ${item.link ? `<a href="${item.link}" class="btn">더보기</a>` : ''}
        </div>
      `).join('');

      return `
        <div class="swiper" data-autoplay="${content.autoplay}" data-interval="${content.interval || 5000}">
          <div class="swiper-wrapper">${items}</div>
          <div class="swiper-pagination"></div>
          <div class="swiper-button-next"></div>
          <div class="swiper-button-prev"></div>
        </div>
      `;
    },

    /**
     * 지도 블록 렌더링
     */
    MAP: function(block) {
      const content = block.content;
      return `
        <div class="map-container"
             data-lat="${content.latitude}"
             data-lng="${content.longitude}"
             data-zoom="${content.zoom || 15}"
             data-marker="${content.marker !== false}"
             data-title="${content.title || ''}"
             data-description="${content.description || ''}">
          <div class="map-loading">지도 로딩중...</div>
        </div>
      `;
    },

    /**
     * 폼 블록 렌더링
     */
    FORM: function(block) {
      const content = block.content;
      const fields = content.fields.map(field => {
        let input = '';

        switch(field.type) {
          case 'textarea':
            input = `<textarea name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}""></textarea>`;
            break;
          case 'select':
            const options = field.options ? field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('') : '';
            input = `<select name="${field.name}" ${field.required ? 'required' : ''}>${options}</select>`;
            break;
          default:
            input = `<input type="${field.type}" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">`;
        }

        return `
          <div class="form-group">
            <label for="${field.name}">${field.label}</label>
            ${input}
          </div>
        `;
      }).join('');

      return `
        <form action="${content.action || '#'}" method="POST" class="cms-form">
          ${fields}
          <button type="submit">${content.submitText || '전송'}</button>
        </form>
      `;
    }
  };

  // 메인 CMS 로더 객체
  const CMSContentLoader = {
    /**
     * 초기화
     */
    init: function(options = {}) {
      // 설정 병합
      Object.assign(CONFIG, options);

      utils.log('Initialized with config:', CONFIG);

      // 자동 로드 실행
      if (options.autoLoad !== false) {
        document.addEventListener('DOMContentLoaded', function() {
          CMSContentLoader.loadAllSections();
        });
      }
    },

    /**
     * 페이지의 모든 섹션 로드
     */
    loadAllSections: async function() {
      const sections = document.querySelectorAll('[data-cms-section]');

      if (!sections.length) {
        utils.log('No CMS sections found');
        return;
      }

      utils.log(`Found ${sections.length} CMS sections`);

      // 페이지 slug 가져오기
      const pageSlug = window.location.pathname === '/' ? 'home' : window.location.pathname.replace(/^\/|\.html$/g, '');

      try {
        // API에서 콘텐츠 가져오기
        const content = await CMSContentLoader.fetchContent(pageSlug);

        if (content && content.sections) {
          // 각 섹션 렌더링
          sections.forEach(section => {
            const sectionName = section.getAttribute('data-cms-section');
            if (content.sections[sectionName]) {
              CMSContentLoader.renderSection(section, content.sections[sectionName]);
            }
          });
        }

        // SEO 메타데이터 업데이트
        if (content && content.seo) {
          CMSContentLoader.updateSEO(content.seo);
        }
      } catch (error) {
        utils.error('Failed to load sections:', error);
      }
    },

    /**
     * 특정 섹션 로드
     */
    loadSection: async function(sectionName, pageSlug = null) {
      if (!pageSlug) {
        pageSlug = window.location.pathname === '/' ? 'home' : window.location.pathname.replace(/^\/|\.html$/g, '');
      }

      const section = document.querySelector(`[data-cms-section="${sectionName}"]`);
      if (!section) {
        utils.error(`Section not found: ${sectionName}`);
        return;
      }

      try {
        const content = await CMSContentLoader.fetchContent(pageSlug, sectionName);

        if (content && content.sections && content.sections[sectionName]) {
          CMSContentLoader.renderSection(section, content.sections[sectionName]);
        }
      } catch (error) {
        utils.error(`Failed to load section ${sectionName}:`, error);
      }
    },

    /**
     * API에서 콘텐츠 가져오기
     */
    fetchContent: async function(pageSlug, sectionName = null) {
      const params = new URLSearchParams({ page: pageSlug });
      if (sectionName) params.append('section', sectionName);

      const url = `${CONFIG.API_BASE_URL}/content?${params}`;
      const cacheKey = utils.getCacheKey(url);

      // 캐시 체크
      const cached = utils.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const response = await utils.fetchWithRetry(url);

        if (response.success && response.data) {
          utils.saveToCache(cacheKey, response.data);
          return response.data;
        }

        throw new Error(response.error || 'Failed to fetch content');
      } catch (error) {
        utils.error('API call failed:', error);
        return null;
      }
    },

    /**
     * 섹션 렌더링
     */
    renderSection: function(element, blocks) {
      if (!Array.isArray(blocks) || !blocks.length) {
        utils.log('No blocks to render');
        return;
      }

      utils.log(`Rendering ${blocks.length} blocks`);

      // 기존 콘텐츠 클리어 (옵션)
      if (element.hasAttribute('data-cms-replace')) {
        element.innerHTML = '';
      }

      // 블록 렌더링
      blocks.forEach(block => {
        const renderer = blockRenderers[block.type];

        if (renderer) {
          const html = renderer(block);
          const blockElement = utils.createElement('div', html, block.styles || {});
          blockElement.className = `cms-block cms-block-${block.type.toLowerCase()}`;

          if (block.settings && block.settings.className) {
            blockElement.className += ` ${block.settings.className}`;
          }

          element.appendChild(blockElement);

          // 특수 블록 초기화
          if (block.type === 'CAROUSEL') {
            CMSContentLoader.initCarousel(blockElement);
          } else if (block.type === 'MAP') {
            CMSContentLoader.initMap(blockElement.querySelector('.map-container'));
          }
        } else {
          utils.error(`No renderer for block type: ${block.type}`);
        }
      });
    },

    /**
     * 캐러셀 초기화
     */
    initCarousel: function(element) {
      const swiper = element.querySelector('.swiper');
      if (!swiper || typeof Swiper === 'undefined') return;

      new Swiper(swiper, {
        autoplay: swiper.dataset.autoplay === 'true' ? {
          delay: parseInt(swiper.dataset.interval) || 5000
        } : false,
        pagination: {
          el: '.swiper-pagination',
          clickable: true
        },
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        }
      });
    },

    /**
     * 지도 초기화 (카카오맵 예시)
     */
    initMap: function(container) {
      if (!container || typeof kakao === 'undefined') return;

      const lat = parseFloat(container.dataset.lat);
      const lng = parseFloat(container.dataset.lng);
      const zoom = parseInt(container.dataset.zoom) || 15;

      kakao.maps.load(() => {
        const map = new kakao.maps.Map(container, {
          center: new kakao.maps.LatLng(lat, lng),
          level: zoom
        });

        if (container.dataset.marker === 'true') {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(lat, lng),
            map: map
          });

          if (container.dataset.title) {
            const infowindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:5px;">${container.dataset.title}</div>`
            });
            infowindow.open(map, marker);
          }
        }
      });
    },

    /**
     * SEO 메타데이터 업데이트
     */
    updateSEO: function(seo) {
      if (!seo) return;

      // 타이틀 업데이트
      if (seo.metaTitle) {
        document.title = seo.metaTitle;
      }

      // 메타 태그 업데이트/생성 헬퍼 함수
      const updateMeta = (name, content, isProperty = false) => {
        if (!content) return;

        const attrName = isProperty ? 'property' : 'name';
        let meta = document.querySelector(`meta[${attrName}="${name}"]`);

        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute(attrName, name);
          document.head.appendChild(meta);
        }

        meta.setAttribute('content', content);
      };

      // 메타 태그 업데이트
      updateMeta('description', seo.metaDescription);
      updateMeta('keywords', seo.metaKeywords ? seo.metaKeywords.join(', ') : '');
      updateMeta('og:title', seo.ogTitle, true);
      updateMeta('og:description', seo.ogDescription, true);
      updateMeta('og:image', seo.ogImage, true);

      // Canonical URL
      if (seo.canonicalUrl) {
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
          link = document.createElement('link');
          link.setAttribute('rel', 'canonical');
          document.head.appendChild(link);
        }
        link.setAttribute('href', seo.canonicalUrl);
      }

      // 구조화 데이터
      if (seo.structuredData) {
        let script = document.querySelector('script[type="application/ld+json"]');
        if (!script) {
          script = document.createElement('script');
          script.setAttribute('type', 'application/ld+json');
          document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(seo.structuredData);
      }

      utils.log('SEO metadata updated');
    },

    /**
     * 캐시 클리어
     */
    clearCache: function() {
      cache.clear();
      utils.log('Cache cleared');
    },

    /**
     * 수동 리프레시
     */
    refresh: async function() {
      CMSContentLoader.clearCache();
      await CMSContentLoader.loadAllSections();
    }
  };

  // 전역 노출
  window.CMSContentLoader = CMSContentLoader;

})(window, document);