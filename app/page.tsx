"use client";

import React, { useEffect, useState } from "react";
import { CartItem, InvoiceData, Product, UserAccount } from "@/types/store";
import { BRAND_CONFIG, formatRupiah } from "@/lib/config";
import AuthModal from "@/components/AuthModal";
import CartDrawer from "@/components/CartDrawer";
import InvoiceModal from "@/components/InvoiceModal";

type ActiveInvoiceRecord = InvoiceData & {
  status?: string;
  trackingNumber?: string;
};

const SESSION_KEY = "rekan_label_active_user_v1";
const CART_MAP_KEY = "rekan_label_carts_by_email_v1";
const ACTIVE_ORDERS_KEY = "rekan_label_active_orders_by_email_v1";
const INCLUSIVE_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

function isOrderCompleted(status?: string) {
  const s = (status || "").trim().toLowerCase();
  return s === "selesai" || s === "completed" || s === "diterima";
}

function readActiveOrdersFromStorage(email: string): ActiveInvoiceRecord[] {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDERS_KEY);
    const map: Record<string, ActiveInvoiceRecord[]> = raw
      ? JSON.parse(raw)
      : {};
    return (map[email.toLowerCase()] || []).filter(
      (inv) => !isOrderCompleted(inv.status),
    );
  } catch {
    return [];
  }
}

function writeActiveOrdersToStorage(
  email: string,
  orders: ActiveInvoiceRecord[],
) {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDERS_KEY);
    const map: Record<string, ActiveInvoiceRecord[]> = raw
      ? JSON.parse(raw)
      : {};
    map[email.toLowerCase()] = orders.filter(
      (inv) => !isOrderCompleted(inv.status),
    );
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(map));
  } catch {
    // Abaikan error storage
  }
}

