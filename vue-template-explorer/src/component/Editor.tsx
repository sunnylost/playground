import { useRef } from 'react'
import { compileTemplate } from 'vue/compiler-sfc'
import { EditorView, basicSetup } from 'codemirror'
import { vue } from '@codemirror/lang-vue'

const defaultCode = `
<div class="counter">
    <output>{{ count }}</output>
    <button @click="increment">+</button>
</div>`.trim()
let editorView: EditorView

export function Editor({ onChange }) {
    const domRef = useRef<HTMLDivElement>(null)

    function compileVueTemplate(code: string) {
        const result = compileTemplate({
            id: 'demo',
            source: code
        })
        onChange(result.ast)
    }

    if (!editorView && domRef.current) {
        editorView = new EditorView({
            extensions: [
                basicSetup,
                vue(),
                EditorView.updateListener.of((update) => {
                    if (update.docChanged) {
                        compileVueTemplate(update.state.doc.toString())
                    }
                })
            ],
            parent: domRef.current,
            doc: defaultCode
        })

        compileVueTemplate(defaultCode)
    }

    return <div ref={domRef} className="h-full"></div>
}
