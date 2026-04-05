<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionVisit extends Model
{
    protected $fillable = [
        'facility_id',
        'vaccinee_id',
        'session_date',
        'status',
        'checked_in_at',
    ];

    protected function casts(): array
    {
        return [
            'session_date' => 'date',
            'checked_in_at' => 'datetime',
        ];
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function vaccinee(): BelongsTo
    {
        return $this->belongsTo(Vaccinee::class);
    }
}
