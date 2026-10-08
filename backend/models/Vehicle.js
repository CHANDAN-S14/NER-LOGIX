import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    driver: {
      type: String,
      default: 'Demo Driver',
      trim: true,
    },
    status: {
      type: String,
      default: 'idle',
      trim: true,
    },
    destination: {
      type: String,
      default: null,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    heading: {
      type: Number,
      default: 0,
      min: 0,
      max: 360,
    },
    load: {
      type: String,
      default: null,
    },
    deliveryStatus: {
      type: String,
      default: 'pending',
    },
    delayMin: {
      type: Number,
      default: 0,
    },
    /** Must remain clearly demo — never label as LIVE */
    source: {
      type: String,
      default: 'Demo fleet',
    },
    mode: {
      type: String,
      default: 'Hackathon simulation',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

vehicleSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this.vehicleId,
    _id: this._id.toString(),
    vehicleId: this.vehicleId,
    name: this.vehicleId,
    driver: this.driver,
    status: this.status,
    destination: this.destination,
    latitude: this.latitude,
    longitude: this.longitude,
    lat: this.latitude,
    lng: this.longitude,
    lon: this.longitude,
    position: [this.latitude, this.longitude],
    heading: this.heading,
    load: this.load,
    deliveryStatus: this.deliveryStatus,
    delayMin: this.delayMin,
    source: this.source,
    mode: this.mode,
    label: 'DEMO FLEET',
    lastUpdated: this.lastUpdated,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
