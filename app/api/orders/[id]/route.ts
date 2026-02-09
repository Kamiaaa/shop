// app/api/orders/[id]/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectMongo from '@/lib/mongoose';
import Order from '@/models/Order';

interface Params {
  params: {
    id: string;
  };
}

// GET: Fetch single order by ID
export async function GET(req: Request, { params }: Params) {
  try {
    await connectMongo();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const order = await Order.findById(id).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Convert MongoDB document to plain object
    const orderData = {
      ...order,
      _id: order._id.toString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...(order.statusUpdatedAt && { statusUpdatedAt: order.statusUpdatedAt.toISOString() })
    };

    return NextResponse.json(orderData, { status: 200 });
  } catch (err: any) {
    console.error('Order API Error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}

// PUT: Update order status
export async function PUT(req: Request, { params }: Params) {
  try {
    await connectMongo();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
    }

    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status, 
        statusUpdatedAt: new Date() 
      },
      { new: true }
    ).lean();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = {
      ...order,
      _id: order._id.toString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      ...(order.statusUpdatedAt && { statusUpdatedAt: order.statusUpdatedAt.toISOString() })
    };

    return NextResponse.json(orderData, { status: 200 });
  } catch (err: any) {
    console.error('Order Update Error:', err);
    return NextResponse.json(
      { error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}