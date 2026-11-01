/**
 * Multi-Model AI Orchestrator & Heuristic Cleanser
 * Mendukung Gemini, Groq (Llama-3.3-70B), OpenAI, serta Built-in Intelligent Fallback
 */

import { HUMANIZER_SYSTEM_PROMPT, buildHumanizerPrompt } from './humanizer-prompts';

/**
 * Heuristic Cleanser (Layer 2)
 * Membersihkan watermark atau kata klise sisa yang mungkin masih muncul dari LLM
 */
export function cleanAiWatermarks(text) {
  let cleaned = text;

  // === LAYER 3: Aggressive AI Signature Erasure ===
  // These exact phrases are flagged by Isgen.ai and other detectors
  const replacements = [
    // Robot connector phrases (Indonesian)
    { pattern: /\boleh karena itu[,.]?/gi, replacement: 'makanya,' },
    { pattern: /\boleh sebab itu[,.]?/gi, replacement: 'karena itulah,' },
    { pattern: /\bselain itu[,.]?/gi, replacement: 'lagi pula,' },
    { pattern: /\bdi samping itu[,.]?/gi, replacement: 'tak hanya itu,' },
    { pattern: /\bnamun demikian[,.]?/gi, replacement: 'tapi kenyataannya,' },
    { pattern: /\bmeskipun demikian[,.]?/gi, replacement: 'walau begitu,' },
    { pattern: /\bdengan demikian[,.]?/gi, replacement: 'alhasil,' },
    { pattern: /\bberdasarkan hal tersebut[,.]?/gi, replacement: 'dari sini' },
    { pattern: /\btidak dapat dipungkiri bahwa/gi, replacement: 'nyatanya' },
    { pattern: /\bdapat disimpulkan bahwa/gi, replacement: 'intinya,' },
    { pattern: /\bdapat dikatakan bahwa/gi, replacement: 'artinya,' },
    { pattern: /\bpenting untuk diingat bahwa/gi, replacement: 'yang perlu diingat:' },
    { pattern: /\bpenting untuk dicatat bahwa/gi, replacement: 'satu hal yang jelas—' },
    { pattern: /\bpenting untuk dicatat/gi, replacement: 'perlu dicermati' },
    { pattern: /\bdalam era digital saat ini/gi, replacement: 'belakangan ini' },
    { pattern: /\bdi era digital saat ini/gi, replacement: 'saat ini' },
    { pattern: /\bdi era modern ini/gi, replacement: 'sekarang' },
    { pattern: /\bdalam era perkembangan[\w\s]*/gi, replacement: 'belakangan ini' },
    { pattern: /\bmemainkan per[ao]n[an]* (?:yang )?(?:sangat )?(?:penting|krusial)/gi, replacement: 'punya andil besar' },
    { pattern: /\bsecara holistik/gi, replacement: 'secara menyeluruh' },
    { pattern: /\bsecara keseluruhan/gi, replacement: 'pada akhirnya' },
    { pattern: /\bhanya dengan cara inilah/gi, replacement: 'caranya cukup sederhana:' },
    { pattern: /\btransformatif/gi, replacement: 'mengubah banyak hal' },
    { pattern: /\bsignifikan/gi, replacement: 'cukup besar' },
    { pattern: /\bkomprehensif/gi, replacement: 'menyeluruh' },
    { pattern: /\bberkelanjutan/gi, replacement: 'jangka panjang' },
    { pattern: /\bholistik/gi, replacement: 'menyeluruh' },
    // English AI phrases
    { pattern: /\bfurthermore[,.]?/gi, replacement: 'also,' },
    { pattern: /\bmoreover[,.]?/gi, replacement: 'besides,' },
    { pattern: /\bin conclusion[,.]?/gi, replacement: 'all in all,' },
    { pattern: /\bit is important to note that/gi, replacement: 'notably,' },
    { pattern: /\bdelve into/gi, replacement: 'explore' },
    { pattern: /\ba testament to/gi, replacement: 'proof of' },
    { pattern: /\bnuanced/gi, replacement: 'complex' },
    { pattern: /\btapestry/gi, replacement: 'mix' },
    { pattern: /\bleverage/gi, replacement: 'use' },
    { pattern: /\bpivotal/gi, replacement: 'key' },
    { pattern: /\bunderscores/gi, replacement: 'shows' },
  ];

  replacements.forEach(({ pattern, replacement }) => {
    cleaned = cleaned.replace(pattern, replacement);
  });

  // Strip any AI preamble phrases the model may have prepended
  cleaned = cleaned
    .replace(/^(berikut(?:\s+adalah)?\s+(?:hasil\s+)?(?:tulisan|penulisan|versi|teks)[^:]*:\s*)/i, '')
    .replace(/^(tentu[,!]\s+(?:saya\s+akan|berikut)[^:]*:\s*)/i, '')
    .replace(/^(baik[,!]\s+(?:saya\s+akan|berikut)[^:]*:\s*)/i, '')
    .replace(/^(hasil penulisan ulang:\s*)/i, '')
    .replace(/\n\n\*\*Catatan[\s\S]*$/, '') // strip trailing notes
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Call Google Gemini API
 */
async function callGemini(text, tone, apiKey) {
  // Try models in order of preference
  const geminiModels = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-pro-latest'
  ];
  const userPrompt = buildHumanizerPrompt(text, tone);
  let lastError = null;

  for (const model of geminiModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(6000), // Max 6 seconds per model
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: HUMANIZER_SYSTEM_PROMPT }] },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 1.35,
            topP: 0.97,
            topK: 64,
            maxOutputTokens: 2048
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = new Error(`Gemini [${model}] Error: ${response.status} - ${errorText}`);
        continue;
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) {
        lastError = new Error(`Gemini [${model}] mengembalikan respons kosong.`);
        continue;
      }
      return { content: rawOutput, modelUsed: `Google Gemini (${model})` };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Semua model Gemini gagal.');
}

