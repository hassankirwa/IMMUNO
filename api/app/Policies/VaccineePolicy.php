<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vaccinee;

class VaccineePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('vaccinees.viewAny');
    }

    public function view(User $user, Vaccinee $vaccinee): bool
    {
        if (! $user->can('vaccinees.view')) {
            return false;
        }

        return $user->canAccessFacility((int) $vaccinee->facility_id);
    }

    public function create(User $user): bool
    {
        return $user->can('vaccinees.create');
    }

    public function update(User $user, Vaccinee $vaccinee): bool
    {
        if (! $user->can('vaccinees.update')) {
            return false;
        }

        return $user->canAccessFacility((int) $vaccinee->facility_id);
    }

    public function delete(User $user, Vaccinee $vaccinee): bool
    {
        if (! $user->can('vaccinees.delete')) {
            return false;
        }

        return $user->canAccessFacility((int) $vaccinee->facility_id);
    }
}
