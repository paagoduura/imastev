import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Search, Package, Sparkles, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_ngn: number;
  category: string;
  image_url: string | null;
  stock_quantity: number;
  suitable_for_conditions: string[] | null;
  ingredients: string[] | null;
  product_type: string | null;
  suitable_hair_types: string[] | null;
  suitable_hair_concerns: string[] | null;
}

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCartCount();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, productTypeFilter, selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading products",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from("cart_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      setCartCount(count || 0);
    } catch (error) {
      console.error("Error fetching cart count:", error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    // Filter by product type (skin/hair/all)
    if (productTypeFilter !== "all") {
      filtered = filtered.filter((p) => 
        p.product_type === productTypeFilter || 
        (productTypeFilter === "skin" && !p.product_type) ||
        p.product_type === "both"
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const addToCart = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to add items to cart",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("cart_items")
        .upsert(
          { user_id: user.id, product_id: productId, quantity: 1 },
          { onConflict: "user_id,product_id" }
        );

      if (error) throw error;

      toast({
        title: "Added to cart",
        description: "Product added to your cart successfully",
      });
      fetchCartCount();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Get unique categories based on current product type filter
  const getCategories = () => {
    let relevantProducts = products;
    if (productTypeFilter !== "all") {
      relevantProducts = products.filter((p) => 
        p.product_type === productTypeFilter || 
        (productTypeFilter === "skin" && !p.product_type) ||
        p.product_type === "both"
      );
    }
    return ["all", ...Array.from(new Set(relevantProducts.map((p) => p.category)))];
  };

  const getProductTypeIcon = (type: string | null) => {
    if (type === 'hair') return <Sparkles className="w-3 h-3" />;
    return <Scan className="w-3 h-3" />;
  };

  const getProductTypeBadge = (type: string | null) => {
    if (type === 'hair') {
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 text-xs">Hair</Badge>;
    }
    if (type === 'both') {
      return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 text-xs">Hair & Skin</Badge>;
    }
    return <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 text-xs">Skin</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="gradient-mesh">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-bold bg-gradient-to-r from-purple-700 to-amber-600 bg-clip-text text-transparent mb-2">IMSTEV NATURALS Shop</h1>
              <p className="text-muted-foreground">Premium organic hair care products made with love in Nigeria</p>
            </div>
            <Button
              onClick={() => navigate("/cart")}
              className="bg-gradient-to-r from-purple-600 to-amber-600 hover:from-purple-700 hover:to-amber-700 text-white relative"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-white text-purple-600 shadow-lg">
                  {cartCount}
                </Badge>
              )}
            </Button>
          </div>

          <Tabs value={productTypeFilter} onValueChange={(v) => { setProductTypeFilter(v); setSelectedCategory("all"); }} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-sm">
              <TabsTrigger value="all" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger value="skin" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <Scan className="w-4 h-4" />
                <span className="hidden sm:inline">Skin Care</span>
              </TabsTrigger>
              <TabsTrigger value="hair" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Hair Care</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 rounded-xl border-slate-200 dark:border-slate-700"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48 h-12 rounded-xl border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {getCategories().map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="flex flex-col hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300 group overflow-hidden">
                <div className="relative h-48 bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  {product.stock_quantity <= 0 && (
                    <Badge className="absolute top-2 right-2" variant="destructive">
                      Out of Stock
                    </Badge>
                  )}
                  <div className="absolute top-2 left-2">
                    {getProductTypeBadge(product.product_type)}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {product.description || "No description available"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold">₦{product.price_ngn?.toLocaleString()}</span>
                      <Badge variant="outline">{product.category}</Badge>
                    </div>
                    {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                      <p className="text-sm text-orange-500">
                        Only {product.stock_quantity} left in stock
                      </p>
                    )}
                    {/* Hair type compatibility */}
                    {product.product_type === 'hair' && product.suitable_hair_types && product.suitable_hair_types.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.suitable_hair_types.slice(0, 3).map((type, i) => (
                          <Badge key={i} variant="secondary" className="text-xs bg-amber-500/10 text-amber-700">
                            {type}
                          </Badge>
                        ))}
                        {product.suitable_hair_types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{product.suitable_hair_types.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-700 hover:to-amber-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock_quantity <= 0}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.stock_quantity <= 0 ? "Out of Stock" : "Add to Cart"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Shop;