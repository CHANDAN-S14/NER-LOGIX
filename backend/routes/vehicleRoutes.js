import { Router } from 'express';
import {
  listVehicles,
  getVehicle,
  updateVehicleLocation,
} from '../controllers/vehicleController.js';

const router = Router();

router.get('/', listVehicles);
router.get('/:vehicleId', getVehicle);
router.patch('/:vehicleId/location', updateVehicleLocation);

export default router;