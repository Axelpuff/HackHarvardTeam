#!/usr/bin/env python3
"""
Gemini Calendar Assistant - AI-powered calendar scheduling wrapper
Integrates Gemini AI with Google Calendar API for conversational schedule optimization
"""

import os
import json
import uuid
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import google.generativeai as genai
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

from gemini_client import GeminiClient
from config import Config


@dataclass
class CalendarEvent:
    """Represents a calendar event"""
    id: str
    title: str
    start: str
    end: str
    duration_minutes: int
    source: str = 'current'  # 'current' or 'proposed'
    change_type: str = 'none'  # 'none', 'add', 'move', 'remove', 'adjust'
    original_event_id: Optional[str] = None
    accepted: Optional[bool] = None


@dataclass
class ChangeItem:
    """Represents a proposed change to the schedule"""
    id: str
    type: str  # 'add', 'move', 'remove', 'adjust'
    event: CalendarEvent
    target_event_id: Optional[str] = None
    rationale: str = ""
    accepted: str = 'pending'  # 'pending', 'accepted', 'rejected'


@dataclass
class Proposal:
    """Represents a schedule proposal"""
    id: str
    revision: int
    changes: List[ChangeItem]
    summary: str
    sleep_assessment: Dict[str, Any]
    status: str = 'pending'  # 'draft', 'pending', 'approved', 'applied', 'discarded'
    created_at: str = ""
    previous_proposal_id: Optional[str] = None


@dataclass
class ConversationContext:
    """Maintains conversation state and history"""
    problem_statement: str = ""
    clarifying_questions: List[str] = None
    user_answers: List[str] = None
    current_events: List[CalendarEvent] = None
    proposals: List[Proposal] = None
    preferences: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.clarifying_questions is None:
            self.clarifying_questions = []
        if self.user_answers is None:
            self.user_answers = []
        if self.current_events is None:
            self.current_events = []
        if self.proposals is None:
            self.proposals = []
        if self.preferences is None:
            self.preferences = {
                'sleep_target_hours': 7,
                'priorities': ['sleep', 'focus'],
                'protected_windows': [],
                'iteration_count': 0
            }


