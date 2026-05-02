import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutForm, type CheckoutFormData } from "@/components/checkout/CheckoutForm";
import { QuicktellerCheckout } from "@/components/checkout/QuicktellerCheckout";
import { API_BASE } from "@/lib/config";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price_ngn: number;
    image_url: string | null;
    stock_quantity: number;
  };
}

type CartApiItem = {
  id: string;
  quantity: number;
  product_id: string;
  name: string;
  price_ngn: number;
  image_url: string | null;
  stock_quantity: number;
};

const SHIPPING_FEE_NGN = 1000;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");
const formatCurrency = (amount: number) => `N${amount.toLocaleString()}`;

const normalizeCartItems = (data: unknown): CartItem[] => {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is CartApiItem => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        id: item.product_id,
        name: item.name,
        price_ngn: item.price_ngn,
        image_url: item.image_url,
        stock_quantity: item.stock_quantity,
      },
    }));
};

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [paymentData, setPaymentData] = useState<{
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  } | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchCartItems = useCallback(async () => {
    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE}/cart?t=${Date.now()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glowsense_token");
        navigate("/auth");
        return;
      }

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorPayload.error || `Failed to load cart (${response.status})`);
      }

      const data = await response.json();
      setCartItems(normalizeCartItems(data));
    } catch (error) {
      toast({
        title: "Error loading cart",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    setUserEmail(localStorage.getItem("user_email") || "");
    setUserName(localStorage.getItem("user_name") || "");
  }, []);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) throw new Error("Failed to update quantity");
      await fetchCartItems();
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    const previousItems = cartItems.map((item) => ({
      ...item,
      product: { ...item.product },
    }));

    setCartItems((items) => items.filter((item) => item.id !== itemId));

    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) {
        setCartItems(previousItems);
        toast({
          title: "Authentication Error",
          description: "Please sign in again",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`${API_BASE}/cart/${itemId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
        throw new Error(errorPayload.error || `Failed to remove item (${response.status})`);
      }

      await fetchCartItems();
      toast({
        title: "Removed from cart",
        description: "Item removed successfully",
      });
    } catch (error) {
      setCartItems(previousItems);
      toast({
        title: "Error removing item",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCheckout = () => {
    setShowCheckoutForm(true);
  };

  const handleCheckoutFormSubmit = async (formData: CheckoutFormData) => {
    setProcessingCheckout(true);
    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) {
        navigate("/auth");
        return;
      }

      const cartTotal =
        cartItems.reduce((sum, item) => sum + item.product.price_ngn * item.quantity, 0) + SHIPPING_FEE_NGN;

      let formattedPhone = formData.phone;
      if (formattedPhone.startsWith("234")) {
        formattedPhone = `0${formattedPhone.slice(3)}`;
      }

      setPaymentData({
        amount: cartTotal,
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formattedPhone,
      });

      sessionStorage.setItem("pendingPaymentType", "order");
      sessionStorage.setItem(
        "pendingOrderData",
        JSON.stringify({
          formData,
          cartItems: cartItems.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price_ngn,
          })),
          cartTotal,
          shippingFee: SHIPPING_FEE_NGN,
        }),
      );

      setShowCheckoutForm(false);
      setShowPaymentModal(true);
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handlePaymentSuccess = (transactionRef: string) => {
    setShowPaymentModal(false);
    navigate(`/payment-callback?txnref=${encodeURIComponent(transactionRef)}`);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price_ngn * item.quantity, 0);
  const shipping = subtotal > 0 ? SHIPPING_FEE_NGN : 0;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="mb-8 h-12 w-48" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className={`container mx-auto max-w-6xl transition-all ${showPaymentModal ? "pointer-events-none opacity-50" : ""}`}>
        <div className="mb-6 flex items-center gap-2 sm:mb-8 sm:gap-4">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={() => navigate("/shop")}>
            <ArrowLeft className="mr-1 h-4 w-4 sm:mr-2" />
            Continue Shopping
          </Button>
        </div>

        <h1 className="mb-6 text-2xl font-bold sm:mb-8 sm:text-3xl lg:text-4xl">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="py-10 text-center sm:py-16">
            <CardContent>
              <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground sm:h-16 sm:w-16" />
              <h3 className="mb-2 text-xl font-semibold sm:text-2xl">Your cart is empty</h3>
              <p className="mb-6 text-sm text-muted-foreground sm:text-base">Add some products to get started</p>
              <Button
                onClick={() => navigate("/shop")}
                className="bg-gradient-to-r from-purple-600 to-amber-600 text-white hover:from-purple-700 hover:to-amber-700"
              >
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : showCheckoutForm && !showPaymentModal ? (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CheckoutForm
                userEmail={userEmail}
                userName={userName}
                onSubmit={handleCheckoutFormSubmit}
                isLoading={processingCheckout}
                cartTotal={total}
              />
            </div>
            <div className="order-summary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-24">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground sm:h-8 sm:w-8" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="mb-1 truncate text-sm font-semibold sm:mb-2 sm:text-lg">
                            {item.product.name}
                          </h3>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 sm:hidden"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <p className="mb-3 text-lg font-bold text-primary sm:mb-4 sm:text-2xl">
                          {formatCurrency(item.product.price_ngn)}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                              className="h-8 w-12 text-center text-sm sm:w-16"
                              min="1"
                              max={item.product.stock_quantity}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock_quantity}
                            >
                              <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>

                          <Button
                            size="sm"
                            variant="destructive"
                            className="hidden sm:flex"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">{formatCurrency(shipping)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">{formatCurrency(total)}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-amber-600 text-white hover:from-purple-700 hover:to-amber-700"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={processingCheckout}
                  >
                    {processingCheckout ? "Processing..." : "Proceed to Checkout"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-h-[90vh] w-[95vw] max-w-sm overflow-y-auto border-0 p-0">
            <DialogHeader className="hidden">
              <DialogTitle>Quickteller Checkout</DialogTitle>
            </DialogHeader>
            {paymentData && (
              <QuicktellerCheckout
                amount={paymentData.amount}
                customerName={paymentData.customerName}
                customerEmail={paymentData.customerEmail}
                customerPhone={paymentData.customerPhone}
                description="IMSTEV NATURALS Product Order"
                onPaymentSuccess={handlePaymentSuccess}
                onDismiss={() => setShowPaymentModal(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Cart;
