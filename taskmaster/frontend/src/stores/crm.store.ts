import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  winProbability: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
}

export interface Customer {
  id: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  address?: string | null;
  city: string | null;
  state?: string | null;
  country: string | null;
  postalCode?: string | null;
  notes?: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  _count: { deals: number; contacts: number };
  createdAt: string;
  updatedAt?: string;
}

export interface Deal {
  id: string;
  title: string;
  amount: number | null;
  status: 'OPEN' | 'WON' | 'LOST';
  probability: number;
  expectedCloseDate: string | null;
  notes: string | null;
  customer: { id: string; name: string };
  pipeline: { id: string; name: string };
  stage: { id: string; name: string; color: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Default demo data
const defaultPipeline: Pipeline = {
  id: 'demo-pipeline-1',
  name: 'Sales Pipeline',
  description: 'Main sales pipeline for tracking all deals',
  isDefault: true,
  stages: [
    { id: 'demo-stage-1', name: 'Lead', color: '#6B7280', sortOrder: 0, winProbability: 10 },
    { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6', sortOrder: 1, winProbability: 25 },
    { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B', sortOrder: 2, winProbability: 50 },
    { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6', sortOrder: 3, winProbability: 75 },
    { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981', sortOrder: 4, winProbability: 100 },
    { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444', sortOrder: 5, winProbability: 0 },
  ],
  createdAt: new Date().toISOString(),
};

const defaultCustomers: Customer[] = [
  {
    id: 'demo-customer-1',
    type: 'COMPANY',
    name: 'TechCorp International',
    email: 'contact@techcorp.io',
    phone: '+1 (555) 123-4567',
    website: 'https://techcorp.io',
    industry: 'Technology',
    city: 'San Francisco',
    country: 'USA',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 3, contacts: 5 },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-customer-2',
    type: 'COMPANY',
    name: 'Global Finance Ltd',
    email: 'info@globalfinance.com',
    phone: '+1 (555) 234-5678',
    website: 'https://globalfinance.com',
    industry: 'Finance',
    city: 'New York',
    country: 'USA',
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    _count: { deals: 2, contacts: 3 },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-customer-3',
    type: 'INDIVIDUAL',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 345-6789',
    website: null,
    industry: 'Consulting',
    city: 'Los Angeles',
    country: 'USA',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 1, contacts: 1 },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-customer-4',
    type: 'COMPANY',
    name: 'HealthPlus Medical',
    email: 'partners@healthplus.org',
    phone: '+1 (555) 456-7890',
    website: 'https://healthplus.org',
    industry: 'Healthcare',
    city: 'Boston',
    country: 'USA',
    assignedTo: null,
    _count: { deals: 4, contacts: 8 },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-customer-5',
    type: 'COMPANY',
    name: 'EcoGreen Solutions',
    email: 'business@ecogreen.co',
    phone: '+44 20 7123 4567',
    website: 'https://ecogreen.co',
    industry: 'Environmental',
    city: 'London',
    country: 'UK',
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    _count: { deals: 2, contacts: 4 },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-customer-6',
    type: 'COMPANY',
    name: 'StartupHub Inc',
    email: 'hello@startuphub.io',
    phone: '+1 (555) 567-8901',
    website: 'https://startuphub.io',
    industry: 'Technology',
    city: 'Austin',
    country: 'USA',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 1, contacts: 2 },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const defaultDeals: Deal[] = [
  {
    id: 'demo-deal-1',
    title: 'Enterprise Software License',
    amount: 150000,
    status: 'OPEN',
    probability: 50,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Large enterprise deal with potential for expansion',
    customer: { id: 'demo-customer-1', name: 'TechCorp International' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-3', name: 'Proposal', color: '#F59E0B' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-2',
    title: 'Financial Consulting Package',
    amount: 85000,
    status: 'OPEN',
    probability: 25,
    expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    notes: null,
    customer: { id: 'demo-customer-2', name: 'Global Finance Ltd' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-2', name: 'Qualified', color: '#3B82F6' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-3',
    title: 'Healthcare Platform Implementation',
    amount: 250000,
    status: 'OPEN',
    probability: 75,
    expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Final negotiations in progress',
    customer: { id: 'demo-customer-4', name: 'HealthPlus Medical' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-4', name: 'Negotiation', color: '#8B5CF6' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-4',
    title: 'Green Energy Audit',
    amount: 35000,
    status: 'OPEN',
    probability: 10,
    expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Initial contact made',
    customer: { id: 'demo-customer-5', name: 'EcoGreen Solutions' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-1', name: 'Lead', color: '#6B7280' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-5',
    title: 'Startup Accelerator Program',
    amount: 120000,
    status: 'WON',
    probability: 100,
    expectedCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Deal closed successfully!',
    customer: { id: 'demo-customer-6', name: 'StartupHub Inc' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-5', name: 'Closed Won', color: '#10B981' },
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-deal-6',
    title: 'Retail POS System',
    amount: 45000,
    status: 'LOST',
    probability: 0,
    expectedCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'Lost to competitor',
    customer: { id: 'demo-customer-3', name: 'Michael Chen' },
    pipeline: { id: 'demo-pipeline-1', name: 'Sales Pipeline' },
    stage: { id: 'demo-stage-6', name: 'Closed Lost', color: '#EF4444' },
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface CRMState {
  pipelines: Pipeline[];
  customers: Customer[];
  deals: Deal[];
  _hasHydrated: boolean;

  // Pipeline actions
  addPipeline: (pipeline: Omit<Pipeline, 'id' | 'createdAt'>) => Pipeline;
  updatePipeline: (id: string, data: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;

  // Customer actions
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | '_count' | 'assignedTo'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Deal actions
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => Deal;
  updateDeal: (id: string, data: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  moveDealToStage: (dealId: string, stageId: string, pipelineId: string) => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      pipelines: [defaultPipeline],
      customers: defaultCustomers,
      deals: defaultDeals,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

      // Pipeline actions
      addPipeline: (pipelineData) => {
        const newPipeline: Pipeline = {
          ...pipelineData,
          id: `pipeline-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          pipelines: [...state.pipelines, newPipeline],
        }));
        return newPipeline;
      },

      updatePipeline: (id, data) => {
        set((state) => ({
          pipelines: state.pipelines.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        }));
      },

      deletePipeline: (id) => {
        set((state) => ({
          pipelines: state.pipelines.filter((p) => p.id !== id),
          deals: state.deals.filter((d) => d.pipeline.id !== id),
        }));
      },

      // Customer actions
      addCustomer: (customerData) => {
        const newCustomer: Customer = {
          ...customerData,
          id: `customer-${Date.now()}`,
          assignedTo: null,
          _count: { deals: 0, contacts: 0 },
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          customers: [newCustomer, ...state.customers],
        }));
        return newCustomer;
      },

      updateCustomer: (id, data) => {
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        }));
      },

      deleteCustomer: (id) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      // Deal actions
      addDeal: (dealData) => {
        const newDeal: Deal = {
          ...dealData,
          id: `deal-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          deals: [newDeal, ...state.deals],
        }));

        // Update customer deal count
        const customer = get().customers.find((c) => c.id === dealData.customer.id);
        if (customer) {
          get().updateCustomer(customer.id, {
            _count: { ...customer._count, deals: customer._count.deals + 1 },
          });
        }

        return newDeal;
      },

      updateDeal: (id, data) => {
        set((state) => ({
          deals: state.deals.map((d) =>
            d.id === id ? { ...d, ...data, updatedAt: new Date().toISOString() } : d
          ),
        }));
      },

      deleteDeal: (id) => {
        const deal = get().deals.find((d) => d.id === id);
        set((state) => ({
          deals: state.deals.filter((d) => d.id !== id),
        }));

        // Update customer deal count
        if (deal) {
          const customer = get().customers.find((c) => c.id === deal.customer.id);
          if (customer && customer._count.deals > 0) {
            get().updateCustomer(customer.id, {
              _count: { ...customer._count, deals: customer._count.deals - 1 },
            });
          }
        }
      },

      moveDealToStage: (dealId, stageId, pipelineId) => {
        const pipeline = get().pipelines.find((p) => p.id === pipelineId);
        const stage = pipeline?.stages.find((s) => s.id === stageId);
        if (stage) {
          set((state) => ({
            deals: state.deals.map((d) =>
              d.id === dealId
                ? {
                    ...d,
                    stage: { id: stage.id, name: stage.name, color: stage.color },
                    probability: stage.winProbability,
                    status: stage.winProbability === 100 ? 'WON' : stage.winProbability === 0 ? 'LOST' : 'OPEN',
                    updatedAt: new Date().toISOString(),
                  }
                : d
            ),
          }));
        }
      },
    }),
    {
      name: 'crm-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);

// Hook to wait for hydration
export const useCRMHydration = () => {
  return useCRMStore((state) => state._hasHydrated);
};
