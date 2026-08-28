import {
  ActivityType,
  CallOutcome,
  EnrollState,
  PrismaClient,
  ProspectStatus,
  StepType,
  TaskStatus,
} from "@prisma/client"

const prisma = new PrismaClient()

const DAY_MS = 24 * 60 * 60 * 1000

function atUtcMidnight(daysFromToday: number): Date {
  const now = new Date()
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysFromToday,
      0,
      0,
      0,
      0,
    ),
  )
}

type SeedProspect = {
  firstName: string
  lastName: string
  company: string
  title: string
  email: string
  phone: string
  source: string
}

const people: SeedProspect[] = [
  ["Mikko", "Niemi", "Arctic Cargo Oy", "Logistics Manager", "mikko.niemi@arcticcargo.fi", "+358401110001", "list-scrape"],
  ["Laura", "Heikkinen", "Nordic Forge", "Operations Director", "laura.heikkinen@nordicforge.fi", "+358401110002", "referral"],
  ["Antti", "Salonen", "Baltic Components", "COO", "antti.salonen@balticcomponents.fi", "+358401110003", "list-scrape"],
  ["Sari", "Laine", "Turku Marine Tech", "Procurement Lead", "sari.laine@turkumarine.fi", "+358401110004", "inbound"],
  ["Janne", "Virtanen", "Polar Steel", "Plant Manager", "janne.virtanen@polarsteel.fi", "+358401110005", "list-scrape"],
  ["Elina", "Korhonen", "Vantaa Plastics", "Sales Director", "elina.korhonen@vantaaplastics.fi", "+358401110006", "referral"],
  ["Petri", "Lehto", "Savo Energy", "Commercial Lead", "petri.lehto@savoenergy.fi", "+358401110007", "list-scrape"],
  ["Noora", "Mäkinen", "Rauma Industrial", "CEO", "noora.makinen@raumai.fi", "+358401110008", "inbound"],
  ["Kalle", "Aalto", "Helsinki Electrics", "Head of Growth", "kalle.aalto@helsinkielectrics.fi", "+358401110009", "list-scrape"],
  ["Tiina", "Ranta", "Lapland Transit", "Operations Manager", "tiina.ranta@laplandtransit.fi", "+358401110010", "referral"],
  ["Olli", "Hämäläinen", "West Harbor Lines", "Account Executive", "olli.hamalainen@westharbor.fi", "+358401110011", "list-scrape"],
  ["Mari", "Koskinen", "Karelia Timber", "Managing Director", "mari.koskinen@kareliatimber.fi", "+358401110012", "inbound"],
  ["Tuomas", "Järvinen", "Suomi Lift", "Fleet Manager", "tuomas.jarvinen@suomilift.fi", "+358401110013", "list-scrape"],
  ["Veera", "Nykänen", "Pori Metals", "Regional Manager", "veera.nykanen@porimetals.fi", "+358401110014", "referral"],
  ["Sami", "Lindholm", "Åbo Machines", "Operations Lead", "sami.lindholm@abomachines.fi", "+358401110015", "list-scrape"],
  ["Aino", "Pietilä", "Jyväskylä Dynamics", "Partnerships Lead", "aino.pietila@jkl-dynamics.fi", "+358401110016", "list-scrape"],
  ["Henri", "Saarinen", "Vaasa Components", "CEO", "henri.saarinen@vaasacomponents.fi", "+358401110017", "inbound"],
  ["Iida", "Seppä", "Kemi Logistics", "Procurement Manager", "iida.seppa@kemilogistics.fi", "+358401110018", "list-scrape"],
  ["Riku", "Manninen", "Satakunta Works", "General Manager", "riku.manninen@satakuntaworks.fi", "+358401110019", "referral"],
  ["Emmi", "Toivonen", "Lappeenranta Systems", "CSO", "emmi.toivonen@lrsystems.fi", "+358401110020", "list-scrape"],
  ["Mika", "Karjalainen", "Kuopio Freight", "Owner", "mika.karjalainen@kuopiofreight.fi", "+358401110021", "list-scrape"],
  ["Heli", "Räsänen", "Nokia Industrial", "Head of Sales", "heli.rasanen@nokiaindustrial.fi", "+358401110022", "referral"],
  ["Tero", "Holm", "Espoo Manufacturing", "Operations Director", "tero.holm@espoomfg.fi", "+358401110023", "list-scrape"],
  ["Saara", "Peltonen", "Oulu Automation", "Business Lead", "saara.peltonen@ouluautomation.fi", "+358401110024", "inbound"],
  ["Eetu", "Kinnunen", "Kotka Equipments", "Managing Partner", "eetu.kinnunen@kotkaequip.fi", "+358401110025", "list-scrape"],
  ["Jenni", "Hirvonen", "Häme Networks", "Founder", "jenni.hirvonen@hamenetworks.fi", "+358401110026", "list-scrape"],
  ["Lauri", "Paananen", "Savonlinna Cargo", "Sales Manager", "lauri.paananen@savonlinnacargo.fi", "+358401110027", "referral"],
  ["Katri", "Väänänen", "Seinäjoki Group", "COO", "katri.vaananen@seinajokigroup.fi", "+358401110028", "list-scrape"],
  ["Aleksi", "Vuori", "Tampere Tools", "Director", "aleksi.vuori@tamperetools.fi", "+358401110029", "inbound"],
  ["Riikka", "Laukkanen", "Uusimaa Line", "Business Director", "riikka.laukkanen@uusimaaline.fi", "+358401110030", "list-scrape"],
  ["Niko", "Ylönen", "Kokkola Freight", "Commercial Director", "niko.ylonen@kokkolafreight.fi", "+358401110031", "referral"],
  ["Hanna", "Repo", "Hyvinkää Tech", "CEO", "hanna.repo@hyvinkaatech.fi", "+358401110032", "list-scrape"],
  ["Jussi", "Takala", "Pohjanmaa Movers", "Owner", "jussi.takala@pohjanmaamovers.fi", "+358401110033", "list-scrape"],
  ["Milla", "Auvinen", "Lahti Instruments", "Head of Ops", "milla.auvinen@lahtiinstruments.fi", "+358401110034", "inbound"],
  ["Teemu", "Sipilä", "Kerava Metals", "Regional Director", "teemu.sipila@keravametals.fi", "+358401110035", "list-scrape"],
  ["Pinja", "Suominen", "Imatra Lines", "Procurement Lead", "pinja.suominen@imatralines.fi", "+358401110036", "referral"],
  ["Arto", "Kangas", "Rovaniemi Works", "Managing Director", "arto.kangas@rovaniemiworks.fi", "+358401110037", "list-scrape"],
  ["Susanna", "Hakala", "Naantali Logistics", "Sales Lead", "susanna.hakala@naantalilogistics.fi", "+358401110038", "inbound"],
  ["Pasi", "Koivisto", "Kajaani Hardware", "Operations Head", "pasi.koivisto@kajaanihardware.fi", "+358401110039", "list-scrape"],
  ["Anu", "Miettinen", "Loimaa Industrial", "Founder", "anu.miettinen@loimaaindustrial.fi", "+358401110040", "referral"],
].map(([firstName, lastName, company, title, email, phone, source]) => ({
  firstName,
  lastName,
  company,
  title,
  email,
  phone,
  source,
}))

