import { revalidatePath } from "next/cache"

export function revalidateProspects(id?: string) {
  revalidatePath("/prospects")
  revalidatePath("/")
  revalidatePath("/import")
  if (id) revalidatePath(`/prospects/${id}`)
}
