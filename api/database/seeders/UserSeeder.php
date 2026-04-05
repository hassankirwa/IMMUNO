<?php

namespace Database\Seeders;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Health officers seeded for the main demo facility (shared login pattern for local dev).
     */
    private const DEMO_CLINIC_EXTRA_OFFICERS = [
        ['email' => 'samuel.k@dropaccess.org', 'name' => 'Samuel Kamau', 'password' => 'OfficerDropAccess2026!'],
        ['email' => 'amina.h@dropaccess.org', 'name' => 'Amina Hassan', 'password' => 'OfficerDropAccess2026!'],
        ['email' => 'david.o@dropaccess.org', 'name' => 'David Ochieng', 'password' => 'OfficerDropAccess2026!'],
        ['email' => 'lucy.w@dropaccess.org', 'name' => 'Lucy Wambui', 'password' => 'OfficerDropAccess2026!'],
        ['email' => 'james.m@dropaccess.org', 'name' => 'James Mutua', 'password' => 'OfficerDropAccess2026!'],
        ['email' => 'eve.n@dropaccess.org', 'name' => 'Eve Njeri', 'password' => 'OfficerDropAccess2026!'],
    ];

    /**
     * Additional facilities (each gets one staff user for multi-site demos).
     *
     * @var list<array{name: string, address: string, phone: string, type: string, staff_email: string, staff_name: string}>
     */
    private const EXTRA_FACILITIES = [
        [
            'name' => 'Kisumu North Community Clinic',
            'address' => '45 Oginga Odinga Rd, Kisumu',
            'phone' => '+254733100101',
            'type' => 'clinic',
            'staff_email' => 'officer.kisumu@dropaccess.org',
            'staff_name' => 'Rose Akinyi',
        ],
        [
            'name' => 'Nakuru East Vaccination Hub',
            'address' => '12 Kenyatta Ave, Nakuru',
            'phone' => '+254733100102',
            'type' => 'health_center',
            'staff_email' => 'officer.nakuru@dropaccess.org',
            'staff_name' => 'Tom Ruto',
        ],
        [
            'name' => 'Mombasa Coastal Family Health',
            'address' => '8 Nyali Rd, Mombasa',
            'phone' => '+254733100103',
            'type' => 'clinic',
            'staff_email' => 'officer.mombasa@dropaccess.org',
            'staff_name' => 'Halima Ali',
        ],
        [
            'name' => 'Eldoret West Immunization Center',
            'address' => '200 Uganda Rd, Eldoret',
            'phone' => '+254733100104',
            'type' => 'specialty_center',
            'staff_email' => 'officer.eldoret@dropaccess.org',
            'staff_name' => 'Brian Kipchoge',
        ],
        [
            'name' => 'Thika Gateway Medical Plaza',
            'address' => '15 Kenyatta Hwy, Thika',
            'phone' => '+254733100105',
            'type' => 'hospital',
            'staff_email' => 'officer.thika@dropaccess.org',
            'staff_name' => 'Grace Muthoni',
        ],
    ];

    /**
     * Seed demo / default users (admin + health officers).
     * Change passwords in production; prefer env-based secrets for deployments.
     */
    public function run(): void
    {
        $facility = Facility::firstOrCreate(
            ['name' => 'Drop Access Demo Clinic'],
            [
                'address' => '123 Health St',
                'phone' => '+1000000000',
                'type' => 'clinic',
            ]
        );

        foreach (self::EXTRA_FACILITIES as $meta) {
            $extra = Facility::firstOrCreate(
                ['name' => $meta['name']],
                [
                    'address' => $meta['address'],
                    'phone' => $meta['phone'],
                    'type' => $meta['type'],
                ]
            );
            $staff = User::firstOrCreate(
                ['email' => $meta['staff_email']],
                [
                    'name' => $meta['staff_name'],
                    'password' => Hash::make('OfficerDropAccess2026!'),
                    'facility_id' => $extra->id,
                ]
            );
            if (! $staff->hasRole('health_officer')) {
                $staff->syncRoles(['health_officer']);
            }
        }

        foreach (self::DEMO_CLINIC_EXTRA_OFFICERS as $officer) {
            $user = User::firstOrCreate(
                ['email' => $officer['email']],
                [
                    'name' => $officer['name'],
                    'password' => Hash::make($officer['password']),
                    'facility_id' => $facility->id,
                ]
            );
            if (! $user->hasRole('health_officer')) {
                $user->syncRoles(['health_officer']);
            }
        }

        $admin = User::firstOrCreate(
            ['email' => 'admin@dropaccess.org'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('AdminDropAccess2026!'),
                'facility_id' => null,
            ]
        );
        if (! $admin->hasRole('admin')) {
            $admin->syncRoles(['admin']);
        }

        $mark = User::firstOrCreate(
            ['email' => 'markcollin@dropaccess.org'],
            [
                'name' => 'Mark Collin',
                'password' => Hash::make('Adfodd670!'),
                'facility_id' => $facility->id,
            ]
        );
        if (! $mark->hasRole('health_officer')) {
            $mark->syncRoles(['health_officer']);
        }

        $officer = User::firstOrCreate(
            ['email' => 'officer@dropaccess.org'],
            [
                'name' => 'Health Officer',
                'password' => Hash::make('OfficerDropAccess2026!'),
                'facility_id' => $facility->id,
            ]
        );
        if (! $officer->hasRole('health_officer')) {
            $officer->syncRoles(['health_officer']);
        }

        $nurse = User::firstOrCreate(
            ['email' => 'nurse@dropaccess.org'],
            [
                'name' => 'Clinic Nurse',
                'password' => Hash::make('NurseDropAccess2026!'),
                'facility_id' => $facility->id,
            ]
        );
        if (! $nurse->hasRole('health_officer')) {
            $nurse->syncRoles(['health_officer']);
        }
    }
}
