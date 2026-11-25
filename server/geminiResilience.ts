export function isAuthOrConfigError(err: unknown): boolean {
  const msg = extractRawErrorMessage(err);
  return (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('not configured') ||
    msg.includes('401') ||
    msg.includes('403')
  );
}

export function isTransientModelError(err: unknown): boolean {
  const msg = extractRawErrorMessage(err).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('500') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('internal') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('fetch failed')
  );
}

export function isModelNotFoundError(err: unknown): boolean {
  const msg = extractRawErrorMessage(err).toLowerCase();
  return msg.includes('404') || msg.includes('not_found') || msg.includes('is not found');
}

export function extractRawErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export function formatFriendlyGeminiError(err: unknown): string {
  const raw = extractRawErrorMessage(err).trim();

  if (raw.includes('not configured') || raw.includes('GEMINI_API_KEY')) {
    return raw;
  }

  // Attempt to unpack nested Google API JSON error strings
  let parsedMessage = raw;
  let parsedCode: number | undefined;
  let parsedStatus: string | undefined;

  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const obj = JSON.parse(raw.slice(jsonStart)) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (obj?.error) {
        parsedCode = obj.error.code;
        parsedMessage = obj.error.message || raw;
        parsedStatus = obj.error.status;
      }
    } catch {
      // Keep raw string
    }
  }

  if (
    parsedCode === 401 ||
    parsedCode === 403 ||
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED')
  ) {
    return 'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets.';
  }

  if (parsedCode === 429 || parsedStatus === 'RESOURCE_EXHAUSTED') {
    return 'Gemini API rate limit temporarily reached. Please wait a few seconds and try again.';
  }

  if (parsedCode === 503 || parsedStatus === 'UNAVAILABLE' || parsedMessage.toLowerCase().includes('high demand')) {
    return 'Gemini models are temporarily experiencing a brief high-demand spike after automatic retries and failover. Please retry in a few seconds.';
  }

  return parsedMessage;
}

export async function runWithModelFailover<T>(
  models: string[],
  executor: (model: string) => Promise<T>,
  options?: {
    attemptsPerModel?: number;
    baseDelayMs?: number;
    sleepFn?: (ms: number) => Promise<void>;
  },
): Promise<{ result: T; modelUsed: string }> {
  const attemptsPerModel = options?.attemptsPerModel ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 900;
  const sleep =
    options?.sleepFn ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  let lastError: unknown;

  for (let mIdx = 0; mIdx < models.length; mIdx++) {
    const model = models[mIdx];
    const hasNextModel = mIdx < models.length - 1;

    for (let attempt = 0; attempt < attemptsPerModel; attempt++) {
      try {
        const result = await executor(model);
        return { result, modelUsed: model };
      } catch (err: unknown) {
        lastError = err;

        if (isAuthOrConfigError(err)) {
          throw new Error(formatFriendlyGeminiError(err));
        }

        if (isModelNotFoundError(err) && hasNextModel) {
          break;
        }

        if (!isTransientModelError(err)) {
          throw new Error(formatFriendlyGeminiError(err));
        }

        const isLastAttemptForModel = attempt === attemptsPerModel - 1;
        if (!isLastAttemptForModel) {
          const jitter = Math.floor(Math.random() * 250);
          await sleep(baseDelayMs * 2 ** attempt + jitter);
        } else if (hasNextModel) {
          // Brief pause before failing over to the secondary model
          await sleep(Math.min(400, baseDelayMs));
        }
      }
    }
  }

  throw new Error(formatFriendlyGeminiError(lastError));
}
