/* ============================================================
   BNI STAR — Vercel Serverless Function
   GitHub에 members-data.js를 업데이트하여 자동 배포를 트리거합니다.
   환경변수 GITHUB_TOKEN 필요 (Vercel 대시보드에서 설정)
   ============================================================ */

const OWNER = 'yijerin-bridge';
const REPO  = 'bni-star';
const PATH  = 'js/members-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });

  const { members } = req.body;
  if (!Array.isArray(members)) return res.status(400).json({ error: 'Invalid members data' });

  try {
    // 현재 파일의 SHA 가져오기
    const fileRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!fileRes.ok) throw new Error(`GitHub file fetch failed: ${fileRes.status}`);
    const fileData = await fileRes.json();
    const sha = fileData.sha;

    // 새 파일 내용 생성
    const content = generateMembersDataJs(members);
    const encoded = Buffer.from(content).toString('base64');

    // 파일 업데이트
    const updateRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Update members data from admin panel',
          content: encoded,
          sha,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.message || 'GitHub update failed');
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('save-members error:', e);
    return res.status(500).json({ error: e.message });
  }
}

function generateMembersDataJs(members) {
  const membersJson = members.map(m => {
    return `  {
    id: ${m.id}, name: ${JSON.stringify(m.name)}, company: ${JSON.stringify(m.company)}, category: ${JSON.stringify(m.category)},
    specialty: ${JSON.stringify(m.specialty || '')},
    headline: ${JSON.stringify(m.headline || '')},
    targetCustomer: ${JSON.stringify(m.targetCustomer || '')},
    description: ${JSON.stringify(m.description || '')},
    phone: ${JSON.stringify(m.phone || '')}, email: ${JSON.stringify(m.email || '')}, address: ${JSON.stringify(m.address || '')},
    instagram: ${JSON.stringify(m.instagram || '')}, kakao: ${JSON.stringify(m.kakao || '')}, website: ${JSON.stringify(m.website || '')},
    color: ${JSON.stringify(m.color || '#C0392B')}, featured: ${m.featured ? 'true' : 'false'}, photoUrl: ${JSON.stringify(m.photoUrl || '')},
    testimonial: ${m.testimonial ? JSON.stringify(m.testimonial) : 'null'}
  }`;
  }).join(',\n');

  return `/* ============================================================
   BNI STAR — Shared Member Data
   ============================================================ */

const MEMBERS_DEFAULT = [
${membersJson}
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
`;
}
