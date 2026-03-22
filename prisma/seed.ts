import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function daysFromNow(days: number, hour: number = 10, minute: number = 0): Date {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return date
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

async function main() {
  console.log('🧹 Cleaning database...')
  await prisma.message.deleteMany()
  await prisma.conversation.deleteMany()
  await prisma.creditTransaction.deleteMany()
  await prisma.session.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.user.deleteMany()

  console.log('🔐 Hashing password...')
  const hash = await bcrypt.hash('password123', 10)

  // ─── 1. Users ───────────────────────────────────────────────

  console.log('👤 Creating users...')

  const marie = await prisma.user.create({
    data: {
      email: 'marie.dubois@example.com',
      password: hash,
      firstName: 'Marie',
      lastName: 'Dubois',
      nativeLanguage: 'French',
      learningLanguages: ['English', 'Spanish'],
      bio: 'Prof de français passionnée, j\'adore transmettre ma langue et ma culture !',
      age: 28,
      hobbies: ['cooking', 'cinema', 'travel'],
      roleMode: 'teacher',
      credits: 180, // 60 bonus + 120 teacher
    },
  })

  const james = await prisma.user.create({
    data: {
      email: 'james.wilson@example.com',
      password: hash,
      firstName: 'James',
      lastName: 'Wilson',
      nativeLanguage: 'English',
      learningLanguages: ['French', 'Japanese'],
      bio: 'Software developer wanting to learn French for my upcoming move to Paris.',
      age: 32,
      hobbies: ['gaming', 'music', 'hiking'],
      roleMode: 'learner',
      credits: 60,
    },
  })

  const yuki = await prisma.user.create({
    data: {
      email: 'yuki.tanaka@example.com',
      password: hash,
      firstName: 'Yuki',
      lastName: 'Tanaka',
      nativeLanguage: 'Japanese',
      learningLanguages: ['English', 'French'],
      bio: 'Étudiante japonaise à Paris, je donne des cours de japonais avec plaisir !',
      age: 25,
      hobbies: ['anime', 'calligraphy', 'cooking'],
      roleMode: 'teacher',
      credits: 180,
    },
  })

  const carlos = await prisma.user.create({
    data: {
      email: 'carlos.garcia@example.com',
      password: hash,
      firstName: 'Carlos',
      lastName: 'García',
      nativeLanguage: 'Spanish',
      learningLanguages: ['English', 'French'],
      bio: 'Native Spanish teacher from Barcelona. ¡Vamos a aprender juntos!',
      age: 35,
      hobbies: ['football', 'guitar', 'photography'],
      roleMode: 'teacher',
      credits: 180,
    },
  })

  const sophie = await prisma.user.create({
    data: {
      email: 'sophie.martin@example.com',
      password: hash,
      firstName: 'Sophie',
      lastName: 'Martin',
      nativeLanguage: 'French',
      learningLanguages: ['English', 'German'],
      bio: 'Étudiante en langues étrangères, curieuse et motivée.',
      age: 22,
      hobbies: ['reading', 'yoga', 'painting'],
      roleMode: 'learner',
      credits: 60,
    },
  })

  const liam = await prisma.user.create({
    data: {
      email: 'liam.obrien@example.com',
      password: hash,
      firstName: 'Liam',
      lastName: "O'Brien",
      nativeLanguage: 'English',
      learningLanguages: ['Spanish', 'French'],
      bio: 'British expat living in Lisbon. I teach English while learning new languages!',
      age: 29,
      hobbies: ['surfing', 'travel', 'cooking'],
      roleMode: 'teacher',
      credits: 180,
    },
  })

  const aiko = await prisma.user.create({
    data: {
      email: 'aiko.sato@example.com',
      password: hash,
      firstName: 'Aiko',
      lastName: 'Sato',
      nativeLanguage: 'Japanese',
      learningLanguages: ['English'],
      bio: 'UI/UX designer from Tokyo, learning English to work internationally.',
      age: 27,
      hobbies: ['manga', 'gaming', 'piano'],
      roleMode: 'learner',
      credits: 60,
    },
  })

  const elena = await prisma.user.create({
    data: {
      email: 'elena.rossi@example.com',
      password: hash,
      firstName: 'Elena',
      lastName: 'Rossi',
      nativeLanguage: 'Italian',
      learningLanguages: ['French', 'English'],
      bio: "Prof d'italien enthousiaste ! La bella lingua pour tous.",
      age: 31,
      hobbies: ['wine', 'history', 'theater'],
      roleMode: 'teacher',
      credits: 180,
    },
  })

  const allUsers = [marie, james, yuki, carlos, sophie, liam, aiko, elena]
  const teachers = [marie, yuki, carlos, liam, elena]

  // ─── 2. Credit Transactions (BONUS) ────────────────────────

  console.log('💰 Creating credit transactions...')

  for (const user of allUsers) {
    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 60,
        type: 'BONUS',
      },
    })
  }

  for (const teacher of teachers) {
    await prisma.creditTransaction.create({
      data: {
        userId: teacher.id,
        amount: 120,
        type: 'BONUS',
      },
    })
  }

  // ─── 3. Availabilities ─────────────────────────────────────

  console.log('📅 Creating availabilities...')

  // Marie: 3 slots
  const marieSlot1 = await prisma.availability.create({
    data: {
      teacherId: marie.id,
      startTimeUTC: daysFromNow(3, 14, 0),
      endTimeUTC: daysFromNow(3, 15, 0),
      durationMinutes: 60,
      creditsAmount: 30,
      isBooked: true, // booking with James
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: marie.id,
      startTimeUTC: daysFromNow(5, 10, 0),
      endTimeUTC: daysFromNow(5, 10, 45),
      durationMinutes: 45,
      creditsAmount: 22,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: marie.id,
      startTimeUTC: daysFromNow(7, 16, 0),
      endTimeUTC: daysFromNow(7, 16, 30),
      durationMinutes: 30,
      creditsAmount: 15,
    },
  })

  // Yuki: 3 slots
  const yukiSlot1 = await prisma.availability.create({
    data: {
      teacherId: yuki.id,
      startTimeUTC: daysFromNow(2, 9, 0),
      endTimeUTC: daysFromNow(2, 9, 45),
      durationMinutes: 45,
      creditsAmount: 22,
      isBooked: true, // booking with James (rejected)
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: yuki.id,
      startTimeUTC: daysFromNow(4, 11, 0),
      endTimeUTC: daysFromNow(4, 12, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: yuki.id,
      startTimeUTC: daysFromNow(6, 15, 0),
      endTimeUTC: daysFromNow(6, 15, 30),
      durationMinutes: 30,
      creditsAmount: 15,
    },
  })

  // Carlos: 4 slots
  const carlosSlot1 = await prisma.availability.create({
    data: {
      teacherId: carlos.id,
      startTimeUTC: daysFromNow(1, 18, 0),
      endTimeUTC: daysFromNow(1, 18, 45),
      durationMinutes: 45,
      creditsAmount: 22,
      isBooked: true, // booking with Sophie (pending)
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: carlos.id,
      startTimeUTC: daysFromNow(3, 10, 0),
      endTimeUTC: daysFromNow(3, 10, 30),
      durationMinutes: 30,
      creditsAmount: 15,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: carlos.id,
      startTimeUTC: daysFromNow(5, 14, 0),
      endTimeUTC: daysFromNow(5, 15, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: carlos.id,
      startTimeUTC: daysFromNow(7, 9, 0),
      endTimeUTC: daysFromNow(7, 9, 45),
      durationMinutes: 45,
      creditsAmount: 22,
    },
  })

  // Liam: 3 slots
  const liamSlot1 = await prisma.availability.create({
    data: {
      teacherId: liam.id,
      startTimeUTC: daysFromNow(-1, 14, 0), // yesterday (completed session)
      endTimeUTC: daysFromNow(-1, 14, 45),
      durationMinutes: 45,
      creditsAmount: 22,
      isBooked: true, // booking with Aiko (completed)
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: liam.id,
      startTimeUTC: daysFromNow(2, 16, 0),
      endTimeUTC: daysFromNow(2, 17, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: liam.id,
      startTimeUTC: daysFromNow(6, 11, 0),
      endTimeUTC: daysFromNow(6, 11, 30),
      durationMinutes: 30,
      creditsAmount: 15,
    },
  })

  // Elena: 4 slots
  await prisma.availability.create({
    data: {
      teacherId: elena.id,
      startTimeUTC: daysFromNow(1, 10, 0),
      endTimeUTC: daysFromNow(1, 11, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: elena.id,
      startTimeUTC: daysFromNow(3, 15, 0),
      endTimeUTC: daysFromNow(3, 15, 45),
      durationMinutes: 45,
      creditsAmount: 22,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: elena.id,
      startTimeUTC: daysFromNow(5, 9, 0),
      endTimeUTC: daysFromNow(5, 9, 30),
      durationMinutes: 30,
      creditsAmount: 15,
    },
  })
  await prisma.availability.create({
    data: {
      teacherId: elena.id,
      startTimeUTC: daysFromNow(7, 14, 0),
      endTimeUTC: daysFromNow(7, 15, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })

  // ─── 4. Bookings + Escrow Transactions ─────────────────────

  console.log('📝 Creating bookings...')

  // Booking 1: James → Marie (CONFIRMED)
  const booking1 = await prisma.booking.create({
    data: {
      studentId: james.id,
      teacherId: marie.id,
      availabilityId: marieSlot1.id,
      status: 'CONFIRMED',
      creditsAmount: 30,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: james.id,
      amount: -30,
      type: 'ESCROW_HOLD',
      relatedId: booking1.id,
    },
  })

  // Update James credits (60 - 30 = 30)
  await prisma.user.update({
    where: { id: james.id },
    data: { credits: 30 },
  })

  // Booking 2: Sophie → Carlos (PENDING)
  const booking2 = await prisma.booking.create({
    data: {
      studentId: sophie.id,
      teacherId: carlos.id,
      availabilityId: carlosSlot1.id,
      status: 'PENDING',
      creditsAmount: 22,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: sophie.id,
      amount: -22,
      type: 'ESCROW_HOLD',
      relatedId: booking2.id,
    },
  })

  // Update Sophie credits (60 - 22 = 38)
  await prisma.user.update({
    where: { id: sophie.id },
    data: { credits: 38 },
  })

  // Booking 3: Aiko → Liam (CONFIRMED, session COMPLETED)
  const booking3 = await prisma.booking.create({
    data: {
      studentId: aiko.id,
      teacherId: liam.id,
      availabilityId: liamSlot1.id,
      status: 'CONFIRMED',
      creditsAmount: 22,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: aiko.id,
      amount: -22,
      type: 'ESCROW_HOLD',
      relatedId: booking3.id,
    },
  })

  // Update Aiko credits (60 - 22 = 38)
  await prisma.user.update({
    where: { id: aiko.id },
    data: { credits: 38 },
  })

  // Booking 4: James → Yuki (REJECTED)
  const booking4 = await prisma.booking.create({
    data: {
      studentId: james.id,
      teacherId: yuki.id,
      availabilityId: yukiSlot1.id,
      status: 'REJECTED',
      creditsAmount: 22,
    },
  })

  // Escrow hold then refund for rejected booking
  await prisma.creditTransaction.create({
    data: {
      userId: james.id,
      amount: -22,
      type: 'ESCROW_HOLD',
      relatedId: booking4.id,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId: james.id,
      amount: 22,
      type: 'ESCROW_REFUND',
      relatedId: booking4.id,
    },
  })

  // James credits stay at 30 (hold then refund cancel out, but he still has booking1 hold)
  // Already at 30 from booking1 update, refund brings back to 30 (net: 60 - 30 = 30)

  // Unbook yuki slot since rejected
  await prisma.availability.update({
    where: { id: yukiSlot1.id },
    data: { isBooked: false },
  })

  // ─── 5. Sessions ───────────────────────────────────────────

  console.log('🎓 Creating sessions...')

  // Session 1: James ↔ Marie — SCHEDULED in 3 days
  await prisma.session.create({
    data: {
      bookingId: booking1.id,
      studentId: james.id,
      teacherId: marie.id,
      status: 'SCHEDULED',
      scheduledStartUTC: daysFromNow(3, 14, 0),
      scheduledEndUTC: daysFromNow(3, 15, 0),
      durationMinutes: 60,
      creditsAmount: 30,
    },
  })

  // Session 2: Aiko ↔ Liam — COMPLETED yesterday
  const yesterday14h = daysFromNow(-1, 14, 0)
  const yesterday1445 = daysFromNow(-1, 14, 45)

  await prisma.session.create({
    data: {
      bookingId: booking3.id,
      studentId: aiko.id,
      teacherId: liam.id,
      status: 'COMPLETED',
      scheduledStartUTC: yesterday14h,
      scheduledEndUTC: yesterday1445,
      durationMinutes: 45,
      creditsAmount: 22,
      teacherStartedAt: yesterday14h,
      studentStartedAt: addMinutes(yesterday14h, 1),
      endedAt: yesterday1445,
    },
  })

  // Release escrow for completed session → credits go to teacher (Liam)
  await prisma.creditTransaction.create({
    data: {
      userId: liam.id,
      amount: 22,
      type: 'ESCROW_RELEASE',
      relatedId: booking3.id,
    },
  })

  // Update Liam credits (180 + 22 = 202)
  await prisma.user.update({
    where: { id: liam.id },
    data: { credits: 202 },
  })

  // ─── 6. Conversations & Messages ──────────────────────────

  console.log('💬 Creating conversations and messages...')

  // Conversation 1: James ↔ Marie (pre-session discussion)
  const conv1 = await prisma.conversation.create({
    data: {
      user1Id: james.id,
      user2Id: marie.id,
    },
  })

  const now = new Date()
  await prisma.message.createMany({
    data: [
      {
        conversationId: conv1.id,
        senderId: james.id,
        content: 'Bonjour Marie ! I just booked a session with you. Looking forward to it!',
        readAt: new Date(now.getTime() - 4 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 5 * 3600 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: marie.id,
        content: 'Hello James! Super, bienvenue ! What is your current level in French?',
        readAt: new Date(now.getTime() - 3 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 4 * 3600 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: james.id,
        content: "I'd say intermediate. I can hold a basic conversation but I struggle with conjugation and listening comprehension.",
        readAt: new Date(now.getTime() - 2 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 3 * 3600 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: marie.id,
        content: "Parfait ! On travaillera sur ça ensemble. I'll prepare some conversational exercises. À bientôt ! 😊",
        readAt: new Date(now.getTime() - 1 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000),
      },
      {
        conversationId: conv1.id,
        senderId: james.id,
        content: 'Merci beaucoup ! See you in 3 days then!',
        createdAt: new Date(now.getTime() - 1 * 3600 * 1000),
      },
    ],
  })

  // Conversation 2: Aiko ↔ Liam (post-session feedback)
  const conv2 = await prisma.conversation.create({
    data: {
      user1Id: aiko.id,
      user2Id: liam.id,
    },
  })

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv2.id,
        senderId: aiko.id,
        content: 'Thank you so much for the session, Liam! I learned a lot about English idioms today.',
        readAt: new Date(now.getTime() - 20 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 22 * 3600 * 1000),
      },
      {
        conversationId: conv2.id,
        senderId: liam.id,
        content: "You're welcome, Aiko! Your English is already really good. The idioms will come naturally with practice.",
        readAt: new Date(now.getTime() - 18 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 20 * 3600 * 1000),
      },
      {
        conversationId: conv2.id,
        senderId: aiko.id,
        content: "I'll practice using them at work! Would you be available for another session next week?",
        readAt: new Date(now.getTime() - 16 * 3600 * 1000),
        createdAt: new Date(now.getTime() - 18 * 3600 * 1000),
      },
      {
        conversationId: conv2.id,
        senderId: liam.id,
        content: "Absolutely! I've added new availability slots. Feel free to book whenever works for you. 🤙",
        createdAt: new Date(now.getTime() - 16 * 3600 * 1000),
      },
    ],
  })

  console.log('✅ Seed completed successfully!')
  console.log(`   - ${allUsers.length} users created`)
  console.log(`   - ${teachers.length} teachers with availabilities`)
  console.log('   - 4 bookings (CONFIRMED, PENDING, CONFIRMED+COMPLETED, REJECTED)')
  console.log('   - 2 sessions (SCHEDULED, COMPLETED)')
  console.log('   - 2 conversations with messages')
  console.log('')
  console.log('📧 Login credentials (all users): password123')
  console.log('   Try: james.wilson@example.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
