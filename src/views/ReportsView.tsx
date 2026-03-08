import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, CheckCircle, Clock, Building2, Receipt } from 'lucide-react';
import { Card } from '../components/ui/card';
import { useCollection } from '../hooks/useFirestore';
import { Badge } from '../components/ui/badge';
import type { Invoice, Project, Team, Expense, Service, InvoiceItem } from '../types';

const ReportsView: React.FC = () => {
  // Fetch all invoices
  const { data: invoices, isPending: invoicesLoading } = useQuery('Invoice', {
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all projects
  const { data: projects, isPending: projectsLoading } = useQuery('Project');

  // Fetch all teams
  const { data: teams, isPending: teamsLoading } = useQuery('Team');

  // Fetch all expenses
  const { data: expenses, isPending: expensesLoading } = useQuery('Expense');

  // Fetch all services
  const { data: services } = useQuery('Service');

  // Fetch all invoice items
  const { data: invoiceItems } = useQuery('InvoiceItem');

  // Calculate revenue by department based on services in invoices
  const revenueByDepartment = useMemo(() => {
    if (!invoices || !invoiceItems || !services || !teams) return [];

    const departmentRevenue = new Map<string, { total: number; paid: number; pending: number; count: number }>();

    invoices.forEach((invoice) => {
      // Get all invoice items for this invoice
      const items = invoiceItems.filter(item => item.invoiceId === invoice.id);
      
      items.forEach((item) => {
        const service = services.find(s => s.id === item.serviceId);
        if (!service) return;

        // Determine department from service category
        let department = 'General';
        
        // Map service categories to departments
        if (service.category === 'SEO') {
          department = 'SEO';
        } else if (service.category === 'Web Design') {
          department = 'Web';
        } else if (service.category === 'Social Media Marketing') {
          department = 'Marketing';
        } else if (service.category === 'Content Writing') {
          department = 'Content';
        } else if (service.category === 'Branding') {
          department = 'Design';
        }

        const current = departmentRevenue.get(department) || { total: 0, paid: 0, pending: 0, count: 0 };
        
        current.total += item.totalPrice;
        current.count += 1;
        
        if (invoice.status === 'Paid') {
          current.paid += item.totalPrice;
        } else {
          current.pending += item.totalPrice;
        }

        departmentRevenue.set(department, current);
      });
    });

    return Array.from(departmentRevenue.entries())
      .map(([department, stats]) => ({
        department,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total);
  }, [invoices, invoiceItems, services, teams]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    if (!invoices) return 0;
    return invoices.reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const paidRevenue = useMemo(() => {
    if (!invoices) return 0;
    return invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  }, [invoices]);

  const totalExpenses = useMemo(() => {
    if (!expenses) return 0;
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expenses]);

  const profit = totalRevenue - totalExpenses;

  const isLoading = invoicesLoading || projectsLoading || teamsLoading || expensesLoading;
  const metrics = [
    {
      title: 'Të Ardhura Totale',
      value: isLoading ? '...' : `${totalRevenue.toLocaleString()} ALL`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-success',
      bgClass: 'metric-card-success',
      borderColor: 'border-l-success',
      subtitle: 'Nga faturat',
    },
    {
      title: 'Shpenzime Totale',
      value: isLoading ? '...' : `${totalExpenses.toLocaleString()} ALL`,
      change: '+8.2%',
      trend: 'up',
      icon: Receipt,
      color: 'text-error',
      bgClass: 'metric-card-error',
      borderColor: 'border-l-error',
      subtitle: 'Kosto operative',
    },
    {
      title: 'Fitimi Neto',
      value: isLoading ? '...' : `${profit.toLocaleString()} ALL`,
      change: profit >= 0 ? '+15.3%' : '-5.2%',
      trend: profit >= 0 ? 'up' : 'down',
      icon: TrendingUp,
      color: profit >= 0 ? 'text-success' : 'text-error',
      bgClass: profit >= 0 ? 'metric-card-success' : 'metric-card-error',
      borderColor: profit >= 0 ? 'border-l-success' : 'border-l-error',
      subtitle: 'Të ardhura - shpenzime',
    },
    {
      title: 'Projekte Aktive',
      value: isLoading ? '...' : String(projects?.filter(p => p.status === 'Active').length || 0),
      change: '+3',
      trend: 'up',
      icon: CheckCircle,
      color: 'text-primary',
      bgClass: 'metric-card-primary',
      borderColor: 'border-l-primary',
      subtitle: 'Në progres',
    },
  ];

  const recentActivity = [
    {
      id: '1',
      title: 'Website Redesign completed',
      time: '2 hours ago',
      type: 'success',
      image: 'https://c.animaapp.com/mmdo8or3AxO3EU/img/ai_1.png',
    },
    {
      id: '2',
      title: 'New lead added: TechCorp Inc.',
      time: '4 hours ago',
      type: 'info',
      image: 'https://c.animaapp.com/mmdo8or3AxO3EU/img/ai_3.png',
    },
    {
      id: '3',
      title: 'Marketing Campaign milestone reached',
      time: '1 day ago',
      type: 'success',
      image: 'https://c.animaapp.com/mmdo8or3AxO3EU/img/ai_2.png',
    },
    {
      id: '4',
      title: 'Q1 Report generated',
      time: '2 days ago',
      type: 'info',
      image: 'https://c.animaapp.com/mmdo8or3AxO3EU/img/ai_5.png',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          
          return (
            <Card key={metric.title} className={`p-6 space-y-3 card-hover ${metric.bgClass} border-l-4 ${metric.borderColor}`}>
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-muted-foreground">{metric.title}</p>
                <div className={`p-2 rounded-lg ${metric.color.replace('text-', 'bg-')}/10`}>
                  <Icon className={`w-5 h-5 ${metric.color}`} />
                </div>
              </div>
              <p className="text-h2 text-foreground font-medium animate-count-up">
                {metric.value}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                <div className={`flex items-center gap-1 text-body-sm ${
                  metric.trend === 'up' ? 'text-success' : 'text-error'
                }`}>
                  <TrendIcon className="w-3 h-3" />
                  <span className="text-xs font-medium">{metric.change}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-6">
          <h3 className="text-h3 text-foreground">Performanca e Projekteve</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground">Website Redesign</span>
                <span className="text-foreground font-medium">95%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary" style={{ width: '95%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground">CRM Integration</span>
                <span className="text-foreground font-medium">68%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-secondary" style={{ width: '68%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground">Marketing Campaign</span>
                <span className="text-foreground font-medium">82%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-accent" style={{ width: '82%' }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-foreground">Data Analytics</span>
                <span className="text-foreground font-medium">45%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-primary" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <h3 className="text-h3 text-foreground">Aktiviteti i Fundit</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                <img
                  src={activity.image}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                  loading="lazy"
                />
                <div className="flex-1 space-y-1">
                  <p className="text-body text-foreground">{activity.title}</p>
                  <p className="text-body-sm text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-h3 text-foreground">Të Ardhura sipas Departamentit</h3>
          <Badge variant="secondary">
            {revenueByDepartment.length} departamente
          </Badge>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Duke ngarkuar të dhënat...
          </div>
        ) : revenueByDepartment.length > 0 ? (
          <div className="space-y-4">
            {revenueByDepartment.map((dept) => {
              const paidPercentage = dept.total > 0 ? (dept.paid / dept.total) * 100 : 0;
              
              return (
                <div key={dept.department} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{dept.department}</span>
                      <Badge variant="outline" className="text-xs">
                        {dept.count} {dept.count === 1 ? 'faturë' : 'fatura'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        ${dept.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ${dept.paid.toLocaleString()} paguar · ${dept.pending.toLocaleString()} në pritje
                      </div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                      style={{ width: `${paidPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t mt-6 space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>Të Ardhura Totale</span>
                <span>{totalRevenue.toLocaleString()} ALL</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Paguar: {paidRevenue.toLocaleString()} ALL</span>
                <span>Në pritje: {(totalRevenue - paidRevenue).toLocaleString()} ALL</span>
              </div>
              <div className="flex items-center justify-between text-lg font-semibold border-t pt-3">
                <span>Shpenzime Totale</span>
                <span className="text-error">{totalExpenses.toLocaleString()} ALL</span>
              </div>
              <div className="flex items-center justify-between text-xl font-bold border-t pt-3">
                <span>Fitimi Neto</span>
                <span className={profit >= 0 ? 'text-success' : 'text-error'}>
                  {profit.toLocaleString()} ALL
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Nuk ka të dhëna. Krijoni fatura të lidhura me projekte dhe ekipe për të parë të ardhurat sipas departamentit.
          </div>
        )}
      </Card>
    </div>
  );
};

export default ReportsView;