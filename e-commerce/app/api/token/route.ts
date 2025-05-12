import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

// Do not cache endpoint result
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");

  if (!room || !username) {
    return NextResponse.json(
      { error: "Missing required query parameters" },
      { status: 400 }
    );
  }

  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitWsUrl = process.env.LIVEKIT_URL;

  const openaiApiKey = process.env.OPENAI_API_KEY;
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  const cartesiaApiKey = process.env.CARTESIA_API_KEY;

  if (!livekitApiKey || !livekitApiSecret || !livekitWsUrl) {
    return NextResponse.json(
      { error: "LiveKit misconfigured" },
      { status: 500 }
    );
  }

  if (!openaiApiKey || !deepgramApiKey || !cartesiaApiKey) {
    return NextResponse.json(
      { error: "AI providers misconfigured" },
      { status: 500 }
    );
  }

  // Example: create a LiveKit access token
  const at = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: username,
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  // OPTIONAL: make test calls to Deepgram, OpenAI, or Cartesia
  // For example, sending a prompt to OpenAI (commented out)
  /*
  const completion = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Hello!' }],
    },
    {
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
    }
  );
  */

  return NextResponse.json(
    {
      token: await at.toJwt(),
      // Optionally return LLM/STT/TTS status
      // openaiReply: completion?.data?.choices?.[0]?.message?.content,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
