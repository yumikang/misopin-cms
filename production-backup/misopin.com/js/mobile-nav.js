/**
 * mobile-nav.js - 모바일 네비게이션 스크립트
 */

// 카카오톡 상담 기능
function openKakaoChat() {
    // 모바일에서 카카오톡 앱으로 연결 시도
    if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        window.open('https://pf.kakao.com/_xjxbxbxj', '_blank');
    } else {
        // PC에서는 카카오톡 플러스친구 웹 버전으로 연결
        window.open('https://pf.kakao.com/_xjxbxbxj', '_blank');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 모바일 감지
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    // 햄버거 메뉴 요소
    const navBtn = document.getElementById('navBtn');
    const navWrap = document.getElementById('navWrap');
    const body = document.body;
    
    // 햄버거 메뉴 토글
    if (navBtn && navWrap) {
        navBtn.addEventListener('click', function() {
            const isOpen = navBtn.classList.contains('on');
            
            if (isOpen) {
                // 메뉴 닫기
                navBtn.classList.remove('on');
                navWrap.classList.remove('on');
                navWrap.style.display = 'none';
                body.style.overflow = '';
            } else {
                // 메뉴 열기
                navBtn.classList.add('on');
                navWrap.style.display = 'block';
                setTimeout(() => {
                    navWrap.classList.add('on');
                }, 10);
                body.style.overflow = 'hidden';
            }
        });
        
        // 배경 클릭시 메뉴 닫기
        navWrap.addEventListener('click', function(e) {
            if (e.target === navWrap) {
                navBtn.classList.remove('on');
                navWrap.classList.remove('on');
                setTimeout(() => {
                    navWrap.style.display = 'none';
                }, 400);
                body.style.overflow = '';
            }
        });
    }
    
    // 서브메뉴 토글
    const bmenus = document.querySelectorAll('.bmenu');
    
    bmenus.forEach(function(bmenu) {
        bmenu.addEventListener('click', function() {
            const isOpen = bmenu.classList.contains('on');
            const smenu = bmenu.nextElementSibling;
            
            // 다른 메뉴 닫기
            bmenus.forEach(function(otherMenu) {
                if (otherMenu !== bmenu) {
                    otherMenu.classList.remove('on');
                    const otherSmenu = otherMenu.nextElementSibling;
                    if (otherSmenu && otherSmenu.classList.contains('smenu')) {
                        otherSmenu.style.display = 'none';
                    }
                }
            });
            
            // 현재 메뉴 토글
            if (isOpen) {
                bmenu.classList.remove('on');
                if (smenu && smenu.classList.contains('smenu')) {
                    smenu.style.display = 'none';
                }
            } else {
                bmenu.classList.add('on');
                if (smenu && smenu.classList.contains('smenu')) {
                    smenu.style.display = 'block';
                }
            }
        });
    });
    
    // 플로팅 전화 버튼 스크롤 효과
    const fixTel = document.getElementById('fix_tel');
    
    if (fixTel && isMobile) {
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // 스크롤 100px 이상일 때만 표시
            if (scrollTop > 100) {
                fixTel.classList.add('active');
            } else {
                fixTel.classList.remove('active');
            }
            
            lastScrollTop = scrollTop;
        });
    }
    
    // 윈도우 리사이즈 처리
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const newIsMobile = window.matchMedia('(max-width: 768px)').matches;
            
            // 데스크톱으로 변경시 모바일 메뉴 초기화
            if (!newIsMobile) {
                if (navBtn) navBtn.classList.remove('on');
                if (navWrap) {
                    navWrap.classList.remove('on');
                    navWrap.style.display = 'none';
                }
                body.style.overflow = '';
                
                // 서브메뉴 초기화
                bmenus.forEach(function(bmenu) {
                    bmenu.classList.remove('on');
                    const smenu = bmenu.nextElementSibling;
                    if (smenu && smenu.classList.contains('smenu')) {
                        smenu.style.display = 'none';
                    }
                });
            }
        }, 250);
    });
    
    // 스크롤 탭 메뉴 (선택적)
    const rollMn = document.getElementById('roll_mn');
    
    if (rollMn) {
        const rollLinks = rollMn.querySelectorAll('ul li a');
        const currentPath = window.location.pathname;
        
        rollLinks.forEach(function(link) {
            // 현재 페이지 활성화
            if (link.getAttribute('href') === currentPath) {
                link.parentElement.classList.add('on');
            }
            
            // 클릭 이벤트
            link.addEventListener('click', function(e) {
                // 앵커 링크인 경우 스무스 스크롤
                if (link.getAttribute('href').startsWith('#')) {
                    e.preventDefault();
                    const targetId = link.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });
    }
});