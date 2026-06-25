import { Plugin } from '@tiptap/pm/state'
import { ReplaceStep } from '@tiptap/pm/transform'

export const readOnlyZonePlugin = new Plugin({
  filterTransaction(tr, state) {
    if (!tr.docChanged) return true
    for (const step of tr.steps) {
      if (step instanceof ReplaceStep) {
        const { from, to } = step
        let blocked = false
        state.doc.nodesBetween(from, to, (_node, _pos) => {
          if (_node.marks.some(m => m.type.name === 'boilerplateZone')) blocked = true
        })
        if (blocked) return false
      }
    }
    return true
  },
})
