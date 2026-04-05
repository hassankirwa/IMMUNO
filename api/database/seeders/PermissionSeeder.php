<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $names = [
            'facilities.viewAny',
            'facilities.view',
            'facilities.create',
            'facilities.update',
            'facilities.delete',
            'vaccinees.viewAny',
            'vaccinees.view',
            'vaccinees.create',
            'vaccinees.update',
            'vaccinees.delete',
            'guardians.viewAny',
            'guardians.view',
            'guardians.create',
            'guardians.update',
            'guardians.delete',
            'vaccines.viewAny',
            'vaccines.view',
            'vaccines.create',
            'vaccines.update',
            'vaccines.delete',
            'immunizations.viewAny',
            'immunizations.view',
            'immunizations.create',
            'immunizations.update',
            'immunizations.delete',
            'inventory.viewAny',
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
            'reminders.viewAny',
            'reminders.view',
            'reminders.create',
            'reminders.update',
            'reminders.delete',
            'stats.view',
            'session_planning.view',
            'session_visits.update',
        ];

        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name]);
        }

        $admin = Role::findByName('admin');
        $admin->syncPermissions(Permission::all());

        $officer = Role::findByName('health_officer');
        $officer->syncPermissions([
            'facilities.view',
            'facilities.update',
            'vaccinees.viewAny',
            'vaccinees.view',
            'vaccinees.create',
            'vaccinees.update',
            'vaccinees.delete',
            'guardians.viewAny',
            'guardians.view',
            'guardians.create',
            'guardians.update',
            'guardians.delete',
            'vaccines.viewAny',
            'vaccines.view',
            'vaccines.update',
            'immunizations.viewAny',
            'immunizations.view',
            'immunizations.create',
            'immunizations.update',
            'immunizations.delete',
            'inventory.viewAny',
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
            'reminders.viewAny',
            'reminders.view',
            'reminders.create',
            'reminders.update',
            'reminders.delete',
            'stats.view',
            'session_planning.view',
            'session_visits.update',
        ]);
    }
}
