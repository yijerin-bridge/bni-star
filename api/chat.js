/* ============================================================
   BNI STAR — AI 전문가 매칭 챗봇
   tool_use로 구조화된 JSON 응답을 보장합니다.
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
사용자의 비즈니스 고민을 듣고 가장 적합한 전문가를 recommend_experts 도구로 추천하세요.

등록된 전문가 목록:
${membersText}

응답 규칙:
- 친근하고 따뜻한 한국어로 2~3문장 이내로 답변하세요
- 사용자의 문제에 먼저 공감하고 추천 이유를 간결하게 설명하세요
- 가장 적합한 전문가 1~3명을 추천하세요
- 전문가 목록에 없는 분야라면 reply에 솔직하게 안내하고 memberIds는 빈 배열로 두세요`;

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
        max_tokens: 500,
        system: systemPrompt,
        tools: [{
          name: 'recommend_experts',
          description: '사용자 고민에 맞는 전문가를 추천합니다',
          input_schema: {
            type: 'object',
            properties: {
              reply: {
                type: 'string',
                description: '사용자에게 보낼 친근한 응답 메시지 (2~3문장)',
              },
              memberIds: {
                type: 'array',
                items: { type: 'number' },
                description: '추천 전문가 ID 목록 (1~3개). 해당 없으면 빈 배열.',
              },
            },
            required: ['reply', 'memberIds'],
          },
        }],
        tool_choice: { type: 'tool', name: 'recommend_experts' },
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.', memberIds: [] });
    }

    const data = await apiRes.json();
    const toolUse = data.content.find(c => c.type === 'tool_use');

    if (!toolUse) {
      console.error('No tool_use in response:', JSON.stringify(data));
      return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.', memberIds: [] });
    }

    return res.json({
      reply: toolUse.input.reply || '',
      memberIds: toolUse.input.memberIds || [],
    });
  } catch (err) {
    console.error('chat handler error:', err);
    return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.', memberIds: [] });
  }
}
