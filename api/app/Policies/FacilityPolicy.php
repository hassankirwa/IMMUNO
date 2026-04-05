<?php

namespace App\Policies;

use App\Models\Facility;
use App\Models\User;

class FacilityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('facilities.viewAny')
            || ($user->can('facilities.view') && $user->facility_id);
    }

    public function view(User $user, Facility $facility): bool
    {
        if ($user->can('facilities.viewAny')) {
            return true;
        }

        return $user->can('facilities.view')
            && $user->canAccessFacility((int) $facility->id);
    }

    public function create(User $user): bool
    {
        return $user->can('facilities.create');
    }

    public function update(User $user, Facility $facility): bool
    {
        if (! $user->can('facilities.update')) {
            return false;
        }

        if ($user->hasRole('admin')) {
            return true;
        }

        return $user->canAccessFacility((int) $facility->id);
    }

    public function delete(User $user, Facility $facility): bool
    {
        return $user->can('facilities.delete');
    }
}
