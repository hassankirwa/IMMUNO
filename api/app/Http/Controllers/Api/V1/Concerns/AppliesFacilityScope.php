<?php

namespace App\Http\Controllers\Api\V1\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

trait AppliesFacilityScope
{
    protected function scopeByFacility(Builder $query, User $user, string $column = 'facility_id'): Builder
    {
        $ids = $user->scopedFacilityIds();
        if ($ids === null) {
            return $query;
        }

        return $query->whereIn($column, $ids);
    }
}