class GeminiCalendarAssistant:
    """
    AI-powered calendar assistant using Gemini with function calling capabilities
    Integrates natural language processing with Google Calendar API
    """
    
    def __init__(self, google_credentials_path: Optional[str] = None):
        """
        Initialize the calendar assistant
        
        Args:
            google_credentials_path: Path to Google OAuth credentials JSON file
        """
        # Initialize Gemini client
        self.gemini_client = GeminiClient()
        
        # Initialize Google Calendar service
        self.calendar_service = None
        self.credentials = None
        
        # Conversation context
        self.context = ConversationContext()
        
        # Function definitions for Gemini
        self.functions = self._define_functions()
        
        # Configure Gemini model with function calling
        self._setup_gemini_with_functions()
        
        # Initialize Google Calendar if credentials provided
        if google_credentials_path:
            self._initialize_google_calendar(google_credentials_path)
    
    def _define_functions(self) -> List[Dict[str, Any]]:
        """Define available functions for Gemini to call"""
        return [
            {
                "name": "get_calendar_events",
                "description": "Retrieve calendar events for a specific date range",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "start_date": {
                            "type": "string",
                            "description": "Start date in ISO format (YYYY-MM-DD)"
                        },
                        "end_date": {
                            "type": "string", 
                            "description": "End date in ISO format (YYYY-MM-DD)"
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of events to retrieve (default: 50)"
                        }
                    },
                    "required": ["start_date", "end_date"]
                }
            },
            {
                "name": "create_calendar_event",
                "description": "Create a new calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Event title"
                        },
                        "start_datetime": {
                            "type": "string",
                            "description": "Start datetime in ISO format"
                        },
                        "end_datetime": {
                            "type": "string",
                            "description": "End datetime in ISO format"
                        },
                        "description": {
                            "type": "string",
                            "description": "Event description (optional)"
                        },
                        "location": {
                            "type": "string",
                            "description": "Event location (optional)"
                        }
                    },
                    "required": ["title", "start_datetime", "end_datetime"]
                }
            },
            {
                "name": "update_calendar_event",
                "description": "Update an existing calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "ID of the event to update"
                        },
                        "title": {
                            "type": "string",
                            "description": "New event title (optional)"
                        },
                        "start_datetime": {
                            "type": "string",
                            "description": "New start datetime in ISO format (optional)"
                        },
                        "end_datetime": {
                            "type": "string",
                            "description": "New end datetime in ISO format (optional)"
                        },
                        "description": {
                            "type": "string",
                            "description": "New event description (optional)"
                        }
                    },
                    "required": ["event_id"]
                }
            },
            {
                "name": "delete_calendar_event",
                "description": "Delete a calendar event",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "event_id": {
                            "type": "string",
                            "description": "ID of the event to delete"
                        }
                    },
                    "required": ["event_id"]
                }
            },
            {
                "name": "generate_schedule_proposal",
                "description": "Generate a proposed schedule optimization",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "problem_description": {
                            "type": "string",
                            "description": "User's scheduling problem or goal"
                        },
                        "constraints": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of scheduling constraints and preferences"
                        },
                        "focus_period": {
                            "type": "string",
                            "description": "Time period to focus on (e.g., 'week', 'day', 'tuesday')"
                        }
                    },
                    "required": ["problem_description"]
                }
            },
            {
                "name": "analyze_schedule_conflicts",
                "description": "Analyze potential scheduling conflicts",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "events": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "title": {"type": "string"},
                                    "start": {"type": "string"},
                                    "end": {"type": "string"}
                                }
                            },
                            "description": "List of events to analyze for conflicts"
                        }
                    },
                    "required": ["events"]
                }
            }
        ]
    
    def _setup_gemini_with_functions(self):
        """Setup Gemini model with function calling capabilities"""
        try:
            # Configure generation parameters for function calling
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=2048,
                temperature=0.7,
                candidate_count=1
            )
            
            # Create model with function calling
            self.gemini_model = genai.GenerativeModel(
                'gemini-2.0-flash',
                tools=self.functions,
                generation_config=generation_config
            )
            
        except Exception as e:
            print(f"Warning: Could not setup function calling: {e}")
            # Fallback to basic model
            self.gemini_model = self.gemini_client.model
    
    def _initialize_google_calendar(self, credentials_path: str):
        """Initialize Google Calendar API service"""
        try:
            # Load credentials (this would need proper OAuth flow in production)
            # For demo purposes, we'll create a mock service
            print(f"Initializing Google Calendar with credentials from: {credentials_path}")
            # In production, implement proper OAuth flow here
            self.calendar_service = "mock_service"
            
        except Exception as e:
            print(f"Warning: Could not initialize Google Calendar: {e}")
            self.calendar_service = None
    
    def process_user_input(self, user_input: str) -> Dict[str, Any]:
        """
        Main entry point for processing user input
        
        Args:
            user_input: Natural language input from user
            
        Returns:
            Dict containing response and any actions taken
        """
        try:
            # Store the problem statement if this is the first input
            if not self.context.problem_statement:
                self.context.problem_statement = user_input
            
            # Create conversation prompt with context
            prompt = self._build_conversation_prompt(user_input)
            
            # Get response from Gemini with potential function calls
            response = self.gemini_model.generate_content(prompt)
            
            # Process the response and any function calls
            result = self._process_gemini_response(response, user_input)
            
            return result
            
        except Exception as e:
            return {
                'type': 'error',
                'message': f'I encountered an error: {str(e)}',
                'suggestions': ['Try rephrasing your request', 'Check your calendar permissions']
            }
    
    def _build_conversation_prompt(self, user_input: str) -> str:
        """Build a comprehensive prompt with conversation context"""
        
        context_info = f"""
You are an AI calendar scheduling assistant. Help users optimize their schedules through natural conversation.

CURRENT CONTEXT:
- Problem Statement: {self.context.problem_statement}
- Previous Questions Asked: {len(self.context.clarifying_questions)}
- User Answers Provided: {len(self.context.user_answers)}
- Current Events in Calendar: {len(self.context.current_events)}
- Proposals Generated: {len(self.context.proposals)}
- User Preferences: {self.context.preferences}

CONVERSATION HISTORY:
"""
        
        # Add conversation history
        if self.context.clarifying_questions and self.context.user_answers:
            for i, (question, answer) in enumerate(zip(self.context.clarifying_questions, self.context.user_answers)):
                context_info += f"Q{i+1}: {question}\nA{i+1}: {answer}\n"
        
        # Add current calendar events if available
        if self.context.current_events:
            context_info += "\nCURRENT CALENDAR EVENTS:\n"
            for event in self.context.current_events[:10]:  # Limit to first 10 events
                context_info += f"- {event.title}: {event.start} to {event.end}\n"
        
        prompt = f"""
{context_info}

CURRENT USER INPUT: "{user_input}"

INSTRUCTIONS:
1. If this is a new scheduling problem, ask clarifying questions to understand their needs
2. If they're answering a clarifying question, store their answer and ask follow-up questions if needed
3. If you have enough information, generate a schedule proposal using the generate_schedule_proposal function
4. Use the calendar functions to fetch, create, update, or delete events as needed
5. Always explain your reasoning and ask for confirmation before making changes

RESPONSE FORMAT:
- Be conversational and helpful
- Ask specific questions about their scheduling preferences
- Explain any proposed changes clearly
- Always confirm before making calendar modifications

Available functions: {[f['name'] for f in self.functions]}
"""
        
        return prompt
    
    def _process_gemini_response(self, response, user_input: str) -> Dict[str, Any]:
        """Process Gemini's response and handle function calls"""
        
        # Check if Gemini wants to call functions
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            
            # Check for function calls
            if hasattr(candidate, 'content') and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        # Execute the function call
                        function_result = self._execute_function_call(part.function_call)
                        
                        # Continue conversation with function result
                        return self._continue_conversation_with_result(
                            response, function_result, user_input
                        )
        
        # No function calls, return direct response
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Determine response type based on content
        if '?' in response_text and len(self.context.user_answers) < len(self.context.clarifying_questions):
            # This is a clarifying question
            self.context.clarifying_questions.append(response_text)
            return {
                'type': 'clarifying_question',
                'question': response_text,
                'message': response_text
            }
        elif 'proposal' in response_text.lower() or 'schedule' in response_text.lower():
            # This might be a proposal
            return {
                'type': 'proposal',
                'message': response_text,
                'proposal': self._extract_proposal_from_response(response_text)
            }
        else:
            # General response
            return {
                'type': 'response',
                'message': response_text
            }
    
    def _execute_function_call(self, function_call) -> Dict[str, Any]:
        """Execute a function call requested by Gemini"""
        function_name = function_call.name
        function_args = dict(function_call.args) if hasattr(function_call, 'args') else {}
        
        try:
            if function_name == 'get_calendar_events':
                return self._get_calendar_events(**function_args)
            elif function_name == 'create_calendar_event':
                return self._create_calendar_event(**function_args)
            elif function_name == 'update_calendar_event':
                return self._update_calendar_event(**function_args)
            elif function_name == 'delete_calendar_event':
                return self._delete_calendar_event(**function_args)
            elif function_name == 'generate_schedule_proposal':
                return self._generate_schedule_proposal(**function_args)
            elif function_name == 'analyze_schedule_conflicts':
                return self._analyze_schedule_conflicts(**function_args)
            else:
                return {'error': f'Unknown function: {function_name}'}
                
        except Exception as e:
            return {'error': f'Function execution failed: {str(e)}'}
    
    def _get_calendar_events(self, start_date: str, end_date: str, max_results: int = 50) -> Dict[str, Any]:
        """Get calendar events for a date range"""
        try:
            # Mock implementation - in production, use Google Calendar API
            mock_events = [
                {
                    'id': 'event_1',
                    'title': 'Team Meeting',
                    'start': f'{start_date}T09:00:00Z',
                    'end': f'{start_date}T10:00:00Z',
                    'duration_minutes': 60
                },
                {
                    'id': 'event_2', 
                    'title': 'Lunch Break',
                    'start': f'{start_date}T12:00:00Z',
                    'end': f'{start_date}T13:00:00Z',
                    'duration_minutes': 60
                }
            ]
            
            # Update context with current events
            self.context.current_events = [
                CalendarEvent(**event) for event in mock_events
            ]
            
            return {
                'success': True,
                'events': mock_events,
                'count': len(mock_events)
            }
            
        except Exception as e:
            return {'error': f'Failed to get calendar events: {str(e)}'}
    
    def _create_calendar_event(self, title: str, start_datetime: str, end_datetime: str, 
                             description: str = "", location: str = "") -> Dict[str, Any]:
        """Create a new calendar event"""
        try:
            # Mock implementation
            event_id = f"event_{uuid.uuid4().hex[:8]}"
            
            new_event = CalendarEvent(
                id=event_id,
                title=title,
                start=start_datetime,
                end=end_datetime,
                duration_minutes=self._calculate_duration(start_datetime, end_datetime),
                source='proposed',
                change_type='add'
            )
            
            return {
                'success': True,
                'event_id': event_id,
                'event': asdict(new_event),
                'message': f'Created event: {title}'
            }
            
        except Exception as e:
            return {'error': f'Failed to create event: {str(e)}'}
    
    def _update_calendar_event(self, event_id: str, **updates) -> Dict[str, Any]:
        """Update an existing calendar event"""
        try:
            # Mock implementation
            return {
                'success': True,
                'event_id': event_id,
                'message': f'Updated event {event_id}',
                'updates': updates
            }
            
        except Exception as e:
            return {'error': f'Failed to update event: {str(e)}'}
    
    def _delete_calendar_event(self, event_id: str) -> Dict[str, Any]:
        """Delete a calendar event"""
        try:
            # Mock implementation
            return {
                'success': True,
                'event_id': event_id,
                'message': f'Deleted event {event_id}'
            }
            
        except Exception as e:
            return {'error': f'Failed to delete event: {str(e)}'}
    
    def _generate_schedule_proposal(self, problem_description: str, 
                                  constraints: List[str] = None,
                                  focus_period: str = "week") -> Dict[str, Any]:
        """Generate a schedule optimization proposal"""
        try:
            if constraints is None:
                constraints = []
            
            # Create a proposal using AI reasoning
            proposal_id = f"proposal_{uuid.uuid4().hex[:8]}"
            
            # Generate changes based on problem and constraints
            changes = self._generate_proposal_changes(problem_description, constraints)
            
            # Create proposal
            proposal = Proposal(
                id=proposal_id,
                revision=1,
                changes=changes,
                summary=f"Schedule optimization for: {problem_description}",
                sleep_assessment={
                    'estimated_sleep_hours': 7.5,
                    'below_target': False
                },
                created_at=datetime.now().isoformat()
            )
            
            # Add to context
            self.context.proposals.append(proposal)
            
            return {
                'success': True,
                'proposal': asdict(proposal),
                'message': f'Generated proposal with {len(changes)} changes'
            }
            
        except Exception as e:
            return {'error': f'Failed to generate proposal: {str(e)}'}
    
    def _generate_proposal_changes(self, problem: str, constraints: List[str]) -> List[ChangeItem]:
        """Generate specific changes for a proposal"""
        changes = []
        
        # Simple heuristics based on common problems
        if 'hectic' in problem.lower() or 'busy' in problem.lower():
            # Add focus time blocks
            change = ChangeItem(
                id=f"change_{uuid.uuid4().hex[:8]}",
                type='add',
                event=CalendarEvent(
                    id=f"event_{uuid.uuid4().hex[:8]}",
                    title='Focus Time',
                    start='2025-01-15T09:00:00Z',
                    end='2025-01-15T11:00:00Z',
                    duration_minutes=120,
                    source='proposed',
                    change_type='add'
                ),
                rationale='Added dedicated focus time to reduce hectic schedule'
            )
            changes.append(change)
        
        if 'sleep' in problem.lower():
            # Adjust evening events for better sleep
            change = ChangeItem(
                id=f"change_{uuid.uuid4().hex[:8]}",
                type='move',
                event=CalendarEvent(
                    id=f"event_{uuid.uuid4().hex[:8]}",
                    title='Evening Activity',
                    start='2025-01-15T18:00:00Z',
                    end='2025-01-15T19:00:00Z',
                    duration_minutes=60,
                    source='proposed',
                    change_type='move'
                ),
                target_event_id='existing_evening_event',
                rationale='Moved evening activity earlier to improve sleep schedule'
            )
            changes.append(change)
        
        return changes
    
    def _analyze_schedule_conflicts(self, events: List[Dict[str, str]]) -> Dict[str, Any]:
        """Analyze events for scheduling conflicts"""
        try:
            conflicts = []
            
            # Simple conflict detection (overlapping times)
            for i, event1 in enumerate(events):
                for j, event2 in enumerate(events[i+1:], i+1):
                    if self._events_overlap(event1, event2):
                        conflicts.append({
                            'event1': event1,
                            'event2': event2,
                            'type': 'time_overlap'
                        })
            
            return {
                'success': True,
                'conflicts': conflicts,
                'conflict_count': len(conflicts)
            }
            
        except Exception as e:
            return {'error': f'Failed to analyze conflicts: {str(e)}'}
    
    def _events_overlap(self, event1: Dict[str, str], event2: Dict[str, str]) -> bool:
        """Check if two events overlap in time"""
        start1 = datetime.fromisoformat(event1['start'].replace('Z', '+00:00'))
        end1 = datetime.fromisoformat(event1['end'].replace('Z', '+00:00'))
        start2 = datetime.fromisoformat(event2['start'].replace('Z', '+00:00'))
        end2 = datetime.fromisoformat(event2['end'].replace('Z', '+00:00'))
        
        return start1 < end2 and start2 < end1
    
    def _continue_conversation_with_result(self, original_response, function_result: Dict[str, Any], 
                                         user_input: str) -> Dict[str, Any]:
        """Continue conversation with function call results"""
        
        # Create follow-up prompt with function results
        follow_up_prompt = f"""
Based on the function call results, provide a helpful response to the user.

Function Result: {json.dumps(function_result, indent=2)}

Original User Input: "{user_input}"

Provide a natural, conversational response that:
1. Acknowledges what was done
2. Explains the results clearly
3. Asks for confirmation if changes were made
4. Suggests next steps if appropriate
"""
        
        try:
            follow_up_response = self.gemini_model.generate_content(follow_up_prompt)
            response_text = follow_up_response.text if hasattr(follow_up_response, 'text') else str(follow_up_response)
            
            return {
                'type': 'function_result',
                'message': response_text,
                'function_result': function_result
            }
            
        except Exception as e:
            return {
                'type': 'function_result',
                'message': f'I completed the requested action: {json.dumps(function_result, indent=2)}',
                'function_result': function_result
            }
    
    def _extract_proposal_from_response(self, response_text: str) -> Optional[Proposal]:
        """Extract proposal information from Gemini response"""
        # This would parse the response to extract structured proposal data
        # For now, return None as a placeholder
        return None
    
    def _calculate_duration(self, start: str, end: str) -> int:
        """Calculate duration in minutes between two datetime strings"""
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
        return int((end_dt - start_dt).total_seconds() / 60)
    
    def get_conversation_context(self) -> Dict[str, Any]:
        """Get current conversation context"""
        return {
            'problem_statement': self.context.problem_statement,
            'questions_asked': self.context.clarifying_questions,
            'answers_provided': self.context.user_answers,
            'current_events_count': len(self.context.current_events),
            'proposals_generated': len(self.context.proposals),
            'preferences': self.context.preferences
        }
    
    def clear_conversation(self):
        """Clear conversation context and start fresh"""
        self.context = ConversationContext()
        print("Conversation context cleared. Ready for a new scheduling discussion.")


