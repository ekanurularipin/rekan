export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sizes: string[];
  colors: string[];
  stock: number;
  weightGram: number;
  image: string;
  desc?: string;
}

export interface UserAccount {
  email: string;
  password?: string;
  name: string;
  phone: string;
  address: string;
}

export interface CartItem {
  id: string;
  name: string;
  size: string;
  color: string;
  qty: number;
  price: number;
  weightGram: number;
  image: string;
}

export interface ShippingOption {
  courier: "JNE" | "J&T" | "SiCepat";
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export interface InvoiceData {
  orderId: string;
  createdAt: string;
  email: string;
  customerName: string;
  phone: string;
  address: string;
  province: string;
  district: string;
  totalWeightGram: number;
  shippingCourier: string;
  shippingCost: number;
  subtotal: number;
  grandTotal: number;
  proofUrl?: string;
  items: CartItem[];
}
