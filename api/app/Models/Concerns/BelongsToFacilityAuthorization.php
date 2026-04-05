<?php

namespace App\Models\Concerns;

trait BelongsToFacilityAuthorization
{
    public function canAccessFacility(?int $facilityId): bool
    {
        if ($this->hasRole('admin')) {
            return true;
        }

        if ($facilityId === null || $this->facility_id === null) {
            return false;
        }

        return (int) $this->facility_id === (int) $facilityId;
    }

    /** @return array<int>|null null means no restriction (admin). */
    public function scopedFacilityIds(): ?array
    {
        if ($this->hasRole('admin')) {
            return null;
        }

        if ($this->facility_id === null) {
            return [];
        }

        return [(int) $this->facility_id];
    }
}
