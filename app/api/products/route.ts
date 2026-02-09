import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongoose";
import Product from "@/models/Product";

// GET all products
export async function GET() {
  try {
    await connectMongo();

    const products = await Product.find({})
      .populate("category", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET Products Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

// POST create new product
export async function POST(request: NextRequest) {
  try {
    await connectMongo();

    const body = await request.json();
    const { productId, name, description, price, category, images } = body;

    if (!productId || !name || !description || !price || !category || !images) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const exists = await Product.findOne({ productId });
    if (exists) {
      return NextResponse.json(
        { error: "Product ID already exists" },
        { status: 400 }
      );
    }

    const product = await Product.create({
      ...body,
      rating: body.rating || 0,
      reviews: body.reviews || 0,
      inStock: body.inStock !== undefined ? body.inStock : true,
    });

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name");

    return NextResponse.json(populatedProduct, { status: 201 });
  } catch (error: any) {
    console.error("POST Product Error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Product ID already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}