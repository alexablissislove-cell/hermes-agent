export type BrightDataProxyConfig = {
  host: string;
  port: number;
  zone: string;
  username: string;
  password: string;
};

const requiredBrightDataKeys = [
  "BRIGHTDATA_PROXY_HOST",
  "BRIGHTDATA_PROXY_PORT",
  "BRIGHTDATA_ZONE",
  "BRIGHTDATA_USERNAME",
  "BRIGHTDATA_PASSWORD",
] as const;

export function getBrightDataProxyConfig(env: NodeJS.ProcessEnv = process.env): BrightDataProxyConfig | null {
  const values = requiredBrightDataKeys.map(key => env[key]?.trim());
  if (values.some(value => !value)) return null;

  const port = Number(values[1]);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;

  return {
    host: values[0]!,
    port,
    zone: values[2]!,
    username: values[3]!,
    password: values[4]!,
  };
}

export function redactSecret(value: string | undefined, visibleSuffix = 4) {
  if (!value) return "<unset>";
  if (value.length <= visibleSuffix) return "<redacted>";
  return `${"*".repeat(Math.max(4, value.length - visibleSuffix))}${value.slice(-visibleSuffix)}`;
}

export function describeBrightDataConfig(config: BrightDataProxyConfig | null) {
  if (!config) return { configured: false } as const;
  return {
    configured: true,
    host: config.host,
    port: config.port,
    zone: redactSecret(config.zone),
    username: redactSecret(config.username),
  } as const;
}
