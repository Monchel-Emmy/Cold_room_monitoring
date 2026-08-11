import { Hospital } from '../models/Hospital';
import { ColdRoom }  from '../models/ColdRoom';
import { Chamber }   from '../models/Chamber';
import { Vaccine }   from '../models/Vaccine';
import { SensorReading } from '../models/SensorReading';
import { Alert }     from '../models/Alert';
import { User }      from '../models/User';

// ── Utility ──────────────────────────────────────────────────────────────────
function rand(min: number, max: number, dp = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(dp));
}
function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export async function seedIfEmpty() {
  const hospitalCount = await Hospital.countDocuments();
  if (hospitalCount > 0) {
    console.log('📦 Seed already present — skipping');
    return;
  }

  console.log('🌱 Seeding Cold Room Monitoring demo data...');

  // ── Hospitals ───────────────────────────────────────────────────────────────
  const [h1, h2] = await Hospital.insertMany([
    { name: 'General Hospital Kigali',    type: 'hospital',       region: 'Kigali City', district: 'Nyarugenge', address: 'KN 3 Ave, Kigali', contactName: 'Dr. Jean Paul',  contactPhone: '+250 788 000 001', status: 'active' },
    { name: 'Kibagabaga Health Center',   type: 'health_center',  region: 'Kigali City', district: 'Gasabo',     address: 'KG 12 St, Kibagabaga', contactName: 'Dr. Alice',     contactPhone: '+250 788 000 002', status: 'active' },
  ]);

  // ── Cold Rooms ──────────────────────────────────────────────────────────────
  const [cr1, cr2, cr3, cr4] = await ColdRoom.insertMany([
    { name: 'Cold Room 1', hospitalId: h1._id, modelName: 'FrostMaster CR-200', serialNumber: 'CR-200-A1', type: 'walk_in_cooler', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    { name: 'Cold Room 2', hospitalId: h1._id, modelName: 'FrostMaster CR-200', serialNumber: 'CR-200-A2', type: 'freezer',       targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 30, targetHumidityMax: 60, status: 'operational' },
    { name: 'Cold Room A', hospitalId: h2._id, modelName: 'IceSafe IC-100',     serialNumber: 'IC-100-B1', type: 'walk_in_cooler', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    { name: 'Cold Room B', hospitalId: h2._id, modelName: 'IceSafe IC-100',     serialNumber: 'IC-100-B2', type: 'refrigerator',   targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'maintenance' },
  ]);

  // ── Chambers ────────────────────────────────────────────────────────────────
  const [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8] = await Chamber.insertMany([
    // Cold Room 1 chambers
    { name: 'Chamber A', coldRoomId: cr1._id, hospitalId: h1._id, sensorId: 'SENS-001', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    { name: 'Chamber B', coldRoomId: cr1._id, hospitalId: h1._id, sensorId: 'SENS-002', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    // Cold Room 2 chambers
    { name: 'Chamber A', coldRoomId: cr2._id, hospitalId: h1._id, sensorId: 'SENS-003', targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 30, targetHumidityMax: 60, status: 'operational' },
    { name: 'Chamber B', coldRoomId: cr2._id, hospitalId: h1._id, sensorId: 'SENS-004', targetTempMin: -25, targetTempMax: -15, targetHumidityMin: 30, targetHumidityMax: 60, status: 'operational' },
    // Cold Room A chambers
    { name: 'Chamber 1', coldRoomId: cr3._id, hospitalId: h2._id, sensorId: 'SENS-005', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    { name: 'Chamber 2', coldRoomId: cr3._id, hospitalId: h2._id, sensorId: 'SENS-006', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 45, targetHumidityMax: 75, status: 'operational' },
    // Cold Room B chambers
    { name: 'Chamber 1', coldRoomId: cr4._id, hospitalId: h2._id, sensorId: 'SENS-007', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'maintenance' },
    { name: 'Chamber 2', coldRoomId: cr4._id, hospitalId: h2._id, sensorId: 'SENS-008', targetTempMin: 2,   targetTempMax: 8,   targetHumidityMin: 40, targetHumidityMax: 70, status: 'operational' },
  ]);

  // ── Sensor Readings ─────────────────────────────────────────────────────────
  const allChambers = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8];
  const readingDocs: any[] = [];
  for (const ch of allChambers) {
    const isFreeze = ch.targetTempMin < 0;
    const baseTemp = isFreeze ? rand(-22, -16) : rand(3, 7);
    const baseHum  = isFreeze ? rand(32, 55) : rand(50, 68);
    // Last 24 readings (every 30 min)
    for (let i = 23; i >= 0; i--) {
      const ts = new Date(Date.now() - i * 30 * 60 * 1000);
      readingDocs.push({
        chamberId:   ch._id,
        coldRoomId:  (ch as any).coldRoomId,
        hospitalId:  (ch as any).hospitalId,
        temperature: parseFloat((baseTemp + rand(-0.5, 0.5)).toFixed(1)),
        humidity:    parseFloat((baseHum  + rand(-2, 2)).toFixed(1)),
        timestamp:   ts,
      });
    }
  }
  await SensorReading.insertMany(readingDocs);

  // ── Vaccines ─────────────────────────────────────────────────────────────────
  await Vaccine.insertMany([
    // Chamber A (cr1)
    { name: 'BCG Vaccine',           type: 'Live Attenuated', manufacturer: 'Serum Institute', batchNumber: 'BCG-2024-001', quantity: 500, unit: 'doses', chamberId: ch1._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(120),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    { name: 'Hepatitis B',           type: 'Recombinant',     manufacturer: 'GSK',             batchNumber: 'HB-2024-012',  quantity: 300, unit: 'doses', chamberId: ch1._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(25),   storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'at_risk' },
    { name: 'Pentavalent (DTP-HiB)', type: 'Combined',        manufacturer: 'Sanofi Pasteur',  batchNumber: 'PENTA-24-055', quantity: 240, unit: 'doses', chamberId: ch1._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(200),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    // Chamber B (cr1)
    { name: 'Measles-Rubella (MR)',  type: 'Live Attenuated', manufacturer: 'Merck',           batchNumber: 'MR-2024-088',  quantity: 420, unit: 'doses', chamberId: ch2._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(90),   storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    { name: 'Yellow Fever',          type: 'Live Attenuated', manufacturer: 'Sanofi Pasteur',  batchNumber: 'YF-2024-031',  quantity: 180, unit: 'doses', chamberId: ch2._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(-5),   storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'expired' },
    { name: 'HPV Vaccine',           type: 'Recombinant',     manufacturer: 'Merck',           batchNumber: 'HPV-2024-009', quantity: 150, unit: 'doses', chamberId: ch2._id, coldRoomId: cr1._id, hospitalId: h1._id, expiryDate: daysFromNow(180),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    // Chamber A (cr2 - freezer)
    { name: 'Oral Polio (OPV)',      type: 'Live Attenuated', manufacturer: 'BioFarma',        batchNumber: 'OPV-2024-077', quantity: 600, unit: 'doses', chamberId: ch3._id, coldRoomId: cr2._id, hospitalId: h1._id, expiryDate: daysFromNow(160),  storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 30, humidityMax: 60 }, status: 'active' },
    { name: 'Rotavirus Vaccine',     type: 'Live Attenuated', manufacturer: 'GSK',             batchNumber: 'RV-2024-044',  quantity: 360, unit: 'doses', chamberId: ch3._id, coldRoomId: cr2._id, hospitalId: h1._id, expiryDate: daysFromNow(100),  storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 30, humidityMax: 60 }, status: 'active' },
    // Chamber B (cr2 - freezer)
    { name: 'Varicella Vaccine',     type: 'Live Attenuated', manufacturer: 'Merck',           batchNumber: 'VAR-2024-019', quantity: 200, unit: 'doses', chamberId: ch4._id, coldRoomId: cr2._id, hospitalId: h1._id, expiryDate: daysFromNow(10),   storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 30, humidityMax: 60 }, status: 'at_risk' },
    { name: 'Influenza Vaccine',     type: 'Inactivated',     manufacturer: 'Sanofi Pasteur',  batchNumber: 'FLU-2024-061', quantity: 450, unit: 'doses', chamberId: ch4._id, coldRoomId: cr2._id, hospitalId: h1._id, expiryDate: daysFromNow(280),  storageRequirements: { tempMin: -25, tempMax: -15, humidityMin: 30, humidityMax: 60 }, status: 'active' },
    // Hospital 2 chambers
    { name: 'COVID-19 mRNA',         type: 'mRNA',            manufacturer: 'Pfizer-BioNTech', batchNumber: 'COV-2024-100', quantity: 800, unit: 'doses', chamberId: ch5._id, coldRoomId: cr3._id, hospitalId: h2._id, expiryDate: daysFromNow(60),   storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    { name: 'Meningococcal (MenA)',  type: 'Polysaccharide',  manufacturer: 'Serum Institute', batchNumber: 'MEN-2024-023', quantity: 320, unit: 'doses', chamberId: ch5._id, coldRoomId: cr3._id, hospitalId: h2._id, expiryDate: daysFromNow(150),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    { name: 'Typhoid Vaccine',       type: 'Vi Polysaccharide',manufacturer: 'Sanofi Pasteur', batchNumber: 'TYP-2024-008', quantity: 100, unit: 'doses', chamberId: ch6._id, coldRoomId: cr3._id, hospitalId: h2._id, expiryDate: daysFromNow(-15),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'expired' },
    { name: 'Rabies Vaccine',        type: 'Inactivated',     manufacturer: 'Novartis',        batchNumber: 'RAB-2024-041', quantity: 75,  unit: 'doses', chamberId: ch6._id, coldRoomId: cr3._id, hospitalId: h2._id, expiryDate: daysFromNow(240),  storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 45, humidityMax: 75 }, status: 'active' },
    { name: 'Cholera Vaccine',       type: 'Inactivated',     manufacturer: 'Shantha Biotech', batchNumber: 'CHO-2024-057', quantity: 200, unit: 'doses', chamberId: ch8._id, coldRoomId: cr4._id, hospitalId: h2._id, expiryDate: daysFromNow(18),   storageRequirements: { tempMin: 2, tempMax: 8, humidityMin: 40, humidityMax: 70 }, status: 'at_risk' },
  ]);

  // ── Alerts ───────────────────────────────────────────────────────────────────
  await Alert.insertMany([
    { chamberId: ch2._id, coldRoomId: cr1._id, hospitalId: h1._id, type: 'temp_high', severity: 'high',   message: 'Chamber B temperature exceeded 8°C', value: 9.2, threshold: 8,  acknowledged: false },
    { chamberId: ch4._id, coldRoomId: cr2._id, hospitalId: h1._id, type: 'temp_high', severity: 'critical', message: 'Freezer Chamber B temperature is dangerously high', value: -12, threshold: -15, acknowledged: false },
    { chamberId: ch8._id, coldRoomId: cr4._id, hospitalId: h2._id, type: 'humidity_high', severity: 'medium', message: 'Chamber 2 humidity above threshold', value: 74, threshold: 70, acknowledged: true },
  ]);

  console.log(`✅ Seeded: 2 hospitals, 4 cold rooms, 8 chambers, 15 vaccines, 3 alerts, ${readingDocs.length} sensor readings`);

  // ── Users ────────────────────────────────────────────────────────────────────
  await User.create([
    { name: 'System Admin',   email: 'admin@coldroom.io',   password: 'Admin@1234',    role: 'admin',      hospitalId: null,     status: 'active' },
    { name: 'Kigali Manager', email: 'manager@kigali.io',  password: 'Manager@1234',  role: 'manager',    hospitalId: h1._id,  status: 'active' },
    { name: 'Kibagabaga Tech',email: 'tech@kibagabaga.io', password: 'Tech@1234',     role: 'technician', hospitalId: h2._id,  status: 'active' },
  ]);

  console.log('👤 Default users seeded:');
  console.log('   admin@coldroom.io / Admin@1234  (Super Admin)');
  console.log('   manager@kigali.io / Manager@1234 (Hospital Manager)');
  console.log('   tech@kibagabaga.io / Tech@1234  (Technician)');
}
