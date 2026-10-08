import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';

import Vehicle from './models/Vehicle.js';
import Road from './models/Road.js';
import User from './models/User.js';
import Incident from './models/Incident.js';

// const DEMO_VEHICLES = [
//   {
//     vehicleId: 'NER-01',
//     driver: 'Demo Driver A',
//     status: 'en_route',
//     destination: 'Shillong',
//     latitude: 26.1445,
//     longitude: 91.7362,
//     heading: 120,
//     load: 'Relief supplies',
//     deliveryStatus: 'in_transit',
//     delayMin: 0,
//     source: 'Demo fleet',
//     mode: 'Hackathon simulation',
//   },
//   {
//     vehicleId: 'NER-02',
//     driver: 'Demo Driver B',
//     status: 'idle',
//     destination: null,
//     latitude: 26.1062,
//     longitude: 91.5859,
//     heading: 45,
//     load: null,
//     deliveryStatus: 'pending',
//     delayMin: 0,
//     source: 'Demo fleet',
//     mode: 'Hackathon simulation',
//   },
//   {
//     vehicleId: 'NER-03',
//     driver: 'Demo Driver C',
//     status: 'diverted',
//     destination: 'Tura',
//     latitude: 26.148,
//     longitude: 91.6705,
//     heading: 210,
//     load: 'Medical kits',
//     deliveryStatus: 'delayed',
//     delayMin: 25,
//     source: 'Demo fleet',
//     mode: 'Hackathon simulation',
//   },
// ];

async function seed() {
  try {
    await connectDB();

    console.log('\n====================================');
    console.log('NER-LOGIX DATABASE CLEANUP');
    console.log('====================================\n');

    // --------------------------------------------------
    // 1. CLEAR INFORMATION WE DON'T WANT TO KEEP
    // --------------------------------------------------

    const roads = await Road.deleteMany({});
    console.log(`✓ Roads cleared: ${roads.deletedCount}`);

    const incidents = await Incident.deleteMany({});
    console.log(`✓ Incidents cleared: ${incidents.deletedCount}`);

    const users = await User.deleteMany({});
    console.log(`✓ Users cleared: ${users.deletedCount}`);

    // --------------------------------------------------
    // 2. KEEP ONLY THE THREE VEHICLES
    // --------------------------------------------------

    const vehicleIds = DEMO_VEHICLES.map((v) => v.vehicleId);

    // Remove any vehicles that are NOT part of our
    // three-vehicle demo fleet.
    const removedVehicles = await Vehicle.deleteMany({
      vehicleId: { $nin: vehicleIds },
    });

    console.log(
      `✓ Other vehicles removed: ${removedVehicles.deletedCount}`
    );

    // --------------------------------------------------
    // 3. CREATE / UPDATE THE THREE VEHICLES
    // --------------------------------------------------

    for (const vehicle of DEMO_VEHICLES) {
      await Vehicle.findOneAndUpdate(
        { vehicleId: vehicle.vehicleId },
        {
          ...vehicle,
          lastUpdated: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`✓ Vehicle kept: ${vehicle.vehicleId}`);
    }

    // --------------------------------------------------
    // 4. FINAL DATABASE CHECK
    // --------------------------------------------------

    const vehicleCount = await Vehicle.countDocuments();
    const roadCount = await Road.countDocuments();
    const incidentCount = await Incident.countDocuments();
    const userCount = await User.countDocuments();

    console.log('\n====================================');
    console.log('DATABASE STATUS');
    console.log('====================================');

    console.log(`Vehicles : ${vehicleCount}`);
    console.log(`Roads    : ${roadCount}`);
    console.log(`Incidents: ${incidentCount}`);
    console.log(`Users    : ${userCount}`);

    console.log('\n✓ Database information cleaned.');
    console.log('✓ Vehicle information preserved.');
    console.log('✓ APIs were NOT deleted.');
    console.log('✓ Backend routes were NOT deleted.');
    console.log('====================================\n');

  } catch (error) {
    console.error('\n✗ Database cleanup failed:');
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();