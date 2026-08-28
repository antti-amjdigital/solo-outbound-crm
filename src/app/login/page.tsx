import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"

const localDevAuth = process.env.AUTH_GOOGLE_ID === "placeholder"

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-surface">
      <h1 className="text-2xl font-bold tracking-[0.16em] text-ink">CRM</h1>
      {localDevAuth ? (
        <form
          action={async () => {
            "use server"
            await signIn("local", { redirectTo: "/" })
          }}
        >
          <Button type="submit" size="lg">
            Continue locally
          </Button>
        </form>
      ) : (
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <Button type="submit" size="lg">
            Sign in with Google
          </Button>
        </form>
      )}
    </main>
  )
}
