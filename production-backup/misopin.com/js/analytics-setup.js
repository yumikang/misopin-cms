/**
 * 미소핀의원 자체 분석 도구 설정
 * 
 * 사용 가능한 옵션:
 * 1. Google Analytics 4 (GA4)
 * 2. Naver Analytics
 * 3. 자체 개발 분석 시스템
 * 
 * 현재는 템플릿만 제공하며, 실제 구현시 주석 해제하여 사용
 */

// ===== Option 1: Google Analytics 4 =====
/*
// GA4 설정 - 실제 측정 ID로 교체 필요
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX'); // 실제 GA4 측정 ID로 교체

// 페이지뷰 추적
gtag('event', 'page_view', {
    page_title: document.title,
    page_location: window.location.href,
    page_path: window.location.pathname
});
*/

// ===== Option 2: Naver Analytics =====
/*
// 네이버 애널리틱스 설정
if(!wcs_add) var wcs_add = {};
wcs_add["wa"] = "XXXXXXXXXX"; // 실제 네이버 애널리틱스 ID로 교체
if(window.wcs) {
    wcs_do();
}
*/

// ===== Option 3: 자체 개발 분석 시스템 =====
/*
class MisopinAnalytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.userId = this.getUserId();
        this.init();
    }
    
    init() {
        // 페이지 로드 시 이벤트 전송
        this.trackPageView();
        
        // 클릭 이벤트 추적
        this.trackClicks();
        
        // 스크롤 깊이 추적
        this.trackScrollDepth();
        
        // 체류 시간 추적
        this.trackTimeOnPage();
    }
    
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getUserId() {
        // 로컬 스토리지에서 사용자 ID 가져오기 또는 생성
        let userId = localStorage.getItem('misopin_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('misopin_user_id', userId);
        }
        return userId;
    }
    
    trackPageView() {
        const data = {
            event: 'page_view',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: this.userId,
            page: {
                title: document.title,
                url: window.location.href,
                path: window.location.pathname,
                referrer: document.referrer
            },
            device: {
                userAgent: navigator.userAgent,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            }
        };
        
        // 자체 서버로 데이터 전송
        this.sendData(data);
    }
    
    trackClicks() {
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (target) {
                const data = {
                    event: 'click',
                    timestamp: new Date().toISOString(),
                    sessionId: this.sessionId,
                    element: {
                        type: target.tagName.toLowerCase(),
                        text: target.textContent.trim(),
                        href: target.href || null,
                        class: target.className || null,
                        id: target.id || null
                    }
                };
                this.sendData(data);
            }
        });
    }
    
    trackScrollDepth() {
        let maxScroll = 0;
        let scrollTimer = null;
        
        window.addEventListener('scroll', () => {
            const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                // 디바운싱 - 스크롤이 멈춘 후 전송
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    const data = {
                        event: 'scroll',
                        timestamp: new Date().toISOString(),
                        sessionId: this.sessionId,
                        scrollDepth: maxScroll
                    };
                    this.sendData(data);
                }, 1000);
            }
        });
    }
    
    trackTimeOnPage() {
        const startTime = Date.now();
        
        // 페이지 언로드 시 체류 시간 전송
        window.addEventListener('beforeunload', () => {
            const timeOnPage = Math.round((Date.now() - startTime) / 1000); // 초 단위
            const data = {
                event: 'time_on_page',
                timestamp: new Date().toISOString(),
                sessionId: this.sessionId,
                duration: timeOnPage,
                page: window.location.pathname
            };
            
            // sendBeacon을 사용하여 페이지 언로드 시에도 데이터 전송
            this.sendBeacon(data);
        });
    }
    
    sendData(data) {
        // 실제 구현 시 자체 서버 엔드포인트로 교체
        // fetch('/api/analytics', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify(data)
        // }).catch(error => console.error('Analytics error:', error));
        
        // 개발 중에는 콘솔에 출력
        console.log('Analytics:', data);
    }
    
    sendBeacon(data) {
        // 페이지 언로드 시에도 데이터를 전송하기 위해 sendBeacon 사용
        const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
        // navigator.sendBeacon('/api/analytics', blob);
        
        // 개발 중에는 콘솔에 출력
        console.log('Analytics Beacon:', data);
    }
}

// 자체 분석 시스템 초기화
// const analytics = new MisopinAnalytics();
*/

// ===== 임시: 개발사 추적 제거 알림 =====
console.log('✅ 샤이닝코프 추적 스크립트(designTail.js)가 제거되었습니다.');
console.log('📊 자체 분석 도구 설정은 analytics-setup.js 파일을 참고하세요.');