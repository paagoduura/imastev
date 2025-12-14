import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE = '/api';

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

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCartItems();
  }, []);

  const fetchCartItems = async () => {
    try {
      const token = localStorage.getItem('glowsense_token');
      if (!token) {
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load cart');
      
      const data = await response.json();
      const items = data.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        product: {
          id: item.product_id,
          name: item.name,
          price_ngn: item.price_ngn,
          image_url: item.image_url,
          stock_quantity: item.stock_quantity
        }
      }));
      setCartItems(items);
    } catch (error: any) {
      toast({
        title: "Error loading cart",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem('glowsense_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart/${itemId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (!response.ok) throw new Error('Failed to update quantity');
      fetchCartItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const token = localStorage.getItem('glowsense_token');
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to remove item');
      toast({
        title: "Removed from cart",
        description: "Item removed successfully",
      });
      fetchCartItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckout = async () => {
    setProcessingCheckout(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create order
      const total = cartItems.reduce(
        (sum, item) => sum + (item.product.price_ngn * item.quantity),
        0
      );

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: `ORD-${Date.now()}`,
          total_amount_ngn: total,
          status: "pending",
          payment_status: "pending",
          shipping_address: {},
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_ngn: item.product.price_ngn,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock and sold count
      for (const item of cartItems) {
        // First get current product data for accurate sold_count increment
        const { data: currentProduct } = await supabase
          .from("products")
          .select("sold_count, stock_quantity")
          .eq("id", item.product.id)
          .single();
        
        const currentSoldCount = currentProduct?.sold_count || 0;
        const currentStock = currentProduct?.stock_quantity || item.product.stock_quantity;
        
        await supabase
          .from("products")
          .update({
            stock_quantity: currentStock - item.quantity,
            sold_count: currentSoldCount + item.quantity,
          })
          .eq("id", item.product.id);
      }

      // Clear cart
      await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      toast({
        title: "Order placed successfully!",
        description: `Order number: ${order.order_number}`,
      });

      navigate("/orders");
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.product.price_ngn * item.quantity),
    0
  );
  const shipping = subtotal > 0 ? 1000 : 0; // ₦1000 flat shipping
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="h-12 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
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
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm" onClick={() => navigate("/shop")}>
            <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-6 sm:mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="text-center py-10 sm:py-16">
            <CardContent>
              <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl sm:text-2xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">Add some products to get started</p>
              <Button onClick={() => navigate("/shop")} className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white">
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex gap-3 sm:gap-4">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm sm:text-lg mb-1 sm:mb-2 truncate">
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
                        <p className="text-lg sm:text-2xl font-bold text-primary mb-3 sm:mb-4">
                          ₦{item.product.price_ngn.toLocaleString()}
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
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                              className="w-12 sm:w-16 text-center h-8 text-sm"
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

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">₦{shipping.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">₦{total.toLocaleString()}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white"
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
      </div>
    </div>
  );
};

export default Cart;