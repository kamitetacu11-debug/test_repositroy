'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useCRMStore, useCRMHydration } from '@/stores/crm.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CustomerFormData {
  type: 'COMPANY' | 'INDIVIDUAL';
  name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  notes: string;
}

const initialFormData: CustomerFormData = {
  type: 'COMPANY',
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
};

export default function CustomersPage() {
  const router = useRouter();
  const t = useTranslation();
  const hasHydrated = useCRMHydration();

  // Get data from CRM store
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCRMStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    let filtered = [...customers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(query) ||
             c.email?.toLowerCase().includes(query) ||
             c.industry?.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(c => c.type === typeFilter);
    }

    return filtered;
  }, [customers, searchQuery, typeFilter]);

  const editingCustomer = editingCustomerId
    ? customers.find(c => c.id === editingCustomerId)
    : null;

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);

    if (editingCustomerId) {
      // Update existing customer
      updateCustomer(editingCustomerId, {
        type: formData.type,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        industry: formData.industry || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,
        notes: formData.notes || null,
      });
    } else {
      // Create new customer
      addCustomer({
        type: formData.type,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        website: formData.website || null,
        industry: formData.industry || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,
        notes: formData.notes || null,
      });
    }

    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingCustomerId(null);
    setSubmitting(false);
  };

  const handleEdit = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setEditingCustomerId(customerId);
    setFormData({
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
    setIsDialogOpen(true);
  };

  const handleDelete = (customerId: string) => {
    if (!confirm(t.crm.confirmDelete)) return;
    deleteCustomer(customerId);
  };

  const openNewDialog = () => {
    setEditingCustomerId(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/crm')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t.crm.customersTitle}</h1>
              <p className="text-muted-foreground">
                {t.crm.customersSubtitle}
              </p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                {t.crm.addCustomer}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? t.crm.editCustomer : t.crm.addNewCustomer}
                </DialogTitle>
                <DialogDescription>
                  {editingCustomer
                    ? t.crm.updateCustomerInfo
                    : t.crm.addCustomerToCRM}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.type}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: 'COMPANY' | 'INDIVIDUAL') =>
                        setFormData({ ...formData, type: value })
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
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder={t.crm.customerName}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.email}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.phone}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.website}</Label>
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.industry}</Label>
                    <Input
                      value={formData.industry}
                      onChange={(e) =>
                        setFormData({ ...formData, industry: e.target.value })
                      }
                      placeholder="Technology, Healthcare, etc."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.crm.address}</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder={t.crm.streetAddress}
                  />
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>{t.crm.city}</Label>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.state}</Label>
                    <Input
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.country}</Label>
                    <Input
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.crm.postalCode}</Label>
                    <Input
                      value={formData.postalCode}
                      onChange={(e) =>
                        setFormData({ ...formData, postalCode: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.crm.notes}</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder={t.crm.additionalNotes}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t.crm.cancel}
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting
                    ? t.crm.saving
                    : editingCustomer
                    ? t.crm.update
                    : t.crm.create}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t.crm.searchCustomers}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.crm.filterByType} />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">{t.crm.allTypes}</SelectItem>
                  <SelectItem value="COMPANY">{t.crm.companies}</SelectItem>
                  <SelectItem value="INDIVIDUAL">{t.crm.individuals}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.crm.customer}</TableHead>
                  <TableHead>{t.crm.contact}</TableHead>
                  <TableHead>{t.crm.industry}</TableHead>
                  <TableHead>{t.crm.location}</TableHead>
                  <TableHead>{t.crm.deals}</TableHead>
                  <TableHead>{t.crm.assignedTo}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t.crm.noCustomersFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(`/dashboard/crm/customers/${customer.id}`)
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-muted">
                            {customer.type === 'COMPANY' ? (
                              <Building2 className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <Badge variant="outline" className="text-xs">
                              {customer.type}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="h-3 w-3 text-muted-foreground" />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{customer.industry || '-'}</TableCell>
                      <TableCell>
                        {[customer.city, customer.country]
                          .filter(Boolean)
                          .join(', ') || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {customer._count?.deals || 0} deals
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.assignedTo
                          ? `${customer.assignedTo.firstName} ${customer.assignedTo.lastName}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(customer.id);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              {t.crm.edit}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(customer.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t.crm.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
