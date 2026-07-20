import json
import re
import anthropic
from config import Config

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
    return _client


def _ask(system_prompt, user_prompt, max_tokens=1500):
    response = _get_client().messages.create(
        model=Config.CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(block.text for block in response.content if block.type == "text")
    return text


def _extract_json(text):
    """Claude sometimes wraps JSON in markdown fences — strip them."""
    cleaned = re.sub(r"^```(json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    return json.loads(cleaned)


def analyze_complexity(code, language):
    """Returns time/space complexity + a short explanation."""
    system = (
        "You are a rigorous algorithms expert. Given source code, determine its "
        "worst-case time and space complexity in Big-O notation. "
        "Respond ONLY with JSON: "
        '{"time_complexity": "...", "space_complexity": "...", "explanation": "..."}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    return _extract_json(_ask(system, user))


def optimize_code(code, language):
    """Returns an optimized version of the code plus a rationale."""
    system = (
        "You are an expert software engineer. Optimize the given code for the best "
        "possible time/space complexity while preserving behavior. "
        "Respond ONLY with JSON: "
        '{"optimized_code": "...", "new_time_complexity": "...", '
        '"new_space_complexity": "...", "rationale": "..."}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    return _extract_json(_ask(system, user))


def detect_patterns(code, language):
    """Returns likely algorithmic patterns (e.g. two pointers, DP, BFS) with confidence."""
    system = (
        "You identify algorithmic patterns used in code (e.g. two pointers, sliding "
        "window, dynamic programming, backtracking, graph BFS/DFS, binary search). "
        'Respond ONLY with JSON: {"patterns": [{"name": "...", "confidence": 0.0}]}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    return _extract_json(_ask(system, user))["patterns"]


def generate_interview_questions(code, language, n=3):
    system = (
        "You are a technical interviewer. Given a candidate's solution, generate "
        "thoughtful follow-up interview questions (edge cases, complexity tradeoffs, "
        "alternative approaches). "
        f'Respond ONLY with JSON: {{"questions": ["...", ... up to {n}]}}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    return _extract_json(_ask(system, user))["questions"]


def grade_answer(question_text, user_answer):
    system = (
        "You grade a candidate's answer to a technical interview question, giving "
        "constructive feedback. Respond ONLY with JSON: "
        '{"feedback": "...", "is_correct": true/false}'
    )
    user = f"Question: {question_text}\n\nCandidate answer: {user_answer}"
    return _extract_json(_ask(system, user))


def compare_ab(code_a, code_b, language):
    system = (
        "You compare two code solutions to the same problem on correctness, time "
        "complexity, space complexity, and readability, then declare a winner. "
        "Respond ONLY with JSON: "
        '{"time_a": "...", "time_b": "...", "space_a": "...", "space_b": "...", '
        '"winner": "A|B|tie", "reasoning": "..."}'
    )
    user = f"Language: {language}\n\nCode A:\n{code_a}\n\nCode B:\n{code_b}"
    return _extract_json(_ask(system, user))


def debug_suggestion(code, language, error_message):
    system = (
        "You are a debugging assistant. Given code and an error/stack trace, explain "
        "the likely root cause and a concrete fix suggestion. "
        'Respond ONLY with JSON: {"error_type": "...", "suggestion": "..."}'
    )
    user = f"Language: {language}\n\nCode:\n{code}\n\nError:\n{error_message}"
    return _extract_json(_ask(system, user))
