import asyncio

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (Agent, AgentSession, AutoSubscribe, JobContext,
                            WorkerOptions, cli, llm)
from livekit.plugins import openai, silero

load_dotenv()

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are a helpful voice AI assistant.")

async def entrypoint(ctx: agents.JobContext):
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
    )
    await session.start(
        room=ctx.room,
        agent=Assistant(),
    )

    await asyncio.sleep(1)
    await session.say("Hey, how can I help you?", allow_interrupt=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
