<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class FacilityVaccineInventory extends Model
{
    protected $table = 'facility_vaccine_inventory';

    protected $fillable = [
        'facility_id',
        'vaccine_id',
        'quantity_on_hand',
        'batch_number',
        'expiry_date',
        'reorder_threshold',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
        ];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function vaccine(): BelongsTo
    {
        return $this->belongsTo(Vaccine::class);
    }

    protected static function booted(): void
    {
        static::creating(function (FacilityVaccineInventory $model): void {
            $batch = $model->batch_number;
            if ($batch === null || (is_string($batch) && trim($batch) === '')) {
                $model->batch_number = 'VA-'.now()->format('Ymd').'-'.strtoupper(Str::random(8));
            }
        });
    }
}
