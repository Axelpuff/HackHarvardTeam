#!/usr/bin/env python3
"""
Example usage of the 11Labs Speech-to-Text API
"""

import os
import sys
from speech_to_text_service import SpeechToTextService
from gemini_client import GeminiClient
from config import Config

def main():
    """Main function demonstrating API usage"""
    
    print("=== 11Labs Speech-to-Text API + Gemini AI Example ===\n")
    
    try:
        # Initialize the services
        print("Initializing Speech-to-Text service...")
        stt_service = SpeechToTextService()
        print("✓ Speech-to-Text service initialized successfully")
        
        print("Initializing Gemini AI service...")
        gemini_client = GeminiClient()
        print("✓ Gemini AI service initialized successfully\n")
        
        # Get service information
        print("Getting service information...")
        service_info = stt_service.get_service_info()
        print(f"✓ Service: {service_info.get('service', 'Unknown')}")
        print(f"✓ Default model: {service_info.get('config', {}).get('default_model', 'Unknown')}")
        print()
        
        # Example 1: Single file transcription
        print("=== Example 1: Single File Transcription ===")
        audio_file = "sample_audio.mp3"  # Replace with your audio file path
        
        if os.path.exists(audio_file):
            print(f"Transcribing: {audio_file}")
            result = stt_service.transcribe_audio(audio_file)
            
            if result.get("success", False):
                print(f"✓ Transcription successful!")
                print(f"Text: {result.get('text', '')}")
                print(f"Model: {result.get('model', 'Unknown')}")
                print(f"Language: {result.get('language', 'Unknown')}")
                if 'confidence' in result:
                    print(f"Confidence: {result['confidence']:.2f}")
            else:
                print(f"✗ Transcription failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"⚠ Audio file not found: {audio_file}")
            print("Please provide a valid audio file path to test transcription.")
        
        print()
        
        # Example 2: Multiple files transcription
        print("=== Example 2: Multiple Files Transcription ===")
        audio_files = [
            "audio1.mp3",
            "audio2.wav",
            "audio3.m4a"
        ]
        
        # Filter existing files
        existing_files = [f for f in audio_files if os.path.exists(f)]
        
        if existing_files:
            print(f"Transcribing {len(existing_files)} files...")
            batch_result = stt_service.transcribe_multiple_files(existing_files)
            
            print(f"✓ Batch processing completed!")
            print(f"Total files: {batch_result['total_files']}")
            print(f"Successful: {batch_result['successful_transcriptions']}")
            print(f"Failed: {batch_result['failed_transcriptions']}")
            
            # Display results for each file
            for i, result in enumerate(batch_result['results']):
                print(f"\nFile {i+1}: {result['file_path']}")
                if result.get('success', False):
                    print(f"  ✓ Text: {result.get('text', '')[:100]}...")
                else:
                    print(f"  ✗ Error: {result.get('error', 'Unknown error')}")
        else:
            print("⚠ No audio files found for batch processing.")
            print("Please add some audio files to test batch transcription.")
        
        # Example 3: Gemini AI Text Processing
        print("=== Example 3: Gemini AI Text Processing ===")
        
        # Interactive Gemini demo
        print("Let's test Gemini AI! (Type 'quit' to exit)")
        while True:
            user_input = input("\nEnter your prompt for Gemini: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
                
            if user_input:
                try:
                    print("Processing with Gemini AI...")
                    response = gemini_client.simple_prompt(user_input)
                    print(f"\nGemini Response:\n{response}")
                except Exception as e:
                    print(f"✗ Gemini error: {e}")
            else:
                print("Please enter a valid prompt.")
        
        # Example with predefined prompts
        print("\n=== Example 4: Predefined Gemini Prompts ===")
        sample_prompts = [
            "Explain quantum computing in simple terms",
            "Write a short poem about artificial intelligence",
            "What are the benefits of renewable energy?"
        ]
        
        for i, prompt in enumerate(sample_prompts, 1):
            print(f"\nSample {i}: {prompt}")
            try:
                response = gemini_client.simple_prompt(prompt)
                print(f"Response: {response[:200]}{'...' if len(response) > 200 else ''}")
            except Exception as e:
                print(f"✗ Error: {e}")
        
        print("\n=== Example completed ===")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("\nPlease make sure you have:")
        print("1. Set your ELEVENLABS_API_KEY and GEMINI_API_KEY in a .env file or environment variables")
        print("2. Installed required dependencies: pip install -r requirements.txt")
        print("3. Valid audio files to transcribe")
        sys.exit(1)

if __name__ == "__main__":
    main()
