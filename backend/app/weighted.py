"""Weighted random selection for quiz questions."""
import random


def weight(question) -> float:
    """weight = max(1, 1 + wrong_count*2 - correct_streak)"""
    w = 1 + question.wrong_count * 2 - question.correct_streak
    return max(1.0, float(w))


def weighted_sample(questions: list, n: int) -> list:
    """Select n questions with weighted probability (without replacement)."""
    if not questions or n <= 0:
        return []
    if n >= len(questions):
        return list(questions)
    weights = [weight(q) for q in questions]
    total = sum(weights)
    if total <= 0:
        return random.sample(questions, min(n, len(questions)))
    chosen = []
    remaining = list(questions)
    remaining_weights = list(weights)
    for _ in range(n):
        if not remaining:
            break
        total_w = sum(remaining_weights)
        r = random.uniform(0, total_w)
        for i, w in enumerate(remaining_weights):
            r -= w
            if r <= 0:
                chosen.append(remaining.pop(i))
                remaining_weights.pop(i)
                break
    return chosen
