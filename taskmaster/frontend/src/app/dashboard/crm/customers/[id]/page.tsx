'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useCRMStore, useCRMHydration } from '@/stores/crm.store';
import { useSettingsStore } from '@/stores/settings.store';
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
  Loader2,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const t = useTranslation();
  const hasHydrated = useCRMHydration();
  const { getCurrentTheme } = useSettingsStore();
  const theme = getCurrentTheme();
  const customerId = params.id as string;

  // Get data from CRM store
  const { customers, deals, updateCustomer, deleteCustomer } = useCRMStore();

  // Find customer from store
  const customer = useMemo(() => {
    return customers.find(c => c.id === customerId) || null;
  }, [customers, customerId]);

  // Count deals for this customer
  const customerDealsCount = useMemo(() => {
    return deals.filter(d => d.customer.id === customerId).length;
  }, [deals, customerId]);

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

  // Update edit form when customer changes
  useEffect(() => {
    if (customer) {
      setEditForm({
        type: customer.type,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        website: customer.website || '',
        industry: customer.industry || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        country: customer.country || '',
        postalCode: customer.postalCode || '',
        notes: customer.notes || '',
      });
    }
  }, [customer]);

  const handleUpdateCustomer = () => {
    if (!customer) return;
    setSaving(true);

    updateCustomer(customerId, {
      type: editForm.type,
      name: editForm.name,
      email: editForm.email || null,
      phone: editForm.phone || null,
      website: editForm.website || null,
      industry: editForm.industry || null,
      address: editForm.address || null,
      city: editForm.city || null,
      state: editForm.state || null,
      country: editForm.country || null,
      postalCode: editForm.postalCode || null,
      notes: editForm.notes || null,
    });

    setIsEditDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = () => {
    if (!confirm(t.crm.confirmDelete)) return;
    deleteCustomer(customerId);
    router.push('/dashboard/crm/customers');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Show loading until hydrated
  if (!hasHydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-cosmic-purple" />
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
                  <div className="text-4xl font-bold" style={{ color: theme.colors.primary }}>
                    {customerDealsCount}
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
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-2xl glass"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background}f0 0%, ${theme.colors.background}e0 100%)`,
            borderColor: `${theme.colors.primary}40`,
            boxShadow: `0 0 40px ${theme.colors.glow1}, 0 0 80px ${theme.colors.glow2}`
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: theme.colors.primary }}>{t.crm.editCustomer}</DialogTitle>
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
            <Button
              onClick={handleUpdateCustomer}
              disabled={saving}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                border: 'none'
              }}
            >
              {saving ? t.crm.saving : t.crm.update}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
