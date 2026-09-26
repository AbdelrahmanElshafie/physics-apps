"""Long-lived SymPy worker for symbolic answer checking.

Speaks newline-delimited JSON on stdin/stdout. It is long-lived because importing SymPy costs a
second or more; spawning per check would make "instant feedback" a lie.

Protocol
--------
request   {"id": "1", "op": "equal",    "a": "<latex>", "b": "<latex>"}
          {"id": "2", "op": "evaluate", "a": "<latex>"}
          {"id": "3", "op": "ping"}
response  {"id": "1", "ok": true,  "equal": true}
          {"id": "1", "ok": false, "reason": "parse_failed"}

Design rule that matters: this worker answers "equal", "not equal", or "I could not tell", and the
caller turns the third into `unverified`. It must never guess, because a false "not equal" marks
correct work wrong.
"""

import json
import re
import sys


def _fail(reason):
    return {"ok": False, "reason": reason}


try:
    import sympy
    from sympy.parsing.latex import parse_latex
except Exception as exc:  # pragma: no cover - environment problem, reported once
    sys.stdout.write(json.dumps({"id": "boot", "ok": False, "reason": f"import_failed: {exc}"}) + "\n")
    sys.stdout.flush()
    sys.exit(1)


def clean(latex):
    """Strip decoration that carries no mathematical meaning."""
    s = (latex or "").strip()

    # Editors wrap output in math-mode delimiters.
    for opener, closer in (("$$", "$$"), ("$", "$"), (r"\[", r"\]"), (r"\(", r"\)")):
        if s.startswith(opener) and s.endswith(closer) and len(s) > len(opener) + len(closer):
            s = s[len(opener):-len(closer)].strip()

    # A derivation step is often written as a continuation, e.g. "= 3 + 8".
    while s.startswith("="):
        s = s[1:].strip()

    # \left and \right are grouping hints for rendering only.
    s = s.replace(r"\left", "").replace(r"\right", "")
    # These spacing commands are pure typography.
    for spacer in (r"\,", r"\;", r"\:", r"\!", r"\quad", r"\qquad", r"\displaystyle"):
        s = s.replace(spacer, " ")

    return s.strip()


# Two or more alphabetic runs of three-plus letters, once LaTeX commands are removed, means the
# input is a sentence rather than an expression. Without this guard parse_latex silently reads
# "this is not maths" as a product of single-letter symbols and the comparison then reports a
# confident "not equal" for what is really prose — the one verdict this system must never invent.
_WORDS = re.compile(r"[A-Za-z]{3,}")


def looks_like_prose(s):
    # Drop LaTeX control sequences first, or \frac and \sqrt would themselves read as words.
    without_commands = re.sub(r"\\[A-Za-z]+", " ", s)
    return len(_WORDS.findall(without_commands)) >= 2


def parse(latex):
    s = clean(latex)
    if not s:
        return None
    if looks_like_prose(s):
        return None
    try:
        expr = parse_latex(s)
    except Exception:
        return None
    # An equation is not an expression; compare its sides instead.
    if isinstance(expr, sympy.Eq):
        return expr.lhs - expr.rhs
    return expr


def equal(a_latex, b_latex):
    a = parse(a_latex)
    b = parse(b_latex)
    if a is None or b is None:
        return _fail("parse_failed")

    try:
        difference = sympy.simplify(a - b)
    except Exception:
        return _fail("simplify_failed")

    if difference == 0:
        return {"ok": True, "equal": True}

    # No free symbols: settle it numerically, which catches things like sqrt(9) vs 3 that
    # simplify can leave in an unevaluated form.
    if not (a.free_symbols or b.free_symbols):
        try:
            delta = complex(sympy.N(a) - sympy.N(b))
            if abs(delta) < 1e-9:
                return {"ok": True, "equal": True}
            return {"ok": True, "equal": False}
        except Exception:
            return _fail("numeric_failed")

    # Symbols present and the difference did not collapse. `equals` is more thorough than
    # `simplify` but may return None, which means genuinely undecided — report that honestly.
    try:
        verdict = a.equals(b)
    except Exception:
        return _fail("equals_failed")

    if verdict is True:
        return {"ok": True, "equal": True}
    if verdict is False:
        return {"ok": True, "equal": False}
    return _fail("undecided")


def evaluate(a_latex):
    a = parse(a_latex)
    if a is None:
        return _fail("parse_failed")
    try:
        if a.free_symbols:
            return {"ok": True, "value": None, "text": sympy.sstr(sympy.simplify(a))}
        return {"ok": True, "value": float(sympy.N(a)), "text": sympy.sstr(sympy.simplify(a))}
    except Exception:
        return _fail("evaluate_failed")


def handle(message):
    op = message.get("op")
    if op == "ping":
        return {"ok": True, "sympy": sympy.__version__}
    if op == "equal":
        return equal(message.get("a"), message.get("b"))
    if op == "evaluate":
        return evaluate(message.get("a"))
    return _fail(f"unknown_op:{op}")


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
        except Exception:
            continue

        try:
            result = handle(message)
        except Exception as exc:  # A bad expression must not take the worker down.
            result = _fail(f"crashed: {type(exc).__name__}")

        result["id"] = message.get("id")
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
