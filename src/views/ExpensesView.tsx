import React, { useState } from 'react';
import { useCollection, useMutation } from '../hooks/useFirestore';
import { DollarSign, Plus, Calendar as CalendarIcon, Building2, Repeat } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Switch } from '../components/ui/switch';
import type { Expense, Team } from '../types';

const ExpensesView: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: expenses, isPending: expensesLoading } = useQuery('Expense', {
    orderBy: { createdAt: 'desc' }
  });
  const { data: teams } = useQuery('Team');
  const expenseMutation = useMutation('Expense');

  const handleCreateExpense = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const currency = formData.get('currency') as string;
    const category = formData.get('category') as string;
    const departmentId = formData.get('departmentId') as string;
    const isRecurring = formData.get('isRecurring') === 'true';
    const recurringFrequency = formData.get('recurringFrequency') as string;
    const nextRecurringDate = formData.get('nextRecurringDate') as string;
    const status = formData.get('status') as string;
    const paidDate = formData.get('paidDate') as string;

    await expenseMutation.create({
      title,
      description: description || undefined,
      amount,
      currency: currency || 'ALL',
      category,
      departmentId: departmentId || undefined,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      nextRecurringDate: isRecurring && nextRecurringDate ? new Date(nextRecurringDate) : undefined,
      status: status || 'Active',
      paidDate: paidDate ? new Date(paidDate) : undefined,
    });

    setIsCreateDialogOpen(false);
  };

  const handleUpdateExpense = async (formData: FormData) => {
    if (!selectedExpense) return;

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const currency = formData.get('currency') as string;
    const category = formData.get('category') as string;
    const departmentId = formData.get('departmentId') as string;
    const isRecurring = formData.get('isRecurring') === 'true';
    const recurringFrequency = formData.get('recurringFrequency') as string;
    const nextRecurringDate = formData.get('nextRecurringDate') as string;
    const status = formData.get('status') as string;
    const paidDate = formData.get('paidDate') as string;

    await expenseMutation.update(selectedExpense.id, {
      title,
      description: description || undefined,
      amount,
      currency: currency || 'ALL',
      category,
      departmentId: departmentId || undefined,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : undefined,
      nextRecurringDate: isRecurring && nextRecurringDate ? new Date(nextRecurringDate) : undefined,
      status: status || 'Active',
      paidDate: paidDate ? new Date(paidDate) : undefined,
    });

    setIsEditDialogOpen(false);
    setSelectedExpense(null);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      await expenseMutation.remove(id);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Salary':
        return 'bg-blue-100 text-blue-800';
      case 'Rent':
        return 'bg-purple-100 text-purple-800';
      case 'Utilities':
        return 'bg-yellow-100 text-yellow-800';
      case 'Office':
        return 'bg-green-100 text-green-800';
      case 'Hosting':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalExpenses = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const activeExpenses = expenses?.filter(e => e.status === 'Active').length || 0;
  const recurringExpenses = expenses?.filter(e => e.isRecurring).length || 0;

  if (expensesLoading) {
    return <div className="flex items-center justify-center h-96">Loading expenses...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h2 text-foreground">Expenses</h1>
          <p className="text-body text-muted-foreground mt-1">
            {expenses?.length || 0} total expenses · {activeExpenses} active · {recurringExpenses} recurring
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSubmit={handleCreateExpense} teams={teams || []} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Total Expenses</p>
            <DollarSign className="w-5 h-5 text-error" />
          </div>
          <p className="text-h2 text-foreground font-medium">
            {totalExpenses.toLocaleString()} ALL
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Active Expenses</p>
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <p className="text-h2 text-foreground font-medium">
            {activeExpenses}
          </p>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-body-sm text-muted-foreground">Recurring</p>
            <Repeat className="w-5 h-5 text-tertiary" />
          </div>
          <p className="text-h2 text-foreground font-medium">
            {recurringExpenses}
          </p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Expense
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Department
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Recurring
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-body-sm font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses?.map((expense) => {
                const team = teams?.find(t => t.id === expense.departmentId);
                
                return (
                  <tr
                    key={expense.id}
                    className="hover:bg-muted/50 transition-colors duration-fast"
                  >
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-body font-normal text-foreground">{expense.title}</p>
                        {expense.description && (
                          <p className="text-body-sm text-muted-foreground line-clamp-1">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="text-body font-semibold text-foreground">
                          {expense.amount.toLocaleString()}
                        </span>
                        <span className="text-body-sm text-muted-foreground">
                          {expense.currency}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body text-foreground">
                      {team ? team.name : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {expense.isRecurring ? (
                        <div className="flex items-center gap-2">
                          <Repeat className="w-4 h-4 text-tertiary" />
                          <span className="text-body-sm text-foreground">
                            {expense.recurringFrequency}
                          </span>
                        </div>
                      ) : (
                        <span className="text-body-sm text-muted-foreground">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={expense.status === 'Active' ? 'default' : 'secondary'}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {selectedExpense && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSubmit={handleUpdateExpense} teams={teams || []} initialData={selectedExpense} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const ExpenseForm: React.FC<{
  onSubmit: (data: FormData) => void;
  teams: Team[];
  initialData?: Expense;
}> = ({ onSubmit, teams, initialData }) => {
  const [isRecurring, setIsRecurring] = useState(initialData?.isRecurring || false);
  const [nextRecurringDate, setNextRecurringDate] = useState<Date | undefined>(
    initialData?.nextRecurringDate ? new Date(initialData.nextRecurringDate) : undefined
  );
  const [paidDate, setPaidDate] = useState<Date | undefined>(
    initialData?.paidDate ? new Date(initialData.paidDate) : undefined
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('isRecurring', isRecurring.toString());
    if (nextRecurringDate) {
      formData.set('nextRecurringDate', nextRecurringDate.toISOString());
    }
    if (paidDate) {
      formData.set('paidDate', paidDate.toISOString());
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Expense Title *</Label>
          <Input id="title" name="title" required defaultValue={initialData?.title} />
        </div>

        <div>
          <Label htmlFor="category">Category *</Label>
          <Select name="category" defaultValue={initialData?.category || 'Office'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Salary">Salary</SelectItem>
              <SelectItem value="Rent">Rent</SelectItem>
              <SelectItem value="Utilities">Utilities (Water, Electricity)</SelectItem>
              <SelectItem value="Office">Office Supplies</SelectItem>
              <SelectItem value="Hosting">Hosting & Software</SelectItem>
              <SelectItem value="Marketing">Marketing</SelectItem>
              <SelectItem value="Travel">Travel</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            required
            defaultValue={initialData?.amount}
          />
        </div>

        <div>
          <Label htmlFor="currency">Currency *</Label>
          <Select name="currency" defaultValue={initialData?.currency || 'ALL'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL (Albanian Lek)</SelectItem>
              <SelectItem value="EUR">EUR (Euro)</SelectItem>
              <SelectItem value="USD">USD (US Dollar)</SelectItem>
              <SelectItem value="GBP">GBP (British Pound)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="departmentId">Department (Optional)</Label>
        <Select name="departmentId" defaultValue={initialData?.departmentId}>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Asnjë</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} {team.department ? `(${team.department})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={initialData?.description} />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="isRecurring"
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
        />
        <Label htmlFor="isRecurring">Recurring Expense</Label>
      </div>

      {isRecurring && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="recurringFrequency">Frequency *</Label>
            <Select name="recurringFrequency" defaultValue={initialData?.recurringFrequency || 'monthly'}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Next Recurring Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {nextRecurringDate ? nextRecurringDate.toLocaleDateString() : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={nextRecurringDate} onSelect={setNextRecurringDate} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select name="status" defaultValue={initialData?.status || 'Active'}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Paid Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {paidDate ? paidDate.toLocaleDateString() : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={paidDate} onSelect={setPaidDate} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Update Expense' : 'Create Expense'}
      </Button>
    </form>
  );
};

export default ExpensesView;
