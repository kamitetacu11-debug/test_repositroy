import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedAchievements } from '../src/modules/gamification/achievement.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create departments
  const [engineering, product, marketing] = await Promise.all([
    prisma.department.upsert({
      where: { name: 'Engineering' },
      update: {},
      create: { name: 'Engineering', description: 'Software Development Team' },
    }),
    prisma.department.upsert({
      where: { name: 'Product' },
      update: {},
      create: { name: 'Product', description: 'Product Management Team' },
    }),
    prisma.department.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: { name: 'Marketing', description: 'Marketing & Growth Team' },
    }),
  ]);

  console.log('✅ Departments created');

  // Create teams
  const [frontendTeam, backendTeam, mobileTeam] = await Promise.all([
    prisma.team.create({
      data: {
        name: 'Frontend Team',
        description: 'Web Frontend Development',
        departmentId: engineering.id,
      },
    }),
    prisma.team.create({
      data: {
        name: 'Backend Team',
        description: 'API & Infrastructure',
        departmentId: engineering.id,
      },
    }),
    prisma.team.create({
      data: {
        name: 'Mobile Team',
        description: 'iOS & Android Development',
        departmentId: engineering.id,
      },
    }),
  ]);

  console.log('✅ Teams created');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@taskmaster.io' },
    update: {},
    create: {
      email: 'admin@taskmaster.io',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      totalPoints: 10000,
      currentLevel: 15,
      currentRank: 'MASTER',
      experiencePoints: 45000,
    },
  });

  console.log('✅ Admin user created');

  // Create demo users
  const demoPassword = await bcrypt.hash('demo123', 12);
  const demoUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'john@taskmaster.io',
        passwordHash: demoPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'TEAM_LEAD',
        teamId: frontendTeam.id,
        departmentId: engineering.id,
        totalPoints: 5500,
        currentLevel: 10,
        currentRank: 'EXPERT',
        experiencePoints: 20000,
        streak: 15,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jane@taskmaster.io',
        passwordHash: demoPassword,
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'EMPLOYEE',
        teamId: backendTeam.id,
        departmentId: engineering.id,
        totalPoints: 3200,
        currentLevel: 7,
        currentRank: 'SPECIALIST',
        experiencePoints: 8000,
        streak: 7,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@taskmaster.io',
        passwordHash: demoPassword,
        firstName: 'Bob',
        lastName: 'Johnson',
        role: 'EMPLOYEE',
        teamId: frontendTeam.id,
        departmentId: engineering.id,
        totalPoints: 1800,
        currentLevel: 5,
        currentRank: 'APPRENTICE',
        experiencePoints: 3500,
        streak: 3,
      },
    }),
  ]);

  console.log('✅ Demo users created');

  // Create sample tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Implement user authentication',
        description: 'Add JWT-based authentication with refresh tokens',
        status: 'COMPLETED',
        priority: 'HIGH',
        basePoints: 50,
        creatorId: admin.id,
        assigneeId: demoUsers[1].id,
        teamId: backendTeam.id,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Design dashboard UI',
        description: 'Create wireframes and high-fidelity mockups for the main dashboard',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        basePoints: 40,
        creatorId: admin.id,
        assigneeId: demoUsers[0].id,
        teamId: frontendTeam.id,
        startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        status: 'TODO',
        priority: 'MEDIUM',
        basePoints: 30,
        creatorId: admin.id,
        assigneeId: demoUsers[1].id,
        teamId: backendTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Write API documentation',
        description: 'Document all REST endpoints with OpenAPI/Swagger',
        status: 'TODO',
        priority: 'LOW',
        basePoints: 20,
        creatorId: demoUsers[0].id,
        assigneeId: demoUsers[2].id,
        teamId: frontendTeam.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Implement leaderboard feature',
        description: 'Create real-time leaderboard with Redis sorted sets',
        status: 'TODO',
        priority: 'HIGH',
        basePoints: 60,
        creatorId: admin.id,
        teamId: backendTeam.id,
      },
    }),
  ]);

  console.log('✅ Sample tasks created');

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { name: 'bug' }, update: {}, create: { name: 'bug', color: '#EF4444' } }),
    prisma.tag.upsert({ where: { name: 'feature' }, update: {}, create: { name: 'feature', color: '#10B981' } }),
    prisma.tag.upsert({ where: { name: 'docs' }, update: {}, create: { name: 'docs', color: '#6366F1' } }),
    prisma.tag.upsert({ where: { name: 'urgent' }, update: {}, create: { name: 'urgent', color: '#F59E0B' } }),
    prisma.tag.upsert({ where: { name: 'refactor' }, update: {}, create: { name: 'refactor', color: '#8B5CF6' } }),
  ]);

  console.log('✅ Tags created');

  // Create quests
  await Promise.all([
    prisma.quest.create({
      data: {
        name: 'Weekly Sprint Champion',
        description: 'Complete 10 tasks this week',
        type: 'WEEKLY',
        target: 10,
        reward: 500,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.quest.create({
      data: {
        name: 'Daily Achiever',
        description: 'Complete 3 tasks today',
        type: 'DAILY',
        target: 3,
        reward: 100,
        startDate: new Date(),
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
    prisma.quest.create({
      data: {
        name: 'Monthly Marathon',
        description: 'Complete 50 tasks this month',
        type: 'MONTHLY',
        target: 50,
        reward: 2000,
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
      },
    }),
  ]);

  console.log('✅ Quests created');

  // Seed achievements
  await seedAchievements();
  console.log('✅ Achievements seeded');

  // Add some point transactions
  await Promise.all([
    prisma.pointTransaction.create({
      data: {
        userId: demoUsers[0].id,
        points: 100,
        type: 'TASK_COMPLETED',
        reason: 'Completed: Design login page',
      },
    }),
    prisma.pointTransaction.create({
      data: {
        userId: demoUsers[0].id,
        points: 50,
        type: 'STREAK',
        reason: '7-day streak bonus!',
      },
    }),
    prisma.pointTransaction.create({
      data: {
        userId: demoUsers[1].id,
        points: 150,
        type: 'ACHIEVEMENT',
        reason: 'Unlocked: Task Master',
      },
    }),
  ]);

  console.log('✅ Point transactions created');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Demo credentials:');
  console.log('   Admin: admin@taskmaster.io / admin123');
  console.log('   User:  john@taskmaster.io / demo123');
  console.log('   User:  jane@taskmaster.io / demo123');
  console.log('   User:  bob@taskmaster.io / demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
