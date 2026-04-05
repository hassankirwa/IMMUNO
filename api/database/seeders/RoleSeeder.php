<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'health_officer'] as $name) {
            Role::firstOrCreate(['name' => $name]);
        }
    }
}
