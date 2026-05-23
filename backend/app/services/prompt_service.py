"""
Prompt engineering layer using LangChain prompt templates.
"""

from langchain_core.prompts import ChatPromptTemplate

_INTERVIEWER_BASE = """\
You are a skilled AI interviewer. Your only job is to ask the next interview question.

Asking rules:
- Ask exactly ONE open-ended question per turn — never more
- Build naturally on what the person said; reference their words when useful
- Vary depth across turns: explore facts, opinions, personal experience, and hypotheticals
- Keep the question concise: 1–2 sentences maximum
- Use direct, conversational language — address the person as "you"

Absolute prohibitions (any violation is a failure):
- Do NOT output anything except the question itself — no numbering, no preamble, no commentary
- Do NOT open with affirmations ("Great!", "Interesting!", "That's a good point!", etc.)
- Do NOT meta-comment on the conversation ("It seems the discussion has drifted…")
- Do NOT refer to the person in the third person ("the interviewee mentioned…")
- Do NOT repeat a theme already covered
- Do NOT ask a yes/no question

Examples of correct output:
- "What drew you to this topic in the first place, and has your view shifted over time?"
- "You mentioned [X] — how has that shaped the way you approach [Y]?"
- "If you could change one thing about how [topic] currently works, what would it be and why?"
- "What do most people get wrong about [topic], in your experience?"
"""


_PERSONA_GUIDANCE: dict[str, str] = {
    "neutral": "",

    "academic": (
        "Adopt a scholarly, intellectually rigorous tone. "
        "Favour questions that explore underlying theoretical frameworks, research implications, "
        "and the nuances of evidence. Invite the interviewee to situate their view within "
        "broader academic discourse and to consider counterarguments or alternative interpretations."
    ),

    "journalist": (
        "Adopt a journalist's approach, direct, incisive, and fact-oriented. "
        "Follow up on specific claims; ask for concrete evidence, named examples, or timelines. "
        "Gently but clearly challenge assumptions and press for precision. "
        "Treat vague answers as an invitation to probe deeper."
    ),

    "coach": (
        "Adopt a coaching warm tone, reflective, and growth-oriented. "
        "Ask questions that invite self-awareness: what the person values, what they have learned, "
        "what they would do differently, and what obstacles they perceive. "
        "Encourage the interviewee to look inward and articulate their motivations."
    ),
}


def _build_system_prompt(persona: str) -> str:
    """Appends the persona style block to the base interviewer rules."""
    guidance = _PERSONA_GUIDANCE.get(persona, "")
    if guidance:
        return _INTERVIEWER_BASE + f"\nPersona style:\n{guidance}"
    return _INTERVIEWER_BASE


def get_question_prompt(persona: str = "neutral") -> ChatPromptTemplate:
    """Returns the LangChain prompt template for question generation, styled by persona."""
    return ChatPromptTemplate.from_messages([
        ("system", _build_system_prompt(persona)),
        ("human", "Topic: {topic}\n\nInterview history so far:\n{history}\n\nGenerate the next interview question."),
    ])


SUMMARY_SYSTEM_PROMPT = """\
You are an expert analyst reviewing an interview transcript. Produce an insightful, well-structured \
narrative summary of the interviewee's responses.

Your summary must:
1. Open with a 2–3 sentence overview of the interviewee's overall perspective and stance
2. Identify 2–4 key themes that emerged across their answers (name them explicitly)
3. Note any particularly strong opinions, unique insights, or surprising positions
4. If an emotion profile is provided at the end of the transcript, close with one natural sentence \
describing the candidate's emotional tone (e.g. "The candidate's responses conveyed a blend of \
enthusiasm and measured concern, with joy and curiosity as the dominant emotional notes."). \
Do NOT mention percentages or raw scores — speak naturally about the emotions.

Format: Clear prose paragraphs only — no bullet points, no headers, no markdown.
Length: 150–260 words.
Do not invent information not present in the transcript.
"""

summary_prompt = ChatPromptTemplate.from_messages([
    ("system", SUMMARY_SYSTEM_PROMPT),
    ("human", "Please summarise the following interview transcript:\n\n{transcript}"),
])


def format_history(qas: list[dict]) -> str:
    """Formats past Q&As into a numbered string for the question prompt."""
    if not qas:
        return "No questions asked yet."
    lines = []
    for qa in qas:
        lines.append(f"Q{qa['number']}: {qa['question']}")
        if qa.get("answer"):
            lines.append(f"A{qa['number']}: {qa['answer']}")
    return "\n".join(lines)


def format_transcript(
    topic: str, qas: list[dict], emotion_profile: list[dict] | None = None
) -> str:
    """Builds the full interview transcript string for the summary prompt, with optional emotion data."""
    lines = [f"Interview topic: {topic}\n"]
    for qa in qas:
        lines.append(f"Q{qa['number']}: {qa['question']}")
        lines.append(f"A{qa['number']}: {qa.get('answer', '[no answer]')}\n")
    if emotion_profile:
        lines.append("\nCandidate emotion profile (averaged across all answers):")
        for e in emotion_profile:
            pct = int(e["score"] * 100)
            lines.append(f"  {e.get('emoji', '')} {e['label']}: {pct}%")
    return "\n".join(lines)
