'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  ArrowLeft,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Pencil,
  Trash2,
  Calendar,
  Briefcase,
  Activity,
} from 'lucide-react';

interface Customer {
  id: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  notes: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  _count: { deals: number; contacts: number };
  createdAt: string;
  updatedAt?: string;
}

// Demo data for when API returns 404
const demoCustomersBase: Record<string, Customer> = {
  'demo-1': {
    id: 'demo-1',
    type: 'COMPANY',
    name: 'TechCorp International',
    email: 'contact@techcorp.io',
    phone: '+1 (555) 123-4567',
    website: 'https://techcorp.io',
    industry: 'Technology',
    address: '123 Tech Street',
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
    postalCode: '94102',
    notes: 'Major enterprise client. Primary contact is John Smith, VP of Engineering.',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 3, contacts: 5 },
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-2': {
    id: 'demo-2',
    type: 'COMPANY',
    name: 'Global Finance Ltd',
    email: 'info@globalfinance.com',
    phone: '+1 (555) 234-5678',
    website: 'https://globalfinance.com',
    industry: 'Finance',
    address: '456 Wall Street',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    postalCode: '10005',
    notes: 'Financial services company. Interested in compliance solutions.',
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    _count: { deals: 2, contacts: 3 },
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-3': {
    id: 'demo-3',
    type: 'INDIVIDUAL',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+1 (555) 345-6789',
    website: null,
    industry: 'Consulting',
    address: '789 Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
    postalCode: '90028',
    notes: 'Independent consultant specializing in digital transformation.',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 1, contacts: 1 },
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-4': {
    id: 'demo-4',
    type: 'COMPANY',
    name: 'HealthPlus Medical',
    email: 'partners@healthplus.org',
    phone: '+1 (555) 456-7890',
    website: 'https://healthplus.org',
    industry: 'Healthcare',
    address: '321 Medical Center Dr',
    city: 'Boston',
    state: 'MA',
    country: 'USA',
    postalCode: '02114',
    notes: 'Healthcare provider network. Looking for EMR integration solutions.',
    assignedTo: null,
    _count: { deals: 4, contacts: 8 },
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-5': {
    id: 'demo-5',
    type: 'COMPANY',
    name: 'EcoGreen Solutions',
    email: 'business@ecogreen.co',
    phone: '+44 20 7123 4567',
    website: 'https://ecogreen.co',
    industry: 'Environmental',
    address: '10 Green Park',
    city: 'London',
    state: null,
    country: 'UK',
    postalCode: 'W1K 1AB',
    notes: 'Environmental consulting firm based in UK. Expanding to US market.',
    assignedTo: { id: 'user-2', firstName: 'Sarah', lastName: 'Johnson' },
    _count: { deals: 2, contacts: 4 },
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  'demo-6': {
    id: 'demo-6',
    type: 'INDIVIDUAL',
    name: 'Anna Schmidt',
    email: 'anna.schmidt@mail.de',
    phone: '+49 30 123456',
    website: null,
    industry: 'Marketing',
    address: 'Unter den Linden 15',
    city: 'Berlin',
    state: null,
    country: 'Germany',
    postalCode: '10117',
    notes: 'Marketing specialist. Interested in CRM and analytics tools.',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 1, contacts: 1 },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
};

