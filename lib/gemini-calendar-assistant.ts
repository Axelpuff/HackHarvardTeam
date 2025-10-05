import { z } from 'zod';
import { GeminiClient } from './gemini';
import { GoogleCalendarClient } from './google-calendar';
import type { CalendarEvent } from './models/calendarEvent';
import type { Proposal, ChangeItem, PreferenceSet, ProblemStatement, ClarifyingQuestion } from './models/proposal';

// Enhanced Gemini Calendar Assistant with function calling capabilities
export interface CalendarAssistantConfig {
  geminiApiKey: string;
  googleCalendarAccessToken: string;
  calendarId?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface ConversationContext {
  problemStatement: ProblemStatement | null;
  clarifyingQuestions: ClarifyingQuestion[];
  userAnswers: string[];
  currentEvents: CalendarEvent[];
  proposals: Proposal[];
  preferences: PreferenceSet;
  sessionId: string;
}

export interface AssistantResponse {
  type: 'clarifying_question' | 'proposal' | 'confirmation' | 'error' | 'response';
  message: string;
  data?: any;
  requiresUserAction?: boolean;
}

// Function definitions for Gemini function calling
const CALENDAR_FUNCTIONS = [
  {
    name: 'get_calendar_events',
    description: 'Retrieve calendar events for a specific date range',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of events to retrieve (default: 50)'
        },
        singleEvents: {
          type: 'boolean',
          description: 'Whether to expand recurring events'
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'create_calendar_event',
    description: 'Create a new calendar event',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Event title'
        },
        startDateTime: {
          type: 'string',
          description: 'Start datetime in ISO format'
        },
        endDateTime: {
          type: 'string',
          description: 'End datetime in ISO format'
        },
        description: {
          type: 'string',
          description: 'Event description (optional)'
        },
        location: {
          type: 'string',
          description: 'Event location (optional)'
        }
      },
      required: ['title', 'startDateTime', 'endDateTime']
    }
  },
  {
    name: 'update_calendar_event',
    description: 'Update an existing calendar event',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID of the event to update'
        },
        title: {
          type: 'string',
          description: 'New event title (optional)'
        },
        startDateTime: {
          type: 'string',
          description: 'New start datetime in ISO format (optional)'
        },
        endDateTime: {
          type: 'string',
          description: 'New end datetime in ISO format (optional)'
        },
        description: {
          type: 'string',
          description: 'New event description (optional)'
        }
      },
      required: ['eventId']
    }
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete a calendar event',
    parameters: {
      type: 'object',
      properties: {
        eventId: {
          type: 'string',
          description: 'ID of the event to delete'
        }
      },
      required: ['eventId']
    }
  },
  {
    name: 'generate_schedule_proposal',
    description: 'Generate a proposed schedule optimization based on user needs',
    parameters: {
      type: 'object',
      properties: {
        problemDescription: {
          type: 'string',
          description: 'User\'s scheduling problem or goal'
        },
        constraints: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of scheduling constraints and preferences'
        },
        focusPeriod: {
          type: 'string',
          description: 'Time period to focus on (e.g., \'week\', \'day\', \'tuesday\')'
        },
        currentEvents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' },
              durationMinutes: { type: 'integer' }
            }
          },
          description: 'Current calendar events to consider'
        }
      },
      required: ['problemDescription']
    }
  },
  {
    name: 'analyze_schedule_conflicts',
    description: 'Analyze potential scheduling conflicts and issues',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' }
            }
          },
          description: 'List of events to analyze for conflicts'
        },
        constraints: {
          type: 'array',
          items: { type: 'string' },
          description: 'Additional constraints to check against'
        }
      },
      required: ['events']
    }
  },
  {
    name: 'assess_sleep_impact',
    description: 'Assess the impact of schedule changes on sleep patterns',
    parameters: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              start: { type: 'string' },
              end: { type: 'string' }
            }
          },
          description: 'Events to assess for sleep impact'
        },
        sleepTargetHours: {
          type: 'number',
          description: 'Target sleep hours per night'
        },
        timeZone: {
          type: 'string',
          description: 'User\'s time zone'
        }
      },
      required: ['events', 'sleepTargetHours']
    }
  }
];

