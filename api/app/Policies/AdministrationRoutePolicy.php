<?php

namespace App\Policies;

use App\Models\AdministrationRoute;
use App\Models\User;

class AdministrationRoutePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, AdministrationRoute $administrationRoute): bool
    {
        return true;
    }
}
