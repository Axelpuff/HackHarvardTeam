# 🚀 Supabase Integration - Standalone

This is a **completely separate** Supabase integration that doesn't interfere with your main project. Perfect for team collaboration!

## 📁 What's Included

- ✅ **Complete Supabase client** with vector similarity search
- ✅ **Gemini AI embeddings** for semantic search
- ✅ **Database schema** with all tables and RPC functions
- ✅ **AI planning system** with context-aware responses
- ✅ **Test suite** to verify everything works
- ✅ **Sample data** for testing

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd supabase-integration
pip install -r requirements.txt
```

### 2. Set Up Environment
Copy `env_example.txt` to `.env` and add your API keys:
```bash
# Copy the example file
cp env_example.txt .env

# Edit .env with your actual keys
```

### 3. Set Up Supabase Database
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the entire contents of `database_schema.sql`
4. Click "Run" to create all tables and functions

### 4. Test the Integration
```bash
python test_integration.py
```

### 5. Run the AI Planning System
```bash
python ai_planning_system.py
```

## 🎯 Features

### Vector Similarity Search
- **Semantic matching** of user requests
- **Context-aware** plan generation
- **Learning from past interactions**

### Database Operations
- **Store and retrieve** planning snippets
- **User routine tracking** with time windows
- **Past interaction learning**
- **Coaching reflections**

### AI Integration
- **Gemini-powered embeddings** (768-dimensional)
- **Intelligent plan matching**
- **Context-aware responses**

## 📊 Database Schema

### Tables
- **`gc_events`** - Calendar events (read-only)
- **`utterances`** - User transcripts with embeddings
- **`routines`** - User habitual patterns
- **`snippets`** - Reusable plan atoms
- **`reflections`** - Coaching memory

### RPC Functions
- **`is_light_next_24h()`** - Check schedule load
- **`match_snippets()`** - Find similar plan snippets
- **`match_routines()`** - Find user routines
- **`match_utterances()`** - Find similar past requests

## 🔧 Usage Examples

### Basic Planning Workflow
```python
from ai_planning_system import AIPlanningSystem
import asyncio

async def main():
    system = AIPlanningSystem()
    result = await system.run_planning_workflow("I need to focus on coding today")
    print(result['ai_response'])

asyncio.run(main())
```

### Direct Database Operations
```python
from supabase_client import SupabaseClient
from embedding_service import EmbeddingService

# Initialize services
client = SupabaseClient()
service = EmbeddingService()

# Generate embedding
embedding = service.get_embedding("your text here")

# Find similar content
snippets = await client.match_snippets(embedding, k=3)
```

## 🛡️ Security

- **Row Level Security (RLS)** enabled on all tables
- **User-specific data** isolation
- **Global snippets** for shared knowledge
- **Proper authentication** required

## 📈 Performance

- **HNSW indexes** for fast vector similarity search
- **GIN indexes** for tag filtering
- **Optimized queries** for sub-second responses
- **Batch operations** for efficiency

## 🔍 Testing

Run the comprehensive test suite:
```bash
python test_integration.py
```

Tests include:
- ✅ Configuration validation
- ✅ Supabase connection
- ✅ Embedding generation
- ✅ Database operations

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `supabase_client.py` | Database operations |
| `embedding_service.py` | AI embeddings |
| `ai_planning_system.py` | Main system |
| `database_schema.sql` | Database setup |
| `test_integration.py` | Test suite |
| `config.py` | Configuration |
| `requirements.txt` | Dependencies |

## 🎉 Ready to Use!

This integration is **completely standalone** and won't interfere with your main project. Perfect for:

- ✅ **Team collaboration** - everyone can work independently
- ✅ **Testing** - try new features without risk
- ✅ **Development** - iterate quickly
- ✅ **Production** - deploy when ready

## 🚀 Next Steps

1. **Set up your Supabase project**
2. **Add your API keys**
3. **Run the database schema**
4. **Test the integration**
5. **Start building amazing AI features!**

Happy coding! 🎉
