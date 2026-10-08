import mongoose from 'mongoose';

export const ROAD_STATUSES = Object.freeze(['passable', 'restricted', 'blocked']);
export const ROAD_RISK_LEVELS = Object.freeze(['low', 'moderate', 'high', 'critical']);

const roadSchema = new mongoose.Schema(
  {
    roadName: {
      type: String,
      required: [true, 'Road name is required'],
      trim: true,
      maxlength: 200,
    },
    geometry: {
      type: {
        type: String,
        enum: ['LineString', 'MultiLineString', 'Point', 'Polygon'],
        default: 'LineString',
      },
      coordinates: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ROAD_STATUSES,
      default: 'passable',
    },
    riskLevel: {
      type: String,
      enum: ROAD_RISK_LEVELS,
      default: 'low',
    },
    blockageReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    /** Demo/hackathon marker — never treat as live telemetry */
    source: {
      type: String,
      default: null,
    },
    mode: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

roadSchema.index({ status: 1 });


roadSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    roadName: this.roadName,
    name: this.roadName,
    geometry: this.geometry,
    status: this.status,
    riskLevel: this.riskLevel,
    blockageReason: this.blockageReason,
    lastUpdated: this.lastUpdated,
    source: this.source,
    mode: this.mode,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Road = mongoose.model('Road', roadSchema);
export default Road;
