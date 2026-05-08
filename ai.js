// ── AttachMate AI Module ──
// Uses Claude API for smart matching and cover letter generation

async function callClaude(prompt, systemPrompt = '') {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt || 'You are a helpful AI assistant for an internship/attachment platform in Kenya called AttachMate. Be concise and practical.',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || '';
  } catch (e) {
    console.error('AI error:', e);
    return null;
  }
}

async function getAIMatches(user, opportunities) {
  if (!user || !opportunities.length) return [];

  const profile = `
Student: ${user.name}
Course: ${user.course || 'Not specified'}
University: ${user.university || 'Not specified'}
Skills: ${(user.skills || []).join(', ') || 'Not specified'}
Interests: ${user.interests || 'Not specified'}
Location preference: ${user.location || 'Nairobi'}
  `.trim();

  const oppList = opportunities.slice(0, 10).map((o, i) =>
    `${i + 1}. ID:${o.id} | "${o.title}" at ${getOrg(o.orgId)?.name || o.orgId} | Industry: ${o.industry} | Location: ${o.location} | Skills needed: ${o.skills?.join(', ')}`
  ).join('\n');

  const prompt = `
Given this student profile:
${profile}

And these opportunities:
${oppList}

Return ONLY a JSON array (no markdown, no explanation) of the top 3 best-matching opportunity IDs and match scores, like:
[{"id":"opp1","score":92,"reason":"Strong Python match for software role"},{"id":"opp2","score":78,"reason":"Finance background aligns well"},{"id":"opp3","score":65,"reason":"Data skills transferable to this role"}]
  `.trim();

  const result = await callClaude(prompt, 'You are a precise job-matching AI. Return only valid JSON arrays. No markdown or explanation.');
  if (!result) return [];

  try {
    const clean = result.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

async function generateCoverLetter(user, opportunity, org) {
  const prompt = `
Write a professional but genuine cover letter (150-180 words) for:

Student: ${user.name}
Course: ${user.course || 'Business'}
University: ${user.university || 'University of Nairobi'}
Skills: ${(user.skills || []).join(', ')}

Applying for: ${opportunity.title}
Organization: ${org?.name || 'the organization'}
Duration: ${opportunity.duration}
Requirements: ${opportunity.requirements}

Write in first person. Be specific, enthusiastic, and professional. End with a clear call to action.
  `.trim();

  return await callClaude(prompt, 'You write concise, genuine cover letters for Kenyan students applying for attachments and internships.');
}

async function getCareerTip(user) {
  const prompt = `Give one short (2-3 sentence) practical career tip for a ${user.course || 'university'} student looking for an attachment/internship in Kenya. Make it specific and actionable.`;
  return await callClaude(prompt);
}
