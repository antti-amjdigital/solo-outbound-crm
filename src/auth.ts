import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"

const localDevAuth = process.env.AUTH_GOOGLE_ID === "placeholder"
const allowedEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase()

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    ...(localDevAuth
      ? [
          Credentials({
            id: "local",
            name: "Local",
            credentials: {},
            authorize: () => ({
              id: "local-dev",
              name: "Local Dev",
              email: process.env.ALLOWED_EMAIL,
            }),
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn: ({ user }) => user.email?.trim().toLowerCase() === allowedEmail,
  },
})
