import { toast } from "sonner"

/** Show a toast with Undo. Resolves true to commit, false if undone. */
export function waitForUndo(message: string, durationMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    let undone = false

    const finish = () => {
      if (settled) return
      settled = true
      resolve(!undone)
    }

    const id = toast(message, {
      duration: durationMs,
      action: {
        label: "Undo",
        onClick: () => {
          undone = true
          toast.dismiss(id)
        },
      },
      onDismiss: finish,
      onAutoClose: finish,
    })
  })
}
