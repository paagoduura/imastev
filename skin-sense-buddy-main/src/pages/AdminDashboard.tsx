import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Calendar,
  Video,
  Loader2,
  LogOut,
  Plus,
  Pencil,
  RefreshCw,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { adminFetch, adminLogout, getAdminMe } from "@/lib/adminAuth";

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalAppointments: number;
  totalSalonBookings: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
}

interface AdminProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price_ngn: number;
  category: string | null;
  product_type: string | null;
  image_url: string | null;
  stock_quantity: number;
  is_active: boolean;
}

interface AdminOrder {
  id: string;
  user_email: string | null;
  customer_name: string | null;
  total_amount_ngn: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
  items: Array<{
    id: string;
    quantity: number;
    price_at_purchase: number;
    product_name: string;
  }>;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  onboarding_completed: boolean | null;
  roles: string[];
  subscription_name: string | null;
  subscription_status: string | null;
  created_at: string;
}

interface AdminAppointment {
  id: string;
  patient_name: string | null;
  patient_email: string | null;
  clinician_name: string | null;
  clinician_specialty: string | null;
  scheduled_at: string;
  status: string;
}

interface AdminSalonBooking {
  id: number;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  service_name: string;
  appointment_date: string;
  time_slot: string;
  price_ngn: number;
  status: string;
  payment_status: string;
  is_registered_user: boolean;
}

