import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { encrypt, decrypt, getActiveKeyId } from '../../utils/crypto';
import { ValidationError, NotFoundError } from '../../utils/errors';
import { OpinionContentData, DISCLAIMER_VERSION } from './index';

export function encryptOpinionContent(content: OpinionContentData): { encryptedContent: string; contentEncryptionKeyId: string } {
  const keyId = getActiveKeyId();
  const encrypted = encrypt(JSON.stringify(content), keyId);
  return {
    encryptedContent: encrypted.encryptedContent,
    contentEncryptionKeyId: encrypted.contentEncryptionKeyId,
  };
}

export function decryptOpinionContent(encryptedContent: string, keyId: string): OpinionContentData {
  const decrypted = decrypt(encryptedContent, keyId);
  return JSON.parse(decrypted) as OpinionContentData;
}

export async function getOpinionWithOwnership(disputeId: string, userId: string): Promise<any> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { opinions: true, parties: true },
  });

  if (!dispute || dispute.deletedAt) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.initiatorUserId !== userId) {
    throw new NotFoundError('Dispute not found');
  }

  if (dispute.state !== 'COMPLETED') {
    throw new ValidationError('Opinion is only available for completed disputes');
  }

  if (!dispute.opinions) {
    throw new NotFoundError('Opinion not yet generated');
  }

  const opinion = dispute.opinions;
  const content = decryptOpinionContent(
    Buffer.from(opinion.encryptedContent).toString('base64'),
    opinion.contentEncryptionKeyId
  );

  return {
    id: opinion.id,
    disputeId: opinion.disputeId,
    ...content,
    evalPromptVersion: opinion.evalPromptVersion,
    aggPromptVersion: opinion.aggPromptVersion,
    evaluatorOutputIds: opinion.evaluatorOutputIds,
    interEvaluatorAgreement: opinion.interEvaluatorAgreement,
    overallConfidence: opinion.overallConfidence,
    aggregatorProvider: opinion.aggregatorProvider,
    aggregatorModelId: opinion.aggregatorModelId,
    totalCostUsd: opinion.totalCostUsd,
    pdfStorageKey: opinion.pdfStorageKey,
    pdfGeneratedAt: opinion.pdfGeneratedAt,
    deliveredAt: opinion.deliveredAt,
    createdAt: opinion.createdAt,
  };
}

export async function generatePDF(disputeId: string): Promise<Buffer> {
  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
  });

  if (!opinion) {
    throw new NotFoundError('Opinion not found');
  }

  const content = decryptOpinionContent(
    Buffer.from(opinion.encryptedContent).toString('base64'),
    opinion.contentEncryptionKeyId
  );

  const html = generatePdfHtml(content);

  try {
    const puppeteer = await import('puppeteer');
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    });
    await browser.close();
    return Buffer.from(pdf);
  } catch (error) {
    logger.warn('PDF generation failed, falling back to web-only', { disputeId, error: String(error) });
    return Buffer.from(html);
  }
}

export async function createOpinionFromAggregation(
  disputeId: string,
  data: {
    content: OpinionContentData;
    evalPromptVersion: string;
    aggPromptVersion: string;
    evaluatorOutputIds: string[];
    interEvaluatorAgreement: number;
    overallConfidence: number;
    aggregatorProvider: string;
    aggregatorModelId: string;
    totalCostUsd: number;
  }
): Promise<any> {
  const existing = await prisma.opinion.findUnique({ where: { disputeId } });
  if (existing) {
    throw new ValidationError('Opinion already exists for this dispute');
  }

  const minDisclaimerCount = 4;
  if (!data.content.disclaimers || data.content.disclaimers.length < minDisclaimerCount) {
    throw new ValidationError(`Opinion must include at least ${minDisclaimerCount} disclaimers`);
  }

  const { encryptedContent, contentEncryptionKeyId } = encryptOpinionContent(data.content);

  const opinion = await prisma.opinion.create({
    data: {
      disputeId,
      encryptedContent: Buffer.from(encryptedContent, 'base64'),
      contentEncryptionKeyId,
      evalPromptVersion: data.evalPromptVersion,
      aggPromptVersion: data.aggPromptVersion,
      evaluatorOutputIds: data.evaluatorOutputIds,
      interEvaluatorAgreement: data.interEvaluatorAgreement,
      overallConfidence: data.overallConfidence,
      aggregatorProvider: data.aggregatorProvider,
      aggregatorModelId: data.aggregatorModelId,
      totalCostUsd: data.totalCostUsd,
      deliveredAt: new Date(),
    },
  });

  let pdfStorageKey: string | null = null;
  try {
    const pdfBuffer = await generatePDF(disputeId);
    const crypto = await import('crypto');
    const pdfHash = crypto.default ? crypto.default.createHash('sha256').update(pdfBuffer).digest('hex') : crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    pdfStorageKey = `opinions/${disputeId}/${pdfHash}.pdf`;

    await prisma.opinion.update({
      where: { id: opinion.id },
      data: { pdfStorageKey, pdfGeneratedAt: new Date() },
    });
  } catch (error) {
    logger.warn('PDF generation skipped, web-only delivery', { disputeId, error: String(error) });
  }

  await prisma.dispute.update({
    where: { id: disputeId },
    data: { completedAt: new Date() },
  });

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { initiator: { select: { id: true, email: true, displayName: true } } },
  });

  if (dispute?.initiator?.email) {
    const { sendOpinionReadyEmail } = await import('../email');
    await sendOpinionReadyEmail(dispute.initiator.email, dispute.title, disputeId);
  }

  logger.info('Opinion created from aggregation', {
    disputeId,
    evaluatorCount: data.evaluatorOutputIds.length,
    totalCostUsd: data.totalCostUsd,
  });

  return prisma.opinion.findUnique({ where: { id: opinion.id } });
}

