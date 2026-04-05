<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\FacilityVaccineInventory;
use App\Models\Guardian;
use App\Models\Vaccine;
use App\Models\Vaccinee;
use Illuminate\Database\Seeder;

/**
 * Demo patients (vaccinees), vaccine catalog rows, and facility stock for Drop Access Demo Clinic.
 * Safe to run multiple times (uses firstOrCreate / deterministic keys).
 */
class DemoClinicDataSeeder extends Seeder
{
    public const CLINIC_NAME = 'Drop Access Demo Clinic';

    public function run(): void
    {
        $facility = Facility::query()->where('name', self::CLINIC_NAME)->first();
        if ($facility === null) {
            $this->command->warn('Facility "'.self::CLINIC_NAME.'" not found. Run UserSeeder first.');

            return;
        }

        $vaccines = $this->seedVaccines();
        $this->seedInventory($facility, $vaccines);
        $this->seedPatients($facility);
    }

    /**
     * @return array<string, Vaccine>
     */
    protected function seedVaccines(): array
    {
        $defs = [
            'BCG' => ['name' => 'BCG (Bacillus Calmette–Guérin)', 'description' => 'Tuberculosis vaccine (birth dose).'],
            'HEPB' => ['name' => 'Hepatitis B', 'description' => 'Hepatitis B vaccine.'],
            'OPV' => ['name' => 'Oral Polio (OPV)', 'description' => 'Oral poliovirus vaccine.'],
            'IPV' => ['name' => 'Inactivated Polio (IPV)', 'description' => 'Inactivated poliovirus vaccine.'],
            'PENTA' => ['name' => 'Pentavalent (DTP-HepB-Hib)', 'description' => 'Combined diphtheria, tetanus, pertussis, Hep B, Hib.'],
            'PCV' => ['name' => 'Pneumococcal conjugate (PCV)', 'description' => 'Pneumococcal conjugate vaccine.'],
            'MR' => ['name' => 'Measles–Rubella (MR)', 'description' => 'Measles and rubella vaccine.'],
            'YELLOWFEVER' => ['name' => 'Yellow Fever', 'description' => 'Yellow fever vaccine.'],
        ];

        $out = [];
        foreach ($defs as $code => $meta) {
            $out[$code] = Vaccine::firstOrCreate(
                ['code' => $code],
                [
                    'name' => $meta['name'],
                    'description' => $meta['description'],
                    'is_active' => true,
                ]
            );
        }

        return $out;
    }

    /**
     * @param  array<string, Vaccine>  $vaccines
     */
    protected function seedInventory(Facility $facility, array $vaccines): void
    {
        $lines = [
            ['key' => 'BCG', 'batch' => 'DEMO-BCG-2026-041', 'qty' => 80, 'expiry' => '2027-08-30', 'reorder' => 15],
            ['key' => 'HEPB', 'batch' => 'DEMO-HEPB-2026-018', 'qty' => 200, 'expiry' => '2027-02-14', 'reorder' => 40],
            ['key' => 'OPV', 'batch' => 'DEMO-OPV-2026-092', 'qty' => 150, 'expiry' => '2026-12-01', 'reorder' => 30],
            ['key' => 'IPV', 'batch' => 'DEMO-IPV-2026-055', 'qty' => 96, 'expiry' => '2027-05-20', 'reorder' => 24],
            ['key' => 'PENTA', 'batch' => 'DEMO-PNT-2026-033', 'qty' => 180, 'expiry' => '2027-01-10', 'reorder' => 36],
            ['key' => 'PCV', 'batch' => 'DEMO-PCV-2026-067', 'qty' => 72, 'expiry' => '2027-04-22', 'reorder' => 18],
            ['key' => 'MR', 'batch' => 'DEMO-MR-2026-011', 'qty' => 110, 'expiry' => '2026-11-15', 'reorder' => 22],
            ['key' => 'YELLOWFEVER', 'batch' => 'DEMO-YF-2026-004', 'qty' => 48, 'expiry' => '2027-09-01', 'reorder' => 12],
        ];

        foreach ($lines as $line) {
            $v = $vaccines[$line['key']] ?? null;
            if ($v === null) {
                continue;
            }
            FacilityVaccineInventory::firstOrCreate(
                [
                    'facility_id' => $facility->id,
                    'vaccine_id' => $v->id,
                    'batch_number' => $line['batch'],
                ],
                [
                    'quantity_on_hand' => $line['qty'],
                    'expiry_date' => $line['expiry'],
                    'reorder_threshold' => $line['reorder'],
                ]
            );
        }
    }

