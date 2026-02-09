// components/add-product.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from './Layout';

interface ProductFormData {
  productId: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string; // Will store ObjectId
  image: string; // main image
  images: string[]; // multiple images
  rating: number;
  reviews: number;
  inStock: boolean;
  features: string[];
}

interface CloudinaryUploadResult {
  secure_url: string;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

export default function AddProduct() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [currentFeature, setCurrentFeature] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // New states
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    image: ''
  });

  const [formData, setFormData] = useState<ProductFormData>({
    productId: '',
    name: '',
    description: '',
    price: 0,
    originalPrice: undefined,
    category: '', // This will store ObjectId
    image: '',
    images: [],
    rating: 0,
    reviews: 0,
    inStock: true,
    features: [],
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data.data && Array.isArray(data.data)) {
        setCategories(data.data);
      } else if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

// components/add-product.tsx (শুধু createNewCategory ফাংশনটি আপডেট করুন)
const createNewCategory = async () => {
  if (!newCategory.name.trim()) {
    setErrors({ ...errors, category: 'Category name is required' });
    return;
  }

  try {
    // Use first product image if available for the new category
    const categoryImage = formData.images.length > 0 ? formData.images[0] : newCategory.image;

    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCategory.name.trim(),
        description: newCategory.description,
        image: categoryImage, // Use product image if available
        isActive: true
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      // Add the new category to the list
      const newCategoryData = {
        _id: result.data._id,
        name: result.data.name,
        slug: result.data.slug,
        image: result.data.image,
        productCount: 0,
      };
      
      setCategories(prev => [...prev, newCategoryData]);
      setFormData(prev => ({
        ...prev,
        category: result.data._id
      }));
      setShowNewCategory(false);
      setNewCategory({ name: '', description: '', image: '' });
      setErrors({ ...errors, category: '' });
      
      // Show success message
      setSuccess('Category created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setErrors({ 
        ...errors, 
        category: result.error || result.errors?.slug || 'Failed to create category' 
      });
    }
  } catch (error: any) {
    console.error('Error creating category:', error);
    setErrors({ ...errors, category: 'Failed to create category' });
  }
};

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    
    if (value === 'new') {
      setShowNewCategory(true);
      setFormData(prev => ({ ...prev, category: '' }));
    } else {
      setShowNewCategory(false);
      setFormData(prev => ({ ...prev, category: value }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);

    const uploadPromises = Array.from(files).map((file) =>
      uploadSingleImage(file)
    );

    try {
      const uploadedUrls = await Promise.all(uploadPromises);
      const successfulUploads = uploadedUrls.filter(
        (url) => url !== null
      ) as string[];

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...successfulUploads],
        image: prev.image || successfulUploads[0] || '',
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'upload_preset',
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'eshopsite'
    );

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${
          process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dwluovyrg'
        }/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data: CloudinaryUploadResult = await response.json();
        return data.secure_url;
      } else {
        console.error('Image upload failed');
        return null;
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: index === 0 && newImages.length > 0 ? newImages[0] : prev.image,
      };
    });
  };

  const setPrimaryImage = (index: number) => {
  setFormData(prev => {
    if (!prev.images[index]) return prev;

    const selected = prev.images[index];
    const newImages = [selected, ...prev.images.filter((_, i) => i !== index)];

    return {
      ...prev,
      image: selected,     // main image
      images: newImages,   // reorder so primary is first
    };
  });
};


  const addFeature = () => {
    if (currentFeature.trim() !== '') {
      setFeatures((prev) => [...prev, currentFeature.trim()]);
      setCurrentFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.productId.trim())
      newErrors.productId = 'Product ID is required.';
    if (!formData.name.trim()) newErrors.name = 'Product name is required.';
    if (!formData.description.trim())
      newErrors.description = 'Description is required.';
    if (formData.price <= 0)
      newErrors.price = 'Price must be greater than 0.';
    if (!formData.category.trim())
      newErrors.category = 'Category is required.';
    if (formData.images.length === 0)
      newErrors.images = 'At least one image is required.';
    if (formData.rating < 0 || formData.rating > 5)
      newErrors.rating = 'Rating must be between 0 and 5.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          features,
          price: Number(formData.price),
          originalPrice: formData.originalPrice
            ? Number(formData.originalPrice)
            : undefined,
          rating: Number(formData.rating),
          reviews: Number(formData.reviews),
        }),
      });

      if (response.ok) {
        setSuccess('Product created successfully!');
        setErrors({});
        setFormData({
          productId: '',
          name: '',
          description: '',
          price: 0,
          originalPrice: undefined,
          category: '',
          image: '',
          images: [],
          rating: 0,
          reviews: 0,
          inStock: true,
          features: [],
        });
        setFeatures([]);
        setNewCategory({ name: '', description: '', image: '' });
        setShowNewCategory(false);

        // Refresh categories to update product count
        fetchCategories();

        setTimeout(() => {
          router.push('/products');
          router.refresh();
        }, 1500);
      } else {
        const errorData = await response.json();
        setErrors({ general: errorData.error || 'Failed to create product.' });
      }
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ general: 'Error creating product. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

      {errors.general && (
        <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700">
          {errors.general}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-md bg-green-100 text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product ID & Name */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product ID *
            </label>
            <input
              type="text"
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            {errors.productId && (
              <p className="text-sm text-red-600">{errors.productId}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description *
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
          />
          {errors.description && (
            <p className="text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Price & Original Price */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price *
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            {errors.price && (
              <p className="text-sm text-red-600">{errors.price}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Original Price (optional)
            </label>
            <input
              type="number"
              name="originalPrice"
              value={formData.originalPrice || ''}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Rating (0–5)
            </label>
            <input
              type="number"
              name="rating"
              value={formData.rating}
              onChange={handleInputChange}
              min="0"
              max="5"
              step="0.1"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            {errors.rating && (
              <p className="text-sm text-red-600">{errors.rating}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Number of Reviews
            </label>
            <input
              type="number"
              name="reviews"
              value={formData.reviews}
              onChange={handleInputChange}
              min="0"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {/* Category - UPDATED */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          
          {loadingCategories ? (
            <div className="mt-1">
              <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
            </div>
          ) : (
            <>
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name} {cat.productCount ? `(${cat.productCount})` : ''}
                  </option>
                ))}
                <option value="new">+ Create New Category</option>
              </select>
              
              {showNewCategory && (
                <div className="mt-4 p-4 border border-gray-300 rounded-md bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Create New Category</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Category Name *
                      </label>
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        placeholder="e.g., Electronics, Clothing, etc."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description (optional)
                      </label>
                      <textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        placeholder="Brief description of the category"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Image URL (optional)
                      </label>
                      <input
                        type="text"
                        value={newCategory.image}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, image: e.target.value }))}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        placeholder="https://example.com/category-image.jpg"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={createNewCategory}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
                      >
                        Create Category
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory({ name: '', description: '', image: '' });
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Product Images *
          </label>
          <input
            type="file"
            name="images"
            onChange={handleImageUpload}
            accept="image/*"
            multiple
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {errors.images && (
            <p className="text-sm text-red-600">{errors.images}</p>
          )}
          {uploadingImages && (
            <div className="mt-2 flex items-center">
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 animate-pulse"
                  style={{ width: '50%' }}
                />
              </div>
              <span className="ml-2 text-sm text-gray-500">Uploading...</span>
            </div>
          )}
          {formData.images.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              {formData.images.map((image, index) => (
                <div key={index} className="relative border rounded-md p-2">
                  <img
                    src={image}
                    alt={`Preview ${index + 1}`}
                    className="h-32 w-full object-contain rounded-md"
                  />
                  <div className="mt-2 flex justify-between">
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(index)}
                      className={`text-xs px-2 py-1 rounded ${
                        formData.image === image
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      {formData.image === image ? 'Primary' : 'Set Primary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  {formData.image === image && (
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
                      Primary
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Features
          </label>
          <div className="mt-1 flex">
            <input
              type="text"
              value={currentFeature}
              onChange={(e) => setCurrentFeature(e.target.value)}
              placeholder="Enter a feature"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            <button
              type="button"
              onClick={addFeature}
              className="px-4 py-2 bg-emerald-600 text-white rounded-r-md hover:bg-emerald-700 transition-colors"
            >
              Add
            </button>
          </div>
          {features.length > 0 && (
            <ul className="mt-2 space-y-1">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md"
                >
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* In Stock */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="inStock"
            checked={formData.inStock}
            onChange={handleInputChange}
            className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <label className="ml-2 text-sm text-gray-900">In Stock</label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || uploadingImages}
          className="w-full py-3 px-4 bg-emerald-600 text-white rounded-md shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Adding Product...' : 'Add Product'}
        </button>
      </form>
    </div>
    </Layout>
  );
}