/**
 * Call Groq Cloud API with model fallback
 */
async function callGroq(text, tone, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const userPrompt = buildHumanizerPrompt(text, tone);
  const candidateModels = [
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b'
  ];

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(15000), // 15s timeout
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: HUMANIZER_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: 1.3,
          max_tokens: 2048,
          top_p: 0.97
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return { content, modelUsed: `Groq (${model})` };
      } else {
        const errorText = await response.text();
        lastError = new Error(`Groq [${model}] Error: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Semua model Groq gagal diakses.');
}

/**
 * Call OpenAI API (GPT-4o-mini)
 */
async function callOpenAI(text, tone, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const userPrompt = buildHumanizerPrompt(text, tone);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: HUMANIZER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 1.3,
      max_tokens: 2048,
      top_p: 0.97
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('OpenAI mengembalikan respons kosong.');
  return { content, modelUsed: 'OpenAI (GPT-4o-mini)' };
}

/**
 * Built-in Intelligent Fallback Engine
 * Bekerja jika pengguna belum mengisi API Key di .env.local
 */
function runBuiltinHeuristicEngine(text, tone) {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  const tonePreamble = {
    natural: 'Kalau kita perhatikan secara jujur, ',
    academic: 'Secara komparatif dan berdasarkan dinamika lapangan, ',
    casual: 'Gini lho ya, kalau diliat dari kacamata sehari-hari, ',
    professional: 'Ditinjau dari orientasi efisiensi operasional saat ini, ',
    stealth: 'Siapa sangka jika pada kenyataannya, '
  };

  const rewrittenParagraphs = paragraphs.map((para, pIdx) => {
    let p = cleanAiWatermarks(para);

    // Sentence splitting & jittering
    const sents = p.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
    const rewrittenSents = sents.map((s, idx) => {
      let trimmed = s.trim();

      // Add rhythmic transitions to sentence #1
      if (idx === 0 && pIdx === 0) {
        trimmed = (tonePreamble[tone] || '') + trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
      }

      // Vary cadence and replace clunky phrases
      trimmed = trimmed
        .replace(/\bHal ini dikarenakan\b/gi, 'Sebab')
        .replace(/\bDengan kata lain\b/gi, 'Singkatnya')
        .replace(/\bSebagai konsekuensinya\b/gi, 'Alhasil')
        .replace(/\bPada akhirnya\b/gi, 'Ujung-ujungnya')
        .replace(/\bOleh sebab itu\b/gi, 'Maka dari itu');

      return trimmed;
    });

    return rewrittenSents.join(' ');
  });

  return rewrittenParagraphs.join('\n\n');
}

/**
 * Main Orchestrator Function with Cascading Fallback
 * @param {string} text - The input text to humanize
 * @param {string} tone - Desired tone
 * @returns {Promise<{ humanizedText: string, providerUsed: string, engineNote: string }>}
 */
export async function executeHumanizer(text, tone = 'natural') {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const preferred = (process.env.DEFAULT_AI_PROVIDER || 'auto').toLowerCase();

  let rawResult = '';
  let providerUsed = '';
  let engineNote = '';

  // Define priority queue
  const queue = [];
  if (preferred === 'gemini') {
    if (geminiKey) queue.push('gemini');
    if (openaiKey) queue.push('openai');
    if (groqKey) queue.push('groq');
  } else if (preferred === 'groq') {
    if (groqKey) queue.push('groq');
    if (openaiKey) queue.push('openai');
    if (geminiKey) queue.push('gemini');
  } else if (preferred === 'openai') {
    if (openaiKey) queue.push('openai');
    if (geminiKey) queue.push('gemini');
    if (groqKey) queue.push('groq');
  } else {
    // "auto": prioritize OpenAI & Gemini, then Groq
    if (openaiKey) queue.push('openai');
    if (geminiKey) queue.push('gemini');
    if (groqKey) queue.push('groq');
  }

  // Cascading execution
  for (const provider of queue) {
    try {
      if (provider === 'openai' && openaiKey && openaiKey.trim().length > 5) {
        const res = await callOpenAI(text, tone, openaiKey.trim());
        rawResult = res.content;
        providerUsed = res.modelUsed;
        engineNote = `Diproses menggunakan ${res.modelUsed}`;
        break;
      } else if (provider === 'gemini' && geminiKey && geminiKey.trim().length > 5) {
        const res = await callGemini(text, tone, geminiKey.trim());
        rawResult = res.content;
        providerUsed = res.modelUsed;
        engineNote = `Diproses menggunakan ${res.modelUsed}`;
        break;
      } else if (provider === 'groq' && groqKey && groqKey.trim().length > 5) {
        const res = await callGroq(text, tone, groqKey.trim());
        rawResult = res.content;
        providerUsed = res.modelUsed;
        engineNote = `Diproses menggunakan ${res.modelUsed}`;
        break;
      }
    } catch (err) {
      console.warn(`[AI Provider] Warning: ${provider} failed (${err.message}). Trying next in queue.`);
    }
  }

  // 2. Fallback to Built-in Heuristic Transformer if rawResult is empty
  if (!rawResult || rawResult.trim().length === 0) {
    rawResult = runBuiltinHeuristicEngine(text, tone);
    providerUsed = 'Built-in Heuristic Engine (Offline / Local)';
    engineNote = 'Diproses dengan mesin penyesuaian sintaks & de-watermarking lokal';
  }

  // 3. Post-Processing Cleanser (Layer 2)
  const cleanedText = cleanAiWatermarks(rawResult);

  return {
    humanizedText: cleanedText,
    providerUsed,
    engineNote
  };
}
