// app/api/users/address/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectMongo from '@/lib/mongoose';
import User from '@/models/User';

// Define TypeScript interfaces for address
interface UserAddress {
  _id?: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  label: 'home' | 'work' | 'other';
  phone?: string;
}

interface AddressRequestBody {
  addressId?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  isDefault?: boolean;
  label?: 'home' | 'work' | 'other';
  phone?: string;
}

// GET - Get all addresses for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    
    const user = await User.findOne({ email: session.user.email }).select('addresses');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ addresses: user.addresses });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AddressRequestBody = await request.json();
    const { street, city, state, zipCode, country, isDefault, label, phone } = body;

    // Basic validation
    if (!street || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Street, city, state, and ZIP code are required' },
        { status: 400 }
      );
    }

    await connectMongo();
    
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newAddress: UserAddress = {
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      country: country?.trim() || 'Bangladesh',
      isDefault: isDefault || false,
      label: label || 'home',
      phone: phone?.trim() || ''
    };

    // If setting as default, remove default from other addresses
    if (newAddress.isDefault) {
      user.addresses.forEach((addr: UserAddress) => {
        addr.isDefault = false;
      });
    }

    // If no addresses exist, set as default
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error: any) {
    console.error('Error adding address:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update address
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AddressRequestBody = await request.json();
    const { addressId, street, city, state, zipCode, country, isDefault, label, phone } = body;

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    await connectMongo();
    
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const addressIndex = user.addresses.findIndex((addr: UserAddress) => 
      addr._id?.toString() === addressId
    );
    
    if (addressIndex === -1) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    // Update address fields
    if (street !== undefined) user.addresses[addressIndex].street = street.trim();
    if (city !== undefined) user.addresses[addressIndex].city = city.trim();
    if (state !== undefined) user.addresses[addressIndex].state = state.trim();
    if (zipCode !== undefined) user.addresses[addressIndex].zipCode = zipCode.trim();
    if (country !== undefined) user.addresses[addressIndex].country = country.trim();
    if (label !== undefined) user.addresses[addressIndex].label = label;
    if (phone !== undefined) user.addresses[addressIndex].phone = phone.trim();

    // Handle default address change
    if (isDefault !== undefined) {
      if (isDefault) {
        user.addresses.forEach((addr: UserAddress) => {
          addr.isDefault = false;
        });
      }
      user.addresses[addressIndex].isDefault = isDefault;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses
    });
  } catch (error: any) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove address
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const addressId = searchParams.get('id');

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 });
    }

    await connectMongo();
    
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const addressIndex = user.addresses.findIndex((addr: UserAddress) => 
      addr._id?.toString() === addressId
    );
    
    if (addressIndex === -1) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const wasDefault = user.addresses[addressIndex].isDefault;
    
    user.addresses.splice(addressIndex, 1);

    // If we deleted the default address and there are other addresses, set the first one as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error: any) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}