    protected function seedPatients(Facility $facility): void
    {
        $rows = [
            [
                'ext' => 'demo-dropaccess-patient-001',
                'first' => 'Mariam',
                'last' => 'Otieno',
                'gender' => 'Female',
                'dob' => '2024-03-12',
                'phone' => '+254711100001',
                'email' => 'guardian.otieno1@example.com',
                'address' => 'Kisumu',
                'guardian' => ['name' => 'Grace Otieno', 'phone' => '+254722200001', 'email' => 'grace.otieno@example.com'],
            ],
            [
                'ext' => 'demo-dropaccess-patient-002',
                'first' => 'Kofi',
                'last' => 'Mensah',
                'gender' => 'Male',
                'dob' => '2023-09-05',
                'phone' => '+254711100002',
                'email' => 'guardian.mensah@example.com',
                'address' => 'Nairobi',
                'guardian' => ['name' => 'Kwame Mensah', 'phone' => '+254722200002', 'email' => 'kwame.mensah@example.com'],
            ],
            [
                'ext' => 'demo-dropaccess-patient-003',
                'first' => 'Zara',
                'last' => 'Kimani',
                'gender' => 'Female',
                'dob' => '2025-01-20',
                'phone' => '+254711100003',
                'email' => 'guardian.kimani@example.com',
                'address' => 'Nakuru',
                'guardian' => ['name' => 'Wanjiru Kimani', 'phone' => '+254722200003', 'email' => 'wanjiru.kimani@example.com'],
            ],
            [
                'ext' => 'demo-dropaccess-patient-004',
                'first' => 'Jamal',
                'last' => 'Hassan',
                'gender' => 'Male',
                'dob' => '2024-11-02',
                'phone' => '+254711100004',
                'email' => 'guardian.hassan@example.com',
                'address' => 'Mombasa',
                'guardian' => ['name' => 'Fatima Hassan', 'phone' => '+254722200004', 'email' => 'fatima.hassan@example.com'],
            ],
            [
                'ext' => 'demo-dropaccess-patient-005',
                'first' => 'Achieng',
                'last' => 'Oduor',
                'gender' => 'Female',
                'dob' => '2022-07-18',
                'phone' => '+254711100005',
                'email' => 'guardian.oduor@example.com',
                'address' => 'Eldoret',
                'guardian' => ['name' => 'Peter Oduor', 'phone' => '+254722200005', 'email' => 'peter.oduor@example.com'],
            ],
        ];

        foreach ($rows as $row) {
            $g = $row['guardian'];
            $guardian = Guardian::firstOrCreate(
                [
                    'facility_id' => $facility->id,
                    'phone' => $g['phone'],
                ],
                [
                    'name' => $g['name'],
                    'email' => $g['email'],
                    'address' => $row['address'],
                ]
            );

            Vaccinee::firstOrCreate(
                ['external_id' => $row['ext']],
                [
                    'facility_id' => $facility->id,
                    'guardian_id' => $guardian->id,
                    'first_name' => $row['first'],
                    'last_name' => $row['last'],
                    'name' => $row['first'].' '.$row['last'],
                    'gender' => $row['gender'],
                    'date_of_birth' => $row['dob'],
                    'phone' => $row['phone'],
                    'email' => $row['email'],
                    'address' => $row['address'],
                ]
            );
        }
    }
}
