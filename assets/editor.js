import { EditorState } from "https://esm.sh/@codemirror/state";
import { EditorView, keymap } from "https://esm.sh/@codemirror/view";
import { defaultKeymap } from "https://esm.sh/@codemirror/commands";

export function mountEditor(parent, initialDoc = "select 1;") {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      keymap.of(defaultKeymap),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": {
          border: "1px solid #ccc",
          borderRadius: "8px"
        },
        ".cm-scroller": {
          minHeight: "140px"
        },
        ".cm-content": {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "14px"
        }
      })
    ]
  });

  const view = new EditorView({ state, parent });

  return {
    view,
    getValue: () => view.state.doc.toString(),
    destroy: () => view.destroy()
  };
}
