import type { Patient, VaccineRecord, Notification, HealthcareFacility, HealthcarePractitioner, User, DashboardStats } from './types';

export const currentUser: User = {
  id: 'USR001',
  name: 'Dr. Sarah Johnson',
  email: 'sarah.johnson@immunitrack.com',
  role: 'admin',
  facility: 'Central Medical Center',
  avatar: undefined,
};

export const facilities: HealthcareFacility[] = [
  { id: 'FAC001', name: 'Central Medical Center', address: '123 Health Ave, Medical City', phone: '+1 234 567 8900', type: 'Hospital' },
  { id: 'FAC002', name: 'Community Health Clinic', address: '456 Care Street, Wellness Town', phone: '+1 234 567 8901', type: 'Clinic' },
  { id: 'FAC003', name: 'Pediatric Care Center', address: '789 Child Lane, Family District', phone: '+1 234 567 8902', type: 'Specialty Center' },
];

export const practitioners: HealthcarePractitioner[] = [
  { id: 'HLC-PRAC-2026-00022', name: 'Dr. Sarah Johnson', practitionerId: 'HLC-PRAC-2026-00022', specialization: 'Pediatrics', facility: 'Central Medical Center', phone: '+1 234 567 8910', email: 'sarah.johnson@immunitrack.com' },
  { id: 'HLC-PRAC-2026-00023', name: 'Dr. Michael Chen', practitionerId: 'HLC-PRAC-2026-00023', specialization: 'Family Medicine', facility: 'Community Health Clinic', phone: '+1 234 567 8911', email: 'michael.chen@immunitrack.com' },
  { id: 'HLC-PRAC-2026-00024', name: 'Nurse Emily Davis', practitionerId: 'HLC-PRAC-2026-00024', specialization: 'Immunization Specialist', facility: 'Pediatric Care Center', phone: '+1 234 567 8912', email: 'emily.davis@immunitrack.com' },
];

export const patients: Patient[] = [
  { id: 'PAT001', name: 'James Wilson', dateOfBirth: '2024-05-15', gender: 'Male', phone: '+1 555 123 4567', email: 'james.parent@email.com', address: '101 Oak Street, Springfield', guardianName: 'Robert Wilson', guardianPhone: '+1 555 123 4568' },
  { id: 'PAT002', name: 'Emma Thompson', dateOfBirth: '2023-11-20', gender: 'Female', phone: '+1 555 234 5678', email: 'emma.parent@email.com', address: '202 Maple Avenue, Riverside', guardianName: 'Lisa Thompson', guardianPhone: '+1 555 234 5679' },
  { id: 'PAT003', name: 'Oliver Brown', dateOfBirth: '2025-01-10', gender: 'Male', phone: '+1 555 345 6789', email: 'oliver.parent@email.com', address: '303 Pine Road, Lakeside', guardianName: 'Mark Brown', guardianPhone: '+1 555 345 6790' },
  { id: 'PAT004', name: 'Sophia Martinez', dateOfBirth: '2024-08-25', gender: 'Female', phone: '+1 555 456 7890', email: 'sophia.parent@email.com', address: '404 Cedar Lane, Hilltown', guardianName: 'Maria Martinez', guardianPhone: '+1 555 456 7891' },
  { id: 'PAT005', name: 'Liam Johnson', dateOfBirth: '2025-02-18', gender: 'Male', phone: '+1 555 567 8901', email: 'liam.parent@email.com', address: '505 Birch Court, Valleyview', guardianName: 'David Johnson', guardianPhone: '+1 555 567 8902' },
  { id: 'PAT006', name: 'Ava Garcia', dateOfBirth: '2024-03-30', gender: 'Female', phone: '+1 555 678 9012', email: 'ava.parent@email.com', address: '606 Elm Street, Mountainside', guardianName: 'Carlos Garcia', guardianPhone: '+1 555 678 9013' },
];

