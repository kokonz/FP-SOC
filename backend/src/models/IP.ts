import mongoose, { Schema, Document } from 'mongoose';

export interface IIP extends Document {
  address: string;
  firstSeen: Date;
  lastSeen: Date;
  status: 'ACTIVE' | 'BLOCKED' | 'MONITORING';
  reputation: {
    virusTotal: {
      score: number;
      lastUpdate: Date;
      detections: string[];
    };
    abuseIPDB: {
      score: number;
      reports: number;
    };
  };
  geoLocation: {
    country: string;
    city: string;
    coordinates: [number, number];
    isp: string;
    asn: string;
  };  services: {
    ports: number[];
    protocols: string[];
    banners: string[];
  };
  scanningActivities: {
    sshAttempts: number;
    nmapScans: number;
    portScans: number;
    scannerIPs: string[];
    lastDetected: Date;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    lastCheck: Date;
    alerts: {
      timestamp: Date;
      type: string;
      description: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    }[];
  };
  aiAnalysis: {
    riskScore: number;
    findings: string[];
    recommendations: string[];
    lastAnalysis: Date;
  };
}

const IPSchema: Schema = new Schema({
  address: { type: String, required: true, unique: true },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'BLOCKED', 'MONITORING'],
    default: 'ACTIVE'
  },
  reputation: {
    virusTotal: {
      score: { type: Number, default: 0 },
      lastUpdate: { type: Date },
      detections: [String]
    },
    abuseIPDB: {
      score: { type: Number, default: 0 },
      reports: { type: Number, default: 0 }
    }
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
  services: {
    ports: [Number],
    protocols: [String],
    banners: [String]
  },
  monitoring: {
    enabled: { type: Boolean, default: false },
    interval: { type: Number, default: 3600 }, // Default 1 hour in seconds
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
  aiAnalysis: {
    riskScore: { type: Number, default: 0 },
    findings: [String],
    recommendations: [String],
    lastAnalysis: { type: Date }
  }
}, {
  timestamps: true
});

// Create indexes for better query performance
IPSchema.index({ address: 1 });
IPSchema.index({ status: 1 });
IPSchema.index({ 'monitoring.enabled': 1 });
IPSchema.index({ 'aiAnalysis.riskScore': 1 });

// Pre-save middleware to update lastSeen
IPSchema.pre('save', function(next) {
  this.lastSeen = new Date();
  next();
});

export default mongoose.model<IIP>('IP', IPSchema);
