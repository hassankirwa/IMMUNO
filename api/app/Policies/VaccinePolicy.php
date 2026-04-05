<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vaccine;

class VaccinePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('vaccines.viewAny');
    }

    public function view(User $user, Vaccine $vaccine): bool
    {
        return $user->can('vaccines.view');
    }

    public function create(User $user): bool
    {
        return $user->can('vaccines.create');
    }

    public function update(User $user, Vaccine $vaccine): bool
    {
        return $user->can('vaccines.update');
    }

    public function delete(User $user, Vaccine $vaccine): bool
    {
        return $user->can('vaccines.delete');
    }
}
