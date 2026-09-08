import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  await prisma.task.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.note.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.sequenceStep.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.prospect.deleteMany()

  console.log("Database cleared.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
