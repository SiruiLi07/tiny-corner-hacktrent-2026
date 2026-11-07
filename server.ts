import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini client securely server-side
const geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'Tiny Corner',
    region: 'Peterborough, ON',
    hasGeminiKey: Boolean(geminiApiKey),
  });
});

// Gemini AI Magic Create endpoint
app.post('/api/magic-create', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Please provide a description of your micro-activity or discovery idea.',
      });
    }

    if (!aiClient) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please check the Secrets panel in AI Studio.',
        missingKey: true,
      });
    }

    const systemInstruction = `You are the AI Event Architect for "Tiny Corner", a hyperlocal micro-community platform in Peterborough, Ontario for students and young adults.
The platform values small gatherings (2-12 people), spontaneous activities, cozy hobby clubs, and niche hidden discoveries—NOT massive commercial conventions.

CRITICAL INSTRUCTIONS:
1. Parse the user's natural language input into a structured event or lifestyle draft.
2. DO NOT invent fake dates, exact times, or specific addresses if the user did NOT mention them.
3. If date/time or location are absent or vague, set them to empty or note what was mentioned.
4. Always list "missingDetails" that the human organizer must confirm before gathering people (e.g. "Exact meeting time", "Specific venue or table reservation", "Weather backup plan").
5. Only suggest participant limit if user specified or clearly implied (e.g. "a few students" -> 4-6).
6. Pick the most suitable category from: "Micro-Meetups", "Hidden Gems", "Coffee & Food", "Study & Crafts", "Outdoor & Nature", "Hobbies & Games".
7. Determine if it is a "event" (a scheduled gathering) or "lifestyle" (a recommendation/spot).`;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let textOutput: string | undefined;
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await aiClient.models.generateContent({
            model,
            contents: prompt.trim(),
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Warm, descriptive, inviting title (under 80 chars)',
                  },
                  shortDescription: {
                    type: Type.STRING,
                    description: 'Warm, welcoming 2-3 sentence overview of the gathering or discovery',
                  },
                  contentType: {
                    type: Type.STRING,
                    description: 'Either "event" or "lifestyle"',
                  },
                  category: {
                    type: Type.STRING,
                    description:
                      'One of: Micro-Meetups, Hidden Gems, Coffee & Food, Study & Crafts, Outdoor & Nature, Hobbies & Games',
                  },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: '3 to 5 lowercase relevant tags, e.g. ["boardgames", "beginners", "peterborough"]',
                  },
                  participantLimit: {
                    type: Type.INTEGER,
                    description: 'Maximum attendee cap (2-12) if specified or implied; 0 if open or unspecified',
                  },
                  dateTime: {
                    type: Type.STRING,
                    description: 'The requested date/time ONLY if the user provided it; otherwise empty string',
                  },
                  suggestedLocation: {
                    type: Type.STRING,
                    description: 'Venue or neighborhood if mentioned or implied (Peterborough context, e.g. Trent Campus, Sadleir House, Downtown); otherwise empty string',
                  },
                  missingDetails: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Specific details the organizer must still verify before meeting',
                  },
                  organizerNotes: {
                    type: Type.STRING,
                    description: 'Friendly tip for hosting a great small-scale gathering',
                  },
                },
                required: [
                  'title',
                  'shortDescription',
                  'contentType',
                  'category',
                  'tags',
                  'missingDetails',
                ],
              },
            },
          });

          textOutput = response.text;
          if (textOutput) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isDemandSpike = err?.message?.includes('503') || err?.message?.includes('high demand') || err?.status === 503;
          if (isDemandSpike && attempt < 2) {
            // Wait 1.5s before retry
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }
          // Try next model
          break;
        }
      }
      if (textOutput) break;
    }

    if (!textOutput) {
      if (lastError) throw lastError;
      return res.status(502).json({
        error: 'Gemini returned an empty response. Please try rephrasing your idea.',
      });
    }

    const parsedData = JSON.parse(textOutput);
    return res.json({
      success: true,
      draft: parsedData,
      rawInput: prompt,
    });
  } catch (error: any) {
    console.error('Gemini API Error in /api/magic-create:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate draft with Gemini API.',
      details: error?.statusText || 'Unexpected server error.',
    });
  }
});

// In-memory cache for Find My Corner to eliminate redundant Gemini calls
const serverMatchCache = new Map<
  string,
  {
    result: any;
    timestamp: number;
  }
