import { resolveSequenceId } from "@/lib/sequence-queries"

export async function getMainNavConfig(): Promise<{
  sequenceHref: string
  hrefs: string[]
}> {
  const id = await resolveSequenceId("default")
  const sequenceHref = id ? `/sequences/${id}` : "/sequences/default"
  return {
    sequenceHref,
    hrefs: ["/", "/prospects", sequenceHref, "/stats"],
  }
}
