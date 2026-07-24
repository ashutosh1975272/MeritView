# Cost Tracking Template

## Purpose
Track LLM API costs during validation to verify total <$100.

## Per-Run Cost Log

| Run # | Dispute ID | Provider | Input Tokens | Output Tokens | Cost ($) | Cumulative ($) |
|---|---|---|---|---|---|---|
| 1     | D1         | Llama 3 70B |              |               |          |                |
| 2     | D1         | Mixtral 8x7B |              |               |          |                |
| 3     | D1         | Gemini 1.5 Pro |              |               |          |                |
| 4     | D2         | Llama 3 70B |              |               |          |                |
| 5     | D2         | Mixtral 8x7B |              |               |          |                |
| 6     | D2         | Gemini 1.5 Pro |              |               |          |                |
| ...   |           |             |              |               |          |                |

**Total Cost:** $ ________
**Budget Remaining:** $ ________
**Under Budget?** [YES / NO]

## Run Consistency Check (T0.1.36)
| Run # | Dispute ID | Provider | Run 1 Cost | Run 2 Cost | Run 3 Cost | Avg Cost | Variance |
|---|---|---|---|---|---|---|---|
|       |            |          |            |            |            |          |          |

## Latency Tracking (target <60s each)

| Run # | Dispute ID | Provider | Latency (s) | Within 60s? |
|---|---|---|---|---|
|       |            |          |             |             |

## Human Action Required
- Record API costs from provider dashboards after each run
- Run validation script 3 times on same dispute for cost consistency (T0.1.36)
- Measure and record per-provider latency (T0.1.37)
