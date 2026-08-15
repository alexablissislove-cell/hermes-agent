export function getOpenAIConfig(env: NodeJS.ProcessEnv = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim() || env.Openai_api?.trim() || "";
  return apiKey ? { apiKey, baseUrl: (env.OPENAI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "") } : null;
}

export async function verifyOpenAIConnection(env: NodeJS.ProcessEnv = process.env) {
  const config = getOpenAIConfig(env);
  if (!config) return { configured: false, ok: false, status: 412 } as const;

  const response = await fetch(`${config.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });
  const body = await response.json().catch(() => ({ data: [] }));
  return {
    configured: true,
    ok: response.ok,
    status: response.status,
    modelCount: Array.isArray(body?.data) ? body.data.length : 0,
  } as const;
}