export const vaccineRecords: VaccineRecord[] = [
  { id: 'VAC001', patientId: 'PAT001', patientName: 'James Wilson', vaccineName: 'BCG', batchNumber: 'BCG-2026-001', dateAdministered: '2024-05-20', doseNumber: 1, totalDosesRequired: 1, route: 'ID', administeredBy: 'Dr. Sarah Johnson', facility: 'Central Medical Center', followUpScheduled: false, status: 'completed', notes: 'Administered at birth, no adverse reactions' },
  { id: 'VAC002', patientId: 'PAT001', patientName: 'James Wilson', vaccineName: 'Hepatitis B', batchNumber: 'HEPB-2026-045', dateAdministered: '2024-05-20', doseNumber: 1, totalDosesRequired: 3, route: 'IM', administeredBy: 'Dr. Sarah Johnson', facility: 'Central Medical Center', nextDueDate: '2024-06-20', followUpScheduled: true, status: 'completed' },
  { id: 'VAC003', patientId: 'PAT001', patientName: 'James Wilson', vaccineName: 'Hepatitis B', batchNumber: 'HEPB-2026-078', dateAdministered: '2024-06-20', doseNumber: 2, totalDosesRequired: 3, route: 'IM', administeredBy: 'Nurse Emily Davis', facility: 'Central Medical Center', nextDueDate: '2024-11-20', followUpScheduled: true, status: 'completed' },
  { id: 'VAC004', patientId: 'PAT002', patientName: 'Emma Thompson', vaccineName: 'DTaP', batchNumber: 'DTAP-2026-112', dateAdministered: '2024-01-15', doseNumber: 1, totalDosesRequired: 5, route: 'IM', administeredBy: 'Dr. Michael Chen', facility: 'Community Health Clinic', nextDueDate: '2024-03-15', followUpScheduled: true, status: 'completed' },
  { id: 'VAC005', patientId: 'PAT002', patientName: 'Emma Thompson', vaccineName: 'Polio (IPV)', batchNumber: 'IPV-2026-089', dateAdministered: '2024-01-15', doseNumber: 1, totalDosesRequired: 4, route: 'IM', administeredBy: 'Dr. Michael Chen', facility: 'Community Health Clinic', nextDueDate: '2024-03-15', followUpScheduled: true, status: 'completed' },
  { id: 'VAC006', patientId: 'PAT003', patientName: 'Oliver Brown', vaccineName: 'BCG', batchNumber: 'BCG-2026-034', dateAdministered: '2025-01-12', doseNumber: 1, totalDosesRequired: 1, route: 'ID', administeredBy: 'Nurse Emily Davis', facility: 'Pediatric Care Center', followUpScheduled: false, status: 'completed' },
  { id: 'VAC007', patientId: 'PAT003', patientName: 'Oliver Brown', vaccineName: 'Hepatitis B', batchNumber: 'HEPB-2026-156', dateAdministered: '', doseNumber: 1, totalDosesRequired: 3, route: 'IM', administeredBy: '', facility: 'Pediatric Care Center', nextDueDate: '2025-03-25', followUpScheduled: true, status: 'scheduled' },
  { id: 'VAC008', patientId: 'PAT004', patientName: 'Sophia Martinez', vaccineName: 'MMR', batchNumber: 'MMR-2026-067', dateAdministered: '', doseNumber: 1, totalDosesRequired: 2, route: 'SC', administeredBy: '', facility: 'Central Medical Center', nextDueDate: '2025-03-20', followUpScheduled: true, status: 'overdue' },
  { id: 'VAC009', patientId: 'PAT005', patientName: 'Liam Johnson', vaccineName: 'Rotavirus', batchNumber: 'ROTA-2026-023', dateAdministered: '', doseNumber: 1, totalDosesRequired: 3, route: 'Oral', administeredBy: '', facility: 'Community Health Clinic', nextDueDate: '2025-04-18', followUpScheduled: true, status: 'pending' },
  { id: 'VAC010', patientId: 'PAT006', patientName: 'Ava Garcia', vaccineName: 'Varicella', batchNumber: 'VAR-2026-045', dateAdministered: '2025-03-15', doseNumber: 1, totalDosesRequired: 2, route: 'SC', administeredBy: 'Dr. Sarah Johnson', facility: 'Central Medical Center', nextDueDate: '2029-03-15', followUpScheduled: true, status: 'completed' },
];

export const notifications: Notification[] = [
  { id: 'NOT001', patientId: 'PAT003', patientName: 'Oliver Brown', type: 'sms', message: 'Reminder: Hepatitis B vaccination due on March 25, 2025 at Pediatric Care Center', scheduledDate: '2025-03-22', status: 'pending', vaccineName: 'Hepatitis B' },
  { id: 'NOT002', patientId: 'PAT003', patientName: 'Oliver Brown', type: 'whatsapp', message: 'Reminder: Hepatitis B vaccination due on March 25, 2025 at Pediatric Care Center', scheduledDate: '2025-03-23', status: 'pending', vaccineName: 'Hepatitis B' },
  { id: 'NOT003', patientId: 'PAT004', patientName: 'Sophia Martinez', type: 'email', message: 'URGENT: MMR vaccination overdue. Please schedule an appointment.', scheduledDate: '2025-03-21', status: 'sent', vaccineName: 'MMR' },
  { id: 'NOT004', patientId: 'PAT004', patientName: 'Sophia Martinez', type: 'sms', message: 'URGENT: MMR vaccination overdue. Please contact us to schedule.', scheduledDate: '2025-03-21', status: 'sent', vaccineName: 'MMR' },
  { id: 'NOT005', patientId: 'PAT005', patientName: 'Liam Johnson', type: 'email', message: 'Reminder: Rotavirus vaccination due on April 18, 2025', scheduledDate: '2025-04-15', status: 'pending', vaccineName: 'Rotavirus' },
  { id: 'NOT006', patientId: 'PAT001', patientName: 'James Wilson', type: 'sms', message: 'Hepatitis B dose 3 completed. Thank you for keeping up with vaccinations!', scheduledDate: '2024-11-20', status: 'sent', vaccineName: 'Hepatitis B' },
];

export const dashboardStats: DashboardStats = {
  totalPatients: 156,
  vaccinationsToday: 12,
  upcomingReminders: 28,
  overdueVaccinations: 5,
  completedThisMonth: 89,
  pendingFollowUps: 34,
};

export const vaccineTypes = [
  'BCG',
  'Hepatitis B',
  'DTaP',
  'Polio (IPV)',
  'Hib',
  'PCV',
  'Rotavirus',
  'MMR',
  'Varicella',
  'Hepatitis A',
  'Meningococcal',
  'HPV',
  'Influenza',
  'COVID-19',
];

export const administrationRoutes = ['IM', 'SC', 'ID', 'Oral'] as const;
