import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;
  email: string;
  name: string;
  role: 'user' | 'biologe' | 'admin' | 'superadmin';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: { 
    type: String, 
    required: true,
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['user', 'biologe', 'admin', 'superadmin'], 
    default: 'user' 
  },
}, {
  timestamps: true,
});

// Erstelle das Modell nur, wenn es noch nicht existiert
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 