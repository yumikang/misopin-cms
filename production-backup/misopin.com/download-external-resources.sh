#!/bin/bash

# 색상 출력을 위한 변수
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 외부 리소스 로컬 다운로드 시작 ===${NC}"

# CSS 파일 다운로드
echo -e "\n${YELLOW}[1/2] CSS 파일 다운로드 중...${NC}"

# 기본 CSS
echo "Downloading default.css..."
curl -s "https://skincare1007.shiningcorp.com/css/default.css?ver=171222" -o css/vendor/default.css

echo "Downloading user.css..."
curl -s "https://skincare1007.shiningcorp.com/css/user.css?ver=171222" -o css/vendor/user.css

echo "Downloading page_style.css..."
curl -s "https://skincare1007.shiningcorp.com/css/page_style.css?ver=171222" -o css/pages/page_style.css

# 컴포넌트 CSS
echo "Downloading quickmenu style..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/hd/r_quickmenu/style.css?ver=171222" -o css/components/quickmenu.css

echo "Downloading top_menu style..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/hd/top_menu/style.css?ver=171222" -o css/components/top_menu.css

echo "Downloading sub_main_banner style..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/hd/sub_main_banner/style.css?ver=171222" -o css/components/sub_main_banner.css

echo "Downloading aside style..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/hd/aside/style.css?ver=171222" -o css/components/aside.css

echo "Downloading main_banner style..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/index/main_banner/style.css?ver=171222" -o css/components/main_banner.css

# Include 섹션 CSS (index.html용)
echo "Downloading include sections..."
for i in {1..5}; do
    curl -s "https://skincare1007.shiningcorp.com/sh_img/include/inc0${i}/style.css?ver=171222" -o css/components/inc0${i}.css
done

# 라이브러리 CSS
echo "Downloading swiper.min.css..."
curl -s "https://skincare1007.shiningcorp.com/js/swiper/swiper.min.css?ver=171222" -o css/vendor/swiper.min.css

echo "Downloading aos.css..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/js/aos.css?ver=171222" -o css/vendor/aos.css

echo "Downloading font-awesome..."
curl -s "https://skincare1007.shiningcorp.com/js/font-awesome/css/font-awesome.min.css" -o css/vendor/font-awesome.min.css

# JavaScript 파일 다운로드
echo -e "\n${YELLOW}[2/2] JavaScript 파일 다운로드 중...${NC}"

# 라이브러리 JS
echo "Downloading jQuery..."
curl -s "https://skincare1007.shiningcorp.com/js/jquery-1.8.3.min.js" -o js/vendor/jquery-1.8.3.min.js

echo "Downloading jQuery UI..."
curl -s "https://skincare1007.shiningcorp.com/js/jquery-ui.js" -o js/vendor/jquery-ui.js

echo "Downloading jQuery menu..."
curl -s "https://skincare1007.shiningcorp.com/js/jquery.menu.js?ver=171222" -o js/vendor/jquery.menu.js

echo "Downloading swiper.min.js..."
curl -s "https://skincare1007.shiningcorp.com/js/swiper/swiper.min.js?ver=171222" -o js/vendor/swiper.min.js

echo "Downloading aos.js..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/js/aos.js" -o js/vendor/aos.js

echo "Downloading feather.min.js..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/js/feather.min.js" -o js/vendor/feather.min.js

# 폴리필 및 유틸리티
echo "Downloading html5.js..."
curl -s "https://skincare1007.shiningcorp.com/js/html5.js" -o js/libs/html5.js

echo "Downloading placeholders.min.js..."
curl -s "https://skincare1007.shiningcorp.com/js/placeholders.min.js" -o js/libs/placeholders.min.js

# 커스텀 JS
echo "Downloading common.js..."
curl -s "https://skincare1007.shiningcorp.com/js/common.js?ver=171222" -o js/common.js

echo "Downloading wrest.js..."
curl -s "https://skincare1007.shiningcorp.com/js/wrest.js?ver=171222" -o js/wrest.js

echo "Downloading top_menu script..."
curl -s "https://skincare1007.shiningcorp.com/sh_img/hd/top_menu/script.js?ver=171222" -o js/components/top_menu.js

echo -e "\n${GREEN}=== 다운로드 완료! ===${NC}"

# 다운로드 결과 확인
echo -e "\n${YELLOW}다운로드된 파일 확인:${NC}"
echo "CSS 파일:"
find css -name "*.css" -type f | wc -l
echo "JS 파일:"
find js -name "*.js" -type f | wc -l

echo -e "\n${GREEN}✅ 모든 외부 리소스가 로컬로 다운로드되었습니다!${NC}"