/* ============================================================
   BNI STAR — AI 전문가 매칭 챗봇
   Claude Haiku로 사용자 고민을 분석하고 맞는 전문가를 추천합니다.
   환경변수 ANTHROPIC_API_KEY 필요 (Vercel 대시보드에서 설정)
   ============================================================ */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message, members } = req.body || {};
  if (!message || !members) return res.status(400).json({ error: 'missing fields' });

  const membersText = members
    .map(m => `[ID:${m.id}] ${m.name} | ${m.category} | ${m.specialty} | ${m.description || ''} | 대상:${m.targetCustomer || ''}`)
    .join('\n');

  const systemPrompt = `당신은 BNI STAR 수원 챕터의 전문가 매칭 어시스턴트입니다.
사용자의 비즈니스 고민을 듣고 가장 적합한 전문가를 추천해주세요.

등록된 전문가 목록:
${membersText}

응답 규칙:
- 친근하고 따뜻한 한국어로 2~3문장 이내로 답변하세요
- 사용자의 문제를 먼저 공감하고 추천 이유를 간결하게 설명하세요
- 가장 적합한 전문가 1~3명을 추천하고 해당 ID를 memberIds 배열에 넣으세요
- 반드시 아래 JSON 형식으로만 응답하세요 (마크다운 없이):
{"reply":"...", "memberIds":[숫자,...]}`;

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: [
          { role: 'user', content: message },
          { role: 'assistant', content: '{"reply":"' }, // JSON 형식 강제
        ],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.', memberIds: [] });
    }

    const data = await apiRes.json();
    // 프리필 '{"reply":"' 를 다시 붙여서 완전한 JSON으로 복원
    const raw = '{"reply":"' + data.content[0].text;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON 파싱 실패 시 텍스트만 추출
      parsed = { reply: raw.replace(/\{.*\}/s, '').trim() || '전문가를 찾아드릴게요!', memberIds: [] };
    }

    return res.json({ reply: parsed.reply || '', memberIds: parsed.memberIds || [] });
  } catch (err) {
    console.error('chat handler error:', err);
    return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.', memberIds: [] });
  }
}
