#!/usr/bin/env python3
"""
Enhanced Gemini Calendar Chat - Conversational AI calendar assistant
Extends gemini_chat.py with calendar-specific functionality and function calling
"""

import os
import json
import uuid
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import google.generativeai as genai

# Suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

from gemini_client import GeminiClient
from config import Config


@dataclass
class CalendarEvent:
    """Represents a calendar event with all necessary fields"""
    id: str
    title: str
    start: str  # ISO datetime string
    end: str    # ISO datetime string
    duration_minutes: int
    source: str = 'current'  # 'current' or 'proposed'
    change_type: str = 'none'  # 'none', 'add', 'move', 'remove', 'adjust'
    original_event_id: Optional[str] = None
    accepted: Optional[bool] = None
    description: Optional[str] = None
    location: Optional[str] = None


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
    """Maintains conversation state and history for calendar assistance"""
    problem_statement: str = ""
    clarifying_questions: List[str] = None
    user_answers: List[str] = None
    current_events: List[CalendarEvent] = None
    proposals: List[Proposal] = None
    preferences: Dict[str, Any] = None
    session_id: str = ""
    
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
        if not self.session_id:
            self.session_id = str(uuid.uuid4())


class GeminiCalendarChat:
    """
    Enhanced Gemini Chat with Calendar Assistant capabilities
    Extends the basic gemini_chat.py functionality with calendar-specific features
    """
    
    def __init__(self):
        """Initialize the calendar chat assistant"""
        # Initialize base Gemini client
        self.base_client = GeminiClient()
        
        # Calendar-specific context
        self.context = ConversationContext()
        
        # Function definitions for calendar operations
        self.calendar_functions = self._define_calendar_functions()
        
        # Setup enhanced model with function calling
        self._setup_enhanced_model()
        
        print("✅ Gemini Calendar Chat initialized with function calling capabilities!")
    
    def _define_calendar_functions(self) -> List[Dict[str, Any]]:
        """Define available calendar functions for Gemini to call"""
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
            },
            {
                "name": "assess_sleep_impact",
                "description": "Assess the impact of schedule changes on sleep patterns",
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
                            "description": "Events to assess for sleep impact"
                        },
                        "sleep_target_hours": {
                            "type": "number",
                            "description": "Target sleep hours per night"
                        }
                    },
                    "required": ["events", "sleep_target_hours"]
                }
            }
        ]
    
    def _setup_enhanced_model(self):
        """Setup enhanced Gemini model with function calling capabilities"""
        try:
            # Configure generation parameters for function calling
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=2048,
                temperature=0.7,
                candidate_count=1
            )
            
            # Create model with function calling tools
            self.enhanced_model = genai.GenerativeModel(
                'gemini-2.0-flash',
                tools=self.calendar_functions,
                generation_config=generation_config
            )
            
            print("✅ Enhanced model with function calling initialized!")
            
        except Exception as e:
            print(f"⚠️ Warning: Could not setup function calling: {e}")
            print("Falling back to basic model...")
            self.enhanced_model = self.base_client.model
    
    def chat_with_calendar_context(self, user_input: str) -> str:
        """
        Enhanced chat function with calendar context and function calling
        
        Args:
            user_input: User's message
            
        Returns:
            AI response with calendar assistance
        """
        try:
            # Add user input to conversation history
            self.base_client.conversation_history.append({"role": "user", "content": user_input})
            
            # Store problem statement if this is the first input
            if not self.context.problem_statement:
                self.context.problem_statement = user_input
            
            # Build comprehensive prompt with calendar context
            context_prompt = self._build_calendar_context_prompt(user_input)
            
            # Get response from enhanced model with function calling
            response = self.enhanced_model.generate_content(context_prompt)
            
            # Process response and handle function calls
            processed_response = self._process_enhanced_response(response, user_input)
            
            # Add AI response to conversation history
            self.base_client.conversation_history.append({"role": "assistant", "content": processed_response})
            
            return processed_response
            
        except Exception as e:
            error_msg = f"I encountered an error: {str(e)}"
            self.base_client.conversation_history.append({"role": "assistant", "content": error_msg})
            return error_msg
    
    def _build_calendar_context_prompt(self, user_input: str) -> str:
        """Build comprehensive prompt with calendar context and conversation history"""
        
        # Build context information
        context_info = f"""
You are an AI calendar scheduling assistant. Help users optimize their schedules through natural conversation.

CALENDAR ASSISTANT CONTEXT:
- Session ID: {self.context.session_id}
- Problem Statement: {self.context.problem_statement}
- Questions Asked: {len(self.context.clarifying_questions)}
- User Answers: {len(self.context.user_answers)}
- Current Events: {len(self.context.current_events)}
- Proposals Generated: {len(self.context.proposals)}
- User Preferences: Sleep target {self.context.preferences['sleep_target_hours']}h, Priorities: {', '.join(self.context.preferences['priorities'])}

CONVERSATION HISTORY:
"""
        
        # Add conversation history
        recent_history = self.base_client.conversation_history[-6:]  # Last 6 messages
        
        for msg in recent_history[:-1]:  # Exclude current message
            role = "User" if msg["role"] == "user" else "Assistant"
            content = msg["content"][:200] + "..." if len(msg["content"]) > 200 else msg["content"]
            context_info += f"{role}: {content}\n"
        
        # Add current events if available
        if self.context.current_events:
            context_info += "\nCURRENT CALENDAR EVENTS:\n"
            for event in self.context.current_events[:10]:  # Limit to first 10 events
                context_info += f"- {event.title}: {event.start} to {event.end} ({event.duration_minutes} min)\n"
        
        # Add recent proposals
        if self.context.proposals:
            context_info += "\nRECENT PROPOSALS:\n"
            for proposal in self.context.proposals[-2:]:  # Last 2 proposals
                context_info += f"- Proposal {proposal.revision}: {proposal.summary} ({len(proposal.changes)} changes)\n"
        
        prompt = f"""
{context_info}

CURRENT USER INPUT: "{user_input}"

CALENDAR ASSISTANT INSTRUCTIONS:
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
- Consider sleep health (minimum {self.context.preferences['sleep_target_hours']} hours)

Available calendar functions: {[f['name'] for f in self.calendar_functions]}

Please respond naturally while considering the calendar context and available functions.
"""
        
        return prompt
    
    def _process_enhanced_response(self, response, user_input: str) -> str:
        """Process enhanced model response and handle function calls"""
        
        # Check if the response contains function calls
        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            
            # Check for function calls in the response
            if hasattr(candidate, 'content') and candidate.content.parts:
                for part in candidate.content.parts:
                    if hasattr(part, 'function_call') and part.function_call:
                        # Execute the function call
                        function_result = self._execute_calendar_function(part.function_call)
                        
                        # Generate follow-up response with function results
                        return self._generate_function_result_response(function_result, user_input)
        
        # No function calls, return the text response
        response_text = response.text if hasattr(response, 'text') else str(response)
        
        # Determine if this is a clarifying question
        if self._is_clarifying_question(response_text):
            self.context.clarifying_questions.append(response_text)
        elif len(self.context.clarifying_questions) > len(self.context.user_answers):
            # This is likely an answer to a clarifying question
            self.context.user_answers.append(user_input)
        
        return response_text
    
    def _execute_calendar_function(self, function_call) -> Dict[str, Any]:
        """Execute a calendar function call"""
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
            elif function_name == 'assess_sleep_impact':
                return self._assess_sleep_impact(**function_args)
            else:
                return {'error': f'Unknown function: {function_name}'}
                
        except Exception as e:
            return {'error': f'Function execution failed: {str(e)}'}
    
    def _get_calendar_events(self, start_date: str, end_date: str, max_results: int = 50) -> Dict[str, Any]:
        """Get calendar events for a date range (mock implementation)"""
        try:
            # Mock implementation - in production, integrate with Google Calendar API
            mock_events = [
                CalendarEvent(
                    id='event_1',
                    title='Team Meeting',
                    start=f'{start_date}T09:00:00Z',
                    end=f'{start_date}T10:00:00Z',
                    duration_minutes=60,
                    source='current'
                ),
                CalendarEvent(
                    id='event_2',
                    title='Lunch Break',
                    start=f'{start_date}T12:00:00Z',
                    end=f'{start_date}T13:00:00Z',
                    duration_minutes=60,
                    source='current'
                ),
                CalendarEvent(
                    id='event_3',
                    title='Project Review',
                    start=f'{start_date}T14:00:00Z',
                    end=f'{start_date}T15:30:00Z',
                    duration_minutes=90,
                    source='current'
                )
            ]
            
            # Update context with current events
            self.context.current_events = mock_events
            
            return {
                'success': True,
                'events': [asdict(event) for event in mock_events],
                'count': len(mock_events),
                'message': f'Retrieved {len(mock_events)} events from {start_date} to {end_date}'
            }
            
        except Exception as e:
            return {'error': f'Failed to get calendar events: {str(e)}'}
    
    def _create_calendar_event(self, title: str, start_datetime: str, end_datetime: str, 
                             description: str = "", location: str = "") -> Dict[str, Any]:
        """Create a new calendar event (mock implementation)"""
        try:
            event_id = f"event_{uuid.uuid4().hex[:8]}"
            
            new_event = CalendarEvent(
                id=event_id,
                title=title,
                start=start_datetime,
                end=end_datetime,
                duration_minutes=self._calculate_duration(start_datetime, end_datetime),
                source='proposed',
                change_type='add',
                description=description,
                location=location
            )
            
            return {
                'success': True,
                'event_id': event_id,
                'event': asdict(new_event),
                'message': f'Created event: {title} from {start_datetime} to {end_datetime}'
            }
            
        except Exception as e:
            return {'error': f'Failed to create event: {str(e)}'}
    
    def _update_calendar_event(self, event_id: str, **updates) -> Dict[str, Any]:
        """Update an existing calendar event (mock implementation)"""
        try:
            return {
                'success': True,
                'event_id': event_id,
                'message': f'Updated event {event_id}',
                'updates': updates
            }
            
        except Exception as e:
            return {'error': f'Failed to update event: {str(e)}'}
    
    def _delete_calendar_event(self, event_id: str) -> Dict[str, Any]:
        """Delete a calendar event (mock implementation)"""
        try:
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
                    'below_target': False,
                    'evening_events_count': 2,
                    'morning_events_count': 1
                },
                created_at=datetime.now().isoformat()
            )
            
            # Add to context
            self.context.proposals.append(proposal)
            
            return {
                'success': True,
                'proposal': asdict(proposal),
                'message': f'Generated proposal with {len(changes)} changes to optimize your schedule'
            }
            
        except Exception as e:
            return {'error': f'Failed to generate proposal: {str(e)}'}
    
    def _generate_proposal_changes(self, problem: str, constraints: List[str]) -> List[ChangeItem]:
        """Generate specific changes for a proposal based on problem analysis"""
        changes = []
        
        # Analyze problem and generate appropriate changes
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
                    change_type='add',
                    description='Dedicated focus time for deep work'
                ),
                rationale='Added dedicated focus time to reduce hectic schedule and improve productivity'
            )
            changes.append(change)
        
        if 'sleep' in problem.lower() or 'tired' in problem.lower():
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
                    change_type='move',
                    description='Moved to earlier time for better sleep'
                ),
                target_event_id='existing_evening_event',
                rationale='Moved evening activity earlier to improve sleep schedule and ensure adequate rest'
            )
            changes.append(change)
        
        if 'meeting' in problem.lower() or 'conflict' in problem.lower():
            # Resolve meeting conflicts
            change = ChangeItem(
                id=f"change_{uuid.uuid4().hex[:8]}",
                type='adjust',
                event=CalendarEvent(
                    id=f"event_{uuid.uuid4().hex[:8]}",
                    title='Meeting Adjustment',
                    start='2025-01-15T10:30:00Z',
                    end='2025-01-15T11:30:00Z',
                    duration_minutes=60,
                    source='proposed',
                    change_type='adjust',
                    description='Adjusted time to resolve conflicts'
                ),
                target_event_id='conflicting_meeting',
                rationale='Adjusted meeting time to resolve scheduling conflicts'
            )
            changes.append(change)
        
        # If no specific changes identified, add a general optimization
        if not changes:
            change = ChangeItem(
                id=f"change_{uuid.uuid4().hex[:8]}",
                type='add',
                event=CalendarEvent(
                    id=f"event_{uuid.uuid4().hex[:8]}",
                    title='Optimization Block',
                    start='2025-01-15T14:00:00Z',
                    end='2025-01-15T15:00:00Z',
                    duration_minutes=60,
                    source='proposed',
                    change_type='add',
                    description='General schedule optimization'
                ),
                rationale='Added optimization block to improve overall schedule balance'
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
                            'type': 'time_overlap',
                            'severity': 'high'
                        })
            
            return {
                'success': True,
                'conflicts': conflicts,
                'conflict_count': len(conflicts),
                'message': f'Found {len(conflicts)} scheduling conflicts'
            }
            
        except Exception as e:
            return {'error': f'Failed to analyze conflicts: {str(e)}'}
    
    def _assess_sleep_impact(self, events: List[Dict[str, str]], sleep_target_hours: float) -> Dict[str, Any]:
        """Assess the impact of schedule changes on sleep patterns"""
        try:
            # Analyze events for sleep impact
            evening_events = []
            morning_events = []
            
            for event in events:
                hour = datetime.fromisoformat(event['start'].replace('Z', '+00:00')).hour
                if hour >= 18:  # After 6 PM
                    evening_events.append(event)
                elif hour <= 8:  # Before 8 AM
                    morning_events.append(event)
            
            # Calculate estimated sleep hours
            estimated_sleep_hours = self._calculate_sleep_hours(evening_events, morning_events)
            below_target = estimated_sleep_hours < sleep_target_hours
            
            return {
                'success': True,
                'estimated_sleep_hours': estimated_sleep_hours,
                'below_target': below_target,
                'evening_events_count': len(evening_events),
                'morning_events_count': len(morning_events),
                'message': f'Estimated sleep: {estimated_sleep_hours}h (target: {sleep_target_hours}h)'
            }
            
        except Exception as e:
            return {'error': f'Failed to assess sleep impact: {str(e)}'}
    
    def _events_overlap(self, event1: Dict[str, str], event2: Dict[str, str]) -> bool:
        """Check if two events overlap in time"""
        start1 = datetime.fromisoformat(event1['start'].replace('Z', '+00:00'))
        end1 = datetime.fromisoformat(event1['end'].replace('Z', '+00:00'))
        start2 = datetime.fromisoformat(event2['start'].replace('Z', '+00:00'))
        end2 = datetime.fromisoformat(event2['end'].replace('Z', '+00:00'))
        
        return start1 < end2 and start2 < end1
    
    def _calculate_sleep_hours(self, evening_events: List[Dict], morning_events: List[Dict]) -> float:
        """Calculate estimated sleep hours based on evening and morning events"""
        # Simple heuristic calculation
        late_evening_events = [e for e in evening_events 
                             if datetime.fromisoformat(e['start'].replace('Z', '+00:00')).hour >= 22]
        early_morning_events = [e for e in morning_events 
                              if datetime.fromisoformat(e['start'].replace('Z', '+00:00')).hour <= 7]
        
        if len(late_evening_events) == 0 and len(early_morning_events) == 0:
            return 8.0  # Good sleep
        elif len(late_evening_events) > 0:
            return 6.0  # Reduced sleep due to late events
        else:
            return 7.0  # Moderate sleep
    
    def _generate_function_result_response(self, function_result: Dict[str, Any], user_input: str) -> str:
        """Generate a natural language response based on function execution results"""
        
        if function_result.get('error'):
            return f"I encountered an issue: {function_result['error']}. Please try again or rephrase your request."
        
        # Generate contextual response based on function type
        if 'events' in function_result:
            count = function_result.get('count', 0)
            return f"I found {count} events in your calendar. Let me analyze them to help optimize your schedule."
        
        elif 'proposal' in function_result:
            proposal = function_result['proposal']
            changes_count = len(proposal.get('changes', []))
            return f"I've generated a schedule proposal with {changes_count} optimizations. The proposal includes: {proposal.get('summary', 'schedule improvements')}. Would you like me to explain the changes in detail?"
        
        elif 'conflicts' in function_result:
            conflict_count = function_result.get('conflict_count', 0)
            if conflict_count > 0:
                return f"I found {conflict_count} scheduling conflicts in your calendar. I can help you resolve these conflicts by suggesting alternative times."
            else:
                return "Great news! I didn't find any scheduling conflicts in your calendar."
        
        elif 'sleep' in function_result:
            estimated_hours = function_result.get('estimated_sleep_hours', 0)
            below_target = function_result.get('below_target', False)
            if below_target:
                return f"I notice your current schedule may only allow for about {estimated_hours} hours of sleep, which is below your target. I can suggest changes to improve your sleep schedule."
            else:
                return f"Your current schedule looks good for sleep - I estimate about {estimated_hours} hours, which meets your target."
        
        elif 'event_id' in function_result:
            action = 'created' if 'Created' in str(function_result) else 'updated' if 'Updated' in str(function_result) else 'deleted'
            return f"✅ I've {action} the calendar event successfully. {function_result.get('message', '')}"
        
        # Default response
        return f"I completed the requested action: {function_result.get('message', 'Action completed successfully.')}"
    
    def _is_clarifying_question(self, response: str) -> bool:
        """Determine if the response is a clarifying question"""
        return ('?' in response and 
                len(self.context.user_answers) < len(self.context.clarifying_questions) and
                not response.lower().includes('proposal'))
    
    def _calculate_duration(self, start: str, end: str) -> int:
        """Calculate duration in minutes between two datetime strings"""
        start_dt = datetime.fromisoformat(start.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end.replace('Z', '+00:00'))
        return int((end_dt - start_dt).total_seconds() / 60)
    
    def get_calendar_context(self) -> Dict[str, Any]:
        """Get current calendar conversation context"""
        return {
            'session_id': self.context.session_id,
            'problem_statement': self.context.problem_statement,
            'questions_asked': self.context.clarifying_questions,
            'answers_provided': self.context.user_answers,
            'current_events_count': len(self.context.current_events),
            'proposals_generated': len(self.context.proposals),
            'preferences': self.context.preferences
        }
    
    def clear_calendar_context(self):
        """Clear calendar context and start fresh"""
        self.context = ConversationContext()
        self.base_client.clear_history()
        print("🧹 Calendar conversation context cleared. Ready for a new scheduling discussion.")
    
    def update_preferences(self, preferences: Dict[str, Any]):
        """Update user preferences"""
        self.context.preferences.update(preferences)
        print(f"✅ Updated preferences: {preferences}")