// Create aliases for demo-customer-* IDs (used in deals page)
const demoCustomers: Record<string, Customer> = {
  ...demoCustomersBase,
  'demo-customer-1': demoCustomersBase['demo-1'],
  'demo-customer-2': demoCustomersBase['demo-2'],
  'demo-customer-3': demoCustomersBase['demo-3'],
  'demo-customer-4': demoCustomersBase['demo-4'],
  'demo-customer-5': demoCustomersBase['demo-5'],
  'demo-customer-6': demoCustomersBase['demo-6'],
};

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuthStore();
  const t = useTranslation();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    type: 'COMPANY' as 'COMPANY' | 'INDIVIDUAL',
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const fetchCustomer = async () => {
    setLoading(true);

    // Check if it's a demo customer (supports both 'demo-X' and 'demo-customer-X' formats)
    const isDemoCustomer = customerId.startsWith('demo-');
    if (isDemoCustomer) {
      const demoCustomer = demoCustomers[customerId];
      if (demoCustomer) {
        setCustomer(demoCustomer);
        setEditForm({
          type: demoCustomer.type,
          name: demoCustomer.name,
          email: demoCustomer.email || '',
          phone: demoCustomer.phone || '',
          website: demoCustomer.website || '',
          industry: demoCustomer.industry || '',
          address: demoCustomer.address || '',
          city: demoCustomer.city || '',
          state: demoCustomer.state || '',
          country: demoCustomer.country || '',
          postalCode: demoCustomer.postalCode || '',
          notes: demoCustomer.notes || '',
        });
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.data);
        setEditForm({
          type: data.data.type,
          name: data.data.name,
          email: data.data.email || '',
          phone: data.data.phone || '',
          website: data.data.website || '',
          industry: data.data.industry || '',
          address: data.data.address || '',
          city: data.data.city || '',
          state: data.data.state || '',
          country: data.data.country || '',
          postalCode: data.data.postalCode || '',
          notes: data.data.notes || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (customerId.startsWith('demo-')) {
      // For demo customers, just update local state
      if (customer) {
        const updatedCustomer = {
          ...customer,
          ...editForm,
          updatedAt: new Date().toISOString(),
        };
        setCustomer(updatedCustomer);
      }
      setIsEditDialogOpen(false);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/crm/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        fetchCustomer();
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Failed to update customer:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t.crm.confirmDelete)) return;

    if (customerId.startsWith('demo-')) {
      router.push('/dashboard/crm/customers');
      return;
    }

    try {
      const response = await fetch(`/api/v1/crm/customers/${customerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push('/dashboard/crm/customers');
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">{t.crm.loading}</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-muted-foreground">{t.crm.customerNotFound || 'Customer not found'}</div>
          <Button onClick={() => router.push('/dashboard/crm/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.crm.backToCustomers || 'Back to Customers'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const fullAddress = [customer.address, customer.city, customer.state, customer.postalCode, customer.country]
    .filter(Boolean)
    .join(', ');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/crm/customers')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  {customer.type === 'COMPANY' ? (
                    <Building2 className="h-6 w-6" />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{customer.name}</h1>
                  <Badge variant="outline">{customer.type}</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t.crm.edit}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t.crm.delete}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t.crm.contact || 'Contact Information'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                      {customer.phone}
                    </a>
                  </div>
                )}
                {customer.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {customer.website}
                    </a>
                  </div>
                )}
                {fullAddress && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{fullAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>{t.crm.notes}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  {t.crm.activity || 'Activity'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customer.updatedAt && (
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                        <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">{t.crm.lastUpdated || 'Last updated'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(customer.updatedAt)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                      <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">{t.crm.created || 'Created'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(customer.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t.crm.overview || 'Overview'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customer.industry && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t.crm.industry}</p>
                      <p className="font-semibold">{customer.industry}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{t.crm.assignedTo}</p>
                    <p className="font-semibold">
                      {customer.assignedTo
                        ? `${customer.assignedTo.firstName} ${customer.assignedTo.lastName}`
                        : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deals Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t.crm.deals}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-cosmic-purple">
                    {customer._count?.deals || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.crm.activeDeals || 'Active deals'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => router.push('/dashboard/crm/deals')}
                >
                  {t.crm.viewDeals || 'View Deals'}
                </Button>
              </CardContent>
            </Card>

            {/* Contacts Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t.crm.contacts || 'Contacts'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-cosmic-cyan">
                    {customer._count?.contacts || 0}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t.crm.totalContacts || 'Total contacts'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.crm.editCustomer}</DialogTitle>
            <DialogDescription>{t.crm.updateCustomerInfo}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.type}</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value: 'COMPANY' | 'INDIVIDUAL') =>
                    setEditForm({ ...editForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">{t.crm.company}</SelectItem>
                    <SelectItem value="INDIVIDUAL">{t.crm.individual}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.crm.name} *</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.email}</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.phone}</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.website}</Label>
                <Input
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.industry}</Label>
                <Input
                  value={editForm.industry}
                  onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.crm.address}</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t.crm.city}</Label>
                <Input
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.state}</Label>
                <Input
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.country}</Label>
                <Input
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.crm.postalCode}</Label>
                <Input
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.crm.notes}</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t.crm.cancel}
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={saving}>
              {saving ? t.crm.saving : t.crm.update}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
