import React from 'react';
import { ContentBlockData, MapBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

/**
 * 지도 블록 렌더러
 * Google Maps, 네이버 지도, 카카오맵 임베드 지원
 */
export class MapBlockRenderer extends BaseBlockRenderer {
  /**
   * 지도 블록 유효성 검증
   */
  validate(block: ContentBlockData): boolean {
    if (!super.validate(block) || block.type !== 'MAP') {
      return false;
    }

    const content = block.content as MapBlockContent;
    return !!(content && (
      content.embedUrl ||
      (content.latitude && content.longitude) ||
      content.address
    ));
  }

  /**
   * HTML 문자열로 렌더링
   */
  renderToHTML(block: ContentBlockData): string {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid map block data');
      }

      const content = block.content as MapBlockContent;
      const {
        embedUrl,
        latitude,
        longitude,
        address,
        zoom = 15,
        mapType = 'roadmap',
        width = '100%',
        height = '400px',
        showMarker = true,
        markerTitle,
        apiKey
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const mapId = `map-${Math.random().toString(36).substr(2, 9)}`;

      let mapHTML = '';

      if (embedUrl) {
        // 직접 임베드 URL 사용
        mapHTML = this.generateEmbedMapHTML(embedUrl, width, height);
      } else if (latitude && longitude && apiKey) {
        // Google Maps API를 사용한 동적 지도
        mapHTML = this.generateDynamicMapHTML(mapId, {
          latitude,
          longitude,
          zoom,
          mapType,
          width,
          height,
          showMarker,
          markerTitle,
          apiKey
        });
      } else if (address) {
        // 주소 기반 임베드 지도
        mapHTML = this.generateAddressMapHTML(address, width, height, zoom);
      } else {
        throw new Error('지도 데이터가 부족합니다. embedUrl, 좌표(latitude/longitude), 또는 address가 필요합니다.');
      }

      // 기본 지도 컨테이너 생성
      const baseHTML = `
        <div class="cms-map-block ${tailwindClasses}">
          <div class="map-container" style="width: ${width}; height: ${height};">
            ${mapHTML}
          </div>
        </div>
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
        throw new Error('Invalid map block data');
      }

      const content = block.content as MapBlockContent;
      const {
        embedUrl,
        latitude,
        longitude,
        address,
        zoom = 15,
        mapType = 'roadmap',
        width = '100%',
        height = '400px',
        showMarker = true,
        markerTitle,
        apiKey
      } = content;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-map-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      return (
        <div className={className} style={inlineStyles}>
          <div className="map-container" style={{ width, height }}>
            <MapComponent
              embedUrl={embedUrl}
              latitude={latitude}
              longitude={longitude}
              address={address}
              zoom={zoom}
              mapType={mapType}
              showMarker={showMarker}
              markerTitle={markerTitle}
              apiKey={apiKey}
            />
          </div>
        </div>
      );

    } catch (error) {
      return (
        <div className="cms-block cms-block-error p-4 border border-red-300 bg-red-50 rounded">
          <p className="text-red-700 text-sm">
            <strong>렌더링 오류:</strong> {block.name || 'MAP 블록'}
          </p>
          <p className="text-red-600 text-xs mt-1">
            {(error as Error).message}
          </p>
        </div>
      );
    }
  }

  /**
   * 임베드 지도 HTML 생성
   */
  private generateEmbedMapHTML(embedUrl: string, width: string, height: string): string {
    return `
      <iframe
        src="${this.escapeAttribute(embedUrl)}"
        width="${width}"
        height="${height}"
        style="border:0;"
        allowfullscreen=""
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="지도"
        role="application"
        aria-label="임베드 지도"
      ></iframe>
    `;
  }

  /**
   * 동적 Google Maps HTML 생성
   */
  private generateDynamicMapHTML(mapId: string, options: {
    latitude: number;
    longitude: number;
    zoom: number;
    mapType: string;
    width: string;
    height: string;
    showMarker: boolean;
    markerTitle?: string;
    apiKey: string;
  }): string {
    const mapScript = this.generateMapScript(mapId, options);

    return `
      <div id="${mapId}" style="width: 100%; height: 100%; border-radius: 8px;"></div>
      <script async defer src="https://maps.googleapis.com/maps/api/js?key=${options.apiKey}&callback=initMap_${mapId}">
      </script>
      <script>
        ${mapScript}
      </script>
    `;
  }

  /**
   * 주소 기반 임베드 지도 HTML 생성
   */
  private generateAddressMapHTML(address: string, width: string, height: string, zoom: number): string {
    const encodedAddress = encodeURIComponent(address);
    const embedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}&zoom=${zoom}`;

    return `
      <iframe
        src="${embedUrl}"
        width="${width}"
        height="${height}"
        style="border:0;"
        allowfullscreen=""
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="지도 - ${this.escapeAttribute(address)}"
        role="application"
        aria-label="주소 기반 지도: ${this.escapeAttribute(address)}"
      ></iframe>
      <div class="map-address-info mt-2 text-sm text-gray-600">
        📍 ${this.escapeHtml(address)}
      </div>
    `;
  }

  /**
   * Google Maps JavaScript 코드 생성
   */
  private generateMapScript(mapId: string, options: {
    latitude: number;
    longitude: number;
    zoom: number;
    mapType: string;
    showMarker: boolean;
    markerTitle?: string;
  }): string {
    return `
      function initMap_${mapId}() {
        const mapCenter = { lat: ${options.latitude}, lng: ${options.longitude} };

        const map = new google.maps.Map(document.getElementById('${mapId}'), {
          zoom: ${options.zoom},
          center: mapCenter,
          mapTypeId: google.maps.MapTypeId.${options.mapType.toUpperCase()},
          styles: [
            {
              featureType: 'all',
              elementType: 'geometry.fill',
              stylers: [{ weight: '2.00' }]
            },
            {
              featureType: 'all',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#9c9c9c' }]
            }
          ]
        });

        ${options.showMarker ? `
          const marker = new google.maps.Marker({
            position: mapCenter,
            map: map,
            title: '${options.markerTitle ? this.escapeAttribute(options.markerTitle) : '위치 마커'}',
            animation: google.maps.Animation.DROP
          });

          ${options.markerTitle ? `
            const infoWindow = new google.maps.InfoWindow({
              content: '<div style="padding: 8px;"><strong>${this.escapeHtml(options.markerTitle)}</strong></div>'
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });
          ` : ''}
        ` : ''}
      }

      // 전역 함수로 등록
      window.initMap_${mapId} = initMap_${mapId};
    `;
  }

  /**
   * 지도 서비스 감지
   */
  private detectMapService(url: string): 'google' | 'naver' | 'kakao' | 'unknown' {
    if (url.includes('google.com/maps') || url.includes('maps.google.com')) {
      return 'google';
    } else if (url.includes('map.naver.com') || url.includes('naver.me')) {
      return 'naver';
    } else if (url.includes('map.kakao.com') || url.includes('place.map.kakao.com')) {
      return 'kakao';
    } else {
      return 'unknown';
    }
  }

  /**
   * 좌표 유효성 검증
   */
  private validateCoordinates(latitude: number, longitude: number): boolean {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
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
 * React 지도 컴포넌트
 */
interface MapComponentProps {
  embedUrl?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  zoom: number;
  mapType: string;
  showMarker: boolean;
  markerTitle?: string;
  apiKey?: string;
}

function MapComponent({
  embedUrl,
  latitude,
  longitude,
  address,
  zoom,
  mapType,
  showMarker,
  markerTitle,
  apiKey
}: MapComponentProps): JSX.Element {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (embedUrl) {
      // 임베드 URL이 있으면 iframe 사용
      return;
    }

    if (latitude && longitude && apiKey) {
      // Google Maps API 로드 및 초기화
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`;
      script.async = true;
      script.defer = true;

      (window as any).initGoogleMap = () => {
        if (mapRef.current && (window as any).google) {
          try {
            const map = new (window as any).google.maps.Map(mapRef.current, {
              zoom,
              center: { lat: latitude, lng: longitude },
              mapTypeId: (window as any).google.maps.MapTypeId[mapType.toUpperCase()]
            });

            if (showMarker) {
              const marker = new (window as any).google.maps.Marker({
                position: { lat: latitude, lng: longitude },
                map,
                title: markerTitle || '위치 마커'
              });

              if (markerTitle) {
                const infoWindow = new (window as any).google.maps.InfoWindow({
                  content: `<div style="padding: 8px;"><strong>${markerTitle}</strong></div>`
                });

                marker.addListener('click', () => {
                  infoWindow.open(map, marker);
                });
              }
            }
          } catch (error) {
            setMapError('지도를 로드하는 중 오류가 발생했습니다.');
          }
        }
      };

      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
        delete (window as any).initGoogleMap;
      };
    }
  }, [latitude, longitude, zoom, mapType, showMarker, markerTitle, apiKey]);

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded text-gray-500">
        {mapError}
      </div>
    );
  }

  if (embedUrl) {
    return (
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: '8px' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title="지도"
        role="application"
        aria-label="임베드 지도"
      />
    );
  }

  if (address && !latitude && !longitude) {
    const encodedAddress = encodeURIComponent(address);
    const googleEmbedUrl = `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}&zoom=${zoom}`;

    return (
      <div>
        <iframe
          src={googleEmbedUrl}
          width="100%"
          height="100%"
          style={{ border: 0, borderRadius: '8px' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`지도 - ${address}`}
          role="application"
          aria-label={`주소 기반 지도: ${address}`}
        />
        <div className="mt-2 text-sm text-gray-600">
          📍 {address}
        </div>
      </div>
    );
  }

  if (latitude && longitude && apiKey) {
    return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px' }} />;
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded text-gray-500">
      지도 데이터가 부족합니다.
    </div>
  );
}