def main():
    """Demo the Enhanced Gemini Calendar Chat"""
    print("🤖 Enhanced Gemini Calendar Chat Demo")
    print("=" * 60)
    print("Features:")
    print("• Natural language calendar assistance")
    print("• Function calling for calendar operations")
    print("• Schedule optimization and conflict detection")
    print("• Sleep impact assessment")
    print("• Conversational back-and-forth dialog")
    print("=" * 60)
    
    try:
        # Initialize the calendar chat assistant
        calendar_chat = GeminiCalendarChat()
        
        print("\n✅ Calendar Chat Assistant ready!")
        print("Type your scheduling concerns and I'll help optimize your calendar.")
        print("Commands: 'quit' to exit, 'clear' to start over, 'context' to see current state\n")
        
        while True:
            user_input = input("You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q', 'bye']:
                print("👋 Goodbye! Your calendar is optimized.")
                break
            elif user_input.lower() in ['clear', 'reset']:
                calendar_chat.clear_calendar_context()
                continue
            elif user_input.lower() in ['context', 'status']:
                context = calendar_chat.get_calendar_context()
                print(f"\n📊 Current Context:")
                print(f"Session: {context['session_id'][:8]}...")
                print(f"Problem: {context['problem_statement'][:50]}..." if context['problem_statement'] else "Problem: None")
                print(f"Questions asked: {len(context['questions_asked'])}")
                print(f"Events loaded: {context['current_events_count']}")
                print(f"Proposals: {context['proposals_generated']}")
                print(f"Preferences: Sleep {context['preferences']['sleep_target_hours']}h\n")
                continue
            
            if not user_input:
                print("Please enter your scheduling concern or question.")
                continue
            
            # Process user input with calendar context
            print("🤖 Calendar Assistant is thinking...")
            response = calendar_chat.chat_with_calendar_context(user_input)
            
            # Display response
            print(f"Assistant: {response}\n")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure your GEMINI_API_KEY is set in the .env file")


if __name__ == "__main__":
    main()
