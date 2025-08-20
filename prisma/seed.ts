import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { phone: '+972501234567' },
    update: {},
    create: {
      phone: '+972501234567',
      language: 'he',
      storeMedia: false,
      preferences: {
        create: {
          goal: 'fat_loss',
          tone: 'friendly',
          reportTime: '21:30',
          reportFormat: 'text',
          focus: JSON.stringify(['protein', 'veggies']),
          thresholds: JSON.stringify({ lateHour: 21 }),
        },
      },
    },
    include: {
      preferences: true,
    },
  });

  // Create sample meals
  const sampleMeals = [
    {
      rawText: 'grilled chicken with salad and quinoa',
      tags: {
        protein: true,
        veggies: true,
        carbs: 'medium',
        junk: false,
        timeOfDay: 'noon',
      },
    },
    {
      rawText: 'pizza and coke',
      tags: {
        protein: false,
        veggies: false,
        carbs: 'high',
        junk: true,
        timeOfDay: 'evening',
      },
    },
    {
      rawText: 'omelette with vegetables',
      tags: {
        protein: true,
        veggies: true,
        carbs: 'low',
        junk: false,
        timeOfDay: 'morning',
      },
    },
  ];

  for (const mealData of sampleMeals) {
    await prisma.meal.create({
      data: {
        userId: demoUser.id,
        rawText: mealData.rawText,
        tags: JSON.stringify(mealData.tags),
        sourceType: 'TEXT',
      },
    });
  }

  console.log('Database seeded successfully!');
  console.log(`Demo user created: ${demoUser.phone}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 