<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vaccinee extends Model
{
    protected $fillable = [
        'facility_id',
        'guardian_id',
        'first_name',
        'last_name',
        'name',
        'gender',
        'date_of_birth',
        'phone',
        'email',
        'address',
        'external_id',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class);
    }

    public function immunizations(): HasMany
    {
        return $this->hasMany(Immunization::class);
    }
}