const emptyProductForm = {
  sku: "",
  name: "",
  description: "",
  price_ngn: "",
  category: "",
  product_type: "hair",
  image_url: "",
  stock_quantity: "",
  is_active: true,
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [salonBookings, setSalonBookings] = useState<AdminSalonBooking[]>([]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [savingProduct, setSavingProduct] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    location: "",
    roles: "patient",
    onboarding_completed: false,
  });
  const [savingUser, setSavingUser] = useState(false);

  const activeProducts = useMemo(() => products.filter((product) => product.is_active), [products]);

  useEffect(() => {
    initializeAdmin();
  }, []);

  useEffect(() => {
    if (editingProduct) {
      setProductForm({
        sku: editingProduct.sku || "",
        name: editingProduct.name || "",
        description: editingProduct.description || "",
        price_ngn: String(editingProduct.price_ngn ?? ""),
        category: editingProduct.category || "",
        product_type: editingProduct.product_type || "hair",
        image_url: editingProduct.image_url || "",
        stock_quantity: String(editingProduct.stock_quantity ?? ""),
        is_active: editingProduct.is_active,
      });
    } else {
      setProductForm(emptyProductForm);
    }
  }, [editingProduct]);

  const initializeAdmin = async () => {
    try {
      const me = await getAdminMe();
      setAdminEmail(me.admin.email);
      await loadAdminData();
    } catch {
      adminLogout();
      navigate("/admin/login");
    }
  };

  const loadAdminData = async () => {
    const initialLoad = loading;
    if (initialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [overview, productsData, ordersData, usersData, appointmentsData, salonBookingsData] =
        await Promise.all([
          adminFetch("/admin/overview"),
          adminFetch("/admin/products"),
          adminFetch("/admin/orders"),
          adminFetch("/admin/users"),
          adminFetch("/admin/appointments"),
          adminFetch("/admin/salon-bookings"),
        ]);

      setStats(overview.stats);
      setProducts(productsData);
      setOrders(ordersData);
      setUsers(usersData);
      setAppointments(appointmentsData);
      setSalonBookings(salonBookingsData);
    } catch (error: any) {
      toast({
        title: "Admin data failed to load",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  const handleSaveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProduct(true);

    try {
      const payload = {
        sku: productForm.sku.trim(),
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price_ngn: Number(productForm.price_ngn),
        category: productForm.category.trim() || null,
        product_type: productForm.product_type,
        image_url: productForm.image_url.trim() || null,
        stock_quantity: Number(productForm.stock_quantity),
        is_active: productForm.is_active,
      };

      if (editingProduct) {
        await adminFetch(`/admin/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast({ title: "Product updated", description: `${payload.name} has been updated.` });
      } else {
        await adminFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Product created", description: `${payload.name} has been added.` });
      }

      setProductDialogOpen(false);
      setEditingProduct(null);
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Could not save product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    try {
      await adminFetch(`/admin/products/${productId}`, { method: 'DELETE' });
      toast({ title: 'Product deleted', description: 'Product removed.' });
      await loadAdminData();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({ email: "", password: "", full_name: "", phone: "", location: "", roles: "patient", onboarding_completed: false });
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      password: "",
      full_name: user.full_name || "",
      phone: user.phone || "",
      location: user.location || "",
      roles: (user.roles || []).join(','),
      onboarding_completed: Boolean(user.onboarding_completed),
    });
    setUserDialogOpen(true);
  };

  const handleSaveUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingUser(true);
    try {
      const payload: any = {
        email: userForm.email?.trim(),
        full_name: userForm.full_name?.trim() || null,
        phone: userForm.phone?.trim() || null,
        location: userForm.location?.trim() || null,
        roles: (userForm.roles || '').split(',').map((r: string) => r.trim()).filter(Boolean),
        onboarding_completed: Boolean(userForm.onboarding_completed),
      };
      if (!editingUser && userForm.password) payload.password = userForm.password;

      if (editingUser) {
        await adminFetch(`/admin/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast({ title: 'User updated', description: `${payload.email} updated.` });
      } else {
        if (!userForm.password) throw new Error('Password is required for new users');
        payload.password = userForm.password;
        await adminFetch('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
        toast({ title: 'User created', description: `${payload.email} added.` });
      }

      setUserDialogOpen(false);
      setEditingUser(null);
      await loadAdminData();
    } catch (error: any) {
      toast({ title: 'User save failed', description: error.message, variant: 'destructive' });
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Delete this user and all related data? This cannot be undone.')) return;
    try {
      await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
      toast({ title: 'User deleted', description: 'User has been removed.' });
      await loadAdminData();
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const updateOrder = async (orderId: string, field: "status" | "payment_status", value: string) => {
    try {
      await adminFetch(`/admin/orders/${orderId}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
      toast({ title: "Order updated", description: "Order status has been saved." });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Order update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateSalonBooking = async (
    bookingId: number,
    field: "status" | "payment_status",
    value: string
  ) => {
    try {
      await adminFetch(`/admin/salon-bookings/${bookingId}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
      toast({ title: "Salon booking updated", description: "Booking details have been saved." });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Salon update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      await adminFetch(`/admin/appointments/${appointmentId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      toast({ title: "Appointment updated", description: "Appointment status has been saved." });
      await loadAdminData();
    } catch (error: any) {
      toast({
        title: "Appointment update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-slate-300">Loading admin workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-400">IMSTEV NATURALS</p>
            <h1 className="text-2xl font-display font-bold">Admin Control Center</h1>
            <p className="text-slate-400 text-sm">{adminEmail}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={loadAdminData}
              disabled={refreshing}
              className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
            >
              {refreshing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="products"><Package className="w-4 h-4 mr-2" />Products</TabsTrigger>
            <TabsTrigger value="orders"><ShoppingBag className="w-4 h-4 mr-2" />Orders</TabsTrigger>
            <TabsTrigger value="salon"><Calendar className="w-4 h-4 mr-2" />Salon</TabsTrigger>
            <TabsTrigger value="appointments"><Video className="w-4 h-4 mr-2" />Appointments</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard title="Users" value={stats?.totalUsers || 0} subtitle="Registered accounts" />
              <StatCard title="Products" value={stats?.totalProducts || 0} subtitle={`${activeProducts.length} active`} />
              <StatCard title="Orders" value={stats?.totalOrders || 0} subtitle={`${stats?.pendingOrders || 0} pending`} />
              <StatCard title="Revenue" value={`₦${Number(stats?.totalRevenue || 0).toLocaleString()}`} subtitle="Processed sales" />
              <StatCard title="Telehealth" value={stats?.totalAppointments || 0} subtitle="Appointments booked" />
              <StatCard title="Salon Bookings" value={stats?.totalSalonBookings || 0} subtitle="In-salon visits" />
              <StatCard title="Low Stock" value={stats?.lowStockProducts || 0} subtitle="Products at or below 10" />
              <StatCard title="Customers" value={orders.length} subtitle="Orders in system" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Latest Orders</CardTitle>
                  <CardDescription>Recent purchases across the store</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                      <div>
                        <p className="font-medium">{order.customer_name || order.user_email || "Guest order"}</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₦{Number(order.total_amount_ngn).toLocaleString()}</p>
                        <Badge variant="outline">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Service Activity</CardTitle>
                  <CardDescription>Salon and telehealth bookings at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    ...appointments.slice(0, 3).map((appointment) => ({
                      id: `appt-${appointment.id}`,
                      label: appointment.patient_name || appointment.patient_email || "Patient",
                      sublabel: appointment.clinician_name || "Clinician appointment",
                      when: new Date(appointment.scheduled_at).toLocaleString(),
                      status: appointment.status,
                    })),
                    ...salonBookings.slice(0, 3).map((booking) => ({
                      id: `salon-${booking.id}`,
                      label: booking.customer_name,
                      sublabel: booking.service_name,
                      when: `${booking.appointment_date} ${booking.time_slot}`,
                      status: booking.status,
                    })),
                  ].slice(0, 6).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                        <p className="text-xs text-muted-foreground">{item.when}</p>
                      </div>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-semibold">Product Management</h2>
                <p className="text-muted-foreground">Create, update, and monitor your catalog.</p>
              </div>
              <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white"
                    onClick={() => setEditingProduct(null)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "Edit Product" : "New Product"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveProduct} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input value={productForm.sku} onChange={(e) => setProductForm((current) => ({ ...current, sku: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={productForm.name} onChange={(e) => setProductForm((current) => ({ ...current, name: e.target.value }))} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={productForm.description} onChange={(e) => setProductForm((current) => ({ ...current, description: e.target.value }))} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={productForm.category} onChange={(e) => setProductForm((current) => ({ ...current, category: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Product Type</Label>
                        <Select value={productForm.product_type} onValueChange={(value) => setProductForm((current) => ({ ...current, product_type: value }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hair">Hair</SelectItem>
                            <SelectItem value="skin">Skin</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Price (NGN)</Label>
                        <Input type="number" min="0" value={productForm.price_ngn} onChange={(e) => setProductForm((current) => ({ ...current, price_ngn: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock Quantity</Label>
                        <Input type="number" min="0" value={productForm.stock_quantity} onChange={(e) => setProductForm((current) => ({ ...current, stock_quantity: e.target.value }))} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Image URL</Label>
                        <Input value={productForm.image_url} onChange={(e) => setProductForm((current) => ({ ...current, image_url: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={productForm.is_active ? "active" : "inactive"}
                        onValueChange={(value) => setProductForm((current) => ({ ...current, is_active: value === "active" }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" disabled={savingProduct} className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white">
                      {savingProduct ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {editingProduct ? "Save Changes" : "Create Product"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <Badge variant={product.is_active ? "default" : "secondary"}>{product.is_active ? "Active" : "Inactive"}</Badge>
                        <Badge variant="outline">{product.product_type || "unspecified"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{product.description || "No description yet."}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span><strong>SKU:</strong> {product.sku}</span>
                        <span><strong>Category:</strong> {product.category || "N/A"}</span>
                        <span><strong>Price:</strong> ₦{Number(product.price_ngn).toLocaleString()}</span>
                        <span><strong>Stock:</strong> {product.stock_quantity}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(product);
                          setProductDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash className="w-4 h-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{order.customer_name || order.user_email || "Customer"}</h3>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">Payment method: {order.payment_method || "Not specified"}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-xl font-bold">₦{Number(order.total_amount_ngn).toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{order.items.length} item(s)</p>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Order Status</Label>
                      <Select value={order.status} onValueChange={(value) => updateOrder(order.id, "status", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="processing">processing</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                          <SelectItem value="cancelled">cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select value={order.payment_status || "pending"} onValueChange={(value) => updateOrder(order.id, "payment_status", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">pending</SelectItem>
                          <SelectItem value="paid">paid</SelectItem>
                          <SelectItem value="failed">failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm p-3 rounded-lg bg-slate-50">
                        <span>{item.product_name}</span>
                        <span>{item.quantity} x ₦{Number(item.price_at_purchase).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="salon" className="space-y-4">
            {salonBookings.map((booking) => (
              <Card key={booking.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{booking.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">{booking.service_name}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_phone}{booking.customer_email ? ` • ${booking.customer_email}` : ""}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-semibold">{booking.appointment_date} at {booking.time_slot}</p>
                      <p className="text-sm text-muted-foreground">₦{Number(booking.price_ngn).toLocaleString()}</p>
                      <Badge variant="outline">{booking.is_registered_user ? "Registered user" : "Guest"}</Badge>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Booking Status</Label>
                      <Select value={booking.status} onValueChange={(value) => updateSalonBooking(booking.id, "status", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">confirmed</SelectItem>
                          <SelectItem value="completed">completed</SelectItem>
                          <SelectItem value="cancelled">cancelled</SelectItem>
                          <SelectItem value="no-show">no-show</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Status</Label>
                      <Select value={booking.payment_status} onValueChange={(value) => updateSalonBooking(booking.id, "payment_status", value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">unpaid</SelectItem>
                          <SelectItem value="paid">paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="appointments" className="space-y-4">
            {appointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-5 flex flex-col lg:flex-row justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{appointment.patient_name || appointment.patient_email || "Patient"}</h3>
                    <p className="text-sm text-muted-foreground">{appointment.patient_email || "No email"}</p>
                    <p className="text-sm text-muted-foreground">{appointment.clinician_name || "Clinician"} • {appointment.clinician_specialty || "Specialty not set"}</p>
                    <p className="text-sm text-muted-foreground">{new Date(appointment.scheduled_at).toLocaleString()}</p>
                  </div>
                  <div className="w-full lg:w-56 space-y-2">
                    <Label>Appointment Status</Label>
                    <Select value={appointment.status} onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">scheduled</SelectItem>
                        <SelectItem value="confirmed">confirmed</SelectItem>
                        <SelectItem value="completed">completed</SelectItem>
                        <SelectItem value="cancelled">cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h2 className="text-2xl font-display font-semibold">User Management</h2>
                <p className="text-muted-foreground">Create, edit, and remove user accounts.</p>
              </div>
              <div>
                <Button className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white" onClick={handleOpenNewUser}>
                  <Plus className="w-4 h-4 mr-2" /> Add User
                </Button>
              </div>
            </div>

            {/* User create/edit dialog */}
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Edit User' : 'New User'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => handleSaveUser(e)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={userForm.email} onChange={(e) => setUserForm((c) => ({ ...c, email: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" value={userForm.password} onChange={(e) => setUserForm((c) => ({ ...c, password: e.target.value }))} placeholder={editingUser ? 'Leave blank to keep current password' : ''} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full name</Label>
                      <Input value={userForm.full_name} onChange={(e) => setUserForm((c) => ({ ...c, full_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={userForm.phone} onChange={(e) => setUserForm((c) => ({ ...c, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={userForm.location} onChange={(e) => setUserForm((c) => ({ ...c, location: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Roles (comma separated)</Label>
                      <Input value={userForm.roles} onChange={(e) => setUserForm((c) => ({ ...c, roles: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input id="onboarding" type="checkbox" checked={userForm.onboarding_completed} onChange={(e) => setUserForm((c) => ({ ...c, onboarding_completed: e.target.checked }))} />
                    <Label htmlFor="onboarding">Onboarding complete</Label>
                  </div>
                  <Button type="submit" disabled={savingUser} className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white">
                    {savingUser ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {editingUser ? 'Save Changes' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <CardContent className="p-5 flex flex-col lg:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{user.full_name || user.email}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <p className="text-sm text-muted-foreground">{[user.phone, user.location].filter(Boolean).join(' • ') || 'No profile details yet'}</p>
                      <p className="text-sm text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col items-start lg:items-end gap-2">
                      <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
                        {(user.roles || []).map((role) => (
                          <Badge key={role} variant="outline">{role}</Badge>
                        ))}
                      </div>
                      <Badge variant={user.onboarding_completed ? 'default' : 'secondary'}>
                        {user.onboarding_completed ? 'Onboarding complete' : 'Onboarding incomplete'}
                      </Badge>
                      <p className="text-sm text-muted-foreground">Plan: {user.subscription_name || 'None'}{user.subscription_status ? ` • ${user.subscription_status}` : ''}</p>

                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={() => handleEditUser(user)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                          <Trash className="w-4 h-4 mr-2" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl font-display">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
