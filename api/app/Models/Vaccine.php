<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vaccine extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'total_doses',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'total_doses' => 'integer',
        ];
    }

    public function inventoryRows(): HasMany
    {
        return $this->hasMany(FacilityVaccineInventory::class);
    }

    public function doseIntervals(): HasMany
    {
        return $this->hasMany(VaccineDoseInterval::class);
    }
}
