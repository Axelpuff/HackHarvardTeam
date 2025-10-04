import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for API settings"""
    
    # 11Labs API Configuration
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
    
    # Google Gemini API Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    # Audio settings
    AUDIO_FORMAT = "mp3"
    AUDIO_QUALITY = "high"
    
    # Speech-to-Text settings
    STT_MODEL = "scribe_v1"  # Default model for speech recognition (11Labs Scribe v1)
    
    @classmethod
    def validate_config(cls):
        """Validate that required configuration is present"""
        if not cls.ELEVENLABS_API_KEY:
            raise ValueError("ELEVENLABS_API_KEY is required. Please set it in your .env file or environment variables.")
        return True
    
    @classmethod
    def validate_gemini_config(cls):
        """Validate that Gemini configuration is present"""
        if not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required. Please set it in your .env file or environment variables.")
        return True
