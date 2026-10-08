import mongoose from 'mongoose';

export const INCIDENT_SEVERITIES = Object.freeze(['low', 'moderate', 'high', 'blocked']);
export const INCIDENT_STATUSES = Object.freeze(['open', 'verified', 'resolved']);

const incidentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, 'Incident type is required'],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: -180,
      max: 180,
    },
    image: {
      type: String,
      default: null,
      trim: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    severity: {
      type: String,
      enum: INCIDENT_SEVERITIES,
      default: 'moderate',
    },
    status: {
      type: String,
      enum: INCIDENT_STATUSES,
      default: 'open',
    },
  },
  { timestamps: true }
);

incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ latitude: 1, longitude: 1 });

incidentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    _id: this._id.toString(),
    type: this.type,
    description: this.description,
    latitude: this.latitude,
    longitude: this.longitude,
    lat: this.latitude,
    lng: this.longitude,
    lon: this.longitude,
    image: this.image,
    reportedBy: this.reportedBy,
    severity: this.severity,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;