import express from 'express';
import { requireAuth, withBusiness, perm } from '../auth.js';
import { ah, bad } from '../lib/http.js';

/*
 * "Translate from Kurdish" — the receipt-message editor's only translation
 * source. It is a real provider call, never a canned answer: when no provider
 * key is configured the endpoint answers 501 and the editor tells the
 * administrator that translation is unavailable instead of inventing text.
 *
 * Configuration (environment):
 *   TRANSLATION_API_KEY   provider key (OPENAI_API_KEY is also accepted)
 *   TRANSLATION_API_URL   OpenAI-compatible chat-completions URL
 *   TRANSLATION_MODEL     model name
 *
 * Placeholders (`{order_number}`, `{total}`, …) are extracted from the source
 * and must survive every translation unchanged, otherwise nothing is applied.
 */

const router = express.Router();
router.use(requireAuth);

const PLACEHOLDER = /\{[a-z_]+\}/gi;

const apiKey = () => process.env.TRANSLATION_API_KEY || process.env.OPENAI_API_KEY || '';
const apiUrl = () => process.env.TRANSLATION_API_URL || 'https://api.openai.com/v1/chat/completions';
const model = () => process.env.TRANSLATION_MODEL || 'gpt-4o-mini';

/** Pulls the JSON object out of a chat reply, fences included. */
function parseTranslations(content) {
  const raw = String(content || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const placeholdersOf = (text) => (String(text).match(PLACEHOLDER) || []).map((p) => p.toLowerCase());

router.post(
  '/translate',
  withBusiness('manager'),
  perm('text_editor.edit'),
  ah(async (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) throw bad('TEXT_REQUIRED');
    if (text.length > 1000) throw bad('TEXT_TOO_LONG');

    const key = apiKey();
    if (!key) {
      res.status(501).json({ error: 'TRANSLATION_NOT_CONFIGURED' });
      return;
    }

    const wanted = [...new Set(placeholdersOf(text))];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(apiUrl(), {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model(),
          temperature: 0.2,
          messages: [
            {
              role: 'system',
              content:
                'You translate restaurant receipt messages from Kurdish Sorani into Persian (fa), Arabic (ar) and English (en). ' +
                'Reply with a JSON object only, using exactly the keys fa, ar and en. ' +
                'Keep the meaning, tone and line breaks. Copy every {placeholder} token exactly as it appears, untranslated. ' +
                'Do not add explanations, quotes or markdown.',
            },
            { role: 'user', content: text },
          ],
        }),
      });

      if (!response.ok) {
        console.warn('[translate] provider answered', response.status);
        res.status(502).json({ error: 'TRANSLATION_FAILED' });
        return;
      }

      const payload = await response.json();
      const parsed = parseTranslations(payload?.choices?.[0]?.message?.content);
      const translations = {};
      for (const code of ['fa', 'ar', 'en']) {
        const value = parsed?.[code];
        if (typeof value !== 'string' || !value.trim()) {
          res.status(502).json({ error: 'TRANSLATION_FAILED' });
          return;
        }
        translations[code] = value.trim();
      }

      const missing = wanted.some(
        (token) => !['fa', 'ar', 'en'].every((code) => translations[code].toLowerCase().includes(token)),
      );
      if (missing) {
        res.status(502).json({ error: 'PLACEHOLDER_MISSING' });
        return;
      }

      res.json({ translations });
    } catch (err) {
      console.warn('[translate] request failed:', err?.name || 'error');
      res.status(502).json({ error: 'TRANSLATION_FAILED' });
    } finally {
      clearTimeout(timer);
    }
  }),
);

export default router;
