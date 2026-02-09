"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FiSave, FiX, FiUpload, FiTrash2, FiPlus, FiMinus, FiArrowLeft } from "react-icons/fi";
import Layout from "@/app/components/Layout";

interface Category {
  _id: string;
  name: string;
}

interface ProductFormData {
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  images: string[];
  rating: number;
  reviews: number;
  inStock: boolean;
  features: string[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [apiError, setApiError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<ProductFormData>({
    productId: "",
    name: "",
    description: "",
    price: 0,
    originalPrice: undefined,
    category: "",
    images: [],
    rating: 0,
    reviews: 0,
    inStock: true,
    features: [""]
  });

  const [newImage, setNewImage] = useState("");

  // Fetch product data
  useEffect(() => {
    const fetchData = async () => {
      if (!productId) {
        setApiError("No product ID provided");
        setLoading(false);
        return;
      }
      
      try {
        const product = await tryFetchProduct();
        
        if (product) {
          const features = product.features && Array.isArray(product.features) && product.features.length > 0 
            ? product.features 
            : [""];

          setFormData({
            ...product,
            price: parseFloat(product.price) || 0,
            originalPrice: product.originalPrice ? parseFloat(product.originalPrice) : undefined,
            category: typeof product.category === 'object' && product.category !== null 
              ? product.category._id 
              : product.category || "",
            images: product.images && Array.isArray(product.images) ? product.images : [],
            rating: parseFloat(product.rating) || 0,
            reviews: parseInt(product.reviews) || 0,
            inStock: product.inStock !== undefined ? product.inStock : true,
            features
          });
          setApiError("");
        } else {
          setApiError("Product not found. Please check the product ID.");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load product";
        setApiError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    const tryFetchProduct = async () => {
      // Method 1: Try direct API call
      try {
        const res = await fetch(`/api/products/${productId}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (error) {
        // Continue to next method
      }

      // Method 2: Try fetching all products and filtering
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const allProducts = await res.json();
          const foundProduct = allProducts.find((p: any) => 
            p._id === productId || p.productId === productId || p._id?.toString() === productId
          );
          
          if (foundProduct) {
            return foundProduct;
          }
        }
      } catch (error) {
        // Continue to next method
      }

      // Method 3: Try alternative API endpoints
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(productId)}`);
        if (res.ok) {
          const searchResult = await res.json();
          if (searchResult.products && searchResult.products.length > 0) {
            return searchResult.products[0];
          }
        }
      } catch (error) {
        // Continue to fallback
      }

      // Method 4: Fallback to test data (for development)
      if (process.env.NODE_ENV === 'development') {
        return {
          _id: productId,
          productId: "TEST001",
          name: "Test Product",
          description: "This is a test product for development",
          price: 99.99,
          category: { _id: "cat1", name: "Electronics" },
          images: ["/placeholder.png"],
          rating: 4.5,
          reviews: 10,
          inStock: true,
          features: ["Feature 1", "Feature 2"]
        };
      }

      return null;
    };

    // Fetch categories
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        // Silently fail - categories are not critical for editing
      }
    };

    fetchData();
    fetchCategories();
  }, [productId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'price' || name === 'originalPrice' || name === 'rating' || name === 'reviews') {
      const numValue = value === '' ? 0 : parseFloat(value);
      setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index: number) => {
    if (formData.features.length > 1) {
      const newFeatures = formData.features.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, features: newFeatures }));
    }
  };

  const addImage = () => {
    const trimmedImage = newImage.trim();
    if (trimmedImage && !formData.images.includes(trimmedImage)) {
      setFormData(prev => ({ ...prev, images: [...prev.images, trimmedImage] }));
      setNewImage("");
    }
  };

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.images.length) return;
    
