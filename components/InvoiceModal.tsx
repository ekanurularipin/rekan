"use client";

import React from "react";
import { InvoiceData } from "@/types/store";
import { BRAND_CONFIG, formatRupiah } from "@/lib/config";

interface InvoiceModalProps {
  invoice: InvoiceData | null;
  onClose: () => void;
}

export default function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  if (!invoice) return null;

  const waText = encodeURIComponent(
    `Halo *${BRAND_CONFIG.name}*, ada pesanan baru!\n` +
      `• No. Invoice: *${invoice.orderId}*\n` +
      `• Nama: ${invoice.customerName} (${invoice.email})\n` +
      `• HP: ${invoice.phone}\n` +
      `• Alamat: ${invoice.address}, ${invoice.district}, ${invoice.province}\n` +
      `• Item: ${invoice.items
        .map((i) => `${i.name} [${i.size}/${i.color}] x${i.qty}`)
        .join(", ")}\n` +
      `• Kurir: ${invoice.shippingCourier} (${invoice.totalWeightGram}g) — ${formatRupiah(
        invoice.shippingCost
      )}\n` +
      `• *Total Bayar: ${formatRupiah(invoice.grandTotal)}*`
  );

  const waUrl = `https://wa.me/${BRAND_CONFIG.ownerWhatsApp}?text=${waText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-[#3A2618] shadow-2xl border border-[#E5D9C9]">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <span className="inline-block rounded-full bg-[#EFE5D8] px-3 py-0.5 text-[11px] font-semibold">
              INVOICE RESMI • TERKIRIM KE EMAIL
            </span>
            <h2 className="mt-1 font-serif text-2xl font-bold">{BRAND_CONFIG.name}</h2>
            <p className="text-xs text-[#6E523D]">
              No. Invoice: <strong>{invoice.orderId}</strong> • {invoice.createdAt}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-sm hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-[#FAF6F0] p-3.5 text-xs">
          <div>
            <p className="font-semibold">Data Pembeli</p>
            <p>{invoice.customerName}</p>
            <p className="text-[#6E523D]">{invoice.email}</p>
            <p className="text-[#6E523D]">{invoice.phone}</p>
          </div>
          <div>
            <p className="font-semibold">Pengiriman</p>
            <p>{invoice.address}</p>
            <p className="text-[#6E523D]">
              {invoice.district}, {invoice.province}
            </p>
            <p className="mt-1 font-medium">
              {invoice.shippingCourier} • {invoice.totalWeightGram} gram
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y border-y text-xs">
          {invoice.items.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2.5">
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-[#6E523D]">
                  Size {item.size} • {item.color} × {item.qty}
                </p>
              </div>
              <p className="font-semibold">{formatRupiah(item.price * item.qty)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatRupiah(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ongkir ({invoice.shippingCourier})</span>
            <span>{formatRupiah(invoice.shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total Tagihan</span>
            <span>{formatRupiah(invoice.grandTotal)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-center text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Kirim Invoice ke WA Pemilik Toko
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-[#4A2E1B] px-4 py-2.5 text-xs font-semibold text-[#4A2E1B] hover:bg-[#FAF6F0]"
          >
            Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </div>
  );
}