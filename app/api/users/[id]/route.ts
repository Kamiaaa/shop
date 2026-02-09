// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { name, email, role, password } = body;

    await connectMongo();

    const update: any = { name, email: email?.toLowerCase(), role };

    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    const updated = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select("-password");
    if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    const user = await User.findById(params.id, "-password").lean();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await connectMongo();
    await User.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "User deleted" });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
