# Implementation Plan - Highly Relevant Pexels Scenes & 4-Scene 18s Shorts

Enhance the automated viral short video generation so that Pexels stock footage scenes are precisely matched to the current article topic and keywords (extracted dynamically from Bankier.pl news), structured into exactly 4 scenes per 18-second short (4.5 seconds per scene), with voiceover speed capped at 1.15x.

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Dynamic Keyword Extraction**: Gemini script generation will produce targeted Pexels search queries (`searchKeyword`) for each of the 4 scenes based on the article's specific context (e.g., stock market charts, banking apps, inflation graphs, luxury cars, currency exchange).
> - **4 Scenes / 18 Seconds**: Exactly 4 scenes per short video, with scene durations configured to 4.5 seconds each (summing to 18.0s), and lektor speed set to 1.15x.

## 1. Overview & Core Concept

- **What It Changes**: Upgrades the script generation prompt and backend composition logic to extract specific, highly relevant visual search terms for each of the 4 scenes, ensuring engaging, dynamic stock footage instead of generic clips.
- **Key Value**: Dramatically increases visual relevance and viewer retention for financial/business TikToks/Shorts.

## 2. Technical Architecture & Data Strategy

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
│ Bankier.pl RSS Article  │ ──> │ Gemini Script Generation │ ──> │  4 Scenes (4.5s each)    │
└─────────────────────────┘     └──────────────────────────┘     └──────────────────────────┘
                                                                              │
                                                                              ▼
                                                                 ┌──────────────────────────┐
                                                                 │ Targeted Pexels Keywords │
                                                                 │ + Lektor 1.15x Speed     │
                                                                 └──────────────────────────┘
```

- **Backend Adjustments (`server.ts`)**:
  - Update Gemini prompt instructions for `generateSmartOrGeminiViralScript` to require exactly 4 distinct, highly visual scene descriptions and precise English search keywords (`searchKeyword`) directly relevant to the financial sub-topic (e.g. "stock market trading charts green red", "mobile banking smartphone finance", "inflation grocery store shopping cart").
  - Set default scene duration to 4.5 seconds (total 18.0s).
  - Set default TTS speed to 1.15x.
- **Frontend Adjustments**:
  - Update default config and preview displays to reflect 4 scenes and 4.5s timing.
