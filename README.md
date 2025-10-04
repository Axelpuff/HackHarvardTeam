# 11Labs Speech-to-Text API Integration

This project provides a comprehensive integration with the 11Labs Speech-to-Text API using their latest **Scribe v1** model, offering easy-to-use Python classes for converting audio files to text.

## Features

- **Latest 11Labs Scribe v1**: State-of-the-art speech recognition model
- **99 Languages Supported**: Accurate transcription in 99 languages
- **Word-level Timestamps**: Precise word-level timestamps for each transcription
- **Speaker Diarization**: Automatic speaker identification and separation
- **Dynamic Audio Tagging**: Automatic detection of audio content types
- **Easy Integration**: Simple Python classes for speech-to-text operations
- **Batch Processing**: Transcribe multiple audio files at once
- **Error Handling**: Robust error handling and logging
- **Configurable**: Flexible configuration options
- **Multiple Formats**: Support for various audio formats (MP3, WAV, M4A, etc.)

## Setup

### 1. Install Dependencies

**Option A: Minimal Installation (Recommended for Windows)**

```bash
python minimal_setup.py
```

**Option B: Full Installation (if you have Windows Long Path support enabled)**

```bash
python install_simple.py
```

**Option C: Manual Installation**

```bash
pip install -r requirements.txt
```

**Note**: The minimal setup avoids Windows Long Path issues and provides a working solution. The full setup includes more features but may require Windows Long Path support to be enabled.

### 2. Configure API Key

The setup script will create a `.env` file automatically. Edit it and add your API key:

```bash
ELEVENLABS_API_KEY=your_actual_api_key_here
```

Get your API key from [11Labs](https://elevenlabs.io/).

### 3. Verify Installation

**For Minimal Setup:**

```bash
python simple_client.py
```

**For Full Setup:**

```bash
python example_usage.py
```

## Usage

### Basic Usage

**Minimal Setup (Recommended):**

```python
from simple_client import SimpleElevenLabsClient

# Initialize the client
client = SimpleElevenLabsClient()

# Transcribe a single audio file
result = client.speech_to_text("path/to/your/audio.mp3")

if result["success"]:
    print(f"Transcribed text: {result['text']}")
    print(f"Language: {result['language']}")
    print(f"Timestamps: {result['timestamps']}")
    print(f"Speakers: {result['speakers']}")
else:
    print(f"Error: {result['error']}")
```

**Full Setup:**

```python
from speech_to_text_service import SpeechToTextService

# Initialize the service
stt_service = SpeechToTextService()

# Transcribe a single audio file
result = stt_service.transcribe_audio("path/to/your/audio.mp3")

if result["success"]:
    print(f"Transcribed text: {result['text']}")
else:
    print(f"Error: {result['error']}")
```

### Batch Processing

```python
# Transcribe multiple files
audio_files = ["audio1.mp3", "audio2.wav", "audio3.m4a"]
results = stt_service.transcribe_multiple_files(audio_files)

print(f"Processed {results['total_files']} files")
print(f"Successful: {results['successful_transcriptions']}")
print(f"Failed: {results['failed_transcriptions']}")
```

### Advanced Usage

```python
# Use specific model
result = stt_service.transcribe_audio("audio.mp3", model="whisper-1")

# Get service information
info = stt_service.get_service_info()
print(f"Available models: {info['models']}")
print(f"Usage info: {info['usage']}")
```

## API Reference

### SpeechToTextService

Main service class for speech-to-text operations.

#### Methods

- `transcribe_audio(audio_file_path, model=None)`: Transcribe a single audio file
- `transcribe_multiple_files(audio_files, model=None)`: Transcribe multiple audio files
- `get_service_info()`: Get service and model information

### ElevenLabsClient

Low-level client for 11Labs API interactions.

#### Methods

- `speech_to_text(audio_file_path, model)`: Direct API call for speech-to-text
- `get_available_models()`: Get list of available models
- `get_usage_info()`: Get API usage statistics

## Configuration

The `config.py` file contains all configuration options:

```python
class Config:
    ELEVENLABS_API_KEY = "your_api_key"
    ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
    AUDIO_FORMAT = "mp3"
    AUDIO_QUALITY = "high"
    STT_MODEL = "whisper-1"
```

## Supported Audio Formats

- MP3
- WAV
- M4A
- FLAC
- OGG
- And more (check 11Labs documentation)

## Error Handling

The service includes comprehensive error handling:

- File not found errors
- API authentication errors
- Network connectivity issues
- Invalid audio format errors

All methods return dictionaries with `success` boolean and appropriate error messages.

## Logging

The service includes built-in logging. To enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Examples

See `example_usage.py` for complete working examples.

## Requirements

- Python 3.7+
- 11Labs API key
- Internet connection for API calls

## Dependencies

- `elevenlabs`: Official 11Labs Python SDK
- `requests`: HTTP library for API calls
- `python-dotenv`: Environment variable management
- `pydub`: Audio processing
- `soundfile`: Audio file I/O
- `numpy`: Numerical operations

## License

This project is open source. Please check 11Labs terms of service for API usage.
