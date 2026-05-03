/* ============================================================
   BNI STAR — Public Members API
   GET /api/members → 전체 회원 데이터 JSON 반환
   ============================================================ */

import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const code = readFileSync(join(process.cwd(), 'js/members-data.js'), 'utf8');
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    const members = (sandbox.MEMBERS_DEFAULT || []).map(m => ({
      ...m,
      photoUrl: m.photoUrl || sandbox.SAMPLE_PHOTOS?.[m.id] || '',
    }));

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.json({ members, categories: sandbox.CATEGORIES || [] });
  } catch (err) {
    console.error('members API error:', err);
    return res.status(500).json({ error: 'Failed to load members' });
  }
}