async function main() {
  await prisma.task.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.note.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.sequenceStep.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.prospect.deleteMany()

  const sequence = await prisma.sequence.create({
    data: {
      name: "Standard Outbound",
      isActive: true,
      steps: {
        create: [
          { order: 1, type: StepType.EMAIL, label: "Personal email", delayDays: 0 },
          { order: 2, type: StepType.CALL, label: "Call attempt 1", delayDays: 1 },
          { order: 3, type: StepType.CALL, label: "Call attempt 2", delayDays: 2 },
          { order: 4, type: StepType.CALL, label: "Call attempt 3", delayDays: 2 },
          { order: 5, type: StepType.EMAIL_REPLY, label: "Reply to email chain", delayDays: 1 },
        ],
      },
    },
  })

  for (let i = 0; i < people.length; i += 1) {
    const p = people[i]
    const bucket = i % 5

    const prospect = await prisma.prospect.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        company: p.company,
        title: p.title,
        email: p.email,
        phone: p.phone,
        linkedin: `https://linkedin.com/in/${p.firstName.toLowerCase()}-${p.lastName.toLowerCase()}`,
        source: p.source,
        timezone: "Europe/Helsinki",
        status:
          bucket === 0
            ? ProspectStatus.NEW
            : bucket === 1
              ? ProspectStatus.ACTIVE
              : bucket === 2
                ? ProspectStatus.ACTIVE
                : bucket === 3
                  ? ProspectStatus.MEETING_BOOKED
                  : ProspectStatus.DEAD,
        deadReason: bucket === 4 ? (i % 2 === 0 ? "not_interested" : "wrong_number") : null,
      },
    })

    if (bucket === 0) {
      await prisma.note.create({
        data: {
          prospectId: prospect.id,
          body: "Imported and waiting for enrollment.",
        },
      })
      continue
    }

    const finished = bucket === 3 || bucket === 4
    const currentStepOrder = bucket === 1 ? 1 : bucket === 2 ? 3 : 5

    const enrollment = await prisma.enrollment.create({
      data: {
        prospectId: prospect.id,
        sequenceId: sequence.id,
        currentStepOrder,
        state: finished ? EnrollState.FINISHED : EnrollState.RUNNING,
        startedAt: new Date(Date.now() - (14 - i) * DAY_MS),
        finishedAt: finished ? new Date(Date.now() - (i % 4) * DAY_MS) : null,
        exitReason:
          bucket === 3
            ? "meeting_booked"
            : bucket === 4
              ? "dead"
              : null,
      },
    })

    if (bucket === 1 || bucket === 2) {
      await prisma.task.create({
        data: {
          prospectId: prospect.id,
          enrollmentId: enrollment.id,
          type: currentStepOrder >= 4 ? StepType.EMAIL_REPLY : StepType.CALL,
          label: currentStepOrder >= 4 ? "Reply to email chain" : `Call attempt ${currentStepOrder}`,
          stepOrder: currentStepOrder + 1,
          dueDate: atUtcMidnight(bucket === 1 ? 0 : -1),
          status: TaskStatus.OPEN,
        },
      })
    }

    const baseActivities =
      bucket === 1 ? [ActivityType.EMAIL_SENT] : [ActivityType.EMAIL_SENT, ActivityType.CALL, ActivityType.CALL]

    for (let j = 0; j < baseActivities.length; j += 1) {
      const type = baseActivities[j]
      await prisma.activity.create({
        data: {
          prospectId: prospect.id,
          sequenceId: sequence.id,
          stepOrder: j + 1,
          type,
          outcome:
            type === ActivityType.CALL
              ? j % 2 === 0
                ? CallOutcome.NO_ANSWER
                : CallOutcome.GATEKEEPER
              : null,
          durationSec: type === ActivityType.CALL ? 35 + i + j : null,
          note:
            type === ActivityType.CALL
              ? "Reached switchboard, requested direct contact."
              : "Sent a short personalised opener.",
          occurredAt: atUtcMidnight(-(j + 2)),
        },
      })
    }

    if (bucket === 3) {
      await prisma.activity.create({
        data: {
          prospectId: prospect.id,
          sequenceId: sequence.id,
          stepOrder: 2,
          type: ActivityType.MEETING_BOOKED,
          outcome: CallOutcome.MEETING_BOOKED,
          note: "Booked a 30-minute discovery call for next week.",
          occurredAt: atUtcMidnight(-1),
        },
      })
    }

    if (bucket === 4) {
      await prisma.activity.create({
        data: {
          prospectId: prospect.id,
          sequenceId: sequence.id,
          stepOrder: 2,
          type: ActivityType.CALL,
          outcome: i % 2 === 0 ? CallOutcome.NOT_INTERESTED : CallOutcome.WRONG_NUMBER,
          note: i % 2 === 0 ? "Not a fit this quarter." : "Number belongs to another company.",
          occurredAt: atUtcMidnight(-1),
        },
      })
    }
  }

  console.log("Seed complete: 40 prospects + Standard Outbound sequence.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
