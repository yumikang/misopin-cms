import React, { ReactElement } from 'react';
import { ContentBlockData, MapBlockContent } from '@/app/types/webbuilder';
import { BaseBlockRenderer, RenderUtils } from './BlockRenderer';

// Google Maps type declarations
interface GoogleMapsAPI {
  maps: {
    Map: new (element: HTMLElement, options: GoogleMapOptions) => GoogleMap;
    Marker: new (options: GoogleMarkerOptions) => GoogleMarker;
    InfoWindow: new (options: { content: string }) => GoogleInfoWindow;
    MapTypeId: {
      ROADMAP: string;
      SATELLITE: string;
      HYBRID: string;
      TERRAIN: string;
    };
  };
}

interface GoogleMapOptions {
  zoom: number;
  center: { lat: number; lng: number };
  mapTypeId: string;
}

interface GoogleMap {
  // Google Maps instance
  [key: string]: unknown;
}

interface GoogleMarkerOptions {
  position: { lat: number; lng: number };
  map: GoogleMap;
  title?: string;
}

interface GoogleMarker {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleInfoWindow {
  open: (map: GoogleMap, marker: GoogleMarker) => void;
}

declare global {
  interface Window {
    google?: GoogleMapsAPI;
    initGoogleMap?: () => void;
  }
}

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
      (content.lat && content.lng) ||
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
        lat,
        lng,
        address,
        zoom = 15,
        title: markerTitle,
        provider = 'google'
      } = content;

      // Default rendering options
      const mapType = 'roadmap';
      const width = '100%';
      const height = '400px';
      const showMarker = true;

      const tailwindClasses = this.generateTailwindClasses(block);
      const mapId = `map-${Math.random().toString(36).substr(2, 9)}`;

      let mapHTML = '';

      if (lat && lng) {
        // 좌표 기반 지도
        mapHTML = this.generateCoordinateMapHTML(mapId, {
          lat,
          lng,
          zoom,
          mapType,
          width,
          height,
          showMarker,
          markerTitle,
          provider
        });
      } else if (address) {
        // 주소 기반 임베드 지도
        mapHTML = this.generateAddressMapHTML(address, width, height, zoom);
      } else {
        throw new Error('지도 데이터가 부족합니다. 좌표(lat/lng) 또는 address가 필요합니다.');
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
  renderToReact(block: ContentBlockData): ReactElement {
    try {
      if (!this.validate(block)) {
        throw new Error('Invalid map block data');
      }

      const content = block.content as MapBlockContent;
      const {
        lat,
        lng,
        address,
        zoom = 15,
        title: markerTitle,
        provider = 'google'
      } = content;

      // Default rendering options
      const mapType = 'roadmap';
      const width = '100%';
      const height = '400px';
      const showMarker = true;

      const tailwindClasses = this.generateTailwindClasses(block);
      const className = `cms-map-block ${tailwindClasses}`;
      const inlineStyles = this.generateInlineStyles(block);

      return (
        <div className={className} style={inlineStyles}>
          <div className="map-container" style={{ width, height }}>
            <MapComponent
              lat={lat}
              lng={lng}
              address={address}
              zoom={zoom}
              mapType={mapType}
              showMarker={showMarker}
              markerTitle={markerTitle}
              provider={provider}
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
   * 좌표 기반 지도 HTML 생성
   */
  private generateCoordinateMapHTML(mapId: string, options: {
    lat: number;
    lng: number;
    zoom: number;
    mapType: string;
    width: string;
    height: string;
    showMarker: boolean;
    markerTitle?: string;
    provider: string;
  }): string {
    // Simple coordinate-based map display
    return `
      <div class="coordinate-map" style="width: 100%; height: 100%; border-radius: 8px; background: #f3f4f6; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280;">
        <div class="map-icon" style="font-size: 48px; margin-bottom: 12px;">📍</div>
        <div class="coordinates" style="font-size: 14px; font-weight: 500;">
          위도: ${options.lat.toFixed(6)}, 경도: ${options.lng.toFixed(6)}
        </div>
        ${options.markerTitle ? `<div style="font-size: 12px; margin-top: 8px; text-align: center;">${this.escapeHtml(options.markerTitle)}</div>` : ''}
        <div style="font-size: 12px; margin-top: 8px; color: #9ca3af;">
          지도 제공: ${options.provider}
        </div>
      </div>
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
    lat: number;
    lng: number;
    zoom: number;
    mapType: string;
    showMarker: boolean;
    markerTitle?: string;
  }): string {
    return `
      function initMap_${mapId}() {
        const mapCenter = { lat: ${options.lat}, lng: ${options.lng} };

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
  private validateCoordinates(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 && lat <= 90 &&
      lng >= -180 && lng <= 180
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
  lat?: number;
  lng?: number;
  address?: string;
  zoom: number;
  mapType: string;
  showMarker: boolean;
  markerTitle?: string;
  provider: string;
}

function MapComponent({
  lat,
  lng,
  address,
  zoom,
  mapType,
  showMarker,
  markerTitle,
  provider
}: MapComponentProps): ReactElement {
  const mapRef = React.useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Simple coordinate display - no external API required
    return;
  }, [lat, lng, zoom, mapType, showMarker, markerTitle, provider]);

  if (mapError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded text-gray-500">
        {mapError}
      </div>
    );
  }

  if (address && !lat && !lng) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded text-gray-600 p-4">
        <div className="text-4xl mb-3">📍</div>
        <div className="text-sm font-medium mb-2">주소 기반 지도</div>
        <div className="text-xs text-center">{address}</div>
        <div className="text-xs mt-2 text-gray-500">지도 제공: {provider}</div>
      </div>
    );
  }

  if (lat && lng) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded text-gray-600 p-4">
        <div className="text-4xl mb-3">📍</div>
        <div className="text-sm font-medium mb-2">
          위도: {lat.toFixed(6)}, 경도: {lng.toFixed(6)}
        </div>
        {markerTitle && (
          <div className="text-xs text-center mb-2">{markerTitle}</div>
        )}
        <div className="text-xs text-gray-500">지도 제공: {provider}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded text-gray-500">
      지도 데이터가 부족합니다.
    </div>
  );
}