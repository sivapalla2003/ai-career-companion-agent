import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatFriendlyGeminiError,
  isTransientModelError,
  runWithModelFailover,
} from './geminiResilience';

const NOOP_SLEEP = async () => {};

test('isTransientModelError detects 503 UNAVAILABLE high-demand JSON payload', () => {
  const err = new Error(
    '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
  );
  assert.equal(isTransientModelError(err), true);
  assert.equal(isTransientModelError(new Error('Invalid resume format')), false);
});

test('runWithModelFailover retries transient 503 and fails over to secondary model cleanly', async () => {
  const calls: string[] = [];
  const { result, modelUsed } = await runWithModelFailover(
    ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    async (model) => {
      calls.push(model);
      if (model === 'gemini-4-hydrogen') {
        throw new Error(
          '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}',
        );
      }
      return { ok: true };
    },
    { attemptsPerModel: 2, baseDelayMs: 1, sleepFn: NOOP_SLEEP },
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(modelUsed, 'gemini-3.1-flash-lite');
  assert.deepEqual(calls, ['gemini-4-hydrogen', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
});

test('runWithModelFailover succeeds on retry without switching models when spike clears', async () => {
  let count = 0;
  const { result, modelUsed } = await runWithModelFailover(
    ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    async () => {
      count += 1;
      if (count === 1) {
        throw new Error('503 UNAVAILABLE high demand');
      }
      return 'recovered';
    },
    { attemptsPerModel: 3, baseDelayMs: 1, sleepFn: NOOP_SLEEP },
  );

  assert.equal(result, 'recovered');
  assert.equal(modelUsed, 'gemini-4-hydrogen');
  assert.equal(count, 2);
});

test('formatFriendlyGeminiError converts raw 503 JSON into clean user message', () => {
  const raw =
    '{"error":{"code":503,"message":"This model is currently experiencing high demand.","status":"UNAVAILABLE"}}';
  const msg = formatFriendlyGeminiError(new Error(raw));
  assert.ok(!msg.includes('{"error"'));
  assert.ok(msg.toLowerCase().includes('high-demand'));
});
