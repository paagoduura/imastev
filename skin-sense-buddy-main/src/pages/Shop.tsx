import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Heart,
  Leaf,
  Package,
  Scan,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Loader2,
  X,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { API_BASE } from "@/lib/config";
import { BRAND_IMAGES } from "@/lib/brandImages";
import { fallbackCatalog, type CatalogProduct } from "@/lib/fallbackCatalog";

type Product = CatalogProduct;
type ProductTypeFilter = "all" | "skin" | "hair";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong";

const formatCurrency = (amount: number) => `₦${amount.toLocaleString("en-NG")}`;

const formatProductImage = (imageUrl: string | null) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  return imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
};

const productTypeLabel = (type: string | null) => {
  if (type === "hair") return "Hair care";
  if (type === "both") return "Hair + skin";
  return "Skin care";
};

const Shop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [usingFallbackCatalog, setUsingFallbackCatalog] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/products`);
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      const nextProducts = Array.isArray(data) && data.length > 0 ? data : fallbackCatalog;
      setProducts(nextProducts);
      setUsingFallbackCatalog(nextProducts === fallbackCatalog);
    } catch (error) {
      console.error("Product catalog error:", error);
      setProducts(fallbackCatalog);
      setUsingFallbackCatalog(true);
      toast({
        title: "Showing the curated edit",
        description: "Live catalog sync is temporarily unavailable, so the in-app collection is still available.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCartCount = useCallback(async () => {
    const token = localStorage.getItem("glowsense_token");
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glowsense_token");
        return;
      }
      if (!response.ok) return;
      const data = await response.json();
      setCartCount(Array.isArray(data) ? data.length : Array.isArray(data?.items) ? data.items.length : 0);
    } catch (error) {
      console.error("Cart count error:", error);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
    void fetchCartCount();
  }, [fetchCartCount, fetchProducts]);

  const categories = useMemo(() => {
    const relevantProducts = productTypeFilter === "all"
      ? products
      : products.filter((product) => product.product_type === productTypeFilter || product.product_type === "both" || (productTypeFilter === "skin" && !product.product_type));
    return ["all", ...Array.from(new Set(relevantProducts.map((product) => product.category).filter(Boolean)))];
  }, [productTypeFilter, products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesType = productTypeFilter === "all"
        || product.product_type === productTypeFilter
        || product.product_type === "both"
        || (productTypeFilter === "skin" && !product.product_type);
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesQuery = !query
        || product.name.toLowerCase().includes(query)
        || product.description?.toLowerCase().includes(query)
        || product.ingredients?.some((ingredient) => ingredient.toLowerCase().includes(query));
      return matchesType && matchesCategory && matchesQuery;
    });
  }, [productTypeFilter, products, searchQuery, selectedCategory]);

  const setCareFilter = (type: ProductTypeFilter) => {
    setProductTypeFilter(type);
    setSelectedCategory("all");
  };

  const addToCart = async (productId: string) => {
    const token = localStorage.getItem("glowsense_token");
    if (!token) {
      toast({ title: "Sign in to build your edit", description: "Your cart is saved to your IMSTEV account." });
      navigate("/auth");
      return;
    }

    setAddingProductId(productId);
    try {
      const response = await fetch(`${API_BASE}/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glowsense_token");
        toast({ title: "Session expired", description: "Please sign in again to add products." });
        navigate("/auth");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Unable to add this product to your cart");
      }
      toast({ title: "Added to your edit", description: "The product is waiting in your cart." });
      await fetchCartCount();
    } catch (error) {
      toast({ title: "Could not add product", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setAddingProductId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f3ec] text-[#3b271b]">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-[#3b271b]/10 bg-[#f8f3ec]">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#d8c4ed]/50 blur-3xl" />
          <div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-[#efcf9f]/40 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:px-8 lg:pb-20 lg:pt-16">
            <div className="max-w-2xl">
              <Badge className="mb-5 rounded-full bg-[#3b271b] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f8f3ec] hover:bg-[#3b271b]">
                The IMSTEV edit
              </Badge>
              <h1 className="max-w-xl font-display text-5xl font-semibold leading-[0.93] tracking-[-0.04em] text-[#3b271b] sm:text-6xl lg:text-7xl">
                Good care begins with what you choose.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#3b271b]/65 sm:text-lg">
                A considered collection of Nigerian-rooted hair and skin essentials, selected to make your next care routine feel simpler, richer, and more like you.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => document.getElementById("shop-collection")?.scrollIntoView({ behavior: "smooth" })} className="h-12 rounded-full bg-[#3b271b] px-6 text-[#f8f3ec] hover:bg-[#513622]">
                  Explore the collection <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/scan")} className="h-12 rounded-full border-[#3b271b]/20 bg-transparent px-6 text-[#3b271b] hover:bg-white/60">
                  Shop from a scan <Scan className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-[#3b271b]/15 pt-5">
                <div><p className="font-display text-2xl">4A–4C</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#3b271b]/50">Texture fluent</p></div>
                <div><p className="font-display text-2xl">01</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#3b271b]/50">Care-first edit</p></div>
                <div><p className="font-display text-2xl">NG</p><p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#3b271b]/50">Made for home</p></div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[420px]">
              <div className="relative aspect-[0.86] overflow-hidden rounded-[34px] bg-[#6d4a34] shadow-[0_30px_80px_rgba(59,39,27,0.2)]">
                <img src={BRAND_IMAGES.productCollection} alt="IMSTEV NATURALS product collection" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#24160d]/70 via-transparent to-transparent" />
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/25 bg-[#24160d]/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                  <Leaf className="h-3.5 w-3.5" /> Made for your routine
                </div>
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                  <div><p className="font-display text-3xl leading-none">The care shelf</p><p className="mt-2 text-xs text-white/70">Small-batch feeling. Everyday ease.</p></div>
                  <div className="grid h-12 w-12 place-items-center rounded-full border border-white/30 bg-white/10 backdrop-blur"><Leaf className="h-5 w-5" /></div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-5 hidden rounded-2xl border border-[#3b271b]/10 bg-white/90 p-4 shadow-xl backdrop-blur sm:block">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700" /><span className="text-xs font-semibold">Thoughtful, not overwhelming</span></div>
                <p className="mt-1 pl-6 text-[11px] text-[#3b271b]/55">Build a routine you can keep.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="shop-collection" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b5e3c]">Shop by care need</p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-none tracking-[-0.03em] text-[#3b271b] sm:text-5xl">Find the edit your hair or skin has been asking for.</h2>
            </div>
            <p className="text-sm leading-6 text-[#3b271b]/60 lg:text-right">Start broad, then narrow by texture, concern, or ingredient. Every product is presented with enough context to choose with confidence.</p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { type: "all" as const, title: "The full edit", copy: "Hair, skin, and in-between days.", icon: Package, tone: "bg-white" },
              { type: "hair" as const, title: "Hair care", copy: "Moisture, scalp, growth, and style.", icon: Heart, tone: "bg-[#efe4f4]" },
              { type: "skin" as const, title: "Skin care", copy: "Cleanse, calm, brighten, protect.", icon: Leaf, tone: "bg-[#f3e4d0]" },
            ].map(({ type, title, copy, icon: Icon, tone }) => (
              <button key={type} type="button" onClick={() => setCareFilter(type)} className={`group rounded-[24px] border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-lg ${tone} ${productTypeFilter === type ? "border-[#3b271b]/40 shadow-md" : "border-[#3b271b]/10"}`}>
                <div className="flex items-start justify-between gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3b271b] text-[#f8f3ec]"><Icon className="h-5 w-5" /></span>{productTypeFilter === type && <span className="grid h-7 w-7 place-items-center rounded-full bg-[#3b271b] text-[#f8f3ec]"><Check className="h-4 w-4" /></span>}</div>
                <p className="mt-6 font-display text-2xl text-[#3b271b]">{title}</p><p className="mt-1 text-sm leading-6 text-[#3b271b]/60">{copy}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-[26px] border border-[#3b271b]/10 bg-white/70 p-4 shadow-sm backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-xl"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3b271b]/45" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search by product, ingredient, or concern" className="h-12 rounded-full border-[#3b271b]/15 bg-[#f8f3ec] pl-11 text-[#3b271b] placeholder:text-[#3b271b]/40" />{searchQuery && <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3b271b]/45 hover:text-[#3b271b]"><X className="h-4 w-4" /></button>}</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex rounded-full bg-[#f8f3ec] p-1">{(["all", "skin", "hair"] as ProductTypeFilter[]).map((type) => <button key={type} type="button" onClick={() => setCareFilter(type)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${productTypeFilter === type ? "bg-[#3b271b] text-[#f8f3ec]" : "text-[#3b271b]/60 hover:text-[#3b271b]"}`}>{type === "all" ? "All" : type === "skin" ? "Skin" : "Hair"}</button>)}</div><label className="sr-only" htmlFor="shop-category">Filter by category</label><select id="shop-category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="h-11 w-full rounded-full border border-[#3b271b]/15 bg-[#f8f3ec] px-4 text-sm text-[#3b271b] outline-none transition focus:border-[#8b5e3c] sm:w-48">{categories.map((category) => <option key={category} value={category}>{category === "all" ? "All categories" : category}</option>)}</select></div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-[#3b271b]/10 pt-4 text-xs text-[#3b271b]/55 sm:flex-row sm:items-center sm:justify-between"><span>{filteredProducts.length} pieces in the current edit</span>{usingFallbackCatalog && <span className="inline-flex items-center gap-2 text-amber-800"><ShieldCheck className="h-3.5 w-3.5" /> Curated catalog mode</span>}{(searchQuery || selectedCategory !== "all") && <button type="button" onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }} className="font-semibold text-[#8b5e3c] hover:text-[#3b271b]">Reset filters</button>}</div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Card key={index} className="overflow-hidden rounded-[26px] border-[#3b271b]/10 bg-white"><Skeleton className="aspect-[0.92] w-full" /><CardContent className="space-y-3 p-5"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>)}</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[#3b271b]/20 bg-white/70 px-6 py-20 text-center"><ShoppingBag className="mx-auto h-12 w-12 text-[#8b5e3c]/50" /><h3 className="mt-5 font-display text-3xl">Nothing in this edit yet.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#3b271b]/60">Try another category or search term. Your next care routine may be one adjustment away.</p><Button variant="outline" onClick={() => { setProductTypeFilter("all"); setSelectedCategory("all"); setSearchQuery(""); }} className="mt-6 rounded-full border-[#3b271b]/20">Show the full edit</Button></div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product, index) => {
                const imageUrl = formatProductImage(product.image_url);
                const isAdding = addingProductId === product.id;
                return (
                  <Card key={product.id} className="group flex h-full flex-col overflow-hidden rounded-[26px] border-[#3b271b]/10 bg-white shadow-[0_12px_40px_rgba(59,39,27,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(59,39,27,0.14)]">
                    <div className="relative aspect-[0.92] overflow-hidden bg-[#eee5dc]">
                      {imageUrl ? <img src={imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading={index > 3 ? "lazy" : "eager"} /> : <div className="flex h-full flex-col items-center justify-center text-[#8b5e3c]"><Package className="h-10 w-10" /><span className="mt-3 text-xs font-semibold uppercase tracking-[0.16em]">IMSTEV NATURALS</span></div>}
                      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3"><Badge className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#3b271b] hover:bg-white">{productTypeLabel(product.product_type)}</Badge>{product.stock_quantity <= 0 ? <Badge variant="destructive" className="rounded-full">Out of stock</Badge> : product.stock_quantity <= 10 ? <Badge className="rounded-full bg-[#3b271b]/85 text-[#f8f3ec] hover:bg-[#3b271b]">Few left</Badge> : null}</div>
                    </div>
                    <CardContent className="flex flex-1 flex-col p-5"><div className="flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8b5e3c]">{product.category}</p><h3 className="mt-2 line-clamp-2 font-display text-2xl leading-tight text-[#3b271b]">{product.name}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#3b271b]/60">{product.description || "A considered addition to your care routine."}</p>{product.product_type === "hair" && product.suitable_hair_types?.length ? <div className="mt-4 flex flex-wrap gap-1.5">{product.suitable_hair_types.slice(0, 4).map((type) => <span key={type} className="rounded-full bg-[#efe4f4] px-2.5 py-1 text-[10px] font-semibold text-[#6b467a]">{type}</span>)}</div> : product.suitable_for_conditions?.length ? <div className="mt-4 flex flex-wrap gap-1.5">{product.suitable_for_conditions.slice(0, 2).map((condition) => <span key={condition} className="rounded-full bg-[#f3e4d0] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#80582d]">{condition}</span>)}</div> : null}</div><div className="mt-6 flex items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#3b271b]/45">Your investment</p><p className="mt-1 font-display text-2xl text-[#3b271b]">{formatCurrency(product.price_ngn)}</p></div><div className="flex items-center gap-1 text-[11px] text-[#3b271b]/50"><Leaf className="h-3.5 w-3.5 text-[#71856b]" /> In the edit</div></div></CardContent>
                    <CardFooter className="p-5 pt-0"><Button onClick={() => addToCart(product.id)} disabled={product.stock_quantity <= 0 || isAdding} className="h-11 w-full rounded-full bg-[#3b271b] text-[#f8f3ec] hover:bg-[#513622]">{isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}{isAdding ? "Adding..." : product.stock_quantity <= 0 ? "Out of stock" : "Add to cart"}</Button></CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-t border-[#3b271b]/10 bg-[#efe4f4]/50">
          <div className="mx-auto grid max-w-7xl gap-5 px-4 py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
            {[{ icon: ShieldCheck, title: "Choose with confidence", copy: "See ingredients, texture fit, and care concerns before you add." }, { icon: Scan, title: "Make it personal", copy: "Start a scan to turn your next product search into a guided edit." }, { icon: ShoppingCart, title: "Build your shelf", copy: "Save a considered collection for your next wash day or reset." }].map(({ icon: Icon, title, copy }) => <div key={title} className="rounded-[22px] border border-[#3b271b]/10 bg-white/75 p-5"><Icon className="h-5 w-5 text-[#8b5e3c]" /><h3 className="mt-4 font-display text-2xl text-[#3b271b]">{title}</h3><p className="mt-2 text-sm leading-6 text-[#3b271b]/60">{copy}</p></div>)}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Shop;