function generatePdfHtml(content: OpinionContentData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 20mm 15mm; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 22pt; text-align: center; margin-bottom: 5px; }
  h2 { font-size: 16pt; border-bottom: 2px solid #1a1a1a; padding-bottom: 5px; margin-top: 30px; }
  h3 { font-size: 14pt; margin-top: 20px; }
  .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #1a1a1a; padding-bottom: 15px; }
  .disclaimer { background: #f5f5f5; padding: 15px; margin: 20px 0; font-size: 9pt; line-height: 1.4; border-left: 4px solid #999; }
  .disclaimer ul { margin: 0; padding-left: 20px; }
  .disclaimer li { margin-bottom: 5px; }
  .issue { margin-bottom: 10px; padding-left: 10px; border-left: 3px solid #ddd; }
  .analysis-block { margin: 15px 0; padding: 10px; background: #fafafa; border-radius: 4px; }
  .analysis-block ul { margin: 5px 0; padding-left: 20px; }
  .assessment { font-style: italic; margin: 20px 0; padding: 15px; background: #f0f8ff; border-radius: 4px; }
  .confidence { display: flex; justify-content: space-around; margin: 20px 0; }
  .confidence-item { text-align: center; padding: 15px; background: #f5f5f5; border-radius: 8px; min-width: 120px; }
  .confidence-item .value { font-size: 18pt; font-weight: bold; color: #2c5282; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 8pt; color: #999; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <h1>MeritView Opinion Report</h1>
  <p>AI-Powered Dispute Analysis — Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>

<h2>Executive Summary</h2>
<p>${content.executiveSummary}</p>

<h2>Key Issues</h2>
${content.keyIssues.map(issue => `
<div class="issue">
  <strong>${issue.issue}</strong>
  <div class="agreement">Evaluator Agreement: ${issue.agreementLevel}</div>
</div>
`).join('')}

<h2>Party A Analysis</h2>
<div class="analysis-block">
  <h3>Strongest Arguments</h3>
  <ul>${content.partyAAnalysis.strongestArguments.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
  <h3>Weakest Points</h3>
  <ul>${content.partyAAnalysis.weakestPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
  <h3>Factual Concerns</h3>
  <ul>${content.partyAAnalysis.factualConcerns.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
</div>

<h2>Party B Analysis</h2>
<div class="analysis-block">
  <h3>Strongest Arguments</h3>
  <ul>${content.partyBAnalysis.strongestArguments.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
  <h3>Weakest Points</h3>
  <ul>${content.partyBAnalysis.weakestPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
  <h3>Factual Concerns</h3>
  <ul>${content.partyBAnalysis.factualConcerns.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
</div>

<h2>Comparative Assessment</h2>
<div class="assessment">
  <p>${content.comparativeAssessment}</p>
</div>

<h2>Confidence Indicators</h2>
<div class="confidence">
  <div class="confidence-item">
    <div class="value">${(content.confidenceIndicators.overallConfidence * 100).toFixed(0)}%</div>
    <div class="label">Overall Confidence</div>
  </div>
  <div class="confidence-item">
    <div class="value">${(content.confidenceIndicators.evaluatorAgreement * 100).toFixed(0)}%</div>
    <div class="label">Evaluator Agreement</div>
  </div>
</div>

<h2>Suggested Considerations</h2>
<div class="analysis-block">
  <h3>For Party A</h3>
  <ul>${content.suggestedConsiderations.partyA.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
  <h3>For Party B</h3>
  <ul>${content.suggestedConsiderations.partyB.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
</div>

<h2>Disclaimers</h2>
<div class="disclaimer">
  <ul>${content.disclaimers.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
</div>

<div class="footer">
  <p>MeritView — AI Decision Support Platform</p>
  <p>This report was generated using AI analysis. It does not constitute legal advice.</p>
</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
