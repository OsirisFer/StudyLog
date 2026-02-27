import sys
from app.llm import generate_quiz_facts

content = """la integral de x es (x^2)/2
la derivada de 2x es 2
la derivada de logx es 1/x"""

facts = generate_quiz_facts(content)
print("FINAL:")
for f in facts:
    print(f)
