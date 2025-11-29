'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAuthStore } from '@/stores/auth.store';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Plus,
  Search,
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Customer {
  id: string;
  type: 'COMPANY' | 'INDIVIDUAL';
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  _count: { deals: number; contacts: number };
  createdAt: string;
}

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

// Demo data for better UX when database is empty
const demoCustomers: Customer[] = [
  {
    id: 'demo-1',
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
    id: 'demo-2',
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
    id: 'demo-3',
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
    id: 'demo-4',
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
    id: 'demo-5',
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
    id: 'demo-6',
    type: 'INDIVIDUAL',
    name: 'Anna Schmidt',
    email: 'anna.schmidt@mail.de',
    phone: '+49 30 123456',
    website: null,
    industry: 'Marketing',
    city: 'Berlin',
    country: 'Germany',
    assignedTo: { id: 'user-1', firstName: 'John', lastName: 'Smith' },
    _count: { deals: 1, contacts: 1 },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function CustomersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const t = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, typeFilter]);

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/v1/crm/customers?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fetchedCustomers = data.data || [];

        // Use demo data if API returns empty
        if (fetchedCustomers.length === 0 && !searchQuery && typeFilter === 'all') {
          setCustomers(demoCustomers);
        } else if (fetchedCustomers.length === 0) {
          // Filter demo data based on search/filter criteria
          let filteredDemo = [...demoCustomers];
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filteredDemo = filteredDemo.filter(
              c => c.name.toLowerCase().includes(query) ||
                   c.email?.toLowerCase().includes(query) ||
                   c.industry?.toLowerCase().includes(query)
            );
          }
          if (typeFilter !== 'all') {
            filteredDemo = filteredDemo.filter(c => c.type === typeFilter);
          }
          setCustomers(filteredDemo);
        } else {
          setCustomers(fetchedCustomers);
        }
      } else {
        // Fallback to demo data on error
        setCustomers(demoCustomers);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      // Fallback to demo data on error
      setCustomers(demoCustomers);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const url = editingCustomer
        ? `/api/v1/crm/customers/${editingCustomer.id}`
        : '/api/v1/crm/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsDialogOpen(false);
        setFormData(initialFormData);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to save customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      type: customer.type,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      website: customer.website || '',
      industry: customer.industry || '',
      address: '',
      city: customer.city || '',
      state: '',
      country: customer.country || '',
      postalCode: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm(t.crm.confirmDelete)) return;

    try {
      const response = await fetch(`/api/v1/crm/customers/${customerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchCustomers();
      }
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const openNewDialog = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

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
                <SelectContent>
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {t.crm.loading}
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      {t.crm.noCustomersFound}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
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
                                handleEdit(customer);
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
