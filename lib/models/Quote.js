import mongoose from "mongoose";

const QuoteSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" },
    eventDate: { type: String, required: true },
    occasion: { type: String, default: "" },
    guests: { type: Number, default: null },
    fulfilment: { type: String, enum: ["Pickup", "Delivery"], default: "Pickup" },
    zip: { type: String, default: "" },
    interests: { type: [String], default: [] },
    colors: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["new", "quoted", "booked", "closed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Quote || mongoose.model("Quote", QuoteSchema);
