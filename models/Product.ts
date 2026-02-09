// models/Product.ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduct extends Document {
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: Types.ObjectId; // ✅ Changed to ObjectId reference
  images: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  features: string[];
}

const ProductSchema: Schema = new Schema(
  {
    productId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    category: { 
      type: Schema.Types.ObjectId, // ✅ Reference to Category
      ref: "Category",
      required: true 
    },
    images: [{ type: String, required: true }],
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    inStock: { type: Boolean, default: true },
    features: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);