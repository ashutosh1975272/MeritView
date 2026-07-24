# Evaluation Metrics Spreadsheet Template

## Purpose
Establish baseline metrics from manual synthesis and track quality over time.

## Metrics Table (per dispute)

| Dispute ID | Provider | Agreement Rate | Hallucination Rate | Factual Accuracy (1-5) | Argument Coverage (1-5) | Logic Soundness (1-5) | Confidence Calibration (1-5) | Overall Score |
|---|---|---|---|---|---|---|---|---|
| D1 | Llama 3 70B | | | | | | | |
| D1 | Mixtral 8x7B | | | | | | | |
| D1 | Gemini 1.5 Pro | | | | | | | |
| D2 | Llama 3 70B | | | | | | | |
| ... | ... | | | | | | | |

### Definitions
- **Agreement Rate:** % of key findings that match across providers on same dispute
- **Hallucination Rate:** % of generated claims that are factually incorrect or unsupported
- **Factual Accuracy:** Human rater assessment of correctness of cited facts
- **Argument Coverage:** Does the output identify the strongest and weakest arguments?
- **Logic Soundness:** Are logical fallacies correctly identified?
- **Confidence Calibration:** Does the confidence score match human assessment of reliability?

## Baseline Summary

| Metric | Target | Baseline (from manual synthesis) | Acceptable Range |
|---|---|---|---|
| Agreement Rate | >80% | | 70-100% |
| Hallucination Rate | <5% | | 0-10% |
| Avg Latency | <60s | | 10-120s |
| Avg Cost per Dispute | <$20 | | $1-$50 |

## Human Action Required
- Manually review all provider outputs for each dispute
- Score each dimension above
- Calculate baseline averages
- Store final metrics as the v1.0 baseline
