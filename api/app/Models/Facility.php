<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Facility extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'type',
        'frappe_customer_match',
        'vaccibox_device_ids',
    ];

    protected function casts(): array
    {
        return [
            'vaccibox_device_ids' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class);
    }

    public function vaccinees(): HasMany
    {
        return $this->hasMany(Vaccinee::class);
    }

    public function vaccineInventory(): HasMany
    {
        return $this->hasMany(FacilityVaccineInventory::class);
    }
}
