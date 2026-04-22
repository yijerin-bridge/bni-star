/* ============================================================
   BNI STAR — Shared Member Data
   ============================================================ */

const MEMBERS_DEFAULT = [
  {
    id: 3, name: "신민재", company: "이차선술집", category: "식품/외식",
    specialty: "요식업·주점",
    headline: "분위기 좋은 술집에서 2차를!",
    targetCustomer: "회식자리 찾는 분",
    description: "맛있습니다.",
    phone: "010-5003-6491", email: "", address: "경기 수원시 영통구 영통로214번길 59 2층",
    instagram: "", kakao: "https://open.kakao.com/o/sEE4dK1h", website: "",
    color: "#566573", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/55.jpg",
    testimonials: [{"metric":"회식 만족도 5.0, 단골 팀 3팀 확보","quote":"회사 회식 장소 고민이 많았는데 분위기도 좋고 가격도 합리적이에요. 팀원들이 너무 좋아해서 벌써 세 번째 방문입니다.","author":"박○○ 팀장님 · 제조업"}]
  },
  {
    id: 4, name: "나성연", company: "KB손해보험", category: "금융/보험",
    specialty: "화재보험·손해보험 설계",
    headline: "내 사업을 지켜줄 보험, 제대로 가입하셨나요?",
    targetCustomer: "사업체 운영자, 직장인, 은퇴 준비 중인 분, 간병 준비가 필요하신분",
    description: "기업 배상책임보험, 간병인 보험 등 복잡한 보험을 쉽게 설명하고 최적의 플랜을 설계해 드립니다.",
    phone: "010-8245-5258", email: "3282614@kbinsure.co.kr", address: "경기도 수원시 팔달구 경수대로 518, KB손해보험 8층",
    instagram: "", kakao: "https://open.kakao.com/o/seO0n8ei", website: "",
    color: "#F39C12", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775641531227.jpg",
    testimonials: [{"metric":"보험료 월 42만원 절약","quote":"단체보험 갱신 때 기존 계약을 꼼꼼히 분석해줬어요. 불필요한 항목을 정리하고 보장은 더 좋아졌는데 보험료가 많이 줄었습니다.","author":"이○○ 이사님 · IT 스타트업"},{"metric":"법인 보험 사각지대 완전 해소","quote":"법인을 만들고 어떤 보험이 필요한지 아무것도 몰랐는데 사업 구조를 보고 딱 맞는 보험을 설계해줬어요. 얼마나 많은 위험이 노출돼 있었는지 알게 됐습니다.","author":"오○○ 대표님 · 음식점"}]
  },
  {
    id: 5, name: "정영준", company: "와이즈앤밸류", category: "금융/보험",
    specialty: "자산관리·생명보험",
    headline: "건강한 노후를 준비할 수 있게 도와드립니다.",
    targetCustomer: "노후 준비가 필요하신분",
    description: "생명보험 & 재무설계 전문가로 여러 보험상품과 금융상품을 전반적으로 컨설팅하여 더 나은 노후, 더 나은 미래를 도와드립니다.",
    phone: "010-2599-1901", email: "", address: "",
    instagram: "", kakao: "https://open.kakao.com/o/sVdeyYli", website: "",
    color: "#1E8449", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186874538.jpg",
    testimonials: [{"metric":"노후 준비 완료, 월 수령액 2.3배 증가","quote":"막연하게 걱정만 했는데 재무 플랜을 짜주니까 눈에 보이더라고요. 언제 얼마를 받을 수 있는지 명확해졌습니다."},{"metric":"기존 보험 리모델링 후 수령액 1.8배","quote":"갖고 있던 보험을 그냥 유지하고 있었는데 리모델링하고 나서 같은 금액에 받을 수 있는 게 훨씬 많아졌어요. 진작 상담했어야 했나 싶었습니다.","author":"이○○ 부장님 · 제조업"}]
  },
  {
    id: 7, name: "문혜선", company: "인크루즈", category: "라이프/여행",
    specialty: "크루즈여행",
    headline: "나만을 위한 여행, 이제 진짜 시작하실 때가 됐나요?",
    targetCustomer: "크루즈 여행을 계획하시는 분, 즐거운 은퇴를 원하시는 분",
    description: "크루즈 소개해드립니다.",
    phone: "010-9016-2122", email: "nexy0316@naver.com", address: "",
    instagram: "", kakao: "https://open.kakao.com/o/sIDTmV5", website: "",
    color: "#148F77", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/63.jpg",
    testimonials: [{"metric":"크루즈 첫 경험, 만족도 100%","quote":"크루즈가 처음이라 걱정이 많았는데 하나하나 친절하게 설명해주셔서 편하게 다녀왔어요. 식사도 관광도 모두 완벽했습니다.","author":"최○○ 대표님 · 서비스업"}]
  },
  {
    id: 9, name: "임귀상", company: "아르페이", category: "IT/디지털",
    specialty: "카드단말기·POS",
    headline: "초스피드로 결제되는 아르페이입니다.",
    targetCustomer: "외식업, 소상공인",
    description: "쇼핑몰 무료 구축, QR결제 다양한 지원이 됩니다.",
    phone: "010-6532-3651", email: "imguisang@naver.com", address: "경기도 화성시 효행구 봉담읍 서봉산길 21-1",
    instagram: "", kakao: "", website: "",
    color: "#B03A2E", featured: true, photoUrl: "https://randomuser.me/api/portraits/women/17.jpg",
    testimonials: [{"metric":"카드 수수료 월 18% 절감","quote":"기존 단말기 수수료가 생각보다 높았는데 비교해보니 많이 차이가 났어요. 전환 과정도 간단하고 POS 연동도 바로 됐습니다.","author":"강○○ 사장님 · 음식점"},{"metric":"매장 오픈 당일 결제 시스템 완벽 세팅","quote":"창업 준비하면서 결제 시스템 걱정이 컸는데 오픈 전날 방문해서 모든 세팅을 마쳐줬어요. 덕분에 첫날부터 불편함 없이 운영했습니다.","author":"윤○○ 원장님 · 학원"}]
  },
  {
    id: 10, name: "고 웅", company: "디자인 이안", category: "부동산/인테리어",
    specialty: "상업공간·주택 인테리어",
    headline: "공간 분위기가 매출을 좌우한다는 거 아시나요?",
    targetCustomer: "카페·음식점 창업자, 사무실 리뉴얼 원하는 기업",
    description: "인테리어 디자이너 15년 경력. 상업 공간 특화 설계. 공간 기획부터 시공·가구 납품까지 원스톱 서비스. 합리적인 비용으로 최고의 공간을 만들어 드립니다.",
    phone: "010-6314-8999", email: "ianko83@naver.com", address: "경기 수원시 영통구 영통로 174번길 12, 그대가센트럴파크상가 101호 (망포동 722)",
    instagram: "design_ian.ko", kakao: "https://open.kakao.com/o/soUVe1Tc", website: "",
    color: "#D35400", featured: true, photoUrl: "https://randomuser.me/api/portraits/men/41.jpg",
    testimonials: [{"metric":"인테리어 후 카페 매출 30% 상승","quote":"오픈 전 공간 기획부터 맡겼는데 손님들이 분위기 때문에 또 온다고 하더라고요. 인테리어가 마케팅이었어요."},{"metric":"사무실 리모델링 후 직원 만족도 95%","quote":"낡은 사무실을 바꾸고 싶었는데 예산이 빠듯했어요. 예산 안에서 최대한 이뻐 보이게 설계해줬고 직원들도 출근이 즐겁다고 하더라고요.","author":"최○○ 팀장님 · 스타트업"}]
  },
  {
    id: 12, name: "김봉석", company: "유사나헬스사이언스코리아", category: "의료/건강",
    specialty: "건강기능식품",
    headline: "Your Health, Your Life, Your Way",
    targetCustomer: "면역력이 낮아진분, 다이어트를 하고 싶으신분",
    description: "균형잡힌 영양공급",
    phone: "010-3775-3612", email: "kbseok77@naver.com", address: "",
    instagram: "", kakao: "https://open.kakao.com/o/s4J5gnci", website: "www.usana.com",
    color: "#117A8B", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775310685175.jpg",
    testimonials: [{"metric":"3개월 만에 면역력 회복, 잦은 감기 사라짐","quote":"매년 겨울마다 감기로 고생했는데 영양 제품 꾸준히 챙기고 나서 올 겨울은 한 번도 아프지 않았어요.","author":"정○○ 이사님 · 유통업"}]
  },
  {
    id: 13, name: "이지혜", company: "암웨이 글로벌🌐", category: "뷰티/패션",
    specialty: "화장품",
    headline: "거울 볼 때마다 피부 때문에 자신감이 떨어지시나요?",
    targetCustomer: "피부 트러블, 노화 방지, 미용에 관심 있는 분",
    description: "자연스럽고 건강한 피부를 위한 최적의 솔루션을 제안합니다.\nNo.659799",
    phone: "010-2275-2250", email: "fcmbyfreedom@gmail.com", address: "",
    instagram: "", kakao: "", website: "www.amway.co.kr",
    color: "#A93226", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186245990.jpg",
    testimonials: [{"metric":"피부 트러블 4주 만에 80% 개선","quote":"오랫동안 피부 트러블로 고생했는데 제품 추천과 사용법까지 꼼꼼하게 알려주셔서 정말 빠르게 나아졌어요. 지금은 주변에도 많이 소개하고 있습니다.","author":"김○○ 대표님 · 뷰티샵"},{"metric":"고객 답례 선물 후 재방문율 2배","quote":"고객 선물로 드렸더니 반응이 너무 좋았어요. 제품이 이렇게 좋은 줄 몰랐다고 하시는 분들이 많아서 저도 놀랐습니다.","author":"오○○ 원장님 · 헤어샵"}]
  },
  {
    id: 15, name: "김성길", company: "바다예찬", category: "식품/외식",
    specialty: "횟집",
    headline: "단체회식 믿고 갈 수 있는 바다예찬입니다.",
    targetCustomer: "각종 파티·모임 주최자",
    description: "회와 솥밥의 달인",
    phone: "010-3788-2414", email: "amiga1992@naver.com", address: "경기도 수원시 팔달구 효원로 249번길 18-5",
    instagram: "", kakao: "", website: "",
    color: "#D68910", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775191913169.jpg",
    testimonials: [{"metric":"단체 손님 20명, 만족도 5.0","quote":"생일 파티 자리였는데 회 퀄리티가 정말 좋았어요. 솥밥도 맛있고 서비스까지 배려해주셔서 기억에 남는 자리가 됐습니다.","author":"나○○ 사장님 · 서비스업"},{"metric":"거래처 접대 후 계약 성사","quote":"중요한 거래처 접대 자리에서 식사 퀄리티에 감동받으셨다고 하더라고요. 맛있는 밥 한 끼가 계약을 만들었습니다.","author":"허○○ 대표님 · 제조업"}]
  },
  {
    id: 16, name: "이재린", company: "주식회사 브릿지자산관리", category: "금융/보험",
    specialty: "해외보험·해외투자",
    headline: "아직도 원화로만 투자를 하고계십니까?",
    targetCustomer: "달러와 비트코인을 중점으로 모으고 싶은 분",
    description: "14년 경력의 다양한 투자, 자산관리 전문가입니다.",
    phone: "010-3127-6765", email: "yijerin@hanmail.net", address: "",
    instagram: "yijerin", kakao: "https://open.kakao.com/me/yijerin", website: "bridgeasset.kr",
    color: "#566573", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775190537938.jpg",
    testimonials: [{"metric":"달러 자산 비중 40% 달성, 환차익 포함 연 11% 수익","quote":"원화로만 갖고 있던 자산을 달러로 분산하고 나서 환율 오를 때마다 수익이 생기더라고요."},{"metric":"해외 연금보험으로 노후 달러 수령 준비 완료","quote":"국내 보험만 있었는데 달러로 받는 해외 연금 이야기를 듣고 바로 결정했어요. 환율 리스크까지 헤지가 되니 마음이 편해졌습니다.","author":"박○○ 원장님 · 의료"}]
  },
  {
    id: 17, name: "김성미", company: "JK제빵소", category: "식품/외식",
    specialty: "베이커리·카페",
    headline: "천현발효종으로 만든 빵과 신선한 원두로 만든 커피와 함께하세요.",
    targetCustomer: "학원,병원,어린이집등 단체주문,답례품등 맛있는 빵과 커피를  찾는분들",
    description: "천연발효종으로 만든 식사대용으로 즐길수있는 빵부터 페스츄리,디저트까지~\n신선한 원두로 커피와 음료도 다양하게 즐길 수 있습니다.",
    phone: "010-9532-0316", email: "sm-dos@daum.net", address: "경기도 수원시 권선구 곡선로 49번길 13-25, 한아름빌딩 1F",
    instagram: "", kakao: "https://open.kakao.com/o/s8pwFPuh", website: "",
    color: "#dbe972", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775186264851.jpg",
    testimonials: [{"metric":"어린이집 간식 납품, 학부모 만족도 4.9","quote":"천연발효종 빵을 아이들 간식으로 주문했는데 학부모님들한테 좋다는 피드백이 쏟아졌어요. 맛도 맛이지만 성분이 깨끗한 게 제일 좋아요.","author":"박○○ 원장님 · 어린이집"}]
  },
  {
    id: 18, name: "임현준", company: "볼트런", category: "자동차",
    specialty: "자동차튜닝(자동차전압안정기)",
    headline: "강력한 자동차 전압 안정기",
    targetCustomer: "영업용 차량, 택시, 화물차",
    description: "",
    phone: "010-5344-0255", email: "guswns0255@hanmail.net", address: "수원특례시 권선구 권광로 85",
    instagram: "", kakao: "", website: "www.volt-run.co.kr",
    color: "#C0392B", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775191124054.jpg",
    testimonials: [{"metric":"택시 연료효율 12% 향상, 배터리 수명 2배","quote":"영업용으로 하루 300km 이상 달리는데 전압 안정기 달고 나서 연비가 눈에 띄게 좋아졌어요. 배터리도 훨씬 오래 갑니다.","author":"최○○ 기사님 · 개인택시"}]
  },
  {
    id: 19, name: "윤명렬", company: "QY케어", category: "부동산/인테리어",
    specialty: "에어컨청소",
    headline: "상쾌한 시원함",
    targetCustomer: "관공서,학교, 사무실, 키즈카페",
    description: "대규모 에어컨 청소 전문 기업 QY케어 입니다. \n주택부터 사무실까지 깨끗하게 청소합니다.",
    phone: "010-4899-1911", email: "", address: "경기도 수원시 권선구 권선로 720번길 23, 202호",
    instagram: "", kakao: "", website: "",
    color: "#C0392B", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775643105191.jpg",
    testimonials: [{"metric":"사무실 에어컨 24대 청소, 전기료 8% 절감","quote":"여름 전 사무실 전체 에어컨 청소를 맡겼어요. 냉방 효율이 확실히 달라지고 직원들이 쾌적하다고 좋아했어요. 다음 해도 예약했습니다.","author":"이○○ 총무팀장 · 기업"}]
  },
  {
    id: 20, name: "진성훈", company: "찐수제컵밥", category: "식품/외식",
    specialty: "분식",
    headline: "든든한 한끼",
    targetCustomer: "단체 도시락, 소풍가는 고객",
    description: "베풀 진(陳)이라 쓰고 찐이라 읽습니다.",
    phone: "010-8852-5450", email: "", address: "경기도 수원시 권선구 동수원로 146번길 192-13, 102호",
    instagram: "", kakao: "", website: "",
    color: "#784212", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1776845649329.jpg",
    testimonials: [{"metric":"소풍 도시락 50인분, 남김없이 완판","quote":"회사 야유회 도시락을 주문했는데 직원들이 맛있다고 난리났어요. 컵밥이라 먹기도 편하고 양도 넉넉해서 다들 만족했습니다.","author":"장○○ 팀장님 · IT기업"}]
  },
  {
    id: 21, name: "한관우", company: "더쓰임마케팅", category: "마케팅/광고",
    specialty: "SEO, 컨텐츠 컨설팅 교육",
    headline: "광고는 집행이 아니라 설계입니다.",
    targetCustomer: "광고효율이 안나오는 사업자, 제품력 좋은 브랜드",
    description: "실제 타겟에 맞는 효율적인 마케팅을 알려드립니다.",
    phone: "010-2546-8295", email: "beasap32@gmail.com", address: "경기도 광주시 창뜰윗길 42-13, B1",
    instagram: "", kakao: "", website: "thssi.co.kr",
    color: "#566573", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775189844021.jpg",
    testimonials: [{"metric":"블로그 월 방문자 3배 증가","quote":"SEO 설계 후 2개월 만에 네이버 검색 1페이지에 올라갔어요. 광고비 없이 유입이 생기니까 체감이 확실히 달랐습니다."},{"metric":"유튜브 3개월 만에 구독자 1만 돌파","quote":"콘텐츠는 있었는데 알고리즘을 몰라서 조회수가 안 났어요. 키워드 전략과 썸네일 방향을 잡아준 뒤 첫 영상에서 조회수가 20배 뛰었습니다.","author":"최○○ 대표님 · 교육업"}]
  },
  {
    id: 22, name: "박희배", company: "에이치비인터내셔널", category: "IT/디지털",
    specialty: "종합가전렌탈",
    headline: "모든 가전을 책임집니다",
    targetCustomer: "가전 교체, 맞춤형 컨설팅이 필요하신분",
    description: "",
    phone: "010-9616-9294", email: "jsapark76@nate.com", address: "경기도 수원시 권선구 정조로 588, 1층",
    instagram: "", kakao: "", website: "",
    color: "#F39C12", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775190969972.jpg",
    testimonials: [{"metric":"사무실 가전 일괄 렌탈, 초기비용 70% 절감","quote":"신규 사무실 세팅할 때 가전 구매비가 부담이었는데 렌탈로 해결했어요. 유지보수까지 포함이라 관리 걱정이 없어졌습니다.","author":"송○○ 대표님 · 스타트업"}]
  },
  {
    id: 23, name: "이준수", company: "(주)미래온투어", category: "라이프/여행",
    specialty: "여행사",
    headline: "해외로 떠나고 싶은날",
    targetCustomer: "골프여행, 해외테마여행",
    description: "해외 현지 여행사와 하나투어 대리점을 운영중에 있습니다.",
    phone: "010-9321-2625", email: "seoulmilk2013@gmail.com", address: "경기도 화성시 병점구 떡전골로 96-4 오피스밸리 244호",
    instagram: "", kakao: "", website: "",
    color: "#784212", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775190979758.jpg",
    testimonials: [{"metric":"골프 해외투어 8명, 현지 만족도 최고","quote":"처음으로 해외 골프 투어를 기획했는데 라운딩 예약부터 숙소까지 완벽하게 준비해줬어요. 다음엔 인원 더 늘려서 또 가기로 했습니다.","author":"김○○ 대표님 · 건설업"}]
  },
  {
    id: 24, name: "황성호", company: "인투이피앤티", category: "제조/유통",
    specialty: "친환경패키지",
    headline: "포장재, 박스가 필요하시다면",
    targetCustomer: "B2C 제품 패키지가 필요하신분",
    description: "친환경 패키지를 다룹니다.",
    phone: "010-7376-1111", email: "sean@in2epnt.com", address: "경기도 수원시 팔달구 행궁로 98 성장관 2층",
    instagram: "in2epnt_official", kakao: "", website: "",
    color: "#27AE60", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775191113862.jpg",
    testimonials: [{"metric":"친환경 패키지 전환 후 브랜드 호감도 40% 상승","quote":"친환경 패키지로 바꾸고 나서 고객 반응이 달라졌어요. 제품 품질은 그대로인데 '환경 생각하는 브랜드'라는 이미지가 생겼습니다.","author":"조○○ 대표님 · 식품업"}]
  },
  {
    id: 25, name: "민경록", company: "포도주류(유)", category: "제조/유통",
    specialty: "주류 유통",
    headline: "주류 세팅 도와드립니다.",
    targetCustomer: "음식점, 창업 전 매장 등 B2B유통",
    description: "수입맥주,위스키, 리큐르, 꼬냑, 와인, 사케, 소주, 맥주, 생맥주 모두 다루고 있습니ㅏㄷ.",
    phone: "010-8794-7273", email: "kkakkuchi@naver.com", address: "경기도 의왕시 왕곡로 216-12 (왕곡동)",
    instagram: "", kakao: "", website: "",
    color: "#8E44AD", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1775191777652.jpg",
    testimonials: [{"metric":"주류 라인업 최적화, 주류 매출 25% 상승","quote":"어떤 주류를 어떻게 구성해야 할지 몰랐는데 업종과 고객층을 분석해서 라인업을 추천해줬어요. 적중률이 높았는지 주류 회전율이 많이 올랐습니다.","author":"윤○○ 사장님 · 음식점"}]
  },
  {
    id: 26, name: "이현희", company: "보쌈1979", category: "식품/외식",
    specialty: "보쌈",
    headline: "고기 한점 한점 정성을 담았습니다.",
    targetCustomer: "단체 회식, 점심식사",
    description: "고기 한점 한점 정성을 담았습니다.",
    phone: "010-9928-0994", email: "", address: "경기도 수원시 권선구 권광로 91번길2 1층 (권선동 1038-6)",
    instagram: "", kakao: "https://pf.kakao.com/_kefxcC", website: "",
    color: "#C0392B", featured: true, photoUrl: "",
    testimonials: [{"metric":"팀 정기 점심 단골, 만족도 5.0","quote":"우리 팀 점심 단골 맛집입니다. 보쌈 하나로 반찬 걱정 없이 한 상 차려지고 가격도 착하고 늘 신선해요.","author":"함○○ 팀장님 · 공공기관"}]
  },
  {
    id: 27, name: "이명재", company: "세무법인 건율", category: "법률/세무",
    specialty: "세무 컨설팅",
    headline: "믿고 맡길수 있는 기장, 합리적인 절세",
    targetCustomer: "증여, 상속 컨설팅 필요하신분",
    description: "성심 성의껏 돕겠습니다.",
    phone: "010-3264-9026", email: "", address: "",
    instagram: "", kakao: "https://open.kakao.com/o/shEa7Hpi", website: "",
    color: "#117A8B", featured: true, photoUrl: "",
    testimonials: [{"metric":"증여세 합법 절세, 세금 2,800만원 절감","quote":"부모님께 상가 건물을 증여받을 때 세금 걱정이 컸는데 꼼꼼하게 절세 방법을 찾아줬어요. 납부해야 할 세금이 생각보다 훨씬 줄었습니다.","author":"권○○ 대표님 · 부동산"},{"metric":"세무조사 대응, 추징세금 0원","quote":"세무조사가 나왔을 때 당황했는데 처음부터 끝까지 대리해줬어요. 꼼꼼한 장부 덕분에 추가 납부 없이 마무리됐습니다.","author":"성○○ 원장님 · 병원"}]
  },
  {
    id: 28, name: "손미", company: "럭셔리 부동산", category: "부동산/인테리어",
    specialty: "수익형 부동산",
    headline: "수익형 부동산 A부터 Z까지 다해드립니다.",
    targetCustomer: "수익형 부동산, 월세 매물 찾으시는분",
    description: "곡반정동에서 수익형부동산, 전월세 매매를 주로 컨설팅하고 있습니다.",
    phone: "010-8983-1005", email: "", address: "경기도 수원시 권선구 곡반정동 539-2",
    instagram: "", kakao: "", website: "",
    color: "#F39C12", featured: true, photoUrl: "https://ocmnbwlhjovfycihyvnr.supabase.co/storage/v1/object/public/member-photos/member-1776850833317.jpg",
    testimonials: []
  },
  {
    id: 29, name: "이보옥", company: "명진청과", category: "식품/외식",
    specialty: "과일",
    headline: "소중한 고객들을 위한 정성스러운 과일선물",
    targetCustomer: "선물용 과일세트, 단체구매",
    description: "소중한 고객들을 위한 정성스러운 과일선물 제공해드립니다.",
    phone: "010-2224-7321", email: "lbo7321@naver.com", address: "경기도 수원시 권선구 세권로 243(권선동) 과일동 4번 GATE 18번",
    instagram: "", kakao: "https://open.kakao.com/o/sPaoFuqi", website: "",
    color: "#1D8348", featured: true, photoUrl: "",
    testimonials: []
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
