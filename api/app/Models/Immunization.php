<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Immunization extends Model
{
    protected $fillable = [
        'vaccinee_id',
        'vaccine_id',
        'facility_id',
        'facility_vaccine_inventory_id',
        'administered_by',
        'batch_number',
        'vial_barcode',
        'expiry_date',
        'vvm_confirmed',
        'date_administered',
        'dose_number',
        'total_doses_required',
        'administration_route_id',
        'next_due_date',
        'followup_scheduled',
        'notes',
        'status',
        'external_id',
        'outcome',
        'injection_site',
    ];

    protected function casts(): array
    {
        return [
            'date_administered' => 'date',
            'next_due_date' => 'date',
            'expiry_date' => 'date',
            'followup_scheduled' => 'boolean',
            'vvm_confirmed' => 'boolean',
        ];
    }

    public function vaccinee(): BelongsTo
    {
        return $this->belongsTo(Vaccinee::class);
    }

    public function vaccine(): BelongsTo
    {
        return $this->belongsTo(Vaccine::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administered_by');
    }

    public function administrationRoute(): BelongsTo
    {
        return $this->belongsTo(AdministrationRoute::class);
    }

    public function facilityVaccineInventory(): BelongsTo
    {
        return $this->belongsTo(FacilityVaccineInventory::class);
    }
}
