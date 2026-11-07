# Tiny Corner — HackTrent 2026 MVP

> **Small Corners. Big Connections.**
> Hyperlocal lifestyle discovery & micro-community platform for students and young adults in Peterborough, Ontario.

---

## 🌟 Product Vision & Problem Statement

Traditional social platforms focus on massive, commercial, high-friction events. Meanwhile, university students and young adults often crave something simpler: small spontaneous gatherings, niche hobby circles (2 to 8 people), and quiet local discoveries.

**Tiny Corner** introduces the philosophy that everyone has their own little corner of interests—from board games at Sadleir House to golden-hour sketchbook walks along Little Lake—and connects these corners hyperlocally.

---

## 🚀 Key Features

1. **Hyperlocal Discovery Feed (Peterborough, ON)**:
   - Curated feed blending two content types: **Micro-Gatherings** (small events) and **Lifestyle Gems** (quiet spots, café nooks, secret trails).
   - Real-time category filtering (Micro-Meetups, Hidden Gems, Coffee & Food, Study & Crafts, Outdoor & Nature, Hobbies & Games).
   - Instant search across titles, descriptions, locations, and interest tags.
   - Interactive **"Interested"** system with live attendee counts and browser localStorage persistence.

2. **Find My Corner (AI Hyperlocal Matchmaker)**:
   - Users can express complex, natural-language desires and constraints (e.g. *"I'm new in town, I don't have a car, I love photography, and I want to meet a few people this weekend."*).
   - Powered by Gemini `gemini-3.1-flash-lite` via `POST /api/find-my-corner` (model availability depends on the connected Gemini account).
   - **Grounded matching**: Gemini ranks pre-filtered existing posts, unsupported IDs are discarded, and strict wheelchair/transit requirements require affirmative listing data. Listed facts are not independently audited or guaranteed accurate.
   - Computes deterministic relevance scores and constructs a factual match explanation from stored event fields (Gemini ranks candidates but its free-form match explanations are not displayed).
   - When no current corner matches, it explains the gap with empathy and invites the user to create that corner with Gemini.

3. **Gemini AI Magic Create (Best Use of Gemini API Award)**:
   - Transforms natural language prompts (e.g. *"I want to find a few students to play board games this Saturday evening at Sadleir House. Beginners welcome."*) into structured, transparent event drafts.
   - Powered server-side by Google Gemini `gemini-3.8-flash` via the `@google/genai` TypeScript SDK.
   - Uses structured JSON schema (`responseSchema`) to extract titles, categories, tags, attendee caps, and dates/times.
   - **Transparent Organizing Check**: Identifies missing logistics (e.g. venue reservation, start time) that the organizer must verify before meeting.
   - Full human-in-the-loop: Organizers review and edit all fields before publishing.

4. **Accessibility Architecture & Implemented Features**:
   - **Dialog Focus Management**: Custom `useFocusTrap` hook traps Tab navigation within active modals (`FindMyCornerModal`, `MagicCreateModal`, `DetailModal`), locks body scrolling, supports `Escape` to close, and restores focus to triggering elements on close.
   - **High Contrast Theme**: Dedicated CSS mode (`theme-high-contrast`) offering enhanced contrast ratios, dark slate backgrounds, and crisp borders.
   - **Text Size Scaling**: Dynamic root typography scaling across Normal (100%), Medium (110%), and Large (125%).
   - **Simplified Reading Mode**: Strips ambient animations and card clutter to present a clean, distraction-free typographic layout.
   - **Reduced Motion Support**: Respects system `prefers-reduced-motion: reduce` and provides an in-app animation toggle.
   - **Screen Reader Announcements**: `aria-live="polite"` feedback for live filtering, loading progress, and AI matching states.
   - **Known Limitations & Audit Scope**: While core interactive flows adhere to semantic HTML, visible focus indicators, and ARIA dialog patterns, formal end-to-end multi-device WCAG 2.1 AA assistive technology certification is ongoing for this hackathon prototype.

5. **Demonstration Dataset**:
   - Seeded with 14 authentic Peterborough locations (Trent Wildlife Sanctuary, Sadleir House, Silver Bean Café, Hunter Street, Bata Library, Zap Records, Jackson Park Pagoda Bridge, etc.).
   - Clearly labeled with a demonstration badge to ensure transparency.

---

## 🧠 Gemini API Integration Architecture

### Endpoint
- **Path**: `POST /api/magic-create`
- **Controller**: `server.ts`
- **Model**: `gemini-3.8-flash`
- **SDK**: `@google/genai` (version 2.32.0)

### Security & Privacy
The `GEMINI_API_KEY` is kept strictly server-side and never exposed to the client or browser bundles. AI Studio automatically injects this key from the Secrets panel.

### Structured Schema Configuration
```typescript
const response = await aiClient.models.generateContent({
  model: 'gemini-3.8-flash',
  contents: prompt.trim(),
  config: {
    systemInstruction: `You are the AI Event Architect for "Tiny Corner"...`,
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        shortDescription: { type: Type.STRING },
        contentType: { type: Type.STRING },
        category: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        participantLimit: { type: Type.INTEGER },
        dateTime: { type: Type.STRING },
        suggestedLocation: { type: Type.STRING },
        missingDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
        organizerNotes: { type: Type.STRING },
      },
      required: ['title', 'shortDescription', 'contentType', 'category', 'tags', 'missingDetails'],
    },
  },
});
```

---

## 🛠 Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion
- **Backend / Proxy**: Node.js, Express, Vite middleware in development
- **AI Engine**: Google Gemini API (`@google/genai`, `gemini-3.8-flash`)
- **Typography**: Fraunces (Warm Editorial Serif) & Plus Jakarta Sans (Clean Modern UI)
- **Testing**: Built-in `node:test` and `node:assert/strict` with `tsx` runner

---

## 🏃 Local Development & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file (or set via AI Studio Secrets):
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   PORT=3000
   ```

3. **Run Unit Tests**:
   ```bash
   npm test
   ```

4. **Start Full-Stack Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Targeted QA update — November 7, 2026

- Find My Corner continues to ask Gemini to rank existing activity IDs, but its **free-form explanations are not displayed**. User-facing explanations are rebuilt entirely from listing fields, including explicit unknown price/transit/accessibility status.
- Explicit wheelchair and car-free/public transit requirements need affirmative listing metadata; missing information is not considered a verified match. The metadata itself is demo content and is **not independently verified**.
- Compact Gemini candidate payload includes up to eight deduplicated interest tags.
- The codebase includes new edge-case regression tests under `src/utils/tinyCornerFixes.test.ts`. Run `npm test` after installing dependencies, or with Node.js 22+ use `node --experimental-strip-types --test src/utils/*.test.ts` for dependency-free logic tests.
- Independent offline QA ran 50/50 pure-logic tests successfully and parsed 23 TS/TSX files with no syntax errors. **Full TypeScript type checking, Vite production build, live Gemini API connectivity and browser accessibility testing were not verified** because npm dependency installation was unavailable in the audit environment.
