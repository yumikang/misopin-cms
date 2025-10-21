#!/bin/bash

# 색상 출력을 위한 변수
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== HTML 파일 리소스 경로 업데이트 시작 ===${NC}"

# dist 폴더 파일들 업데이트
echo -e "\n${YELLOW}[1/2] dist 폴더 HTML 파일 업데이트 중...${NC}"
for file in dist/*.html; do
    if [ -f "$file" ]; then
        echo "Updating $(basename $file)..."
        
        # CSS 경로 업데이트
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/default.css?ver=171222|../css/vendor/default.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/r_quickmenu/style.css?ver=171222|../css/components/quickmenu.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/top_menu/style.css?ver=171222|../css/components/top_menu.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/sub_main_banner/style.css?ver=171222|../css/components/sub_main_banner.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/font-awesome/css/font-awesome.min.css|../css/vendor/font-awesome.min.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/aside/style.css?ver=171222|../css/components/aside.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/user.css?ver=171222|../css/vendor/user.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/page_style.css?ver=171222|../css/pages/page_style.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/swiper/swiper.min.css?ver=171222|../css/vendor/swiper.min.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/js/aos.css?ver=171222|../css/vendor/aos.css|g' "$file"
        
        # JS 경로 업데이트
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/js/aos.js|../js/vendor/aos.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/swiper/swiper.min.js|../js/vendor/swiper.min.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/common.js?ver=171222|../js/common.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/wrest.js?ver=171222|../js/wrest.js|g' "$file"
        
        # 외부 CDN은 유지 (jQuery from Google, feather-icons from unpkg)
        # 필요시 이것들도 로컬로 변경 가능
    fi
done

# 루트 폴더 파일들 업데이트
echo -e "\n${YELLOW}[2/2] 루트 폴더 HTML 파일 업데이트 중...${NC}"
for file in *.html; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # CSS 경로 업데이트
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/default.css?ver=171222|css/vendor/default.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/r_quickmenu/style.css?ver=171222|css/components/quickmenu.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/top_menu/style.css?ver=171222|css/components/top_menu.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/sub_main_banner/style.css?ver=171222|css/components/sub_main_banner.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/font-awesome/css/font-awesome.min.css|css/vendor/font-awesome.min.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/aside/style.css?ver=171222|css/components/aside.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/user.css?ver=171222|css/vendor/user.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/css/page_style.css?ver=171222|css/pages/page_style.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/swiper/swiper.min.css?ver=171222|css/vendor/swiper.min.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/js/aos.css?ver=171222|css/vendor/aos.css|g' "$file"
        
        # index.html 전용 CSS
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/index/main_banner/style.css?ver=171222|css/components/main_banner.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/include/inc01/style.css?ver=171222|css/components/inc01.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/include/inc02/style.css?ver=171222|css/components/inc02.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/include/inc03/style.css?ver=171222|css/components/inc03.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/include/inc04/style.css?ver=171222|css/components/inc04.css|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/include/inc05/style.css?ver=171222|css/components/inc05.css|g' "$file"
        
        # JS 경로 업데이트
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/html5.js|js/libs/html5.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/jquery-1.8.3.min.js|js/vendor/jquery-1.8.3.min.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/jquery-ui.js|js/vendor/jquery-ui.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/jquery.menu.js?ver=171222|js/vendor/jquery.menu.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/common.js?ver=171222|js/common.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/wrest.js?ver=171222|js/wrest.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/placeholders.min.js|js/libs/placeholders.min.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/js/feather.min.js|js/vendor/feather.min.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/hd/top_menu/script.js?ver=171222|js/components/top_menu.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/js/swiper/swiper.min.js?ver=171222|js/vendor/swiper.min.js|g' "$file"
        sed -i '' 's|https://skincare1007.shiningcorp.com/sh_img/js/aos.js|js/vendor/aos.js|g' "$file"
    fi
done

echo -e "\n${GREEN}=== 경로 업데이트 완료! ===${NC}"

# 결과 확인
echo -e "\n${BLUE}업데이트 결과 확인:${NC}"
echo "남은 외부 skincare1007 링크 개수:"
grep -h "skincare1007.shiningcorp.com" *.html dist/*.html 2>/dev/null | wc -l

echo -e "\n${GREEN}✅ 모든 HTML 파일의 리소스 경로가 로컬로 업데이트되었습니다!${NC}"