const SIZE_GUIDE_ROWS = [
  { size: "S", bust: "92 cm", waist: "84 cm", length: "68 cm", sleeve: "56 cm" },
  { size: "M", bust: "98 cm", waist: "90 cm", length: "70 cm", sleeve: "57 cm" },
  { size: "L", bust: "104 cm", waist: "96 cm", length: "72 cm", sleeve: "58 cm" },
  { size: "XL", bust: "112 cm", waist: "104 cm", length: "74 cm", sleeve: "59 cm" },
  { size: "XXL", bust: "120 cm", waist: "112 cm", length: "76 cm", sleeve: "60 cm" },
  { size: "3XL", bust: "128 cm", waist: "120 cm", length: "78 cm", sleeve: "61 cm" },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedSizeFilter, setSelectedSizeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [user, setUser] = useState<UserAccount | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveInvoiceRecord[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [invoice, setInvoice] = useState<ActiveInvoiceRecord | null>(null);
  const [pickedOptions, setPickedOptions] = useState<
    Record<string, { size: string; color: string }>
  >({});

  useEffect(() => {
    fetch("/api/store?action=getInitData")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "success" && Array.isArray(d.products)) {
          setProducts(d.products);
          const defaults: Record<string, { size: string; color: string }> = {};
          d.products.forEach((p: Product) => {
            defaults[p.id] = {
              size: p.sizes?.includes("M") ? "M" : p.sizes?.[0] || "M",
              color: p.colors?.[0] || "Espresso",
            };
          });
          setPickedOptions(defaults);
        }
      })
      .catch(() => {});

    const savedUser = localStorage.getItem(SESSION_KEY);
    if (savedUser) {
      const parsedUser: UserAccount = JSON.parse(savedUser);
      setUser(parsedUser);
      loadCartForEmail(parsedUser.email);
      setActiveOrders(readActiveOrdersFromStorage(parsedUser.email));
    }
  }, []);

  function loadCartForEmail(email: string) {
    const mapRaw = localStorage.getItem(CART_MAP_KEY);
    const map: Record<string, CartItem[]> = mapRaw ? JSON.parse(mapRaw) : {};
    setCart(map[email.toLowerCase()] || []);
  }

  function saveCartForEmail(email: string, nextCart: CartItem[]) {
    setCart(nextCart);
    const mapRaw = localStorage.getItem(CART_MAP_KEY);
    const map: Record<string, CartItem[]> = mapRaw ? JSON.parse(mapRaw) : {};
    map[email.toLowerCase()] = nextCart;
    localStorage.setItem(CART_MAP_KEY, JSON.stringify(map));

    fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncCart", email, cart: nextCart }),
    }).catch(() => {});
  }

  function saveActiveOrderForEmail(
  email: string,
  createdInvoice: ActiveInvoiceRecord,
) {
  const current = readActiveOrdersFromStorage(email);
  const filtered = current.filter((i) => i.orderId !== createdInvoice.orderId);
  const next = [createdInvoice, ...filtered].filter(
    (inv) => !isOrderCompleted(inv.status),
  );
  writeActiveOrdersToStorage(email, next);
  setActiveOrders(next);
}

  function handleAuthSuccess(loggedInUser: UserAccount) {
    setUser(loggedInUser);
    localStorage.setItem(SESSION_KEY, JSON.stringify(loggedInUser));
    loadCartForEmail(loggedInUser.email);
    setActiveOrders(readActiveOrdersFromStorage(loggedInUser.email));
  }

  function handleLogout() {
    setUser(null);
    setCart([]);
    setActiveOrders([]);
    localStorage.removeItem(SESSION_KEY);
  }

  function handleAddToCart(product: Product) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const opt = pickedOptions[product.id] || {
      size: product.sizes?.[0] || "M",
      color: product.colors?.[0] || "Espresso",
    };

    const nextCart = [...cart];
    const existingIdx = nextCart.findIndex(
      (c) =>
        c.id === product.id && c.size === opt.size && c.color === opt.color,
    );

    if (existingIdx >= 0) {
      nextCart[existingIdx] = {
        ...nextCart[existingIdx],
        qty: Math.min(product.stock || 99, nextCart[existingIdx].qty + 1),
      };
    } else {
      nextCart.push({
        id: product.id,
        name: product.name,
        size: opt.size,
        color: opt.color,
        qty: 1,
        price: product.price,
        weightGram: product.weightGram || 280,
        image: product.image,
      });
    }

    saveCartForEmail(user.email, nextCart);
    setCartOpen(true);
  }

  function handleUpdateQty(index: number, delta: number) {
    if (!user) return;
    const nextCart = [...cart];
    const nextQty = nextCart[index].qty + delta;
    if (nextQty <= 0) {
      nextCart.splice(index, 1);
    } else {
      nextCart[index] = { ...nextCart[index], qty: nextQty };
    }
    saveCartForEmail(user.email, nextCart);
  }

  function handleRemoveItem(index: number) {
    if (!user) return;
    const nextCart = cart.filter((_, i) => i !== index);
    saveCartForEmail(user.email, nextCart);
  }

  function handleCheckoutSuccess(createdInvoice: InvoiceData) {
    if (user) {
      saveCartForEmail(user.email, []);
      saveActiveOrderForEmail(user.email, createdInvoice);
    }
    setInvoice(createdInvoice);
  }

  const categories = [
    "Semua",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
  ];

  const q = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === "Semua" || p.category === selectedCategory;
    const matchSize =
      selectedSizeFilter === "ALL" ||
      (Array.isArray(p.sizes) && p.sizes.includes(selectedSizeFilter));
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.desc || "").toLowerCase().includes(q) ||
      (p.colors || []).some((c) => c.toLowerCase().includes(q));
    return matchCat && matchSize && matchSearch;
  });

  const totalCartItems = cart.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="min-h-screen bg-[#F7F3EE] text-[#4A2C1D]">
      {/* Top Announcement Bar */}
      <div className="bg-[#4A2C1D] text-[#F7F3EE] text-xs py-2 px-4 text-center tracking-widest uppercase">
        <span>
          Rekanmu dalam Setiap Penampilan • Tersedia Ukuran Inklusif S hingga
          3XL • Gratis Ongkir Min. Belanja Rp 500.000
        </span>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[#F7F3EE]/95 backdrop-blur-md border-b border-[#D5C5B3]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="p-2 rounded-xl text-[#4A2C1D] hover:bg-[#EDE4D8] transition"
                aria-label="Menu"
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>

            <a href="#beranda" className="flex items-center gap-3 group">
              <svg
                className="w-10 h-11 text-[#4A2C1D] transition-transform duration-300 group-hover:scale-105"
                viewBox="0 0 120 130"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M28 18H66C84 18 96 28 96 44C96 58 85 67 68 69C62 70 55 70 48 70V65C63 65 77 58 77 44C77 30 66 23 51 23H44V104H52V109H22V104H30V23H22V18H28Z"
                  fill="#4A2C1D"
                />
                <path
                  d="M14 66C24 54 44 55 58 72C70 86 82 103 99 103C108 103 113 98 111 92C109 87 102 86 95 87C86 88 78 86 72 82C79 84 89 84 98 83C108 82 117 86 118 94C119 103 110 110 96 110C77 110 62 94 49 77C37 62 23 60 14 66Z"
                  fill="#4A2C1D"
                />
                <path
                  d="M94 84C91 73 94 61 101 55C105 64 104 75 94 84Z"
                  fill="#4A2C1D"
                />
                <path
                  d="M96 84C103 75 113 70 120 71C116 80 107 85 96 84Z"
                  fill="#4A2C1D"
                />
              </svg>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#4A2C1D]">
                  REKAN
                </span>
                <span className="text-[10px] tracking-[0.42em] text-[#8C6249] font-medium mt-1 pl-0.5">
                  LABEL
                </span>
              </div>
            </a>

            <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-[#4A2C1D]/90">
              <a href="#beranda" className="hover:text-[#8C6249] transition py-2">
                Beranda
              </a>
              <a href="#koleksi" className="hover:text-[#8C6249] transition py-2">
                Koleksi
              </a>
              <a
                href="#kisah-kami"
                className="hover:text-[#8C6249] transition py-2"
              >
                Kisah Kami
              </a>
              <a
                href="#panduan-ukuran"
                className="hover:text-[#8C6249] transition py-2"
              >
                Panduan Ukuran
              </a>
              <a href="#kontak" className="hover:text-[#8C6249] transition py-2">
                Hubungi
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2.5 rounded-full text-[#4A2C1D] hover:bg-[#EDE4D8] transition text-xs font-semibold"
                title="Cari Produk"
              >
                Cari
              </button>

              {user ? (
                <div className="flex items-center gap-1.5">
                  <span className="hidden lg:inline px-3 py-2 rounded-full bg-[#EDE4D8] text-xs font-semibold text-[#4A2C1D] max-w-[140px] truncate">
                    {user.name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-2 rounded-full border border-[#D5C5B3] text-xs font-medium text-[#4A2C1D] hover:bg-[#EDE4D8] transition"
                  >
                    Keluar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="px-3.5 py-2 rounded-full bg-[#EDE4D8]/80 text-xs font-semibold text-[#4A2C1D] hover:bg-[#D5C5B3]/60 transition"
                >
                  Masuk / Daftar
                </button>
              )}

              <button
                type="button"
                onClick={() => (user ? setCartOpen(true) : setAuthOpen(true))}
                className="px-4 py-2 rounded-full bg-[#4A2C1D] text-[#F7F3EE] text-xs font-semibold hover:bg-[#361F14] transition"
              >
                Keranjang ({totalCartItems})
              </button>
            </div>
          </div>

          {searchOpen && (
            <div className="pb-4">
              <div className="relative max-w-xl mx-auto">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari blouse, tunik, kulot, atau warna (misal: Espresso, Ivory)..."
                  className="w-full px-4 py-2.5 bg-[#FCFBF9] border border-[#D5C5B3] rounded-full text-sm text-[#4A2C1D] placeholder-[#8C6249]/60 focus:outline-none focus:border-[#4A2C1D]"
                />
              </div>
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FCFBF9] border-t border-[#D5C5B3]/50 px-4 pt-2 pb-5 space-y-2 shadow-lg">
            <a
              href="#beranda"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A2C1D] hover:bg-[#EDE4D8]"
            >
              Beranda
            </a>
            <a
              href="#koleksi"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A2C1D] hover:bg-[#EDE4D8]"
            >
              Koleksi
            </a>
            <a
              href="#kisah-kami"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A2C1D] hover:bg-[#EDE4D8]"
            >
              Kisah Kami
            </a>
            <a
              href="#panduan-ukuran"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A2C1D] hover:bg-[#EDE4D8]"
            >
              Panduan Ukuran Inklusif
            </a>
            <a
              href="#kontak"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#4A2C1D] hover:bg-[#EDE4D8]"
            >
              Hubungi Kami
            </a>
          </div>
        )}
      </header>

      {/* Invoice Aktif Selama Pesanan Belum Selesai */}
      {user && activeOrders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="rounded-3xl border border-[#D5C5B3] bg-[#FCFBF9] p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#8C6249]">
                  Invoice Aktif • Belum Selesai
                </span>
                <p className="text-xs text-[#4A2C1D]/75">
                  Invoice tetap tersimpan selama pesanan belum berstatus Selesai.
                </p>
              </div>
              <span className="rounded-full bg-[#EDE4D8] px-3 py-1 text-xs font-semibold text-[#4A2C1D]">
                {activeOrders.length} Pesanan Aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeOrders.map((ord) => (
                <div
                  key={ord.orderId}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#F7F3EE] p-3.5 border border-[#D5C5B3]/60 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#4A2C1D] truncate">
                      {ord.orderId}
                    </p>
                    <p className="text-[#8C6249] mt-0.5">
                      {formatRupiah(ord.grandTotal || 0)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoice(ord)}
                    className="shrink-0 rounded-full bg-[#4A2C1D] px-4 py-2 text-xs font-semibold text-[#F7F3EE] hover:bg-[#361F14] transition"
                  >
                    Lihat Invoice
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section
        id="beranda"
        className="relative overflow-hidden bg-gradient-to-br from-[#F7F3EE] via-[#EDE4D8]/60 to-[#D5C5B3]/30 py-12 sm:py-20 lg:py-24"
      >
        <div className="hidden lg:block absolute top-0 right-0 w-[44%] h-full bg-[#EDE4D8]/70 rounded-bl-[240px] -z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EDE4D8] border border-[#D5C5B3]/80 text-xs font-medium tracking-widest uppercase text-[#4A2C1D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4A2C1D]" />
                <span>Modest Wear • Inklusif S – 3XL</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#4A2C1D] leading-[1.12]">
                More Than Fashion,
                <br />
                <span className="italic font-normal text-[#8C6249]">
                  A Companion.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#4A2C1D]/80 leading-relaxed max-w-xl mx-auto lg:mx-0">
                <strong className="font-semibold text-[#4A2C1D]">
                  Rekanmu dalam Setiap Penampilan
                </strong>{" "}
                — Hadir dengan pilihan fashion modest wear yang inklusif, nyaman
                di berbagai bentuk tubuh, dan tetap elegan di setiap langkahmu.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <a
                  href="#koleksi"
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#4A2C1D] text-[#F7F3EE] rounded-full font-medium text-sm tracking-wide hover:bg-[#361F14] transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Jelajahi Koleksi</span>
                  <span>→</span>
                </a>
                <a
                  href="#kisah-kami"
                  className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-[#4A2C1D] text-[#4A2C1D] rounded-full font-medium text-sm tracking-wide hover:bg-[#EDE4D8] transition flex items-center justify-center"
                >
                  Kisah REKAN LABEL
                </a>
              </div>

              <div className="pt-6 border-t border-[#D5C5B3]/60 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <p className="font-serif text-xl font-semibold text-[#4A2C1D]">
                    S – 3XL
                  </p>
                  <p className="text-xs text-[#8C6249]">Ukuran Inklusif</p>
                </div>
                <div>
                  <p className="font-serif text-xl font-semibold text-[#4A2C1D]">
                    Breathable
                  </p>
                  <p className="text-xs text-[#8C6249]">Katun & Linen Nyaman</p>
                </div>
                <div>
                  <p className="font-serif text-xl font-semibold text-[#4A2C1D]">
                    Timeless
                  </p>
                  <p className="text-xs text-[#8C6249]">Potongan Elegan</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative max-w-lg mx-auto">
                <div className="storyboard-arch overflow-hidden bg-[#D5C5B3]/30 p-3 sm:p-4 border border-[#D5C5B3]/60 shadow-xl">
                  <div className="relative storyboard-arch overflow-hidden aspect-[4/5] bg-[#EDE4D8]">
                    <img
                      src={
                        products[0]?.image ||
                        "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=900&q=80"
                      }
                      alt="REKAN LABEL Modest Fashion"
                      className="w-full h-full object-cover object-center hover:scale-105 transition duration-700"
                    />

                    <div className="absolute bottom-4 left-4 right-4 bg-[#FCFBF9]/95 backdrop-blur-md p-4 rounded-2xl border border-[#D5C5B3]/60 shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-[#8C6249] font-semibold">
                            Signature Collection
                          </p>
                          <p className="font-serif text-lg font-semibold text-[#4A2C1D]">
                            Rekan Earthy Series
                          </p>
                        </div>
                        <a
                          href="#koleksi"
                          className="px-3.5 py-2 bg-[#4A2C1D] text-[#F7F3EE] text-xs rounded-full hover:bg-[#361F14] transition whitespace-nowrap"
                        >
                          Lihat Detail
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-3 absolute -left-6 top-12 bg-[#FCFBF9] px-4 py-3 rounded-2xl border border-[#D5C5B3] shadow-md">
                  <div className="w-10 h-10 rounded-full bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold">
                    R
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#4A2C1D]">
                      Earthy Palette
                    </p>
                    <p className="text-[11px] text-[#8C6249]">
                      Espresso & Ivory Cream
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Katalog Produk */}
      <section id="koleksi" className="py-16 sm:py-24 bg-[#FCFBF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs uppercase tracking-[0.25em] text-[#8C6249] font-semibold">
              Kurasi Modest Wear
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-semibold text-[#4A2C1D] mt-2">
              Koleksi {BRAND_CONFIG.name}
            </h2>
            <p className="text-sm sm:text-base text-[#4A2C1D]/75 mt-3">
              Stok, harga, dan foto di buat dengan Honest Fit, Real Look,
              dirancang agar nyaman di berbagai bentuk tubuh.
            </p>
          </div>

          <div className="bg-[#F7F3EE] p-4 sm:p-6 rounded-3xl border border-[#D5C5B3]/60 mb-10 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition ${
                      selectedCategory === cat
                        ? "bg-[#4A2C1D] text-[#F7F3EE]"
                        : "bg-[#FCFBF9] text-[#4A2C1D] hover:bg-[#EDE4D8] border border-[#D5C5B3]/60"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-[#8C6249] mr-1">
                  Ukuran:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSizeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    selectedSizeFilter === "ALL"
                      ? "bg-[#4A2C1D] text-[#F7F3EE]"
                      : "bg-[#FCFBF9] text-[#4A2C1D] border border-[#D5C5B3] hover:bg-[#EDE4D8]"
                  }`}
                >
                  Semua
                </button>
                {INCLUSIVE_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSizeFilter(sz)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selectedSizeFilter === sz
                        ? "bg-[#4A2C1D] text-[#F7F3EE]"
                        : "bg-[#FCFBF9] text-[#4A2C1D] border border-[#D5C5B3] hover:bg-[#EDE4D8]"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-[#F7F3EE] rounded-3xl border border-[#D5C5B3]/50 space-y-3">
              <h3 className="font-serif text-2xl font-semibold text-[#4A2C1D]">
                Belum ada produk yang cocok dengan filter
              </h3>
              <p className="text-sm text-[#8C6249] max-w-md mx-auto">
                Pastikan tab <strong>Produk</strong> di Google Spreadsheet sudah
                terisi atau reset filter yang aktif.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("Semua");
                  setSelectedSizeFilter("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 px-6 py-2.5 bg-[#4A2C1D] text-[#F7F3EE] rounded-full text-xs font-medium hover:bg-[#361F14] transition"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredProducts.map((product) => {
                const opt = pickedOptions[product.id] || {
                  size: product.sizes?.[0] || "M",
                  color: product.colors?.[0] || "Espresso",
                };
                const outOfStock = (product.stock ?? 0) <= 0;

                return (
                  <article
                    key={product.id}
                    className="group bg-[#F7F3EE] rounded-3xl border border-[#D5C5B3]/60 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col"
                  >
                    <div className="relative aspect-[4/5] bg-[#EDE4D8] overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                      />
                      <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-[#FCFBF9]/90 backdrop-blur-xs text-[11px] font-semibold text-[#4A2C1D] border border-[#D5C5B3]/50">
                        {product.category} • {product.weightGram || 280}gr
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-xs text-[#8C6249] mb-1">
                          <span>{opt.color}</span>
                          <span>Stok: {product.stock}</span>
                        </div>
                        <h3 className="font-serif text-xl font-semibold text-[#4A2C1D] leading-snug">
                          {product.name}
                        </h3>
                        {product.desc && (
                          <p className="text-xs text-[#4A2C1D]/75 mt-1 line-clamp-2">
                            {product.desc}
                          </p>
                        )}
                        <p className="text-base font-bold text-[#4A2C1D] mt-2">
                          {formatRupiah(product.price)}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-[#D5C5B3]/50">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <select
                            value={opt.size}
                            onChange={(e) =>
                              setPickedOptions((prev) => ({
                                ...prev,
                                [product.id]: { ...opt, size: e.target.value },
                              }))
                            }
                            className="bg-[#FCFBF9] border border-[#D5C5B3] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4A2C1D] focus:outline-none"
                          >
                            {product.sizes.map((sz) => (
                              <option key={sz} value={sz}>
                                Size {sz}
                              </option>
                            ))}
                          </select>

                          <select
                            value={opt.color}
                            onChange={(e) =>
                              setPickedOptions((prev) => ({
                                ...prev,
                                [product.id]: { ...opt, color: e.target.value },
                              }))
                            }
                            className="bg-[#FCFBF9] border border-[#D5C5B3] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4A2C1D] focus:outline-none"
                          >
                            {product.colors.map((col) => (
                              <option key={col} value={col}>
                                {col}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => handleAddToCart(product)}
                          className="w-full py-2.5 bg-[#4A2C1D] text-[#F7F3EE] rounded-full text-xs sm:text-sm font-medium hover:bg-[#361F14] transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <span>
                            {outOfStock
                              ? "Stok Habis"
                              : "Tambah ke Keranjang"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Kisah Kami & Filosofi */}
      <section
        id="kisah-kami"
        className="py-16 sm:py-24 bg-[#F7F3EE] relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative bg-[#EDE4D8] p-4 rounded-3xl border border-[#D5C5B3]/70 shadow-xl">
                <img
                  src={
                    products[1]?.image ||
                    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"
                  }
                  alt="Kisah REKAN LABEL"
                  className="w-full h-[420px] sm:h-[480px] object-cover rounded-2xl"
                />
                <div className="mt-4 text-center">
                  <p className="font-serif italic text-lg text-[#4A2C1D]">
                    &ldquo;More Than Fashion, A Companion.&rdquo;
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2 space-y-8">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C6249] font-semibold">
                  Tentang Kami
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-semibold text-[#4A2C1D] mt-2">
                  Asal Nama & Arti REKAN
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-[#FCFBF9] p-6 rounded-3xl border border-[#D5C5B3]/60 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold text-lg">
                    R
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-[#4A2C1D]">
                    Asal Nama REKAN
                  </h3>
                  <p className="text-sm text-[#4A2C1D]/80 leading-relaxed">
                    <strong>REKAN</strong> lahir dari gabungan nama{" "}
                    <strong>Owner</strong> dan . Berawal dari
                    kata <em>&ldquo;Reka&rdquo;</em>, kami menambahkan huruf{" "}
                    <strong>N</strong> hingga menjadi <strong>REKAN</strong>—yang
                    menyatukan langkah kami sekaligus membawa makna pendamping.
                  </p>
                </div>

                <div className="bg-[#FCFBF9] p-6 rounded-3xl border border-[#D5C5B3]/60 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold text-lg">
                    ♥
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-[#4A2C1D]">
                    Arti REKAN
                  </h3>
                  <p className="text-sm text-[#4A2C1D]/80 leading-relaxed">
                    <strong>REKAN berarti teman atau pendamping.</strong> Kami
                    percaya busana bukan sekadar pakaian, melainkan ruang rasa
                    nyaman, kepercayaan diri, dan kehangatan dalam berbagai
                    peran harian.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="bg-[#EDE4D8]/70 p-4 rounded-2xl text-center border border-[#D5C5B3]/40">
                  <p className="text-xs sm:text-sm font-semibold text-[#4A2C1D]">
                    Teman
                  </p>
                  <p className="text-[11px] text-[#8C6249]">dalam perjalanan</p>
                </div>
                <div className="bg-[#EDE4D8]/70 p-4 rounded-2xl text-center border border-[#D5C5B3]/40">
                  <p className="text-xs sm:text-sm font-semibold text-[#4A2C1D]">
                    Pendamping
                  </p>
                  <p className="text-[11px] text-[#8C6249]">
                    dalam setiap penampilan
                  </p>
                </div>
                <div className="bg-[#EDE4D8]/70 p-4 rounded-2xl text-center border border-[#D5C5B3]/40">
                  <p className="text-xs sm:text-sm font-semibold text-[#4A2C1D]">
                    Dukungan
                  </p>
                  <p className="text-[11px] text-[#8C6249]">
                    untuk menjadi diri sendiri
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FCFBF9] rounded-3xl p-6 sm:p-12 border border-[#D5C5B3]/60 shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C6249] font-semibold">
                  Filosofi Kami
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl font-semibold text-[#4A2C1D]">
                  Alasan REKAN LABEL Hadir Untuk Setiap Perempuan
                </h3>
                <p className="text-sm sm:text-base text-[#4A2C1D]/80 leading-relaxed">
                  Menemukan busana yang nyaman di berbagai bentuk tubuh dan
                  ukuran sering kali menantang. REKAN LABEL hadir membawa opsi
                  yang lebih inklusif, lembut, dan tetap rapi di berbagai
                  suasana.
                </p>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-[#F7F3EE] border border-[#D5C5B3]/50">
                  <div className="w-11 h-11 rounded-2xl bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#4A2C1D] tracking-wide">
                      NYAMAN DIPAKAI
                    </h4>
                    <p className="text-sm text-[#4A2C1D]/80 mt-1">
                      Potongan yang thoughtful dengan rentang ukuran luas (S
                      hingga 3XL) agar pas tanpa terasa sesak.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-[#F7F3EE] border border-[#D5C5B3]/50">
                  <div className="w-11 h-11 rounded-2xl bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#4A2C1D] tracking-wide">
                      FLEKSIBEL & VERSATIL
                    </h4>
                    <p className="text-sm text-[#4A2C1D]/80 mt-1">
                      Cocok untuk aktivitas harian, bekerja, hingga momen
                      spesial bersama keluarga.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-[#F7F3EE] border border-[#D5C5B3]/50">
                  <div className="w-11 h-11 rounded-2xl bg-[#EDE4D8] flex items-center justify-center text-[#4A2C1D] font-serif font-bold shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="font-serif text-xl font-bold text-[#4A2C1D] tracking-wide">
                      MENDUKUNG KEPERCAYAAN DIRI
                    </h4>
                    <p className="text-sm text-[#4A2C1D]/80 mt-1">
                      Dirancang agar pemakainya merasa nyaman, leluasa, dan
                      percaya diri menjadi diri sendiri.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Panduan Ukuran Inklusif */}
      <section
        id="panduan-ukuran"
        className="py-16 sm:py-20 bg-[#EDE4D8]/50 border-t border-[#D5C5B3]/50"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-xs uppercase tracking-[0.25em] text-[#8C6249] font-semibold">
              Inclusive Sizing
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#4A2C1D] mt-2">
              Panduan Ukuran REKAN LABEL
            </h2>
            <p className="text-sm text-[#4A2C1D]/80 mt-2">
              Referensi ukuran inklusif (dalam cm) untuk membantu memilih fit
              yang paling nyaman.
            </p>
          </div>

          <div className="bg-[#FCFBF9] rounded-3xl border border-[#D5C5B3]/70 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#4A2C1D] text-[#F7F3EE]">
                    <th className="py-3.5 px-4 sm:px-6 font-medium">Ukuran</th>
                    <th className="py-3.5 px-4 sm:px-6 font-medium">
                      Lingkar Dada (LD)
                    </th>
                    <th className="py-3.5 px-4 sm:px-6 font-medium">
                      Lingkar Pinggang
                    </th>
                    <th className="py-3.5 px-4 sm:px-6 font-medium">
                      Panjang Baju
                    </th>
                    <th className="py-3.5 px-4 sm:px-6 font-medium">
                      Panjang Lengan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5C5B3]/50 text-[#4A2C1D]">
                  {SIZE_GUIDE_ROWS.map((row) => (
                    <tr key={row.size} className="hover:bg-[#F7F3EE]/80 transition">
                      <td className="py-3 px-4 sm:px-6 font-bold">{row.size}</td>
                      <td className="py-3 px-4 sm:px-6">{row.bust}</td>
                      <td className="py-3 px-4 sm:px-6">{row.waist}</td>
                      <td className="py-3 px-4 sm:px-6">{row.length}</td>
                      <td className="py-3 px-4 sm:px-6">{row.sleeve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="kontak" className="bg-[#4A2C1D] text-[#F7F3EE] pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto pb-14 border-b border-[#D5C5B3]/20 space-y-4">
            <p className="font-serif text-2xl sm:text-3xl tracking-wide text-[#F7F3EE] uppercase">
              &ldquo;Lebih dari sekadar fesyen, REKAN adalah teman.&rdquo;
            </p>
            <p className="text-sm text-[#D5C5B3] italic">
              Terima kasih telah menjadi bagian dari perjalanan ini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-12">
            <div className="space-y-3">
              <span className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#F7F3EE]">
                {BRAND_CONFIG.name}
              </span>
              <p className="text-sm text-[#D5C5B3]/90 max-w-md leading-relaxed">
                Rekanmu dalam Setiap Penampilan. Menghadirkan busana nyaman,
                inklusif (S–3XL), dan penuh kehangatan juga kebahagian dari semua perjalanan  
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-lg font-semibold text-[#F7F3EE]">
                Navigasi
              </h4>
              <ul className="space-y-2 text-sm text-[#D5C5B3]/85">
                <li>
                  <a href="#beranda" className="hover:text-[#F7F3EE] transition">
                    Beranda
                  </a>
                </li>
                <li>
                  <a href="#koleksi" className="hover:text-[#F7F3EE] transition">
                    Koleksi Terbaru
                  </a>
                </li>
                <li>
                  <a
                    href="#kisah-kami"
                    className="hover:text-[#F7F3EE] transition"
                  >
                    Kisah Rekan
                  </a>
                </li>
                <li>
                  <a
                    href="#panduan-ukuran"
                    className="hover:text-[#F7F3EE] transition"
                  >
                    Panduan Ukuran (S–3XL)
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-serif text-lg font-semibold text-[#F7F3EE]">
                Layanan Pelanggan
              </h4>
              <ul className="space-y-2 text-sm text-[#D5C5B3]/85">
                <li>WhatsApp: {BRAND_CONFIG.ownerWhatsApp}</li>
                <li>Email: rekann.2026@gmail.com</li>
                <li ><a href="https://www.instagram.com/rekan.label">Instagram: @rekan.label </a></li>
                
                <li><a href="https://www.tiktok.com/@rekan.label">Tiktok: @rekan.label</a> </li>
                <li>Invoice otomatis terbit &amp; terkirim via email/WA</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#D5C5B3]/20 flex flex-col sm:flex-row items-center justify-between text-xs text-[#D5C5B3]/70 gap-4">
            <p>
              &copy; {new Date().getFullYear()} {BRAND_CONFIG.name}. All rights
              reserved.
            </p>
            <p>More Than Fashion, A Companion.</p>
          </div>
        </div>
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        user={user}
        cart={cart}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onRequireLogin={() => {
          setCartOpen(false);
          setAuthOpen(true);
        }}
        onCheckoutSuccess={handleCheckoutSuccess}
      />

      <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  );
}