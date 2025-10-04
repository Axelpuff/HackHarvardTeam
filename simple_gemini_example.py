#!/usr/bin/env python3
"""
Super simple example of using Gemini
"""

import os
import warnings

# Suppress warnings and logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

from gemini_client import GeminiClient

# Initialize Gemini
client = GeminiClient()

# Example 1: Ask a question
question = "What is the capital of France?"
answer = client.simple_prompt(question)
print(f"Question: {question}")
print(f"Answer: {answer}\n")

# Example 2: Get creative
prompt = "Write a short joke about programming"
joke = client.simple_prompt(prompt)
print(f"Prompt: {prompt}")
print(f"Response: {joke}\n")

# Example 3: Explain something
explanation_request = "Explain how photosynthesis works in simple terms"
explanation = client.simple_prompt(explanation_request)
print(f"Request: {explanation_request}")
print(f"Explanation: {explanation}")
