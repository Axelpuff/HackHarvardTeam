import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;
    const voiceId = body?.voiceId || 'JBFqnCBsd6RMkjVDRZzb';
    const modelId = body?.modelId || 'eleven_multilingual_v2';

    if (!text) {
      return new Response('Missing text in request body', { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response('Server missing ELEVENLABS_API_KEY', { status: 500 });
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    const elevenRes = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        output_format: 'mp3_44100_128',
      }),
    });

    if (!elevenRes.ok) {
      const errTxt = await elevenRes.text();
      return new Response(errTxt, { status: 502 });
    }

    // Stream the audio response back to the client
    const contentType = elevenRes.headers.get('content-type') || 'audio/mpeg';
    return new Response(elevenRes.body, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch (err: any) {
    return new Response(String(err?.message || err), { status: 500 });
  }
}