export class GeminiCalendarAssistant {
  private geminiClient: GeminiClient;
  private calendarClient: GoogleCalendarClient;
  private context: ConversationContext;
  private config: Required<CalendarAssistantConfig>;

  constructor(config: CalendarAssistantConfig) {
    this.config = {
      calendarId: 'primary',
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    // Initialize clients
    this.geminiClient = new GeminiClient({ apiKey: config.geminiApiKey });
    this.calendarClient = new GoogleCalendarClient({ 
      accessToken: config.googleCalendarAccessToken,
      calendarId: this.config.calendarId,
      maxRetries: this.config.maxRetries,
      retryDelays: [2000, 4000, 8000] // 2s, 4s, 8s as per requirements
    });

    // Initialize conversation context
    this.context = {
      problemStatement: null,
      clarifyingQuestions: [],
      userAnswers: [],
      currentEvents: [],
      proposals: [],
      preferences: {
        sleepTargetHours: 7,
        priorities: ['sleep', 'focus'],
        protectedWindows: [],
        iterationCount: 0
      },
      sessionId: crypto.randomUUID()
    };
  }

  /**
   * Main entry point for processing user input
   */
  async processUserInput(userInput: string): Promise<AssistantResponse> {
    try {
      // Store problem statement if this is the first input
      if (!this.context.problemStatement) {
        this.context.problemStatement = {
          id: crypto.randomUUID(),
          rawText: userInput,
          createdAt: new Date().toISOString(),
          status: 'active'
        };
      }

      // Build comprehensive prompt with context
      const prompt = this.buildConversationPrompt(userInput);

      // Get response from Gemini with function calling capabilities
      const response = await this.geminiClient.generateClarifyingQuestion(prompt);

      // Process the response and handle any function calls
      const result = await this.processGeminiResponse(response, userInput);

      return result;

    } catch (error) {
      console.error('Error processing user input:', error);
      return {
        type: 'error',
        message: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private buildConversationPrompt(userInput: string): string {
    const contextInfo = `
You are an AI calendar scheduling assistant. Help users optimize their schedules through natural conversation and intelligent calendar management.

CURRENT SESSION CONTEXT:
- Session ID: ${this.context.sessionId}
- Problem Statement: ${this.context.problemStatement?.rawText || 'None yet'}
- Questions Asked: ${this.context.clarifyingQuestions.length}
- User Answers: ${this.context.userAnswers.length}
- Current Events: ${this.context.currentEvents.length}
- Proposals Generated: ${this.context.proposals.length}
- User Preferences: Sleep target ${this.context.preferences.sleepTargetHours}h, Priorities: ${this.context.preferences.priorities.join(', ')}

CONVERSATION HISTORY:
`;

    let historyText = contextInfo;

    // Add conversation history
    for (let i = 0; i < Math.max(this.context.clarifyingQuestions.length, this.context.userAnswers.length); i++) {
      if (this.context.clarifyingQuestions[i]) {
        historyText += `Q${i + 1}: ${this.context.clarifyingQuestions[i].text}\n`;
      }
      if (this.context.userAnswers[i]) {
        historyText += `A${i + 1}: ${this.context.userAnswers[i]}\n`;
      }
    }

    // Add current events if available
    if (this.context.currentEvents.length > 0) {
      historyText += '\nCURRENT CALENDAR EVENTS:\n';
      this.context.currentEvents.slice(0, 10).forEach(event => {
        historyText += `- ${event.title}: ${event.start} to ${event.end} (${event.durationMinutes} min)\n`;
      });
    }

    // Add recent proposals
    if (this.context.proposals.length > 0) {
      historyText += '\nRECENT PROPOSALS:\n';
      this.context.proposals.slice(-2).forEach(proposal => {
        historyText += `- Proposal ${proposal.revision}: ${proposal.summary} (${proposal.changes.length} changes)\n`;
      });
    }

    const prompt = `
${historyText}

CURRENT USER INPUT: "${userInput}"

INSTRUCTIONS:
1. If this is a new scheduling problem, ask clarifying questions to understand their needs
2. If they're answering a clarifying question, store their answer and ask follow-up questions if needed
3. If you have enough information, generate a schedule proposal using the generate_schedule_proposal function
4. Use the calendar functions to fetch, create, update, or delete events as needed
5. Always explain your reasoning and ask for confirmation before making changes
6. Consider sleep impact, productivity, and user preferences in all recommendations

RESPONSE GUIDELINES:
- Be conversational and empathetic
- Ask specific questions about scheduling preferences
- Explain proposed changes clearly with rationale
- Always confirm before making calendar modifications
- Respect user constraints and priorities
- Consider sleep health (minimum ${this.context.preferences.sleepTargetHours} hours)

Available functions: ${CALENDAR_FUNCTIONS.map(f => f.name).join(', ')}
`;

    return prompt;
  }

  private async processGeminiResponse(response: string, userInput: string): Promise<AssistantResponse> {
    // Parse response for function calls (this would be enhanced with actual function calling)
    const functionCallMatch = response.match(/FUNCTION_CALL:(\w+)\|(.+)/);
    
    if (functionCallMatch) {
      const [, functionName, argsJson] = functionCallMatch;
      const args = JSON.parse(argsJson);
      
      // Execute the function call
      const functionResult = await this.executeFunctionCall(functionName, args);
      
      // Continue conversation with function result
      return this.continueConversationWithResult(response, functionResult, userInput);
    }

    // Check if this is a clarifying question
    if (this.isClarifyingQuestion(response)) {
      const question = {
        id: crypto.randomUUID(),
        text: response,
        rationaleTag: 'clarification_needed',
        answered: false,
        problemId: this.context.problemStatement?.id || ''
      };
      this.context.clarifyingQuestions.push(question);
      
      return {
        type: 'clarifying_question',
        message: response,
        data: { question }
      };
    }

    // Check if this is a proposal
    if (this.isProposal(response)) {
      return {
        type: 'proposal',
        message: response,
        data: { proposal: this.extractProposalFromResponse(response) }
      };
    }

    // Store user answer if this follows a question
    if (this.context.clarifyingQuestions.length > this.context.userAnswers.length) {
      this.context.userAnswers.push(userInput);
    }

    // General response
    return {
      type: 'response',
      message: response
    };
  }

  private async executeFunctionCall(functionName: string, args: any): Promise<any> {
    try {
      switch (functionName) {
        case 'get_calendar_events':
          return await this.getCalendarEvents(args);
        case 'create_calendar_event':
          return await this.createCalendarEvent(args);
        case 'update_calendar_event':
          return await this.updateCalendarEvent(args);
        case 'delete_calendar_event':
          return await this.deleteCalendarEvent(args);
        case 'generate_schedule_proposal':
          return await this.generateScheduleProposal(args);
        case 'analyze_schedule_conflicts':
          return await this.analyzeScheduleConflicts(args);
        case 'assess_sleep_impact':
          return await this.assessSleepImpact(args);
        default:
          return { error: `Unknown function: ${functionName}` };
      }
    } catch (error) {
      return { error: `Function execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async getCalendarEvents(args: {
    startDate: string;
    endDate: string;
    maxResults?: number;
    singleEvents?: boolean;
  }): Promise<any> {
    try {
      const timeMin = `${args.startDate}T00:00:00Z`;
      const timeMax = `${args.endDate}T23:59:59Z`;
      
      const events = await this.calendarClient.listEvents({
        timeMin,
        timeMax,
        maxResults: args.maxResults || 50,
        singleEvents: args.singleEvents !== false
      });

      // Update context with current events
      this.context.currentEvents = events;

      return {
        success: true,
        events: events,
        count: events.length
      };
    } catch (error) {
      return { error: `Failed to get calendar events: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async createCalendarEvent(args: {
    title: string;
    startDateTime: string;
    endDateTime: string;
    description?: string;
    location?: string;
  }): Promise<any> {
    try {
      const eventId = await this.calendarClient.createEvent({
        title: args.title,
        start: args.startDateTime,
        end: args.endDateTime,
        description: args.description,
        location: args.location
      });

      return {
        success: true,
        eventId,
        message: `Created event: ${args.title}`
      };
    } catch (error) {
      return { error: `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async updateCalendarEvent(args: {
    eventId: string;
    title?: string;
    startDateTime?: string;
    endDateTime?: string;
    description?: string;
  }): Promise<any> {
    try {
      await this.calendarClient.updateEvent(args.eventId, {
        title: args.title,
        start: args.startDateTime,
        end: args.endDateTime,
        description: args.description
      });

      return {
        success: true,
        eventId: args.eventId,
        message: `Updated event ${args.eventId}`
      };
    } catch (error) {
      return { error: `Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async deleteCalendarEvent(args: { eventId: string }): Promise<any> {
    try {
      await this.calendarClient.deleteEvent(args.eventId);
      return {
        success: true,
        eventId: args.eventId,
        message: `Deleted event ${args.eventId}`
      };
    } catch (error) {
      return { error: `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async generateScheduleProposal(args: {
    problemDescription: string;
    constraints?: string[];
    focusPeriod?: string;
    currentEvents?: any[];
  }): Promise<any> {
    try {
      // Use Gemini to generate a structured proposal
      const proposal = await this.geminiClient.generateProposal({
        problemText: args.problemDescription,
        clarifications: this.context.userAnswers,
        events: this.context.currentEvents,
        preferences: this.context.preferences
      });

      // Add to context
      this.context.proposals.push(proposal);

      return {
        success: true,
        proposal,
        message: `Generated proposal with ${proposal.changes.length} changes`
      };
    } catch (error) {
      return { error: `Failed to generate proposal: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async analyzeScheduleConflicts(args: {
    events: any[];
    constraints?: string[];
  }): Promise<any> {
    try {
      const conflicts = [];
      
      // Simple conflict detection (overlapping times)
      for (let i = 0; i < args.events.length; i++) {
        for (let j = i + 1; j < args.events.length; j++) {
          if (this.eventsOverlap(args.events[i], args.events[j])) {
            conflicts.push({
              event1: args.events[i],
              event2: args.events[j],
              type: 'time_overlap'
            });
          }
        }
      }

      return {
        success: true,
        conflicts,
        conflictCount: conflicts.length
      };
    } catch (error) {
      return { error: `Failed to analyze conflicts: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async assessSleepImpact(args: {
    events: any[];
    sleepTargetHours: number;
    timeZone?: string;
  }): Promise<any> {
    try {
      // Analyze events for sleep impact
      const eveningEvents = args.events.filter(event => {
        const hour = new Date(event.start).getHours();
        return hour >= 18; // After 6 PM
      });

      const morningEvents = args.events.filter(event => {
        const hour = new Date(event.start).getHours();
        return hour <= 8; // Before 8 AM
      });

      const estimatedSleepHours = this.calculateSleepHours(eveningEvents, morningEvents);
      const belowTarget = estimatedSleepHours < args.sleepTargetHours;

      return {
        success: true,
        estimatedSleepHours,
        belowTarget,
        eveningEventsCount: eveningEvents.length,
        morningEventsCount: morningEvents.length,
        message: `Estimated sleep: ${estimatedSleepHours}h (target: ${args.sleepTargetHours}h)`
      };
    } catch (error) {
      return { error: `Failed to assess sleep impact: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private eventsOverlap(event1: any, event2: any): boolean {
    const start1 = new Date(event1.start).getTime();
    const end1 = new Date(event1.end).getTime();
    const start2 = new Date(event2.start).getTime();
    const end2 = new Date(event2.end).getTime();
    
    return start1 < end2 && start2 < end1;
  }

  private calculateSleepHours(eveningEvents: any[], morningEvents: any[]): number {
    // Simple heuristic: assume 8 hours sleep if no evening events after 10 PM
    // and no morning events before 7 AM
    const lateEveningEvents = eveningEvents.filter(e => new Date(e.start).getHours() >= 22);
    const earlyMorningEvents = morningEvents.filter(e => new Date(e.start).getHours() <= 7);
    
    if (lateEveningEvents.length === 0 && earlyMorningEvents.length === 0) {
      return 8; // Good sleep
    } else if (lateEveningEvents.length > 0) {
      return 6; // Reduced sleep due to late events
    } else {
      return 7; // Moderate sleep
    }
  }

  private async continueConversationWithResult(
    originalResponse: string, 
    functionResult: any, 
    userInput: string
  ): Promise<AssistantResponse> {
    
    const followUpPrompt = `
Based on the function call results, provide a helpful response to the user.

Function Result: ${JSON.stringify(functionResult, null, 2)}
Original User Input: "${userInput}"

Provide a natural, conversational response that:
1. Acknowledges what was done
2. Explains the results clearly  
3. Asks for confirmation if changes were made
4. Suggests next steps if appropriate
`;

    try {
      const followUpResponse = await this.geminiClient.generateClarifyingQuestion(followUpPrompt);
      
      return {
        type: 'confirmation',
        message: followUpResponse,
        data: { functionResult },
        requiresUserAction: functionResult.success
      };
    } catch (error) {
      return {
        type: 'confirmation',
        message: `I completed the requested action: ${JSON.stringify(functionResult, null, 2)}`,
        data: { functionResult },
        requiresUserAction: functionResult.success
      };
    }
  }

  private isClarifyingQuestion(response: string): boolean {
    return response.includes('?') && 
           this.context.userAnswers.length < this.context.clarifyingQuestions.length &&
           !response.toLowerCase().includes('proposal');
  }

  private isProposal(response: string): boolean {
    return response.toLowerCase().includes('proposal') || 
           response.toLowerCase().includes('suggest') ||
           response.toLowerCase().includes('recommend');
  }

  private extractProposalFromResponse(response: string): any {
    // This would parse the response to extract structured proposal data
    // For now, return a placeholder
    return null;
  }

  /**
   * Get current conversation context
   */
  getConversationContext(): ConversationContext {
    return { ...this.context };
  }

  /**
   * Clear conversation and start fresh
   */
  clearConversation(): void {
    this.context = {
      problemStatement: null,
      clarifyingQuestions: [],
      userAnswers: [],
      currentEvents: [],
      proposals: [],
      preferences: {
        sleepTargetHours: 7,
        priorities: ['sleep', 'focus'],
        protectedWindows: [],
        iterationCount: 0
      },
      sessionId: crypto.randomUUID()
    };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<PreferenceSet>): void {
    this.context.preferences = { ...this.context.preferences, ...preferences };
  }

  /**
   * Apply a proposal to the calendar
   */
  async applyProposal(proposalId: string): Promise<any> {
    const proposal = this.context.proposals.find(p => p.id === proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    try {
      const result = await this.calendarClient.applyChanges(proposal.changes);
      
      // Update proposal status
      proposal.status = result.success ? 'applied' : 'pending';
      
      return result;
    } catch (error) {
      throw new Error(`Failed to apply proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export convenience function
export const createCalendarAssistant = (config: CalendarAssistantConfig): GeminiCalendarAssistant => {
  return new GeminiCalendarAssistant(config);
};