def main():
    """Demo the Gemini Calendar Assistant"""
    print("🤖 Gemini Calendar Assistant Demo")
    print("=" * 50)
    
    try:
        # Initialize the assistant
        assistant = GeminiCalendarAssistant()
        
        print("✅ Calendar Assistant initialized!")
        print("Type your scheduling concerns and I'll help optimize your calendar.")
        print("Commands: 'quit' to exit, 'clear' to start over, 'context' to see current state\n")
        
        while True:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q', 'bye']:
                print("👋 Goodbye! Your calendar is optimized.")
                break
            elif user_input.lower() in ['clear', 'reset']:
                assistant.clear_conversation()
                continue
            elif user_input.lower() in ['context', 'status']:
                context = assistant.get_conversation_context()
                print(f"\n📊 Current Context:")
                print(f"Problem: {context['problem_statement']}")
                print(f"Questions asked: {len(context['questions_asked'])}")
                print(f"Events loaded: {context['current_events_count']}")
                print(f"Proposals: {context['proposals_generated']}\n")
                continue
            
            if not user_input:
                print("Please enter your scheduling concern or question.")
                continue
            
            # Process user input
            print("🤖 Assistant is thinking...")
            result = assistant.process_user_input(user_input)
            
            # Display response
            print(f"Assistant: {result.get('message', 'No response')}")
            
            # Show additional info if available
            if result.get('type') == 'function_result':
                print(f"📋 Action completed: {result.get('function_result', {})}")
            elif result.get('type') == 'proposal':
                print("📅 Schedule proposal generated!")
            
            print()
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure your GEMINI_API_KEY is set in the .env file")


if __name__ == "__main__":
    main()
