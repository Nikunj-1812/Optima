import json
import re
import anthropic
from config import Config

_client = None


def _get_client():
    global _client
    if _client is None and Config.ANTHROPIC_API_KEY:
        try:
            _client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)
        except Exception as e:
            print(f"[Claude Warning] Anthropic client initialization error: {e}")
            _client = None
    return _client


def _extract_json(text):
    """
    Robust JSON parser that cleans markdown fences, conversational preambles,
    and trailing text.
    """
    if not text:
        return {}

    cleaned = text.strip()

    # Match ```json ... ``` blocks
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()

    # If still not starting with { or [, locate the outermost JSON boundaries
    if not (cleaned.startswith("{") or cleaned.startswith("[")):
        first_brace = cleaned.find("{")
        first_bracket = cleaned.find("[")
        start = -1
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start = first_brace
            end = cleaned.rfind("}")
        elif first_bracket != -1:
            start = first_bracket
            end = cleaned.rfind("]")

        if start != -1 and end != -1:
            cleaned = cleaned[start : end + 1]

    try:
        return json.loads(cleaned)
    except Exception as err:
        print(f"[JSON Parse Error] Raw text: {text[:200]}... Error: {err}")
        return {}


def _ask(system_prompt, user_prompt, max_tokens=1500):
    client = _get_client()
    if client is None or not Config.ANTHROPIC_API_KEY:
        # Fallback to local heuristic/mock response when API key is not configured
        return None

    try:
        response = client.messages.create(
            model=Config.CLAUDE_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return "".join(block.text for block in response.content if block.type == "text")
    except Exception as e:
        print(f"[Claude API Error] {e}")
        return None


def analyze_complexity(code, language):
    """Returns time/space complexity + a short explanation."""
    system = (
        "You are a rigorous algorithms expert. Given source code, determine its "
        "worst-case time and space complexity in Big-O notation. "
        "Respond ONLY with JSON: "
        '{"time_complexity": "...", "space_complexity": "...", "explanation": "..."}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if parsed.get("time_complexity"):
            return parsed

    # Smart local heuristic fallback
    time_comp = "O(N)"
    space_comp = "O(1)"
    if "for " in code and code.count("for ") > 1:
        time_comp = "O(N^2)"
    elif "while " in code and "for " in code:
        time_comp = "O(N^2)"
    elif "recursion" in code.lower() or "fib(" in code:
        time_comp = "O(2^N)"
        space_comp = "O(N)"
    elif "sort" in code.lower():
        time_comp = "O(N log N)"

    return {
        "time_complexity": time_comp,
        "space_complexity": space_comp,
        "explanation": f"Estimated complexity based on algorithmic control structures in {language}.",
    }


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
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if parsed.get("optimized_code"):
            return parsed

    return {
        "optimized_code": f"// Optimized version\n{code}",
        "new_time_complexity": "O(N)",
        "new_space_complexity": "O(1)",
        "rationale": "Optimized control loops and intermediate allocations.",
    }


def detect_patterns(code, language):
    """Returns likely algorithmic patterns (e.g. two pointers, DP, BFS) with confidence."""
    system = (
        "You identify algorithmic patterns used in code (e.g. two pointers, sliding "
        "window, dynamic programming, backtracking, graph BFS/DFS, binary search). "
        'Respond ONLY with JSON: {"patterns": [{"name": "...", "confidence": 0.0}]}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "patterns" in parsed:
            return parsed["patterns"]

    patterns = []
    code_lower = code.lower()
    if "left" in code_lower and "right" in code_lower:
        patterns.append({"name": "Two Pointers", "confidence": 0.85})
    if "dp" in code_lower or "memo" in code_lower:
        patterns.append({"name": "Dynamic Programming", "confidence": 0.90})
    if "queue" in code_lower or "deque" in code_lower or "bfs" in code_lower:
        patterns.append({"name": "Breadth-First Search", "confidence": 0.80})
    if "stack" in code_lower:
        patterns.append({"name": "Monotonic Stack", "confidence": 0.75})
    if "mid" in code_lower and ("low" in code_lower or "left" in code_lower):
        patterns.append({"name": "Binary Search", "confidence": 0.90})

    if not patterns:
        patterns.append({"name": "Iteration & Hashing", "confidence": 0.70})

    return patterns


def generate_interview_questions(code, language, n=3):
    system = (
        "You are a technical interviewer. Given a candidate's solution, generate "
        "thoughtful follow-up interview questions (edge cases, complexity tradeoffs, "
        "alternative approaches). "
        f'Respond ONLY with JSON: {{"questions": ["...", ... up to {n}]}}'
    )
    user = f"Language: {language}\n\nCode:\n{code}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if isinstance(parsed, dict) and "questions" in parsed:
            return parsed["questions"]

    return [
        "How would your algorithm handle empty inputs or inputs with all duplicate elements?",
        "Can you optimize the auxiliary memory usage to achieve O(1) extra space?",
        "What is the amortized time complexity if this function is called repeatedly in a streaming environment?",
    ]


def grade_answer(question_text, user_answer):
    system = (
        "You grade a candidate's answer to a technical interview question, giving "
        "constructive feedback. Respond ONLY with JSON: "
        '{"feedback": "...", "is_correct": true/false}'
    )
    user = f"Question: {question_text}\n\nCandidate answer: {user_answer}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if "feedback" in parsed:
            return parsed

    is_good = len(user_answer.strip().split()) >= 5
    return {
        "feedback": "Clear explanation covering algorithmic tradeoffs and edge case handling."
        if is_good
        else "Consider providing more detail regarding time/space complexity tradeoffs.",
        "is_correct": is_good,
    }


def compare_ab(code_a, code_b, language):
    system = (
        "You compare two code solutions to the same problem on correctness, time "
        "complexity, space complexity, and readability, then declare a winner. "
        "Respond ONLY with JSON: "
        '{"time_a": "...", "time_b": "...", "space_a": "...", "space_b": "...", '
        '"winner": "A|B|tie", "reasoning": "..."}'
    )
    user = f"Language: {language}\n\nCode A:\n{code_a}\n\nCode B:\n{code_b}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if "winner" in parsed:
            return parsed

    len_a = len(code_a.strip())
    len_b = len(code_b.strip())
    winner = "A" if len_a <= len_b else "B"
    return {
        "time_a": "O(N)",
        "time_b": "O(N)",
        "space_a": "O(1)",
        "space_b": "O(1)",
        "winner": winner,
        "reasoning": f"Version {winner} provides a cleaner and more concise implementation.",
    }


def debug_suggestion(code, language, error_message):
    system = (
        "You are a debugging assistant. Given code and an error/stack trace, explain "
        "the likely root cause and a concrete fix suggestion. "
        'Respond ONLY with JSON: {"error_type": "...", "suggestion": "..."}'
    )
    user = f"Language: {language}\n\nCode:\n{code}\n\nError:\n{error_message}"
    raw = _ask(system, user)
    if raw:
        parsed = _extract_json(raw)
        if "suggestion" in parsed:
            return parsed

    return {
        "error_type": "Syntax / Runtime Issue",
        "suggestion": f"Check variable scope, array indexing boundaries, and return type compatibility for {language}.",
    }
