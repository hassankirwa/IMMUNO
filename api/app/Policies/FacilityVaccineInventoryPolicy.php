<?php

namespace App\Policies;

use App\Models\FacilityVaccineInventory;
use App\Models\User;

class FacilityVaccineInventoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('inventory.viewAny');
    }

    public function view(User $user, FacilityVaccineInventory $row): bool
    {
        if (! $user->can('inventory.view')) {
            return false;
        }

        return $user->canAccessFacility((int) $row->facility_id);
    }

    public function create(User $user): bool
    {
        return $user->can('inventory.create');
    }

    public function update(User $user, FacilityVaccineInventory $row): bool
    {
        if (! $user->can('inventory.update')) {
            return false;
        }

        return $user->canAccessFacility((int) $row->facility_id);
    }

    public function delete(User $user, FacilityVaccineInventory $row): bool
    {
        if (! $user->can('inventory.delete')) {
            return false;
        }

        return $user->canAccessFacility((int) $row->facility_id);
    }
}
