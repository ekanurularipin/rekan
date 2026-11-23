import { NextRequest, NextResponse } from "next/server";

const REGIONS: Record<string, string[]> = {
  "DKI Jakarta": [
    "Jakarta Selatan - Kebayoran Baru",
    "Jakarta Pusat - Menteng",
    "Jakarta Barat - Palmerah",
    "Jakarta Timur - Cakung",
  ],
  "Jawa Barat": [
    "Kota Bandung - Coblong",
    "Kota Bekasi - Bekasi Barat",
    "Kota Depok - Margonda",
    "Kota Tasikmalaya - Cihideung",
  ],
  "Jawa Tengah & DIY": [
    "Kota Semarang - Semarang Tengah",
    "Kota Surakarta - Banjarsari",
    "Kota Yogyakarta - Gondokusuman",
  ],
  "Jawa Timur": ["Kota Surabaya - Gubeng", "Kota Malang - Klojen"],
  "Luar Pulau Jawa (Sumatra / Kalimantan / Sulawesi)": [
    "Kota Medan - Medan Baru",
    "Kota Palembang - Ilir Timur I",
    "Kota Balikpapan - Balikpapan Kota",
    "Kota Makassar - Panakkukang",
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") || "provinces";
  const province = searchParams.get("province") || "";
  const district = searchParams.get("district") || "";
  const weightGram = Math.max(1, Number(searchParams.get("weightGram") || 250));

  if (mode === "provinces") {
    return NextResponse.json({
      status: "success",
      provinces: Object.keys(REGIONS),
    });
  }

  if (mode === "districts") {
    return NextResponse.json({
      status: "success",
      districts: REGIONS[province] || [],
    });
  }

  if (mode === "rates") {
    // Pembulatan per 1.000 gram (1 kg) sesuai umum ekspedisi
    const kg = Math.ceil(weightGram / 1000);

    // Tarif dasar per kg berdasarkan zona provinsi
    let baseRatePerKg = 14000;
    if (province === "DKI Jakarta" || province === "Jawa Barat") {
      baseRatePerKg = 11000;
    } else if (province === "Jawa Tengah & DIY" || province === "Jawa Timur") {
      baseRatePerKg = 15000;
    } else if (province) {
      baseRatePerKg = 28000;
    }

    // Jika process.env.SHIPPING_API_KEY tersedia, panggil API aggregator kurir di sini
    const rates = [
      {
        courier: "JNE" as const,
        service: "REG",
        description: `Layanan reguler ke ${district || province} (${kg} kg)`,
        cost: baseRatePerKg * kg,
        etd: province.includes("Luar") ? "3-6 hari" : "1-3 hari",
      },
      {
        courier: "J&T" as const,
        service: "EZ",
        description: `Pengiriman standar ke ${district || province} (${kg} kg)`,
        cost: (baseRatePerKg + 1000) * kg,
        etd: province.includes("Luar") ? "3-5 hari" : "1-3 hari",
      },
      {
        courier: "SiCepat" as const,
        service: "HALU",
        description: `Tarif hemat ke ${district || province} (${kg} kg)`,
        cost: Math.max(9000, (baseRatePerKg - 1500) * kg),
        etd: province.includes("Luar") ? "4-7 hari" : "2-4 hari",
      },
    ];

    return NextResponse.json({
      status: "success",
      weightGram,
      chargedKg: kg,
      rates,
    });
  }

  return NextResponse.json(
    { status: "error", message: "Mode tidak dikenal." },
    { status: 400 },
  );
}
