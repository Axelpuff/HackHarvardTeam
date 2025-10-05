import { z } from 'zod';
import type { CalendarEvent } from './models/calendarEvent';
import type { Proposal, ChangeItem, PreferenceSet } from './models/proposal';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';

// Configuration defaults (can be overridden with env vars)
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export interface GeminiConfig {
  apiKey: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class GeminiClient {
  private config: Required<GeminiConfig>;
  private model: GenerativeModel;

  constructor(config: GeminiConfig & { modelName?: string }) {
    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || MAX_RETRIES,
      retryDelay: config.retryDelay || RETRY_DELAY_MS,
    };
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const modelName = (config as any).modelName || DEFAULT_MODEL;
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest(prompt: string, attempt = 1): Promise<string> {
    try {
      const result: GenerateContentResult = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      });
      const response = result.response;
      const text = response.text();
      if (!text) {
        throw new Error('No text response from Gemini API');
      }
      return text;
    } catch (error: any) {
      if (attempt <= this.config.maxRetries) {
        console.warn(`Gemini request attempt ${attempt} failed, retrying...`, error?.message || error);
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest(prompt, attempt + 1);
      }
      // Enrich error
      throw new Error(`Gemini generateContent failed after ${attempt - 1} retries: ${error?.message || error}`);
    }
  }

  /**
   * Generate a clarifying question based on problem text and previous answers
   */
  async generateClarifyingQuestion(
    problemText: string,
    answeredQuestions: string[] = [],
    currentEvents: CalendarEvent[] = []
  ): Promise<string> {
    // Debug logging
    console.log('generateClarifyingQuestion called with:', {
      problemText,
      answeredQuestions,
      currentEvents: currentEvents.map(e => ({ title: e.title, start: e.start, end: e.end }))
    });

    const prompt = `
You are an AI scheduling assistant. A user has described a scheduling problem: "${problemText}"

${
  currentEvents.length > 0
    ? `Current schedule:
${currentEvents.map((e) => `- "${e.title}" from ${e.start} to ${e.end} (${e.durationMinutes} min)`).join('\n')}`
    : ''
}

${
  answeredQuestions.length > 0
    ? `They have already answered these questions:
${answeredQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    : ''
}

Generate a single, specific clarifying question to better understand their scheduling needs.
Focus on practical details like:
- Preferred times of day
- Priority activities
- Constraints or commitments
- Goals (focus time, exercise, sleep, etc.)
- Conflicts with existing events

CRITICAL: If there are obvious conflicts with existing events, address them directly in your question.
Examples of conflict-aware questions:
- "I notice you want to schedule a meeting at 6:30 AM, but you already have 'Call Delia' from 6:00-7:00 AM. Would you like me to reschedule the call or move the meeting to a different time?"
- "You mentioned adding lunch at 1:00 PM, but 'Library' runs from 12:00-4:00 PM. Should I adjust the library time or find a different time for lunch?"

Return only the question, no additional text.
`;

    return this.makeRequest(prompt);
  }

  /**
   * Generate a schedule proposal based on problem, clarifications, and current events
   */
  async generateProposal(params: {
    problemText: string;
    clarifications: string[];
    events: CalendarEvent[];
    preferences: PreferenceSet;
  }): Promise<Proposal> {
    const { problemText, clarifications, events, preferences } = params;

    const prompt = `
You are an AI scheduling assistant. Generate a schedule proposal in JSON format.

Problem: "${problemText}"

Clarifications provided:
${clarifications.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Current events:
${events.map((e) => `- "${e.title}" from ${e.start} to ${e.end} (${e.durationMinutes} min)`).join('\n')}

User preferences:
- Sleep target: ${preferences.sleepTargetHours} hours
- Priorities: ${preferences.priorities.join(', ')}
${preferences.protectedWindows.length > 0 ? `- Protected windows: ${preferences.protectedWindows.map((w) => `${w.label} (${w.start} - ${w.end})`).join(', ')}` : ''}

Generate a proposal JSON with this exact structure:
{
  "id": "proposal-uuid",
  "revision": 1,
  "changes": [
    {
      "id": "change-uuid",
      "type": "add|move|remove|adjust",
      "event": {
        "title": "Event title",
        "start": "2025-10-04T09:00:00.000Z",
        "end": "2025-10-04T10:00:00.000Z",
        "durationMinutes": 60
      },
      "targetEventId": "existing-event-id-if-move-or-adjust",
      "rationale": "Explanation of why this change helps",
      "accepted": "pending"
    }
  ],
  "summary": "High-level summary of the proposal",
  "sleepAssessment": {
    "estimatedSleepHours": 7.5,
    "belowTarget": false
  },
  "status": "pending",
  "createdAt": "${new Date().toISOString()}"
}

Rules:
- Include at least 1 change, max 5 changes
- Use realistic future timestamps
- Each change needs a clear rationale
- Sleep assessment should estimate based on last evening event to first morning event
- Focus on addressing the user's stated problem
- IMPORTANT: Only include changes for events that need to be modified, added, or removed
- DO NOT include changes for existing events that should remain unchanged
- The proposed schedule will start as a copy of the current schedule, with only your specified changes applied

CRITICAL CONFLICT DETECTION:
- Before adding any new event, check if it overlaps with existing events
- If there's a time conflict, you MUST ask the user to clarify how to handle it
- Examples of conflicts:
  * Adding "Meeting at 6:30 AM" when "Call Delia" runs 6:00-7:00 AM
  * Adding "Lunch at 1:00 PM" when "Library" runs 12:00-4:00 PM
- If you detect a conflict, return a clarifying question instead of a proposal
- Ask: "I notice [new event] would overlap with [existing event] from [time]. Would you like me to: 1) Reschedule [existing event], 2) Move [new event] to [suggested time], or 3) Remove [existing event]?"

Return only valid JSON, no additional text.
`;

    const response = await this.makeRequest(prompt);

    try {
      // Clean the response to extract JSON if wrapped in markdown or other text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;

      const proposalData = JSON.parse(jsonStr);

      // Validate the structure matches our schema
      // Basic validation - full validation happens in the API route
      if (
        !proposalData.id ||
        !proposalData.changes ||
        !Array.isArray(proposalData.changes)
      ) {
        throw new Error('Invalid proposal structure from Gemini');
      }

      return proposalData as Proposal;
    } catch (error) {
      throw new Error(
        `Failed to parse Gemini proposal response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate rationale for a specific schedule change
   */
  async generateRationale(
    changeType: 'add' | 'move' | 'remove' | 'adjust',
    eventTitle: string,
    context: string
  ): Promise<string> {
    const prompt = `
Explain in one sentence why this schedule change helps address the user's concern:

Change: ${changeType} "${eventTitle}"
Context: ${context}

Return only the explanation, no additional text.
`;

    return this.makeRequest(prompt);
  }
}

// Export convenience functions for common operations
export const createGeminiClient = (apiKey?: string, modelName?: string): GeminiClient => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('Gemini API key is required');
  }
  return new GeminiClient({ apiKey: key, modelName });
};

