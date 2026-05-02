import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Search, Package, Scissors, Scan, Sparkles, ShieldCheck, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { API_BASE } from "@/lib/config";
import { fallbackCatalog, type CatalogProduct } from "@/lib/fallbackCatalog";

type Product = CatalogProduct;

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong");

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [usingFallbackCatalog, setUsingFallbackCatalog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      const normalizedProducts = Array.isArray(data) && data.length > 0 ? data : fallbackCatalog;
      setProducts(normalizedProducts);
      setUsingFallbackCatalog(normalizedProducts === fallbackCatalog);
    } catch {
      setProducts(fallbackCatalog);
      setUsingFallbackCatalog(true);
      toast({
        title: "Showing curated catalog",
        description: "Live product sync is temporarily unavailable, so the shop is using the full in-app catalog.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCartCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) return;

      const response = await fetch(`${API_BASE}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glowsense_token");
        return;
      }
      if (!response.ok) return;

      const data = await response.json();
      setCartCount(Array.isArray(data) ? data.length : 0);
    } catch (error) {
      console.error("Error fetching cart count:", error);
    }
  }, []);

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (productTypeFilter !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.product_type === productTypeFilter ||
          (productTypeFilter === "skin" && !p.product_type) ||
          p.product_type === "both",
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredProducts(filtered);
  }, [productTypeFilter, products, searchQuery, selectedCategory]);

  useEffect(() => {
    fetchProducts();
    fetchCartCount();
  }, [fetchCartCount, fetchProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  const addToCart = async (productId: string) => {
    try {
      const token = localStorage.getItem("glowsense_token");
      if (!token) {
        toast({
          title: "Please sign in",
          description: "You need to be signed in to add items to cart",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const response = await fetch(`${API_BASE}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glowsense_token");
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add to cart");
      }

      toast({
        title: "Added to cart",
        description: "Product added to your cart successfully",
      });
      fetchCartCount();
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const getCategories = () => {
    let relevantProducts = products;
    if (productTypeFilter !== "all") {
      relevantProducts = products.filter(
        (p) =>
          p.product_type === productTypeFilter ||
          (productTypeFilter === "skin" && !p.product_type) ||
          p.product_type === "both",
      );
    }
    return ["all", ...Array.from(new Set(relevantProducts.map((p) => p.category)))];
  };

  const getProductTypeBadge = (type: string | null) => {
    if (type === "hair") {
      return <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Hair</Badge>;
    }
    if (type === "both") {
      return <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Hair & Skin</Badge>;
    }
    return <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Skin</Badge>;
  };

  const formatProductImage = (imageUrl: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
    return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  };

  return (
    <div className="min-h-screen bg-background page-reveal">
      <Navbar />

      <section className="relative overflow-hidden border-b border-primary/10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] section-reveal">
        <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div className="rounded-[28px] border border-primary/10 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-8">
              <div className="mb-6 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
                <div className="max-w-2xl">
                  <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/10">Curated Storefront</Badge>
                  <h1 className="mb-3 text-3xl font-display font-bold text-slate-900 sm:text-4xl">
                    IMSTEV NATURALS Shop
                  </h1>
                  <p className="text-sm leading-6 text-slate-600 sm:text-base">
                    Premium hair and skin essentials, professionally arranged for faster discovery, clearer filtering,
                    and a smoother shopping experience.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/cart")}
                  className="relative w-full rounded-xl bg-primary text-white hover:bg-primary/90 sm:w-auto"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Cart
                  {cartCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-white p-0 text-primary shadow-lg">
                      {cartCount}
                    </Badge>
                  )}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-primary/10 bg-slate-50 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Hair and skin range</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">One storefront for cleansers, treatments, oils, and targeted care.</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-slate-50 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Catalog protected</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Products remain visible even if live sync is briefly unavailable.</p>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-slate-50 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Cleaner browsing</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Tighter filters, balanced cards, and faster scan-to-shop navigation.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-primary/10 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/70">Catalog Status</p>
              <p className="mt-2 text-2xl font-display font-bold text-slate-900">{filteredProducts.length}</p>
              <p className="text-sm text-slate-500">products visible with current filters</p>
              {usingFallbackCatalog && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Live sync is temporarily unavailable. The shop is showing the full curated catalog so nothing disappears.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-primary/10 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
            <Tabs
              value={productTypeFilter}
              onValueChange={(value) => {
                setProductTypeFilter(value);
                setSelectedCategory("all");
              }}
              className="mb-4"
            >
              <TabsList className="grid w-full max-w-md grid-cols-3 rounded-xl border border-primary/10 bg-white/70 p-1.5 shadow-sm">
                <TabsTrigger value="all" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">All</span>
                </TabsTrigger>
                <TabsTrigger value="skin" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Scan className="h-4 w-4" />
                  <span className="hidden sm:inline">Skin Care</span>
                </TabsTrigger>
                <TabsTrigger value="hair" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Scissors className="h-4 w-4" />
                  <span className="hidden sm:inline">Hair Care</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 pl-11 dark:border-slate-700"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 w-full rounded-xl border-slate-200 sm:w-56 dark:border-slate-700">
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
      </section>

      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 section-reveal">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="py-16 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-2xl font-semibold">No products found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group flex h-full min-h-[28rem] flex-col overflow-hidden transition-all duration-300 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:border-purple-800 sm:min-h-[32rem]"
              >
                <div className="relative h-1/2 min-h-[14rem] overflow-hidden bg-muted sm:min-h-[16rem]">
                  {formatProductImage(product.image_url) ? (
                    <img
                      src={formatProductImage(product.image_url) || undefined}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.12),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                        <Package className="h-8 w-8" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-600">IMSTEV NATURALS</p>
                    </div>
                  )}
                  {product.stock_quantity <= 0 && (
                    <Badge className="absolute right-2 top-2" variant="destructive">
                      Out of Stock
                    </Badge>
                  )}
                  <div className="absolute left-2 top-2">
                    {getProductTypeBadge(product.product_type)}
                  </div>
                </div>

                <div className="flex h-1/2 flex-col">
                  <CardHeader className="pb-4">
                    <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {product.description || "No description available"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-2xl font-bold">N{product.price_ngn?.toLocaleString()}</span>
                        <Badge variant="outline" className="shrink-0">
                          {product.category}
                        </Badge>
                      </div>
                      {product.stock_quantity > 0 && product.stock_quantity <= 10 && (
                        <p className="text-sm text-orange-500">
                          Only {product.stock_quantity} left in stock
                        </p>
                      )}
                      {product.product_type === "hair" &&
                        product.suitable_hair_types &&
                        product.suitable_hair_types.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.suitable_hair_types.slice(0, 3).map((type, i) => (
                              <Badge key={i} variant="secondary" className="bg-primary/10 text-xs text-primary">
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

                  <CardFooter className="pt-0">
                    <Button
                      className="w-full bg-primary text-white shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90"
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock_quantity <= 0}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      {product.stock_quantity <= 0 ? "Out of Stock" : "Add to Cart"}
                    </Button>
                  </CardFooter>
                </div>
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