    const newImages = [...formData.images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      const requiredFields = [
        { field: formData.productId, name: "Product ID" },
        { field: formData.name, name: "Product Name" },
        { field: formData.description, name: "Description" },
        { field: formData.price, name: "Price" },
        { field: formData.category, name: "Category" }
      ];

      const missingFields = requiredFields.filter(f => !f.field || f.field.toString().trim() === "");
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.map(f => f.name).join(", ")}`);
      }

      if (formData.price <= 0) {
        throw new Error("Price must be greater than 0");
      }

      if (formData.originalPrice && formData.originalPrice <= 0) {
        throw new Error("Original price must be greater than 0");
      }

      if (formData.originalPrice && formData.originalPrice < formData.price) {
        throw new Error("Original price must be greater than or equal to current price");
      }

      if (formData.images.length === 0) {
        throw new Error("Please add at least one image");
      }

      // Filter out empty features
      const filteredFeatures = formData.features.filter(feature => feature.trim() !== "");

      const dataToSend = {
        ...formData,
        features: filteredFeatures.length > 0 ? filteredFeatures : []
      };

      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to update product");
      }

      setSuccess("Product updated successfully!");
      setTimeout(() => {
        router.push("/products/crud");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete product");
      }

      router.push("/products/crud");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/products/crud"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
          
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#7AA859] mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading product data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Render error state if API failed
  if (apiError) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link
            href="/products/crud"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Product Load Error
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {apiError}
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <Link
                  href="/products/crud"
                  className="px-6 py-3 bg-[#7AA859] hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 text-center"
                >
                  Back to Products
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link
            href="/products/crud"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Products
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Edit Product
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Update product details
              </p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              <button
                onClick={handleDelete}
                className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 dark:border-red-400 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-200"
              >
                <FiTrash2 className="mr-2" />
                Delete Product
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 dark:bg-red-900/20 dark:border-red-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 dark:bg-green-900/20 dark:border-green-400">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Basic Information
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="productId"
                        value={formData.productId}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                        placeholder="e.g., PROD001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                        placeholder="Enter product name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                      placeholder="Describe the product..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="inStock"
                          checked={formData.inStock}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-[#7AA859] rounded border-gray-300 dark:border-gray-600 focus:ring-[#7AA859]"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Product is in stock
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Pricing
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Price ($) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        name="price"
                        value={formData.price || ""}
                        onChange={handleInputChange}
                        required
                        min="0.01"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Original Price ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        name="originalPrice"
                        value={formData.originalPrice || ""}
                        onChange={handleInputChange}
                        min="0.01"
                        step="0.01"
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave empty if there's no discount
                    </p>
                  </div>
                </div>
              </div>

              {/* Features Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Features
                  </h2>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="inline-flex items-center px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <FiPlus className="mr-1" />
                    Add Feature
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                        placeholder="Enter a feature"
                      />
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        disabled={formData.features.length <= 1}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiMinus className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Leave empty or remove features that don't apply
                </p>
              </div>
            </div>

            {/* Right Column - Images & Actions */}
            <div className="space-y-6">
              {/* Images Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Product Images <span className="text-red-500">*</span>
                </h2>
                
                {/* Image URLs Input */}
                <div className="mb-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newImage}
                      onChange={(e) => setNewImage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={addImage}
                      disabled={!newImage.trim()}
                      className="px-4 py-2 bg-[#7AA859] hover:bg-green-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiUpload className="h-5 w-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Enter full image URL and press Add
                  </p>
                </div>

                {/* Image Preview Gallery */}
                {formData.images.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                            <Image
                              src={image || "/placeholder.png"}
                              alt={`Product image ${index + 1}`}
                              width={200}
                              height={200}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.png";
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex space-x-2">
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index - 1)}
                                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
                                  title="Move left"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
                                title="Remove"
                              >
                                <FiTrash2 className="h-4 w-4 text-red-600" />
                              </button>
                              {index < formData.images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, index + 1)}
                                  className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors duration-200"
                                  title="Move right"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                          {index === 0 && (
                            <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      First image is the primary display image. Use arrows to reorder.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <FiUpload className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No images added yet
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Add at least one image URL above
                    </p>
                  </div>
                )}
              </div>

              {/* Ratings Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Ratings & Reviews
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rating (0-5)
                    </label>
                    <input
                      type="number"
                      name="rating"
                      value={formData.rating || ""}
                      onChange={handleInputChange}
                      min="0"
                      max="5"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Number of Reviews
                    </label>
                    <input
                      type="number"
                      name="reviews"
                      value={formData.reviews || ""}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#7AA859] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Save Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">
                  Save Changes
                </h2>
                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex justify-center items-center px-4 py-3 bg-[#7AA859] hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSave className="mr-2" />
                    {saving ? "Saving..." : "Update Product"}
                  </button>
                  <Link
                    href="/products/crud"
                    className="block text-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <FiX className="inline mr-2" />
                    Cancel
                  </Link>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                  All changes will be saved immediately
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Required Fields Note */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
            Required Fields
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Fields marked with <span className="text-red-500">*</span> are required</li>
            <li>• At least one image is required</li>
            <li>• Price must be greater than 0</li>
            <li>• Original price must be greater than current price (if set)</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}