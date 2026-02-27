'use client'

import React from 'react'
import 'katex/dist/katex.min.css'
import Latex from 'react-latex-next'

export function MathText({ content }: { content: string }) {
    return <Latex>{content}</Latex>
}
