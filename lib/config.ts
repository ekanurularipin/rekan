export const BRAND_CONFIG = {
  name: "REKAN LABEL",
  tagline: "More Than Fashion, A Companion — Rekanmu dalam Setiap Penampilan.",
  ownerWhatsApp: "6281991469105", // Format internasional tanpa '+' atau spasi
};

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}
