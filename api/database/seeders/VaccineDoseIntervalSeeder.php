<?php

namespace Database\Seeders;

use App\Models\Vaccine;
use App\Models\VaccineDoseInterval;
use Illuminate\Database\Seeder;

/**
 * Default spacing between doses (days after completing dose N) for each vaccine.
 * Adjust per national schedule as needed.
 */
class VaccineDoseIntervalSeeder extends Seeder
{
    public function run(): void
    {
        $defaults = [
            1 => 28,
            2 => 28,
            3 => 28,
            4 => 56,
            5 => 180,
        ];

        foreach (Vaccine::query()->cursor() as $vaccine) {
            foreach ($defaults as $afterDose => $days) {
                VaccineDoseInterval::firstOrCreate(
                    [
                        'vaccine_id' => $vaccine->id,
                        'after_dose' => $afterDose,
                    ],
                    ['interval_days' => $days]
                );
            }
        }
    }
}
