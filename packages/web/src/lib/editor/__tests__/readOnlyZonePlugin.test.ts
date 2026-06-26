import { describe, it, expect } from 'vitest'
import { EditorState } from '@tiptap/pm/state'
import { Schema, Slice } from '@tiptap/pm/model'
import { ReplaceStep } from '@tiptap/pm/transform'
import { readOnlyZonePlugin } from '../readOnlyZonePlugin'

// Minimal ProseMirror schema: doc → paragraph → text, plus a boilerplateZone mark.
// The plugin checks m.type.name === 'boilerplateZone' by name, so any schema
// with a mark of that name works — no need to pull in the TipTap extension.
const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
  },
  marks: {
    boilerplateZone: {},
  },
})

// Document layout inside the single paragraph (all positions relative to doc root):
//
//   pos 0          : paragraph open token
//   pos 1–4  (4 chars)  : "AAAA"          — no mark
//   pos 5–15 (11 chars) : "BBBBBBBBBBB"   — boilerplateZone mark
//   pos 16–34 (19 chars): "CCCCCCCCCCCCCCCCCCC" — no mark
//   pos 35         : paragraph close token
//   doc.content.size = 36
//
const bz = schema.marks.boilerplateZone.create()

const doc = schema.node('doc', null, [
  schema.node('paragraph', null, [
    schema.text('AAAA'),
    schema.text('BBBBBBBBBBB', [bz]),
    schema.text('CCCCCCCCCCCCCCCCCCC'),
  ]),
])

const state = EditorState.create({ doc, plugins: [readOnlyZonePlugin] })

describe('readOnlyZonePlugin', () => {
  it('blocks a ReplaceStep whose range overlaps a boilerplateZone mark', () => {
    // Positions 10–12 sit inside the "B" text node (boilerplateZone, spans 5–16).
    const tr = state.tr.step(new ReplaceStep(10, 12, Slice.empty))
    const result = readOnlyZonePlugin.spec.filterTransaction!(tr, state)
    expect(result).toBe(false)
  })

  it('allows a ReplaceStep whose range does not overlap any boilerplateZone mark', () => {
    // Positions 20–25 sit inside the "C" text node (no marks, spans 16–35).
    const tr = state.tr.step(new ReplaceStep(20, 25, Slice.empty))
    const result = readOnlyZonePlugin.spec.filterTransaction!(tr, state)
    expect(result).toBe(true)
  })
})
