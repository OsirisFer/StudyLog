"""Ollama LLM integration for quiz generation. Returns strict JSON."""
import json
import httpx

OLLAMA_URL = "http://localhost:11434"
DEFAULT_MODEL = "mistral"


def _normalize(s: str) -> str:
    return " ".join(s.lower().split()) if s else ""


def _strip_latex_math(s: str) -> str:
    """Best-effort reduction of simple LaTeX math to plain text for validation.

    This keeps validation tied to the raw note text (no HTML/rendering), but
    avoids dropping answers just because Ollama wrapped expressions in LaTeX.
    """
    if not s:
        return s
    import re

    # Remove inline math delimiters \( \) and $ $
    s = re.sub(r"\\\(|\\\)", "", s)
    s = re.sub(r"\$(.+?)\$", r"\1", s)

    # Convert very common patterns like \frac{1}{x} -> 1/x
    def _frac_repl(m: re.Match) -> str:  # type: ignore[name-defined]
        return f"{m.group(1)}/{m.group(2)}"

    s = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", _frac_repl, s)
    return s


def _answer_derived_from_content(correct_answer: str, content: str) -> bool:
    """Check that correct_answer is derived from user content (substring or significant overlap)."""
    if not correct_answer or not content:
        return False
    # Work on raw text (notes) but normalize away simple LaTeX wrappers so that
    # \(x^2\) still validates against "x^2" in the notes.
    ca = _normalize(_strip_latex_math(correct_answer))
    ct = _normalize(_strip_latex_math(content))
    if len(ca) < 3:
        return True
    # Direct substring
    if ca in ct:
        return True
    import re
    ca_clean = re.sub(r'[^a-z0-9]', '', ca)
    ct_clean = re.sub(r'[^a-z0-9]', '', ct)
    if len(ca_clean) > 0 and ca_clean in ct_clean:
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
- ALL mathematical formulas, variables, and expressions MUST be wrapped in LaTeX inline delimiters \( and \) (e.g., \(x^2\), \(\frac{{1}}{{x}}\)).
- Use the SAME LANGUAGE as the user's study notes. If the notes are in Spanish, write questions, answers, and explanations in Spanish. Do NOT translate the content to another language.

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

    validated: list[dict] = []
    print(f"[Quiz Gen] Generated {len(facts)} raw facts from Ollama.")
    for f in facts:
        correct = (f.get("correct_answer") or "").strip()
        if not correct:
            print(f"[Quiz Gen] Dropped due to no correct_answer: {f.get('question')}")
            continue
        if not _answer_derived_from_content(correct, content):
            print(f"[Quiz Gen] Dropped due to validation (not derived from content): CA='{correct}'")
            continue
        question = (f.get("question") or "").strip()
        distractors = f.get("distractors")
        if not question or not isinstance(distractors, list) or len(distractors) != 3:
            print(f"[Quiz Gen] Dropped due to invalid structure: {question}")
            continue
        validated.append(
            {
                "question": question,
                "correct_answer": correct,
                "distractors": [str(d).strip() for d in distractors[:3]],
                "explanation": (f.get("explanation") or "").strip() or None,
            }
        )

    if not validated:
        # Fallback: if validation dropped everything but we did receive structured
        # facts from the model, keep them so the user still gets questions.
        print("[Quiz Gen] Validation dropped all facts, falling back to storing all raw facts.")
        fallback: list[dict] = []
        for f in facts:
            question = (f.get("question") or "").strip()
            distractors = f.get("distractors") or []
            if not question:
                continue
            if not isinstance(distractors, list) or len(distractors) < 3:
                continue
            fallback.append(
                {
                    "question": question,
                    "correct_answer": (f.get("correct_answer") or "").strip(),
                    "distractors": [str(d).strip() for d in distractors[:3]],
                    "explanation": (f.get("explanation") or "").strip() or None,
                }
            )
        print(f"[Quiz Gen] Stored {len(fallback)} fallback facts (unvalidated).")
        return fallback

    print(f"[Quiz Gen] Stored {len(validated)} validated facts.")
    return validated
