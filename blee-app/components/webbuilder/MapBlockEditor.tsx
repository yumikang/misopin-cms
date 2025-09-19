'use client';

import React, { useState, useEffect } from 'react';
import { MapBlockContent } from '@/app/types/webbuilder';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, ZoomIn, ZoomOut } from 'lucide-react';

interface MapBlockEditorProps {
  content: MapBlockContent;
  onChange: (content: MapBlockContent) => void;
}

const MapBlockEditor: React.FC<MapBlockEditorProps> = ({ content, onChange }) => {
  const [address, setAddress] = useState(content.address || '');
  const [searchQuery, setSearchQuery] = useState('');

  // 기본 위치는 서울
  const defaultLat = 37.5665;
  const defaultLng = 126.9780;

  const handleLatChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat)) {
      onChange({ ...content, lat });
    }
  };

  const handleLngChange = (value: string) => {
    const lng = parseFloat(value);
    if (!isNaN(lng)) {
      onChange({ ...content, lng });
    }
  };

  const handleZoomChange = (value: string) => {
    const zoom = parseInt(value);
    if (!isNaN(zoom) && zoom >= 1 && zoom <= 20) {
      onChange({ ...content, zoom });
    }
  };

  const handleMarkerToggle = (checked: boolean) => {
    if (checked) {
      onChange({
        ...content,
        markers: content.markers || [{
          lat: content.lat,
          lng: content.lng,
          title: content.title || '위치',
          description: content.address || ''
        }]
      });
    } else {
      onChange({ ...content, markers: undefined });
    }
  };

  const updateMarker = (index: number, field: string, value: string | number) => {
    if (!content.markers) return;

    const updatedMarkers = [...content.markers];
    updatedMarkers[index] = {
      ...updatedMarkers[index],
      [field]: field === 'lat' || field === 'lng' ? parseFloat(value as string) : value
    };
    onChange({ ...content, markers: updatedMarkers });
  };

  const addMarker = () => {
    const newMarker = {
      lat: content.lat,
      lng: content.lng,
      title: `마커 ${(content.markers?.length || 0) + 1}`,
      description: ''
    };
    onChange({
      ...content,
      markers: [...(content.markers || []), newMarker]
    });
  };

  const removeMarker = (index: number) => {
    if (!content.markers) return;
    const updatedMarkers = content.markers.filter((_, i) => i !== index);
    onChange({ ...content, markers: updatedMarkers });
  };

  // 주요 위치 프리셋
  const presetLocations = [
    { name: '서울 시청', lat: 37.5665, lng: 126.9780 },
    { name: '강남역', lat: 37.4979, lng: 127.0276 },
    { name: '부산역', lat: 35.1152, lng: 129.0413 },
    { name: '제주 공항', lat: 33.5066, lng: 126.4932 },
    { name: '인천 공항', lat: 37.4602, lng: 126.4407 }
  ];

  const applyPreset = (preset: typeof presetLocations[0]) => {
    onChange({
      ...content,
      lat: preset.lat,
      lng: preset.lng,
      address: preset.name
    });
    setAddress(preset.name);
  };

  const searchAddress = () => {
    // 실제 구현에서는 Geocoding API를 사용
    alert('주소 검색 기능은 Geocoding API 연동이 필요합니다.');
  };

  return (
    <div className="space-y-6">
      {/* 기본 설정 */}
      <div className="space-y-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">지도 설정</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="map-title">지도 제목</Label>
            <Input
              id="map-title"
              value={content.title || ''}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="우리 병원 위치"
            />
          </div>

          <div>
            <Label htmlFor="map-provider">지도 제공자</Label>
            <Select
              value={content.provider || 'google'}
              onValueChange={(value: 'google' | 'naver' | 'kakao') =>
                onChange({ ...content, provider: value })
              }
            >
              <SelectTrigger id="map-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google">Google Maps</SelectItem>
                <SelectItem value="naver">네이버 지도</SelectItem>
                <SelectItem value="kakao">카카오맵</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 좌표 설정 */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="map-lat">위도 (Latitude)</Label>
            <Input
              id="map-lat"
              type="number"
              step="0.0001"
              value={content.lat}
              onChange={(e) => handleLatChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="map-lng">경도 (Longitude)</Label>
            <Input
              id="map-lng"
              type="number"
              step="0.0001"
              value={content.lng}
              onChange={(e) => handleLngChange(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="map-zoom">줌 레벨 (1-20)</Label>
            <Input
              id="map-zoom"
              type="number"
              min="1"
              max="20"
              value={content.zoom}
              onChange={(e) => handleZoomChange(e.target.value)}
            />
          </div>
        </div>

        {/* 주소 입력 */}
        <div>
          <Label htmlFor="map-address">주소</Label>
          <div className="flex gap-2">
            <Input
              id="map-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                onChange({ ...content, address: e.target.value });
              }}
              placeholder="서울특별시 중구 세종대로 110"
            />
            <Button onClick={searchAddress} size="sm">
              <Navigation size={16} className="mr-1" />
              검색
            </Button>
          </div>
        </div>

        {/* 프리셋 위치 */}
        <div>
          <Label>빠른 위치 선택</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {presetLocations.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 표시 옵션 */}
      <div className="space-y-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold">표시 옵션</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-controls"
              checked={content.showControls !== false}
              onCheckedChange={(checked) => onChange({ ...content, showControls: checked })}
            />
            <Label htmlFor="show-controls">컨트롤 표시</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="enable-scroll"
              checked={content.enableScroll !== false}
              onCheckedChange={(checked) => onChange({ ...content, enableScroll: checked })}
            />
            <Label htmlFor="enable-scroll">스크롤 줌 허용</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="enable-dragging"
              checked={content.enableDragging !== false}
              onCheckedChange={(checked) => onChange({ ...content, enableDragging: checked })}
            />
            <Label htmlFor="enable-dragging">드래그 이동 허용</Label>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="show-marker"
              checked={!!content.markers && content.markers.length > 0}
              onCheckedChange={handleMarkerToggle}
            />
            <Label htmlFor="show-marker">마커 표시</Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="map-width">너비</Label>
            <Input
              id="map-width"
              value={content.width || '100%'}
              onChange={(e) => onChange({ ...content, width: e.target.value })}
              placeholder="100% 또는 500px"
            />
          </div>

          <div>
            <Label htmlFor="map-height">높이</Label>
            <Input
              id="map-height"
              value={content.height || '400px'}
              onChange={(e) => onChange({ ...content, height: e.target.value })}
              placeholder="400px"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="map-style">지도 스타일</Label>
          <Select
            value={content.mapStyle || 'standard'}
            onValueChange={(value) => onChange({ ...content, mapStyle: value })}
          >
            <SelectTrigger id="map-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">표준</SelectItem>
              <SelectItem value="satellite">위성</SelectItem>
              <SelectItem value="hybrid">하이브리드</SelectItem>
              <SelectItem value="terrain">지형</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 마커 설정 */}
      {content.markers && content.markers.length > 0 && (
        <div className="space-y-4 p-4 border rounded bg-gray-50">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">마커 설정</h3>
            <Button size="sm" onClick={addMarker}>
              <MapPin size={16} className="mr-1" />
              마커 추가
            </Button>
          </div>

          <div className="space-y-3">
            {content.markers.map((marker, index) => (
              <div key={index} className="p-3 border rounded bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>제목</Label>
                    <Input
                      value={marker.title}
                      onChange={(e) => updateMarker(index, 'title', e.target.value)}
                      placeholder="마커 제목"
                    />
                  </div>
                  <div>
                    <Label>설명</Label>
                    <Input
                      value={marker.description || ''}
                      onChange={(e) => updateMarker(index, 'description', e.target.value)}
                      placeholder="마커 설명"
                    />
                  </div>
                  <div>
                    <Label>위도</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={marker.lat}
                      onChange={(e) => updateMarker(index, 'lat', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>경도</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={marker.lng}
                      onChange={(e) => updateMarker(index, 'lng', e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => removeMarker(index)}
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API 키 설정 안내 */}
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          <strong>참고:</strong> 지도를 표시하려면 선택한 지도 제공자의 API 키가 필요합니다.
          환경 변수에 다음과 같이 설정하세요:
        </p>
        <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
          <li>Google Maps: NEXT_PUBLIC_GOOGLE_MAPS_KEY</li>
          <li>네이버 지도: NEXT_PUBLIC_NAVER_MAPS_KEY</li>
          <li>카카오맵: NEXT_PUBLIC_KAKAO_MAPS_KEY</li>
        </ul>
      </div>
    </div>
  );
};

export default MapBlockEditor;