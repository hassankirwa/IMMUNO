<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AdministrationRoute extends Model
{
    protected $fillable = [
        'code',
        'name',
        'sort_order',
    ];

    public function immunizations(): HasMany
    {
        return $this->hasMany(Immunization::class);
    }
}
