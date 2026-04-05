<?php

namespace App\Policies;

use App\Models\Immunization;
use App\Models\User;

class ImmunizationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('immunizations.viewAny');
    }

    public function view(User $user, Immunization $immunization): bool
    {
        if (! $user->can('immunizations.view')) {
            return false;
        }

        return $user->canAccessFacility((int) $immunization->facility_id);
    }

    public function create(User $user): bool
    {
        return $user->can('immunizations.create');
    }

    public function update(User $user, Immunization $immunization): bool
    {
        if (! $user->can('immunizations.update')) {
            return false;
        }

        return $user->canAccessFacility((int) $immunization->facility_id);
    }

    public function delete(User $user, Immunization $immunization): bool
    {
        if (! $user->can('immunizations.delete')) {
            return false;
        }

        return $user->canAccessFacility((int) $immunization->facility_id);
    }
}
