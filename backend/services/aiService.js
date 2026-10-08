import { AppError } from '../middleware/errorMiddleware.js';

const DEFAULT_AI_URL = 'http://127.0.0.1:8000';

function aiBaseUrl() {
  return (process.env.AI_SERVICE_URL || DEFAULT_AI_URL).replace(/\/+$/, '');
}

/**
 * Probe AI health endpoint. Returns true only when reachable and healthy.
 */
export async function checkAiHealth(timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${aiBaseUrl()}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return data?.status === 'ok' || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function postAi(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(`${aiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await res.json().catch(() => null)
      : null;

    if (!res.ok) {
      const message =
        (data && (data.detail || data.error || data.message)) ||
        `AI service error (${res.status})`;
      throw new AppError(
        typeof message === 'string' ? message : JSON.stringify(message),
        res.status === 422 ? 400 : res.status >= 500 ? 503 : res.status
      );
    }

    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw new AppError('AI service timeout', 503);
    }
    throw new AppError(
      'AI service unavailable. Ensure the Python AI service is running on port 8000.',
      503
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Forward risk analysis to POST /analyze-risk on the Python AI service.
 * Does NOT fabricate results.
 */
export async function analyzeRisk(payload) {
  return postAi('/analyze-risk', payload);
}

/**
 * Forward route analysis to POST /analyze-routes on the Python AI service.
 */
export async function analyzeRoutes(payload) {
  return postAi('/analyze-routes', payload);
}

export default { checkAiHealth, analyzeRisk, analyzeRoutes };
