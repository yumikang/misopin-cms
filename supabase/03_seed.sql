-- ===============================================
-- 미소핀의원 CMS 기본 데이터 입력
-- ===============================================

-- ===============================================
-- 1. 시스템 설정 기본값
-- ===============================================

INSERT INTO public.system_settings (key, value, category, description) VALUES
-- 일반 설정
('site_name', '"미소핀의원"', 'general', '사이트 이름'),
('site_description', '"최고의 의료 서비스를 제공하는 미소핀의원입니다"', 'general', '사이트 설명'),
('site_logo', '"/images/logo.png"', 'general', '사이트 로고 경로'),
('site_favicon', '"/favicon.ico"', 'general', '파비콘 경로'),
('contact_phone', '"02-1234-5678"', 'general', '대표 전화번호'),
('contact_email', '"info@misopin.com"', 'general', '대표 이메일'),
('contact_address', '"서울시 강남구 테헤란로 123 미소핀빌딩"', 'general', '병원 주소'),
('business_hours', '{"weekday": "09:00-18:00", "saturday": "09:00-13:00", "sunday": "휴진"}', 'general', '진료 시간'),

-- 이메일 설정
('smtp_host', '"smtp.gmail.com"', 'email', 'SMTP 서버 주소'),
('smtp_port', '587', 'email', 'SMTP 포트'),
('smtp_secure', 'true', 'email', 'SMTP 보안 연결'),
('smtp_username', '""', 'email', 'SMTP 사용자명'),
('smtp_password', '""', 'email', 'SMTP 비밀번호'),
('email_from_name', '"미소핀의원"', 'email', '발신자 이름'),
('email_from_address', '"noreply@misopin.com"', 'email', '발신자 이메일'),

-- 보안 설정
('session_timeout', '3600', 'security', '세션 만료 시간(초)'),
('password_min_length', '8', 'security', '최소 비밀번호 길이'),
('password_require_special', 'true', 'security', '특수문자 필수 여부'),
('password_require_number', 'true', 'security', '숫자 필수 여부'),
('max_login_attempts', '5', 'security', '최대 로그인 시도 횟수'),
('lockout_duration', '1800', 'security', '계정 잠금 시간(초)'),

-- 업로드 설정
('max_file_size', '10485760', 'upload', '최대 파일 크기(bytes) - 10MB'),
('allowed_image_types', '["image/jpeg", "image/png", "image/gif", "image/webp"]', 'upload', '허용 이미지 타입'),
('allowed_document_types', '["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]', 'upload', '허용 문서 타입'),
('image_quality', '85', 'upload', '이미지 압축 품질(0-100)'),
('auto_optimize_images', 'true', 'upload', '이미지 자동 최적화'),
('generate_thumbnails', 'true', 'upload', '썸네일 생성 여부'),
('thumbnail_width', '300', 'upload', '썸네일 너비'),
('thumbnail_height', '300', 'upload', '썸네일 높이')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

-- ===============================================
-- 2. 관리자 계정 생성
-- 비밀번호: Admin123
-- bcrypt 해시: $2b$10$A502jYvVot0qGGMFr43jzeuUDAe5weAJYFIHirYs5VfHphMyTZq6e
-- ===============================================

INSERT INTO public.users (email, name, password, role) VALUES
('super@misopin.com', '최고 관리자', '$2b$10$A502jYvVot0qGGMFr43jzeuUDAe5weAJYFIHirYs5VfHphMyTZq6e', 'SUPER_ADMIN'),
('admin@misopin.com', '일반 관리자', '$2b$10$A502jYvVot0qGGMFr43jzeuUDAe5weAJYFIHirYs5VfHphMyTZq6e', 'ADMIN'),
('editor@misopin.com', '콘텐츠 편집자', '$2b$10$A502jYvVot0qGGMFr43jzeuUDAe5weAJYFIHirYs5VfHphMyTZq6e', 'EDITOR')
ON CONFLICT (email) DO NOTHING;

-- ===============================================
-- 3. 기본 페이지 생성
-- ===============================================

INSERT INTO public.pages (slug, title, content, is_published, published_at) VALUES
('home', '홈', '{"sections": [{"type": "hero", "title": "미소핀의원", "content": "최고의 의료 서비스를 제공합니다"}]}', true, NOW()),
('about', '병원소개', '{"sections": [{"type": "text", "title": "미소핀의원 소개", "content": "1998년 설립 이래 최고의 의료 서비스를 제공하고 있습니다."}]}', true, NOW()),
('services', '진료안내', '{"sections": [{"type": "services", "title": "진료 과목", "items": ["내과", "외과", "정형외과", "피부과"]}]}', true, NOW()),
('location', '오시는길', '{"sections": [{"type": "map", "title": "찾아오시는 길", "address": "서울시 강남구 테헤란로 123"}]}', true, NOW()),
('privacy', '개인정보처리방침', '{"sections": [{"type": "text", "title": "개인정보처리방침", "content": "미소핀의원은 개인정보를 소중히 다룹니다."}]}', true, NOW()),
('terms', '이용약관', '{"sections": [{"type": "text", "title": "이용약관", "content": "본 약관은 미소핀의원 웹사이트 이용에 관한 내용입니다."}]}', true, NOW())
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    updated_at = NOW();

