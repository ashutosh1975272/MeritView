#!/usr/bin/env npx tsx
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getEvalPrompt } from '../src/prompts/eval-v3.2';

interface EvalOutput {
  provider: string;
  model: string;
  duration: number;
  success: boolean;
  output?: any;
  error?: string;
  promptVersion: string;
}

interface DisputeCase {
  id: string;
  title: string;
  brief: string;
}

async function runGroq(apiKey: string, model: string, prompt: string): Promise<EvalOutput> {
  const start = Date.now();
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a legal analysis assistant. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      }),
    });
    const duration = Date.now() - start;
    if (!resp.ok) {
      const body = await resp.text();
      return { provider: 'groq', model, duration, success: false, error: `HTTP ${resp.status}: ${body}`, promptVersion: 'eval-v3.2' };
    }
    const data = await resp.json() as any;
    const content = data.choices?.[0]?.message?.content;
    return { provider: 'groq', model, duration, success: true, output: JSON.parse(content), promptVersion: 'eval-v3.2' };
  } catch (e) {
    const duration = Date.now() - start;
    return { provider: 'groq', model, duration, success: false, error: String(e), promptVersion: 'eval-v3.2' };
  }
}

async function runGemini(apiKey: string, prompt: string): Promise<EvalOutput> {
  const start = Date.now();
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'text/plain',
        },
      }),
    });
    const duration = Date.now() - start;
    if (!resp.ok) {
      const body = await resp.text();
      return { provider: 'google', model: 'gemini-2.0-flash', duration, success: false, error: `HTTP ${resp.status}: ${body}`, promptVersion: 'eval-v3.2' };
    }
    const data = await resp.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return { provider: 'google', model: 'gemini-2.0-flash', duration, success: true, output: JSON.parse(text), promptVersion: 'eval-v3.2' };
  } catch (e) {
    const duration = Date.now() - start;
    return { provider: 'google', model: 'gemini-2.0-flash', duration, success: false, error: String(e), promptVersion: 'eval-v3.2' };
  }
}

async function main() {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!groqKey && !geminiKey) {
    console.error('ERROR: Set at least GROQ_API_KEY or GEMINI_API_KEY');
    process.exit(1);
  }

  // Load dispute cases
  const disputesDir = resolve(__dirname, 'disputes');
  const disputes: DisputeCase[] = [];

  // Try numbered disputes (dispute-1.json, dispute-2.json, etc.)
  for (let i = 1; i <= 5; i++) {
    try {
      const path = resolve(disputesDir, `dispute-${i}.json`);
      const raw = JSON.parse(readFileSync(path, 'utf-8'));
      disputes.push({
        id: `dispute-${i}`,
        title: raw.title,
        brief: JSON.stringify(raw.brief, null, 2),
      });
      console.log(`  Loaded: dispute-${i} — ${raw.title}`);
    } catch { break; }
  }

  if (disputes.length === 0) {
    console.error('ERROR: No dispute files found in scripts/disputes/');
    process.exit(1);
  }

  console.log(`\nLoaded ${disputes.length} dispute(s) for validation\n`);

  const outputDir = resolve(__dirname, '../docs/validation/outputs');
  mkdirSync(outputDir, { recursive: true });

  const allResults: Record<string, any> = {};

  for (const dispute of disputes) {
    console.log(`\n========== Evaluating: ${dispute.id} ==========`);
    console.log(`  Title: ${dispute.title}`);
    console.log(`  Brief length: ${dispute.brief.length} chars`);

    const prompt = getEvalPrompt(dispute.brief);
    const results: EvalOutput[] = [];

    // Run Groq Llama 3.3 70B (primary)
    if (groqKey) {
      console.log('\n  → Running Groq Llama 3.3 70B...');
      const r = await runGroq(groqKey, 'llama-3.3-70b-versatile', prompt);
      console.log(`    ${r.success ? '✓' : '✗'} ${r.duration}ms${r.error ? ' — ' + r.error.slice(0, 100) : ''}`);
      results.push(r);
    }

    // Run Groq Llama 3.1 8B (secondary)
    if (groqKey) {
      console.log('  → Running Groq Llama 3.1 8B...');
      const r = await runGroq(groqKey, 'llama-3.1-8b-instant', prompt);
      console.log(`    ${r.success ? '✓' : '✗'} ${r.duration}ms${r.error ? ' — ' + r.error.slice(0, 100) : ''}`);
      results.push(r);
    }

    // Run Gemini 2.0 Flash
    if (geminiKey) {
      console.log('  → Running Gemini 2.0 Flash...');
      const r = await runGemini(geminiKey, prompt);
      console.log(`    ${r.success ? '✓' : '✗'} ${r.duration}ms${r.error ? ' — ' + r.error.slice(0, 100) : ''}`);
      results.push(r);
    }

    allResults[dispute.id] = results;

    // Save individual dispute output
    writeFileSync(
      resolve(outputDir, `${dispute.id}.json`),
      JSON.stringify({ dispute: dispute.title, results }, null, 2),
    );
  }

  // Save summary
  const summaryPath = resolve(outputDir, 'validation-summary.json');
  writeFileSync(summaryPath, JSON.stringify(allResults, null, 2));
  console.log(`\n\nResults saved to: ${summaryPath}`);

  // Print summary table
  console.log('\n========== SUMMARY ==========');
  console.log('Provider               Model                 Dispute     Status   Duration  Confidence');
  console.log('───────                ─────                 ───────     ──────   ────────  ──────────');
  for (const [disputeId, results] of Object.entries(allResults)) {
    for (const r of results as EvalOutput[]) {
      const conf = r.success && r.output?.confidenceScore ? `${r.output.confidenceScore}/10` : 'N/A';
      console.log(
        `${(r.provider ?? '').padEnd(22)} ${(r.model ?? '').padEnd(20)} ${disputeId.padEnd(10)} ${
          r.success ? '✓'.padEnd(7) : '✗'.padEnd(7)
        } ${String(r.duration).padEnd(8)}ms ${conf}`
      );
    }
  }
}

main().catch(console.error);
