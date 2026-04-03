/* ============================================================
   BNI STAR — Shared Member Data
   ============================================================ */

const MEMBERS_DEFAULT = [
  {
    id: 1, name: "김민준", company: "민준세무법인", category: "법률/세무",
    specialty: "세무·절세 컨설팅",
    headline: "세금, 얼마나 더 줄일 수 있는지 알고 계신가요?",
    targetCustomer: "중소기업 대표, 스타트업 창업자, 프리랜서",
    description: "공인세무사 경력 20년. 법인 설립부터 절세 전략 수립, 세무조사 대응, 개인사업자 기장까지 토탈 세무 서비스를 제공합니다. 고객의 비즈니스를 함께 성장시키는 세무 파트너를 찾고 계신다면 연락 주세요.",
    phone: "010-1234-5678", email: "kim@minjun-tax.kr", address: "서울시 강남구 테헤란로 123, 5층",
    instagram: "minjun_tax", kakao: "minjun_tax", website: "www.minjun-tax.kr",
    color: "#C0392B", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    id: 2, name: "이수연", company: "수연법률사무소", category: "법률/세무",
    specialty: "기업·부동산 법률 자문",
    headline: "억울한 계약 분쟁, 혼자 해결하려 하지 마세요",
    targetCustomer: "계약 분쟁 사업주, 상속·이혼 문제 있는 분",
    description: "변호사 경력 15년. 기업 계약 검토, 부동산 분쟁, 상속, 이혼 등 다양한 법률 분야를 명쾌하게 해결합니다. 초기 상담은 무료로 진행하오니 편하게 연락 주세요.",
    phone: "010-2345-6789", email: "lee@suyeon-law.kr", address: "서울시 서초구 서초대로 456, 8층",
    instagram: "lawyer_suyeon", kakao: "suyeon_law", website: "www.suyeon-law.kr",
    color: "#6C3483", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    id: 3, name: "신민재", company: "이차선술집", category: "식품/외식",
    specialty: "요식업·주점",
    headline: "분위기 좋은 술집에서 2차를!",
    targetCustomer: "회식자리 찾는 분",
    description: "맛있습니다.",
    phone: "010-5003-6491", email: "", address: "",
    instagram: "", kakao: "", website: "",
    color: "#566573", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/55.jpg"
  },
  {
    id: 4, name: "나성연", company: "KB손해보험", category: "금융/보험",
    specialty: "화재보험·손해보험 설계",
    headline: "내 사업을 지켜줄 보험, 제대로 가입하셨나요?",
    targetCustomer: "사업체 운영자, 직장인, 은퇴 준비 중인 분, 간병 준비가 필요하신분",
    description: "기업 배상책임보험, 간병인 보험 등 복잡한 보험을 쉽게 설명하고 최적의 플랜을 설계해 드립니다.",
    phone: "010-8245-5258", email: "3282614@kbinsure.co.kr", address: "경기도 수원시 팔달구 경수대로 518, KB손해보험 8층",
    instagram: "", kakao: "", website: "",
    color: "#F39C12", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/11.jpg"
  },
  {
    id: 5, name: "정영준", company: "와이즈앤밸류", category: "금융/보험",
    specialty: "자산관리·생명보험",
    headline: "건강한 노후를 준비할 수 있게 도와드립니다.",
    targetCustomer: "노후 준비가 필요하신분",
    description: "금융 경력 20년의 PB(Private Banker). 국내외 주식·채권·부동산 펀드 포트폴리오 관리 전문. 세금 효율적인 자산 이전 전략까지 원스톱으로 제공합니다.",
    phone: "010-2599-1901", email: "", address: "",
    instagram: "", kakao: "", website: "",
    color: "#1E8449", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186874538.jpg"
  },
  {
    id: 6, name: "정동현", company: "동현부동산컨설팅", category: "부동산/인테리어",
    specialty: "상가·오피스 투자 분석",
    headline: "수익 나는 상가 투자, 어디서 시작해야 할까요?",
    targetCustomer: "상가 투자 희망자, 사무실 이전 예정 기업",
    description: "부동산 컨설팅 12년. 강남권 상업용 부동산 전문. 투자 수익률 분석, 권리금 협상, 임대차 계약 검토까지 처음부터 끝까지 함께 합니다.",
    phone: "010-5678-9012", email: "jung@dh-realty.kr", address: "서울시 강남구 신사동 234",
    instagram: "realty_donghyun", kakao: "dh_realty", website: "www.dh-realty.kr",
    color: "#D68910", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/67.jpg"
  },
  {
    id: 7, name: "문혜선", company: "인크루즈", category: "라이프/여행",
    specialty: "크루즈여행",
    headline: "나만을 위한 여행, 이제 진짜 시작하실 때가 됐나요?",
    targetCustomer: "크루즈 여행을 계획하시는 분, 즐거운 은퇴를 원하시는 분",
    description: "크루즈 소개해드립니다.",
    phone: "010-9016-2122", email: "nexy0316@naver.com", address: "",
    instagram: "", kakao: "", website: "",
    color: "#148F77", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/63.jpg"
  },
  {
    id: 8, name: "오준혁", company: "디지털포스(주)", category: "IT/디지털",
    specialty: "홈페이지·쇼핑몰 개발",
    headline: "홈페이지 없이 사업하고 계신 건 아니죠?",
    targetCustomer: "온라인 진출 원하는 소상공인, 쇼핑몰 창업 준비 중인 분",
    description: "개발 경력 10년. 반응형 홈페이지, 쇼핑몰, 모바일 앱 개발 전문. 기획부터 운영 지원까지 IT 전반을 담당합니다. 합리적인 비용에 최고의 품질을 약속합니다.",
    phone: "010-7890-1234", email: "oh@digitalforce.kr", address: "서울시 마포구 합정동 890",
    instagram: "digitalforce_oh", kakao: "digitalforce", website: "www.digitalforce.kr",
    color: "#212F3D", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/23.jpg"
  },
  {
    id: 9, name: "임서현", company: "서현디지털마케팅", category: "마케팅/광고",
    specialty: "SNS·퍼포먼스 마케팅",
    headline: "SNS 열심히 하는데 매출이 안 오르시나요?",
    targetCustomer: "브랜드 인지도 높이고 싶은 소상공인, 매출 늘리고 싶은 분",
    description: "디지털 마케팅 전문가 8년 경력. 인스타그램·네이버·유튜브 채널 운영 및 광고 집행 전문. ROI 중심의 마케팅으로 실질적인 매출 성장을 만들어 드립니다.",
    phone: "010-8901-2345", email: "lim@shdm.kr", address: "서울시 성동구 성수동 123",
    instagram: "shdm_marketing", kakao: "shdm_official", website: "www.shdm.kr",
    color: "#B03A2E", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/17.jpg"
  },
  {
    id: 10, name: "고 웅", company: "디자인 이안", category: "부동산/인테리어",
    specialty: "상업공간·주택 인테리어",
    headline: "공간 분위기가 매출을 좌우한다는 거 아시나요?",
    targetCustomer: "카페·음식점 창업자, 사무실 리뉴얼 원하는 기업",
    description: "인테리어 디자이너 15년 경력. 상업 공간 특화 설계. 공간 기획부터 시공·가구 납품까지 원스톱 서비스. 합리적인 비용으로 최고의 공간을 만들어 드립니다.",
    phone: "010-6314-8999", email: "ianko83@naver.com", address: "경기 수원시 영통구 영통로 174번길 12, 그대가센트럴파크상가 101호 (망포동 722)",
    instagram: "design_ian.ko", kakao: "", website: "",
    color: "#D35400", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/41.jpg"
  },
  {
    id: 11, name: "문성철", company: "그린건설", category: "부동산/인테리어",
    specialty: "단독주택·리모델링 건축",
    headline: "내 집 짓고 싶은데 어디서 시작해야 할지 막막하신가요?",
    targetCustomer: "단독주택 신축·리모델링 원하는 분, 건물 외관 공사 필요한 분",
    description: "건설업 20년 경력. 소규모 단독주택·근린생활시설 신축 및 리모델링 전문. 탄탄한 시공 품질과 투명한 견적으로 신뢰를 드립니다.",
    phone: "010-5791-3456", email: "moon@green-const.kr", address: "경기도 고양시 일산동구 장항동 123",
    instagram: "green_construction", kakao: "green_const", website: "www.green-const.kr",
    color: "#1D8348", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/78.jpg"
  },
  {
    id: 12, name: "윤지영", company: "지영한의원", category: "의료/건강",
    specialty: "한방 다이어트·면역 관리",
    headline: "다이어트, 이번엔 정말 제대로 해보고 싶으신가요?",
    targetCustomer: "다이어트 원하는 분, 만성 피로·소화 문제로 고생하는 분",
    description: "한의학 박사. 한방 다이어트 시술 및 면역력 증진 전문. 개인 체질에 맞는 맞춤형 한방 치료로 근본적인 건강 관리를 도와드립니다.",
    phone: "010-0123-4567", email: "yoon@jiyoung-clinic.kr", address: "서울시 강남구 청담동 789",
    instagram: "dr_jiyoung", kakao: "jiyoung_clinic", website: "www.jiyoung-clinic.kr",
    color: "#117A8B", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/52.jpg"
  },
  {
    id: 13, name: "이지혜", company: "암웨이", category: "뷰티/패션",
    specialty: "화장품",
    headline: "거울 볼 때마다 피부 때문에 자신감이 떨어지시나요?",
    targetCustomer: "피부 트러블, 노화 방지, 미용에 관심 있는 분",
    description: "자연스럽고 건강한 피부를 위한 최적의 솔루션을 제안합니다.",
    phone: "010-2275-2250", email: "fcm36000@gmail.com", address: "",
    instagram: "No.659799", kakao: "", website: "www.amway.co.kr",
    color: "#A93226", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186245990.jpg"
  },
  {
    id: 14, name: "신재호", company: "리더스코칭센터", category: "교육/컨설팅",
    specialty: "경영 코칭·리더십 개발",
    headline: "열심히 일하는데 회사가 성장하지 않는 느낌이신가요?",
    targetCustomer: "성장하고 싶은 CEO, 리더십 개발이 필요한 팀장급 이상",
    description: "국제코치연맹 인증 코치(PCC). 중소기업 대표 및 임원 대상 경영 코칭 전문. 목표 설정, 조직 문화 개선, 갈등 관리 등 비즈니스 전반을 코칭합니다.",
    phone: "010-1357-2468", email: "shin@leaders-coaching.kr", address: "서울시 종로구 광화문 101",
    instagram: "leaders_coaching", kakao: "leaders_jaeho", website: "www.leaders-coaching.kr",
    color: "#784212", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/19.jpg"
  },
  {
    id: 15, name: "김성길", company: "바다예찬", category: "식품/외식",
    specialty: "횟집",
    headline: "단체회식 믿고 갈 수 있는 바다예찬입니다.",
    targetCustomer: "각종 파티·모임 주최자",
    description: "회와 솥밥의 달인",
    phone: "010-3788-2414", email: "amiga1992@naver.com", address: "경기도 수원시 팔달구 효원로 249번길 18-5",
    instagram: "", kakao: "", website: "",
    color: "#D68910", featured: true, photoUrl: ""
  },
  {
    id: 16, name: "이재린", company: "주식회사 브릿지자산관리", category: "금융/보험",
    specialty: "해외보험",
    headline: "",
    targetCustomer: "",
    description: "",
    phone: "010-3127-6765", email: "", address: "",
    instagram: "", kakao: "", website: "",
    color: "#C0392B", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/68.jpg"
  },
  {
    id: 17, name: "김성미", company: "JK제빵소", category: "식품/외식",
    specialty: "베이커리·카페",
    headline: "맛있는 치아바타와 커피",
    targetCustomer: "빵 좋아하시는분",
    description: "반갑습니다.",
    phone: "010-9532-0316", email: "sm-dos@daum.net", address: "경기도 수원시 권선구 곡선로 49번길 13-25, 한아름빌딩 1F",
    instagram: "", kakao: "", website: "",
    color: "#C0392B", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186264851.jpg"
  },
  {
    id: 18, name: "임현준", company: "볼트런", category: "자동차",
    specialty: "자동차튜닝(자동차전압안정기)",
    headline: "강력한 자동차 전압 안정기",
    targetCustomer: "영업용 차량, 택시, 화물차",
    description: "",
    phone: "010-5344-0255", email: "guswns0255@hanmail.net", address: "수원특례시 권선구 권광로 85",
    instagram: "", kakao: "", website: "www.volt-run.co.kr",
    color: "#C0392B", featured: true, photoUrl: ""
  },
  {
    id: 19, name: "윤명렬", company: "QY케어", category: "부동산/인테리어",
    specialty: "에어컨청소",
    headline: "상쾌한 시원함",
    targetCustomer: "관공서,학교, 사무실, 키즈카페",
    description: "대규모 에어컨 청소 전문 기업 QY케어 입니다. \n주택부터 사무실까지 깨끗하게 청소합니다.",
    phone: "010-4899-1911", email: "", address: "경기도 수원시 권선구 권선로 720번길 23, 202호",
    instagram: "", kakao: "", website: "",
    color: "#C0392B", featured: true, photoUrl: ""
  }
];

