"""Ollama LLM integration for quiz generation. Returns strict JSON."""
import json
import httpx

OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "mistral"


def _normalize(s: str) -> str:
    return " ".join(s.lower().split()) if s else ""


def _answer_derived_from_content(correct_answer: str, content: str) -> bool:
    """Check that correct_answer is derived from user content (substring or significant overlap)."""
    if not correct_answer or not content:
        return False
    ca = _normalize(correct_answer)
    ct = _normalize(content)
    if len(ca) < 3:
        return False
    # Direct substring
    if ca in ct:
        return True
    # Significant token overlap: at least 50% of words in correct_answer appear in content
    ca_words = set(w for w in ca.split() if len(w) > 2)
    ct_words = set(ct.split())
    if not ca_words:
        return True
    overlap = len(ca_words & ct_words) / len(ca_words)
    return overlap >= 0.5


def _build_prompt(content: str) -> str:
    return f"""You are a quiz generator. Given the following study notes, extract knowledge facts and for EACH fact produce exactly one multiple-choice item.

RULES:
- The "correct_answer" MUST be a direct quote or close paraphrase of a phrase that APPEARS in the user's notes. Never invent the correct answer.
- "question" is the question text.
- "distractors" must be exactly 3 plausible wrong answers (array of 3 strings).
- "explanation" is a short explanation (optional but recommended).

Return ONLY valid JSON, no markdown, no extra text. Schema:
{{"facts": [{{"question": "...", "correct_answer": "...", "distractors": ["...", "...", "..."], "explanation": "..."}}]}}

User's study notes:
---
{content[:12000]}
---

JSON:"""


def _fix_json_prompt(raw: str) -> str:
    return """You must fix this JSON so it is valid. Return ONLY the corrected JSON, no other text, no markdown.
The JSON must have this exact structure: {"facts": [{"question": "...", "correct_answer": "...", "distractors": ["...", "...", "..."], "explanation": "..."}]}

Broken JSON:
""" + raw[:8000]


def _call_ollama(prompt: str, system: str | None = None, model: str = DEFAULT_MODEL) -> str:
    """POST to Ollama /api/generate and return full response text."""
    payload = {"model": model, "prompt": prompt, "stream": False}
    if system:
        payload["system"] = system
    with httpx.Client(timeout=120.0) as client:
        r = client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        r.raise_for_status()
        data = r.json()
        return data.get("response", "").strip()


def _parse_facts_response(response_text: str) -> list[dict] | None:
    text = response_text.strip()
    # Remove possible markdown code block
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        data = json.loads(text)
        facts = data.get("facts")
        if isinstance(facts, list):
            return facts
    except json.JSONDecodeError:
        pass
    return None


def generate_quiz_facts(content: str, model: str = DEFAULT_MODEL) -> list[dict]:
    """
    Generate quiz facts from study notes. Only returns facts whose correct_answer
    is derived from the user's content (validated).
    """
    if not content or len(content.strip()) < 20:
        return []

    prompt = _build_prompt(content)
    response_text = _call_ollama(prompt, model=model)
    facts = _parse_facts_response(response_text)

    if facts is None:
        response_text = _call_ollama(_fix_json_prompt(response_text), system="Fix the JSON.", model=model)
        facts = _parse_facts_response(response_text)

    if not facts:
        return []

    validated = []
    for f in facts:
        correct = (f.get("correct_answer") or "").strip()
        if not correct:
            continue
        if not _answer_derived_from_content(correct, content):
            continue
        question = (f.get("question") or "").strip()
        distractors = f.get("distractors")
        if not question or not isinstance(distractors, list) or len(distractors) != 3:
            continue
        validated.append({
            "question": question,
            "correct_answer": correct,
            "distractors": [str(d).strip() for d in distractors[:3]],
            "explanation": (f.get("explanation") or "").strip() or None,
        })
    return validated
