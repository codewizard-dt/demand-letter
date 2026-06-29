import { Mark } from '@tiptap/core'
import { readOnlyZonePlugin } from './readOnlyZonePlugin'

export const BoilerplateZone = Mark.create({
  name: 'boilerplateZone',

  addAttributes() {
    return { class: { default: 'boilerplate-zone' } }
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, contenteditable: 'false' }, 0]
  },

  parseHTML() {
    return [{ tag: 'span.boilerplate-zone' }]
  },

  addProseMirrorPlugins() {
    return [readOnlyZonePlugin]
  },
})
