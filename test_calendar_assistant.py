#!/usr/bin/env python3
"""
Test script for the Gemini Calendar Assistant
Demonstrates the functionality without requiring API keys
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Mock the required imports for testing
class MockGeminiClient:
    def __init__(self):
        self.conversation_history = []
    
    def simple_prompt(self, user_input: str) -> str:
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Mock responses based on input
        if "hectic" in user_input.lower():
            response = "I understand you're feeling overwhelmed with your schedule. Let me ask a few questions to help optimize it: What specific aspects of your schedule feel most problematic? Are there particular days or times that are especially challenging?"
        elif "sleep" in user_input.lower():
            response = "Sleep is crucial for productivity. What time do you currently go to bed, and what's your ideal bedtime? Also, do you have any evening commitments that might be affecting your sleep schedule?"
        elif "?" in user_input:
            response = "Thank you for that information. Based on your answers, I can generate a schedule proposal. Would you like me to create an optimized schedule that addresses your concerns?"
        else:
            response = "I'd be happy to help optimize your calendar! Could you tell me what specific scheduling challenges you're facing?"
        
        self.conversation_history.append({"role": "assistant", "content": response})
        return response
    
    def clear_history(self):
        self.conversation_history = []

class MockCalendarEvent:
    def __init__(self, title, start, end, duration_minutes=60):
        self.id = f"event_{hash(title) % 10000}"
        self.title = title
        self.start = start
        self.end = end
        self.duration_minutes = duration_minutes
        self.source = 'current'
        self.change_type = 'none'

class MockCalendarAssistant:
    """Mock implementation of the calendar assistant for testing"""
    
    def __init__(self):
        self.base_client = MockGeminiClient()
        self.context = {
            'problem_statement': '',
            'clarifying_questions': [],
            'user_answers': [],
            'current_events': [],
            'proposals': [],
            'preferences': {
                'sleep_target_hours': 7,
                'priorities': ['sleep', 'focus'],
                'protected_windows': [],
                'iteration_count': 0
            },
            'session_id': 'test_session_123'
        }
        
        print("✅ Mock Calendar Assistant initialized for testing!")
    
    def process_user_input(self, user_input: str) -> Dict[str, Any]:
        """Process user input and return structured response"""
        
        # Store problem statement if first input
        if not self.context['problem_statement']:
            self.context['problem_statement'] = user_input
        
        # Get response from mock client
        response = self.base_client.simple_prompt(user_input)
        
        # Determine response type
        if '?' in response and len(self.context['user_answers']) < len(self.context['clarifying_questions']):
            # This is a clarifying question
            self.context['clarifying_questions'].append(response)
            return {
                'type': 'clarifying_question',
                'message': response,
                'question': response
            }
        elif len(self.context['clarifying_questions']) > len(self.context['user_answers']):
            # This is an answer to a clarifying question
            self.context['user_answers'].append(user_input)
            return {
                'type': 'answer_received',
                'message': response,
                'answer': user_input
            }
        elif 'proposal' in response.lower():
            # Generate a mock proposal
            proposal = self.generate_mock_proposal()
            return {
                'type': 'proposal',
                'message': response,
                'proposal': proposal
            }
        else:
            return {
                'type': 'response',
                'message': response
            }
    
    def generate_mock_proposal(self) -> Dict[str, Any]:
        """Generate a mock schedule proposal"""
        proposal = {
            'id': 'proposal_123',
            'revision': 1,
            'changes': [
                {
                    'id': 'change_1',
                    'type': 'add',
                    'event': {
                        'title': 'Focus Time',
                        'start': '2025-01-15T09:00:00Z',
                        'end': '2025-01-15T11:00:00Z',
                        'duration_minutes': 120
                    },
                    'rationale': 'Added dedicated focus time to reduce hectic schedule',
                    'accepted': 'pending'
                },
                {
                    'id': 'change_2',
                    'type': 'move',
                    'event': {
                        'title': 'Evening Activity',
                        'start': '2025-01-15T18:00:00Z',
                        'end': '2025-01-15T19:00:00Z',
                        'duration_minutes': 60
                    },
                    'target_event_id': 'existing_evening_event',
                    'rationale': 'Moved evening activity earlier for better sleep',
                    'accepted': 'pending'
                }
            ],
            'summary': 'Schedule optimization with focus time and sleep improvement',
            'sleep_assessment': {
                'estimated_sleep_hours': 7.5,
                'below_target': False
            },
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
        
        self.context['proposals'].append(proposal)
        return proposal
    
    def get_context(self) -> Dict[str, Any]:
        """Get current conversation context"""
        return {
            'session_id': self.context['session_id'],
            'problem_statement': self.context['problem_statement'],
            'questions_asked': len(self.context['clarifying_questions']),
            'answers_provided': len(self.context['user_answers']),
            'proposals_generated': len(self.context['proposals']),
            'preferences': self.context['preferences']
        }
    
    def clear_context(self):
        """Clear conversation context"""
        self.context = {
            'problem_statement': '',
            'clarifying_questions': [],
            'user_answers': [],
            'current_events': [],
            'proposals': [],
            'preferences': {
                'sleep_target_hours': 7,
                'priorities': ['sleep', 'focus'],
                'protected_windows': [],
                'iteration_count': 0
            },
            'session_id': 'test_session_123'
        }
        self.base_client.clear_history()
        print("🧹 Context cleared!")

def demo_calendar_assistant():
    """Demo the calendar assistant functionality"""
    print("🤖 Gemini Calendar Assistant Demo")
    print("=" * 50)
    print("This demo shows the calendar assistant functionality")
    print("without requiring actual API keys.")
    print("=" * 50)
    
    assistant = MockCalendarAssistant()
    
    # Demo conversation flow
    demo_inputs = [
        "My Tuesdays are too hectic",
        "I have too many meetings back-to-back and no time for focused work",
        "I want more focus time and earlier dinner",
        "Can you create a proposal for me?"
    ]
    
    print("\n📝 Demo Conversation Flow:")
    print("-" * 30)
    
    for i, user_input in enumerate(demo_inputs, 1):
        print(f"\n{i}. User: {user_input}")
        
        result = assistant.process_user_input(user_input)
        
        print(f"   Assistant: {result['message']}")
        
        if result['type'] == 'proposal':
            proposal = result['proposal']
            print(f"   📅 Generated Proposal:")
            print(f"      Summary: {proposal['summary']}")
            print(f"      Changes: {len(proposal['changes'])}")
            print(f"      Sleep Assessment: {proposal['sleep_assessment']['estimated_sleep_hours']}h")
            
            for j, change in enumerate(proposal['changes'], 1):
                print(f"         {j}. {change['type'].title()}: {change['event']['title']}")
                print(f"            Rationale: {change['rationale']}")
    
    print("\n📊 Final Context:")
    context = assistant.get_context()
    print(f"   Problem: {context['problem_statement'][:50]}...")
    print(f"   Questions asked: {context['questions_asked']}")
    print(f"   Answers provided: {context['answers_provided']}")
    print(f"   Proposals generated: {context['proposals_generated']}")
    
    print("\n✅ Demo completed successfully!")
    print("\nThe calendar assistant demonstrates:")
    print("• Natural language understanding of scheduling problems")
    print("• Clarifying question generation")
    print("• Schedule proposal generation with rationale")
    print("• Sleep impact assessment")
    print("• Conversational context maintenance")

def interactive_demo():
    """Interactive demo mode"""
    print("\n🎮 Interactive Demo Mode")
    print("Type 'quit' to exit, 'clear' to reset, 'context' to see state")
    print("-" * 50)
    
    assistant = MockCalendarAssistant()
    
    while True:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        elif user_input.lower() in ['clear', 'reset']:
            assistant.clear_context()
            continue
        elif user_input.lower() in ['context', 'status']:
            context = assistant.get_context()
            print(f"\n📊 Context:")
            print(f"   Problem: {context['problem_statement'] or 'None'}")
            print(f"   Questions: {context['questions_asked']}")
            print(f"   Answers: {context['answers_provided']}")
            print(f"   Proposals: {context['proposals_generated']}")
            continue
        
        if not user_input:
            continue
        
        result = assistant.process_user_input(user_input)
        print(f"Assistant: {result['message']}")
        
        if result['type'] == 'proposal':
            proposal = result['proposal']
            print(f"\n📅 Proposal Details:")
            print(f"   {proposal['summary']}")
            print(f"   {len(proposal['changes'])} changes proposed")

def main():
    """Main function"""
    print("Running automated demo...")
    demo_calendar_assistant()

if __name__ == "__main__":
    main()
