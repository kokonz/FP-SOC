// backend/src/models/IP.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IDetectedActivity {
  timestamp: Date;
  type: 
    | 'SSH_FAILURE'
    | 'PORT_SCAN'
    | 'WEB_ENUMERATION'
    | 'POTENTIAL_RCE'
    | 'SUSPICIOUS_CONNECTION_RATE'
    | 'BLOCKED_SSH_ATTEMPT'
    | 'FIREWALL_BLOCK' // Kita tambahkan lagi untuk kompatibilitas sementara
    | 'UNKNOWN';
  sourceIP: string;
  details: string;
}

export interface IIP extends Document {
  address: string;
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
    lastCheck: Date;
    alerts: any[];
  };
  detectedActivities: IDetectedActivity[];
  aiAnalysis: {
    riskScore: number;
    summary: string;
    findings: string[];
    recommendations: string[];
    lastAnalysis: Date;
  };
}

const DetectedActivitySchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  type: {
    type: String,
    enum: [
      'SSH_FAILURE',
      'PORT_SCAN',
      'WEB_ENUMERATION',
      'POTENTIAL_RCE',
      'SUSPICIOUS_CONNECTION_RATE',
      'BLOCKED_SSH_ATTEMPT',
      'FIREWALL_BLOCK', // Ditambahkan kembali
      'UNKNOWN'
    ],
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
    lastCheck: Date,
    alerts: [Object]
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

IPSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

export default mongoose.model<IIP>('IP', IPSchema);