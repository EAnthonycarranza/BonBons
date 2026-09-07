// Fictional data for tests and visual previews; never written to the database.
export const pickupRequest = {
  _id: "900001", status: "pending", orderNumber: null, confirmedTotal: null,
  customer: { name: "Jamie", email: "jamie@example.invalid", phone: "2105550100" },
  items: [
    { key: "box-4-preview", qty: 2, name: "Cake Pop Four-Pack (4 pc)", description: "Chocolate Drizzle ×4", price: 10, flavors: [{ slug: "chocolate-drizzle-cake-pops", qty: 4 }] },
    { key: "chocolate-drizzle-cake-pops", qty: 2, name: "Chocolate Drizzle Pop", description: "Individual cake pops", price: 4 },
  ],
  subtotal: 28, wantedDate: "2026-09-12", pickupTime: "", pickupLocation: "",
  createdAt: "2026-09-02T12:00:00.000Z", paymentStatus: "not_arranged",
};

export const confirmedOrder = {
  ...pickupRequest, status: "confirmed", orderNumber: "BB-26-PREVIEW", confirmedTotal: 28,
  pickupDate: "2026-09-12", pickupTime: "14:30",
  pickupLocation: "13435 West Ave, San Antonio, TX 78216, United States",
};
