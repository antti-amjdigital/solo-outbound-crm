import { useHotkeys } from "react-hotkeys-hook"

/** ⌘/Ctrl + Enter to submit the open form/dialog. */
export function useModEnterSubmit(submit: () => void, enabled = true) {
  useHotkeys(
    "mod+enter",
    (e) => {
      e.preventDefault()
      submit()
    },
    { enableOnFormTags: true, enabled },
    [submit, enabled],
  )
}

export function isModEnter(e: {
  key: string
  metaKey: boolean
  ctrlKey: boolean
}): boolean {
  return e.key === "Enter" && (e.metaKey || e.ctrlKey)
}
