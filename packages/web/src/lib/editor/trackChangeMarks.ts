import { Mark } from '@tiptap/core'

export const TrackInsert = Mark.create({
  name: 'trackInsert',
  addAttributes() {
    return {
      changeId: { default: null },
      userName: { default: '' },
      createdAt: { default: '' },
    }
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'track-insert', 'data-user-name': HTMLAttributes.userName, 'data-created-at': HTMLAttributes.createdAt ? new Date(HTMLAttributes.createdAt as string).toLocaleString() : '' }, 0]
  },
  parseHTML() { return [{ tag: 'span.track-insert' }] },
})

export const TrackDelete = Mark.create({
  name: 'trackDelete',
  addAttributes() {
    return {
      changeId: { default: null },
      userName: { default: '' },
      createdAt: { default: '' },
    }
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { ...HTMLAttributes, class: 'track-delete', 'data-user-name': HTMLAttributes.userName, 'data-created-at': HTMLAttributes.createdAt ? new Date(HTMLAttributes.createdAt as string).toLocaleString() : '' }, 0]
  },
  parseHTML() { return [{ tag: 'span.track-delete' }] },
})
