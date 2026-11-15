import { z } from 'zod';

const responseBodySchema = z.union([z.record(z.unknown()), z.array(z.unknown())]);
export function compatibilityBody(
  data: Record<string, unknown> | unknown[],
  scenario: string | null,
) {
  if (scenario !== 'legacy') return data;
  const body: unknown = JSON.parse(
    JSON.stringify(data, (key, value: unknown) => (key === 'evidence' ? undefined : value)),
  );
  return responseBodySchema.parse(body);
}
export const qaScenario = () => new URLSearchParams(window.location.search).get('qaMock');
