<?php

namespace App\Policies;

use App\Models\Guardian;
use App\Models\User;

class GuardianPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('guardians.viewAny');
    }

    public function view(User $user, Guardian $guardian): bool
    {
        if (! $user->can('guardians.view')) {
            return false;
        }

        return $user->canAccessFacility((int) $guardian->facility_id);
    }

    public function create(User $user): bool
    {
        return $user->can('guardians.create');
    }

    public function update(User $user, Guardian $guardian): bool
    {
        if (! $user->can('guardians.update')) {
            return false;
        }

        return $user->canAccessFacility((int) $guardian->facility_id);
    }

    public function delete(User $user, Guardian $guardian): bool
    {
        if (! $user->can('guardians.delete')) {
            return false;
        }

        return $user->canAccessFacility((int) $guardian->facility_id);
    }
}
