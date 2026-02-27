'use client'

import React from 'react'
import 'katex/dist/katex.min.css'
import Latex from 'react-latex-next'

function autoLatex(content: string): string {
    if (!content) return content
    // Si ya viene con LaTeX explícito, no tocamos nada.
    if (content.includes('\\(') || content.includes('\\[') || content.includes('$$')) {
        return content
    }

    let result = content

    // Exponentes simples: x^2, y^3, a^10 -> \(x^2\), etc.
    result = result.replace(/\b([a-zA-Z])\^([0-9]+)\b/g, '\\($1^$2\\)')

    // Fracciones simples tipo 1/x, 2/y, 3/10 -> \(1/x\), etc.
    result = result.replace(/\b(\d+)\s*\/\s*([a-zA-Z0-9]+)\b/g, '\\($1/$2\\)')

    return result
}

export function MathText({ content }: { content: string }) {
    const processed = autoLatex(content)
    return <Latex>{processed}</Latex>
}
