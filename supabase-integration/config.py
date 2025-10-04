import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration class for Supabase integration"""
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY')
    
    # Google Gemini API Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    
    @classmethod
    def validate_supabase_config(cls):
        """Validate that Supabase configuration is present"""
        if not cls.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is required. Please set it in your .env file or environment variables.")
        if not cls.SUPABASE_ANON_KEY:
            raise ValueError("SUPABASE_ANON_KEY is required. Please set it in your .env file or environment variables.")
        return True
    
    @classmethod
    def validate_gemini_config(cls):
        """Validate that Gemini configuration is present"""
        if not cls.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is required. Please set it in your .env file or environment variables.")
        return True