// Mock client for testing
export class MockGeminiClient extends GeminiClient {
  constructor() {
    super({ apiKey: 'mock-key' });
  }

  async generateClarifyingQuestion(
    problemText: string,
    answeredQuestions: string[] = [],
    currentEvents: CalendarEvent[] = []
  ): Promise<string> {
    // Return mock clarifying questions based on input
    if (answeredQuestions.length === 0) {
      if (currentEvents.length > 0) {
        return 'I can see you have several events scheduled. What specific time slots feel most problematic for your goals?';
      }
      return 'What specific aspects of your schedule feel most problematic?';
    }
    return 'What time of day do you prefer for focused work?';
  }

  async generateProposal(params: {
    problemText: string;
    clarifications: string[];
    events: CalendarEvent[];
    preferences: PreferenceSet;
  }): Promise<Proposal> {
    // Return a mock proposal
    return {
      id: 'mock-proposal-id',
      revision: 1,
      changes: [
        {
          id: 'mock-change-1',
          type: 'add',
          event: {
            title: 'Focus Block',
            start: '2025-10-04T09:00:00.000Z',
            end: '2025-10-04T11:00:00.000Z',
            durationMinutes: 120,
          },
          rationale:
            'Added dedicated focus time to address your scheduling concerns',
          accepted: 'pending',
        },
      ],
      summary: 'Added focus time to improve your schedule',
      sleepAssessment: {
        estimatedSleepHours: 7.5,
        belowTarget: false,
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
    } as Proposal;
  }

  async generateRationale(): Promise<string> {
    return 'This change helps optimize your schedule for better productivity';
  }
}
