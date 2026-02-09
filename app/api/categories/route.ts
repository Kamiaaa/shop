// app/api/categories/route.ts
import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongoose";
import Category, { ICategory } from "@/models/Category"; // Import ICategory if it exists
import Product from "@/models/Product";
import mongoose, { HydratedDocument } from "mongoose";

// Define a proper type for the lean category
// If ICategory exists in your model, you can use that
type CategoryDocument = {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentCategory?: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

export async function GET() {
  try {
    await connectMongo();

    // Get all active categories with explicit type casting
    const categories = await Category.find({ isActive: true }).lean() as CategoryDocument[];

    // Get categories with product count and first product image
    const categoriesWithDetails = await Promise.all(
      categories.map(async (category) => {
        // Get products in this category
        const products = await Product.find({ 
          category: category._id 
        }).lean();

        const productCount = products.length;
        
        // Get first product's first image if available
        let displayImage = category.image;
        
        if (!displayImage && products.length > 0) {
          // Find first product with images
          const productWithImages = products.find(p => p.images && p.images.length > 0);
          if (productWithImages && productWithImages.images && productWithImages.images.length > 0) {
            displayImage = productWithImages.images[0];
          }
        }

        return {
          _id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          description: category.description || '',
          image: category.image || '',
          displayImage: displayImage || '',
          productCount,
        };
      })
    );

    // Filter out categories with 0 products
    const filteredCategories = categoriesWithDetails.filter(cat => cat.productCount > 0);

    return NextResponse.json(filteredCategories);
  } catch (error: any) {
    console.error('Categories GET Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectMongo();
    const body = await request.json();

    console.log("Received category data:", body);

    // Validate required fields
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = body.slug || body.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();

    // Check if category with same slug already exists
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return NextResponse.json(
        { error: "Category with this name already exists" },
        { status: 400 }
      );
    }

    // Create new category
    const category = await Category.create({
      name: body.name.trim(),
      slug,
      description: body.description || '',
      image: body.image || '',
      parentCategory: body.parentCategory || null,
      isActive: body.isActive !== undefined ? body.isActive : true,
    });

    console.log("Category created:", category);

    return NextResponse.json({
      success: true,
      data: {
        _id: category._id.toString(),
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        productCount: 0, // Initially 0 products
      },
      message: "Category created successfully"
    }, { status: 201 });

  } catch (error: any) {
    console.error("Category POST Error:", error);
    
    if (error.name === 'ValidationError') {
      const errors: Record<string, string> = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation failed",
          errors 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Internal server error" 
      },
      { status: 500 }
    );
  }
}