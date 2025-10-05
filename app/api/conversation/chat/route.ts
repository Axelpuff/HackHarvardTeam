import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createGeminiClient } from '@/lib/gemini';

// Request schema for starting chat
const StartChatRequestSchema = z.object({
  sessionId: z.string().optional(),
});

// Request schema for sending messages
const SendMessageRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
});

// Response schemas
const ChatResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string(),
  response: z.string(),
  timestamp: z.string(),
});

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

// Simple in-memory chat storage
const chatSessions = new Map<string, {
  messages: Array<{role: string, content: string}>,
  lastActivity: Date
}>();

// Clean up old sessions (older than 1 hour)
function cleanupOldSessions() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [sessionId, session] of chatSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      chatSessions.delete(sessionId);
    }
  }
}

// Get real Gemini response
async function getGeminiResponse(userMessage: string, sessionId: string): Promise<string> {
  try {
    const session = chatSessions.get(sessionId);
    const messageCount = session?.messages.length || 0;
    
    // First message - greeting
    if (messageCount === 0) {
      return "Hi! I'm here to help you optimize your schedule. What scheduling challenge are you facing?";
    }
    
    // Create Gemini client
    const geminiClient = createGeminiClient();
    
    // Build conversation context
    const conversationHistory = session?.messages.slice(-10) || []; // Last 10 messages
    
    // Get response from Gemini
    const response = await geminiClient.generateChatResponse(userMessage, conversationHistory);
    return response;
    
  } catch (error) {
    console.error('Error getting Gemini response:', error);
    return "I'm having trouble connecting to my AI service right now. Please try again in a moment.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // Clean up old sessions
    cleanupOldSessions();

    if (action === 'start') {
      // Start a new conversation
      const { sessionId } = StartChatRequestSchema.parse(body);
      const newSessionId = sessionId || `session_${Date.now()}`;
      
      // Initialize session
      chatSessions.set(newSessionId, {
        messages: [],
        lastActivity: new Date()
      });
      
      // Get initial greeting
      const initialResponse = await getGeminiResponse("", newSessionId);
      
      // Add to session
      const session = chatSessions.get(newSessionId)!;
      session.messages.push({role: 'assistant', content: initialResponse});
      session.lastActivity = new Date();

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
        response: initialResponse,
        timestamp: new Date().toISOString(),
      });

    } else {
      // Send a message
      const { message, sessionId } = SendMessageRequestSchema.parse(body);
      
      // Get or create session
      let session = chatSessions.get(sessionId);
      if (!session) {
        session = {
          messages: [],
          lastActivity: new Date()
        };
        chatSessions.set(sessionId, session);
      }
      
      // Add user message
      session.messages.push({role: 'user', content: message});
      session.lastActivity = new Date();
      
      // Get AI response
      const response = await getGeminiResponse(message, sessionId);
      
      // Add AI response
      session.messages.push({role: 'assistant', content: response});
      session.lastActivity = new Date();

      return NextResponse.json({
        success: true,
        sessionId: sessionId,
        response: response,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('Error in /api/conversation/chat:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: `Invalid request: ${error.errors.map((e) => e.message).join(', ')}`,
      }, { status: 400 });
    }

    // Handle generic errors
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}