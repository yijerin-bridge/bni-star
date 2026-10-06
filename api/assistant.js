/* ============================================================
   BNI STAR — 포털 AI 비서
   포털 데이터(멤버 점수, 목표 등)를 context로 받아 자유 질문에 답변
   ============================================================ */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { messages, context } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'missing messages' });

  // context 요약 텍스트 생성
  let contextText = '';
  if (context) {
    if (context.members?.length) {
      const lightLabel = { green: '🟢그린', amber: '🟡앰버', red: '🔴레드', gray: '⚫그레이' };
      contextText += `\n\n## 멤버 트래픽라이트 현황 (${context.ym || '현재'})\n`;
      contextText += context.members
        .map(m => `- ${m.name}(${m.company||''}): ${lightLabel[m.light]||m.light} ${m.total}점 [출석${m.breakdown?.attendance??'-'} 리퍼럴${m.breakdown?.referral??'-'} 비지터${m.breakdown?.visitor??'-'} 1:1${m.breakdown?.ono??'-'} CEU${m.breakdown?.ceu??'-'} TYFCB${m.breakdown?.tyfcb??'-'} 스폰서${m.breakdown?.sponsored??'-'}]`)
        .join('\n');
    }
    if (context.goals?.length) {
      contextText += `\n\n## 챕터 목표 현황 (${context.ym || '현재'})\n`;
      contextText += context.goals
        .map(g => `- ${g.metric_name}: 목표 ${g.target_value}${g.metric_unit} / 실적 ${g.actual ?? '미집계'}${g.metric_unit}`)
        .join('\n');
    }
    if (context.summary) {
      contextText += `\n\n## 챕터 요약\n${context.summary}`;
    }
  }

  const systemPrompt = `당신은 BNI STAR 챕터의 AI 비서입니다. 챕터 운영에 관한 질문에 데이터를 바탕으로 친절하고 간결하게 답변합니다.

BNI STAR 채점 기준 (100점 만점):
- 출석(/10): 출석률 95%↑→10점 / 88%↑→5점
- 리퍼럴(/25): 주평균 준T1+T2, 1.25↑→25점 (0.25 단위 5점씩)
- 비지터(/25): 누계 5명↑→25점 ~ 1명→5점
- 1:1(/20): 주평균 1.0↑→20점 (0.25 단위 5점씩)
- CEU(/10): 주평균 0.5↑→10점 / 0초과→5점
- 감사장(/5): 연회비(130만원) 배수 — 2배→2점, 5배→3점, 15배→4점, 30배→5점
- 스폰서(/5): 1명 이상→5점

신호등 기준: 🟢그린 70↑ / 🟡앰버 50↑ / 🔴레드 30↑ / ⚫그레이 30미만

현재 포털 데이터:${contextText || '\n(데이터 없음 — 트래픽라이트 페이지에서 열면 데이터가 주입됩니다)'}

답변 규칙:
- 한국어로 간결하게 답변 (3~5문장 이내)
- 데이터 기반 구체적 수치 포함
- 모르는 것은 솔직하게 모른다고 말할 것
- 마크다운 헤더(#) 사용 금지, 굵게(**) 최소화`;

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
        max_tokens: 600,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('Anthropic API error:', err);
      return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.' });
    }

    const data = await apiRes.json();
    const reply = data.content?.find(c => c.type === 'text')?.text || '응답을 받지 못했어요.';
    return res.json({ reply });
  } catch (err) {
    console.error('assistant handler error:', err);
    return res.status(500).json({ reply: '잠시 오류가 발생했어요. 다시 시도해주세요.' });
  }
}
