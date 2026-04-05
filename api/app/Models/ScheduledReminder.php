<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduledReminder extends Model
{
    protected $fillable = [
        'facility_id',
        'vaccinee_id',
        'vaccine_id',
        'immunization_id',
        'sequence',
        'days_before_due',
        'dose_due_on',
        'due_at',
        'channel',
        'status',
        'message',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'dose_due_on' => 'date',
            'sent_at' => 'datetime',
        ];
    }

    public function immunization(): BelongsTo
    {
        return $this->belongsTo(Immunization::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function vaccinee(): BelongsTo
    {
        return $this->belongsTo(Vaccinee::class);
    }

    public function vaccine(): BelongsTo
    {
        return $this->belongsTo(Vaccine::class);
    }
}
