import mongoose from "mongoose";

const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    source: { type: String, default: "site" },
  },
  { timestamps: true }
);

export default mongoose.models.Subscriber ||
  mongoose.model("Subscriber", SubscriberSchema);
