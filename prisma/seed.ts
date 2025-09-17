import { PrismaClient, UserRole, ReservationStatus, Gender, TreatmentType, PopupType, BoardType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin users
  const adminPassword = await hash("admin123", 12);
  const editorPassword = await hash("editor123", 12);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@misopin.com" },
    update: {},
    create: {
      email: "admin@misopin.com",
      name: "슈퍼 관리자",
      password: adminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: "manager@misopin.com" },
    update: {},
    create: {
      email: "manager@misopin.com",
      name: "일반 관리자",
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  // Create Editor
  const editor = await prisma.user.upsert({
    where: { email: "editor@misopin.com" },
    update: {},
    create: {
      email: "editor@misopin.com",
      name: "편집자",
      password: editorPassword,
      role: UserRole.EDITOR,
      isActive: true,
    },
  });

  // Create sample reservations
  const sampleReservations = [
    {
      patientName: "김철수",
      phone: "010-1234-5678",
      email: "kim@example.com",
      birthDate: new Date("1990-05-15"),
      gender: Gender.MALE,
      treatmentType: TreatmentType.FIRST_VISIT,
      service: "목 디스크 치료",
      preferredDate: new Date("2024-01-15"),
      preferredTime: "14:00",
      status: ReservationStatus.CONFIRMED,
      notes: "목이 자주 아파서 검사받고 싶습니다.",
    },
    {
      patientName: "박영희",
      phone: "010-9876-5432",
      email: "park@example.com",
      birthDate: new Date("1985-08-22"),
      gender: Gender.FEMALE,
      treatmentType: TreatmentType.FOLLOW_UP,
      service: "허리 통증 재검",
      preferredDate: new Date("2024-01-16"),
      preferredTime: "10:30",
      status: ReservationStatus.PENDING,
      notes: "지난번 치료 후 상태 확인",
      adminNotes: "정기 재검 환자",
    },
    {
      patientName: "이민수",
      phone: "010-5555-7777",
      birthDate: new Date("1992-12-10"),
      gender: Gender.MALE,
      treatmentType: TreatmentType.FIRST_VISIT,
      service: "어깨 통증 검사",
      preferredDate: new Date("2024-01-17"),
      preferredTime: "16:00",
      status: ReservationStatus.COMPLETED,
      notes: "운동 중 어깨 부상",
    },
    {
      patientName: "최수연",
      phone: "010-2222-8888",
      email: "choi@example.com",
      birthDate: new Date("1988-03-05"),
      gender: Gender.FEMALE,
      treatmentType: TreatmentType.FIRST_VISIT,
      service: "무릎 관절 검사",
      preferredDate: new Date("2024-01-18"),
      preferredTime: "11:00",
      status: ReservationStatus.CANCELLED,
      notes: "갑작스런 일정 변경으로 취소",
      adminNotes: "환자 요청으로 취소",
    },
  ];

  for (const reservation of sampleReservations) {
    await prisma.reservation.create({
      data: reservation,
    });
  }

  // Create sample popups
  const samplePopups = [
    {
      title: "신규 환자 할인 이벤트",
      content: "처음 방문하시는 환자분들께 20% 할인 혜택을 드립니다. 2024년 2월 말까지 진행되니 놓치지 마세요!",
      imageUrl: null,
      linkUrl: "/reservation",
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-02-29"),
      position: { x: 50, y: 50, width: 400, height: 300 },
      showOnPages: ["home", "about"],
      displayType: PopupType.MODAL,
      priority: 3,
      isActive: true,
    },
    {
      title: "설날 연휴 휴진 안내",
      content: "설날 연휴 기간 동안 휴진합니다. 2024년 2월 9일(금) ~ 2월 12일(월) 휴진. 응급 상황 시 연락처를 확인해주세요.",
      imageUrl: null,
      linkUrl: null,
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-02-15"),
      position: { x: 0, y: 0, width: 100, height: 80 },
      showOnPages: [],
      displayType: PopupType.BANNER,
      priority: 5,
      isActive: true,
    },
    {
      title: "건강한 척추 관리법",
      content: "일상생활에서 실천할 수 있는 척추 건강 관리 팁을 확인하세요. 건강한 삶의 첫 걸음입니다.",
      imageUrl: null,
      linkUrl: "/health-tips",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-12-31"),
      position: { x: 80, y: 20, width: 320, height: 250 },
      showOnPages: ["home"],
      displayType: PopupType.SLIDE_IN,
      priority: 1,
      isActive: false,
    },
    {
      title: "진료시간 변경 안내",
      content: "3월부터 토요일 진료시간이 변경됩니다. 토요일: 오전 9시 ~ 오후 2시까지 진료합니다.",
      imageUrl: null,
      linkUrl: null,
      startDate: new Date("2024-02-20"),
      endDate: new Date("2024-03-10"),
      position: { x: 50, y: 50, width: 450, height: 200 },
      showOnPages: [],
      displayType: PopupType.MODAL,
      priority: 4,
      isActive: false,
    },
  ];

  for (const popup of samplePopups) {
    await prisma.popup.create({
      data: popup,
    });
  }

  // Create sample board posts
  const sampleBoardPosts = [
    {
      boardType: BoardType.NOTICE,
      title: "미소핀의원 휴진 일정 안내",
      content: "안녕하세요. 미소핀의원입니다.\n\n다음과 같이 휴진 일정을 안내드립니다.\n\n- 설날 연휴: 2024년 2월 9일(금) ~ 2월 12일(월)\n- 추석 연휴: 2024년 9월 16일(월) ~ 9월 18일(수)\n\n응급 상황 시에는 응급실을 이용해 주시기 바랍니다.\n감사합니다.",
      excerpt: "2024년 설날, 추석 연휴 휴진 일정을 안내드립니다.",
      author: "미소핀의원",
      isPublished: true,
      isPinned: true,
      tags: ["휴진", "공지", "연휴"],
      imageUrl: null,
      viewCount: 245,
      publishedAt: new Date("2024-01-15T09:00:00Z"),
    },
    {
      boardType: BoardType.EVENT,
      title: "신규 환자 20% 할인 이벤트",
      content: "처음 방문하시는 환자분들을 위한 특별 할인 이벤트를 진행합니다.\n\n할인 내용:\n- 초진료비 20% 할인\n- 치료비 10% 할인\n\n이벤트 기간: 2024년 1월 1일 ~ 2월 29일\n\n* 다른 할인과 중복 적용되지 않습니다.\n* 예약 시 이벤트 할인 희망한다고 말씀해 주세요.",
      excerpt: "처음 방문 환자분들께 드리는 특별 할인 혜택!",
      author: "미소핀의원",
      isPublished: true,
      isPinned: false,
      tags: ["할인", "이벤트", "신규환자"],
      imageUrl: null,
      viewCount: 158,
      publishedAt: new Date("2024-01-01T10:00:00Z"),
    },
    {
      boardType: BoardType.NOTICE,
      title: "예약은 어떻게 하나요?",
      content: "예약 방법은 다음과 같습니다.\n\n1. 전화 예약: 02-123-4567\n   - 운영 시간: 평일 9시~18시, 토요일 9시~13시\n\n2. 온라인 예약:\n   - 홈페이지 예약 시스템 이용\n   - 24시간 예약 가능\n\n3. 방문 예약:\n   - 직접 내원하여 접수\n\n※ 응급 환자는 예약 없이도 진료 가능합니다.",
      excerpt: "전화, 온라인, 방문 예약 방법을 안내해드립니다.",
      author: "미소핀의원",
      isPublished: true,
      isPinned: false,
      tags: ["예약", "안내"],
      imageUrl: null,
      viewCount: 89,
      publishedAt: new Date("2024-01-10T14:00:00Z"),
    },
    {
      boardType: BoardType.NOTICE,
      title: "피부 건강 관리의 중요성",
      content: "현대인들의 피부 건강이 점점 악화되고 있습니다.\n\n주요 원인:\n- 미세먼지와 환경오염\n- 잘못된 화장품 사용\n- 불규칙한 생활 패턴\n- 스트레스\n\n예방법:\n- 올바른 세안 습관\n- 규칙적인 피부 관리\n- 적절한 수분 공급\n- 정기적인 피부 검진\n\n피부 건강은 한번 나빠지면 회복이 어려우니, 평소 관리가 중요합니다.",
      excerpt: "현대인의 피부 건강 문제와 예방법에 대해 알아봅시다.",
      author: "김의사",
      isPublished: true,
      isPinned: false,
      tags: ["피부", "건강", "예방", "생활습관"],
      imageUrl: null,
      viewCount: 203,
      publishedAt: new Date("2024-01-12T16:30:00Z"),
    },
    {
      boardType: BoardType.EVENT,
      title: "건강 세미나 개최 안내",
      content: "척추 건강 관리 세미나를 개최합니다.\n\n일시: 2024년 3월 15일(금) 오후 7시\n장소: 미소핀의원 세미나실\n강사: 김○○ 원장\n\n주제:\n- 현대인의 척추 질환\n- 올바른 자세와 운동법\n- 일상 생활 속 척추 관리법\n\n참가비: 무료\n신청: 전화 또는 온라인 접수\n정원: 50명 (선착순)\n\n건강한 척추를 위한 소중한 시간이 될 것입니다.",
      excerpt: "무료 척추 건강 세미나에 여러분을 초대합니다.",
      author: "미소핀의원",
      isPublished: false,
      isPinned: false,
      tags: ["세미나", "교육", "척추건강", "무료"],
      imageUrl: null,
      viewCount: 0,
      publishedAt: null,
    },
  ];

  for (const post of sampleBoardPosts) {
    await prisma.boardPost.create({
      data: post,
    });
  }

  // Create sample pages
  const samplePages = [
    {
      slug: "about",
      title: "병원 소개",
      content: {
        sections: [
          {
            type: "hero",
            title: "미소핀의원",
            subtitle: "건강한 피부, 아름다운 미소",
            image: "/images/about-hero.jpg"
          },
          {
            type: "text",
            title: "병원장 인사말",
            content: "안녕하세요. 미소핀의원을 방문해 주셔서 감사합니다. 저희는 환자분들의 건강한 피부와 아름다운 미소를 위해 최선을 다하고 있습니다."
          },
          {
            type: "features",
            title: "진료 분야",
            items: [
              { title: "피부과", description: "여드름, 아토피, 건선 등 각종 피부질환 치료" },
              { title: "성형외과", description: "자연스러운 미용성형 및 재건수술" },
              { title: "레이저 치료", description: "최신 레이저 장비를 이용한 치료" }
            ]
          }
        ]
      },
      metadata: {
        title: "미소핀의원 소개 - 건강한 피부, 아름다운 미소",
        description: "미소핀의원은 피부과와 성형외과 전문 병원입니다. 환자분들의 건강한 피부와 아름다운 미소를 위해 최선을 다하고 있습니다.",
        keywords: "미소핀의원, 피부과, 성형외과, 병원소개"
      },
      isPublished: true,
    },
    {
      slug: "services",
      title: "진료 안내",
      content: {
        sections: [
          {
            type: "hero",
            title: "진료 안내",
            subtitle: "전문적인 의료 서비스를 제공합니다"
          },
          {
            type: "services",
            title: "주요 진료 분야",
            services: [
              {
                name: "일반 피부과",
                description: "여드름, 아토피 피부염, 건선, 백반증 등",
                procedures: ["피부 검사", "약물 치료", "광선 치료"]
              },
              {
                name: "미용 피부과",
                description: "주름 개선, 색소 치료, 모공 관리 등",
                procedures: ["보톡스", "필러", "레이저 토닝", "IPL"]
              },
              {
                name: "성형외과",
                description: "얼굴 성형, 몸매 관리, 재건 수술 등",
                procedures: ["쌍꺼풀 수술", "코 성형", "지방 흡입", "유방 성형"]
              }
            ]
          }
        ]
      },
      metadata: {
        title: "미소핀의원 진료안내 - 피부과 성형외과 전문",
        description: "미소핀의원의 피부과, 성형외과 진료 분야와 시술에 대한 상세한 안내입니다.",
        keywords: "진료안내, 피부과, 성형외과, 보톡스, 필러, 레이저"
      },
      isPublished: true,
    },
    {
      slug: "contact",
      title: "오시는 길",
      content: {
        sections: [
          {
            type: "hero",
            title: "오시는 길",
            subtitle: "미소핀의원 위치 및 연락처 안내"
          },
          {
            type: "contact",
            title: "병원 정보",
            info: {
              address: "서울특별시 강남구 테헤란로 123, 미소빌딩 3층",
              phone: "02-1234-5678",
              fax: "02-1234-5679",
              email: "info@misopin.com",
              hours: {
                weekdays: "월~금 09:00 ~ 18:00",
                saturday: "토요일 09:00 ~ 13:00",
                closed: "일요일, 공휴일 휴진"
              }
            },
            map: {
              lat: 37.5009,
              lng: 127.0396,
              zoom: 17
            }
          },
          {
            type: "transportation",
            title: "교통편",
            methods: [
              {
                type: "지하철",
                description: "2호선 강남역 3번 출구에서 도보 5분"
              },
              {
                type: "버스",
                description: "강남역.강남역사거리 정류장 하차"
              },
              {
                type: "자가용",
                description: "건물 지하주차장 이용 가능 (2시간 무료)"
              }
            ]
          }
        ]
      },
      metadata: {
        title: "미소핀의원 오시는길 - 강남역 3번출구 도보5분",
        description: "미소핀의원 위치, 연락처, 진료시간 및 교통편 안내입니다. 강남역 3번 출구에서 도보 5분 거리에 있습니다.",
        keywords: "미소핀의원, 오시는길, 강남역, 연락처, 진료시간"
      },
      isPublished: true,
    },
    {
      slug: "privacy-policy",
      title: "개인정보처리방침",
      content: {
        html: `
          <h2>개인정보처리방침</h2>
          <p>미소핀의원(이하 '의료기관')은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여, 적법하게 개인정보를 처리하고 안전하게 관리하고 있습니다.</p>

          <h3>1. 개인정보의 처리목적</h3>
          <p>의료기관은 다음의 목적을 위하여 개인정보를 처리합니다:</p>
          <ul>
            <li>진료 및 치료</li>
            <li>의료진 간 협진</li>
            <li>진료비 수납 및 보험청구</li>
            <li>법정 신고 및 보고</li>
          </ul>

          <h3>2. 개인정보의 수집항목</h3>
          <p>의료기관은 진료를 위해 다음과 같은 개인정보를 수집합니다:</p>
          <ul>
            <li>성명, 주민등록번호, 연락처, 주소</li>
            <li>진료과목, 진료기록, 처방전</li>
            <li>진료비 수납 관련 정보</li>
          </ul>

          <p>이 개인정보처리방침은 2024년 1월 1일부터 적용됩니다.</p>
        `
      },
      metadata: {
        title: "미소핀의원 개인정보처리방침",
        description: "미소핀의원의 개인정보 수집 및 처리에 관한 방침입니다.",
        keywords: "개인정보처리방침, 개인정보보호"
      },
      isPublished: false,
    }
  ];

  for (const page of samplePages) {
    await prisma.page.create({
      data: page,
    });
  }

  // Create system settings - matching the types/settings.ts structure
  const systemSettings = [
    // General Settings
    { key: "siteName", value: "미소핀의원", category: "general" },
    { key: "logoUrl", value: "/images/logo.png", category: "general" },
    { key: "contactEmail", value: "info@misopin.com", category: "general" },
    { key: "contactPhone", value: "02-1234-5678", category: "general" },
    { key: "address", value: "서울특별시 강남구 테헤란로 123, 미소빌딩 3층", category: "general" },
    {
      key: "operatingHours",
      value: {
        weekdays: "09:00 - 18:00",
        weekends: "09:00 - 15:00"
      },
      category: "general"
    },
    { key: "timezone", value: "Asia/Seoul", category: "general" },
    { key: "language", value: "ko", category: "general" },

    // Email Settings
    { key: "smtpHost", value: "smtp.gmail.com", category: "email" },
    { key: "smtpPort", value: 587, category: "email" },
    { key: "smtpUser", value: "", category: "email" },
    { key: "smtpPassword", value: "", category: "email" },
    { key: "smtpSecure", value: true, category: "email" },
    { key: "fromEmail", value: "noreply@misopin.com", category: "email" },
    { key: "fromName", value: "미소핀의원", category: "email" },
    { key: "replyToEmail", value: "info@misopin.com", category: "email" },
    {
      key: "emailTemplates",
      value: {
        reservationConfirmation: "안녕하세요. 미소핀의원입니다.\n\n예약이 확정되었습니다.\n\n예약 정보를 확인해 주시고, 예약 시간에 맞춰 방문해 주시기 바랍니다.\n\n감사합니다.",
        reservationReminder: "안녕하세요. 미소핀의원입니다.\n\n내일 예약된 진료 일정을 알려드립니다.\n\n예약 시간을 확인하시고 준시에 방문해 주시기 바랍니다.\n\n감사합니다.",
        cancelNotification: "안녕하세요. 미소핀의원입니다.\n\n예약이 취소되었습니다.\n\n다시 예약을 원하시면 언제든지 연락 주시기 바랍니다.\n\n감사합니다."
      },
      category: "email"
    },

    // Security Settings
    { key: "sessionTimeout", value: 60, category: "security" },
    { key: "passwordMinLength", value: 8, category: "security" },
    { key: "passwordRequireSpecialChar", value: true, category: "security" },
    { key: "passwordRequireNumber", value: true, category: "security" },
    { key: "passwordRequireUppercase", value: true, category: "security" },
    { key: "maxLoginAttempts", value: 5, category: "security" },
    { key: "lockoutDuration", value: 15, category: "security" },
    { key: "enableTwoFactor", value: false, category: "security" },
    { key: "jwtExpiresIn", value: "7d", category: "security" },

    // Upload Settings
    { key: "maxFileSize", value: 10, category: "upload" },
    { key: "allowedImageTypes", value: ["jpg", "jpeg", "png", "gif", "webp"], category: "upload" },
    { key: "allowedDocumentTypes", value: ["pdf", "doc", "docx", "xls", "xlsx"], category: "upload" },
    { key: "uploadPath", value: "/uploads", category: "upload" },
    { key: "enableImageCompression", value: true, category: "upload" },
    { key: "imageQuality", value: 80, category: "upload" },
    {
      key: "thumbnailSizes",
      value: [
        { name: "small", width: 150, height: 150 },
        { name: "medium", width: 300, height: 300 },
        { name: "large", width: 600, height: 600 }
      ],
      category: "upload"
    },
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, category: setting.category },
      create: setting,
    });
  }

  console.log("✅ Seed data created successfully!");
  console.log({
    users: {
      superAdmin: { email: superAdmin.email, password: "admin123" },
      admin: { email: admin.email, password: "admin123" },
      editor: { email: editor.email, password: "editor123" },
    },
    reservations: `${sampleReservations.length} sample reservations created`,
    popups: `${samplePopups.length} sample popups created`,
    boardPosts: `${sampleBoardPosts.length} sample board posts created`,
    pages: `${samplePages.length} sample pages created`,
    systemSettings: `${systemSettings.length} system settings created`,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });