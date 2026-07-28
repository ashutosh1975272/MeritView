import { prisma } from '../../db/prisma';
import { decrypt } from '../../utils/crypto';
import { NotFoundError, ForbiddenError, InternalError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { sseBroadcast, sseCleanup } from '../../utils/sse';
import { generateOpinionPdf } from './pdf';

const STANDARD_DISCLAIMERS = [
  'This opinion is provided for informational and decision-support purposes only. It does not constitute legal advice.',
  'You should consult with a licensed attorney regarding your specific legal situation before taking any action.',
  'This analysis is based solely on the information and documents provided by the parties and may not account for all relevant facts or legal nuances.',
  'MeritView makes no guarantees regarding the accuracy, completeness, or outcome of this analysis.',
];

export interface OpinionContent {
  ruling: string;
  reasoning: string;
  strengths: Array<{ party: string; argument: string; weight: number }>;
  weaknesses: Array<{ party: string; argument: string; weight: number }>;
  applicableLaw: string;
  decision: string;
  confidenceScore: number;
}

interface PartyAnalysis {
  strongest_arguments: string[];
  weakest_points: string[];
  factual_concerns: string[];
}

interface ConfidenceIndicators {
  overall_confidence: number;
  evaluator_agreement: number | null;
}

interface SuggestedConsiderations {
  party_a: string[];
  party_b: string[];
}

export interface RestructuredOpinion {
  id: string;
  dispute_id: string;
  generated_at: string;
  prompt_version: string;
  evaluators_used: string[];
  executive_summary: string;
  key_issues: Array<{ issue: string; agreement_level: string }>;
  party_a_analysis: PartyAnalysis;
  party_b_analysis: PartyAnalysis;
  comparative_assessment: string;
  confidence_indicators: ConfidenceIndicators;
  suggested_considerations: SuggestedConsiderations;
  disclaimers: string[];
}

async function verifyDisputeOwnership(disputeId: string, userId: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { parties: { select: { userId: true } } },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  const isInitiator = dispute.initiatorUserId === userId;
  const isParty = dispute.parties.some(p => p.userId === userId);

  if (!isInitiator && !isParty) {
    throw new ForbiddenError('You do not have access to this dispute');
  }

  return dispute;
}

function restructureOpinion(
  opinion: { id: string; disputeId: string; evalPromptVersion: string; aggPromptVersion: string; evaluatorOutputIds: string[]; interEvaluatorAgreement: number | null; overallConfidence: number | null; aggregatorProvider: string; aggregatorModelId: string; totalCostUsd: number; pdfStorageKey: string | null; pdfGeneratedAt: Date | null; createdAt: Date; deliveredAt: Date | null },
  content: OpinionContent
): RestructuredOpinion {
  const partyAAnalysis: PartyAnalysis = {
    strongest_arguments: content.strengths.filter(s => s.party.toLowerCase().includes('a')).map(s => s.argument),
    weakest_points: content.weaknesses.filter(w => w.party.toLowerCase().includes('a')).map(w => w.argument),
    factual_concerns: [],
  };

  const partyBAnalysis: PartyAnalysis = {
    strongest_arguments: content.strengths.filter(s => s.party.toLowerCase().includes('b')).map(s => s.argument),
    weakest_points: content.weaknesses.filter(w => w.party.toLowerCase().includes('b')).map(w => w.argument),
    factual_concerns: [],
  };

  const overallConfidence = opinion.overallConfidence ? Number(opinion.overallConfidence) : content.confidenceScore;
  const interEvaluatorAgreement = opinion.interEvaluatorAgreement ? Number(opinion.interEvaluatorAgreement) : null;

  return {
    id: opinion.id,
    dispute_id: opinion.disputeId,
    generated_at: opinion.createdAt.toISOString(),
    prompt_version: `${opinion.evalPromptVersion} / ${opinion.aggPromptVersion}`,
    evaluators_used: opinion.evaluatorOutputIds,
    executive_summary: content.ruling,
    key_issues: [
      { issue: content.applicableLaw, agreement_level: interEvaluatorAgreement ? `${(interEvaluatorAgreement * 100).toFixed(0)}%` : 'N/A' },
    ],
    party_a_analysis: partyAAnalysis,
    party_b_analysis: partyBAnalysis,
    comparative_assessment: content.decision,
    confidence_indicators: {
      overall_confidence: overallConfidence,
      evaluator_agreement: interEvaluatorAgreement,
    },
    suggested_considerations: {
      party_a: [content.reasoning],
      party_b: [content.reasoning],
    },
    disclaimers: STANDARD_DISCLAIMERS,
  };
}

export async function getOpinion(disputeId: string, userId: string): Promise<{ opinion: RestructuredOpinion }> {
  await verifyDisputeOwnership(disputeId, userId);

  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
  });

  if (!opinion) {
    throw new NotFoundError('Opinion not found for this dispute');
  }

  const contentStr = decrypt(opinion.encryptedContent, opinion.contentEncryptionKeyId);
  let content: OpinionContent;
  try {
    content = JSON.parse(contentStr) as OpinionContent;
  } catch {
    throw new InternalError('Failed to parse opinion content');
  }

  return { opinion: restructureOpinion(opinion as any, content) };
}

export async function getOpinionStatus(
  disputeId: string,
  userId: string
): Promise<{
  dispute_id: string;
  status: 'pending' | 'delivered' | 'error';
  delivered_at: string | null;
  pdf_available: boolean;
  estimated_completion: string;
  progress: {
    evaluations_completed: number;
    evaluations_total: number;
    aggregator_started: boolean;
    aggregator_completed: boolean;
  };
}> {
  await verifyDisputeOwnership(disputeId, userId);

  const [opinion, evaluatorCounts, dispute] = await Promise.all([
    prisma.opinion.findUnique({
      where: { disputeId },
      select: { id: true, deliveredAt: true, pdfStorageKey: true },
    }),
    prisma.evaluatorOutput.groupBy({
      by: ['parseSuccess'],
      where: { disputeId },
      _count: true,
    }),
    prisma.dispute.findUnique({
      where: { id: disputeId },
      select: { state: true },
    }),
  ]);

  const evaluationsTotal = evaluatorCounts.reduce((sum, g) => sum + g._count, 0);
  const evaluationsCompleted = evaluatorCounts
    .filter(g => g.parseSuccess)
    .reduce((sum, g) => sum + g._count, 0);
  const aggregatorStarted = dispute?.state === 'UNDER_ANALYSIS' || dispute?.state === 'COMPLETED' || !!opinion;
  const aggregatorCompleted = !!opinion;

  function estimatedCompletion(): string {
    if (opinion?.deliveredAt) {
      return opinion.deliveredAt.toISOString();
    }
    const estimatePerEvaluatorMs = 30000;
    return new Date(Date.now() + evaluationsTotal * estimatePerEvaluatorMs).toISOString();
  }

  if (!opinion) {
    return {
      dispute_id: disputeId,
      status: 'pending',
      delivered_at: null,
      pdf_available: false,
      estimated_completion: estimatedCompletion(),
      progress: {
        evaluations_completed: evaluationsCompleted,
        evaluations_total: evaluationsTotal,
        aggregator_started: aggregatorStarted,
        aggregator_completed: aggregatorCompleted,
      },
    };
  }

  return {
    dispute_id: disputeId,
    status: opinion.deliveredAt ? 'delivered' : 'pending',
    delivered_at: opinion.deliveredAt?.toISOString() || null,
    pdf_available: !!opinion.pdfStorageKey,
    estimated_completion: estimatedCompletion(),
    progress: {
      evaluations_completed: evaluationsCompleted,
      evaluations_total: evaluationsTotal,
      aggregator_started: aggregatorStarted,
      aggregator_completed: aggregatorCompleted,
    },
  };
}

export async function getOpinionPdfDownload(
  disputeId: string,
  userId: string
): Promise<{ pdf_storage_key: string }> {
  await verifyDisputeOwnership(disputeId, userId);

  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
    select: { pdfStorageKey: true, pdfGeneratedAt: true },
  });

  if (!opinion) {
    throw new NotFoundError('Opinion not found');
  }

  if (opinion.pdfStorageKey && opinion.pdfGeneratedAt) {
    return { pdf_storage_key: opinion.pdfStorageKey };
  }

  const filename = await generateOpinionPdf(disputeId);

  await prisma.opinion.update({
    where: { disputeId },
    data: {
      pdfStorageKey: filename,
      pdfGeneratedAt: new Date(),
    },
  });

  logger.info('Opinion PDF generated', { disputeId, filename });

  return { pdf_storage_key: filename };
}

function generatePdfHtml(
  opinion: {
    disputeId: string;
    evalPromptVersion: string;
    aggPromptVersion: string;
    aggregatorProvider: string;
    aggregatorModelId: string;
    totalCostUsd: number;
    interEvaluatorAgreement: number | null;
    overallConfidence: number | null;
  },
  parsedContent: OpinionContent,
  evaluatorRows: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 18pt; text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
  h2 { font-size: 14pt; margin-top: 20px; color: #333; }
  .meta { text-align: center; font-size: 10pt; color: #666; margin-bottom: 20px; }
  .section { margin: 15px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #333; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  th { background: #333; color: white; padding: 8px; text-align: left; }
  td { padding: 6px; border: 1px solid #ddd; }
  .disclaimer { margin-top: 30px; padding: 15px; border: 1px solid #ccc; background: #f5f5f5; font-size: 9pt; color: #555; }
  .disclaimer h3 { font-size: 10pt; margin-top: 0; }
  .confidence { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
  .confidence-high { background: #d4edda; color: #155724; }
  .confidence-medium { background: #fff3cd; color: #856404; }
  .confidence-low { background: #f8d7da; color: #721c24; }
</style>
</head>
<body>
<h1>MeritView - Opinion of Analysis</h1>
<div class="meta">
  <p>Dispute ID: ${opinion.disputeId}</p>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Evaluation Prompt: ${opinion.evalPromptVersion} | Aggregation Prompt: ${opinion.aggPromptVersion}</p>
  <p>Aggregator: ${opinion.aggregatorProvider} (${opinion.aggregatorModelId})</p>
  <p>Total Cost: $${Number(opinion.totalCostUsd).toFixed(4)}</p>
</div>

<h2>Opinion</h2>
<div class="section">
  <p><strong>Ruling:</strong> ${parsedContent.ruling}</p>
</div>

<h3>Reasoning</h3>
<p>${parsedContent.reasoning}</p>

<h3>Strengths</h3>
<ul>
  ${parsedContent.strengths.map((s) => `<li><strong>${s.party}:</strong> ${s.argument} (weight: ${s.weight})</li>`).join('')}
</ul>

<h3>Weaknesses</h3>
<ul>
  ${parsedContent.weaknesses.map((w) => `<li><strong>${w.party}:</strong> ${w.argument} (weight: ${w.weight})</li>`).join('')}
</ul>

<h3>Applicable Law</h3>
<p>${parsedContent.applicableLaw}</p>

<h3>Decision</h3>
<p>${parsedContent.decision}</p>

<h3>Confidence Score</h3>
<p class="confidence ${parsedContent.confidenceScore >= 0.7 ? 'confidence-high' : parsedContent.confidenceScore >= 0.4 ? 'confidence-medium' : 'confidence-low'}">
  ${(parsedContent.confidenceScore * 100).toFixed(0)}%
</p>

<h2>Inter-Evaluator Agreement</h2>
<p>${opinion.interEvaluatorAgreement ? `${(Number(opinion.interEvaluatorAgreement) * 100).toFixed(1)}%` : 'N/A'}</p>

<h2>Overall Confidence</h2>
<p>${opinion.overallConfidence ? `${(Number(opinion.overallConfidence) * 100).toFixed(1)}%` : 'N/A'}</p>

<h2>Evaluator Outputs</h2>
<table>
  <thead>
    <tr><th>Provider</th><th>Model</th><th>Parsed</th><th>Duration</th><th>Cost</th></tr>
  </thead>
  <tbody>
    ${evaluatorRows}
  </tbody>
</table>

<div class="disclaimer">
  <h3>Disclaimers</h3>
  <ol>
    ${STANDARD_DISCLAIMERS.map((d) => `<li>${d}</li>`).join('')}
  </ol>
  <p><em>This document was generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}.</em></p>
</div>
</body>
</html>`;
}

import os from 'os';
import path from 'path';
import fs from 'fs';

export async function generatePdf(
  opinionId: string,
  disputeId: string
): Promise<string | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    let browser: any = null;

    try {
      const opinion = await prisma.opinion.findUnique({
        where: { id: opinionId },
        include: {
          dispute: {
            include: {
              evaluatorOutputs: {
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });

      if (!opinion) {
        throw new NotFoundError('Opinion not found');
      }

      const contentStr = decrypt(opinion.encryptedContent, opinion.contentEncryptionKeyId);
      let parsedContent: OpinionContent;
      try {
        parsedContent = JSON.parse(contentStr);
      } catch {
        throw new InternalError('Failed to parse opinion content for PDF');
      }

      const { default: puppeteer } = await import('puppeteer');

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });

      const page = await browser.newPage();

      const evaluatorRows = opinion.dispute.evaluatorOutputs
        .map(
          (eo) => `
          <tr>
            <td style="padding:6px;border:1px solid #ddd;">${eo.llmProvider}</td>
            <td style="padding:6px;border:1px solid #ddd;">${eo.modelId}</td>
            <td style="padding:6px;border:1px solid #ddd;">${eo.parseSuccess ? 'Yes' : 'No'}</td>
            <td style="padding:6px;border:1px solid #ddd;">${eo.durationMs}ms</td>
            <td style="padding:6px;border:1px solid #ddd;">$${Number(eo.costUsd).toFixed(4)}</td>
          </tr>`
        )
        .join('');

      const html = generatePdfHtml(
        {
          ...opinion,
          totalCostUsd: Number(opinion.totalCostUsd),
          interEvaluatorAgreement: opinion.interEvaluatorAgreement ? Number(opinion.interEvaluatorAgreement) : null,
          overallConfidence: opinion.overallConfidence ? Number(opinion.overallConfidence) : null,
        },
        parsedContent,
        evaluatorRows
      );

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
        printBackground: true,
      });

      await browser.close();
      browser = null;

      const storageKey = `opinions/${opinion.disputeId}/${opinion.id}.pdf`;
      
      const UPLOAD_DIR = path.join(os.tmpdir(), 'meritview-uploads');
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const filePath = path.join(UPLOAD_DIR, storageKey.replace(/\//g, '_'));
      fs.writeFileSync(filePath, pdfBuffer);

      await prisma.opinion.update({
        where: { id: opinionId },
        data: {
          pdfStorageKey: storageKey,
          pdfGeneratedAt: new Date(),
        },
      });

      sseBroadcast(disputeId, 'pdf-ready', { pdf_storage_key: storageKey });

      logger.info('PDF generated successfully', {
        opinionId,
        disputeId,
        attempt,
        sizeBytes: pdfBuffer.length,
      });

      return storageKey;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('PDF generation attempt failed', {
        opinionId,
        disputeId,
        attempt,
        error: lastError.message,
      });

      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  logger.error('PDF generation failed after retries, delivering without PDF', undefined, {
    opinionId,
    disputeId,
    error: lastError?.message,
  });

  return null;
}

export async function setOpinionDelivered(disputeId: string): Promise<void> {
  await prisma.opinion.update({
    where: { disputeId },
    data: { deliveredAt: new Date() },
  });

  sseBroadcast(disputeId, 'delivered', { dispute_id: disputeId, delivered_at: new Date().toISOString() });
  sseCleanup(disputeId);
}