>();
const SERVER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Gemini AI "Find My Corner" matchmaking endpoint (single fast Flash call + caching)
app.post('/api/find-my-corner', async (req: Request, res: Response) => {
  try {
    const { query, candidateItems, clientDate } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Please describe what kind of local corner you are looking for.',
      });
    }

    if (!Array.isArray(candidateItems) || candidateItems.length === 0) {
      return res.status(400).json({
        error: 'No candidate corners available to rank.',
      });
    }

    if (!aiClient) {
      return res.status(503).json({
        error:
          'Gemini API key is not configured on the server. Please check the Secrets panel in AI Studio.',
        missingKey: true,
      });
    }

    // 1. Check server-side cache with item attributes fingerprint (accurately including keyDetails)
    const candidateFingerprint = candidateItems
      .map(
        (c: any) =>
          `${c.id}:${c.title || ''}:${c.category || ''}:${c.area || ''}:${c.dateTime || c.dateDisplay || c.eventDate || ''}:${c.cost || ''}:${c.transitAccessible ?? ''}:${c.wheelchairAccessible ?? ''}:${c.keyDetails || c.description || ''}:${Array.isArray(c.tags) ? c.tags.join(',') : ''}`
      )
      .sort()
      .join('|');
    const cacheKey = `${query.trim().toLowerCase()}::${candidateFingerprint}::${clientDate || ''}`;

    const cachedEntry = serverMatchCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < SERVER_CACHE_TTL_MS) {
      return res.json({
        success: true,
        result: cachedEntry.result,
        rawQuery: query,
        timing: {
          apiCallMs: 0,
          cacheHit: true,
        },
      });
    }

    // 2. Strict system instruction enforcing accuracy and no hallucinated facts
    const systemInstruction = `You are the Hyperlocal Concierge & Matchmaker for "Tiny Corner" in Peterborough, Ontario.
Evaluate the user's natural language request against the provided pre-filtered candidate corners.

STRICT CONSTRAINTS & ACCURACY RULES:
1. ONLY recommend items from the provided candidate list using their exact "id".
2. NEVER claim an activity is free, wheelchair accessible, or transit accessible unless explicitly supported by the candidate's fields. If unverified, state "Not confirmed".
3. NEVER invent prices, entry fees, or ticket costs. If cost is "Not confirmed" or unspecified, do NOT state or imply that it is free or cheap.
4. NEVER invent travel times, bus route numbers, transit durations, or walking minutes (e.g. do NOT say "takes 10 minutes", "a short 5-minute walk", or "bus 4 takes you there").
5. Return ONLY genuine qualifying matches (0 to 3 max). If fewer than 3 qualify (e.g. only 1 or 2), return ONLY those. NEVER pad results with irrelevant activities just to reach 3.
6. If NO candidates qualify, return an empty array "matches": [] and provide a friendly "noMatchExplanation".
7. For each match, provide an honest, warm "matchReason" (1-2 sentences) directly explaining why this corner fits their request, adhering strictly to facts present in candidate data.`;

    const contents = `User Request:
"${query.trim()}"

Candidate corners (already filtered for Peterborough context):
${JSON.stringify(candidateItems)}`;

    // 3. Single Gemini Flash-family model request with 15-second timeout
    const FAST_FLASH_MODEL = 'gemini-3.1-flash-lite';
    const apiStart = Date.now();

    const generatePromise = aiClient.models.generateContent({
      model: FAST_FLASH_MODEL,
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userPreferencesSummary: {
              type: Type.STRING,
              description: 'A 1-sentence recap of detected interests and constraints',
            },
            matches: {
              type: Type.ARRAY,
              description:
                'Only genuine qualifying matches (0 to 3 max). Empty array if none qualify.',
              items: {
                type: Type.OBJECT,
                properties: {
                  itemId: {
                    type: Type.STRING,
                    description: 'The exact id of the item from the candidate list',
                  },
                  matchReason: {
                    type: Type.STRING,
                    description:
                      '1 to 2 warm sentences explaining why this post fits the user request',
                  },
                },
                required: ['itemId', 'matchReason'],
              },
            },
            noMatchExplanation: {
              type: Type.STRING,
              description:
                'Clear, kind explanation if no candidate is a good match, or empty string if matches were found.',
            },
          },
          required: ['matches'],
        },
      },
    });

    // 15-second server timeout protection to prevent hanging while allowing Gemini API variance
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API request timed out after 15 seconds.')), 15000)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);

    const apiCallMs = Date.now() - apiStart;
    const textOutput = response.text;

    if (!textOutput) {
      return res.status(502).json({
        error: 'Gemini returned an empty response. Please try rephrasing your request.',
      });
    }

    const parsedData = JSON.parse(textOutput);

    // Save to server cache
    serverMatchCache.set(cacheKey, {
      result: parsedData,
      timestamp: Date.now(),
    });

    return res.json({
      success: true,
      result: parsedData,
      rawQuery: query,
      timing: {
        apiCallMs,
        cacheHit: false,
      },
    });
  } catch (error: any) {
    console.error('Gemini API Error in /api/find-my-corner:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to match corners with Gemini API.',
      details: error?.statusText || 'Unexpected server error.',
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Tiny Corner full-stack server running at http://localhost:${port}`);
  });
}

startServer();
