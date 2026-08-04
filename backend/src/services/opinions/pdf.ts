import PDFDocument from 'pdfkit';
import { prisma } from '../../db/prisma';
import { decrypt } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import { InternalError, NotFoundError } from '../../utils/errors';
import path from 'path';
import fs from 'fs';
import os from 'os';

const PDF_DIR = path.join(os.tmpdir(), 'meritview-uploads');

export async function generateOpinionPdf(disputeId: string): Promise<string> {
  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
    include: {
      dispute: {
        select: {
          title: true,
          category: true,
          createdAt: true,
          pricingTier: true,
          priceUsd: true,
          parties: {
            select: {
              id: true,
              role: true,
              invitationEmail: true,
              user: { select: { email: true, displayName: true } },
            },
            orderBy: { role: 'asc' },
          },
          briefs: {
            select: {
              partyId: true,
              encryptedContent: true,
              contentEncryptionKeyId: true,
              wordCount: true,
              submittedAt: true,
              sealHash: true,
              party: { select: { role: true, invitationEmail: true, user: { select: { email: true, displayName: true } } } },
            },
          },
          evaluatorOutputs: {
            select: {
              llmProvider: true,
              modelId: true,
              parseSuccess: true,
              durationMs: true,
              costUsd: true,
              createdAt: true,
            },
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
  let content: any;
  try {
    content = JSON.parse(contentStr);
  } catch {
    throw new InternalError('Failed to parse opinion content');
  }

  const filename = `opinion_${disputeId.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const filePath = path.join(PDF_DIR, filename);

  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
  }

  const loadedOpinion = opinion;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Opinion - ${opinion.dispute.title}`,
        Author: 'MeritView',
        Subject: 'Dispute Analysis Opinion',
      },
    });

    const stream = fs.createWriteStream(filePath);
    stream.on('finish', () => resolve(filename));
    stream.on('error', reject);

    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottomY = doc.page.height - doc.page.margins.bottom;

    function ensureSpace(height = 80) {
      if (doc.y + height > bottomY) {
        doc.addPage();
      }
    }

    function line() {
      ensureSpace(20);
      doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).strokeColor('#ccc').stroke();
      doc.moveDown(0.7);
    }

    function sectionTitle(title: string) {
      ensureSpace(50);
      doc.moveDown(0.4);
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#111').text(title);
      doc.moveDown(0.25);
    }

    function paragraph(text?: string | null) {
      if (!text) return;
      ensureSpace(60);
      doc.font('Helvetica').fontSize(10).fillColor('#333').text(String(text), {
        align: 'justify',
        lineGap: 4,
      });
      doc.moveDown(0.7);
    }

    function bulletList(items?: unknown[]) {
      if (!Array.isArray(items) || items.length === 0) {
        paragraph('None identified.');
        return;
      }

      for (const item of items) {
        ensureSpace(35);
        const text = typeof item === 'string' ? item : JSON.stringify(item);
        doc.font('Helvetica').fontSize(10).fillColor('#333').text(`• ${text}`, { indent: 10, lineGap: 3 });
        doc.moveDown(0.25);
      }
      doc.moveDown(0.4);
    }

    function labelValue(label: string, value?: string | number | null) {
      ensureSpace(20);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#555').text(`${label}: `, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('#333').text(value === undefined || value === null || value === '' ? 'N/A' : String(value));
    }

    function renderPartyAnalysis(title: string, analysis: any) {
      sectionTitle(title);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text('Strongest Arguments');
      bulletList(analysis?.strongest_arguments);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text('Weakest Points');
      bulletList(analysis?.weakest_points);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#111').text('Factual Concerns');
      bulletList(analysis?.factual_concerns);
    }

    function parseBriefSections(brief: typeof loadedOpinion.dispute.briefs[number]) {
      try {
        return JSON.parse(decrypt(brief.encryptedContent, brief.contentEncryptionKeyId));
      } catch {
        return null;
      }
    }

    const generatedAt = opinion.createdAt || new Date();
    const confidence = content.confidence_indicators || {};

    doc.font('Helvetica-Bold').fontSize(22).text('MeritView Opinion', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`Generated: ${generatedAt.toISOString().split('T')[0]}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000')
      .text(loadedOpinion.dispute.title, { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
      .text(`Category: ${loadedOpinion.dispute.category.replace(/_/g, ' ').toLowerCase()}`);
    doc.moveDown(0.5);

    line();

    sectionTitle('Case Metadata');
    labelValue('Dispute ID', disputeId);
    labelValue('Created', loadedOpinion.dispute.createdAt.toISOString());
    labelValue('Pricing Tier', loadedOpinion.dispute.pricingTier);
    labelValue('Price', `$${Number(loadedOpinion.dispute.priceUsd).toFixed(2)}`);
    labelValue('Evaluation Prompt', loadedOpinion.evalPromptVersion);
    labelValue('Aggregation Prompt', loadedOpinion.aggPromptVersion);
    labelValue('Aggregator', `${loadedOpinion.aggregatorProvider}/${loadedOpinion.aggregatorModelId}`);
    labelValue('Total LLM Cost', `$${Number(loadedOpinion.totalCostUsd).toFixed(4)}`);

    sectionTitle('Parties');
    for (const party of loadedOpinion.dispute.parties) {
      labelValue(
        party.role,
        party.user?.email || party.invitationEmail || 'Unknown party'
      );
    }

    sectionTitle('Executive Summary');
    paragraph(content.executive_summary || content.executiveSummary || 'No executive summary was generated.');

    sectionTitle('Key Issues');
    if (Array.isArray(content.key_issues) && content.key_issues.length > 0) {
      for (const issue of content.key_issues) {
        bulletList([`${issue.issue || issue.title || JSON.stringify(issue)}${issue.agreement_level ? ` (agreement: ${issue.agreement_level})` : ''}`]);
      }
    } else {
      paragraph('No key issues were identified.');
    }

    renderPartyAnalysis('Party A / Initiator Analysis', content.party_a_analysis);
    renderPartyAnalysis('Party B / Respondent Analysis', content.party_b_analysis);

    sectionTitle('Comparative Assessment');
    paragraph(content.comparative_assessment || content.decision || content.analysis);

    sectionTitle('Confidence Indicators');
    labelValue('Overall Confidence', typeof confidence.overall_confidence === 'number' ? `${(confidence.overall_confidence * 100).toFixed(0)}%` : 'N/A');
    labelValue('Evaluator Agreement', typeof confidence.evaluator_agreement === 'number' ? `${(confidence.evaluator_agreement * 100).toFixed(0)}%` : 'N/A');
    labelValue('Stored Overall Confidence', loadedOpinion.overallConfidence ? `${(Number(loadedOpinion.overallConfidence) * 100).toFixed(0)}%` : 'N/A');
    labelValue('Stored Inter-Evaluator Agreement', loadedOpinion.interEvaluatorAgreement ? `${(Number(loadedOpinion.interEvaluatorAgreement) * 100).toFixed(0)}%` : 'N/A');

    sectionTitle('Suggested Considerations For Party A');
    bulletList(content.suggested_considerations?.party_a);
    sectionTitle('Suggested Considerations For Party B');
    bulletList(content.suggested_considerations?.party_b);

    sectionTitle('Evaluator Details');
    if (loadedOpinion.dispute.evaluatorOutputs.length > 0) {
      for (const evaluator of loadedOpinion.dispute.evaluatorOutputs) {
        bulletList([
          `${evaluator.llmProvider}/${evaluator.modelId} - parsed: ${evaluator.parseSuccess ? 'yes' : 'no'}, duration: ${evaluator.durationMs}ms, cost: $${Number(evaluator.costUsd).toFixed(4)}`,
        ]);
      }
    } else {
      paragraph('No evaluator details were recorded.');
    }

    doc.addPage();
    sectionTitle('Submitted Briefs Appendix');
    for (const brief of loadedOpinion.dispute.briefs) {
      const sections = parseBriefSections(brief);
      sectionTitle(`${brief.party.role === 'INITIATOR' ? 'Party A / Initiator' : 'Party B / Respondent'} Brief`);
      labelValue('Submitted At', brief.submittedAt?.toISOString() || 'N/A');
      labelValue('Word Count', brief.wordCount);
      labelValue('Seal Hash', brief.sealHash || 'N/A');
      if (sections) {
        sectionTitle('Factual Background');
        paragraph(sections.factualBackground);
        sectionTitle('My Position');
        paragraph(sections.myPosition);
        sectionTitle('Supporting Arguments');
        paragraph(sections.supportingArguments);
        sectionTitle('Acknowledgment Of Opposing Position');
        paragraph(sections.acknowledgmentOfOpposing);
        sectionTitle('Desired Resolution');
        paragraph(sections.desiredResolution);
      } else {
        paragraph('Brief content could not be decrypted for PDF appendix.');
      }
    }

    sectionTitle('Disclaimers');
    const disclaimers = Array.from(new Set([...(Array.isArray(content.disclaimers) ? content.disclaimers : []), 'This opinion was generated by MeritView AI analysis and is for informational purposes only. It does not constitute legal advice.']));
    bulletList(disclaimers);

    doc.end();
  });
}

export async function getOpinionPdfPath(disputeId: string): Promise<{ filePath: string; filename: string }> {
  const opinion = await prisma.opinion.findUnique({
    where: { disputeId },
    select: { pdfStorageKey: true },
  });

  if (!opinion) {
    throw new NotFoundError('Opinion not found');
  }

  if (!opinion.pdfStorageKey) {
    throw new NotFoundError('PDF not yet generated');
  }

  const filePath = path.join(PDF_DIR, opinion.pdfStorageKey);
  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('PDF file not found on disk');
  }

  return { filePath, filename: opinion.pdfStorageKey };
}
