import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongoose";
import Product from "@/models/Product";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // params is now a Promise
) {
  try {
    await connectMongo();
    
    // Unwrap the params promise
    const { id } = await params;
    
    console.log("API: Fetching product with ID:", id);
    
    // Try to find product by both _id and productId
    let product;
    
    // First try to find by _id (MongoDB ObjectId)
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      // It looks like a valid MongoDB ObjectId
      product = await Product.findById(id).populate("category", "name");
    }
    
    // If not found by _id, try by productId (string)
    if (!product && id) {
      product = await Product.findOne({ productId: id }).populate("category", "name");
    }
    
    // If still not found, try any other approach
    if (!product && id) {
      product = await Product.findOne({ $or: [
        { _id: id },
        { productId: id }
      ] }).populate("category", "name");
    }
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    console.log("API: Product found:", product.name);
    return NextResponse.json(product);
  } catch (error) {
    console.error("GET Product Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    
    // Unwrap the params promise
    const { id } = await params;
    const body = await request.json();
    
    console.log("API: Updating product with ID:", id);
    console.log("Update data:", body);
    
    let product;
    
    // Try to find product by both _id and productId
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    }
    
    if (!product && id) {
      product = await Product.findOne({ productId: id });
    }
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    // Check if productId is being updated and if it already exists
    if (body.productId && body.productId !== product.productId) {
      const existingProduct = await Product.findOne({
        productId: body.productId,
        _id: { $ne: product._id }
      });
      
      if (existingProduct) {
        return NextResponse.json(
          { error: "Product ID already exists" },
          { status: 400 }
        );
      }
    }
    
    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      { ...body },
      { new: true, runValidators: true }
    ).populate("category", "name");
    
    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error("PUT Product Error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Product ID already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    
    // Unwrap the params promise
    const { id } = await params;
    
    console.log("API: Deleting product with ID:", id);
    
    let product;
    
    // Try to find product by both _id and productId
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(id);
    }
    
    if (!product && id) {
      product = await Product.findOne({ productId: id });
    }
    
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }
    
    await Product.findByIdAndDelete(product._id);
    
    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE Product Error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}