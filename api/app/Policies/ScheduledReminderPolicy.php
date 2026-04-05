<?php

namespace App\Policies;

use App\Models\ScheduledReminder;
use App\Models\User;

class ScheduledReminderPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('reminders.viewAny');
    }

    public function view(User $user, ScheduledReminder $reminder): bool
    {
        if (! $user->can('reminders.view')) {
            return false;
        }

        return $user->canAccessFacility((int) $reminder->facility_id);
    }

    public function create(User $user): bool
    {
        return $user->can('reminders.create');
    }

    public function update(User $user, ScheduledReminder $reminder): bool
    {
        if (! $user->can('reminders.update')) {
            return false;
        }

        return $user->canAccessFacility((int) $reminder->facility_id);
    }

    public function delete(User $user, ScheduledReminder $reminder): bool
    {
        if (! $user->can('reminders.delete')) {
            return false;
        }

        return $user->canAccessFacility((int) $reminder->facility_id);
    }
}