const CATEGORIES = [
  { name: "법률/세무",    emoji: "⚖️",  color: "#6C3483" },
  { name: "금융/보험",    emoji: "💰",  color: "#1F618D" },
  { name: "자동차",        emoji: "🚗",  color: "#D68910" },
  { name: "IT/디지털",    emoji: "💻",  color: "#212F3D" },
  { name: "의료/건강",    emoji: "🏥",  color: "#117A8B" },
  { name: "교육/컨설팅",  emoji: "📚",  color: "#784212" },
  { name: "마케팅/광고",  emoji: "📣",  color: "#B03A2E" },
  { name: "부동산/인테리어", emoji: "🏠", color: "#D35400" },
  { name: "식품/외식",    emoji: "🍽️", color: "#1D8348" },
  { name: "레저/스포츠",  emoji: "🏃",  color: "#1565C0" },
  { name: "뷰티/패션",    emoji: "💄",  color: "#AD1457" },
  { name: "라이프/여행",  emoji: "✈️",  color: "#0277BD" },
  { name: "제조/유통",    emoji: "🏭",  color: "#546E7A" },
];

// 샘플 프로필 사진 (실제 사진으로 교체 시 관리자에서 URL 입력)
const SAMPLE_PHOTOS = {
  1:  'https://randomuser.me/api/portraits/men/32.jpg',
  2:  'https://randomuser.me/api/portraits/women/44.jpg',
  3:  'https://randomuser.me/api/portraits/men/55.jpg',
  4:  'https://randomuser.me/api/portraits/men/11.jpg',
  5:  'https://randomuser.me/api/portraits/women/28.jpg',
  6:  'https://randomuser.me/api/portraits/men/67.jpg',
  7:  'https://randomuser.me/api/portraits/women/63.jpg',
  8:  'https://randomuser.me/api/portraits/men/23.jpg',
  9:  'https://randomuser.me/api/portraits/women/17.jpg',
  10: 'https://randomuser.me/api/portraits/men/41.jpg',
  11: 'https://randomuser.me/api/portraits/men/78.jpg',
  12: 'https://randomuser.me/api/portraits/women/52.jpg',
  13: 'https://randomuser.me/api/portraits/women/36.jpg',
  14: 'https://randomuser.me/api/portraits/men/19.jpg',
  15: 'https://randomuser.me/api/portraits/women/81.jpg',
  16: 'https://randomuser.me/api/portraits/women/68.jpg',
};

function loadMembers() {
  return MEMBERS_DEFAULT.map(m => ({
    ...m,
    photoUrl: m.photoUrl || SAMPLE_PHOTOS[m.id] || ''
  }));
}
function saveMembers(list) {
  // no-op: data is persisted via GitHub API (api/save-members)
}
