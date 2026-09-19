import type { Customer, Vendor, DeliveryAddress } from "@/types";

export const mockCustomer: Customer = {
  id: "user-cust-1",
  fullName: "Chibuike Okafor",
  email: "chibuike@example.com",
  phone: "+234 812 345 6789",
  role: "customer",
  emailVerified: true,
  createdAt: "2024-06-01T10:00:00Z",
  defaultAddressId: "addr-1",
};

export const mockVendor: Vendor = {
  id: "user-vendor-1",
  fullName: "Tunde Bakare",
  email: "tunde@technaija.ng",
  phone: "+234 802 000 1111",
  role: "vendor",
  emailVerified: true,
  createdAt: "2023-02-14T10:00:00Z",
  storeId: "store-technaija",
  subscriptionId: "sub-1",
};

export const mockAddresses: DeliveryAddress[] = [
  {
    id: "addr-1",
    label: "Home",
    fullName: "Chibuike Okafor",
    phone: "+234 812 345 6789",
    street: "14 Adeola Odeku Street, Victoria Island",
    city: "Lagos Island",
    state: "Lagos",
    landmark: "Opposite Eko Hotel",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    fullName: "Chibuike Okafor",
    phone: "+234 812 345 6789",
    street: "Plot 22, Cadastral Zone, Wuse 2",
    city: "Abuja",
    state: "FCT",
  },
];

export const nigerianStates = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];
