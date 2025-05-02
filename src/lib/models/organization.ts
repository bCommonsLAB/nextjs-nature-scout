import { Schema, model, models } from 'mongoose';

const OrganizationSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name ist erforderlich'],
    trim: true,
  },
  logo: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    trim: true,
  },
  web: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Vor dem Speichern updatedAt aktualisieren
OrganizationSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Prüfen, ob das Modell bereits existiert, bevor es neu erstellt wird
export const Organization = models.Organization || model('Organization', OrganizationSchema); 