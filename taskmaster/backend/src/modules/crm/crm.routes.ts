import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createCustomerSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']).default('COMPANY'),
  name: z.string().min(1).max(500),
  legalName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  annualRevenue: z.number().optional(),
  employeeCount: z.number().int().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

const updateCustomerSchema = createCustomerSchema.partial();

const createContactSchema = z.object({
  customerId: z.string(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().optional(),
  linkedIn: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const createPipelineSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
  stages: z.array(z.object({
    name: z.string(),
    color: z.string().optional(),
    sortOrder: z.number().int(),
    winProbability: z.number().int().min(0).max(100).optional(),
    isClosed: z.boolean().optional(),
    isWon: z.boolean().optional(),
  })).optional(),
});

const createDealSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  customerId: z.string(),
  contactId: z.string().optional(),
  pipelineId: z.string(),
  stageId: z.string(),
  amount: z.number().optional(),
  currency: z.string().length(3).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assignedToId: z.string().optional(),
});

const updateDealSchema = createDealSchema.partial();

const createActivitySchema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
  subject: z.string().min(1).max(500),
  description: z.string().optional(),
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().optional(),
  assignedToId: z.string().optional(),
});

// ============================================
// ROUTES
// ============================================

export async function crmRoutes(app: FastifyInstance) {
  // Auth middleware
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
      });
    }
  });

  // ==========================================
  // CUSTOMERS
  // ==========================================

  // List customers
  app.get('/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, search, type, assignedToId } = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      type?: string;
      assignedToId?: string;
    };

    const where: any = { isActive: true };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { deals: true, contacts: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  // Get customer by ID
  app.get('/customers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        deals: {
          include: {
            stage: true,
            pipeline: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
    }

    return reply.send({ success: true, data: customer });
  });

  // Create customer
  app.post('/customers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createCustomerSchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    const customer = await prisma.customer.create({
      data: {
        ...body,
        website: body.website || null,
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logger.info({ customerId: customer.id, createdBy: userId }, 'Customer created');

    return reply.status(201).send({ success: true, data: customer });
  });

  // Update customer
  app.put('/customers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateCustomerSchema.parse(request.body);

    const customer = await prisma.customer.update({
      where: { id },
      data: body,
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return reply.send({ success: true, data: customer });
  });

  // Delete customer
  app.delete('/customers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { userId, role } = request.user as { userId: string; role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    await prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ customerId: id, deletedBy: userId }, 'Customer deleted');

    return reply.send({ success: true, message: 'Customer deleted' });
  });

  // ==========================================
  // CONTACTS
  // ==========================================

  // List contacts for a customer
  app.get('/customers/:customerId/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request.params as { customerId: string };

    const contacts = await prisma.contact.findMany({
      where: { customerId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });

    return reply.send({ success: true, data: contacts });
  });

  // Create contact
  app.post('/contacts', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createContactSchema.parse(request.body);

    // If this is primary, unset other primaries
    if (body.isPrimary) {
      await prisma.contact.updateMany({
        where: { customerId: body.customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        ...body,
        linkedIn: body.linkedIn || null,
      },
    });

    return reply.status(201).send({ success: true, data: contact });
  });

  // Update contact
  app.put('/contacts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = createContactSchema.partial().parse(request.body);

    const contact = await prisma.contact.update({
      where: { id },
      data: body,
    });

    return reply.send({ success: true, data: contact });
  });

  // Delete contact
  app.delete('/contacts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    await prisma.contact.update({
      where: { id },
      data: { isActive: false },
    });

    return reply.send({ success: true, message: 'Contact deleted' });
  });

  // ==========================================
  // PIPELINES
  // ==========================================

  // List pipelines
  app.get('/pipelines', async (request: FastifyRequest, reply: FastifyReply) => {
    const pipelines = await prisma.pipeline.findMany({
      where: { isActive: true },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { deals: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    return reply.send({ success: true, data: pipelines });
  });

  // Get pipeline with deals
  app.get('/pipelines/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { sortOrder: 'asc' },
          include: {
            deals: {
              where: { status: 'OPEN' },
              include: {
                customer: { select: { id: true, name: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!pipeline) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pipeline not found' },
      });
    }

    return reply.send({ success: true, data: pipeline });
  });

  // Create pipeline with stages
  app.post('/pipelines', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createPipelineSchema.parse(request.body);
    const { userId, role } = request.user as { userId: string; role: string };

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(role)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
      });
    }

    // If this is default, unset other defaults
    if (body.isDefault) {
      await prisma.pipeline.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        name: body.name,
        description: body.description,
        isDefault: body.isDefault,
        stages: body.stages ? {
          create: body.stages.map((stage) => ({
            name: stage.name,
            color: stage.color || '#6366f1',
            sortOrder: stage.sortOrder,
            winProbability: stage.winProbability || 0,
            isClosed: stage.isClosed || false,
            isWon: stage.isWon || false,
          })),
        } : undefined,
      },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
      },
    });

    logger.info({ pipelineId: pipeline.id, createdBy: userId }, 'Pipeline created');

    return reply.status(201).send({ success: true, data: pipeline });
  });

  // ==========================================
  // DEALS
  // ==========================================

  // List deals
  app.get('/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, status, pipelineId, stageId, assignedToId, customerId } = request.query as {
      page?: number;
      limit?: number;
      status?: string;
      pipelineId?: string;
      stageId?: string;
      assignedToId?: string;
      customerId?: string;
    };

    const where: any = {};

    if (status) where.status = status;
    if (pipelineId) where.pipelineId = pipelineId;
    if (stageId) where.stageId = stageId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (customerId) where.customerId = customerId;

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          pipeline: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, color: true, winProbability: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      prisma.deal.count({ where }),
    ]);

    // Calculate totals
    const totals = await prisma.deal.aggregate({
      where,
      _sum: { amount: true },
      _count: true,
    });

    return reply.send({
      success: true,
      data: {
        deals,
        totals: {
          count: totals._count,
          amount: totals._sum.amount || 0,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  });

  // Get deal by ID
  app.get('/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        contact: true,
        pipeline: { include: { stages: { orderBy: { sortOrder: 'asc' } } } },
        stage: true,
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } },
        activities: {
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!deal) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deal not found' },
      });
    }

    return reply.send({ success: true, data: deal });
  });

  // Create deal
  app.post('/deals', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createDealSchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    const deal = await prisma.deal.create({
      data: {
        ...body,
        expectedCloseDate: body.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
      },
      include: {
        customer: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logger.info({ dealId: deal.id, createdBy: userId }, 'Deal created');

    return reply.status(201).send({ success: true, data: deal });
  });

  // Update deal
  app.put('/deals/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = updateDealSchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    const updateData: any = { ...body };
    if (body.expectedCloseDate) {
      updateData.expectedCloseDate = new Date(body.expectedCloseDate);
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logger.info({ dealId: id, updatedBy: userId }, 'Deal updated');

    return reply.send({ success: true, data: deal });
  });

  // Move deal to stage (drag & drop support)
  app.patch('/deals/:id/stage', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { stageId } = request.body as { stageId: string };
    const { userId } = request.user as { userId: string };

    // Get stage to check if it's closed/won
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: stageId },
    });

    if (!stage) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Stage not found' },
      });
    }

    const updateData: any = {
      stageId,
      probability: stage.winProbability,
    };

    // If stage is closed, update deal status
    if (stage.isClosed) {
      updateData.status = stage.isWon ? 'WON' : 'LOST';
      updateData.actualCloseDate = new Date();
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        stage: { select: { id: true, name: true, color: true } },
      },
    });

    logger.info({ dealId: id, newStageId: stageId, movedBy: userId }, 'Deal stage updated');

    return reply.send({ success: true, data: deal });
  });

  // ==========================================
  // ACTIVITIES
  // ==========================================

  // List activities
  app.get('/activities', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = 1, limit = 20, type, customerId, dealId, upcoming } = request.query as {
      page?: number;
      limit?: number;
      type?: string;
      customerId?: string;
      dealId?: string;
      upcoming?: string;
    };

    const where: any = {};

    if (type) where.type = type;
    if (customerId) where.customerId = customerId;
    if (dealId) where.dealId = dealId;
    if (upcoming === 'true') {
      where.scheduledAt = { gte: new Date() };
      where.isCompleted = false;
    }

    const activities = await prisma.activity.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: upcoming === 'true' ? { scheduledAt: 'asc' } : { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    return reply.send({ success: true, data: activities });
  });

  // Create activity
  app.post('/activities', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createActivitySchema.parse(request.body);
    const { userId } = request.user as { userId: string };

    const activity = await prisma.activity.create({
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        createdById: userId,
      },
      include: {
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logger.info({ activityId: activity.id, type: activity.type, createdBy: userId }, 'Activity created');

    return reply.status(201).send({ success: true, data: activity });
  });

  // Complete activity
  app.patch('/activities/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { outcome } = request.body as { outcome?: string };

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        outcome,
      },
    });

    return reply.send({ success: true, data: activity });
  });

  // ==========================================
  // DASHBOARD / ANALYTICS
  // ==========================================

  // CRM Dashboard stats
  app.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.user as { userId: string };

    const [
      customersCount,
      dealsOpen,
      dealsPipeline,
      activitiesUpcoming,
      recentDeals,
      dealsByStage,
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({ where: { isActive: true } }),

      // Open deals stats
      prisma.deal.aggregate({
        where: { status: 'OPEN' },
        _count: true,
        _sum: { amount: true },
      }),

      // Deals by pipeline
      prisma.deal.groupBy({
        by: ['pipelineId'],
        where: { status: 'OPEN' },
        _count: true,
        _sum: { amount: true },
      }),

      // Upcoming activities
      prisma.activity.count({
        where: {
          isCompleted: false,
          scheduledAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
          },
        },
      }),

      // Recent deals
      prisma.deal.findMany({
        where: { status: 'OPEN' },
        include: {
          customer: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, color: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Deals by stage for default pipeline
      prisma.pipelineStage.findMany({
        where: {
          pipeline: { isDefault: true },
        },
        include: {
          _count: { select: { deals: { where: { status: 'OPEN' } } } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        stats: {
          totalCustomers: customersCount,
          openDeals: dealsOpen._count,
          pipelineValue: dealsOpen._sum.amount || 0,
          upcomingActivities: activitiesUpcoming,
        },
        recentDeals,
        dealsByStage: dealsByStage.map(stage => ({
          stageId: stage.id,
          stageName: stage.name,
          stageColor: stage.color,
          count: stage._count.deals,
        })),
      },
    });
  });
}
