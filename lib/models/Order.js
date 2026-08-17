import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    key: String,
    name: String,
    description: String,
    price: Number,
    qty: { type: Number, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    customer: {
      name: String,
      email: String,
      phone: String,
    },
    fulfilment: { type: String, enum: ["Pickup", "Delivery"], default: "Pickup" },
    wantedDate: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "ready", "collected", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
