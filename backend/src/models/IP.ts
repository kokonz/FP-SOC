// backend/src/models/IP.ts

import mongoose, { Schema, Document } from 'mongoose';

// Interface untuk satu aktivitas yang terdeteksi
export interface IDetectedActivity {
  timestamp: Date;
  type: 'SSH_FAILURE' | 'PORT_SCAN' | 'FIREWALL_BLOCK' | 'MALICIOUS_REQUEST' | 'UNKNOWN';
  sourceIP: string;
  details: string; // Log asli atau deskripsi singkat
}

export interface IIP extends Document {
  address: string; // IP yang dimonitor
  firstSeen: Date;
  lastSeen: Date;
  status: 'ACTIVE' | 'BLOCKED' | 'MONITORING';
  geoLocation: {
    country: string;
    city: string;
    coordinates: [number, number];
    isp: string;
    asn: string;
  };
  monitoring: {
    enabled: boolean;
    interval?: number; // Interval tidak lagi krusial, karena kita berbasis event
    lastCheck: Date;
    alerts: {
      timestamp: Date;
      type: string;
      description:string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
  };
  // Menggantikan field reputation dan services
  detectedActivities: IDetectedActivity[];
  aiAnalysis: {
    riskScore: number;
    summary: string; // Ringkasan ancaman oleh AI
    findings: string[];
    recommendations: string[];
    lastAnalysis: Date;
  };
}

const DetectedActivitySchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  type: {
    type: String,
    enum: ['SSH_FAILURE', 'PORT_SCAN', 'FIREWALL_BLOCK', 'MALICIOUS_REQUEST', 'UNKNOWN'],
    required: true
  },
  sourceIP: { type: String, required: true, index: true },
  details: { type: String, required: true }
});

const IPSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true, index: true },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['ACTIVE', 'BLOCKED', 'MONITORING'],
    default: 'ACTIVE'
  },
  geoLocation: {
    country: String,
    city: String,
    coordinates: {
      type: [Number],
      index: '2dsphere'
    },
    isp: String,
    asn: String
  },
  monitoring: {
    enabled: { type: Boolean, default: false },
    interval: Number,
    lastCheck: Date,
    alerts: [{
      timestamp: { type: Date, default: Date.now },
      type: String,
      description: String,
      severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
      }
    }]
  },
  detectedActivities: [DetectedActivitySchema],
  aiAnalysis: {
    riskScore: { type: Number, default: 0 },
    summary: { type: String, default: 'No analysis performed yet.' },
    findings: [String],
    recommendations: [String],
    lastAnalysis: { type: Date }
  }
}, {
  timestamps: true
});

// Pre-save middleware untuk update lastSeen
IPSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

export default mongoose.model<IIP>('IP', IPSchema);