import { HealthStatus } from './types';

export async function checkGroqHealth(apiKey: string): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const Groq = (await import('groq-sdk')).default;
    const client = new Groq({ apiKey });

    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return {
        healthy: true,
        latencyMs,
        lastChecked: new Date(),
      };
    }

    return {
      healthy: false,
      latencyMs,
      lastChecked: new Date(),
      errorMessage: `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error: any) {
    return {
      healthy: false,
      lastChecked: new Date(),
      errorMessage: error.message || 'Health check failed',
    };
  }
}

export async function checkGeminiHealth(apiKey: string): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    await model.generateContent('Health check ping');

    const latencyMs = Date.now() - startTime;

    return {
      healthy: true,
      latencyMs,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      lastChecked: new Date(),
      errorMessage: error.message || 'Health check failed',
    };
  }
}
