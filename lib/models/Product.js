import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    blurb: { type: String, default: "" },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "" },
    icon: { type: String, default: "i-favor" },
    color: { type: String, default: "#FF2E9A" },
    tint: { type: String, default: "255,46,154" },
    badge: { type: String, default: "" },
    badgeClass: { type: String, default: "" },
    category: { type: String, default: "treats", index: true },
    leadTimeHours: { type: Number, default: 72 },
    allergens: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Product || mongoose.model("Product", ProductSchema);
