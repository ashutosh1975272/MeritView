#!/usr/bin/env bash
set -euo pipefail

# Gemini 1.5 Pro Validation Script
# Usage: GEMINI_API_KEY=... ./scripts/test-gemini.sh < dispute-1.json

API_KEY="${GEMINI_API_KEY:?GEMINI_API_KEY not set}"
MODEL="gemini-1.5-pro"
URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}"

BRIEF_JSON=$(cat)

PROMPT=$(cat backend/src/prompts/eval-v3.2.ts | grep -oP '(?<=")[^"]{100,}' | head -1)

PAYLOAD=$(jq -n \
  --arg prompt "$PROMPT" \
  --arg brief "$BRIEF_JSON" \
  '{
    contents: [{
      parts: [
        {text: $prompt},
        {text: $brief}
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 4096,
      responseMimeType: "application/json"
    }
  }')

START_TIME=$(date +%s%N)
curl -s -w "\n%{http_code}" "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | {
  read -r body
  read -r http_code
  END_TIME=$(date +%s%N)
  DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

  if [ "$http_code" != "200" ]; then
    echo "{\"error\": \"HTTP $http_code\", \"body\": $body}" | jq .
    exit 1
  fi

  echo "$body" | jq --arg dur "${DURATION_MS}ms" \
    '{provider: "google", model: "gemini-1.5-pro", duration: $dur, output: .candidates[0].content.parts[0].text | fromjson}'
}