-- ===============================================
-- 4. 샘플 게시글
-- ===============================================

INSERT INTO public.board_posts (board_type, title, content, excerpt, author, is_published, is_pinned, published_at) VALUES
-- 공지사항
('NOTICE', '코로나19 방역 지침 안내', '병원 내 마스크 착용을 의무화하고 있습니다. 발열 체크 후 입장 가능합니다.', '코로나19 방역 수칙을 준수해주세요', '관리자', true, true, NOW()),
('NOTICE', '진료 시간 변경 안내', '3월부터 평일 진료 시간이 오후 7시까지로 연장됩니다.', '진료 시간이 변경됩니다', '관리자', true, false, NOW()),
('NOTICE', '주차장 이용 안내', '병원 방문 시 2시간 무료 주차가 가능합니다.', '주차 안내', '관리자', true, false, NOW()),

-- 이벤트
('EVENT', '정기 건강검진 할인 이벤트', '3월 한 달간 종합검진 20% 할인 이벤트를 진행합니다.', '건강검진 할인 이벤트', '마케팅팀', true, true, NOW()),
('EVENT', '신규 환자 특별 혜택', '처음 방문하시는 분들께 초진료 50% 할인 혜택을 드립니다.', '신규 환자 혜택', '마케팅팀', true, false, NOW()),
('EVENT', '독감 예방접종 캠페인', '독감 예방접종을 특별 가격에 제공합니다.', '독감 예방접종', '마케팅팀', true, false, NOW())
ON CONFLICT DO NOTHING;

-- ===============================================
-- 5. 샘플 팝업
-- ===============================================

INSERT INTO public.popups (title, content, display_type, position, is_active, start_date, end_date, priority) VALUES
('휴진 안내', '3월 1일은 삼일절로 휴진입니다.', 'BANNER', 'TOP', true, NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', 1),
('건강검진 이벤트', '종합검진 20% 할인 이벤트 진행중!\n자세한 내용은 이벤트 페이지를 확인하세요.', 'MODAL', 'CENTER', true, NOW(), NOW() + INTERVAL '30 days', 2),
('코로나19 안내', '병원 내 마스크 착용 필수', 'TOAST', 'BOTTOM', true, NOW(), NOW() + INTERVAL '90 days', 3)
ON CONFLICT DO NOTHING;

-- ===============================================
-- 6. 샘플 예약
-- ===============================================

INSERT INTO public.reservations (
    patient_name, phone, email, birth_date, gender,
    treatment_type, service, preferred_date, preferred_time,
    status, notes
) VALUES
('김철수', '010-1234-5678', 'kim@example.com', '1980-05-15', 'MALE', 'FIRST_VISIT', '정기검진', CURRENT_DATE + INTERVAL '1 day', '10:00', 'PENDING', '첫 방문입니다'),
('이영희', '010-2345-6789', 'lee@example.com', '1992-08-22', 'FEMALE', 'FOLLOW_UP', '피부과 진료', CURRENT_DATE + INTERVAL '2 days', '14:00', 'CONFIRMED', '여드름 치료 상담'),
('박민수', '010-3456-7890', 'park@example.com', '1975-12-10', 'MALE', 'FIRST_VISIT', '건강검진', CURRENT_DATE + INTERVAL '3 days', '09:00', 'PENDING', '종합검진 희망'),
('최지은', '010-4567-8901', NULL, '1988-03-28', 'FEMALE', 'FOLLOW_UP', '내과 진료', CURRENT_DATE, '15:30', 'COMPLETED', '정기 진료')
ON CONFLICT DO NOTHING;

-- ===============================================
-- 7. 통계 확인
-- ===============================================

DO $$
DECLARE
    user_count INTEGER;
    page_count INTEGER;
    post_count INTEGER;
    popup_count INTEGER;
    reservation_count INTEGER;
    setting_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO page_count FROM public.pages;
    SELECT COUNT(*) INTO post_count FROM public.board_posts;
    SELECT COUNT(*) INTO popup_count FROM public.popups;
    SELECT COUNT(*) INTO reservation_count FROM public.reservations;
    SELECT COUNT(*) INTO setting_count FROM public.system_settings;

    RAISE NOTICE '====================================';
    RAISE NOTICE '데이터 입력 완료!';
    RAISE NOTICE '- 사용자: % 명', user_count;
    RAISE NOTICE '- 페이지: % 개', page_count;
    RAISE NOTICE '- 게시글: % 개', post_count;
    RAISE NOTICE '- 팝업: % 개', popup_count;
    RAISE NOTICE '- 예약: % 건', reservation_count;
    RAISE NOTICE '- 설정: % 개', setting_count;
    RAISE NOTICE '====================================';
    RAISE NOTICE '기본 관리자 계정:';
    RAISE NOTICE '- super@misopin.com / Admin123';
    RAISE NOTICE '- admin@misopin.com / Admin123';
    RAISE NOTICE '- editor@misopin.com / Admin123';
    RAISE NOTICE '====================================';
END $$;