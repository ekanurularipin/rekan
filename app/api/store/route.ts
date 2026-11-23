import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "";

const FALLBACK_PRODUCTS = [
  {
    id: "RL-01",
    name: "Resa Button Collar Blouse",
    category: "Atasan",
    price: 189000,
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Espresso", "Ivory", "Warm Sand"],
    stock: 18,
    weightGram: 260,
    image:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
    desc: "Blus berpotongan inklusif dengan detail kancing klasik yang nyaman untuk aktivitas harian hingga acara formal.",
  },
  {
    id: "RL-02",
    name: "Eka Tailored Tunic Set",
    category: "Setelan",
    price: 275000,
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["Warm Sand", "Espresso"],
    stock: 12,
    weightGram: 450,
    image:
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80",
    desc: "Setelan tunik dan celana jatuh lembut dengan siluet rapi dan bahan breathable.",
  },
  {
    id: "RL-03",
    name: "Rekan Pleated Midi Skirt",
    category: "Bawahan",
    price: 165000,
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ivory", "Espresso"],
    stock: 22,
    weightGram: 320,
    image:
      "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=800&q=80",
    desc: "Rok midi lipit halus yang fleksibel dipadukan dengan berbagai atasan favorit Anda.",
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "getInitData";
  const email = searchParams.get("email") || "";

  if (!APPS_SCRIPT_URL) {
    if (action === "getInitData") {
      return NextResponse.json({
        status: "success",
        source: "fallback",
        products: FALLBACK_PRODUCTS,
      });
    }
    return NextResponse.json({ status: "success", cart: [] });
  }

  try {
    const url = `${APPS_SCRIPT_URL}?action=${encodeURIComponent(
      action,
    )}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: "Gagal terhubung ke Google Apps Script." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!APPS_SCRIPT_URL) {
    // Mode lokal/demo jika APPS_SCRIPT_URL belum diisi
    return NextResponse.json({
      status: "success",
      demoMode: true,
      message:
        "Diproses dalam mode lokal (isi APPS_SCRIPT_URL untuk simpan ke Sheets).",
    });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal mengirim data ke Google Apps Script.",
      },
      { status: 500 },
    );
  }
}
