import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedAchievements } from '../src/modules/gamification/achievement.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean up existing data (for re-runs) - order matters due to foreign keys
  console.log('🧹 Cleaning existing seed data...');
  await prisma.activity.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.pipelineStage.deleteMany({});
  await prisma.pipeline.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.pointTransaction.deleteMany({});
  await prisma.questProgress.deleteMany({});
  await prisma.quest.deleteMany({});
  await prisma.taskTag.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.task.deleteMany({});
  console.log('✅ Cleanup complete');

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

  // Create teams (find existing or create new)
  let frontendTeam = await prisma.team.findFirst({ where: { name: 'Frontend Team' } });
  let backendTeam = await prisma.team.findFirst({ where: { name: 'Backend Team' } });
  let mobileTeam = await prisma.team.findFirst({ where: { name: 'Mobile Team' } });

  if (!frontendTeam) {
    frontendTeam = await prisma.team.create({
      data: { name: 'Frontend Team', description: 'Web Frontend Development', departmentId: engineering.id },
    });
  }
  if (!backendTeam) {
    backendTeam = await prisma.team.create({
      data: { name: 'Backend Team', description: 'API & Infrastructure', departmentId: engineering.id },
    });
  }
  if (!mobileTeam) {
    mobileTeam = await prisma.team.create({
      data: { name: 'Mobile Team', description: 'iOS & Android Development', departmentId: engineering.id },
    });
  }

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

  // Create demo users (upsert to handle re-runs)
  const demoPassword = await bcrypt.hash('demo123', 12);
  const demoUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john@taskmaster.io' },
      update: { teamId: frontendTeam.id, departmentId: engineering.id },
      create: {
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
    prisma.user.upsert({
      where: { email: 'jane@taskmaster.io' },
      update: { teamId: backendTeam.id, departmentId: engineering.id },
      create: {
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
    prisma.user.upsert({
      where: { email: 'bob@taskmaster.io' },
      update: { teamId: frontendTeam.id, departmentId: engineering.id },
      create: {
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

  // ========== CRM Data ==========
  console.log('📊 Creating CRM data...');

  // Create Customers (Companies)
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: 'TechCorp Solutions',
        legalName: 'TechCorp Solutions Inc.',
        email: 'contact@techcorp.io',
        phone: '+1 (555) 123-4567',
        website: 'https://techcorp.io',
        industry: 'Technology',
        address: '123 Innovation Drive',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94105',
        annualRevenue: 5000000,
        employeeCount: 150,
        source: 'Website',
        assignedToId: demoUsers[0].id,
        notes: 'Enterprise client interested in full platform integration',
        tags: ['enterprise', 'tech', 'priority'],
      },
    }),
    prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: 'Global Retail Group',
        legalName: 'Global Retail Group LLC',
        email: 'partnerships@globalretail.com',
        phone: '+1 (555) 234-5678',
        website: 'https://globalretail.com',
        industry: 'Retail',
        address: '456 Commerce Blvd',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10001',
        annualRevenue: 25000000,
        employeeCount: 500,
        source: 'Referral',
        assignedToId: demoUsers[1].id,
        notes: 'Looking for inventory management solution',
        tags: ['retail', 'enterprise'],
      },
    }),
    prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: 'HealthFirst Medical',
        email: 'info@healthfirst.med',
        phone: '+1 (555) 345-6789',
        website: 'https://healthfirst.med',
        industry: 'Healthcare',
        address: '789 Medical Center Way',
        city: 'Boston',
        state: 'MA',
        country: 'USA',
        postalCode: '02101',
        annualRevenue: 15000000,
        employeeCount: 300,
        source: 'Conference',
        assignedToId: demoUsers[0].id,
        tags: ['healthcare', 'compliance'],
      },
    }),
    prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: 'StartupHub Inc',
        email: 'hello@startuphub.co',
        phone: '+1 (555) 456-7890',
        website: 'https://startuphub.co',
        industry: 'Technology',
        address: '321 Startup Lane',
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        postalCode: '78701',
        annualRevenue: 1000000,
        employeeCount: 25,
        source: 'Website',
        assignedToId: demoUsers[2].id,
        tags: ['startup', 'tech', 'growth'],
      },
    }),
    prisma.customer.create({
      data: {
        type: 'INDIVIDUAL',
        name: 'John Williams',
        email: 'john.williams@email.com',
        phone: '+1 (555) 567-8901',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        source: 'LinkedIn',
        assignedToId: demoUsers[1].id,
        notes: 'Consultant looking for team collaboration tools',
        tags: ['individual', 'consultant'],
      },
    }),
    prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: 'EduTech Academy',
        email: 'admin@edutech.edu',
        phone: '+1 (555) 678-9012',
        website: 'https://edutech.edu',
        industry: 'Education',
        address: '567 Learning Ave',
        city: 'Seattle',
        state: 'WA',
        country: 'USA',
        postalCode: '98101',
        annualRevenue: 3000000,
        employeeCount: 75,
        source: 'Webinar',
        assignedToId: demoUsers[0].id,
        tags: ['education', 'saas'],
      },
    }),
  ]);

  console.log('✅ CRM Customers created');

  // Create Contacts for customers
  await Promise.all([
    prisma.contact.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Chen',
        email: 'sarah.chen@techcorp.io',
        phone: '+1 (555) 123-4568',
        position: 'CTO',
        department: 'Engineering',
        customerId: customers[0].id,
        isPrimary: true,
        linkedIn: 'https://linkedin.com/in/sarahchen',
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Michael',
        lastName: 'Roberts',
        email: 'michael.r@techcorp.io',
        phone: '+1 (555) 123-4569',
        position: 'VP of Engineering',
        department: 'Engineering',
        customerId: customers[0].id,
        isPrimary: false,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Emma',
        lastName: 'Thompson',
        email: 'emma.t@globalretail.com',
        phone: '+1 (555) 234-5679',
        position: 'Head of Operations',
        department: 'Operations',
        customerId: customers[1].id,
        isPrimary: true,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@healthfirst.med',
        phone: '+1 (555) 345-6790',
        position: 'IT Director',
        department: 'IT',
        customerId: customers[2].id,
        isPrimary: true,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Alex',
        lastName: 'Martinez',
        email: 'alex@startuphub.co',
        phone: '+1 (555) 456-7891',
        position: 'CEO',
        department: 'Executive',
        customerId: customers[3].id,
        isPrimary: true,
      },
    }),
  ]);

  console.log('✅ CRM Contacts created');

  // Create Sales Pipeline
  const salesPipeline = await prisma.pipeline.create({
    data: {
      name: 'Sales Pipeline',
      description: 'Main sales pipeline for tracking deals',
      isDefault: true,
      stages: {
        create: [
          { name: 'Lead', color: '#6366f1', sortOrder: 0, winProbability: 10 },
          { name: 'Qualified', color: '#8b5cf6', sortOrder: 1, winProbability: 25 },
          { name: 'Proposal', color: '#a855f7', sortOrder: 2, winProbability: 50 },
          { name: 'Negotiation', color: '#d946ef', sortOrder: 3, winProbability: 75 },
          { name: 'Closed Won', color: '#22c55e', sortOrder: 4, winProbability: 100, isClosed: true, isWon: true },
          { name: 'Closed Lost', color: '#ef4444', sortOrder: 5, winProbability: 0, isClosed: true, isWon: false },
        ],
      },
    },
    include: { stages: true },
  });

  console.log('✅ CRM Pipeline created');

  // Create Deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: 'Enterprise Platform License',
        description: 'Full enterprise platform license for 500 users',
        amount: 150000,
        currency: 'USD',
        probability: 75,
        status: 'OPEN',
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        customerId: customers[0].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[3].id, // Negotiation
        assignedToId: demoUsers[0].id,
        source: 'Inbound',
        tags: ['enterprise', 'annual'],
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Inventory Management System',
        description: 'Custom inventory management implementation',
        amount: 85000,
        currency: 'USD',
        probability: 50,
        status: 'OPEN',
        expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        customerId: customers[1].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[2].id, // Proposal
        assignedToId: demoUsers[1].id,
        source: 'Referral',
        tags: ['implementation', 'custom'],
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Healthcare Compliance Package',
        description: 'HIPAA-compliant solution package',
        amount: 200000,
        currency: 'USD',
        probability: 25,
        status: 'OPEN',
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        customerId: customers[2].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[1].id, // Qualified
        assignedToId: demoUsers[0].id,
        source: 'Conference',
        tags: ['healthcare', 'compliance'],
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Startup Growth Plan',
        description: 'Scalable solution for growing startup',
        amount: 25000,
        currency: 'USD',
        probability: 10,
        status: 'OPEN',
        expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        customerId: customers[3].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[0].id, // Lead
        assignedToId: demoUsers[2].id,
        source: 'Website',
        tags: ['startup', 'growth'],
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Consulting Services Package',
        description: 'Personal productivity tools subscription',
        amount: 5000,
        currency: 'USD',
        probability: 100,
        status: 'WON',
        expectedCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        actualCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        customerId: customers[4].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[4].id, // Closed Won
        assignedToId: demoUsers[1].id,
        source: 'LinkedIn',
        tags: ['consulting', 'won'],
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Educational Platform License',
        description: 'E-learning platform for educational institution',
        amount: 45000,
        currency: 'USD',
        probability: 50,
        status: 'OPEN',
        expectedCloseDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        customerId: customers[5].id,
        pipelineId: salesPipeline.id,
        stageId: salesPipeline.stages[2].id, // Proposal
        assignedToId: demoUsers[0].id,
        source: 'Webinar',
        tags: ['education', 'saas'],
      },
    }),
  ]);

  console.log('✅ CRM Deals created');

  // Create Activities
  await Promise.all([
    prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Initial discovery call',
        description: 'Discussed requirements and timeline for enterprise implementation',
        customerId: customers[0].id,
        dealId: deals[0].id,
        createdById: demoUsers[0].id,
        scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        durationMinutes: 45,
        outcome: 'Positive - moving to proposal stage',
        isCompleted: true,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'MEETING',
        subject: 'Technical requirements review',
        description: 'Deep dive into technical requirements with CTO',
        customerId: customers[0].id,
        dealId: deals[0].id,
        createdById: demoUsers[0].id,
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        durationMinutes: 90,
        isCompleted: false,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'EMAIL',
        subject: 'Sent proposal document',
        description: 'Sent detailed proposal with pricing options',
        customerId: customers[1].id,
        dealId: deals[1].id,
        createdById: demoUsers[1].id,
        scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isCompleted: true,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'CALL',
        subject: 'Follow-up call scheduled',
        description: 'Discuss proposal feedback and next steps',
        customerId: customers[1].id,
        dealId: deals[1].id,
        createdById: demoUsers[1].id,
        scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        durationMinutes: 30,
        isCompleted: false,
      },
    }),
    prisma.activity.create({
      data: {
        type: 'NOTE',
        subject: 'Compliance requirements noted',
        description: 'Client requires HIPAA certification and SOC2 compliance documentation',
        customerId: customers[2].id,
        dealId: deals[2].id,
        createdById: demoUsers[0].id,
        isCompleted: true,
        completedAt: new Date(),
      },
    }),
    prisma.activity.create({
      data: {
        type: 'TASK',
        subject: 'Prepare demo environment',
        description: 'Set up demo environment for StartupHub presentation',
        customerId: customers[3].id,
        dealId: deals[3].id,
        createdById: demoUsers[2].id,
        assignedToId: demoUsers[2].id,
        scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        isCompleted: false,
      },
    }),
  ]);

  console.log('✅ CRM Activities created');
  console.log('📊 CRM data seeding complete!');

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
