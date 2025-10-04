# 11Labs Speech-to-Text API - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
python minimal_setup.py
```

### Step 2: Add Your API Key

Edit the `.env` file and replace `your_api_key_here` with your actual 11Labs API key:

```
ELEVENLABS_API_KEY=your_actual_api_key_here
```

### Step 3: Test the Installation

```bash
python simple_client.py
```

## 📝 Basic Usage

```python
from simple_client import SimpleElevenLabsClient

# Initialize the client
client = SimpleElevenLabsClient()

# Transcribe an audio file
result = client.speech_to_text("your_audio_file.mp3")

if result["success"]:
    print(f"Text: {result['text']}")
    print(f"Language: {result['language']}")
    print(f"Timestamps: {result['timestamps']}")
    print(f"Speakers: {result['speakers']}")
else:
    print(f"Error: {result['error']}")
```

## 🎯 Key Features

- **Latest 11Labs Scribe v1 Model**: State-of-the-art speech recognition
- **99 Languages**: Accurate transcription in 99 languages
- **Word-level Timestamps**: Precise timing for each word
- **Speaker Diarization**: Automatic speaker identification
- **Dynamic Audio Tagging**: Automatic content type detection

## 📁 Project Structure

```
HackHarvardTeam/
├── simple_client.py          # Minimal working client
├── minimal_setup.py          # Simple installation script
├── .env                      # Your API key (created automatically)
├── requirements.txt          # Full dependencies
├── elevenlabs_client.py     # Full-featured client
├── speech_to_text_service.py # High-level service wrapper
├── example_usage.py          # Usage examples
└── README.md                # Complete documentation
```

## 🔧 Troubleshooting

### Windows Long Path Issues

If you encounter path length errors, use the minimal setup:

```bash
python minimal_setup.py
```

### Missing Dependencies

If some packages fail to install, the minimal setup will still work with just `requests` and `python-dotenv`.

### API Key Issues

Make sure your API key is correctly set in the `.env` file and that you have an active 11Labs account.

## 📚 Next Steps

1. **Get your API key** from [11Labs](https://elevenlabs.io/)
2. **Add audio files** to test transcription
3. **Explore advanced features** like batch processing and speaker diarization
4. **Check the full documentation** in `README.md`

## 🆘 Need Help?

- Check the full `README.md` for detailed documentation
- Review `example_usage.py` for more usage examples
- Ensure your audio files are in supported formats (MP3, WAV, M4A, etc.)
