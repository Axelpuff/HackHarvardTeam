-- Supabase Database Schema for AI Planning System
-- This file contains the complete database schema and RPC functions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables

-- Calendar events (read-only mirror)
CREATE TABLE IF NOT EXISTS gc_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User utterances with embeddings
CREATE TABLE IF NOT EXISTS utterances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    transcript TEXT NOT NULL,
    intent TEXT,
    embedding VECTOR(768),
    accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User routines with time windows
CREATE TABLE IF NOT EXISTS routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pattern TEXT NOT NULL,
    time_window JSONB, -- {start: "09:00", end: "17:00", fuzz_min: 30}
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reusable plan snippets
CREATE TABLE IF NOT EXISTS snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- NULL for global snippets
    content TEXT NOT NULL,
    tags TEXT[], -- Array of tags for filtering
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coaching reflections
CREATE TABLE IF NOT EXISTS reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for vector similarity search
CREATE INDEX IF NOT EXISTS utterances_embedding_idx ON utterances USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS routines_embedding_idx ON routines USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS snippets_embedding_idx ON snippets USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS reflections_embedding_idx ON reflections USING hnsw (embedding vector_cosine_ops);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS snippets_tags_idx ON snippets USING GIN (tags);
CREATE INDEX IF NOT EXISTS snippets_user_id_idx ON snippets (user_id);
CREATE INDEX IF NOT EXISTS routines_user_id_idx ON routines (user_id);
CREATE INDEX IF NOT EXISTS utterances_user_id_idx ON utterances (user_id);
CREATE INDEX IF NOT EXISTS reflections_user_id_idx ON reflections (user_id);

-- Create indexes for time-based queries
CREATE INDEX IF NOT EXISTS gc_events_start_time_idx ON gc_events (start_time);
CREATE INDEX IF NOT EXISTS gc_events_end_time_idx ON gc_events (end_time);

-- RPC Functions

-- Check if next 24 hours have light schedule (<2h busy)
CREATE OR REPLACE FUNCTION is_light_next_24h()
RETURNS BOOLEAN AS $$
DECLARE
    total_busy_minutes INTEGER;
BEGIN
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)::INTEGER
    INTO total_busy_minutes
    FROM gc_events
    WHERE start_time >= NOW()
    AND start_time <= NOW() + INTERVAL '24 hours';
    
    RETURN total_busy_minutes < 120; -- Less than 2 hours
END;
$$ LANGUAGE plpgsql;

-- Match snippets by embedding similarity
CREATE OR REPLACE FUNCTION match_snippets(
    query_embedding VECTOR(768),
    k INTEGER DEFAULT 3,
    filter_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.content,
        s.tags,
        1 - (s.embedding <=> query_embedding) AS similarity
    FROM snippets s
    WHERE (filter_tags IS NULL OR s.tags && filter_tags)
    AND (s.user_id IS NULL OR s.user_id = auth.uid())
    ORDER BY s.embedding <=> query_embedding
    LIMIT k;
END;
$$ LANGUAGE plpgsql;

-- Match routines by embedding similarity
CREATE OR REPLACE FUNCTION match_routines(
    query_embedding VECTOR(768),
    k INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    pattern TEXT,
    time_window JSONB,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.pattern,
        r.time_window,
        1 - (r.embedding <=> query_embedding) AS similarity
    FROM routines r
    WHERE r.user_id = auth.uid()
    ORDER BY r.embedding <=> query_embedding
    LIMIT k;
END;
$$ LANGUAGE plpgsql;

-- Match utterances by embedding similarity
CREATE OR REPLACE FUNCTION match_utterances(
    query_embedding VECTOR(768),
    k INTEGER DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    transcript TEXT,
    intent TEXT,
    accepted BOOLEAN,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.transcript,
        u.intent,
        u.accepted,
        1 - (u.embedding <=> query_embedding) AS similarity
    FROM utterances u
    WHERE u.user_id = auth.uid()
    ORDER BY u.embedding <=> query_embedding
    LIMIT k;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;

-- Utterances: Users can only access their own utterances
CREATE POLICY "Users can access own utterances" ON utterances
    FOR ALL USING (auth.uid() = user_id);

-- Routines: Users can only access their own routines
CREATE POLICY "Users can access own routines" ON routines
    FOR ALL USING (auth.uid() = user_id);

-- Snippets: Users can read global snippets (user_id IS NULL) and their own snippets
CREATE POLICY "Users can access global and own snippets" ON snippets
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own snippets" ON snippets
    FOR ALL USING (auth.uid() = user_id);

-- Reflections: Users can only access their own reflections
CREATE POLICY "Users can access own reflections" ON reflections
    FOR ALL USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
